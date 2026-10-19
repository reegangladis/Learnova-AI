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


async def get_auth_cookie(client: AsyncClient, email: str, password: str = "Password123!") -> dict[str, str]:
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    token = login_res.cookies.get("learnova_access_token")
    return {"learnova_access_token": token}


# ==============================================================================
# 1. Course Categories & Admin Permissions
# ==============================================================================


@pytest.mark.asyncio
async def test_category_crud_and_permissions(client: AsyncClient, db_session: AsyncSession):
    # Setup users
    await create_user(db_session, "admin.cat@learnova.ai", SystemRole.ADMIN.value)
    await create_user(db_session, "student.cat@learnova.ai", SystemRole.STUDENT.value)

    admin_cookie = await get_auth_cookie(client, "admin.cat@learnova.ai")
    student_cookie = await get_auth_cookie(client, "student.cat@learnova.ai")

    # 1. Student cannot create category
    res = await client.post(
        "/api/v1/course-categories",
        json={"name": "Data Science", "description": "All DS courses"},
        cookies=student_cookie,
    )
    assert res.status_code == 403

    # 2. Admin can create category
    res = await client.post(
        "/api/v1/course-categories",
        json={"name": "Artificial Intelligence", "description": "AI & Deep Learning"},
        cookies=admin_cookie,
    )
    assert res.status_code == 201
    cat_id = res.json()["id"]
    assert res.json()["slug"] == "artificial-intelligence"

    # 3. Public / Anonymous can list categories
    list_res = await client.get("/api/v1/course-categories")
    assert list_res.status_code == 200
    assert any(c["id"] == cat_id for c in list_res.json())

    # 4. Admin can update category
    update_res = await client.patch(
        f"/api/v1/course-categories/{cat_id}",
        json={"description": "Updated AI description"},
        cookies=admin_cookie,
    )
    assert update_res.status_code == 200
    assert update_res.json()["description"] == "Updated AI description"

    # 5. Admin can delete category
    del_res = await client.delete(f"/api/v1/course-categories/{cat_id}", cookies=admin_cookie)
    assert del_res.status_code == 204


# ==============================================================================
# 2. Course Creation, Auto-slug & Authorization
# ==============================================================================


@pytest.mark.asyncio
async def test_course_creation_and_authorization(client: AsyncClient, db_session: AsyncSession):
    # Setup users
    await create_user(db_session, "inst1@learnova.ai", SystemRole.INSTRUCTOR.value)
    await create_user(db_session, "student.cr@learnova.ai", SystemRole.STUDENT.value)

    inst_cookie = await get_auth_cookie(client, "inst1@learnova.ai")
    student_cookie = await get_auth_cookie(client, "student.cr@learnova.ai")

    # 1. Student cannot create course
    student_res = await client.post(
        "/api/v1/courses",
        json={
            "title": "Student Course Attempt",
            "short_description": "Short description for attempt",
            "description": "Full description for attempt",
        },
        cookies=student_cookie,
    )
    assert student_res.status_code == 403

    # 2. Instructor creates course
    create_payload = {
        "title": "Machine Learning Foundations",
        "short_description": "Comprehensive guide to ML and neural models.",
        "description": "Full syllabus covering regressions, transformers, and deployment.",
        "difficulty": "intermediate",
        "duration_minutes": 120,
        "learning_objectives": ["Understand neural nets", "Deploy models with FastAPI"],
        "prerequisites": ["Basic Python", "Calculus basics"],
    }
    inst_res = await client.post("/api/v1/courses", json=create_payload, cookies=inst_cookie)
    assert inst_res.status_code == 201
    course_data = inst_res.json()
    assert course_data["slug"] == "machine-learning-foundations"
    assert course_data["status"] == "draft"
    assert course_data["difficulty"] == "intermediate"
    assert len(course_data["learning_objectives"]) == 2

    # 3. Slug deduplication check: Instructor creates another course with same title
    second_res = await client.post("/api/v1/courses", json=create_payload, cookies=inst_cookie)
    assert second_res.status_code == 201
    assert second_res.json()["slug"] == "machine-learning-foundations-2"


# ==============================================================================
# 3. Ownership Enforcement & Modifications
# ==============================================================================


