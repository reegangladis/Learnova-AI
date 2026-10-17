import asyncio
import logging

from backend.app.core.config import get_settings
from backend.app.core.rbac import SystemRole
from backend.app.core.security import hash_password
from backend.app.db.session import get_session_factory
from backend.app.repositories.role_repo import RoleRepository
from backend.app.repositories.user_repo import UserRepository

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("learnova.seed")
settings = get_settings()

SEED_USERS = [
    {
        "email": "superadmin@learnova.ai",
        "password": "SuperAdmin123!",
        "first_name": "Global",
        "last_name": "SuperAdmin",
        "role": SystemRole.SUPER_ADMIN.value,
        "is_verified": True,
    },
    {
        "email": "admin@learnova.ai",
        "password": "Admin123!",
        "first_name": "Platform",
        "last_name": "Admin",
        "role": SystemRole.ADMIN.value,
        "is_verified": True,
    },
    {
        "email": "instructor@learnova.ai",
        "password": "Instructor123!",
        "first_name": "Sarah",
        "last_name": "Instructor",
        "role": SystemRole.INSTRUCTOR.value,
        "is_verified": True,
    },
    {
        "email": "student@learnova.ai",
        "password": "Student123!",
        "first_name": "Alex",
        "last_name": "Student",
        "role": SystemRole.STUDENT.value,
        "is_verified": True,
    },
]


async def seed_development_data() -> None:
    """Seeds default organization, RBAC roles, and 4 test personas for development."""
    if settings.APP_ENV.lower() == "production":
        raise ValueError(
            "CRITICAL: Development seed script cannot run in production mode."
        )

    session_maker = get_session_factory()
    async with session_maker() as session:
        user_repo = UserRepository(session)
        role_repo = RoleRepository(session)

        logger.info("Seeding default organization and RBAC permissions/roles...")
        org = await user_repo.get_or_create_organization(
            name="Learnova Academy",
            slug="learnova-academy",
        )
        await role_repo.ensure_default_roles_and_permissions()

        for user_data in SEED_USERS:
            existing = await user_repo.get_by_email(user_data["email"])
            if not existing:
                logger.info(
                    f"Creating seed user: {user_data['email']} [{user_data['role']}]"
                )
                user = await user_repo.create(
                    email=user_data["email"],
                    password_hash=hash_password(user_data["password"]),
                    first_name=user_data["first_name"],
                    last_name=user_data["last_name"],
                    organization_id=org.id,
                    is_active=True,
                    is_verified=user_data["is_verified"],
                )
                role = await role_repo.get_role_by_name(user_data["role"])
                if role:
                    await role_repo.assign_role_to_user(user, role)
            else:
                logger.info(f"Seed user already exists: {user_data['email']}")

        await session.commit()
        logger.info("Development data seed completed successfully.")


if __name__ == "__main__":
    asyncio.run(seed_development_data())
