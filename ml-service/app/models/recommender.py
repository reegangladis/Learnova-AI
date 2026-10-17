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

        # 2. Check for cold-start (new student with no course history)
        has_history = bool(
            student.completed_course_ids
            or student.completed_category_names
            or student.completed_course_titles
        )

        if not has_history:
            return self._cold_start_recommendations(eligible_candidates, limit, len(all_candidates))

        # 3. Content-based & Category similarity
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
        """Calculates TF-IDF content similarity and category matching."""
        # Build student profile text
        history_tokens = list(student.completed_course_titles) + list(student.completed_category_names)
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

            # Category match bonus
            is_cat_match = (
                (c.category_name and c.category_name in completed_categories)
                or (c.category_id and c.category_id in completed_cat_ids)
            )
            cat_bonus = 0.35 if is_cat_match else 0.0

            # Difficulty progression bonus
            pref_diff = student.preferred_difficulty
            diff_bonus = 0.10 if (pref_diff and c.difficulty.lower() == pref_diff.lower()) else 0.05

            total_score = min(0.99, (content_sim * 0.50) + cat_bonus + diff_bonus + 0.10)

            if is_cat_match and content_sim > 0.15:
                strategy = "content_based"
                matched_title = student.completed_course_titles[0] if student.completed_course_titles else "prior coursework"
                reason = f"Builds directly on your progress in '{matched_title}' within {c.category_name}."
            elif is_cat_match:
                strategy = "category_matching"
                reason = f"Expands your skills in {c.category_name}, matching your active study focus."
            elif content_sim > 0.20:
                strategy = "content_based"
                reason = "Strong topic alignment with concepts you recently practiced."
            else:
                strategy = "popularity_fallback"
                reason = f"Recommended popular curriculum course in {c.category_name or 'the catalog'}."

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
