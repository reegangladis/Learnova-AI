import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.rbac import SystemRole
from backend.app.core.security import hash_password
from backend.app.db.session import get_engine, get_session_factory
from backend.app.models import (
    Base,
    Course,
    CourseCategory,
    CourseDifficulty,
    CourseModule,
    CourseStatus,
    Lesson,
    LessonContentType,
    Organization,
)
from backend.app.repositories.role_repo import RoleRepository
from backend.app.repositories.user_repo import UserRepository

logger = logging.getLogger("learnova")


async def init_db() -> None:
    """Initializes tables and seeds default roles, admin users, and sample courses if not present."""
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = get_session_factory()
    async with session_factory() as session:
        role_repo = RoleRepository(session)
        await role_repo.ensure_default_roles_and_permissions()

        # 1. Organization
        org_stmt = select(Organization).where(Organization.slug == "learnova-global")
        res = await session.execute(org_stmt)
        org = res.scalars().first()
        if not org:
            org = Organization(name="Learnova AI Global", slug="learnova-global", is_active=True)
            session.add(org)
            await session.flush()

        # 2. Users
        user_repo = UserRepository(session)
        seed_users = [
            ("superadmin@learnova.ai", "SuperAdmin123!", "Elena", "Vance", SystemRole.SUPER_ADMIN.value),
            ("admin@learnova.ai", "Admin123!", "Marcus", "Chen", SystemRole.ADMIN.value),
            ("instructor@learnova.ai", "Instructor123!", "Sarah", "Connor", SystemRole.INSTRUCTOR.value),
            ("student@learnova.ai", "Student123!", "Alex", "Morgan", SystemRole.STUDENT.value),
        ]

        created_users = {}
        for email, pwd, first, last, role_name in seed_users:
            u = await user_repo.get_by_email(email)
            if not u:
                u = await user_repo.create(
                    email=email,
                    password_hash=hash_password(pwd),
                    first_name=first,
                    last_name=last,
                    organization_id=org.id,
                    is_active=True,
                    is_verified=True,
                )
                role = await role_repo.get_role_by_name(role_name)
                if role:
                    await role_repo.assign_role_to_user(u, role)
                logger.info(f"Seeded user: {email} ({role_name})")
            created_users[role_name] = u

        # 3. Sample Category & Course
        cat_stmt = select(CourseCategory).where(CourseCategory.slug == "ai-data-science")
        cat_res = await session.execute(cat_stmt)
        category = cat_res.scalars().first()
        if not category:
            category = CourseCategory(
                name="AI & Data Science",
                slug="ai-data-science",
                description="Cutting-edge Artificial Intelligence and Machine Learning tracks.",
            )
            session.add(category)
            await session.flush()

        course_stmt = select(Course).where(Course.slug == "mastering-modern-ai-engineering")
        c_res = await session.execute(course_stmt)
        course = c_res.scalars().first()
        if not course:
            instructor = created_users.get(SystemRole.INSTRUCTOR.value)
            if instructor:
                course = Course(
                    instructor_id=instructor.id,
                    organization_id=org.id,
                    category_id=category.id,
                    title="Mastering Modern AI Engineering",
                    slug="mastering-modern-ai-engineering",
                    short_description="Build production-ready LLM agents, RAG pipelines, and scalable microservices.",
                    description="<p>An end-to-end journey into modern AI architectures, vector databases, and real-time inference workflows.</p>",
                    difficulty=CourseDifficulty.INTERMEDIATE.value,
                    status=CourseStatus.PUBLISHED.value,
                    duration_minutes=360,
                    learning_objectives=[
                        "Build autonomous agents",
                        "Deploy RAG systems with vector DBs",
                        "Implement FastAPI microservices",
                    ],
                    prerequisites=["Python fundamentals", "Basic HTTP and REST API concepts"],
                )
                session.add(course)
                await session.flush()

                module = CourseModule(
                    course_id=course.id,
                    title="Module 1: Foundations of Agentic AI",
                    description="Understand core principles of autonomous agents and reasoning loops.",
                    order_index=1,
                )
                session.add(module)
                await session.flush()

                l1 = Lesson(
                    module_id=module.id,
                    title="Lesson 1: Introduction to LLM Tool Use",
                    content_type=LessonContentType.TEXT.value,
                    text_content="<p>Autonomous agents utilize tool calls to interact with external environments.</p>",
                    order_index=1,
                    duration_minutes=25,
                    is_preview=True,
                )
                l2 = Lesson(
                    module_id=module.id,
                    title="Lesson 2: Multi-Agent Orchestration",
                    content_type=LessonContentType.VIDEO.value,
                    resource_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                    order_index=2,
                    duration_minutes=45,
                )
                session.add_all([l1, l2])

        await session.commit()
    logger.info("Database schema and seed check completed.")
