import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.organization import Organization
from backend.app.models.role import Role
from backend.app.models.user import User


class UserRepository:
    """Data access repository for User entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        """Finds a user by primary key ID with loaded roles and permissions."""
        stmt = (
            select(User)
            .where(User.id == user_id)
            .options(
                selectinload(User.roles).selectinload(Role.permissions),
                selectinload(User.organization),
            )
            .execution_options(populate_existing=True)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_by_email(self, email: str) -> User | None:
        """Finds a user by email address (case-insensitive) with loaded roles and permissions."""
        stmt = (
            select(User)
            .where(func.lower(User.email) == email.lower().strip())
            .options(
                selectinload(User.roles).selectinload(Role.permissions),
                selectinload(User.organization),
            )
            .execution_options(populate_existing=True)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def create(
        self,
        email: str,
        password_hash: str,
        first_name: str,
        last_name: str,
        organization_id: uuid.UUID | None = None,
        is_active: bool = True,
        is_verified: bool = False,
    ) -> User:
        """Creates a new user record."""
        user = User(
            email=email.lower().strip(),
            password_hash=password_hash,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            organization_id=organization_id,
            is_active=is_active,
            is_verified=is_verified,
        )
        self.db.add(user)
        await self.db.flush()
        return user

    async def get_or_create_organization(self, name: str, slug: str) -> Organization:
        """Finds or creates an organization by slug."""
        stmt = select(Organization).where(Organization.slug == slug.lower().strip())
        result = await self.db.execute(stmt)
        org = result.scalars().first()
        if not org:
            org = Organization(name=name, slug=slug.lower().strip())
            self.db.add(org)
            await self.db.flush()
        return org

    async def update_last_login(self, user: User) -> None:
        """Updates user last login timestamp and resets failed attempts."""
        user.last_login_at = datetime.now(timezone.utc)
        user.failed_login_attempts = 0
        user.locked_until = None
        await self.db.flush()

    async def increment_failed_login(
        self, user: User, max_attempts: int, lockout_minutes: int
    ) -> int:
        """Increments failed login counter and conditionally locks account."""
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= max_attempts:
            from datetime import timedelta

            user.locked_until = datetime.now(timezone.utc) + timedelta(
                minutes=lockout_minutes
            )
        await self.db.flush()
        return user.failed_login_attempts

    async def list_users(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        is_active: bool | None = None,
        organization_id: uuid.UUID | None = None,
    ) -> tuple[list[User], int]:
        """Returns paginated list of users and total count."""
        base_query = select(User)
        count_query = select(func.count(User.id))

        if organization_id is not None:
            base_query = base_query.where(User.organization_id == organization_id)
            count_query = count_query.where(User.organization_id == organization_id)

        if search:
            search_filter = (
                User.email.ilike(f"%{search}%")
                | User.first_name.ilike(f"%{search}%")
                | User.last_name.ilike(f"%{search}%")
            )
            base_query = base_query.where(search_filter)
            count_query = count_query.where(search_filter)

        if is_active is not None:
            base_query = base_query.where(User.is_active == is_active)
            count_query = count_query.where(User.is_active == is_active)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        offset = (page - 1) * page_size
        stmt = (
            base_query.options(
                selectinload(User.roles).selectinload(Role.permissions),
                selectinload(User.organization),
            )
            .order_by(User.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total
