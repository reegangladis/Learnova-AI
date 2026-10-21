from typing import Any

from app.features.engineering import CourseContentFeatureExtractor
from app.schemas.recommendations import (
    CourseCandidate,
    RecommendationRequest,
    RecommendationResponse,
    RecommendedCourseItem,
)


class CourseRecommender:
    """Multi-strategy recommendation engine for personalized course discovery."""

    def recommend(self, request: RecommendationRequest) -> RecommendationResponse:
        student = request.student
        all_candidates = request.candidate_courses
        limit = request.limit

        # 1. Filter out courses student is already enrolled in or has completed
        excluded_ids = set(student.enrolled_course_ids + student.completed_course_ids)
        eligible_candidates = [c for c in all_candidates if c.id not in excluded_ids]

        if not eligible_candidates:
            return RecommendationResponse(
                recommendations=[],
                total_evaluated=len(all_candidates),
                applied_strategy="none",
                is_fallback=False,
            )

        # 2. Check for history or declared learning signals
        learning_goals = getattr(student, "learning_goals", []) or []
        skill_gaps = getattr(student, "skill_gaps", []) or []
        has_history = bool(
            student.completed_course_ids
            or student.completed_category_names
            or student.completed_course_titles
            or learning_goals
            or skill_gaps
        )

        if not has_history:
            return self._cold_start_recommendations(eligible_candidates, limit, len(all_candidates))

        # 3. Content-based, Category, Skill-Gap, and Goal similarity
        return self._personalized_recommendations(student, eligible_candidates, limit, len(all_candidates))

    def _cold_start_recommendations(
        self,
        candidates: list[CourseCandidate],
        limit: int,
        total_evaluated: int,
    ) -> RecommendationResponse:
        """Ranks beginner-friendly, popular courses for new learners."""
        def cold_sort_key(c: CourseCandidate):
            diff_score = 2 if c.difficulty.lower() == "beginner" else (1 if c.difficulty.lower() == "intermediate" else 0)
            return (diff_score, c.enrollment_count, c.rating)

        sorted_candidates = sorted(candidates, key=cold_sort_key, reverse=True)[:limit]

        recs: list[RecommendedCourseItem] = []
        for rank, c in enumerate(sorted_candidates):
            score = round(max(0.5, 0.95 - (rank * 0.08)), 2)
            reason = (
                f"Popular beginner-friendly course to kickstart your learning in {c.category_name or 'the curriculum'}."
                if c.difficulty.lower() == "beginner"
                else f"Highly rated introductory course with {c.enrollment_count} active students."
            )
            recs.append(
                RecommendedCourseItem(
                    course_id=c.id,
                    title=c.title,
                    slug=c.slug,
                    short_description=c.short_description,
                    category_name=c.category_name,
                    difficulty=c.difficulty,
                    duration_minutes=c.duration_minutes,
                    score=score,
                    strategy="popularity_fallback",
                    reason=reason,
                    matching_topics=c.learning_objectives[:3],
                )
            )

        return RecommendationResponse(
            recommendations=recs,
            total_evaluated=total_evaluated,
            applied_strategy="popularity_fallback",
            is_fallback=True,
        )

    def _personalized_recommendations(
        self,
        student: Any,
        candidates: list[CourseCandidate],
        limit: int,
        total_evaluated: int,
    ) -> RecommendationResponse:
        """Calculates multi-signal personalized recommendations with skill-gap and goal alignment."""
        # Build student profile text including learning goals and skill gaps
        learning_goals = [str(g).lower() for g in (getattr(student, "learning_goals", []) or []) if g]
        skill_gaps = [str(sg).lower() for sg in (getattr(student, "skill_gaps", []) or []) if sg]
        completed_titles = [str(t).lower() for t in (student.completed_course_titles or [])]

        history_tokens = (
            list(student.completed_course_titles or [])
            + list(student.completed_category_names or [])
            + learning_goals
            + skill_gaps
        )
        user_profile_text = " ".join(history_tokens)

        # Build candidate texts
        candidate_texts = [
            f"{c.title} {c.short_description} {c.category_name or ''} {' '.join(c.learning_objectives)}"
            for c in candidates
        ]

        tfidf_sims = CourseContentFeatureExtractor.compute_similarity(user_profile_text, candidate_texts)

        completed_categories = set(student.completed_category_names or [])
        completed_cat_ids = set(student.completed_category_ids or [])

        scored_candidates: list[tuple[CourseCandidate, float, str, str]] = []

        for idx, c in enumerate(candidates):
            content_sim = float(tfidf_sims[idx]) if idx < len(tfidf_sims) else 0.0
            cand_text_lower = f"{c.title} {c.short_description} {c.category_name or ''} {' '.join(c.learning_objectives)}".lower()

            # 1. Skill gap remediation check
            matched_gap = next(
                (g for g in skill_gaps if g in cand_text_lower or any(len(tok) >= 4 and tok in cand_text_lower for tok in g.split())),
                None,
            )

            # 2. Learning goal alignment check
            matched_goal = next(
                (g for g in learning_goals if g in cand_text_lower or any(len(tok) >= 4 and tok in cand_text_lower for tok in g.split())),
                None,
            )

            # 3. Category match bonus
            is_cat_match = (
                (c.category_name and c.category_name in completed_categories)
                or (c.category_id and c.category_id in completed_cat_ids)
            )
            cat_bonus = 0.25 if is_cat_match else 0.0

            # 4. Difficulty progression bonus
            pref_diff = student.preferred_difficulty
            diff_bonus = 0.10 if (pref_diff and c.difficulty.lower() == pref_diff.lower()) else 0.05

            # 5. Prerequisite evaluation
            prereqs = c.prerequisites or []
            if prereqs:
                prereqs_met = all(
                    any(p.lower().strip() in ct or ct in p.lower().strip() for ct in completed_titles)
                    for p in prereqs
                )
                prereq_adj = 0.08 if prereqs_met else -0.15
            else:
                prereq_adj = 0.0

            # Calculate composite score
            base_score = (content_sim * 0.40) + cat_bonus + diff_bonus + prereq_adj + 0.10

            if matched_gap:
                strategy = "skill_gap_remediation"
                reason = f"Targeted recommendation to strengthen key concepts in '{matched_gap.capitalize()}' based on your recent assessment results."
                total_score = min(0.99, base_score + 0.40)
            elif matched_goal:
                strategy = "goal_alignment"
                reason = f"Directly aligns with your selected learning goal in '{matched_goal.capitalize()}'."
                total_score = min(0.98, base_score + 0.30)
            elif is_cat_match and content_sim > 0.15:
                strategy = "content_based"
                matched_title = student.completed_course_titles[0] if student.completed_course_titles else "prior coursework"
                reason = f"Builds directly on your progress in '{matched_title}' within {c.category_name}."
                total_score = min(0.98, base_score + 0.15)
            elif is_cat_match:
                strategy = "category_matching"
                reason = f"Expands your skills in {c.category_name}, matching your active study focus."
                total_score = min(0.95, base_score + 0.10)
            elif content_sim > 0.20:
                strategy = "content_based"
                reason = "Strong topic alignment with concepts you recently practiced."
                total_score = min(0.92, base_score)
            else:
                strategy = "popularity_fallback"
                reason = f"Recommended popular curriculum course in {c.category_name or 'the catalog'}."
                total_score = max(0.50, min(0.85, base_score))

            scored_candidates.append((c, round(total_score, 3), strategy, reason))

        # Sort by total score descending
        scored_candidates.sort(key=lambda x: x[1], reverse=True)
        top_candidates = scored_candidates[:limit]

        recs = [
            RecommendedCourseItem(
                course_id=cand.id,
                title=cand.title,
                slug=cand.slug,
                short_description=cand.short_description,
                category_name=cand.category_name,
                difficulty=cand.difficulty,
                duration_minutes=cand.duration_minutes,
                score=score,
                strategy=strat,
                reason=rsn,
                matching_topics=cand.learning_objectives[:3],
            )
            for cand, score, strat, rsn in top_candidates
        ]

        # Determine dominant strategy
        strategies = [r.strategy for r in recs]
        dominant_strategy = max(set(strategies), key=strategies.count) if strategies else "content_based"

        return RecommendationResponse(
            recommendations=recs,
            total_evaluated=total_evaluated,
            applied_strategy=dominant_strategy,
            is_fallback=(dominant_strategy == "popularity_fallback"),
        )
