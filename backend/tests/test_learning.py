import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.rbac import SystemRole
from backend.app.core.security import hash_password
from backend.app.models.organization import Organization
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
    title: str = "Mastering TypeScript",
    num_lessons: int = 2,
    org_id: uuid.UUID | None = None,
) -> tuple[str, list[str]]:
    """Helper to provision a category, course, module, lessons and publish the course."""
    # 1. Create category
    cat_res = await client.post(
        "/api/v1/course-categories",
        json={"name": f"Category {uuid.uuid4().hex[:6]}"},
        cookies=admin_cookie,
    )
    assert cat_res.status_code == 201
    cat_id = cat_res.json()["id"]

    # 2. Create course
    course_payload = {
        "title": title,
        "short_description": "Comprehensive course on modern TypeScript fundamentals",
        "description": "Learn static typing, generics, interfaces, and compiler configurations.",
        "category_id": cat_id,
        "difficulty": "intermediate",
    }
    course_res = await client.post(
        "/api/v1/courses",
        json=course_payload,
        cookies=inst_cookie,
    )
    assert course_res.status_code == 201
    course_id = course_res.json()["id"]

    # 3. Create module
    mod_res = await client.post(
        f"/api/v1/courses/{course_id}/modules",
        json={"title": "Module 1: Foundations"},
        cookies=inst_cookie,
    )
    assert mod_res.status_code == 201
    mod_id = mod_res.json()["id"]

    # 4. Create lessons
    lesson_ids: list[str] = []
    for i in range(1, num_lessons + 1):
        les_res = await client.post(
            f"/api/v1/modules/{mod_id}/lessons",
            json={
                "title": f"Lesson {i}: Concept {i}",
                "content_type": "text",
                "text_content": f"# Markdown Lesson Content {i}\nDetailed explanation.",
                "duration_minutes": 15,
            },
            cookies=inst_cookie,
        )
        assert les_res.status_code == 201
        lesson_ids.append(les_res.json()["id"])

    # 5. Publish course
    pub_res = await client.post(
        f"/api/v1/courses/{course_id}/publish",
        cookies=inst_cookie,
    )
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "published"

    return course_id, lesson_ids


# ==============================================================================
# Phase 4 Test Suite
# ==============================================================================


@pytest.mark.asyncio
async def test_enrollment_lifecycle_and_duplicate_prevention(
    client: AsyncClient, db_session: AsyncSession
):
    """Verifies successful enrollment, duplicate enrollment rejection, and listing."""
    await create_user(db_session, "admin.enr@learnova.ai", SystemRole.ADMIN.value)
    await create_user(db_session, "inst.enr@learnova.ai", SystemRole.INSTRUCTOR.value)
    await create_user(db_session, "student.enr@learnova.ai", SystemRole.STUDENT.value)

    admin_cookie = await get_auth_cookie(client, "admin.enr@learnova.ai")
    inst_cookie = await get_auth_cookie(client, "inst.enr@learnova.ai")
    student_cookie = await get_auth_cookie(client, "student.enr@learnova.ai")

    course_id, _ = await setup_published_course(
        client, admin_cookie, inst_cookie, title="Fullstack React & Node"
    )

    # 1. Successful enrollment
    enr_res = await client.post(
        "/api/v1/enrollments",
        json={"course_id": course_id},
        cookies=student_cookie,
    )
    assert enr_res.status_code == 201
    enr_data = enr_res.json()
    assert enr_data["course_id"] == course_id
    assert enr_data["status"] == "active"
    assert enr_data["progress_percentage"] == 0.0
    enrollment_id = enr_data["id"]

    # 2. Duplicate enrollment prevention (409 Conflict)
    dup_res = await client.post(
        "/api/v1/enrollments",
        json={"course_id": course_id},
        cookies=student_cookie,
    )
    assert dup_res.status_code == 409
    assert "already enrolled" in dup_res.json()["error"]["message"]

    # 3. List my enrollments
    my_enr_res = await client.get("/api/v1/enrollments/me", cookies=student_cookie)
    assert my_enr_res.status_code == 200
    my_enr_data = my_enr_res.json()
    assert my_enr_data["total"] >= 1
    assert any(item["id"] == enrollment_id for item in my_enr_data["items"])

    # 4. Get enrollment details by ID
    get_res = await client.get(
        f"/api/v1/enrollments/{enrollment_id}", cookies=student_cookie
    )
    assert get_res.status_code == 200
    assert get_res.json()["id"] == enrollment_id


