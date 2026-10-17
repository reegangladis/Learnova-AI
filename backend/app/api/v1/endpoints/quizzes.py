import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from backend.app.api.deps import (
    get_current_user,
    get_quiz_service,
    require_role,
)
from backend.app.models.user import User
from backend.app.schemas.quiz import (
    QuizAnswerSaveRequest,
    QuizAnswerSaveResponse,
    QuizAttemptStartResponse,
    QuizCreate,
    QuizDetailResponse,
    QuizQuestionCreate,
    QuizQuestionResponse,
    QuizQuestionUpdate,
    QuizReorderQuestionsRequest,
    QuizResponse,
    QuizResultResponse,
    QuizUpdate,
    StudentQuizAttemptSummary,
    StudentQuizTakeResponse,
)
from backend.app.services.quiz_service import QuizService

router = APIRouter(prefix="/quizzes", tags=["quizzes"])
attempts_router = APIRouter(prefix="/quiz-attempts", tags=["quiz-attempts"])


# ============================================================================
# Instructor Quiz Management Endpoints
# ============================================================================


@router.post(
    "",
    response_model=QuizResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new draft quiz",
)
async def create_quiz(
    data: QuizCreate,
    current_user: Annotated[
        User, Depends(require_role("INSTRUCTOR", "ADMIN", "SUPER_ADMIN"))
    ],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
) -> QuizResponse:
    return await quiz_service.create_quiz(data, current_user)


