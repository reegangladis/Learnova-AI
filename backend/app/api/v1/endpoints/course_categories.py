import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from backend.app.api.deps import (
    get_course_service,
    get_current_user,
    get_current_user_optional,
)
from backend.app.core.rbac import SystemRole
from backend.app.models.user import User
from backend.app.schemas.course import (
    CourseCategoryCreate,
    CourseCategoryResponse,
    CourseCategoryUpdate,
)
from backend.app.services.course_service import CourseService

router = APIRouter(prefix="/course-categories", tags=["Course Categories"])


@router.get(
    "",
    response_model=list[CourseCategoryResponse],
    summary="List all course categories",
)
async def list_categories(
    course_service: Annotated[CourseService, Depends(get_course_service)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
    active_only: Annotated[bool, Query()] = True,
) -> list[CourseCategoryResponse]:
    # If admin requests inactive categories, allow it
    is_admin = False
    if current_user:
        roles = {r.upper() for r in current_user.role_names}
        is_admin = (
            SystemRole.ADMIN.value in roles
            or SystemRole.SUPER_ADMIN.value in roles
        )

    fetch_active_only = True if not is_admin else active_only
    categories = await course_service.list_categories(active_only=fetch_active_only)
    return [CourseCategoryResponse.model_validate(c) for c in categories]


@router.post(
    "",
    response_model=CourseCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new course category (Admin only)",
)
async def create_category(
    payload: CourseCategoryCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> CourseCategoryResponse:
    category = await course_service.create_category(payload, current_user)
    return CourseCategoryResponse.model_validate(category)


@router.patch(
    "/{category_id}",
    response_model=CourseCategoryResponse,
    summary="Update a course category (Admin only)",
)
async def update_category(
    category_id: uuid.UUID,
    payload: CourseCategoryUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> CourseCategoryResponse:
    category = await course_service.update_category(
        category_id, payload, current_user
    )
    return CourseCategoryResponse.model_validate(category)


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a course category (Admin only)",
)
async def delete_category(
    category_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    course_service: Annotated[CourseService, Depends(get_course_service)],
) -> None:
    await course_service.delete_category(category_id, current_user)