@pytest.mark.asyncio
async def test_rejection_of_unpublished_or_archived_courses(
    client: AsyncClient, db_session: AsyncSession
):
    """Ensures students cannot enroll in draft or archived courses."""
    await create_user(db_session, "admin.unpub@learnova.ai", SystemRole.ADMIN.value)
    await create_user(db_session, "inst.unpub@learnova.ai", SystemRole.INSTRUCTOR.value)
    await create_user(db_session, "student.unpub@learnova.ai", SystemRole.STUDENT.value)

    admin_cookie = await get_auth_cookie(client, "admin.unpub@learnova.ai")
    inst_cookie = await get_auth_cookie(client, "inst.unpub@learnova.ai")
    student_cookie = await get_auth_cookie(client, "student.unpub@learnova.ai")

    # 1. Create a draft course
    cat_res = await client.post(
        "/api/v1/course-categories",
        json={"name": "Draft Category"},
        cookies=admin_cookie,
    )
    cat_id = cat_res.json()["id"]

    draft_res = await client.post(
        "/api/v1/courses",
        json={
            "title": "Unpublished Draft Course",
            "short_description": "Course that is currently in draft status",
            "description": "Full description of draft course.",
            "category_id": cat_id,
        },
        cookies=inst_cookie,
    )
    draft_id = draft_res.json()["id"]

    # Attempt to enroll in draft course -> fails with 422
    fail_draft = await client.post(
        "/api/v1/enrollments",
        json={"course_id": draft_id},
        cookies=student_cookie,
    )
    assert fail_draft.status_code == 422
    assert "Cannot enroll in an unpublished course" in fail_draft.json()["error"]["message"]

    # 2. Publish and then archive another course
    arch_id, _ = await setup_published_course(
        client, admin_cookie, inst_cookie, title="Archived Course"
    )
    arch_res = await client.post(
        f"/api/v1/courses/{arch_id}/archive",
        cookies=inst_cookie,
    )
    assert arch_res.status_code == 200
    assert arch_res.json()["status"] == "archived"

    # Attempt to enroll in archived course -> fails with 422
    fail_arch = await client.post(
        "/api/v1/enrollments",
        json={"course_id": arch_id},
        cookies=student_cookie,
    )
    assert fail_arch.status_code == 422
    assert "Cannot enroll in an archived course" in fail_arch.json()["error"]["message"]


@pytest.mark.asyncio
async def test_student_enrollment_isolation_and_unauthorized_access(
    client: AsyncClient, db_session: AsyncSession
):
    """Verifies that students cannot access other students' enrollments or learning views."""
    await create_user(db_session, "admin.iso@learnova.ai", SystemRole.ADMIN.value)
    await create_user(db_session, "inst.iso@learnova.ai", SystemRole.INSTRUCTOR.value)
    await create_user(db_session, "student1.iso@learnova.ai", SystemRole.STUDENT.value)
    await create_user(db_session, "student2.iso@learnova.ai", SystemRole.STUDENT.value)

    admin_cookie = await get_auth_cookie(client, "admin.iso@learnova.ai")
    inst_cookie = await get_auth_cookie(client, "inst.iso@learnova.ai")
    student1_cookie = await get_auth_cookie(client, "student1.iso@learnova.ai")
    student2_cookie = await get_auth_cookie(client, "student2.iso@learnova.ai")

    course_id, lesson_ids = await setup_published_course(
        client, admin_cookie, inst_cookie, title="Python Microservices"
    )

    # Student 1 enrolls
    enr1_res = await client.post(
        "/api/v1/enrollments",
        json={"course_id": course_id},
        cookies=student1_cookie,
    )
    enr1_id = enr1_res.json()["id"]

    # Student 2 tries to access Student 1's enrollment -> 403 Forbidden
    hack_res = await client.get(
        f"/api/v1/enrollments/{enr1_id}",
        cookies=student2_cookie,
    )
    assert hack_res.status_code == 403

    # Student 2 tries to view learning view of course without enrollment -> 403 Forbidden
    learn_res = await client.get(
        f"/api/v1/learning/courses/{course_id}",
        cookies=student2_cookie,
    )
    assert learn_res.status_code == 403
    assert "Active enrollment required" in learn_res.json()["error"]["message"]

    # Student 2 tries to update progress of lesson in non-enrolled course -> 403 Forbidden
    prog_hack = await client.put(
        f"/api/v1/learning/lessons/{lesson_ids[0]}/progress",
        json={"is_completed": True},
        cookies=student2_cookie,
    )
    assert prog_hack.status_code == 403


