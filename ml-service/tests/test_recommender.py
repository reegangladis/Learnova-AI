import pytest
from app.models.recommender import CourseRecommender
from app.schemas.recommendations import (
    CourseCandidate,
    RecommendationRequest,
    StudentProfile,
)


@pytest.fixture
def sample_catalog():
    return [
        CourseCandidate(
            id="c-1",
            title="Python Fundamentals",
            slug="python-fundamentals",
            short_description="Learn core Python syntax and variables.",
            category_id="cat-py",
            category_name="Computer Science",
            difficulty="beginner",
            duration_minutes=120,
            learning_objectives=["syntax", "variables", "loops"],
            enrollment_count=150,
            rating=4.8,
        ),
        CourseCandidate(
            id="c-2",
            title="Advanced Machine Learning",
            slug="advanced-ml",
            short_description="Deep learning, transformers, and model evaluation.",
            category_id="cat-ai",
            category_name="Artificial Intelligence",
            difficulty="advanced",
            duration_minutes=300,
            learning_objectives=["transformers", "pytorch", "deep-learning"],
            enrollment_count=85,
            rating=4.9,
        ),
        CourseCandidate(
            id="c-3",
            title="Data Analysis with Python",
            slug="data-analysis-python",
            short_description="Pandas and data exploration.",
            category_id="cat-py",
            category_name="Computer Science",
            difficulty="intermediate",
            duration_minutes=180,
            learning_objectives=["pandas", "visualization", "dataframes"],
            enrollment_count=110,
            rating=4.7,
        ),
        CourseCandidate(
            id="c-4",
            title="Modern Graphic Design",
            slug="graphic-design",
            short_description="Typography, color theory, and layout.",
            category_id="cat-design",
            category_name="Design",
            difficulty="beginner",
            duration_minutes=90,
            learning_objectives=["typography", "color-theory"],
            enrollment_count=60,
            rating=4.5,
        ),
    ]


def test_cold_start_popularity_fallback(sample_catalog):
    recommender = CourseRecommender()
    new_student = StudentProfile(
        student_id="new-std",
        enrolled_course_ids=[],
        completed_course_ids=[],
        completed_category_ids=[],
        completed_category_names=[],
        completed_course_titles=[],
    )

    req = RecommendationRequest(student=new_student, candidate_courses=sample_catalog, limit=3)
    resp = recommender.recommend(req)

    assert resp.is_fallback is True
    assert resp.applied_strategy == "popularity_fallback"
    assert len(resp.recommendations) == 3
    # First recommended should be popular beginner courses
    assert resp.recommendations[0].difficulty == "beginner"
    assert "popular" in resp.recommendations[0].reason.lower()


def test_exclusion_of_enrolled_and_completed_courses(sample_catalog):
    recommender = CourseRecommender()
    student = StudentProfile(
        student_id="active-std",
        enrolled_course_ids=["c-1"],
        completed_course_ids=["c-3"],
        completed_category_ids=["cat-py"],
        completed_category_names=["Computer Science"],
        completed_course_titles=["Data Analysis with Python"],
    )

    req = RecommendationRequest(student=student, candidate_courses=sample_catalog, limit=5)
    resp = recommender.recommend(req)

    returned_ids = [r.course_id for r in resp.recommendations]
    # Enrolled (c-1) and completed (c-3) MUST NOT be present
    assert "c-1" not in returned_ids
    assert "c-3" not in returned_ids
    assert len(resp.recommendations) == 2


def test_personalized_content_matching(sample_catalog):
    recommender = CourseRecommender()
    student = StudentProfile(
        student_id="cs-std",
        enrolled_course_ids=[],
        completed_course_ids=["c-1"],
        completed_category_ids=["cat-py"],
        completed_category_names=["Computer Science"],
        completed_course_titles=["Python Fundamentals"],
    )

    req = RecommendationRequest(student=student, candidate_courses=sample_catalog, limit=3)
    resp = recommender.recommend(req)

    assert len(resp.recommendations) > 0
    # Data Analysis with Python (c-3) should be top-ranked due to category match and Python keyword
    top_rec = resp.recommendations[0]
    assert top_rec.course_id == "c-3"
    assert top_rec.strategy in ("content_based", "category_matching")
    assert "Computer Science" in top_rec.reason or "Python" in top_rec.reason


def test_empty_candidates_handling():
    recommender = CourseRecommender()
    student = StudentProfile(student_id="std-empty")
    req = RecommendationRequest(student=student, candidate_courses=[], limit=5)
    resp = recommender.recommend(req)

    assert resp.recommendations == []
    assert resp.total_evaluated == 0


def test_recommendation_with_skill_gaps_and_goals(sample_catalog):
    recommender = CourseRecommender()
    student = StudentProfile(
        student_id="std-gap",
        enrolled_course_ids=[],
        completed_course_ids=[],
        learning_goals=["Data Analysis"],
        skill_gaps=["Typography"],
    )

    req = RecommendationRequest(student=student, candidate_courses=sample_catalog, limit=3)
    resp = recommender.recommend(req)

    assert len(resp.recommendations) > 0
    top_rec = resp.recommendations[0]
    # Course c-4 is 'Modern Graphic Design' matching the skill gap
    assert top_rec.course_id == "c-4"
    assert top_rec.strategy == "skill_gap_remediation"
    assert "strengthen key concepts" in top_rec.reason.lower()

