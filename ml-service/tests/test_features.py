import numpy as np
import pytest
from app.features.engineering import (
    CourseContentFeatureExtractor,
    StudentFeatureExtractor,
)


def test_student_feature_extractor_normal_values():
    data = {
        "student_id": "std-1",
        "active_courses_count": 2,
        "completed_courses_count": 1,
        "total_lessons_assigned": 10,
        "completed_lessons_count": 8,
        "avg_quiz_score": 85.0,
        "quiz_pass_rate": 80.0,
        "total_quiz_attempts": 5,
        "failed_quiz_attempts": 1,
        "days_since_last_activity": 3,
        "total_study_time_minutes": 360,
    }

    vec = StudentFeatureExtractor.extract_features_vector(data)
    assert len(vec) == 7
    # lesson_completion_rate: 8/10 = 0.8
    assert np.isclose(vec[0], 0.8)
    # avg_quiz: 85 / 100 = 0.85
    assert np.isclose(vec[1], 0.85)
    # pass_rate: 80 / 100 = 0.8
    assert np.isclose(vec[2], 0.8)
    # failed_quiz_ratio: 1/5 = 0.2
    assert np.isclose(vec[3], 0.2)
    # days_inactive_norm: 3 / 30 = 0.1
    assert np.isclose(vec[4], 0.1)


def test_student_feature_extractor_bounds_and_zero_division():
    # Extreme edge cases
    data = {
        "student_id": "std-edge",
        "active_courses_count": -5,
        "total_lessons_assigned": 0,
        "completed_lessons_count": 0,
        "avg_quiz_score": 150.0,  # over 100
        "quiz_pass_rate": -10.0,  # below 0
        "total_quiz_attempts": 0,
        "failed_quiz_attempts": 0,
        "days_since_last_activity": 120,
        "total_study_time_minutes": 10000,
    }

    vec = StudentFeatureExtractor.extract_features_vector(data)
    assert len(vec) == 7
    # completion rate clamped to 0.0
    assert vec[0] == 0.0
    # quiz score clamped to 1.0
    assert vec[1] == 1.0
    # pass rate clamped to 0.0
    assert vec[2] == 0.0
    # failed quiz clamped to 0.0
    assert vec[3] == 0.0
    # days inactive clamped to 1.0
    assert vec[4] == 1.0


def test_insufficient_data_detection():
    # Brand new student with 0 enrollments
    new_student = {
        "active_courses_count": 0,
        "completed_courses_count": 0,
        "completed_lessons_count": 0,
        "total_quiz_attempts": 0,
    }
    assert StudentFeatureExtractor.is_insufficient_data(new_student) is True

    # Student enrolled but hasn't done anything yet
    enrolled_idle = {
        "active_courses_count": 1,
        "completed_courses_count": 0,
        "completed_lessons_count": 0,
        "total_quiz_attempts": 0,
    }
    assert StudentFeatureExtractor.is_insufficient_data(enrolled_idle) is True

    # Student has completed at least 1 lesson
    active_student = {
        "active_courses_count": 1,
        "completed_courses_count": 0,
        "completed_lessons_count": 1,
        "total_quiz_attempts": 0,
    }
    assert StudentFeatureExtractor.is_insufficient_data(active_student) is False


def test_course_content_similarity_computation():
    user_text = "python programming data analysis pandas"
    catalog = [
        "Mastering Python for Data Science and Machine Learning with Pandas",
        "Introduction to Graphic Design with Photoshop",
        "Advanced Data Analysis in Python",
    ]

    sims = CourseContentFeatureExtractor.compute_similarity(user_text, catalog)
    assert len(sims) == 3
    # Python courses should have much higher similarity than Graphic Design
    assert sims[0] > sims[1]
    assert sims[2] > sims[1]
    assert sims[1] == pytest.approx(0.0, abs=0.05)
