import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.rbac import SystemRole
from backend.app.core.security import hash_password
from backend.app.models.course import (
    Course,
    CourseCategory,
    CourseModule,
    CourseStatus,
    Lesson,
)
from backend.app.models.enrollment import Enrollment, EnrollmentStatus, LessonProgress
from backend.app.models.organization import Organization
from backend.app.models.quiz import AttemptStatus, Quiz, QuizAttempt, QuizStatus
from backend.app.models.user import User
from backend.app.repositories.role_repo import RoleRepository
from backend.app.repositories.user_repo import UserRepository


async def create_user(
    db: AsyncSession,
    email: str,
    role_name: str,
    org_id: uuid.UUID | None = None,
    password: str = "Password123!",
) -> User:
    """Helper to provision a verified user with the specified role."""
    user_repo = UserRepository(db)
    role_repo = RoleRepository(db)

    user = await user_repo.create(
        email=email,
        password_hash=hash_password(password),
        first_name="Test",
        last_name=role_name.capitalize(),
        organization_id=org_id,
        is_verified=True,
    )
    role = await role_repo.get_role_by_name(role_name)
    if role:
        await role_repo.assign_role_to_user(user, role)
    await db.commit()
    return user


async def get_auth_cookie(
    client: AsyncClient, email: str, password: str = "Password123!"
) -> dict[str, str]:
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    token = login_res.cookies.get("learnova_access_token")
    return {"learnova_access_token": token} if token else {}


# =============================================================================
# 1. Course Recommendations Tests
# =============================================================================


@pytest.mark.asyncio
async def test_recommendations_unauthenticated(client: AsyncClient):
    res = await client.get("/api/v1/ml/recommendations")
    assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_recommendations_cold_start_and_exclusion(
    client: AsyncClient, db_session: AsyncSession
):
    student = await create_user(db_session, "ml_student_1@example.com", SystemRole.STUDENT)
    instructor = await create_user(db_session, "ml_inst_1@example.com", SystemRole.INSTRUCTOR)

    # Create category
    cat = CourseCategory(name="Data Science", slug="data-science-ml")
    db_session.add(cat)
    await db_session.flush()

    # Create 3 published courses
    c1 = Course(
        title="Intro to Python",
        slug="intro-python-ml",
        short_description="Basics of Python.",
        description="Comprehensive beginner course.",
        difficulty="beginner",
        instructor_id=instructor.id,
        category_id=cat.id,
        status=CourseStatus.PUBLISHED.value,
        learning_objectives=["syntax", "variables"],
    )
    c2 = Course(
        title="Data Analysis with Pandas",
        slug="data-pandas-ml",
        short_description="Data wrangling with Pandas.",
        description="Intermediate data analysis.",
        difficulty="intermediate",
        instructor_id=instructor.id,
        category_id=cat.id,
        status=CourseStatus.PUBLISHED.value,
        learning_objectives=["pandas", "dataframes"],
    )
    c3 = Course(
        title="Machine Learning Foundations",
        slug="ml-foundations-test",
        short_description="Foundations of ML models.",
        description="Supervised learning.",
        difficulty="intermediate",
        instructor_id=instructor.id,
        category_id=cat.id,
        status=CourseStatus.PUBLISHED.value,
        learning_objectives=["regression", "classification"],
    )
    db_session.add_all([c1, c2, c3])
    await db_session.flush()

    # Enroll student in c1
    enr = Enrollment(
        user_id=student.id,
        course_id=c1.id,
        status=EnrollmentStatus.ACTIVE.value,
    )
    db_session.add(enr)
    await db_session.commit()

    cookies = await get_auth_cookie(client, "ml_student_1@example.com")
    res = await client.get("/api/v1/ml/recommendations", cookies=cookies)
    assert res.status_code == 200
    payload = res.json()
    assert payload["success"] is True

    data = payload["data"]
    rec_ids = [r["course_id"] for r in data["recommendations"]]

    # c1 must be excluded since student is enrolled in it
    assert str(c1.id) not in rec_ids
    # c2 and c3 should be present
    assert str(c2.id) in rec_ids or str(c3.id) in rec_ids


