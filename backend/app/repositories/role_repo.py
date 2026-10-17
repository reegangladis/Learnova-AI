from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.rbac import DEFAULT_ROLE_PERMISSIONS, SystemPermission, SystemRole
from backend.app.models.role import Permission, Role, RolePermission, UserRole
from backend.app.models.user import User


class RoleRepository:
    """Data access repository for Roles and Permissions."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_role_by_name(self, name: str) -> Role | None:
        """Finds a role by uppercase name."""
        stmt = (
            select(Role)
            .where(Role.name == name.upper().strip())
            .options(selectinload(Role.permissions))
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_all_roles(self) -> list[Role]:
        """Returns all system and custom roles."""
        stmt = select(Role).options(selectinload(Role.permissions)).order_by(Role.name)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_all_permissions(self) -> list[Permission]:
        """Returns all registered permissions."""
        stmt = select(Permission).order_by(Permission.code)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def ensure_default_roles_and_permissions(self) -> None:
        """Seeds default system roles and permissions if they do not exist."""
        # 1. Ensure all system permissions exist
        existing_perms_res = await self.db.execute(select(Permission))
        existing_perms_map = {p.code: p for p in existing_perms_res.scalars().all()}

        for perm_enum in SystemPermission:
            code = perm_enum.value
            if code not in existing_perms_map:
                perm = Permission(
                    code=code,
                    name=code.replace("_", " ").title(),
                    description=f"Allows {code.lower().replace('_', ' ')} operations",
                )
                self.db.add(perm)
                await self.db.flush()
                existing_perms_map[code] = perm

        # 2. Ensure all system roles exist
        existing_roles_res = await self.db.execute(
            select(Role).options(selectinload(Role.permissions))
        )
        existing_roles_map = {r.name: r for r in existing_roles_res.scalars().all()}

        for role_enum in SystemRole:
            role_name = role_enum.value
            role = existing_roles_map.get(role_name)
            if not role:
                role = Role(
                    name=role_name,
                    description=f"{role_name.replace('_', ' ').title()} role",
                    is_system=True,
                )
                self.db.add(role)
                await self.db.flush()
                existing_roles_map[role_name] = role

            # 3. Associate mapped permissions to role using direct association queries
            rp_stmt = select(RolePermission.permission_id).where(
                RolePermission.role_id == role.id
            )
            rp_res = await self.db.execute(rp_stmt)
            existing_perm_ids = set(rp_res.scalars().all())

            target_perm_codes = DEFAULT_ROLE_PERMISSIONS.get(role_name, [])
            for code in target_perm_codes:
                if code in existing_perms_map:
                    perm_id = existing_perms_map[code].id
                    if perm_id not in existing_perm_ids:
                        role_perm = RolePermission(
                            role_id=role.id,
                            permission_id=perm_id,
                        )
                        self.db.add(role_perm)
                        existing_perm_ids.add(perm_id)

        await self.db.flush()

    async def assign_role_to_user(self, user: User, role: Role) -> None:
        """Associates a role with a user."""
        stmt = select(UserRole).where(
            UserRole.user_id == user.id, UserRole.role_id == role.id
        )
        result = await self.db.execute(stmt)
        if not result.scalars().first():
            user_role = UserRole(user_id=user.id, role_id=role.id)
            self.db.add(user_role)
            await self.db.flush()

    async def set_user_roles(self, user: User, role_names: list[str]) -> list[Role]:
        """Replaces a user's roles with the specified list of role names."""
        # Remove current role associations
        await self.db.execute(delete(UserRole).where(UserRole.user_id == user.id))
        await self.db.flush()

        assigned_roles: list[Role] = []
        for name in role_names:
            role = await self.get_role_by_name(name)
            if role:
                user_role = UserRole(user_id=user.id, role_id=role.id)
                self.db.add(user_role)
                assigned_roles.append(role)

        await self.db.flush()
        return assigned_roles