@pytest.mark.asyncio
async def test_instructor_ownership_enforcement(client: AsyncClient, db_session: AsyncSession):
    await create_user(db_session, "inst.alice@learnova.ai", SystemRole.INSTRUCTOR.value)
    await create_user(db_session, "inst.bob@learnova.ai", SystemRole.INSTRUCTOR.value)
    await create_user(db_session, "admin.own@learnova.ai", SystemRole.ADMIN.value)

    alice_cookie = await get_auth_cookie(client, "inst.alice@learnova.ai")
    bob_cookie = await get_auth_cookie(client, "inst.bob@learnova.ai")
    admin_cookie = await get_auth_cookie(client, "admin.own@learnova.ai")

    # Alice creates a course
    create_res = await client.post(
        "/api/v1/courses",
        json={
            "title": "Alice's Deep Learning",
            "short_description": "Deep learning specialization",
            "description": "Deep learning detailed course material",
        },
        cookies=alice_cookie,
    )
    assert create_res.status_code == 201
    course_id = create_res.json()["id"]

    # Bob attempts to update Alice's course -> 403 Forbidden
    bob_update = await client.patch(
        f"/api/v1/courses/{course_id}",
        json={"title": "Bob Hijacked Title"},
        cookies=bob_cookie,
    )
    assert bob_update.status_code == 403
    assert "Instructors can only manage courses they own" in bob_update.json()["error"]["message"]

    # Bob attempts to delete Alice's course -> 403 Forbidden
    bob_del = await client.delete(f"/api/v1/courses/{course_id}", cookies=bob_cookie)
    assert bob_del.status_code == 403

    # Alice can update her own course
    alice_update = await client.patch(
        f"/api/v1/courses/{course_id}",
        json={"title": "Alice's Advanced Deep Learning"},
        cookies=alice_cookie,
    )
    assert alice_update.status_code == 200
    assert alice_update.json()["title"] == "Alice's Advanced Deep Learning"

    # Admin can update Alice's course
    admin_update = await client.patch(
        f"/api/v1/courses/{course_id}",
        json={"title": "Admin Verified Deep Learning"},
        cookies=admin_cookie,
    )
    assert admin_update.status_code == 200
    assert admin_update.json()["title"] == "Admin Verified Deep Learning"


# ==============================================================================
# 4. Draft Visibility Isolation
# ==============================================================================


@pytest.mark.asyncio
async def test_draft_visibility_restrictions(client: AsyncClient, db_session: AsyncSession):
    await create_user(db_session, "inst.draft@learnova.ai", SystemRole.INSTRUCTOR.value)
    await create_user(db_session, "student.draft@learnova.ai", SystemRole.STUDENT.value)

    inst_cookie = await get_auth_cookie(client, "inst.draft@learnova.ai")
    student_cookie = await get_auth_cookie(client, "student.draft@learnova.ai")

    # Instructor creates draft course
    res = await client.post(
        "/api/v1/courses",
        json={
            "title": "Top Secret Draft Course",
            "short_description": "Secret unreleased curriculum",
            "description": "Detailed curriculum not yet ready for public view",
        },
        cookies=inst_cookie,
    )
    course_id = res.json()["id"]

    # 1. Anonymous visitor cannot get draft course details -> 403 Forbidden
    anon_detail = await client.get(f"/api/v1/courses/{course_id}")
    assert anon_detail.status_code == 403

    # 2. Student cannot get draft course details -> 403 Forbidden
    student_detail = await client.get(f"/api/v1/courses/{course_id}", cookies=student_cookie)
    assert student_detail.status_code == 403

    # 3. Anonymous course catalog listing does NOT include draft course
    anon_list = await client.get("/api/v1/courses")
    assert anon_list.status_code == 200
    assert not any(c["id"] == course_id for c in anon_list.json()["items"])

    # 4. Instructor CAN get their own draft course details
    inst_detail = await client.get(f"/api/v1/courses/{course_id}", cookies=inst_cookie)
    assert inst_detail.status_code == 200
    assert inst_detail.json()["id"] == course_id


# ==============================================================================
# 5. Modules, Lessons & Reordering
# ==============================================================================


@pytest.mark.asyncio
async def test_module_and_lesson_management_with_reordering(client: AsyncClient, db_session: AsyncSession):
    await create_user(db_session, "inst.curric@learnova.ai", SystemRole.INSTRUCTOR.value)
    inst_cookie = await get_auth_cookie(client, "inst.curric@learnova.ai")

    # Create Course
    course_res = await client.post(
        "/api/v1/courses",
        json={
            "title": "FastAPI Web Engineering",
            "short_description": "Building production APIs with FastAPI",
            "description": "Comprehensive asynchronous backend engineering syllabus",
        },
        cookies=inst_cookie,
    )
    course_id = course_res.json()["id"]

    # 1. Add Module 1 and Module 2
    mod1_res = await client.post(
        f"/api/v1/courses/{course_id}/modules",
        json={"title": "Module 1: Foundations", "description": "Introductory concepts"},
        cookies=inst_cookie,
    )
    assert mod1_res.status_code == 201
    mod1_id = mod1_res.json()["id"]

    mod2_res = await client.post(
        f"/api/v1/courses/{course_id}/modules",
        json={"title": "Module 2: Advanced Async", "description": "Concurrency & tasks"},
        cookies=inst_cookie,
    )
    assert mod2_res.status_code == 201
    mod2_id = mod2_res.json()["id"]

    # 2. Add Lessons to Module 1
    les1_res = await client.post(
        f"/api/v1/modules/{mod1_id}/lessons",
        json={
            "title": "Lesson 1: Introduction to Starlette",
            "content_type": "text",
            "text_content": "Starlette is an ASGI framework foundation for FastAPI applications.",
            "duration_minutes": 15,
            "is_preview": True,
        },
        cookies=inst_cookie,
    )
    assert les1_res.status_code == 201
    assert les1_res.json()["order_index"] == 0

    les2_res = await client.post(
        f"/api/v1/modules/{mod1_id}/lessons",
        json={
            "title": "Lesson 2: Video Walkthrough",
            "content_type": "video",
            "resource_url": "https://cdn.learnova.ai/videos/starlette-intro.mp4",
            "duration_minutes": 25,
            "is_preview": False,
        },
        cookies=inst_cookie,
    )
    assert les2_res.status_code == 201
    les2_id = les2_res.json()["id"]
    assert les2_res.json()["order_index"] == 1

    # 3. Reorder lessons within module 1 (move lesson 2 to index 0)
    reorder_res = await client.post(
        f"/api/v1/lessons/{les2_id}/reorder",
        json={"order_index": 0},
        cookies=inst_cookie,
    )
    assert reorder_res.status_code == 200
    assert reorder_res.json()["order_index"] == 0

    # 4. Reorder modules (move module 2 to index 0)
    mod_reorder = await client.post(
        f"/api/v1/modules/{mod2_id}/reorder",
        json={"order_index": 0},
        cookies=inst_cookie,
    )
    assert mod_reorder.status_code == 200
    assert mod_reorder.json()["order_index"] == 0

    # 5. Fetch course details and verify hierarchy
    detail_res = await client.get(f"/api/v1/courses/{course_id}", cookies=inst_cookie)
    assert detail_res.status_code == 200
    modules = detail_res.json()["modules"]
    assert len(modules) == 2
    assert modules[0]["id"] == mod2_id
    assert modules[1]["id"] == mod1_id
    assert len(modules[1]["lessons"]) == 2


