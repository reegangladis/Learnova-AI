import math
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

from backend.app.api.deps import (
    get_current_user,
    get_user_service,
    require_permission,
    require_role,
)
from backend.app.core.rbac import SystemPermission, SystemRole
from backend.app.models.user import User
from backend.app.schemas.user import (
    AdminAssignRolesRequest,
    AdminUserUpdateRequest,
    PaginatedUsersResponse,
    UserProfileUpdateRequest,
    UserResponse,
)
from backend.app.services.rate_limiter import RateLimiter
from backend.app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["User Profile & Management"])


# ==============================================================================
# 1. Authenticated User Profile Endpoints
# ==============================================================================


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get authenticated user profile",
)
async def get_my_profile(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update authenticated user profile information",
)
async def update_my_profile(
    payload: UserProfileUpdateRequest,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserResponse:
    ip = RateLimiter.get_client_ip(request)
    ua = request.headers.get("user-agent")

    updated_user = await user_service.update_profile(
        user=current_user,
        data=payload,
        ip_address=ip,
        user_agent=ua,
    )
    return UserResponse.model_validate(updated_user)


# ==============================================================================
# 2. Administrative User Governance Endpoints (RBAC Enforced)
# ==============================================================================


@router.get(
    "",
    response_model=PaginatedUsersResponse,
    summary="List all users with pagination (Admin only)",
    dependencies=[Depends(require_permission(SystemPermission.USER_READ.value))],
)
async def list_users_admin(
    current_admin: Annotated[User, Depends(get_current_user)],
    user_service: Annotated[UserService, Depends(get_user_service)],
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    search: str | None = Query(
        default=None, description="Search term for name or email"
    ),
    is_active: bool | None = Query(default=None, description="Filter by active status"),
) -> PaginatedUsersResponse:
    admin_roles = {r.upper() for r in current_admin.role_names}
    org_filter = None
    if "SUPER_ADMIN" not in admin_roles and current_admin.organization_id is not None:
        org_filter = current_admin.organization_id

    users, total = await user_service.list_users(
        page=page,
        page_size=page_size,
        search=search,
        is_active=is_active,
        organization_id=org_filter,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return PaginatedUsersResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get user details by ID (Admin only)",
    dependencies=[Depends(require_permission(SystemPermission.USER_READ.value))],
)
async def get_user_admin(
    user_id: uuid.UUID,
    current_admin: Annotated[User, Depends(get_current_user)],
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserResponse:
    user = await user_service.get_user_by_id(user_id)
    user_service.assert_admin_access_to_user(user, current_admin)
    return UserResponse.model_validate(user)


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update user details (Admin only)",
    dependencies=[Depends(require_permission(SystemPermission.USER_UPDATE.value))],
)
async def update_user_admin(
    user_id: uuid.UUID,
    payload: AdminUserUpdateRequest,
    request: Request,
    current_admin: Annotated[
        User,
        Depends(require_role(SystemRole.ADMIN.value, SystemRole.SUPER_ADMIN.value)),
    ],
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserResponse:
    target_user = await user_service.get_user_by_id(user_id)
    user_service.assert_admin_access_to_user(target_user, current_admin)

    ip = RateLimiter.get_client_ip(request)
    ua = request.headers.get("user-agent")

    user = await user_service.admin_update_user(
        user_id=user_id,
        data=payload,
        admin_user_id=current_admin.id,
        ip_address=ip,
        user_agent=ua,
    )
    return UserResponse.model_validate(user)


@router.post(
    "/{user_id}/activate",
    response_model=UserResponse,
    summary="Activate user account (Admin only)",
    dependencies=[Depends(require_permission(SystemPermission.USER_UPDATE.value))],
)
async def activate_user_admin(
    user_id: uuid.UUID,
    request: Request,
    current_admin: Annotated[
        User,
        Depends(require_role(SystemRole.ADMIN.value, SystemRole.SUPER_ADMIN.value)),
    ],
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserResponse:
    target_user = await user_service.get_user_by_id(user_id)
    user_service.assert_admin_access_to_user(target_user, current_admin)

    ip = RateLimiter.get_client_ip(request)
    ua = request.headers.get("user-agent")

    user = await user_service.set_user_active_status(
        user_id=user_id,
        is_active=True,
        admin_user_id=current_admin.id,
        ip_address=ip,
        user_agent=ua,
    )
    return UserResponse.model_validate(user)


@router.post(
    "/{user_id}/deactivate",
    response_model=UserResponse,
    summary="Deactivate user account (Admin only)",
    dependencies=[Depends(require_permission(SystemPermission.USER_UPDATE.value))],
)
async def deactivate_user_admin(
    user_id: uuid.UUID,
    request: Request,
    current_admin: Annotated[
        User,
        Depends(require_role(SystemRole.ADMIN.value, SystemRole.SUPER_ADMIN.value)),
    ],
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserResponse:
    target_user = await user_service.get_user_by_id(user_id)
    user_service.assert_admin_access_to_user(target_user, current_admin)

    ip = RateLimiter.get_client_ip(request)
    ua = request.headers.get("user-agent")

    user = await user_service.set_user_active_status(
        user_id=user_id,
        is_active=False,
        admin_user_id=current_admin.id,
        ip_address=ip,
        user_agent=ua,
    )
    return UserResponse.model_validate(user)


@router.post(
    "/{user_id}/roles",
    response_model=UserResponse,
    summary="Assign roles to user (Admin only)",
    dependencies=[
        Depends(require_role(SystemRole.ADMIN.value, SystemRole.SUPER_ADMIN.value))
    ],
)
async def assign_user_roles_admin(
    user_id: uuid.UUID,
    payload: AdminAssignRolesRequest,
    request: Request,
    current_admin: Annotated[
        User,
        Depends(require_role(SystemRole.ADMIN.value, SystemRole.SUPER_ADMIN.value)),
    ],
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserResponse:
    target_user = await user_service.get_user_by_id(user_id)
    user_service.assert_admin_access_to_user(target_user, current_admin)

    ip = RateLimiter.get_client_ip(request)
    ua = request.headers.get("user-agent")

    user = await user_service.set_user_roles(
        user_id=user_id,
        role_names=payload.role_names,
        admin_user_id=current_admin.id,
        ip_address=ip,
        user_agent=ua,
    )
    return UserResponse.model_validate(user)
