import uuid
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.rbac import SystemRole
from backend.app.core.security import hash_password
from backend.app.models.course import Course, CourseModule, CourseStatus, Lesson
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
    return {"learnova_access_token": token}


@pytest.mark.asyncio
async def test_student_analytics_empty_dataset(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verifies that a student with 0 enrollments and attempts receives valid 0.0 metrics without zero-division errors."""
    await create_user(
        db_session, "empty_student@learnova.ai", SystemRole.STUDENT.value
    )
    cookie = await get_auth_cookie(client, "empty_student@learnova.ai")

    res = await client.get("/api/v1/analytics/student/overview", cookies=cookie)
    assert res.status_code == 200
    data = res.json()

    assert data["total_enrolled_courses"] == 0
    assert data["courses_in_progress"] == 0
    assert data["courses_completed"] == 0
    assert data["overall_learning_progress"] == 0.0
    assert data["total_lessons_count"] == 0
    assert data["completed_lessons_count"] == 0
    assert data["remaining_lessons_count"] == 0
    assert data["total_quiz_attempts"] == 0
    assert data["average_quiz_score"] == 0.0
    assert data["quiz_pass_rate"] == 0.0
    assert data["resume_courses"] == []


@pytest.mark.asyncio
async def test_student_analytics_overview_and_resume(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verifies student metrics, completion rates, exclusion of unfinished attempts, and resume actions."""
    instructor = await create_user(
        db_session, "inst_analytics@learnova.ai", SystemRole.INSTRUCTOR.value
    )
    student = await create_user(
        db_session, "stud_analytics@learnova.ai", SystemRole.STUDENT.value
    )
    cookie = await get_auth_cookie(client, "stud_analytics@learnova.ai")

    # Create course with 2 modules and 3 lessons
    course = Course(
        title="Python Data Structures",
        slug=f"python-data-structures-{uuid.uuid4().hex[:6]}",
        short_description="Learn python DS",
        description="Comprehensive DS course",
        instructor_id=instructor.id,
        status=CourseStatus.PUBLISHED.value,
    )
    db_session.add(course)
    await db_session.flush()

    mod1 = CourseModule(course_id=course.id, title="Module 1", order_index=0)
    db_session.add(mod1)
    await db_session.flush()

    l1 = Lesson(module_id=mod1.id, title="Lesson 1: Lists", order_index=0)
    l2 = Lesson(module_id=mod1.id, title="Lesson 2: Tuples", order_index=1)
    l3 = Lesson(module_id=mod1.id, title="Lesson 3: Dictionaries", order_index=2)
    db_session.add_all([l1, l2, l3])
    await db_session.flush()

    # Enroll student
    enr = Enrollment(
        user_id=student.id,
        course_id=course.id,
        status=EnrollmentStatus.ACTIVE.value,
    )
    db_session.add(enr)

    # Complete 1 lesson (l1)
    prog = LessonProgress(
        user_id=student.id,
        course_id=course.id,
        lesson_id=l1.id,
        is_completed=True,
        completed_at=datetime.now(timezone.utc),
    )
    db_session.add(prog)

    # Create quiz
    quiz = Quiz(
        course_id=course.id,
        instructor_id=instructor.id,
        title="DS Quiz 1",
        passing_score_percentage=70.0,
        status=QuizStatus.PUBLISHED.value,
    )
    db_session.add(quiz)
    await db_session.flush()

    # 1 finalized completed passed attempt (80%)
    att1 = QuizAttempt(
        quiz_id=quiz.id,
        user_id=student.id,
        attempt_number=1,
        status=AttemptStatus.COMPLETED.value,
        score=8.0,
        max_score=10.0,
        percentage_score=80.0,
        passed=True,
        time_spent_seconds=120,
        submitted_at=datetime.now(timezone.utc),
    )
    # 1 unfinished in_progress attempt (MUST BE EXCLUDED)
    att_in_prog = QuizAttempt(
        quiz_id=quiz.id,
        user_id=student.id,
        attempt_number=2,
        status=AttemptStatus.IN_PROGRESS.value,
        score=0.0,
        max_score=10.0,
        percentage_score=0.0,
        passed=False,
    )
    db_session.add_all([att1, att_in_prog])
    await db_session.commit()

    # Fetch student overview
    res = await client.get("/api/v1/analytics/student/overview", cookies=cookie)
    assert res.status_code == 200
    data = res.json()

    assert data["total_enrolled_courses"] == 1
    assert data["courses_in_progress"] == 1
    assert data["total_lessons_count"] == 3
    assert data["completed_lessons_count"] == 1
    assert data["remaining_lessons_count"] == 2
    # 1 / 3 * 100 = 33.3%
    assert 33.0 <= data["overall_learning_progress"] <= 33.5

    # Quiz metrics: should ONLY count att1 (1 attempt, 80% avg, 100% pass rate)
    assert data["total_quiz_attempts"] == 1
    assert data["passed_quiz_attempts"] == 1
    assert data["average_quiz_score"] == 80.0
    assert data["quiz_pass_rate"] == 100.0

    # Resume courses: next lesson should be Lesson 2
    assert len(data["resume_courses"]) == 1
    assert data["resume_courses"][0]["course_id"] == str(course.id)
    assert data["resume_courses"][0]["next_lesson_id"] == str(l2.id)
    assert data["resume_courses"][0]["next_lesson_title"] == "Lesson 2: Tuples"


@pytest.mark.asyncio
async def test_student_activity_and_trends(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verifies that real chronological activity events and trends are returned."""
    instructor = await create_user(
        db_session, "inst_act@learnova.ai", SystemRole.INSTRUCTOR.value
    )
    student = await create_user(
        db_session, "stud_act@learnova.ai", SystemRole.STUDENT.value
    )
    cookie = await get_auth_cookie(client, "stud_act@learnova.ai")

    course = Course(
        title="Activity Telemetry Course",
        slug=f"activity-course-{uuid.uuid4().hex[:6]}",
        short_description="Telemetry",
        description="Detailed telemetry",
        instructor_id=instructor.id,
        status=CourseStatus.PUBLISHED.value,
    )
    db_session.add(course)
    await db_session.flush()

    enr = Enrollment(
        user_id=student.id,
        course_id=course.id,
        status=EnrollmentStatus.ACTIVE.value,
    )
    db_session.add(enr)
    await db_session.commit()

    res = await client.get("/api/v1/analytics/student/activity?days=7", cookies=cookie)
    assert res.status_code == 200
    data = res.json()

    assert "recent_activities" in data
    assert "progress_trends" in data
    assert len(data["recent_activities"]) >= 1
    assert data["recent_activities"][0]["activity_type"] == "course_enrollment"
    assert len(data["progress_trends"]) == 7


@pytest.mark.asyncio
async def test_instructor_ownership_isolation(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verifies that an instructor only sees their own courses and cannot view another instructor's analytics."""
    inst1 = await create_user(
        db_session, "instructor_one@learnova.ai", SystemRole.INSTRUCTOR.value
    )
    inst2 = await create_user(
        db_session, "instructor_two@learnova.ai", SystemRole.INSTRUCTOR.value
    )
    student = await create_user(
        db_session, "inst_stud@learnova.ai", SystemRole.STUDENT.value
    )

    c1 = Course(
        title="Instructor 1 Unique Course",
        slug=f"inst1-course-{uuid.uuid4().hex[:6]}",
        short_description="Course 1",
        description="Course 1 Description",
        instructor_id=inst1.id,
        status=CourseStatus.PUBLISHED.value,
    )
    c2 = Course(
        title="Instructor 2 Unique Course",
        slug=f"inst2-course-{uuid.uuid4().hex[:6]}",
        short_description="Course 2",
        description="Course 2 Description",
        instructor_id=inst2.id,
        status=CourseStatus.PUBLISHED.value,
    )
    db_session.add_all([c1, c2])
    await db_session.flush()

    # Enroll student into Course 1 and Course 2
    enr1 = Enrollment(user_id=student.id, course_id=c1.id, status=EnrollmentStatus.COMPLETED.value)
    enr2 = Enrollment(user_id=student.id, course_id=c2.id, status=EnrollmentStatus.ACTIVE.value)
    db_session.add_all([enr1, enr2])
    await db_session.commit()

    # Login as Instructor 1
    cookie1 = await get_auth_cookie(client, "instructor_one@learnova.ai")
    res1 = await client.get("/api/v1/analytics/instructor/overview", cookies=cookie1)
    assert res1.status_code == 200
    data1 = res1.json()

    assert data1["total_courses"] == 1
    assert data1["published_courses"] == 1
    assert data1["total_enrollments"] == 1
    assert data1["completed_enrollments"] == 1
    assert data1["course_completion_rate"] == 100.0

    # Course list for Instructor 1
    courses_res1 = await client.get("/api/v1/analytics/instructor/courses", cookies=cookie1)
    assert courses_res1.status_code == 200
    c_list1 = courses_res1.json()["courses"]
    assert len(c_list1) == 1
    assert c_list1[0]["title"] == "Instructor 1 Unique Course"

    # Login as Instructor 2
    cookie2 = await get_auth_cookie(client, "instructor_two@learnova.ai")
    res2 = await client.get("/api/v1/analytics/instructor/overview", cookies=cookie2)
    assert res2.status_code == 200
    data2 = res2.json()

    assert data2["total_courses"] == 1
    assert data2["total_enrollments"] == 1
    assert data2["completed_enrollments"] == 0
    assert data2["course_completion_rate"] == 0.0


@pytest.mark.asyncio
async def test_instructor_assessments_and_distributions(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verifies that instructor assessments return score distributions and pass rates."""
    inst = await create_user(
        db_session, "inst_quiz_analytics@learnova.ai", SystemRole.INSTRUCTOR.value
    )
    s1 = await create_user(db_session, "stud_q1@learnova.ai", SystemRole.STUDENT.value)
    s2 = await create_user(db_session, "stud_q2@learnova.ai", SystemRole.STUDENT.value)
    cookie = await get_auth_cookie(client, "inst_quiz_analytics@learnova.ai")

    course = Course(
        title="Assessment Stats Course",
        slug=f"assessment-course-{uuid.uuid4().hex[:6]}",
        short_description="Stats",
        description="Stats",
        instructor_id=inst.id,
        status=CourseStatus.PUBLISHED.value,
    )
    db_session.add(course)
    await db_session.flush()

    quiz = Quiz(
        course_id=course.id,
        instructor_id=inst.id,
        title="Comprehensive Math Quiz",
        passing_score_percentage=70.0,
        status=QuizStatus.PUBLISHED.value,
    )
    db_session.add(quiz)
    await db_session.flush()

    # 1 attempt with 40% (fails, bucket 0-50)
    att1 = QuizAttempt(
        quiz_id=quiz.id,
        user_id=s1.id,
        attempt_number=1,
        status=AttemptStatus.COMPLETED.value,
        score=4.0,
        max_score=10.0,
        percentage_score=40.0,
        passed=False,
        submitted_at=datetime.now(timezone.utc),
    )
    # 1 attempt with 90% (passes, bucket 86-100)
    att2 = QuizAttempt(
        quiz_id=quiz.id,
        user_id=s2.id,
        attempt_number=1,
        status=AttemptStatus.COMPLETED.value,
        score=9.0,
        max_score=10.0,
        percentage_score=90.0,
        passed=True,
        submitted_at=datetime.now(timezone.utc),
    )
    db_session.add_all([att1, att2])
    await db_session.commit()

    res = await client.get("/api/v1/analytics/instructor/assessments", cookies=cookie)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assessment = data["assessments"][0]

    assert assessment["total_attempts"] == 2
    assert assessment["unique_participants"] == 2
    assert assessment["passed_attempts"] == 1
    assert assessment["pass_rate"] == 50.0
    assert assessment["average_score"] == 65.0
    assert assessment["highest_score"] == 90.0
    assert assessment["lowest_score"] == 40.0
    assert assessment["score_distribution"]["range_0_50"] == 1
    assert assessment["score_distribution"]["range_86_100"] == 1


@pytest.mark.asyncio
async def test_admin_organization_scoped_analytics(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verifies that an organization Admin cannot access another organization's metrics, while Super Admin can."""
    org1 = Organization(name="Org Alpha", slug="org-alpha")
    org2 = Organization(name="Org Beta", slug="org-beta")
    db_session.add_all([org1, org2])
    await db_session.flush()

    await create_user(
        db_session, "admin_alpha@learnova.ai", SystemRole.ADMIN.value, org_id=org1.id
    )
    await create_user(
        db_session, "superadmin_test@learnova.ai", SystemRole.SUPER_ADMIN.value
    )
    # Create user in org1 and user in org2
    await create_user(db_session, "user_org1@learnova.ai", SystemRole.STUDENT.value, org_id=org1.id)
    await create_user(db_session, "user_org2@learnova.ai", SystemRole.STUDENT.value, org_id=org2.id)

    # 1. Admin from Org1 views overview: should only see Org1 users (admin1 + user_org1 = 2 users)
    cookie_admin1 = await get_auth_cookie(client, "admin_alpha@learnova.ai")
    res1 = await client.get("/api/v1/analytics/admin/overview", cookies=cookie_admin1)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["total_users"] == 2
    assert data1["organization_name"] == "Org Alpha"

    # 2. Admin from Org1 tries to request Org2's analytics explicitly: MUST get 403 Forbidden!
    forbidden_res = await client.get(
        f"/api/v1/analytics/admin/overview?organization_id={org2.id}",
        cookies=cookie_admin1,
    )
    assert forbidden_res.status_code == 403

    # 3. Super Admin can view all or filter by Org2
    cookie_super = await get_auth_cookie(client, "superadmin_test@learnova.ai")
    super_res = await client.get(
        f"/api/v1/analytics/admin/overview?organization_id={org2.id}",
        cookies=cookie_super,
    )
    assert super_res.status_code == 200
    assert super_res.json()["organization_name"] == "Org Beta"
    assert super_res.json()["total_users"] == 1


@pytest.mark.asyncio
async def test_unauthorized_role_access(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verifies that RBAC protection denies access to unauthorized roles."""
    await create_user(
        db_session, "unauth_student@learnova.ai", SystemRole.STUDENT.value
    )
    cookie_student = await get_auth_cookie(client, "unauth_student@learnova.ai")

    # Unauthenticated request
    client.cookies.clear()
    unauth_res = await client.get("/api/v1/analytics/student/overview")
    assert unauth_res.status_code == 401

    # Student trying to access instructor analytics -> 403 Forbidden
    inst_res = await client.get(
        "/api/v1/analytics/instructor/overview", cookies=cookie_student
    )
    assert inst_res.status_code == 403

    # Student trying to access admin analytics -> 403 Forbidden
    admin_res = await client.get(
        "/api/v1/analytics/admin/overview", cookies=cookie_student
    )
    assert admin_res.status_code == 403


@pytest.mark.asyncio
async def test_date_filtering_and_boundaries(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verifies query parameter validation for date ranges."""
    await create_user(
        db_session, "date_filter_student@learnova.ai", SystemRole.STUDENT.value
    )
    cookie = await get_auth_cookie(client, "date_filter_student@learnova.ai")

    # Valid boundary: days=1
    res1 = await client.get("/api/v1/analytics/student/activity?days=1", cookies=cookie)
    assert res1.status_code == 200
    assert len(res1.json()["progress_trends"]) == 1

    # Invalid boundary: days=0 (should fail ge=1 validation)
    res_err1 = await client.get("/api/v1/analytics/student/activity?days=0", cookies=cookie)
    assert res_err1.status_code == 422

    # Invalid boundary: days=400 (should fail le=365 validation)
    res_err2 = await client.get("/api/v1/analytics/student/activity?days=400", cookies=cookie)
    assert res_err2.status_code == 422
