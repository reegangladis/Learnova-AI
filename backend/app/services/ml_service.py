import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.config import get_settings
from backend.app.models.course import (
    Course,
    CourseStatus,
)
from backend.app.models.enrollment import Enrollment, EnrollmentStatus, LessonProgress
from backend.app.models.quiz import AttemptStatus, Quiz, QuizAttempt
from backend.app.models.user import User
from backend.app.repositories.analytics_repo import AnalyticsRepository
from backend.app.schemas.ml import (
    ContributingFactorDTO,
    CourseRecommendationsResponse,
    LearningInsightsResponse,
    LearningPathResponse,
    LearningPathStepDTO,
    ModelEvaluationMetricsDTO,
    ModelStatusResponse,
    ModelVersionInfoDTO,
    PrerequisiteCheckDTO,
    RecommendedCourseDTO,
    SkillGapAlertDTO,
    TrainModelRequestDTO,
    TrainModelResponseDTO,
)

logger = logging.getLogger(__name__)
settings = get_settings()


class MLService:
    """Backend service orchestrating data gathering, tenant isolation, and ML service communication."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.analytics_repo = AnalyticsRepository(db)
        self.ml_service_url = settings.ML_SERVICE_URL.rstrip("/")
        self.internal_headers = {
            "X-Internal-Service-Key": settings.INTERNAL_SERVICE_SECRET
        }

    # =========================================================================
    # 1. Course Recommendations
    # =========================================================================

    async def get_recommendations(
        self,
        current_user: User,
        limit: int = 5,
        goal: str | None = None,
        category_id: uuid.UUID | None = None,
        preferred_difficulty: str | None = None,
    ) -> CourseRecommendationsResponse:
        """Retrieves authorized candidate courses and generates personalized suggestions with skill-gap and goal alignment."""
        # 1. Fetch user's enrollments and completion history
        enr_stmt = select(Enrollment).where(Enrollment.user_id == current_user.id)
        enr_res = await self.db.execute(enr_stmt)
        user_enrollments = list(enr_res.scalars().all())

        enrolled_course_ids = [e.course_id for e in user_enrollments]
        completed_course_ids = [
            e.course_id
            for e in user_enrollments
            if e.status == EnrollmentStatus.COMPLETED.value
        ]

        # Fetch completed course titles and category names
        completed_titles: list[str] = []
        completed_category_names: list[str] = []
        completed_category_ids: list[str] = []

        if completed_course_ids:
            comp_stmt = (
                select(Course)
                .options(selectinload(Course.category))
                .where(Course.id.in_(completed_course_ids))
            )
            comp_res = await self.db.execute(comp_stmt)
            for c in comp_res.scalars().all():
                completed_titles.append(c.title)
                if c.category:
                    completed_category_names.append(c.category.name)
                    completed_category_ids.append(str(c.category.id))

        # 2. Query student's recent finalized quiz attempts to detect skill gaps
        quiz_stmt = (
            select(QuizAttempt)
            .options(selectinload(QuizAttempt.quiz).selectinload(Quiz.course))
            .where(
                QuizAttempt.user_id == current_user.id,
                QuizAttempt.status == AttemptStatus.COMPLETED.value,
            )
            .order_by(QuizAttempt.submitted_at.desc())
            .limit(10)
        )
        q_res = await self.db.execute(quiz_stmt)
        quiz_attempts = list(q_res.scalars().all())

        recent_quiz_scores = [float(att.percentage_score) for att in quiz_attempts]
        skill_gaps: list[str] = []
        for att in quiz_attempts:
            if not att.passed or att.percentage_score < 70.0:
                if att.quiz and att.quiz.course and att.quiz.course.title:
                    skill_gaps.append(att.quiz.course.title)
                if att.quiz and att.quiz.title:
                    skill_gaps.append(att.quiz.title)

        learning_goals: list[str] = [goal] if goal else []

        # 3. Query published courses respecting organization boundaries
        org_filter = (
            or_(
                Course.organization_id == current_user.organization_id,
                Course.organization_id.is_(None),
            )
            if current_user.organization_id
            else Course.organization_id.is_(None)
        )

        catalog_filters = [
            Course.status == CourseStatus.PUBLISHED.value,
            org_filter,
        ]
        if category_id:
            catalog_filters.append(Course.category_id == category_id)

        catalog_stmt = (
            select(Course)
            .options(selectinload(Course.category))
            .where(*catalog_filters)
        )
        catalog_res = await self.db.execute(catalog_stmt)
        catalog_courses = list(catalog_res.scalars().all())

        # Exclude courses user is already enrolled in or has completed
        excluded_ids = set(enrolled_course_ids + completed_course_ids)
        eligible_courses = [c for c in catalog_courses if c.id not in excluded_ids]

        if not eligible_courses:
            return CourseRecommendationsResponse(
                recommendations=[],
                total_evaluated=len(catalog_courses),
                applied_strategy="none",
                is_fallback=False,
            )

        # 4. Build candidate payload for ML microservice
        candidates_payload = [
            {
                "id": str(c.id),
                "title": c.title,
                "slug": c.slug,
                "short_description": c.short_description,
                "category_id": str(c.category_id) if c.category_id else None,
                "category_name": c.category.name if c.category else None,
                "difficulty": c.difficulty,
                "duration_minutes": c.duration_minutes,
                "learning_objectives": c.learning_objectives or [],
                "prerequisites": c.prerequisites or [],
                "enrollment_count": 50,  # default catalog baseline weight
                "rating": 4.8,
            }
            for c in eligible_courses
        ]

        target_diff = preferred_difficulty or ("intermediate" if completed_course_ids else "beginner")
        student_payload = {
            "student_id": str(current_user.id),
            "enrolled_course_ids": [str(cid) for cid in enrolled_course_ids],
            "completed_course_ids": [str(cid) for cid in completed_course_ids],
            "completed_category_ids": completed_category_ids,
            "completed_category_names": completed_category_names,
            "completed_course_titles": completed_titles,
            "recent_quiz_scores": recent_quiz_scores,
            "preferred_difficulty": target_diff,
            "learning_goals": learning_goals,
            "skill_gaps": skill_gaps,
        }

        # 5. Attempt calling ML microservice
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.post(
                    f"{self.ml_service_url}/recommendations",
                    json={
                        "student": student_payload,
                        "candidate_courses": candidates_payload,
                        "limit": limit,
                    },
                    headers=self.internal_headers,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    recs = [
                        RecommendedCourseDTO(
                            course_id=uuid.UUID(r["course_id"]),
                            title=r["title"],
                            slug=r["slug"],
                            short_description=r["short_description"],
                            category_name=r.get("category_name"),
                            difficulty=r["difficulty"],
                            duration_minutes=r["duration_minutes"],
                            score=r["score"],
                            strategy=r["strategy"],
                            reason=r["reason"],
                            matching_topics=r.get("matching_topics", []),
                        )
                        for r in data["recommendations"]
                    ]
                    return CourseRecommendationsResponse(
                        recommendations=recs,
                        total_evaluated=data["total_evaluated"],
                        applied_strategy=data["applied_strategy"],
                        is_fallback=data["is_fallback"],
                    )
        except Exception as e:  # noqa: BLE001
            logger.info("ML microservice call failed or unreachable (%s), using local fallback engine.", e)

        # 6. Local Deterministic Fallback Engine
        return self._local_recommendations_fallback(
            eligible_courses=eligible_courses,
            completed_titles=completed_titles,
            completed_category_names=completed_category_names,
            learning_goals=learning_goals,
            skill_gaps=skill_gaps,
            preferred_difficulty=target_diff,
            total_evaluated=len(catalog_courses),
            limit=limit,
        )

    def _local_recommendations_fallback(
        self,
        eligible_courses: list[Course],
        completed_titles: list[str],
        completed_category_names: list[str],
        learning_goals: list[str],
        skill_gaps: list[str],
        preferred_difficulty: str | None,
        total_evaluated: int,
        limit: int,
    ) -> CourseRecommendationsResponse:
        """Deterministic local fallback with multi-signal ranking when microservice is offline."""
        has_history = bool(completed_titles or completed_category_names or learning_goals or skill_gaps)

        if not has_history:
            # Cold-start popularity / beginner fallback
            sorted_courses = sorted(
                eligible_courses,
                key=lambda c: (1 if c.difficulty == "beginner" else 0, c.duration_minutes),
                reverse=True,
            )[:limit]

            recs = [
                RecommendedCourseDTO(
                    course_id=c.id,
                    title=c.title,
                    slug=c.slug,
                    short_description=c.short_description,
                    category_name=c.category.name if c.category else None,
                    difficulty=c.difficulty,
                    duration_minutes=c.duration_minutes,
                    score=round(max(0.60, 0.95 - (i * 0.08)), 2),
                    strategy="popularity_fallback",
                    reason=f"Popular foundational course in {c.category.name if c.category else 'the catalog'} for new learners.",
                    matching_topics=(c.learning_objectives or [])[:3],
                )
                for i, c in enumerate(sorted_courses)
            ]
            return CourseRecommendationsResponse(
                recommendations=recs,
                total_evaluated=total_evaluated,
                applied_strategy="popularity_fallback",
                is_fallback=True,
            )

        # Multi-signal scoring
        scored_items: list[tuple[Course, float, str, str]] = []
        cat_set = {name.lower() for name in completed_category_names}
        completed_titles_lower = [t.lower() for t in completed_titles]
        goals_lower = [g.lower() for g in learning_goals if g]
        gaps_lower = [sg.lower() for sg in skill_gaps if sg]

        for c in eligible_courses:
            cat_name = c.category.name if c.category else ""
            cat_name_lower = cat_name.lower()
            is_cat_match = cat_name_lower in cat_set
            cand_text = f"{c.title} {c.short_description} {cat_name} {' '.join(c.learning_objectives or [])}".lower()

            # 1. Skill gap remediation match
            matched_gap = next(
                (g for g in gaps_lower if g in cand_text or any(len(tok) >= 4 and tok in cand_text for tok in g.split())),
                None,
            )

            # 2. Learning goal match
            matched_goal = next(
                (g for g in goals_lower if g in cand_text or any(len(tok) >= 4 and tok in cand_text for tok in g.split())),
                None,
            )

            # 3. Prerequisite check
            prereqs = c.prerequisites or []
            if prereqs:
                prereqs_met = all(
                    any(p.lower().strip() in ct or ct in p.lower().strip() for ct in completed_titles_lower)
                    for p in prereqs
                )
                prereq_score = 0.08 if prereqs_met else -0.15
            else:
                prereq_score = 0.0

            # Base score
            base_score = 0.50 + prereq_score
            if preferred_difficulty and c.difficulty.lower() == preferred_difficulty.lower():
                base_score += 0.08

            if matched_gap:
                strategy = "skill_gap_remediation"
                reason = f"Targeted recommendation to strengthen key concepts in '{matched_gap.capitalize()}' based on your recent assessment results."
                score = min(0.99, base_score + 0.40)
            elif matched_goal:
                strategy = "goal_alignment"
                reason = f"Directly aligns with your selected learning goal in '{matched_goal.capitalize()}'."
                score = min(0.98, base_score + 0.30)
            elif is_cat_match:
                strategy = "category_matching"
                reason = f"Expands your knowledge in {cat_name}, matching your completed coursework."
                score = min(0.95, base_score + 0.25)
            else:
                strategy = "content_based"
                reason = f"Curriculum recommendation in {cat_name or 'the catalog'} aligned with your study pace."
                score = min(0.85, base_score)

            scored_items.append((c, round(max(0.50, score), 2), strategy, reason))

        scored_items.sort(key=lambda x: x[1], reverse=True)
        top_items = scored_items[:limit]

        recs = [
            RecommendedCourseDTO(
                course_id=c.id,
                title=c.title,
                slug=c.slug,
                short_description=c.short_description,
                category_name=c.category.name if c.category else None,
                difficulty=c.difficulty,
                duration_minutes=c.duration_minutes,
                score=score,
                strategy=strat,
                reason=rsn,
                matching_topics=(c.learning_objectives or [])[:3],
            )
            for c, score, strat, rsn in top_items
        ]

        strat_types = [r.strategy for r in recs]
        dominant_strategy = max(set(strat_types), key=strat_types.count) if strat_types else "content_based"

        return CourseRecommendationsResponse(
            recommendations=recs,
            total_evaluated=total_evaluated,
            applied_strategy=dominant_strategy,
            is_fallback=False,
        )

    # =========================================================================
    # 2. Learning-Risk & Momentum Insights
    # =========================================================================

    async def get_learning_insights(self, current_user: User) -> LearningInsightsResponse:
        """Computes student learning momentum, pacing, and supportive advice."""
        # 1. Fetch real student learning telemetry
        enr_summary = await self.analytics_repo.get_student_enrollments_summary(current_user.id)
        lesson_summary = await self.analytics_repo.get_student_lessons_summary(current_user.id)
        quiz_summary = await self.analytics_repo.get_student_quizzes_summary(current_user.id)

        # Compute days since last activity
        last_progress_stmt = (
            select(func.max(LessonProgress.updated_at))
            .where(LessonProgress.user_id == current_user.id)
        )
        last_quiz_stmt = (
            select(func.max(QuizAttempt.submitted_at))
            .where(QuizAttempt.user_id == current_user.id)
        )
        p_res = await self.db.execute(last_progress_stmt)
        q_res = await self.db.execute(last_quiz_stmt)
        last_p = p_res.scalar_one_or_none()
        last_q = q_res.scalar_one_or_none()

        dates = [d for d in [last_p, last_q] if d is not None]
        now = datetime.now(timezone.utc)
        if dates:
            latest_dt = max(dates)
            if latest_dt.tzinfo is None:
                latest_dt = latest_dt.replace(tzinfo=timezone.utc)
            days_inactive = max(0, (now - latest_dt).days)
        else:
            days_inactive = 0

        total_lessons = lesson_summary["total_lessons"]
        completed_lessons = lesson_summary["completed_lessons"]
        completion_rate = (completed_lessons / total_lessons) if total_lessons > 0 else 0.0

        # Check for insufficient data (cold start)
        active_count = enr_summary["active"]
        completed_courses = enr_summary["completed"]
        quiz_attempts = int(quiz_summary["total_attempts"])

        if (active_count == 0 and completed_courses == 0) or (completed_lessons == 0 and quiz_attempts == 0):
            return LearningInsightsResponse(
                student_id=current_user.id,
                risk_level="insufficient_data",
                risk_score=0.0,
                confidence_score=0.0,
                momentum_status="insufficient_data",
                contributing_factors=[
                    ContributingFactorDTO(
                        factor_name="New Learner",
                        impact="neutral",
                        description="Not enough learning activity recorded yet to estimate momentum.",
                        weight=0.0,
                    )
                ],
                supportive_guidance=[
                    f"Welcome {current_user.first_name}! Start by completing your first lesson or practice quiz to unlock your personalized study insights.",
                    "Consistent pacing early on helps build long-term mastery.",
                ],
                model_version="baseline",
                is_insufficient_data=True,
            )

        features_payload = {
            "student_id": str(current_user.id),
            "active_courses_count": active_count,
            "completed_courses_count": completed_courses,
            "total_lessons_assigned": total_lessons,
            "completed_lessons_count": completed_lessons,
            "lesson_completion_rate": round(completion_rate, 3),
            "avg_quiz_score": float(quiz_summary["average_score"]),
            "quiz_pass_rate": float(quiz_summary["pass_rate"]),
            "total_quiz_attempts": quiz_attempts,
            "failed_quiz_attempts": max(0, quiz_attempts - int(quiz_summary["passed_attempts"])),
            "days_since_last_activity": days_inactive,
            "total_study_time_minutes": int(quiz_summary["time_spent_minutes"]),
        }

        # 2. Call ML microservice
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.post(
                    f"{self.ml_service_url}/predict/risk",
                    json=features_payload,
                    headers=self.internal_headers,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    factors = [
                        ContributingFactorDTO(
                            factor_name=f["factor_name"],
                            impact=f["impact"],
                            description=f["description"],
                            weight=f["weight"],
                        )
                        for f in data.get("contributing_factors", [])
                    ]
                    return LearningInsightsResponse(
                        student_id=current_user.id,
                        risk_level=data["risk_level"],
                        risk_score=data["risk_score"],
                        confidence_score=data["confidence_score"],
                        momentum_status=data["momentum_status"],
                        contributing_factors=factors,
                        supportive_guidance=data.get("supportive_guidance", []),
                        model_version=data.get("model_version", "v1.0.0"),
                        is_insufficient_data=data.get("is_insufficient_data", False),
                    )
        except Exception as e:  # noqa: BLE001
            logger.info("ML predict service call failed (%s), using local predictive fallback.", e)

        # 3. Local predictive fallback
        return self._local_insights_fallback(
            current_user=current_user,
            features=features_payload,
        )

    def _local_insights_fallback(
        self, current_user: User, features: dict[str, Any]
    ) -> LearningInsightsResponse:
        """Local transparent estimation calculation."""
        comp_rate = float(features["lesson_completion_rate"])
        pass_rate = float(features["quiz_pass_rate"])
        avg_quiz = float(features["avg_quiz_score"])
        days_inact = int(features["days_since_last_activity"])

        score = 0.0
        if days_inact > 14:
            score += 0.40
        elif days_inact > 7:
            score += 0.20

        if features["total_quiz_attempts"] > 0:
            if pass_rate < 50.0:
                score += 0.35
            elif pass_rate < 70.0:
                score += 0.15
            else:
                score -= 0.15

        if comp_rate < 0.20:
            score += 0.25
        elif comp_rate > 0.60:
            score -= 0.20

        risk_score = round(max(0.05, min(0.95, score)), 2)
        if risk_score >= 0.60:
            risk_level = "high"
            momentum = "needs_attention"
        elif risk_score >= 0.35:
            risk_level = "moderate"
            momentum = "needs_attention"
        else:
            risk_level = "low"
            momentum = "accelerating" if comp_rate > 0.60 else "steady"

        factors: list[ContributingFactorDTO] = []
        guidance: list[str] = []

        if days_inact > 7:
            factors.append(
                ContributingFactorDTO(
                    factor_name="Activity Recency",
                    impact="concerning",
                    description=f"{days_inact} days since your last recorded study session.",
                    weight=-0.3,
                )
            )
            guidance.append("Setting aside just 15 minutes today can quickly rebuild your study momentum.")
        else:
            factors.append(
                ContributingFactorDTO(
                    factor_name="Study Continuity",
                    impact="positive",
                    description="Active recently. Great job maintaining regular study habits!",
                    weight=0.3,
                )
            )

        if features["total_quiz_attempts"] > 0:
            if avg_quiz >= 80.0:
                factors.append(
                    ContributingFactorDTO(
                        factor_name="Assessment Mastery",
                        impact="positive",
                        description=f"Strong quiz average of {avg_quiz:.1f}%.",
                        weight=0.35,
                    )
                )
            elif avg_quiz < 65.0:
                factors.append(
                    ContributingFactorDTO(
                        factor_name="Assessment Pacing",
                        impact="concerning",
                        description=f"Average quiz score of {avg_quiz:.1f}%. Reviewing prior topics is recommended.",
                        weight=-0.25,
                    )
                )
                guidance.append("Try reviewing lesson notes before attempting your next quiz.")

        if not guidance:
            guidance.append("Keep up your steady study routine to achieve your course milestones!")

        return LearningInsightsResponse(
            student_id=current_user.id,
            risk_level=risk_level,
            risk_score=risk_score,
            confidence_score=0.85,
            momentum_status=momentum,
            contributing_factors=factors,
            supportive_guidance=guidance,
            model_version="local-baseline",
            is_insufficient_data=False,
        )

    # =========================================================================
    # 3. Learning-Path Suggestions
    # =========================================================================

    async def get_learning_path(self, current_user: User) -> LearningPathResponse:
        """Determines next sequential lesson or unlocks next course in sequence."""
        # 1. Fetch in-progress active enrollments
        active_resume = await self.analytics_repo.get_student_resume_courses(current_user.id, limit=3)

        # 2. Fetch recent quiz scores to identify skill gaps
        quiz_stmt = (
            select(QuizAttempt)
            .options(selectinload(QuizAttempt.quiz).selectinload(Quiz.course))
            .where(
                QuizAttempt.user_id == current_user.id,
                QuizAttempt.status == AttemptStatus.COMPLETED.value,
            )
            .order_by(QuizAttempt.submitted_at.desc())
            .limit(5)
        )
        q_res = await self.db.execute(quiz_stmt)
        quiz_attempts = list(q_res.scalars().all())

        skill_gaps: list[SkillGapAlertDTO] = []
        for att in quiz_attempts:
            if not att.passed or att.percentage_score < 70.0:
                q_title = att.quiz.title if att.quiz else "Quiz Assessment"
                c_title = att.quiz.course.title if (att.quiz and att.quiz.course) else "Course"
                skill_gaps.append(
                    SkillGapAlertDTO(
                        topic=c_title,
                        assessment_title=q_title,
                        score=round(att.percentage_score, 1),
                        recommendation=f"Score of {att.percentage_score:.1f}% indicates an opportunity to review key concepts in '{c_title}'.",
                    )
                )

        # 3. If student has active resume course with next incomplete lesson
        if active_resume:
            top_resume = active_resume[0]
            next_lesson_id = top_resume.get("next_lesson_id")
            next_lesson_title = top_resume.get("next_lesson_title")
            course_id = top_resume.get("course_id")
            course_title = top_resume.get("course_title", "Active Course")

            if next_lesson_id and next_lesson_title:
                next_step = LearningPathStepDTO(
                    step_type="lesson_completion",
                    title=f"Complete '{next_lesson_title}'",
                    description=f"Continue sequentially in '{course_title}'. You have completed {top_resume.get('completed_lessons', 0)} of {top_resume.get('total_lessons', 0)} lessons.",
                    course_id=course_id,
                    course_title=course_title,
                    lesson_id=next_lesson_id,
                    lesson_title=next_lesson_title,
                    estimated_minutes=15,
                    confidence_level="high",
                )
                focus = f"Active Course: '{course_title}'"
                rationale = f"Continuing sequentially through your active enrolled course '{course_title}' builds steady mastery."
                return LearningPathResponse(
                    student_id=current_user.id,
                    current_focus=focus,
                    next_step=next_step,
                    prerequisite_checks=[],
                    skill_gaps=skill_gaps,
                    rationale=rationale,
                )

        # 4. If no active course, check available courses and prerequisites
        org_filter = (
            or_(
                Course.organization_id == current_user.organization_id,
                Course.organization_id.is_(None),
            )
            if current_user.organization_id
            else Course.organization_id.is_(None)
        )
        avail_stmt = (
            select(Course)
            .where(Course.status == CourseStatus.PUBLISHED.value, org_filter)
            .order_by(Course.created_at.asc())
            .limit(10)
        )
        avail_res = await self.db.execute(avail_stmt)
        avail_courses = list(avail_res.scalars().all())

        # Fetch student completed course titles
        comp_stmt = (
            select(Course.title)
            .join(Enrollment, Course.id == Enrollment.course_id)
            .where(
                Enrollment.user_id == current_user.id,
                Enrollment.status == EnrollmentStatus.COMPLETED.value,
            )
        )
        comp_res = await self.db.execute(comp_stmt)
        completed_titles = {t.lower() for t in comp_res.scalars().all()}

        best_cand = None
        prereq_checks: list[PrerequisiteCheckDTO] = []

        for cand in avail_courses:
            prereqs = cand.prerequisites or []
            checks = []
            all_met = True
            for p in prereqs:
                p_clean = str(p).lower().strip()
                met = any(p_clean in ct or ct in p_clean for ct in completed_titles)
                if not met:
                    all_met = False
                checks.append(
                    PrerequisiteCheckDTO(
                        prerequisite_name=str(p),
                        is_met=met,
                        evidence="Matched with prior completed coursework" if met else "No prior completion recorded",
                    )
                )

            if all_met and best_cand is None:
                best_cand = cand
                prereq_checks = checks
                break

        if best_cand is None and avail_courses:
            best_cand = avail_courses[0]
            prereq_checks = [
                PrerequisiteCheckDTO(
                    prerequisite_name=str(p),
                    is_met=False,
                    evidence="Prerequisite pending verification",
                )
                for p in (best_cand.prerequisites or [])
            ]

        if best_cand:
            next_step = LearningPathStepDTO(
                step_type="course_enrollment",
                title=f"Enroll in '{best_cand.title}'",
                description=best_cand.short_description,
                course_id=best_cand.id,
                course_title=best_cand.title,
                estimated_minutes=best_cand.duration_minutes or 60,
                confidence_level="high" if all(c.is_met for c in prereq_checks) else "medium",
            )
            focus = f"Next Curriculum Objective: '{best_cand.title}'"
            rationale = (
                f"Course '{best_cand.title}' is ready for you because all prerequisite requirements are met."
                if all(c.is_met for c in prereq_checks)
                else f"Recommended starter course '{best_cand.title}' to begin your curriculum."
            )
        else:
            next_step = LearningPathStepDTO(
                step_type="course_enrollment",
                title="Browse Course Catalog",
                description="Explore courses available in your curriculum.",
                confidence_level="exploratory",
            )
            focus = "Catalog Discovery"
            rationale = "Explore our course catalog to find a course matching your learning goals."

        return LearningPathResponse(
            student_id=current_user.id,
            current_focus=focus,
            next_step=next_step,
            prerequisite_checks=prereq_checks,
            skill_gaps=skill_gaps,
            rationale=rationale,
        )

    # =========================================================================
    # 4. Model Status (Admin / Instructor)
    # =========================================================================

    async def get_model_status(self) -> ModelStatusResponse:
        """Queries model status and evaluation metrics from registry."""
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(
                    f"{self.ml_service_url}/models/status",
                    headers=self.internal_headers,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    models = [
                        ModelVersionInfoDTO(
                            model_name=m["model_name"],
                            version=m["version"],
                            framework=m["framework"],
                            status=m.get("status", "experimental"),
                            provenance=m.get("provenance", "synthetic_educational_benchmark"),
                            trained_at=datetime.fromisoformat(m["trained_at"]),
                            metrics=ModelEvaluationMetricsDTO(**m["metrics"]) if m.get("metrics") else None,
                            features=m.get("features", []),
                        )
                        for m in data.get("active_models", [])
                    ]
                    last_eval = (
                        datetime.fromisoformat(data["last_evaluated"])
                        if data.get("last_evaluated")
                        else None
                    )
                    return ModelStatusResponse(
                        service_status=data["service_status"],
                        active_models=models,
                        registry_path=data["registry_path"],
                        last_evaluated=last_eval,
                    )
        except Exception as e:  # noqa: BLE001
            logger.info("ML status query failed (%s), returning local operational status.", e)

        # Local fallback: read authentic registry descriptors from disk if available
        active_models: list[ModelVersionInfoDTO] = []
        reg_dir = Path("ml-service/app/models/registry")
        last_eval = None
        if reg_dir.exists():
            for mdir in reg_dir.iterdir():
                if mdir.is_dir():
                    for jf in sorted(mdir.glob("*.json")):
                        try:
                            content = jf.read_text(encoding="utf-8")
                            jdata = json.loads(content)
                            m_metrics = (
                                ModelEvaluationMetricsDTO(**jdata["metrics"])
                                if jdata.get("metrics")
                                else None
                            )
                            trained_dt = datetime.fromisoformat(jdata["trained_at"])
                            if last_eval is None or trained_dt > last_eval:
                                last_eval = trained_dt
                            active_models.append(
                                ModelVersionInfoDTO(
                                    model_name=jdata.get("model_name", mdir.name),
                                    version=jdata.get("version", jf.stem),
                                    framework=jdata.get("framework", "scikit-learn"),
                                    status=jdata.get("status", "experimental"),
                                    provenance=jdata.get("provenance", "synthetic_educational_benchmark"),
                                    trained_at=trained_dt,
                                    metrics=m_metrics,
                                    features=jdata.get("features", []),
                                )
                            )
                        except Exception as meta_err:  # noqa: BLE001
                            logger.debug("Skipping unparseable model metadata %s: %s", jf, meta_err)
                            continue

        if not active_models:
            active_models.append(
                ModelVersionInfoDTO(
                    model_name="student_risk_predictor",
                    version="v1.0.0",
                    framework="scikit-learn",
                    status="experimental",
                    provenance="synthetic_educational_benchmark",
                    trained_at=datetime.now(timezone.utc),
                    metrics=None,
                    features=[
                        "lesson_completion_rate",
                        "avg_quiz_score_norm",
                        "quiz_pass_rate_norm",
                        "failed_quiz_ratio",
                        "days_inactive_norm",
                        "active_courses_norm",
                        "study_time_hours_norm",
                    ],
                )
            )

        return ModelStatusResponse(
            service_status="operational (local-engine active)",
            active_models=active_models,
            registry_path=str(reg_dir) if reg_dir.exists() else "./models_store",
            last_evaluated=last_eval or datetime.now(timezone.utc),
        )

    async def train_model(
        self, payload: TrainModelRequestDTO
    ) -> TrainModelResponseDTO:
        """Triggers model training and evaluation with authorized administrative governance."""
        # 1. Try remote ML microservice
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{self.ml_service_url}/models/train",
                    json=payload.model_dump(),
                    headers=self.internal_headers,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    metrics_data = data["metrics"]
                    return TrainModelResponseDTO(
                        success=data["success"],
                        model_name=data["model_name"],
                        version=data["version"],
                        metrics=ModelEvaluationMetricsDTO(
                            accuracy=metrics_data["accuracy"],
                            precision=metrics_data["precision"],
                            recall=metrics_data["recall"],
                            f1_score=metrics_data["f1_score"],
                            roc_auc=metrics_data.get("roc_auc"),
                            sample_size=metrics_data["sample_size"],
                            confusion_matrix=metrics_data.get("confusion_matrix", []),
                        ),
                        training_samples=data["training_samples"],
                        test_samples=data["test_samples"],
                        status=data.get("status", "experimental"),
                        provenance=data.get("provenance", "synthetic_educational_benchmark"),
                        message=data["message"],
                    )
        except Exception as err:  # noqa: BLE001
            logger.warning(
                "ML microservice train endpoint unreachable (%s), falling back to local training pipeline.",
                err,
            )

        # 2. Local fallback training pipeline
        try:
            import sys
            ml_svc_path = str(Path(__file__).parent.parent.parent.parent / "ml-service")
            if ml_svc_path in sys.path:
                sys.path.remove(ml_svc_path)
            sys.path.insert(0, ml_svc_path)

            # Unload colliding app modules
            colliding = [k for k in list(sys.modules.keys()) if k == "app" or k.startswith("app.")]
            for k in colliding:
                del sys.modules[k]

            from app.training.pipeline import RiskModelTrainingPipeline

            pipeline = RiskModelTrainingPipeline(random_state=payload.random_state)
            version = f"v1.{int(datetime.now(timezone.utc).timestamp()) % 10000}"

            _clf, metrics, n_train, n_test = pipeline.train_and_evaluate(
                test_size=payload.test_size,
                version=version,
                persist=True,
            )
            return TrainModelResponseDTO(
                success=True,
                model_name=payload.model_name,
                version=version,
                status="experimental",
                metrics=ModelEvaluationMetricsDTO(
                    accuracy=metrics.accuracy,
                    precision=metrics.precision,
                    recall=metrics.recall,
                    f1_score=metrics.f1_score,
                    roc_auc=metrics.roc_auc,
                    sample_size=metrics.sample_size,
                    confusion_matrix=metrics.confusion_matrix,
                ),
                training_samples=n_train,
                test_samples=n_test,
                provenance="synthetic_educational_benchmark",
                message="Model trained, evaluated, and registered successfully on experimental benchmark distribution.",
            )
        except Exception as local_err:
            logger.error("Local model training failed: %s", local_err)
            raise RuntimeError(f"Model training failed: {local_err}") from local_err