@pytest.mark.asyncio
async def test_lesson_completion_progress_calculation_and_idempotency(
    client: AsyncClient, db_session: AsyncSession
):
    """Verifies idempotent lesson completion, progress percentage, and course completion."""
    await create_user(db_session, "admin.prog@learnova.ai", SystemRole.ADMIN.value)
    await create_user(db_session, "inst.prog@learnova.ai", SystemRole.INSTRUCTOR.value)
    await create_user(db_session, "student.prog@learnova.ai", SystemRole.STUDENT.value)

    admin_cookie = await get_auth_cookie(client, "admin.prog@learnova.ai")
    inst_cookie = await get_auth_cookie(client, "inst.prog@learnova.ai")
    student_cookie = await get_auth_cookie(client, "student.prog@learnova.ai")

    # Setup course with 2 lessons
    course_id, lesson_ids = await setup_published_course(
        client, admin_cookie, inst_cookie, title="Algorithms & Data Structures", num_lessons=2
    )
    les1_id, les2_id = lesson_ids[0], lesson_ids[1]

    # Student enrolls
    await client.post(
        "/api/v1/enrollments",
        json={"course_id": course_id},
        cookies=student_cookie,
    )

    # 1. Initial progress: 0%
    prog0 = await client.get(
        f"/api/v1/learning/courses/{course_id}/progress",
        cookies=student_cookie,
    )
    assert prog0.status_code == 200
    assert prog0.json()["progress_percentage"] == 0.0
    assert prog0.json()["completed_lessons"] == 0
    assert prog0.json()["total_lessons"] == 2
    assert prog0.json()["is_course_completed"] is False

    # 2. Mark lesson 1 as complete
    mark1 = await client.put(
        f"/api/v1/learning/lessons/{les1_id}/progress",
        json={"is_completed": True},
        cookies=student_cookie,
    )
    assert mark1.status_code == 200
    assert mark1.json()["is_completed"] is True
    assert mark1.json()["completed_at"] is not None

    # Verify progress is now 50.0%
    prog1 = await client.get(
        f"/api/v1/learning/courses/{course_id}/progress",
        cookies=student_cookie,
    )
    assert prog1.json()["progress_percentage"] == 50.0
    assert prog1.json()["completed_lessons"] == 1

    # 3. Idempotent check: mark lesson 1 complete again
    mark1_repeat = await client.put(
        f"/api/v1/learning/lessons/{les1_id}/progress",
        json={"is_completed": True},
        cookies=student_cookie,
    )
    assert mark1_repeat.status_code == 200
    # Progress still remains 50.0% (not inflated)
    prog1_repeat = await client.get(
        f"/api/v1/learning/courses/{course_id}/progress",
        cookies=student_cookie,
    )
    assert prog1_repeat.json()["progress_percentage"] == 50.0
    assert prog1_repeat.json()["completed_lessons"] == 1

    # 4. Mark lesson 2 as complete -> 100.0% and course is completed
    mark2 = await client.put(
        f"/api/v1/learning/lessons/{les2_id}/progress",
        json={"is_completed": True},
        cookies=student_cookie,
    )
    assert mark2.status_code == 200
    prog2 = await client.get(
        f"/api/v1/learning/courses/{course_id}/progress",
        cookies=student_cookie,
    )
    assert prog2.json()["progress_percentage"] == 100.0
    assert prog2.json()["completed_lessons"] == 2
    assert prog2.json()["is_course_completed"] is True

    # Check that enrollment status transitioned to 'completed'
    enr_list = await client.get("/api/v1/enrollments/me", cookies=student_cookie)
    my_enr = next(e for e in enr_list.json()["items"] if e["course_id"] == course_id)
    assert my_enr["status"] == "completed"

    # 5. Mark lesson 2 as incomplete -> progress drops back to 50.0%
    unmark2 = await client.put(
        f"/api/v1/learning/lessons/{les2_id}/progress",
        json={"is_completed": False},
        cookies=student_cookie,
    )
    assert unmark2.status_code == 200
    assert unmark2.json()["is_completed"] is False
    assert unmark2.json()["completed_at"] is None

    prog3 = await client.get(
        f"/api/v1/learning/courses/{course_id}/progress",
        cookies=student_cookie,
    )
    assert prog3.json()["progress_percentage"] == 50.0
    assert prog3.json()["is_course_completed"] is False


