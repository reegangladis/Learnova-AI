import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from backend.app.api.deps import (
    get_current_user,
    get_learning_service,
    get_quiz_service,
)
from backend.app.models.user import User
from backend.app.schemas.learning import (
    CourseProgressResponse,
    LearningCourseResponse,
    LessonProgressResponse,
    LessonProgressUpdate,
    ResumeLearningResponse,
)
from backend.app.schemas.quiz import StudentCourseQuizItemResponse
from backend.app.services.learning_service import LearningService
from backend.app.services.quiz_service import QuizService

router = APIRouter(prefix="/learning", tags=["Student Learning & Progress"])


@router.get(
    "/courses/{course_id}",
    response_model=LearningCourseResponse,
    summary="Retrieve the learning view of an enrolled course",
)
async def get_course_learning_view(
    course_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    learning_service: Annotated[LearningService, Depends(get_learning_service)],
) -> LearningCourseResponse:
    """Returns the ordered course modules and lessons annotated with the student's completion status."""
    return await learning_service.get_course_learning_view(
        current_user=current_user,
        course_id=course_id,
    )


@router.get(
    "/courses/{course_id}/progress",
    response_model=CourseProgressResponse,
    summary="Retrieve course progress analytics for the authenticated student",
)
async def get_course_progress(
    course_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    learning_service: Annotated[LearningService, Depends(get_learning_service)],
) -> CourseProgressResponse:
    """Calculates completed lessons, total lessons, and completion percentage for the course."""
    return await learning_service.get_course_progress(
        current_user=current_user,
        course_id=course_id,
    )


@router.get(
    "/courses/{course_id}/resume",
    response_model=ResumeLearningResponse,
    summary="Identify the next incomplete lesson to resume learning",
)
async def resume_course(
    course_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    learning_service: Annotated[LearningService, Depends(get_learning_service)],
) -> ResumeLearningResponse:
    """Identifies the next incomplete lesson in curriculum sequence or the last completed lesson."""
    return await learning_service.resume_course(
        current_user=current_user,
        course_id=course_id,
    )


@router.put(
    "/lessons/{lesson_id}/progress",
    response_model=LessonProgressResponse,
    summary="Update lesson completion state idempotently",
)
async def update_lesson_progress(
    lesson_id: uuid.UUID,
    data: LessonProgressUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    learning_service: Annotated[LearningService, Depends(get_learning_service)],
) -> LessonProgressResponse:
    """Marks a lesson as complete or incomplete idempotently and recalculates course progress."""
    return await learning_service.update_lesson_progress(
        current_user=current_user,
        lesson_id=lesson_id,
        is_completed=data.is_completed,
    )


@router.get(
    "/lessons/{lesson_id}/progress",
    response_model=LessonProgressResponse,
    summary="Retrieve the authenticated student's lesson progress",
)
async def get_lesson_progress(
    lesson_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    learning_service: Annotated[LearningService, Depends(get_learning_service)],
) -> LessonProgressResponse:
    """Returns the completion state for a specific lesson for the authenticated student."""
    return await learning_service.get_lesson_progress(
        current_user=current_user,
        lesson_id=lesson_id,
    )


@router.get(
    "/courses/{course_id}/quizzes",
    response_model=list[StudentCourseQuizItemResponse],
    summary="List published quizzes and attempt summaries for an enrolled course",
)
async def get_course_quizzes(
    course_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
) -> list[StudentCourseQuizItemResponse]:
    """Returns published quizzes associated with the course, along with student attempt statistics."""
    return await quiz_service.list_course_quizzes_for_student(
        course_id=course_id,
        current_user=current_user,
    )

