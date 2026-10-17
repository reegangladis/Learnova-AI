import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.rbac import SystemRole
from backend.app.core.security import hash_password
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
    return {"learnova_access_token": token}


async def setup_published_course(
    client: AsyncClient,
    admin_cookie: dict[str, str],
    inst_cookie: dict[str, str],
    title: str = "Python & FastAPI Fundamentals",
) -> str:
    """Provision a published course with 1 module and 1 lesson."""
    cat_res = await client.post(
        "/api/v1/course-categories",
        json={"name": f"Category {uuid.uuid4().hex[:6]}"},
        cookies=admin_cookie,
    )
    assert cat_res.status_code == 201
    cat_id = cat_res.json()["id"]

    course_res = await client.post(
        "/api/v1/courses",
        json={
            "title": title,
            "category_id": cat_id,
            "short_description": "Comprehensive FastAPI course",
            "description": "Full detailed description of Python and FastAPI",
            "difficulty": "beginner",
            "learning_objectives": ["Build APIs", "Pass Quizzes"],
            "prerequisites": ["Python basics"],
        },
        cookies=inst_cookie,
    )
    assert course_res.status_code == 201
    course_id = course_res.json()["id"]

    mod_res = await client.post(
        f"/api/v1/courses/{course_id}/modules",
        json={"title": "Module 1: Getting Started", "order_index": 0},
        cookies=inst_cookie,
    )
    assert mod_res.status_code == 201
    mod_id = mod_res.json()["id"]

    les_res = await client.post(
        f"/api/v1/modules/{mod_id}/lessons",
        json={
            "title": "Lesson 1: Introduction",
            "content_type": "text",
            "text_content": "Welcome to Python and FastAPI",
            "duration_minutes": 10,
            "order_index": 0,
        },
        cookies=inst_cookie,
    )
    assert les_res.status_code == 201

    pub_res = await client.post(
        f"/api/v1/courses/{course_id}/publish",
        cookies=inst_cookie,
    )
    assert pub_res.status_code == 200
    return course_id


