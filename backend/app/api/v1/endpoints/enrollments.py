import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.app.api.deps import get_current_user, get_learning_service
from backend.app.models.user import User
from backend.app.schemas.enrollment import (
    EnrollmentCreate,
    EnrollmentListResponse,
    EnrollmentResponse,
)
from backend.app.services.learning_service import LearningService

router = APIRouter(prefix="/enrollments", tags=["Enrollments & Learning Lifecycle"])


@router.post(
    "",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enroll the authenticated student in a published course",
)
async def enroll_course(
    data: EnrollmentCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    learning_service: Annotated[LearningService, Depends(get_learning_service)],
) -> EnrollmentResponse:
    """Enrolls the student in the specified published course."""
    return await learning_service.enroll_student(
        current_user=current_user,
        course_id=data.course_id,
    )


@router.get(
    "/me",
    response_model=EnrollmentListResponse,
    summary="List all courses the authenticated student is currently enrolled in",
)
async def list_my_enrollments(
    current_user: Annotated[User, Depends(get_current_user)],
    learning_service: Annotated[LearningService, Depends(get_learning_service)],
) -> EnrollmentListResponse:
    """Returns all active course enrollments with computed progress for the authenticated student."""
    return await learning_service.list_my_enrollments(current_user=current_user)


@router.get(
    "/{enrollment_id}",
    response_model=EnrollmentResponse,
    summary="Get enrollment details with strict student ownership enforcement",
)
async def get_enrollment(
    enrollment_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    learning_service: Annotated[LearningService, Depends(get_learning_service)],
) -> EnrollmentResponse:
    """Retrieves enrollment details and progress. Only the enrolled student or platform admins may access."""
    return await learning_service.get_enrollment_by_id(
        current_user=current_user,
        enrollment_id=enrollment_id,
    )


@router.delete(
    "/{enrollment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unenroll from a course",
)
async def unenroll(
    enrollment_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    learning_service: Annotated[LearningService, Depends(get_learning_service)],
) -> None:
    """Transitions enrollment status to dropped or removes the active enrollment."""
    await learning_service.unenroll_student(
        current_user=current_user,
        enrollment_id=enrollment_id,
    )