# ==============================================================================
# 6. Publishing Completeness Validation Rules
# ==============================================================================


@pytest.mark.asyncio
async def test_publishing_completeness_validation(client: AsyncClient, db_session: AsyncSession):
    await create_user(db_session, "admin.pub@learnova.ai", SystemRole.ADMIN.value)
    await create_user(db_session, "inst.pub@learnova.ai", SystemRole.INSTRUCTOR.value)

    admin_cookie = await get_auth_cookie(client, "admin.pub@learnova.ai")
    inst_cookie = await get_auth_cookie(client, "inst.pub@learnova.ai")

    # Create category
    cat_res = await client.post(
        "/api/v1/course-categories",
        json={"name": "Software Architecture"},
        cookies=admin_cookie,
    )
    cat_id = cat_res.json()["id"]

    # 1. Create bare course (no category, no modules, no lessons)
    course_res = await client.post(
        "/api/v1/courses",
        json={
            "title": "Clean Architecture in Python",
            "short_description": "Design maintainable Python applications",
            "description": "Learn domain driven design and hexagonal architecture in Python",
        },
        cookies=inst_cookie,
    )
    course_id = course_res.json()["id"]

    # Attempt to publish -> fails because missing category, modules, lessons
    fail_res1 = await client.post(f"/api/v1/courses/{course_id}/publish", cookies=inst_cookie)
    assert fail_res1.status_code == 422
    err_msg = str(fail_res1.json())
    assert "A course category must be assigned" in err_msg
    assert "Course must contain at least one instructional module" in err_msg

    # 2. Assign category and add empty module
    await client.patch(f"/api/v1/courses/{course_id}", json={"category_id": cat_id}, cookies=inst_cookie)
    mod_res = await client.post(
        f"/api/v1/courses/{course_id}/modules",
        json={"title": "Domain Layer"},
        cookies=inst_cookie,
    )
    mod_id = mod_res.json()["id"]

    # Attempt to publish -> fails because module contains no lessons
    fail_res2 = await client.post(f"/api/v1/courses/{course_id}/publish", cookies=inst_cookie)
    assert fail_res2.status_code == 422
    assert "contains no lessons" in str(fail_res2.json())

    # 3. Add text lesson with empty content -> fails lesson content validation
    les_res = await client.post(
        f"/api/v1/modules/{mod_id}/lessons",
        json={
            "title": "Entities and Value Objects",
            "content_type": "text",
            "text_content": "",  # Empty!
        },
        cookies=inst_cookie,
    )
    les_id = les_res.json()["id"]

    fail_res3 = await client.post(f"/api/v1/courses/{course_id}/publish", cookies=inst_cookie)
    assert fail_res3.status_code == 422
    assert "requires non-empty text content" in str(fail_res3.json())

    # 4. Fix lesson text content
    await client.patch(
        f"/api/v1/lessons/{les_id}",
        json={"text_content": "Entities have distinct identities while value objects do not."},
        cookies=inst_cookie,
    )

    # 5. Publishing now succeeds!
    pub_res = await client.post(f"/api/v1/courses/{course_id}/publish", cookies=inst_cookie)
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "published"
    assert pub_res.json()["published_at"] is not None

    # 6. Anonymous visitors can now discover and view it!
    anon_catalog = await client.get("/api/v1/courses")
    assert anon_catalog.status_code == 200
    assert any(c["id"] == course_id for c in anon_catalog.json()["items"])

    anon_detail = await client.get(f"/api/v1/courses/{course_id}")
    assert anon_detail.status_code == 200
    assert anon_detail.json()["title"] == "Clean Architecture in Python"


# ==============================================================================
# 7. Search, Filtering, and Pagination
# ==============================================================================


