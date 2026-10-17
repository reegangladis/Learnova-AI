import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_recommendations_endpoint(ml_client: AsyncClient):
    payload = {
        "student": {
            "student_id": "std-123",
            "enrolled_course_ids": [],
            "completed_course_ids": [],
            "completed_category_ids": [],
            "completed_category_names": ["Computer Science"],
            "completed_course_titles": ["Python 101"],
            "recent_quiz_scores": [85.0],
            "preferred_difficulty": "intermediate",
        },
        "candidate_courses": [
            {
                "id": "c-10",
                "title": "Data Structures with Python",
                "slug": "data-structures-python",
                "short_description": "Arrays, trees, graphs in Python.",
                "category_id": "cat-cs",
                "category_name": "Computer Science",
                "difficulty": "intermediate",
                "duration_minutes": 150,
                "learning_objectives": ["trees", "graphs"],
                "prerequisites": ["Python 101"],
                "enrollment_count": 90,
                "rating": 4.8,
            }
        ],
        "limit": 5,
    }

    response = await ml_client.post("/api/v1/recommendations", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "recommendations" in data
    assert len(data["recommendations"]) == 1
    assert data["recommendations"][0]["course_id"] == "c-10"
    assert data["recommendations"][0]["strategy"] in ("content_based", "category_matching")


@pytest.mark.asyncio
async def test_predict_risk_endpoint(ml_client: AsyncClient):
    payload = {
        "student_id": "std-risk-test",
        "active_courses_count": 1,
        "completed_courses_count": 0,
        "total_lessons_assigned": 10,
        "completed_lessons_count": 8,
        "lesson_completion_rate": 0.8,
        "avg_quiz_score": 88.0,
        "quiz_pass_rate": 100.0,
        "total_quiz_attempts": 3,
        "failed_quiz_attempts": 0,
        "days_since_last_activity": 2,
        "total_study_time_minutes": 120,
    }

    response = await ml_client.post("/api/v1/predict/risk", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["student_id"] == "std-risk-test"
    assert data["risk_level"] == "low"
    assert data["is_insufficient_data"] is False
    assert len(data["contributing_factors"]) > 0


@pytest.mark.asyncio
async def test_learning_path_endpoint(ml_client: AsyncClient):
    payload = {
        "student_id": "std-path-test",
        "active_enrollments": [
            {
                "course_id": "c-active",
                "course_title": "Web Development Fundamentals",
                "completed_lessons": 3,
                "total_lessons": 8,
                "next_lesson_id": "les-4",
                "next_lesson_title": "CSS Flexbox & Grid",
                "next_lesson_order": 4,
            }
        ],
        "completed_course_titles": [],
        "quiz_history": [
            {
                "quiz_id": "q-1",
                "quiz_title": "HTML Basics Quiz",
                "course_title": "Web Development Fundamentals",
                "percentage_score": 60.0,
                "passed": False,
            }
        ],
        "available_courses": [],
    }

    response = await ml_client.post("/api/v1/learning-path", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["next_step"]["step_type"] == "lesson_completion"
    assert data["next_step"]["lesson_id"] == "les-4"
    # Should flag HTML Basics quiz as a skill gap
    assert len(data["skill_gaps"]) == 1
    assert data["skill_gaps"][0]["assessment_title"] == "HTML Basics Quiz"


@pytest.mark.asyncio
async def test_models_status_and_train_endpoint(ml_client: AsyncClient):
    # Check status
    status_resp = await ml_client.get("/api/v1/models/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["service_status"] == "operational"

    # Train model
    train_payload = {
        "model_name": "student_risk_predictor",
        "test_size": 0.2,
        "random_state": 42,
    }
    train_resp = await ml_client.post("/api/v1/models/train", json=train_payload)
    assert train_resp.status_code == 200
    train_data = train_resp.json()
    assert train_data["success"] is True
    assert train_data["metrics"]["accuracy"] >= 0.70
    assert train_data["training_samples"] > 0


@pytest.mark.asyncio
async def test_ml_service_internal_auth_enforcement():
    from app.main import create_ml_application
    from httpx import ASGITransport

    app = create_ml_application()
    transport = ASGITransport(app=app)

    # 1. Unauthenticated request to /models/status
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/v1/models/status")
        assert res.status_code == 401
        assert "Invalid or missing internal service authorization key" in res.json()["detail"]

    # 2. Invalid key to /recommendations
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        headers={"X-Internal-Service-Key": "wrong-key"},
    ) as client:
        res = await client.post("/api/v1/recommendations", json={})
        assert res.status_code == 401