@pytest.mark.asyncio
async def test_quiz_crud_and_instructor_ownership(
    client: AsyncClient, db_session: AsyncSession
):
    """Test creating, reading, updating, and deleting draft quizzes with instructor ownership."""
    admin_user = await create_user(db_session, "admin_quiz@learnova.ai", SystemRole.ADMIN.value)
    inst_1 = await create_user(db_session, "inst1_quiz@learnova.ai", SystemRole.INSTRUCTOR.value)
    inst_2 = await create_user(db_session, "inst2_quiz@learnova.ai", SystemRole.INSTRUCTOR.value)

    admin_cookie = await get_auth_cookie(client, admin_user.email)
    inst1_cookie = await get_auth_cookie(client, inst_1.email)
    inst2_cookie = await get_auth_cookie(client, inst_2.email)

    course_id = await setup_published_course(client, admin_cookie, inst1_cookie)

    # 1. Instructor 1 creates a draft quiz
    create_res = await client.post(
        "/api/v1/quizzes",
        json={
            "course_id": course_id,
            "title": "TypeScript Mastery Quiz",
            "description": "Assess basic type theory",
            "instructions": "Answer all questions before submitting.",
            "duration_minutes": 30,
            "passing_score_percentage": 75.0,
            "max_attempts": 2,
        },
        cookies=inst1_cookie,
    )
    assert create_res.status_code == 201
    quiz_data = create_res.json()
    quiz_id = quiz_data["id"]
    assert quiz_data["status"] == "draft"
    assert quiz_data["duration_minutes"] == 30
    assert quiz_data["passing_score_percentage"] == 75.0

    # 2. Instructor 1 reads quiz
    get_res = await client.get(f"/api/v1/quizzes/{quiz_id}", cookies=inst1_cookie)
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "TypeScript Mastery Quiz"

    # 3. Instructor 2 cannot read or modify Instructor 1's quiz
    inst2_get = await client.get(f"/api/v1/quizzes/{quiz_id}", cookies=inst2_cookie)
    assert inst2_get.status_code == 403

    inst2_patch = await client.patch(
        f"/api/v1/quizzes/{quiz_id}",
        json={"title": "Hacked Title"},
        cookies=inst2_cookie,
    )
    assert inst2_patch.status_code == 403

    # 4. Instructor 1 updates quiz
    patch_res = await client.patch(
        f"/api/v1/quizzes/{quiz_id}",
        json={"title": "Updated Quiz Title", "duration_minutes": 45},
        cookies=inst1_cookie,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Updated Quiz Title"
    assert patch_res.json()["duration_minutes"] == 45

    # 5. Instructor 1 lists quizzes
    list_res = await client.get("/api/v1/quizzes/instructor/me", cookies=inst1_cookie)
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 1


@pytest.mark.asyncio
async def test_question_validation_and_supported_types(
    client: AsyncClient, db_session: AsyncSession
):
    """Test questions supporting single_choice, true_false, and multiple_select with validation."""
    admin_user = await create_user(db_session, "admin_q@learnova.ai", SystemRole.ADMIN.value)
    inst_user = await create_user(db_session, "inst_q@learnova.ai", SystemRole.INSTRUCTOR.value)

    admin_cookie = await get_auth_cookie(client, admin_user.email)
    inst_cookie = await get_auth_cookie(client, inst_user.email)

    course_id = await setup_published_course(client, admin_cookie, inst_cookie)

    quiz_res = await client.post(
        "/api/v1/quizzes",
        json={"course_id": course_id, "title": "Question Validation Quiz"},
        cookies=inst_cookie,
    )
    assert quiz_res.status_code == 201
    quiz_id = quiz_res.json()["id"]

    # 1. Single Choice: Fails if 0 correct answers
    sc_invalid = await client.post(
        f"/api/v1/quizzes/{quiz_id}/questions",
        json={
            "question_text": "What is Python?",
            "question_type": "single_choice",
            "points": 2,
            "options": [
                {"option_text": "A snake", "is_correct": False},
                {"option_text": "A programming language", "is_correct": False},
            ],
        },
        cookies=inst_cookie,
    )
    assert sc_invalid.status_code == 400

    # 2. Single Choice: Fails if 2 correct answers
    sc_invalid2 = await client.post(
        f"/api/v1/quizzes/{quiz_id}/questions",
        json={
            "question_text": "What is Python?",
            "question_type": "single_choice",
            "points": 2,
            "options": [
                {"option_text": "A language", "is_correct": True},
                {"option_text": "Software", "is_correct": True},
            ],
        },
        cookies=inst_cookie,
    )
    assert sc_invalid2.status_code == 400

    # 3. Single Choice: Valid with 1 correct answer
    sc_valid = await client.post(
        f"/api/v1/quizzes/{quiz_id}/questions",
        json={
            "question_text": "What is Python?",
            "question_type": "single_choice",
            "points": 2,
            "explanation": "Python is a high-level interpreted programming language.",
            "options": [
                {"option_text": "A snake only", "is_correct": False},
                {"option_text": "A high-level programming language", "is_correct": True},
            ],
        },
        cookies=inst_cookie,
    )
    assert sc_valid.status_code == 201
    q1_id = sc_valid.json()["id"]

    # 4. True/False: Valid with exactly 1 correct answer
    tf_valid = await client.post(
        f"/api/v1/quizzes/{quiz_id}/questions",
        json={
            "question_text": "FastAPI is built on Starlette and Pydantic.",
            "question_type": "true_false",
            "points": 1,
            "explanation": "FastAPI leverages Starlette for web tooling and Pydantic for validation.",
            "options": [
                {"option_text": "True", "is_correct": True},
                {"option_text": "False", "is_correct": False},
            ],
        },
        cookies=inst_cookie,
    )
    assert tf_valid.status_code == 201
    q2_id = tf_valid.json()["id"]

    # 5. Multiple Select: Valid with >= 1 correct answers
    ms_valid = await client.post(
        f"/api/v1/quizzes/{quiz_id}/questions",
        json={
            "question_text": "Select all ASGI web frameworks:",
            "question_type": "multiple_select",
            "points": 3,
            "explanation": "FastAPI, Starlette, and Quart are ASGI frameworks.",
            "options": [
                {"option_text": "FastAPI", "is_correct": True},
                {"option_text": "Flask", "is_correct": False},
                {"option_text": "Starlette", "is_correct": True},
            ],
        },
        cookies=inst_cookie,
    )
    assert ms_valid.status_code == 201
    q3_id = ms_valid.json()["id"]

    # 6. Reorder questions
    reorder_res = await client.post(
        f"/api/v1/quizzes/{quiz_id}/questions/reorder",
        json={"question_ids": [q3_id, q1_id, q2_id]},
        cookies=inst_cookie,
    )
    assert reorder_res.status_code == 200

    detail_res = await client.get(f"/api/v1/quizzes/{quiz_id}", cookies=inst_cookie)
    assert detail_res.status_code == 200
    questions = detail_res.json()["questions"]
    assert questions[0]["id"] == q3_id
    assert questions[1]["id"] == q1_id
    assert questions[2]["id"] == q2_id


@pytest.mark.asyncio
async def test_publishing_validation_and_student_visibility(
    client: AsyncClient, db_session: AsyncSession
):
    """Test quiz publishing completeness checks and unpublished quiz confidentiality."""
    admin_user = await create_user(db_session, "admin_pub@learnova.ai", SystemRole.ADMIN.value)
    inst_user = await create_user(db_session, "inst_pub@learnova.ai", SystemRole.INSTRUCTOR.value)
    student_user = await create_user(db_session, "student_pub@learnova.ai", SystemRole.STUDENT.value)

    admin_cookie = await get_auth_cookie(client, admin_user.email)
    inst_cookie = await get_auth_cookie(client, inst_user.email)
    student_cookie = await get_auth_cookie(client, student_user.email)

    course_id = await setup_published_course(client, admin_cookie, inst_cookie)

    # 1. Create empty quiz
    quiz_res = await client.post(
        "/api/v1/quizzes",
        json={"course_id": course_id, "title": "Empty Quiz"},
        cookies=inst_cookie,
    )
    assert quiz_res.status_code == 201
    quiz_id = quiz_res.json()["id"]

    # 2. Attempt to publish empty quiz -> 400
    pub_fail = await client.post(f"/api/v1/quizzes/{quiz_id}/publish", cookies=inst_cookie)
    assert pub_fail.status_code == 400
    assert "at least one question" in pub_fail.json()["error"]["message"]

    # 3. Add question to quiz
    await client.post(
        f"/api/v1/quizzes/{quiz_id}/questions",
        json={
            "question_text": "Is Python interpreted?",
            "question_type": "true_false",
            "points": 1,
            "options": [
                {"option_text": "True", "is_correct": True},
                {"option_text": "False", "is_correct": False},
            ],
        },
        cookies=inst_cookie,
    )

    # 4. Student enrolls in course
    enroll_res = await client.post(
        "/api/v1/enrollments",
        json={"course_id": course_id},
        cookies=student_cookie,
    )
    assert enroll_res.status_code == 201

    # 5. Student cannot access draft quiz
    take_fail = await client.get(f"/api/v1/quizzes/{quiz_id}/take", cookies=student_cookie)
    assert take_fail.status_code == 404

    # 6. Publish quiz
    pub_ok = await client.post(f"/api/v1/quizzes/{quiz_id}/publish", cookies=inst_cookie)
    assert pub_ok.status_code == 200
    assert pub_ok.json()["status"] == "published"

    # 7. Student can now see and access the published quiz
    take_ok = await client.get(f"/api/v1/quizzes/{quiz_id}/take", cookies=student_cookie)
    assert take_ok.status_code == 200
    assert take_ok.json()["title"] == "Empty Quiz"


@pytest.mark.asyncio
async def test_enrollment_and_organization_isolation(
    client: AsyncClient, db_session: AsyncSession
):
    """Test that unenrolled students cannot take quizzes or start attempts."""
    admin_user = await create_user(db_session, "admin_iso@learnova.ai", SystemRole.ADMIN.value)
    inst_user = await create_user(db_session, "inst_iso@learnova.ai", SystemRole.INSTRUCTOR.value)
    student_user = await create_user(db_session, "student_iso@learnova.ai", SystemRole.STUDENT.value)

    admin_cookie = await get_auth_cookie(client, admin_user.email)
    inst_cookie = await get_auth_cookie(client, inst_user.email)
    student_cookie = await get_auth_cookie(client, student_user.email)

    course_id = await setup_published_course(client, admin_cookie, inst_cookie)

    quiz_res = await client.post(
        "/api/v1/quizzes",
        json={"course_id": course_id, "title": "Isolation Quiz"},
        cookies=inst_cookie,
    )
    quiz_id = quiz_res.json()["id"]

    await client.post(
        f"/api/v1/quizzes/{quiz_id}/questions",
        json={
            "question_text": "Sample question",
            "question_type": "true_false",
            "points": 1,
            "options": [
                {"option_text": "Yes", "is_correct": True},
                {"option_text": "No", "is_correct": False},
            ],
        },
        cookies=inst_cookie,
    )
    await client.post(f"/api/v1/quizzes/{quiz_id}/publish", cookies=inst_cookie)

    # Student is NOT enrolled -> forbidden
    take_res = await client.get(f"/api/v1/quizzes/{quiz_id}/take", cookies=student_cookie)
    assert take_res.status_code == 403

    attempt_res = await client.post(
        f"/api/v1/quizzes/{quiz_id}/attempts", cookies=student_cookie
    )
    assert attempt_res.status_code == 403


@pytest.mark.asyncio
async def test_deterministic_grading_and_scoring_lifecycle(
    client: AsyncClient, db_session: AsyncSession
):
    """Test full assessment lifecycle: start attempt, answer questions, submit, and server-side deterministic grading."""
    admin_user = await create_user(db_session, "admin_grade@learnova.ai", SystemRole.ADMIN.value)
    inst_user = await create_user(db_session, "inst_grade@learnova.ai", SystemRole.INSTRUCTOR.value)
    student_user = await create_user(db_session, "student_grade@learnova.ai", SystemRole.STUDENT.value)

    admin_cookie = await get_auth_cookie(client, admin_user.email)
    inst_cookie = await get_auth_cookie(client, inst_user.email)
    student_cookie = await get_auth_cookie(client, student_user.email)

    course_id = await setup_published_course(client, admin_cookie, inst_cookie)

    # Create quiz: passing score 60%, max_attempts = 2
    quiz_res = await client.post(
        "/api/v1/quizzes",
        json={
            "course_id": course_id,
            "title": "Comprehensive Scoring Quiz",
            "duration_minutes": 20,
            "passing_score_percentage": 60.0,
            "max_attempts": 2,
        },
        cookies=inst_cookie,
    )
    quiz_id = quiz_res.json()["id"]

    # Q1: single choice (2 pts)
    q1_res = await client.post(
        f"/api/v1/quizzes/{quiz_id}/questions",
        json={
            "question_text": "Which HTTP method is idempotent for full update?",
            "question_type": "single_choice",
            "points": 2,
            "explanation": "PUT is specified as idempotent.",
            "options": [
                {"option_text": "POST", "is_correct": False},
                {"option_text": "PUT", "is_correct": True},
                {"option_text": "PATCH", "is_correct": False},
            ],
        },
        cookies=inst_cookie,
    )
    q1_data = q1_res.json()
    q1_id = q1_data["id"]
    q1_opt_correct = next(opt["id"] for opt in q1_data["options"] if opt["is_correct"])

    # Q2: true_false (1 pt)
    q2_res = await client.post(
        f"/api/v1/quizzes/{quiz_id}/questions",
        json={
            "question_text": "SQLAlchemy 2.0 uses select() statements.",
            "question_type": "true_false",
            "points": 1,
            "explanation": "SQLAlchemy 2.0 uses 2.0-style select().",
            "options": [
                {"option_text": "True", "is_correct": True},
                {"option_text": "False", "is_correct": False},
            ],
        },
        cookies=inst_cookie,
    )
    q2_data = q2_res.json()
    q2_id = q2_data["id"]
    q2_opt_incorrect = next(opt["id"] for opt in q2_data["options"] if not opt["is_correct"])

    # Q3: multiple_select (3 pts) -> all-or-nothing
    q3_res = await client.post(
        f"/api/v1/quizzes/{quiz_id}/questions",
        json={
            "question_text": "Select valid SQL databases:",
            "question_type": "multiple_select",
            "points": 3,
            "explanation": "PostgreSQL and SQLite are relational SQL databases.",
            "options": [
                {"option_text": "PostgreSQL", "is_correct": True},
                {"option_text": "Redis", "is_correct": False},
                {"option_text": "SQLite", "is_correct": True},
            ],
        },
        cookies=inst_cookie,
    )
    q3_data = q3_res.json()
    q3_id = q3_data["id"]
    q3_opt_correct_1 = next(opt["id"] for opt in q3_data["options"] if opt["is_correct"])
    # We only select 1 correct option to test the all-or-nothing rule (should fail Q3)

    # Publish quiz
    await client.post(f"/api/v1/quizzes/{quiz_id}/publish", cookies=inst_cookie)

    # Student enrolls
    await client.post(
        "/api/v1/enrollments",
        json={"course_id": course_id},
        cookies=student_cookie,
    )

    # 1. Student takes quiz layout -> ensure answer keys are absent
    take_res = await client.get(f"/api/v1/quizzes/{quiz_id}/take", cookies=student_cookie)
    assert take_res.status_code == 200
    take_data = take_res.json()
    for q in take_data["questions"]:
        for opt in q["options"]:
            assert "is_correct" not in opt
            assert "explanation" not in opt

    # 2. Student starts attempt
    attempt_res = await client.post(
        f"/api/v1/quizzes/{quiz_id}/attempts", cookies=student_cookie
    )
    assert attempt_res.status_code == 201
    attempt_id = attempt_res.json()["id"]
    assert attempt_res.json()["attempt_number"] == 1
    assert attempt_res.json()["status"] == "in_progress"

    # 3. Save student answers
    # Q1: correct
    ans1 = await client.put(
        f"/api/v1/quiz-attempts/{attempt_id}/answers/{q1_id}",
        json={"selected_option_ids": [q1_opt_correct]},
        cookies=student_cookie,
    )
    assert ans1.status_code == 200

    # Q2: incorrect
    ans2 = await client.put(
        f"/api/v1/quiz-attempts/{attempt_id}/answers/{q2_id}",
        json={"selected_option_ids": [q2_opt_incorrect]},
        cookies=student_cookie,
    )
    assert ans2.status_code == 200

    # Q3: incomplete multiple select (only 1 of 2 correct chosen)
    ans3 = await client.put(
        f"/api/v1/quiz-attempts/{attempt_id}/answers/{q3_id}",
        json={"selected_option_ids": [q3_opt_correct_1]},
        cookies=student_cookie,
    )
    assert ans3.status_code == 200

    # 4. Submit attempt
    submit_res = await client.post(
        f"/api/v1/quiz-attempts/{attempt_id}/submit",
        cookies=student_cookie,
    )
    assert submit_res.status_code == 200
    res_data = submit_res.json()
    assert res_data["status"] == "completed"
    # Max score: 2 + 1 + 3 = 6.0
    assert res_data["max_score"] == 6.0
    # Q1 awarded 2.0; Q2 awarded 0.0; Q3 awarded 0.0 (all-or-nothing failed) -> total = 2.0
    assert res_data["score"] == 2.0
    assert res_data["percentage_score"] == round((2.0 / 6.0) * 100, 2)
    assert res_data["passed"] is False  # 33.33% < 60% threshold
    assert res_data["can_retake"] is True  # attempt 1 of 2

    # 5. Idempotent submission: submitting again returns identical result
    submit_again = await client.post(
        f"/api/v1/quiz-attempts/{attempt_id}/submit",
        cookies=student_cookie,
    )
    assert submit_again.status_code == 200
    assert submit_again.json()["score"] == 2.0
    assert submit_again.json()["status"] == "completed"

    # 6. Cannot edit answers after final submission
    ans_fail = await client.put(
        f"/api/v1/quiz-attempts/{attempt_id}/answers/{q1_id}",
        json={"selected_option_ids": [q1_opt_correct]},
        cookies=student_cookie,
    )
    assert ans_fail.status_code == 400


@pytest.mark.asyncio
async def test_cross_user_attempt_security(
    client: AsyncClient, db_session: AsyncSession
):
    """Test that students cannot access or submit other students' attempts."""
    admin_user = await create_user(db_session, "admin_sec@learnova.ai", SystemRole.ADMIN.value)
    inst_user = await create_user(db_session, "inst_sec@learnova.ai", SystemRole.INSTRUCTOR.value)
    student_1 = await create_user(db_session, "s1_sec@learnova.ai", SystemRole.STUDENT.value)
    student_2 = await create_user(db_session, "s2_sec@learnova.ai", SystemRole.STUDENT.value)

    admin_cookie = await get_auth_cookie(client, admin_user.email)
    inst_cookie = await get_auth_cookie(client, inst_user.email)
    s1_cookie = await get_auth_cookie(client, student_1.email)
    s2_cookie = await get_auth_cookie(client, student_2.email)

    course_id = await setup_published_course(client, admin_cookie, inst_cookie)

    quiz_res = await client.post(
        "/api/v1/quizzes",
        json={"course_id": course_id, "title": "Security Quiz"},
        cookies=inst_cookie,
    )
    quiz_id = quiz_res.json()["id"]

    await client.post(
        f"/api/v1/quizzes/{quiz_id}/questions",
        json={
            "question_text": "Security check question",
            "question_type": "true_false",
            "points": 1,
            "options": [
                {"option_text": "True", "is_correct": True},
                {"option_text": "False", "is_correct": False},
            ],
        },
        cookies=inst_cookie,
    )
    await client.post(f"/api/v1/quizzes/{quiz_id}/publish", cookies=inst_cookie)

    # Both students enroll
    await client.post("/api/v1/enrollments", json={"course_id": course_id}, cookies=s1_cookie)
    await client.post("/api/v1/enrollments", json={"course_id": course_id}, cookies=s2_cookie)

    # Student 1 starts attempt
    s1_attempt_res = await client.post(
        f"/api/v1/quizzes/{quiz_id}/attempts", cookies=s1_cookie
    )
    s1_attempt_id = s1_attempt_res.json()["id"]

    # Student 2 tries to answer Student 1's attempt -> 404
    s2_answer_fail = await client.put(
        f"/api/v1/quiz-attempts/{s1_attempt_id}/answers/{uuid.uuid4()}",
        json={"selected_option_ids": []},
        cookies=s2_cookie,
    )
    assert s2_answer_fail.status_code == 404

    # Student 2 tries to submit Student 1's attempt -> 404
    s2_submit_fail = await client.post(
        f"/api/v1/quiz-attempts/{s1_attempt_id}/submit",
        cookies=s2_cookie,
    )
    assert s2_submit_fail.status_code == 404