@pytest.mark.asyncio
async def test_course_search_filtering_and_pagination(client: AsyncClient, db_session: AsyncSession):
    await create_user(db_session, "inst.filter@learnova.ai", SystemRole.INSTRUCTOR.value)
    await create_user(db_session, "admin.filter@learnova.ai", SystemRole.ADMIN.value)

    inst_cookie = await get_auth_cookie(client, "inst.filter@learnova.ai")
    admin_cookie = await get_auth_cookie(client, "admin.filter@learnova.ai")

    # Create category
    cat_res = await client.post(
        "/api/v1/course-categories",
        json={"name": "Frontend Engineering"},
        cookies=admin_cookie,
    )
    cat_id = cat_res.json()["id"]

    # Seed 3 published courses
    for i in range(1, 4):
        c_res = await client.post(
            "/api/v1/courses",
            json={
                "title": f"React Modern Mastery #{i}",
                "short_description": f"Master React 18 hooks and state #{i}",
                "description": f"Detailed frontend deep dive course number #{i}",
                "category_id": cat_id,
                "difficulty": "beginner" if i == 1 else "advanced",
            },
            cookies=inst_cookie,
        )
        cid = c_res.json()["id"]

        # Add module and lesson
        m_res = await client.post(
            f"/api/v1/courses/{cid}/modules",
            json={"title": "Intro Module"},
            cookies=inst_cookie,
        )
        mid = m_res.json()["id"]
        await client.post(
            f"/api/v1/modules/{mid}/lessons",
            json={
                "title": "Welcome Lesson",
                "content_type": "text",
                "text_content": "Welcome to React Modern Mastery comprehensive guide.",
            },
            cookies=inst_cookie,
        )
        # Publish
        await client.post(f"/api/v1/courses/{cid}/publish", cookies=inst_cookie)

    # 1. Search filter
    search_res = await client.get("/api/v1/courses", params={"search": "Mastery #2"})
    assert search_res.status_code == 200
    assert search_res.json()["total"] == 1
    assert search_res.json()["items"][0]["title"] == "React Modern Mastery #2"

    # 2. Difficulty filter
    diff_res = await client.get("/api/v1/courses", params={"difficulty": "beginner"})
    assert diff_res.status_code == 200
    assert any(c["difficulty"] == "beginner" for c in diff_res.json()["items"])

    # 3. Category filter
    cat_filter_res = await client.get("/api/v1/courses", params={"category_id": cat_id})
    assert cat_filter_res.status_code == 200
    assert cat_filter_res.json()["total"] == 3

    # 4. Pagination (page_size = 2)
    page_res = await client.get("/api/v1/courses", params={"category_id": cat_id, "page": 1, "page_size": 2})
    assert page_res.status_code == 200
    assert len(page_res.json()["items"]) == 2
    assert page_res.json()["total"] == 3
    assert page_res.json()["total_pages"] == 2


# ==============================================================================
# 8. Cross-Organization Isolation
# ==============================================================================


@pytest.mark.asyncio
async def test_cross_organization_boundary_protection(client: AsyncClient, db_session: AsyncSession):
    # Create two organizations
    org1 = Organization(name="Organization Alpha", slug="org-alpha")
    org2 = Organization(name="Organization Beta", slug="org-beta")
    db_session.add_all([org1, org2])
    await db_session.flush()

    # Create Org 1 admin and instructor
    await create_user(db_session, "admin.alpha@learnova.ai", SystemRole.ADMIN.value, org_id=org1.id)
    await create_user(db_session, "inst.alpha@learnova.ai", SystemRole.INSTRUCTOR.value, org_id=org1.id)

    # Create Org 2 admin
    await create_user(db_session, "admin.beta@learnova.ai", SystemRole.ADMIN.value, org_id=org2.id)

    # Create Platform Super Admin
    await create_user(db_session, "super.admin@learnova.ai", SystemRole.SUPER_ADMIN.value)

    alpha_inst_cookie = await get_auth_cookie(client, "inst.alpha@learnova.ai")
    beta_admin_cookie = await get_auth_cookie(client, "admin.beta@learnova.ai")
    super_admin_cookie = await get_auth_cookie(client, "super.admin@learnova.ai")

    cat_res = await client.post(
        "/api/v1/course-categories",
        json={"name": "Alpha Internal Security"},
        cookies=super_admin_cookie,
    )
    cat_id = cat_res.json()["id"]

    # Alpha instructor creates a course belonging to Org Alpha
    res = await client.post(
        "/api/v1/courses",
        json={
            "title": "Alpha Proprietary Course",
            "short_description": "Exclusive training for Alpha personnel",
            "description": "Proprietary syllabus and trade secrets of Alpha Corp",
            "category_id": cat_id,
        },
        cookies=alpha_inst_cookie,
    )
    course_id = res.json()["id"]

    # Beta admin attempts to edit Alpha course -> 403 Forbidden
    cross_edit = await client.patch(
        f"/api/v1/courses/{course_id}",
        json={"title": "Beta Hijacking Alpha Course"},
        cookies=beta_admin_cookie,
    )
    assert cross_edit.status_code == 403
    assert "belonging to a different organization" in cross_edit.json()["error"]["message"]

    # Super admin can edit it without restriction
    super_edit = await client.patch(
        f"/api/v1/courses/{course_id}",
        json={"title": "Super Admin Verified Alpha Course"},
        cookies=super_admin_cookie,
    )
    assert super_edit.status_code == 200
    assert super_edit.json()["title"] == "Super Admin Verified Alpha Course"

    # Add module & lesson, then publish Alpha course
    mod_res = await client.post(
        f"/api/v1/courses/{course_id}/modules",
        json={"title": "Alpha Module 1", "sort_order": 1},
        cookies=alpha_inst_cookie,
    )
    assert mod_res.status_code == 201
    mod_id = mod_res.json()["id"]

    les_res = await client.post(
        f"/api/v1/modules/{mod_id}/lessons",
        json={"title": "Alpha Lesson 1", "sort_order": 1, "text_content": "Confidential Alpha material"},
        cookies=alpha_inst_cookie,
    )
    assert les_res.status_code == 201

    pub_res = await client.post(f"/api/v1/courses/{course_id}/publish", cookies=alpha_inst_cookie)
    assert pub_res.status_code == 200

    # Beta admin attempts to view Alpha course detail -> 403 Forbidden
    cross_view = await client.get(
        f"/api/v1/courses/{course_id}",
        cookies=beta_admin_cookie,
    )
    assert cross_view.status_code == 403

    # Anonymous visitor attempts to view Alpha course detail -> 403 Forbidden
    client.cookies.clear()
    anon_view = await client.get(f"/api/v1/courses/{course_id}")
    assert anon_view.status_code == 403

    # Beta admin listing courses should NOT see Alpha course
    beta_catalog = await client.get("/api/v1/courses", cookies=beta_admin_cookie)
    assert not any(c["id"] == course_id for c in beta_catalog.json()["items"])

    # Super admin CAN view it
    super_view = await client.get(f"/api/v1/courses/{course_id}", cookies=super_admin_cookie)
    assert super_view.status_code == 200

    # Alpha instructor CAN view it
    alpha_view = await client.get(f"/api/v1/courses/{course_id}", cookies=alpha_inst_cookie)
    assert alpha_view.status_code == 200


