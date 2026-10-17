import re
from typing import Any

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

FEATURE_NAMES = [
    "lesson_completion_rate",
    "avg_quiz_score_norm",
    "quiz_pass_rate_norm",
    "failed_quiz_ratio",
    "days_inactive_norm",
    "active_courses_norm",
    "study_time_hours_norm",
]


class StudentFeatureExtractor:
    """Extracts, validates, and normalizes learning features for predictive modeling."""

    @staticmethod
    def extract_features_vector(data: dict[str, Any]) -> np.ndarray:
        """Transforms a raw student telemetry dictionary into a clean numerical feature array."""
        total_lessons = max(0, int(data.get("total_lessons_assigned", 0)))
        completed_lessons = max(0, int(data.get("completed_lessons_count", 0)))
        lesson_completion_rate = (
            completed_lessons / total_lessons if total_lessons > 0 else 0.0
        )
        lesson_completion_rate = float(np.clip(lesson_completion_rate, 0.0, 1.0))

        avg_quiz = float(np.clip(data.get("avg_quiz_score", 0.0), 0.0, 100.0)) / 100.0
        pass_rate = float(np.clip(data.get("quiz_pass_rate", 0.0), 0.0, 100.0)) / 100.0

        total_attempts = max(0, int(data.get("total_quiz_attempts", 0)))
        failed_attempts = max(0, int(data.get("failed_quiz_attempts", 0)))
        failed_quiz_ratio = (
            min(1.0, failed_attempts / total_attempts) if total_attempts > 0 else 0.0
        )

        days_inactive = max(0, int(data.get("days_since_last_activity", 0)))
        days_inactive_norm = float(np.clip(days_inactive / 30.0, 0.0, 1.0))

        active_courses = max(0, int(data.get("active_courses_count", 0)))
        active_courses_norm = float(np.clip(active_courses / 5.0, 0.0, 1.0))

        study_time_mins = max(0, int(data.get("total_study_time_minutes", 0)))
        study_time_hours_norm = float(np.clip((study_time_mins / 60.0) / 20.0, 0.0, 1.0))

        features = [
            lesson_completion_rate,
            avg_quiz,
            pass_rate,
            failed_quiz_ratio,
            days_inactive_norm,
            active_courses_norm,
            study_time_hours_norm,
        ]
        return np.array(features, dtype=np.float32)

    @staticmethod
    def is_insufficient_data(data: dict[str, Any]) -> bool:
        """Determines whether student has zero or near-zero historical interaction."""
        active = int(data.get("active_courses_count", 0))
        completed = int(data.get("completed_courses_count", 0))
        lessons_completed = int(data.get("completed_lessons_count", 0))
        quizzes = int(data.get("total_quiz_attempts", 0))

        return (active == 0 and completed == 0) or (lessons_completed == 0 and quizzes == 0)


class CourseContentFeatureExtractor:
    """Extracts text and metadata representations for content-based course similarity."""

    @staticmethod
    def clean_text(text: str) -> str:
        """Lowercases and strips special characters."""
        if not text:
            return ""
        text = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
        return " ".join(text.split())

    @classmethod
    def compute_similarity(
        cls,
        user_text: str,
        catalog_texts: list[str],
    ) -> np.ndarray:
        """Computes TF-IDF cosine similarity between user interests and catalog courses."""
        if not catalog_texts or not user_text.strip():
            return np.zeros(len(catalog_texts), dtype=np.float32)

        corpus = [cls.clean_text(user_text)] + [cls.clean_text(t) for t in catalog_texts]
        vectorizer = TfidfVectorizer(stop_words="english", max_features=500)
        tfidf_matrix = vectorizer.fit_transform(corpus)

        user_vec = tfidf_matrix[0:1]
        catalog_vecs = tfidf_matrix[1:]

        sims = cosine_similarity(user_vec, catalog_vecs).flatten()
        return sims