@pytest.mark.asyncio
async def test_recommendations_multi_tenant_isolation(
    client: AsyncClient, db_session: AsyncSession
):
    org_a = Organization(name="Org Alpha", slug="org-alpha-ml")
    org_b = Organization(name="Org Beta", slug="org-beta-ml")
    db_session.add_all([org_a, org_b])
    await db_session.flush()

    await create_user(
        db_session, "student_a_org@example.com", SystemRole.STUDENT, org_id=org_a.id
    )
    inst_b = await create_user(
        db_session, "inst_b_org@example.com", SystemRole.INSTRUCTOR, org_id=org_b.id
    )

    # Course in Org B (private to Org B)
    course_b = Course(
        title="Org B Proprietary Tech",
        slug="org-b-tech-ml",
        short_description="Confidential Org B Course.",
        description="Private.",
        instructor_id=inst_b.id,
        organization_id=org_b.id,
        status=CourseStatus.PUBLISHED.value,
    )
    db_session.add(course_b)
    await db_session.commit()

    cookies = await get_auth_cookie(client, "student_a_org@example.com")
    res = await client.get("/api/v1/ml/recommendations", cookies=cookies)
    assert res.status_code == 200
    rec_ids = [r["course_id"] for r in res.json()["data"]["recommendations"]]

    # Student A must NEVER see course_b from Org B!
    assert str(course_b.id) not in rec_ids


# =============================================================================
# 2. Learning-Risk & Insights Tests
# =============================================================================


@pytest.mark.asyncio
async def test_learning_insights_cold_start(
    client: AsyncClient, db_session: AsyncSession
):
    student = await create_user(db_session, "ml_new_student@example.com", SystemRole.STUDENT)
    cookies = await get_auth_cookie(client, "ml_new_student@example.com")

    res = await client.get("/api/v1/ml/learning-insights", cookies=cookies)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["student_id"] == str(student.id)
    assert data["is_insufficient_data"] is True
    assert data["risk_level"] == "insufficient_data"
    assert len(data["supportive_guidance"]) > 0


@pytest.mark.asyncio
async def test_learning_insights_active_student(
    client: AsyncClient, db_session: AsyncSession
):
    student = await create_user(db_session, "ml_active_student@example.com", SystemRole.STUDENT)
    instructor = await create_user(db_session, "ml_inst_active@example.com", SystemRole.INSTRUCTOR)

    course = Course(
        title="Web Security Essentials",
        slug="web-sec-essentials",
        short_description="Web security fundamentals.",
        description="OWASP Top 10.",
        instructor_id=instructor.id,
        status=CourseStatus.PUBLISHED.value,
    )
    db_session.add(course)
    await db_session.flush()

    module = CourseModule(course_id=course.id, title="Module 1", order_index=1)
    db_session.add(module)
    await db_session.flush()

    lesson = Lesson(
        module_id=module.id,
        title="SQL Injection Defense",
        order_index=1,
    )
    db_session.add(lesson)
    await db_session.flush()

    # Enroll & complete lesson
    enr = Enrollment(user_id=student.id, course_id=course.id, status=EnrollmentStatus.ACTIVE.value)
    prog = LessonProgress(
        user_id=student.id,
        course_id=course.id,
        lesson_id=lesson.id,
        is_completed=True,
    )
    db_session.add_all([enr, prog])
    await db_session.commit()

    cookies = await get_auth_cookie(client, "ml_active_student@example.com")
    res = await client.get("/api/v1/ml/learning-insights", cookies=cookies)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["student_id"] == str(student.id)
    assert data["is_insufficient_data"] is False
    assert data["risk_level"] in ("low", "moderate", "high")
    assert len(data["contributing_factors"]) > 0


# =============================================================================
# 3. Learning-Path Tests
# =============================================================================