# ==============================================================================
# 5. Phase 3 Lifecycle: Unpublish, Unarchive, and Invalid Transitions
# ==============================================================================


@pytest.mark.asyncio
async def test_course_lifecycle_unpublish_and_unarchive(client: AsyncClient, db_session: AsyncSession):
    await create_user(db_session, "inst.life@learnova.ai", SystemRole.INSTRUCTOR.value)
    inst_cookie = await get_auth_cookie(client, "inst.life@learnova.ai")

    # Create category & course
    cat_res = await client.post(
        "/api/v1/course-categories",
        json={"name": "Lifecycle Science"},
        cookies=inst_cookie,
    )
    # Admin is required for category creation; create user as Admin or use Platform Super Admin
    await create_user(db_session, "admin.life@learnova.ai", SystemRole.SUPER_ADMIN.value)
    admin_cookie = await get_auth_cookie(client, "admin.life@learnova.ai")
    cat_res = await client.post(
        "/api/v1/course-categories",
        json={"name": "Lifecycle Science"},
        cookies=admin_cookie,
    )
    cat_id = cat_res.json()["id"]

    res = await client.post(
        "/api/v1/courses",
        json={
            "title": "Quantum Computing 101",
            "short_description": "An introduction to qubits and superposition",
            "description": "Comprehensive course covering quantum gates, algorithms, and applications.",
            "category_id": cat_id,
        },
        cookies=inst_cookie,
    )
    course_id = res.json()["id"]
    assert res.json()["status"] == "draft"

    # Add module & lesson to satisfy completeness
    mod_res = await client.post(
        f"/api/v1/courses/{course_id}/modules",
        json={"title": "Module 1", "sort_order": 1},
        cookies=inst_cookie,
    )
    mod_id = mod_res.json()["id"]

    await client.post(
        f"/api/v1/modules/{mod_id}/lessons",
        json={"title": "Lesson 1", "sort_order": 1, "text_content": "Introduction to Superposition"},
        cookies=inst_cookie,
    )

    # 1. Publish course -> PUBLISHED
    pub_res = await client.post(f"/api/v1/courses/{course_id}/publish", cookies=inst_cookie)
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "published"

    # 2. Unpublish course -> DRAFT
    unpub_res = await client.post(f"/api/v1/courses/{course_id}/unpublish", cookies=inst_cookie)
    assert unpub_res.status_code == 200
    assert unpub_res.json()["status"] == "draft"

    # 3. Cannot unpublish a course that is already in DRAFT
    unpub_dup = await client.post(f"/api/v1/courses/{course_id}/unpublish", cookies=inst_cookie)
    assert unpub_dup.status_code == 422
    assert "Only published courses can be unpublished" in unpub_dup.json()["error"]["message"]

    # 4. Archive course -> ARCHIVED
    arch_res = await client.post(f"/api/v1/courses/{course_id}/archive", cookies=inst_cookie)
    assert arch_res.status_code == 200
    assert arch_res.json()["status"] == "archived"

    # 5. Cannot publish an archived course directly (must restore to draft first)
    pub_arch = await client.post(f"/api/v1/courses/{course_id}/publish", cookies=inst_cookie)
    assert pub_arch.status_code == 422
    assert "Archived courses cannot be published directly" in pub_arch.json()["error"]["message"]

    # 6. Unarchive course -> DRAFT
    unarch_res = await client.post(f"/api/v1/courses/{course_id}/unarchive", cookies=inst_cookie)
    assert unarch_res.status_code == 200
    assert unarch_res.json()["status"] == "draft"

    # 7. Cannot unarchive a course that is already in DRAFT
    unarch_dup = await client.post(f"/api/v1/courses/{course_id}/unarchive", cookies=inst_cookie)
    assert unarch_dup.status_code == 422
    assert "Only archived courses can be unarchived" in unarch_dup.json()["error"]["message"]


