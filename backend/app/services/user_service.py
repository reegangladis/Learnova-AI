import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.errors import AppExceptions
from backend.app.models.user import User
from backend.app.repositories.audit_repo import AuditRepository
from backend.app.repositories.role_repo import RoleRepository
from backend.app.repositories.user_repo import UserRepository
from backend.app.schemas.user import AdminUserUpdateRequest, UserProfileUpdateRequest


class UserService:
    """Domain service managing user profile modifications and administrative operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)
        self.audit_repo = AuditRepository(db)

    async def update_profile(
        self,
        user: User,
        data: UserProfileUpdateRequest,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> User:
        """Updates safe profile fields for the authenticated user."""
        if data.first_name is not None:
            user.first_name = data.first_name.strip()
        if data.last_name is not None:
            user.last_name = data.last_name.strip()
        if data.avatar_url is not None:
            user.avatar_url = data.avatar_url.strip() if data.avatar_url else None

        await self.db.flush()
        await self.audit_repo.record_audit_event(
            event_type="PROFILE_UPDATED",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return user

    async def list_users(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[User], int]:
        """Administrative query to list and filter users with pagination."""
        return await self.user_repo.list_users(
            page=page,
            page_size=page_size,
            search=search,
            is_active=is_active,
        )

    async def get_user_by_id(self, user_id: uuid.UUID) -> User:
        """Finds a user by ID or raises 404."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise AppExceptions.NotFoundException(message="User not found.")
        return user

    async def admin_update_user(
        self,
        user_id: uuid.UUID,
        data: AdminUserUpdateRequest,
        admin_user_id: uuid.UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> User:
        """Administrative update of user fields."""
        user = await self.get_user_by_id(user_id)
        if data.first_name is not None:
            user.first_name = data.first_name.strip()
        if data.last_name is not None:
            user.last_name = data.last_name.strip()
        if data.is_active is not None:
            user.is_active = data.is_active
        if data.is_verified is not None:
            user.is_verified = data.is_verified

        await self.db.flush()
        await self.audit_repo.record_audit_event(
            event_type="ADMIN_USER_UPDATED",
            user_id=admin_user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"target_user_id": str(user_id)},
        )
        return user

    async def set_user_active_status(
        self,
        user_id: uuid.UUID,
        is_active: bool,
        admin_user_id: uuid.UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> User:
        """Activates or deactivates a user account."""
        user = await self.get_user_by_id(user_id)
        user.is_active = is_active
        await self.db.flush()
        await self.audit_repo.record_audit_event(
            event_type="USER_ACTIVATED" if is_active else "USER_DEACTIVATED",
            user_id=admin_user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"target_user_id": str(user_id), "status": is_active},
        )
        return user

    async def set_user_roles(
        self,
        user_id: uuid.UUID,
        role_names: list[str],
        admin_user_id: uuid.UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> User:
        """Replaces a user's assigned roles."""
        user = await self.get_user_by_id(user_id)
        await self.role_repo.set_user_roles(user, role_names)
        await self.audit_repo.record_audit_event(
            event_type="ROLE_CHANGED",
            user_id=admin_user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"target_user_id": str(user_id), "assigned_roles": role_names},
        )
        return await self.get_user_by_id(user_id)