@pytest.mark.asyncio
async def test_resume_learning_selection(
    client: AsyncClient, db_session: AsyncSession
):
    """Verifies that resume returns the next incomplete lesson in order."""
    await create_user(db_session, "admin.res@learnova.ai", SystemRole.ADMIN.value)
    await create_user(db_session, "inst.res@learnova.ai", SystemRole.INSTRUCTOR.value)
    await create_user(db_session, "student.res@learnova.ai", SystemRole.STUDENT.value)

    admin_cookie = await get_auth_cookie(client, "admin.res@learnova.ai")
    inst_cookie = await get_auth_cookie(client, "inst.res@learnova.ai")
    student_cookie = await get_auth_cookie(client, "student.res@learnova.ai")

    course_id, lesson_ids = await setup_published_course(
        client, admin_cookie, inst_cookie, title="Distributed Systems", num_lessons=3
    )

    # Student enrolls
    await client.post(
        "/api/v1/enrollments",
        json={"course_id": course_id},
        cookies=student_cookie,
    )

    # 1. Before completing any lessons, resume points to Lesson 1
    res1 = await client.get(
        f"/api/v1/learning/courses/{course_id}/resume",
        cookies=student_cookie,
    )
    assert res1.status_code == 200
    assert res1.json()["next_lesson_id"] == lesson_ids[0]
    assert res1.json()["is_completed"] is False

    # 2. Complete Lesson 1 -> resume points to Lesson 2
    await client.put(
        f"/api/v1/learning/lessons/{lesson_ids[0]}/progress",
        json={"is_completed": True},
        cookies=student_cookie,
    )
    res2 = await client.get(
        f"/api/v1/learning/courses/{course_id}/resume",
        cookies=student_cookie,
    )
    assert res2.json()["next_lesson_id"] == lesson_ids[1]

    # 3. Complete Lesson 2 and Lesson 3 -> all complete
    await client.put(
        f"/api/v1/learning/lessons/{lesson_ids[1]}/progress",
        json={"is_completed": True},
        cookies=student_cookie,
    )
    await client.put(
        f"/api/v1/learning/lessons/{lesson_ids[2]}/progress",
        json={"is_completed": True},
        cookies=student_cookie,
    )
    res3 = await client.get(
        f"/api/v1/learning/courses/{course_id}/resume",
        cookies=student_cookie,
    )
    assert res3.json()["is_completed"] is True
    assert res3.json()["progress_percentage"] == 100.0


@pytest.mark.asyncio
async def test_cross_organization_enrollment_protection(
    client: AsyncClient, db_session: AsyncSession
):
    """Verifies tenant isolation preventing students in Org A from enrolling in Org B's courses."""
    org_a = Organization(name="Organization Alpha", slug="org-alpha-learn")
    org_b = Organization(name="Organization Beta", slug="org-beta-learn")
    db_session.add_all([org_a, org_b])
    await db_session.flush()

    await create_user(db_session, "admin.org@learnova.ai", SystemRole.ADMIN.value)
    await create_user(
        db_session, "inst.b@learnova.ai", SystemRole.INSTRUCTOR.value, org_id=org_b.id
    )
    await create_user(
        db_session, "student.a@learnova.ai", SystemRole.STUDENT.value, org_id=org_a.id
    )

    admin_cookie = await get_auth_cookie(client, "admin.org@learnova.ai")
    inst_b_cookie = await get_auth_cookie(client, "inst.b@learnova.ai")
    student_a_cookie = await get_auth_cookie(client, "student.a@learnova.ai")

    # Instructor B creates course in Org B
    course_b_id, _ = await setup_published_course(
        client, admin_cookie, inst_b_cookie, title="Org B Proprietary Training", org_id=org_b.id
    )

    # Student A (Org A) tries to enroll in Org B's course -> 403 Forbidden
    fail_res = await client.post(
        "/api/v1/enrollments",
        json={"course_id": course_b_id},
        cookies=student_a_cookie,
    )
    assert fail_res.status_code == 403
    assert "not accessible within your organization" in fail_res.json()["error"]["message"]