# ==============================================================================
# 6. Active Enrollment Deletion Protection
# ==============================================================================


@pytest.mark.asyncio
async def test_course_deletion_protection_with_active_enrollments(
    client: AsyncClient, db_session: AsyncSession
):
    await create_user(db_session, "inst.del@learnova.ai", SystemRole.INSTRUCTOR.value)
    await create_user(db_session, "stud.del@learnova.ai", SystemRole.STUDENT.value)
    await create_user(db_session, "admin.del@learnova.ai", SystemRole.SUPER_ADMIN.value)

    inst_cookie = await get_auth_cookie(client, "inst.del@learnova.ai")
    stud_cookie = await get_auth_cookie(client, "stud.del@learnova.ai")
    admin_cookie = await get_auth_cookie(client, "admin.del@learnova.ai")

    cat_res = await client.post(
        "/api/v1/course-categories",
        json={"name": "DevOps & Cloud"},
        cookies=admin_cookie,
    )
    cat_id = cat_res.json()["id"]

    res = await client.post(
        "/api/v1/courses",
        json={
            "title": "Kubernetes Mastery",
            "short_description": "Production container orchestration at scale",
            "description": "Learn deployments, stateful sets, ingress controllers, and service meshes.",
            "category_id": cat_id,
        },
        cookies=inst_cookie,
    )
    course_id = res.json()["id"]

    # Add module & lesson and publish
    mod_res = await client.post(
        f"/api/v1/courses/{course_id}/modules",
        json={"title": "K8s Architecture", "sort_order": 1},
        cookies=inst_cookie,
    )
    mod_id = mod_res.json()["id"]

    await client.post(
        f"/api/v1/modules/{mod_id}/lessons",
        json={"title": "Control Plane Pods", "sort_order": 1, "text_content": "API server, scheduler, controller manager."},
        cookies=inst_cookie,
    )

    await client.post(f"/api/v1/courses/{course_id}/publish", cookies=inst_cookie)

    # Student enrolls
    enr_res = await client.post("/api/v1/enrollments", json={"course_id": course_id}, cookies=stud_cookie)
    assert enr_res.status_code == 201

    # Duplicate enrollment rejected safely
    dup_res = await client.post("/api/v1/enrollments", json={"course_id": course_id}, cookies=stud_cookie)
    assert dup_res.status_code == 409

    # Instructor attempts to DELETE course -> 403 Forbidden
    del_res = await client.post(f"/api/v1/courses/{course_id}/unpublish", cookies=inst_cookie)
    del_attempt = await client.delete(f"/api/v1/courses/{course_id}", cookies=inst_cookie)
    assert del_attempt.status_code == 403
    assert "Cannot delete a course with active enrollments" in del_attempt.json()["error"]["message"]

    # Instructor archives the course instead -> 200 OK
    arch_res = await client.post(f"/api/v1/courses/{course_id}/archive", cookies=inst_cookie)
    assert arch_res.status_code == 200

    # Platform Super Admin retains force-deletion authority
    super_del = await client.delete(f"/api/v1/courses/{course_id}", cookies=admin_cookie)
    assert super_del.status_code == 204


# ==============================================================================
# 7. Safe HTML Sanitization (XSS Prevention)
# ==============================================================================


@pytest.mark.asyncio
async def test_html_sanitization_on_course_and_lessons(
    client: AsyncClient, db_session: AsyncSession
):
    await create_user(db_session, "inst.xss@learnova.ai", SystemRole.INSTRUCTOR.value)
    await create_user(db_session, "admin.xss@learnova.ai", SystemRole.SUPER_ADMIN.value)
    inst_cookie = await get_auth_cookie(client, "inst.xss@learnova.ai")
    admin_cookie = await get_auth_cookie(client, "admin.xss@learnova.ai")

    cat_res = await client.post(
        "/api/v1/course-categories",
        json={"name": "Cybersecurity"},
        cookies=admin_cookie,
    )
    cat_id = cat_res.json()["id"]

    # Create course with malicious script and event handlers
    xss_desc = "<p>Legitimate overview.</p><script>alert('xss')</script><img src='x' onerror='stealCookie()'>"
    xss_short = "Safe intro <b onclick='hack()'>bold</b>"

    course_res = await client.post(
        "/api/v1/courses",
        json={
            "title": "Application Security",
            "short_description": xss_short,
            "description": xss_desc,
            "category_id": cat_id,
        },
        cookies=inst_cookie,
    )
    assert course_res.status_code == 201
    course_data = course_res.json()
    course_id = course_data["id"]

    # Script tag stripped, onerror attribute stripped, legitimate p/b preserved
    assert "<script>" not in course_data["description"]
    assert "onerror" not in course_data["description"]
    assert "<p>Legitimate overview.</p>" in course_data["description"]
    assert "onclick" not in course_data["short_description"]
    assert "<b>bold</b>" in course_data["short_description"]

    # Module and lesson with malicious HTML & JavaScript scheme
    mod_res = await client.post(
        f"/api/v1/courses/{course_id}/modules",
        json={"title": "Injection Attacks", "sort_order": 1},
        cookies=inst_cookie,
    )
    mod_id = mod_res.json()["id"]

    xss_lesson_body = (
        "<h2>SQL Injection</h2>"
        "<a href=\"javascript:alert('malicious')\">Click here</a>"
        "<iframe src=\"http://attacker.com\"></iframe>"
        "<pre><code>SELECT * FROM users;</code></pre>"
    )

    les_res = await client.post(
        f"/api/v1/modules/{mod_id}/lessons",
        json={
            "title": "Lesson 1: SQLi",
            "sort_order": 1,
            "text_content": xss_lesson_body,
        },
        cookies=inst_cookie,
    )
    assert les_res.status_code == 201
    les_data = les_res.json()

    assert "<iframe" not in les_data["text_content"]
    assert "javascript:" not in les_data["text_content"]
    assert "<h2>SQL Injection</h2>" in les_data["text_content"]
    assert "<pre><code>SELECT * FROM users;</code></pre>" in les_data["text_content"]


