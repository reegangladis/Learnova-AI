import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.errors import AppExceptions
from backend.app.models.course import CourseStatus
from backend.app.models.enrollment import EnrollmentStatus
from backend.app.models.quiz import (
    AttemptStatus,
    QuestionOption,
    QuestionType,
    Quiz,
    QuizAttempt,
    QuizQuestion,
    QuizStatus,
)
from backend.app.models.user import User
from backend.app.repositories.course_repo import CourseRepository
from backend.app.repositories.enrollment_repo import EnrollmentRepository
from backend.app.repositories.quiz_repo import QuizRepository
from backend.app.schemas.quiz import (
    QuestionOptionCreate,
    QuestionOptionResponse,
    QuestionResultResponse,
    QuizCreate,
    QuizDetailResponse,
    QuizQuestionCreate,
    QuizQuestionResponse,
    QuizQuestionUpdate,
    QuizResponse,
    QuizResultResponse,
    QuizUpdate,
    StudentCourseQuizItemResponse,
    StudentQuestionOptionResponse,
    StudentQuizAttemptSummary,
    StudentQuizQuestionResponse,
    StudentQuizTakeResponse,
)


class QuizService:
    """Service handling business logic, validation, attempt lifecycles, and grading for quizzes."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.quiz_repo = QuizRepository(db)
        self.course_repo = CourseRepository(db)
        self.enrollment_repo = EnrollmentRepository(db)

    # ========================================================================
    # Instructor Quiz Management
    # ========================================================================

    async def create_quiz(self, data: QuizCreate, current_user: User) -> QuizResponse:
        course = await self.course_repo.get_by_id(data.course_id)
        if not course:
            raise AppExceptions.NotFoundException(message="Associated course not found.")

        # Check instructor permissions / ownership and tenant isolation
        user_roles = {r.upper() for r in current_user.role_names}
        if "SUPER_ADMIN" not in user_roles:
            if "ADMIN" in user_roles:
                if course.organization_id is not None:
                    if course.organization_id != current_user.organization_id:
                        raise AppExceptions.ForbiddenException(
                            message="Cannot create quizzes for courses belonging to a different organization."
                        )
                elif current_user.organization_id is not None:
                    raise AppExceptions.ForbiddenException(
                        message="Cannot create quizzes for courses belonging to a different organization."
                    )
            elif course.instructor_id != current_user.id:
                raise AppExceptions.ForbiddenException(
                    message="You do not have permission to create quizzes for this course."
                )

        quiz = Quiz(
            organization_id=course.organization_id,
            course_id=data.course_id,
            lesson_id=data.lesson_id,
            instructor_id=current_user.id,
            title=data.title,
            description=data.description,
            instructions=data.instructions,
            duration_minutes=data.duration_minutes,
            passing_score_percentage=data.passing_score_percentage,
            max_attempts=data.max_attempts,
            shuffle_questions=data.shuffle_questions,
            shuffle_options=data.shuffle_options,
            status=QuizStatus.DRAFT.value,
        )
        created = await self.quiz_repo.create_quiz(quiz)
        await self.db.commit()
        return QuizResponse.model_validate(created)

    async def get_quiz(self, quiz_id: uuid.UUID, current_user: User) -> QuizDetailResponse:
        quiz = await self.quiz_repo.get_quiz_by_id(quiz_id, include_questions=True)
        if not quiz:
            raise AppExceptions.NotFoundException(message="Quiz not found.")

        self._check_instructor_access(quiz, current_user)
        return self._build_quiz_detail_response(quiz)

    async def list_instructor_quizzes(
        self,
        current_user: User,
        course_id: uuid.UUID | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[QuizDetailResponse], int]:
        quizzes, total = await self.quiz_repo.list_instructor_quizzes(
            instructor_id=current_user.id,
            course_id=course_id,
            status=status,
            page=page,
            page_size=page_size,
        )
        responses = [self._build_quiz_detail_response(q) for q in quizzes]
        return responses, total

    async def update_quiz(
        self, quiz_id: uuid.UUID, data: QuizUpdate, current_user: User
    ) -> QuizDetailResponse:
        quiz = await self.quiz_repo.get_quiz_by_id(quiz_id, include_questions=True)
        if not quiz:
            raise AppExceptions.NotFoundException(message="Quiz not found.")

        self._check_instructor_access(quiz, current_user)

        update_dict = data.model_dump(exclude_unset=True)
        for key, val in update_dict.items():
            setattr(quiz, key, val)

        updated = await self.quiz_repo.update_quiz(quiz)
        await self.db.commit()
        return self._build_quiz_detail_response(updated)

    async def delete_quiz(self, quiz_id: uuid.UUID, current_user: User) -> None:
        quiz = await self.quiz_repo.get_quiz_by_id(quiz_id, include_questions=False)
        if not quiz:
            raise AppExceptions.NotFoundException(message="Quiz not found.")

        self._check_instructor_access(quiz, current_user)
        await self.quiz_repo.delete_quiz(quiz)
        await self.db.commit()

    async def publish_quiz(
        self, quiz_id: uuid.UUID, current_user: User
    ) -> QuizDetailResponse:
        quiz = await self.quiz_repo.get_quiz_by_id(quiz_id, include_questions=True)
        if not quiz:
            raise AppExceptions.NotFoundException(message="Quiz not found.")

        self._check_instructor_access(quiz, current_user)

        # Validation completeness rules
        if not quiz.questions:
            raise AppExceptions.BadRequestException(
                message="Cannot publish quiz: A quiz must have at least one question."
            )

        total_points = sum(q.points for q in quiz.questions)
        if total_points <= 0:
            raise AppExceptions.BadRequestException(
                message="Cannot publish quiz: Total quiz points must be greater than zero."
            )

        for q in quiz.questions:
            if len(q.options) < 2:
                raise AppExceptions.BadRequestException(
                    message=f"Cannot publish quiz: Question '{q.question_text[:40]}' must have at least 2 options."
                )

            correct_count = sum(1 for opt in q.options if opt.is_correct)
            if q.question_type in (QuestionType.SINGLE_CHOICE.value, QuestionType.TRUE_FALSE.value):
                if correct_count != 1:
                    raise AppExceptions.BadRequestException(
                        message=f"Cannot publish quiz: Question '{q.question_text[:40]}' must have exactly 1 correct answer (found {correct_count})."
                    )
            elif (
                q.question_type == QuestionType.MULTIPLE_SELECT.value
                and correct_count < 1
            ):
                raise AppExceptions.BadRequestException(
                    message=f"Cannot publish quiz: Question '{q.question_text[:40]}' must have at least 1 correct answer."
                )

        quiz.status = QuizStatus.PUBLISHED.value
        quiz.published_at = datetime.now(timezone.utc)
        updated = await self.quiz_repo.update_quiz(quiz)
        await self.db.commit()
        return self._build_quiz_detail_response(updated)

    async def archive_quiz(
        self, quiz_id: uuid.UUID, current_user: User
    ) -> QuizDetailResponse:
        quiz = await self.quiz_repo.get_quiz_by_id(quiz_id, include_questions=True)
        if not quiz:
            raise AppExceptions.NotFoundException(message="Quiz not found.")

        self._check_instructor_access(quiz, current_user)
        quiz.status = QuizStatus.ARCHIVED.value
        quiz.archived_at = datetime.now(timezone.utc)
        updated = await self.quiz_repo.update_quiz(quiz)
        await self.db.commit()
        return self._build_quiz_detail_response(updated)

    # ========================================================================
    # Question Management
    # ========================================================================

    async def add_question(
        self, quiz_id: uuid.UUID, data: QuizQuestionCreate, current_user: User
    ) -> QuizQuestionResponse:
        quiz = await self.quiz_repo.get_quiz_by_id(quiz_id, include_questions=True)
        if not quiz:
            raise AppExceptions.NotFoundException(message="Quiz not found.")

        self._check_instructor_access(quiz, current_user)

        self._validate_question_options(data.question_type.value, data.options)

        next_order = len(quiz.questions)
        question = QuizQuestion(
            quiz_id=quiz_id,
            question_text=data.question_text,
            question_type=data.question_type.value,
            order_index=data.order_index if data.order_index != 0 else next_order,
            points=data.points,
            explanation=data.explanation,
            is_required=data.is_required,
        )

        options = [
            QuestionOption(
                option_text=opt.option_text,
                order_index=opt.order_index if opt.order_index != 0 else idx,
                is_correct=opt.is_correct,
                explanation=opt.explanation,
            )
            for idx, opt in enumerate(data.options)
        ]

        created = await self.quiz_repo.create_question(question, options)
        await self.db.commit()
        return QuizQuestionResponse.model_validate(created)

    async def update_question(
        self,
        quiz_id: uuid.UUID,
        question_id: uuid.UUID,
        data: QuizQuestionUpdate,
        current_user: User,
    ) -> QuizQuestionResponse:
        quiz = await self.quiz_repo.get_quiz_by_id(quiz_id, include_questions=False)
        if not quiz:
            raise AppExceptions.NotFoundException(message="Quiz not found.")

        self._check_instructor_access(quiz, current_user)

        question = await self.quiz_repo.get_question_by_id(question_id)
        if not question or question.quiz_id != quiz_id:
            raise AppExceptions.NotFoundException(message="Question not found for this quiz.")

        if data.question_text is not None:
            question.question_text = data.question_text
        if data.question_type is not None:
            question.question_type = data.question_type.value
        if data.order_index is not None:
            question.order_index = data.order_index
        if data.points is not None:
            question.points = data.points
        if data.explanation is not None:
            question.explanation = data.explanation
        if data.is_required is not None:
            question.is_required = data.is_required

        options_data = None
        if data.options is not None:
            self._validate_question_options(question.question_type, data.options)
            options_data = [opt.model_dump() for opt in data.options]

        updated = await self.quiz_repo.update_question(question, options_data)
        await self.db.commit()
        return QuizQuestionResponse.model_validate(updated)

    async def delete_question(
        self, quiz_id: uuid.UUID, question_id: uuid.UUID, current_user: User
    ) -> None:
        quiz = await self.quiz_repo.get_quiz_by_id(quiz_id, include_questions=False)
        if not quiz:
            raise AppExceptions.NotFoundException(message="Quiz not found.")

        self._check_instructor_access(quiz, current_user)

        question = await self.quiz_repo.get_question_by_id(question_id)
        if not question or question.quiz_id != quiz_id:
            raise AppExceptions.NotFoundException(message="Question not found for this quiz.")

        await self.quiz_repo.delete_question(question)
        await self.db.commit()

    async def reorder_questions(
        self, quiz_id: uuid.UUID, question_ids: list[uuid.UUID], current_user: User
    ) -> None:
        quiz = await self.quiz_repo.get_quiz_by_id(quiz_id, include_questions=False)
        if not quiz:
            raise AppExceptions.NotFoundException(message="Quiz not found.")

        self._check_instructor_access(quiz, current_user)
        await self.quiz_repo.reorder_questions(quiz_id, question_ids)
        await self.db.commit()

    # ========================================================================
    # Student Assessment Lifecycle & Taking
    # ========================================================================

    async def list_course_quizzes_for_student(
        self, course_id: uuid.UUID, current_user: User
    ) -> list[StudentCourseQuizItemResponse]:
        course = await self.course_repo.get_by_id(course_id)
        if not course or course.status != CourseStatus.PUBLISHED.value:
            raise AppExceptions.NotFoundException(message="Published course not found.")

        # Verify student enrollment (or instructor/admin)
        await self._ensure_student_access_to_course(course_id, current_user)

        quizzes = await self.quiz_repo.list_course_quizzes(course_id, published_only=True)
        items: list[StudentCourseQuizItemResponse] = []

        for q in quizzes:
            user_attempts = await self.quiz_repo.get_user_attempts(q.id, current_user.id)
            completed_attempts = [
                a for a in user_attempts if a.status in (AttemptStatus.COMPLETED.value, AttemptStatus.EXPIRED.value)
            ]
            active_attempt = next(
                (a for a in user_attempts if a.status == AttemptStatus.IN_PROGRESS.value), None
            )

            best_percentage = (
                max((a.percentage_score for a in completed_attempts), default=None)
                if completed_attempts
                else None
            )
            is_passed = any(a.passed for a in completed_attempts)
            can_attempt = (
                True if q.max_attempts == 0 else (len(completed_attempts) < q.max_attempts)
            )

            items.append(
                StudentCourseQuizItemResponse(
                    id=q.id,
                    course_id=q.course_id,
                    lesson_id=q.lesson_id,
                    title=q.title,
                    description=q.description,
                    duration_minutes=q.duration_minutes,
                    passing_score_percentage=q.passing_score_percentage,
                    max_attempts=q.max_attempts,
                    question_count=len(q.questions),
                    total_points=sum(item.points for item in q.questions),
                    attempts_count=len(completed_attempts),
                    best_score_percentage=best_percentage,
                    is_passed=is_passed,
                    can_attempt=can_attempt,
                    active_attempt_id=active_attempt.id if active_attempt else None,
                )
            )
        return items

    async def get_quiz_for_taking(
        self, quiz_id: uuid.UUID, current_user: User
    ) -> StudentQuizTakeResponse:
        quiz = await self.quiz_repo.get_quiz_by_id(quiz_id, include_questions=True)
        if not quiz or quiz.status != QuizStatus.PUBLISHED.value:
            raise AppExceptions.NotFoundException(message="Published quiz not found.")

        await self._ensure_student_access_to_course(quiz.course_id, current_user)

        active_attempt = await self.quiz_repo.get_active_attempt(quiz.id, current_user.id)
        time_remaining = None
        if active_attempt and quiz.duration_minutes > 0:
            time_remaining = self._calculate_time_remaining(active_attempt, quiz.duration_minutes)

        student_questions: list[StudentQuizQuestionResponse] = []
        for q in quiz.questions:
            student_options = [
                StudentQuestionOptionResponse(
                    id=opt.id,
                    option_text=opt.option_text,
                    order_index=opt.order_index,
                )
                for opt in q.options
            ]
            student_questions.append(
                StudentQuizQuestionResponse(
                    id=q.id,
                    quiz_id=q.quiz_id,
                    question_text=q.question_text,
                    question_type=q.question_type,
                    order_index=q.order_index,
                    points=q.points,
                    is_required=q.is_required,
                    options=student_options,
                )
            )

        return StudentQuizTakeResponse(
            id=quiz.id,
            course_id=quiz.course_id,
            lesson_id=quiz.lesson_id,
            title=quiz.title,
            description=quiz.description,
            instructions=quiz.instructions,
            duration_minutes=quiz.duration_minutes,
            passing_score_percentage=quiz.passing_score_percentage,
            max_attempts=quiz.max_attempts,
            total_points=sum(q.points for q in quiz.questions),
            question_count=len(quiz.questions),
            active_attempt_id=active_attempt.id if active_attempt else None,
            time_remaining_seconds=time_remaining,
            questions=student_questions,
        )

    async def start_quiz_attempt(
        self, quiz_id: uuid.UUID, current_user: User
    ) -> QuizAttempt:
        quiz = await self.quiz_repo.get_quiz_by_id(quiz_id, include_questions=True)
        if not quiz or quiz.status != QuizStatus.PUBLISHED.value:
            raise AppExceptions.NotFoundException(message="Published quiz not found.")

        await self._ensure_student_access_to_course(quiz.course_id, current_user)

        # Check existing active attempt
        active_attempt = await self.quiz_repo.get_active_attempt(quiz.id, current_user.id)
        if active_attempt:
            # Check if expired
            if quiz.duration_minutes > 0:
                remaining = self._calculate_time_remaining(active_attempt, quiz.duration_minutes)
                if remaining <= 0:
                    # Finalize expired attempt
                    await self._grade_and_finalize_attempt(active_attempt, quiz, is_expired=True)
                else:
                    return active_attempt
            else:
                return active_attempt

        # Check attempt limits
        user_attempts = await self.quiz_repo.get_user_attempts(quiz.id, current_user.id)
        completed_count = sum(
            1
            for a in user_attempts
            if a.status in (AttemptStatus.COMPLETED.value, AttemptStatus.EXPIRED.value)
        )
        if quiz.max_attempts > 0 and completed_count >= quiz.max_attempts:
            raise AppExceptions.BadRequestException(
                message=f"Maximum attempts ({quiz.max_attempts}) reached for this quiz."
            )

        next_attempt_number = len(user_attempts) + 1
        new_attempt = await self.quiz_repo.create_attempt(
            quiz_id=quiz.id,
            user_id=current_user.id,
            attempt_number=next_attempt_number,
        )
        await self.db.commit()
        return new_attempt

    async def save_answer(
        self,
        attempt_id: uuid.UUID,
        question_id: uuid.UUID,
        selected_option_ids: list[uuid.UUID],
        text_response: str | None,
        current_user: User,
    ) -> None:
        attempt = await self.quiz_repo.get_attempt_by_id(attempt_id, include_details=True)
        if not attempt or attempt.user_id != current_user.id:
            raise AppExceptions.NotFoundException(message="Quiz attempt not found.")

        if attempt.status != AttemptStatus.IN_PROGRESS.value:
            raise AppExceptions.BadRequestException(
                message="Cannot save answers on an already finalized or expired attempt."
            )

        quiz = attempt.quiz
        if quiz.duration_minutes > 0:
            remaining = self._calculate_time_remaining(attempt, quiz.duration_minutes)
            if remaining <= 0:
                await self._grade_and_finalize_attempt(attempt, quiz, is_expired=True)
                raise AppExceptions.BadRequestException(
                    message="Time limit has expired. Your attempt has been automatically submitted."
                )

        # Validate question belongs to quiz
        question = next((q for q in quiz.questions if q.id == question_id), None)
        if not question:
            raise AppExceptions.BadRequestException(
                message="Question does not belong to this quiz."
            )

        # Validate options belong to question
        valid_opt_ids = {opt.id for opt in question.options}
        for opt_id in selected_option_ids:
            if opt_id not in valid_opt_ids:
                raise AppExceptions.BadRequestException(
                    message=f"Option {opt_id} does not belong to question {question_id}."
                )

        await self.quiz_repo.save_answer(
            attempt_id=attempt.id,
            question_id=question_id,
            selected_option_ids=[str(oid) for oid in selected_option_ids],
            text_response=text_response,
        )
        await self.db.commit()

    async def submit_quiz_attempt(
        self, attempt_id: uuid.UUID, current_user: User
    ) -> QuizResultResponse:
        attempt = await self.quiz_repo.get_attempt_by_id(attempt_id, include_details=True)
        if not attempt or attempt.user_id != current_user.id:
            raise AppExceptions.NotFoundException(message="Quiz attempt not found.")

        # Idempotent return if already finalized
        if attempt.status in (AttemptStatus.COMPLETED.value, AttemptStatus.EXPIRED.value):
            return self._build_quiz_result_response(attempt)

        quiz = attempt.quiz
        is_expired = False
        if quiz.duration_minutes > 0:
            remaining = self._calculate_time_remaining(attempt, quiz.duration_minutes)
            if remaining < -60:  # Beyond grace period
                is_expired = True

        result = await self._grade_and_finalize_attempt(attempt, quiz, is_expired=is_expired)
        return result

    async def get_quiz_result(
        self, attempt_id: uuid.UUID, current_user: User
    ) -> QuizResultResponse:
        attempt = await self.quiz_repo.get_attempt_by_id(attempt_id, include_details=True)
        if not attempt:
            raise AppExceptions.NotFoundException(message="Quiz attempt not found.")

        # Allow student owner or instructor/admin
        user_roles = {r.upper() for r in current_user.role_names}
        is_admin_or_instructor = (
            "SUPER_ADMIN" in user_roles
            or "ADMIN" in user_roles
            or (attempt.quiz.instructor_id == current_user.id)
        )
        if attempt.user_id != current_user.id and not is_admin_or_instructor:
            raise AppExceptions.ForbiddenException(
                message="You do not have permission to view this quiz result."
            )

        if attempt.status == AttemptStatus.IN_PROGRESS.value:
            raise AppExceptions.BadRequestException(
                message="This attempt is still in progress and has not been submitted."
            )

        return self._build_quiz_result_response(attempt)

    async def list_student_attempts(
        self, quiz_id: uuid.UUID, current_user: User
    ) -> list[StudentQuizAttemptSummary]:
        quiz = await self.quiz_repo.get_quiz_by_id(quiz_id, include_questions=False)
        if not quiz:
            raise AppExceptions.NotFoundException(message="Quiz not found.")

        attempts = await self.quiz_repo.get_user_attempts(quiz.id, current_user.id)
        return [
            StudentQuizAttemptSummary(
                id=a.id,
                attempt_number=a.attempt_number,
                status=a.status,
                started_at=a.started_at,
                submitted_at=a.submitted_at,
                score=a.score,
                max_score=a.max_score,
                percentage_score=a.percentage_score,
                passed=a.passed,
                time_spent_seconds=a.time_spent_seconds,
            )
            for a in attempts
        ]

    # ========================================================================
    # Internal Helpers & Grading Engine
    # ========================================================================

    async def _grade_and_finalize_attempt(
        self, attempt: QuizAttempt, quiz: Quiz, is_expired: bool = False
    ) -> QuizResultResponse:
        now = datetime.now(timezone.utc)
        started_at = attempt.started_at
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        time_spent = int((now - started_at).total_seconds())

        answers_by_qid = {ans.question_id: ans for ans in attempt.answers}
        total_points_earned = 0.0
        max_possible_points = 0.0

        for question in quiz.questions:
            max_possible_points += question.points
            ans = answers_by_qid.get(question.id)

            if not ans or not ans.selected_option_ids:
                # Unanswered question
                if ans:
                    ans.is_correct = False
                    ans.points_awarded = 0.0
                    self.db.add(ans)
                continue

            selected_ids = {str(opt_id) for opt_id in ans.selected_option_ids}
            correct_ids = {
                str(opt.id) for opt in question.options if opt.is_correct
            }

            if question.question_type in (
                QuestionType.SINGLE_CHOICE.value,
                QuestionType.TRUE_FALSE.value,
            ):
                if len(selected_ids) == 1 and selected_ids == correct_ids:
                    ans.is_correct = True
                    ans.points_awarded = float(question.points)
                else:
                    ans.is_correct = False
                    ans.points_awarded = 0.0
            elif question.question_type == QuestionType.MULTIPLE_SELECT.value:
                # All-or-nothing scoring rule
                if selected_ids == correct_ids:
                    ans.is_correct = True
                    ans.points_awarded = float(question.points)
                else:
                    ans.is_correct = False
                    ans.points_awarded = 0.0
            else:
                ans.is_correct = False
                ans.points_awarded = 0.0

            total_points_earned += ans.points_awarded
            self.db.add(ans)

        percentage = (
            (total_points_earned / max_possible_points * 100.0)
            if max_possible_points > 0
            else 0.0
        )
        passed = percentage >= quiz.passing_score_percentage

        attempt.status = (
            AttemptStatus.EXPIRED.value if is_expired else AttemptStatus.COMPLETED.value
        )
        attempt.submitted_at = now
        attempt.score = total_points_earned
        attempt.max_score = max_possible_points
        attempt.percentage_score = round(percentage, 2)
        attempt.passed = passed
        attempt.time_spent_seconds = time_spent

        updated_attempt = await self.quiz_repo.update_attempt(attempt)
        await self.db.commit()

        # Reload with details for building result response
        refreshed = await self.quiz_repo.get_attempt_by_id(updated_attempt.id, include_details=True)
        return self._build_quiz_result_response(refreshed or updated_attempt)

    def _build_quiz_result_response(self, attempt: QuizAttempt) -> QuizResultResponse:
        quiz = attempt.quiz
        answers_by_qid = {ans.question_id: ans for ans in attempt.answers}

        question_results: list[QuestionResultResponse] = []
        for q in quiz.questions:
            ans = answers_by_qid.get(q.id)
            selected_ids = (
                [uuid.UUID(str(opt_id)) for opt_id in ans.selected_option_ids]
                if ans and ans.selected_option_ids
                else []
            )
            correct_ids = [opt.id for opt in q.options if opt.is_correct]

            options_resp = [
                QuestionOptionResponse.model_validate(opt) for opt in q.options
            ]

            question_results.append(
                QuestionResultResponse(
                    question_id=q.id,
                    question_text=q.question_text,
                    question_type=q.question_type,
                    order_index=q.order_index,
                    points_possible=q.points,
                    points_awarded=ans.points_awarded if ans else 0.0,
                    is_correct=ans.is_correct if (ans and ans.is_correct is not None) else False,
                    selected_option_ids=selected_ids,
                    correct_option_ids=correct_ids,
                    options=options_resp,
                    explanation=q.explanation,
                )
            )

        attempts_remaining = None
        can_retake = False
        if quiz.max_attempts > 0:
            remaining = max(0, quiz.max_attempts - attempt.attempt_number)
            attempts_remaining = remaining
            can_retake = remaining > 0
        else:
            can_retake = True

        return QuizResultResponse(
            attempt_id=attempt.id,
            quiz_id=quiz.id,
            quiz_title=quiz.title,
            attempt_number=attempt.attempt_number,
            status=attempt.status,
            started_at=attempt.started_at,
            submitted_at=attempt.submitted_at,
            time_spent_seconds=attempt.time_spent_seconds,
            score=attempt.score,
            max_score=attempt.max_score,
            percentage_score=attempt.percentage_score,
            passed=attempt.passed,
            passing_score_percentage=quiz.passing_score_percentage,
            can_retake=can_retake,
            attempts_remaining=attempts_remaining,
            question_results=question_results,
        )

    def _calculate_time_remaining(
        self, attempt: QuizAttempt, duration_minutes: int
    ) -> int:
        started_at = attempt.started_at
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
        total_seconds = duration_minutes * 60
        remaining = int(total_seconds - elapsed)
        return max(0, remaining)

    def _check_instructor_access(self, quiz: Quiz, current_user: User) -> None:
        user_roles = {r.upper() for r in current_user.role_names}
        if "SUPER_ADMIN" in user_roles:
            return
        if "ADMIN" in user_roles:
            if quiz.organization_id is not None:
                if quiz.organization_id != current_user.organization_id:
                    raise AppExceptions.ForbiddenException(
                        message="Cannot manage quizzes belonging to a different organization."
                    )
            elif current_user.organization_id is not None:
                raise AppExceptions.ForbiddenException(
                    message="Cannot manage quizzes belonging to a different organization."
                )
            return
        if quiz.instructor_id != current_user.id:
            raise AppExceptions.ForbiddenException(
                message="You do not have permission to modify this quiz."
            )

    async def _ensure_student_access_to_course(
        self, course_id: uuid.UUID, current_user: User
    ) -> None:
        user_roles = {r.upper() for r in current_user.role_names}
        if "SUPER_ADMIN" in user_roles:
            return

        course = await self.course_repo.get_by_id(course_id)
        if "ADMIN" in user_roles and course and (course.organization_id is None or course.organization_id == current_user.organization_id):
            return
        if course and course.instructor_id == current_user.id:
            return

        enrollment = await self.enrollment_repo.get_by_user_and_course(
            current_user.id, course_id
        )
        if not enrollment or enrollment.status == EnrollmentStatus.DROPPED.value:
            raise AppExceptions.ForbiddenException(
                message="You must be actively enrolled in this course to access its quizzes."
            )

    def _validate_question_options(
        self, question_type: str, options: list[QuestionOptionCreate]
    ) -> None:
        if len(options) < 2:
            raise AppExceptions.BadRequestException(
                message="Each question must have at least 2 answer options."
            )

        correct_count = sum(1 for opt in options if opt.is_correct)
        if question_type in (QuestionType.SINGLE_CHOICE.value, QuestionType.TRUE_FALSE.value):
            if correct_count != 1:
                raise AppExceptions.BadRequestException(
                    message=f"A {question_type.replace('_', ' ')} question must have exactly 1 correct answer (found {correct_count})."
                )
        elif (
            question_type == QuestionType.MULTIPLE_SELECT.value
            and correct_count < 1
        ):
            raise AppExceptions.BadRequestException(
                message="A multiple-select question must have at least 1 correct answer."
            )

    def _build_quiz_detail_response(self, quiz: Quiz) -> QuizDetailResponse:
        questions_resp = [
            QuizQuestionResponse.model_validate(q) for q in quiz.questions
        ]
        return QuizDetailResponse(
            id=quiz.id,
            organization_id=quiz.organization_id,
            course_id=quiz.course_id,
            lesson_id=quiz.lesson_id,
            instructor_id=quiz.instructor_id,
            title=quiz.title,
            description=quiz.description,
            instructions=quiz.instructions,
            duration_minutes=quiz.duration_minutes,
            passing_score_percentage=quiz.passing_score_percentage,
            max_attempts=quiz.max_attempts,
            shuffle_questions=quiz.shuffle_questions,
            shuffle_options=quiz.shuffle_options,
            status=quiz.status,
            published_at=quiz.published_at,
            archived_at=quiz.archived_at,
            created_at=quiz.created_at,
            updated_at=quiz.updated_at,
            questions=questions_resp,
            total_points=sum(q.points for q in quiz.questions),
            question_count=len(quiz.questions),
        )