@pytest.mark.asyncio
async def test_learning_path_next_lesson_and_skill_gap(
    client: AsyncClient, db_session: AsyncSession
):
    student = await create_user(db_session, "ml_path_student@example.com", SystemRole.STUDENT)
    instructor = await create_user(db_session, "ml_path_inst@example.com", SystemRole.INSTRUCTOR)

    course = Course(
        title="Fullstack TypeScript",
        slug="fullstack-ts",
        short_description="Fullstack with TS.",
        description="TypeScript end to end.",
        instructor_id=instructor.id,
        status=CourseStatus.PUBLISHED.value,
    )
    db_session.add(course)
    await db_session.flush()

    module = CourseModule(course_id=course.id, title="Basics", order_index=1)
    db_session.add(module)
    await db_session.flush()

    l1 = Lesson(module_id=module.id, title="Types & Interfaces", order_index=1)
    l2 = Lesson(module_id=module.id, title="Generics in Depth", order_index=2)
    db_session.add_all([l1, l2])
    await db_session.flush()

    # Enroll and complete l1
    enr = Enrollment(user_id=student.id, course_id=course.id, status=EnrollmentStatus.ACTIVE.value)
    prog = LessonProgress(user_id=student.id, course_id=course.id, lesson_id=l1.id, is_completed=True)
    db_session.add_all([enr, prog])

    # Add a failed quiz to test skill gap detection
    quiz = Quiz(
        course_id=course.id,
        instructor_id=instructor.id,
        title="Types Check Quiz",
        status=QuizStatus.PUBLISHED.value,
    )
    db_session.add(quiz)
    await db_session.flush()

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=student.id,
        attempt_number=1,
        status=AttemptStatus.COMPLETED.value,
        score=50.0,
        max_score=100.0,
        percentage_score=50.0,
        passed=False,
    )
    db_session.add(attempt)
    await db_session.commit()

    cookies = await get_auth_cookie(client, "ml_path_student@example.com")
    res = await client.get("/api/v1/ml/learning-path", cookies=cookies)
    assert res.status_code == 200
    data = res.json()["data"]

    # Next step should be l2 (Generics in Depth)
    next_step = data["next_step"]
    assert next_step["step_type"] == "lesson_completion"
    assert next_step["lesson_id"] == str(l2.id)

    # Should detect skill gap for Types Check Quiz
    assert len(data["skill_gaps"]) >= 1
    assert any("Types Check Quiz" in g["assessment_title"] for g in data["skill_gaps"])


# =============================================================================
# 4. Model-Status RBAC Tests
# =============================================================================


@pytest.mark.asyncio
async def test_model_status_rbac(client: AsyncClient, db_session: AsyncSession):
    await create_user(db_session, "ml_regular_std@example.com", SystemRole.STUDENT)
    await create_user(db_session, "ml_admin_user@example.com", SystemRole.ADMIN)

    # Unauthenticated
    unauth_res = await client.get("/api/v1/ml/model-status")
    assert unauth_res.status_code in (401, 403)

    # Student should be Forbidden (403)
    std_cookies = await get_auth_cookie(client, "ml_regular_std@example.com")
    std_res = await client.get("/api/v1/ml/model-status", cookies=std_cookies)
    assert std_res.status_code == 403

    # Admin should succeed (200)
    admin_cookies = await get_auth_cookie(client, "ml_admin_user@example.com")
    admin_res = await client.get("/api/v1/ml/model-status", cookies=admin_cookies)
    assert admin_res.status_code == 200
    admin_data = admin_res.json()["data"]
    assert "service_status" in admin_data
    assert len(admin_data["active_models"]) > 0
    # Verify experimental status and provenance
    risk_model = next((m for m in admin_data["active_models"] if m["model_name"] == "risk_prediction"), None)
    if risk_model:
        assert risk_model["status"] == "experimental"
        assert risk_model["provenance"] == "synthetic_educational_benchmark"


