import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class PermissionResponse(BaseModel):
    """Permission detail schema."""

    id: uuid.UUID
    code: str
    name: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class RoleResponse(BaseModel):
    """Role detail schema."""

    id: uuid.UUID
    name: str
    description: str | None = None
    is_system: bool = True

    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    """Safe user representation returned across APIs (never contains password)."""

    id: uuid.UUID
    email: EmailStr
    first_name: str
    last_name: str
    full_name: str
    avatar_url: str | None = None
    is_active: bool
    is_verified: bool
    roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    organization_id: uuid.UUID | None = None
    created_at: datetime
    last_login_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("roles", mode="before")
    @classmethod
    def extract_roles(cls, v: Any) -> list[str]:
        if isinstance(v, list):
            return [r.name if hasattr(r, "name") else str(r) for r in v]
        return []

    @field_validator("permissions", mode="before")
    @classmethod
    def extract_permissions(cls, v: Any) -> list[str]:
        if isinstance(v, list):
            return [p.code if hasattr(p, "code") else str(p) for p in v]
        return []


class UserProfileUpdateRequest(BaseModel):
    """Payload for a user updating their personal profile."""

    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    avatar_url: str | None = Field(None, max_length=500)


class AdminUserUpdateRequest(BaseModel):
    """Administrative user update payload."""

    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    is_active: bool | None = None
    is_verified: bool | None = None


class AdminAssignRolesRequest(BaseModel):
    """Payload for administrator assigning roles to a user."""

    role_names: list[str] = Field(
        ..., min_length=1, description="List of role names to assign"
    )


class PaginatedUsersResponse(BaseModel):
    """Paginated user listing response."""

    items: list[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