@router.get(
    "/instructor/me",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="List quizzes authored by the current instructor",
)
async def list_instructor_quizzes(
    current_user: Annotated[
        User, Depends(require_role("INSTRUCTOR", "ADMIN", "SUPER_ADMIN"))
    ],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
    course_id: Annotated[uuid.UUID | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> dict:
    items, total = await quiz_service.list_instructor_quizzes(
        current_user=current_user,
        course_id=course_id,
        status=status_filter,
        page=page,
        page_size=page_size,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get(
    "/{quiz_id}",
    response_model=QuizDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get full quiz details (instructor / admin view with answer keys)",
)
async def get_quiz(
    quiz_id: uuid.UUID,
    current_user: Annotated[
        User, Depends(require_role("INSTRUCTOR", "ADMIN", "SUPER_ADMIN"))
    ],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
) -> QuizDetailResponse:
    return await quiz_service.get_quiz(quiz_id, current_user)


@router.patch(
    "/{quiz_id}",
    response_model=QuizDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Update quiz metadata",
)
async def update_quiz(
    quiz_id: uuid.UUID,
    data: QuizUpdate,
    current_user: Annotated[
        User, Depends(require_role("INSTRUCTOR", "ADMIN", "SUPER_ADMIN"))
    ],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
) -> QuizDetailResponse:
    return await quiz_service.update_quiz(quiz_id, data, current_user)


@router.delete(
    "/{quiz_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete quiz and curriculum associations",
)
async def delete_quiz(
    quiz_id: uuid.UUID,
    current_user: Annotated[
        User, Depends(require_role("INSTRUCTOR", "ADMIN", "SUPER_ADMIN"))
    ],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
) -> None:
    await quiz_service.delete_quiz(quiz_id, current_user)


@router.post(
    "/{quiz_id}/publish",
    response_model=QuizDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate completeness rules and transition quiz to published",
)
async def publish_quiz(
    quiz_id: uuid.UUID,
    current_user: Annotated[
        User, Depends(require_role("INSTRUCTOR", "ADMIN", "SUPER_ADMIN"))
    ],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
) -> QuizDetailResponse:
    return await quiz_service.publish_quiz(quiz_id, current_user)


@router.post(
    "/{quiz_id}/archive",
    response_model=QuizDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Archive quiz to prevent further student attempts",
)
async def archive_quiz(
    quiz_id: uuid.UUID,
    current_user: Annotated[
        User, Depends(require_role("INSTRUCTOR", "ADMIN", "SUPER_ADMIN"))
    ],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
) -> QuizDetailResponse:
    return await quiz_service.archive_quiz(quiz_id, current_user)


# ============================================================================
# Question Management Sub-routes
# ============================================================================


@router.post(
    "/{quiz_id}/questions",
    response_model=QuizQuestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a question to a quiz",
)
async def add_question(
    quiz_id: uuid.UUID,
    data: QuizQuestionCreate,
    current_user: Annotated[
        User, Depends(require_role("INSTRUCTOR", "ADMIN", "SUPER_ADMIN"))
    ],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
) -> QuizQuestionResponse:
    return await quiz_service.add_question(quiz_id, data, current_user)


@router.patch(
    "/{quiz_id}/questions/{question_id}",
    response_model=QuizQuestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a question and its answer options",
)
async def update_question(
    quiz_id: uuid.UUID,
    question_id: uuid.UUID,
    data: QuizQuestionUpdate,
    current_user: Annotated[
        User, Depends(require_role("INSTRUCTOR", "ADMIN", "SUPER_ADMIN"))
    ],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
) -> QuizQuestionResponse:
    return await quiz_service.update_question(quiz_id, question_id, data, current_user)


@router.delete(
    "/{quiz_id}/questions/{question_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a question from a quiz",
)
async def delete_question(
    quiz_id: uuid.UUID,
    question_id: uuid.UUID,
    current_user: Annotated[
        User, Depends(require_role("INSTRUCTOR", "ADMIN", "SUPER_ADMIN"))
    ],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
) -> None:
    await quiz_service.delete_question(quiz_id, question_id, current_user)


@router.post(
    "/{quiz_id}/questions/reorder",
    status_code=status.HTTP_200_OK,
    summary="Reorder questions in a quiz",
)
async def reorder_questions(
    quiz_id: uuid.UUID,
    data: QuizReorderQuestionsRequest,
    current_user: Annotated[
        User, Depends(require_role("INSTRUCTOR", "ADMIN", "SUPER_ADMIN"))
    ],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
) -> dict:
    await quiz_service.reorder_questions(quiz_id, data.question_ids, current_user)
    return {"message": "Questions reordered successfully."}


# ============================================================================
# Student Assessment Endpoints
# ============================================================================


@router.get(
    "/{quiz_id}/take",
    response_model=StudentQuizTakeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get quiz layout and questions for student taking (answer keys omitted)",
)
async def get_quiz_for_taking(
    quiz_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
) -> StudentQuizTakeResponse:
    return await quiz_service.get_quiz_for_taking(quiz_id, current_user)


@router.post(
    "/{quiz_id}/attempts",
    response_model=QuizAttemptStartResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start or resume an attempt on a published quiz",
)
async def start_quiz_attempt(
    quiz_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
) -> QuizAttemptStartResponse:
    attempt = await quiz_service.start_quiz_attempt(quiz_id, current_user)
    time_remaining = None
    if attempt.quiz.duration_minutes > 0:
        time_remaining = quiz_service._calculate_time_remaining(
            attempt, attempt.quiz.duration_minutes
        )
    return QuizAttemptStartResponse(
        id=attempt.id,
        quiz_id=attempt.quiz_id,
        attempt_number=attempt.attempt_number,
        status=attempt.status,
        started_at=attempt.started_at,
        duration_minutes=attempt.quiz.duration_minutes,
        time_remaining_seconds=time_remaining,
    )


@router.get(
    "/{quiz_id}/attempts/me",
    response_model=list[StudentQuizAttemptSummary],
    status_code=status.HTTP_200_OK,
    summary="List student's past attempt history for a quiz",
)
async def list_my_quiz_attempts(
    quiz_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
) -> list[StudentQuizAttemptSummary]:
    return await quiz_service.list_student_attempts(quiz_id, current_user)


# ============================================================================
# Quiz Attempts Lifecycle Endpoints (`/quiz-attempts`)
# ============================================================================


@attempts_router.put(
    "/{attempt_id}/answers/{question_id}",
    response_model=QuizAnswerSaveResponse,
    status_code=status.HTTP_200_OK,
    summary="Save student's response for a question in an in-progress attempt",
)
async def save_student_answer(
    attempt_id: uuid.UUID,
    question_id: uuid.UUID,
    data: QuizAnswerSaveRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
) -> QuizAnswerSaveResponse:
    from datetime import datetime, timezone

    await quiz_service.save_answer(
        attempt_id=attempt_id,
        question_id=question_id,
        selected_option_ids=data.selected_option_ids,
        text_response=data.text_response,
        current_user=current_user,
    )
    return QuizAnswerSaveResponse(
        question_id=question_id,
        selected_option_ids=data.selected_option_ids,
        saved=True,
        saved_at=datetime.now(timezone.utc),
    )


@attempts_router.post(
    "/{attempt_id}/submit",
    response_model=QuizResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit and grade a quiz attempt",
)
async def submit_quiz_attempt(
    attempt_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
) -> QuizResultResponse:
    return await quiz_service.submit_quiz_attempt(attempt_id, current_user)


@attempts_router.get(
    "/{attempt_id}/result",
    response_model=QuizResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Get final graded result and permitted feedback for a completed attempt",
)
async def get_quiz_attempt_result(
    attempt_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    quiz_service: Annotated[QuizService, Depends(get_quiz_service)],
) -> QuizResultResponse:
    return await quiz_service.get_quiz_result(attempt_id, current_user)