# ==============================================================================
# 8. Multimedia Lessons & Downloadable Resource Validation
# ==============================================================================


@pytest.mark.asyncio
async def test_multimedia_lesson_and_resource_validation(
    client: AsyncClient, db_session: AsyncSession
):
    await create_user(db_session, "inst.media@learnova.ai", SystemRole.INSTRUCTOR.value)
    await create_user(db_session, "admin.media@learnova.ai", SystemRole.SUPER_ADMIN.value)
    inst_cookie = await get_auth_cookie(client, "inst.media@learnova.ai")
    admin_cookie = await get_auth_cookie(client, "admin.media@learnova.ai")

    cat_res = await client.post(
        "/api/v1/course-categories",
        json={"name": "Data Science"},
        cookies=admin_cookie,
    )
    cat_id = cat_res.json()["id"]

    c_res = await client.post(
        "/api/v1/courses",
        json={
            "title": "Deep Learning Fundamentals",
            "short_description": "Neural networks and gradient descent",
            "description": "Backpropagation, convolutions, attention mechanisms, and transformers.",
            "category_id": cat_id,
        },
        cookies=inst_cookie,
    )
    course_id = c_res.json()["id"]

    mod_res = await client.post(
        f"/api/v1/courses/{course_id}/modules",
        json={"title": "CNNs", "sort_order": 1},
        cookies=inst_cookie,
    )
    mod_id = mod_res.json()["id"]

    # 1. Valid YouTube Video URL -> Success
    v1 = await client.post(
        f"/api/v1/modules/{mod_id}/lessons",
        json={
            "title": "Convolutional Layer Lecture",
            "sort_order": 1,
            "content_type": "video",
            "resource_url": "https://www.youtube.com/watch?v=aircAruvnKk",
            "duration_minutes": 25,
        },
        cookies=inst_cookie,
    )
    assert v1.status_code == 201

    # 2. Invalid Video Scheme (ftp://) -> 422
    v2 = await client.post(
        f"/api/v1/modules/{mod_id}/lessons",
        json={
            "title": "Insecure Video",
            "sort_order": 2,
            "content_type": "video",
            "resource_url": "ftp://files.example.com/lecture.mp4",
        },
        cookies=inst_cookie,
    )
    assert v2.status_code == 422

    # 3. Valid PDF resource URL -> Success
    pdf1 = await client.post(
        f"/api/v1/modules/{mod_id}/lessons",
        json={
            "title": "Backprop Cheatsheet",
            "sort_order": 3,
            "content_type": "pdf",
            "resource_url": "https://cdn.learnova.ai/docs/deep-learning.pdf",
        },
        cookies=inst_cookie,
    )
    assert pdf1.status_code == 201

    # 4. Invalid PDF (non-pdf extension) -> 422
    pdf2 = await client.post(
        f"/api/v1/modules/{mod_id}/lessons",
        json={
            "title": "Suspicious Executable",
            "sort_order": 4,
            "content_type": "pdf",
            "resource_url": "https://cdn.learnova.ai/docs/trojan.exe",
        },
        cookies=inst_cookie,
    )
    assert pdf2.status_code == 422

    # 5. Valid Downloadable Supplementary Resource in metadata -> Success
    down1 = await client.post(
        f"/api/v1/modules/{mod_id}/lessons",
        json={
            "title": "PyTorch Notebook",
            "sort_order": 5,
            "content_type": "text",
            "text_content": "<p>Download the dataset below.</p>",
            "metadata_json": {
                "downloadable_resources": [
                    {
                        "name": "cifar10_dataset.zip",
                        "url": "https://storage.learnova.ai/datasets/cifar10.zip",
                        "file_type": "zip",
                        "size_bytes": 10 * 1024 * 1024,
                    }
                ]
            },
        },
        cookies=inst_cookie,
    )
    assert down1.status_code == 201

    # 6. Disallowed Downloadable File Type (.bat) -> 422
    down2 = await client.post(
        f"/api/v1/modules/{mod_id}/lessons",
        json={
            "title": "Bad Script",
            "sort_order": 6,
            "content_type": "text",
            "text_content": "<p>Do not run this.</p>",
            "metadata_json": {
                "downloadable_resources": [
                    {
                        "name": "install.bat",
                        "url": "https://storage.learnova.ai/files/install.bat",
                        "file_type": "bat",
                        "size_bytes": 512,
                    }
                ]
            },
        },
        cookies=inst_cookie,
    )
    assert down2.status_code == 422