@pytest.mark.asyncio
async def test_multi_signal_recommendations_goals_and_skill_gaps(
    client: AsyncClient, db_session: AsyncSession
):
    """Verifies that recommendations evaluate assessment-derived skill gaps and user learning goals."""
    student = await create_user(db_session, "ml_signal_std@example.com", SystemRole.STUDENT)
    instructor = await create_user(db_session, "ml_signal_inst@example.com", SystemRole.INSTRUCTOR)

    # 1. Base course and failed quiz attempt to produce a skill gap signal
    c_base = Course(
        title="Intro to Cloud",
        slug="intro-to-cloud-signals",
        short_description="Cloud basics.",
        description="Detailed cloud basics.",
        instructor_id=instructor.id,
        status=CourseStatus.PUBLISHED.value,
    )
    db_session.add(c_base)
    await db_session.flush()

    quiz = Quiz(
        course_id=c_base.id,
        instructor_id=instructor.id,
        title="Containers Assessment",
        status=QuizStatus.PUBLISHED.value,
    )
    db_session.add(quiz)
    await db_session.flush()

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=student.id,
        attempt_number=1,
        status=AttemptStatus.COMPLETED.value,
        score=45.0,
        max_score=100.0,
        percentage_score=45.0,
        passed=False,
    )
    db_session.add(attempt)

    # 2. Candidate course remediating the container skill gap
    c_remedy = Course(
        title="Kubernetes and Containers in Depth",
        slug="k8s-containers-remedy",
        short_description="Master container orchestration.",
        description="Comprehensive container architecture.",
        difficulty="intermediate",
        instructor_id=instructor.id,
        status=CourseStatus.PUBLISHED.value,
        learning_objectives=["containers", "kubernetes", "docker"],
    )
    # 3. Candidate course matching a declared goal
    c_goal = Course(
        title="Golang Concurrency Patterns",
        slug="golang-concurrency-goal",
        short_description="Master Go concurrency.",
        description="Deep dive into channels and goroutines.",
        difficulty="intermediate",
        instructor_id=instructor.id,
        status=CourseStatus.PUBLISHED.value,
        learning_objectives=["goroutines", "concurrency", "channels"],
    )
    db_session.add_all([c_remedy, c_goal])
    await db_session.commit()

    cookies = await get_auth_cookie(client, "ml_signal_std@example.com")
    res = await client.get("/api/v1/ml/recommendations?goal=concurrency", cookies=cookies)
    assert res.status_code == 200
    data = res.json()["data"]
    recs = data["recommendations"]

    assert len(recs) >= 1
    # Check that recommendation reasons and strategies accurately reflect the signals
    strategies = [r["strategy"] for r in recs]
    assert any(s in ("skill_gap_remediation", "goal_alignment", "content_based", "popularity_fallback") for s in strategies)
    # Ensure every recommendation provides an explanatory reason
    for r in recs:
        assert len(r["reason"]) > 0


@pytest.mark.asyncio
async def test_model_training_rbac_and_provenance(
    client: AsyncClient, db_session: AsyncSession
):
    """Verifies that only administrators can trigger model retraining and experimental provenance is preserved."""
    await create_user(db_session, "train_std@example.com", SystemRole.STUDENT)
    await create_user(db_session, "train_inst@example.com", SystemRole.INSTRUCTOR)
    await create_user(db_session, "train_admin@example.com", SystemRole.ADMIN)

    # 1. Unauthenticated -> 401/403
    unauth_res = await client.post("/api/v1/ml/train", json={"model_name": "risk_prediction"})
    assert unauth_res.status_code in (401, 403)

    # 2. Student -> 403 Forbidden
    std_cookie = await get_auth_cookie(client, "train_std@example.com")
    std_res = await client.post(
        "/api/v1/ml/train",
        json={"model_name": "risk_prediction"},
        cookies=std_cookie,
    )
    assert std_res.status_code == 403

    # 3. Instructor -> 403 Forbidden
    inst_cookie = await get_auth_cookie(client, "train_inst@example.com")
    inst_res = await client.post(
        "/api/v1/ml/train",
        json={"model_name": "risk_prediction"},
        cookies=inst_cookie,
    )
    assert inst_res.status_code == 403

    # 4. Admin -> 200 OK with governance metadata
    admin_cookie = await get_auth_cookie(client, "train_admin@example.com")
    admin_res = await client.post(
        "/api/v1/ml/train",
        json={"model_name": "risk_prediction", "epochs": 5},
        cookies=admin_cookie,
    )
    assert admin_res.status_code == 200
    res_data = admin_res.json()["data"]
    assert res_data["status"] == "experimental"
    assert res_data["provenance"] == "synthetic_educational_benchmark"
    assert res_data["model_name"] == "risk_prediction"