# ==============================================================================
# 9. Lesson Detail Endpoint & Enrollment Validation
# ==============================================================================


@pytest.mark.asyncio
async def test_lesson_detail_endpoint_preview_and_access(
    client: AsyncClient, db_session: AsyncSession
):
    await create_user(db_session, "inst.less@learnova.ai", SystemRole.INSTRUCTOR.value)
    await create_user(db_session, "stud.enrolled@learnova.ai", SystemRole.STUDENT.value)
    await create_user(db_session, "stud.outsider@learnova.ai", SystemRole.STUDENT.value)
    await create_user(db_session, "admin.less@learnova.ai", SystemRole.SUPER_ADMIN.value)

    inst_cookie = await get_auth_cookie(client, "inst.less@learnova.ai")
    enrolled_cookie = await get_auth_cookie(client, "stud.enrolled@learnova.ai")
    outsider_cookie = await get_auth_cookie(client, "stud.outsider@learnova.ai")
    admin_cookie = await get_auth_cookie(client, "admin.less@learnova.ai")

    cat_res = await client.post(
        "/api/v1/course-categories",
        json={"name": "Computer Architecture"},
        cookies=admin_cookie,
    )
    cat_id = cat_res.json()["id"]

    c_res = await client.post(
        "/api/v1/courses",
        json={
            "title": "RISC-V Microarchitecture",
            "short_description": "Pipelining, hazard detection, and branch prediction",
            "description": "Design an in-order five-stage pipelined processor with forwarding and stall units.",
            "category_id": cat_id,
        },
        cookies=inst_cookie,
    )
    course_id = c_res.json()["id"]

    mod_res = await client.post(
        f"/api/v1/courses/{course_id}/modules",
        json={"title": "Pipelines", "sort_order": 1},
        cookies=inst_cookie,
    )
    mod_id = mod_res.json()["id"]

    # Preview Lesson
    prev_les = await client.post(
        f"/api/v1/modules/{mod_id}/lessons",
        json={
            "title": "Preview: Instruction Sets",
            "sort_order": 1,
            "text_content": "<p>Publicly viewable lesson content</p>",
            "is_preview": True,
        },
        cookies=inst_cookie,
    )
    prev_id = prev_les.json()["id"]

    # Non-preview Lesson
    locked_les = await client.post(
        f"/api/v1/modules/{mod_id}/lessons",
        json={
            "title": "Private: Forwarding Logic",
            "sort_order": 2,
            "text_content": "<p>Restricted enrolled student lesson</p>",
            "is_preview": False,
        },
        cookies=inst_cookie,
    )
    locked_id = locked_les.json()["id"]

    # A) While course is DRAFT:
    # Instructor can view locked lesson -> 200
    inst_v = await client.get(f"/api/v1/lessons/{locked_id}", cookies=inst_cookie)
    assert inst_v.status_code == 200

    # Student cannot view draft lesson -> 403
    stud_draft = await client.get(f"/api/v1/lessons/{locked_id}", cookies=enrolled_cookie)
    assert stud_draft.status_code == 403

    # Anonymous cannot view draft lesson -> 403
    client.cookies.clear()
    anon_draft = await client.get(f"/api/v1/lessons/{locked_id}")
    assert anon_draft.status_code == 403

    # B) Publish Course:
    await client.post(f"/api/v1/courses/{course_id}/publish", cookies=inst_cookie)

    # Student 1 enrolls:
    await client.post("/api/v1/enrollments", json={"course_id": course_id}, cookies=enrolled_cookie)

    # Preview Lesson is accessible by anyone:
    client.cookies.clear()
    anon_prev = await client.get(f"/api/v1/lessons/{prev_id}")
    assert anon_prev.status_code == 200
    assert anon_prev.json()["id"] == prev_id

    out_prev = await client.get(f"/api/v1/lessons/{prev_id}", cookies=outsider_cookie)
    assert out_prev.status_code == 200

    # Non-preview Lesson:
    # Anonymous -> 403
    client.cookies.clear()
    anon_locked = await client.get(f"/api/v1/lessons/{locked_id}")
    assert anon_locked.status_code == 403

    # Outsider student (not enrolled) -> 403
    out_locked = await client.get(f"/api/v1/lessons/{locked_id}", cookies=outsider_cookie)
    assert out_locked.status_code == 403

    # Enrolled student -> 200 OK
    enrolled_view = await client.get(f"/api/v1/lessons/{locked_id}", cookies=enrolled_cookie)
    assert enrolled_view.status_code == 200
    assert "Restricted enrolled student lesson" in enrolled_view.json()["text_content"]


