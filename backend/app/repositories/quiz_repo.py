import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.quiz import (
    AttemptStatus,
    QuestionOption,
    Quiz,
    QuizAnswer,
    QuizAttempt,
    QuizQuestion,
    QuizStatus,
)


class QuizRepository:
    """Repository handling database operations for Quizzes, Questions, Options, Attempts, and Answers."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # Quizzes
    # ========================================================================

    async def create_quiz(self, quiz: Quiz) -> Quiz:
        self.db.add(quiz)
        await self.db.flush()
        await self.db.refresh(quiz)
        return quiz

    async def get_quiz_by_id(
        self, quiz_id: uuid.UUID, include_questions: bool = True
    ) -> Quiz | None:
        query = select(Quiz).where(Quiz.id == quiz_id)
        if include_questions:
            query = query.options(
                selectinload(Quiz.questions).selectinload(QuizQuestion.options),
                selectinload(Quiz.course),
                selectinload(Quiz.instructor),
            )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_instructor_quizzes(
        self,
        instructor_id: uuid.UUID,
        course_id: uuid.UUID | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Quiz], int]:
        filters = [Quiz.instructor_id == instructor_id]
        if course_id:
            filters.append(Quiz.course_id == course_id)
        if status:
            filters.append(Quiz.status == status)

        count_query = select(func.count(Quiz.id)).where(*filters)
        total_count = (await self.db.execute(count_query)).scalar_one()

        offset = (page - 1) * page_size
        query = (
            select(Quiz)
            .where(*filters)
            .options(
                selectinload(Quiz.questions).selectinload(QuizQuestion.options),
                selectinload(Quiz.course),
            )
            .order_by(Quiz.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all()), total_count

    async def list_course_quizzes(
        self, course_id: uuid.UUID, published_only: bool = True
    ) -> list[Quiz]:
        filters = [Quiz.course_id == course_id]
        if published_only:
            filters.append(Quiz.status == QuizStatus.PUBLISHED.value)

        query = (
            select(Quiz)
            .where(*filters)
            .options(
                selectinload(Quiz.questions).selectinload(QuizQuestion.options),
            )
            .order_by(Quiz.created_at.asc())
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_quiz(self, quiz: Quiz) -> Quiz:
        quiz.updated_at = datetime.now(timezone.utc)
        self.db.add(quiz)
        await self.db.flush()
        loaded = await self.get_quiz_by_id(quiz.id, include_questions=True)
        assert loaded is not None
        return loaded

    async def delete_quiz(self, quiz: Quiz) -> None:
        await self.db.delete(quiz)
        await self.db.flush()

    # ========================================================================
    # Questions & Options
    # ========================================================================

    async def get_question_by_id(self, question_id: uuid.UUID) -> QuizQuestion | None:
        query = (
            select(QuizQuestion)
            .where(QuizQuestion.id == question_id)
            .options(selectinload(QuizQuestion.options))
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_question(
        self, question: QuizQuestion, options: list[QuestionOption]
    ) -> QuizQuestion:
        self.db.add(question)
        await self.db.flush()
        for opt in options:
            opt.question_id = question.id
            self.db.add(opt)
        await self.db.flush()
        loaded = await self.get_question_by_id(question.id)
        assert loaded is not None
        return loaded

    async def update_question(
        self,
        question: QuizQuestion,
        options_data: list[dict[str, Any]] | None = None,
    ) -> QuizQuestion:
        question.updated_at = datetime.now(timezone.utc)
        self.db.add(question)

        if options_data is not None:
            # Delete existing options and insert updated list
            await self.db.execute(
                delete(QuestionOption).where(QuestionOption.question_id == question.id)
            )
            for opt_dict in options_data:
                new_opt = QuestionOption(
                    question_id=question.id,
                    option_text=opt_dict["option_text"],
                    order_index=opt_dict.get("order_index", 0),
                    is_correct=opt_dict.get("is_correct", False),
                    explanation=opt_dict.get("explanation"),
                )
                self.db.add(new_opt)

        await self.db.flush()
        loaded = await self.get_question_by_id(question.id)
        assert loaded is not None
        return loaded

    async def delete_question(self, question: QuizQuestion) -> None:
        quiz_id = question.quiz_id
        order_index = question.order_index
        await self.db.delete(question)
        await self.db.flush()

        # Re-compact order_indices for remaining questions
        reorder_query = (
            select(QuizQuestion)
            .where(QuizQuestion.quiz_id == quiz_id, QuizQuestion.order_index > order_index)
            .order_by(QuizQuestion.order_index.asc())
        )
        res = await self.db.execute(reorder_query)
        for q in res.scalars().all():
            q.order_index -= 1
            self.db.add(q)
        await self.db.flush()

    async def reorder_questions(
        self, quiz_id: uuid.UUID, question_ids: list[uuid.UUID]
    ) -> None:
        query = select(QuizQuestion).where(QuizQuestion.quiz_id == quiz_id)
        result = await self.db.execute(query)
        questions_by_id = {q.id: q for q in result.scalars().all()}

        for idx, q_id in enumerate(question_ids):
            if q_id in questions_by_id:
                questions_by_id[q_id].order_index = idx
                self.db.add(questions_by_id[q_id])
        await self.db.flush()

    # ========================================================================
    # Attempts & Answers
    # ========================================================================

    async def get_active_attempt(
        self, quiz_id: uuid.UUID, user_id: uuid.UUID
    ) -> QuizAttempt | None:
        query = (
            select(QuizAttempt)
            .where(
                QuizAttempt.quiz_id == quiz_id,
                QuizAttempt.user_id == user_id,
                QuizAttempt.status == AttemptStatus.IN_PROGRESS.value,
            )
            .options(
                selectinload(QuizAttempt.answers),
                selectinload(QuizAttempt.quiz),
            )
            .order_by(QuizAttempt.attempt_number.desc())
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_user_attempts(
        self, quiz_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[QuizAttempt]:
        query = (
            select(QuizAttempt)
            .where(
                QuizAttempt.quiz_id == quiz_id,
                QuizAttempt.user_id == user_id,
            )
            .order_by(QuizAttempt.attempt_number.asc())
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_attempt_by_id(
        self, attempt_id: uuid.UUID, include_details: bool = True
    ) -> QuizAttempt | None:
        query = select(QuizAttempt).where(QuizAttempt.id == attempt_id)
        if include_details:
            query = query.options(
                selectinload(QuizAttempt.answers),
                selectinload(QuizAttempt.quiz).selectinload(Quiz.questions).selectinload(QuizQuestion.options),
                selectinload(QuizAttempt.user),
            )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_attempt(
        self, quiz_id: uuid.UUID, user_id: uuid.UUID, attempt_number: int
    ) -> QuizAttempt:
        attempt = QuizAttempt(
            quiz_id=quiz_id,
            user_id=user_id,
            attempt_number=attempt_number,
            status=AttemptStatus.IN_PROGRESS.value,
            started_at=datetime.now(timezone.utc),
            score=0.0,
            max_score=0.0,
            percentage_score=0.0,
            passed=False,
        )
        self.db.add(attempt)
        await self.db.flush()
        loaded = await self.get_attempt_by_id(attempt.id, include_details=True)
        assert loaded is not None
        return loaded

    async def save_answer(
        self,
        attempt_id: uuid.UUID,
        question_id: uuid.UUID,
        selected_option_ids: list[str],
        text_response: str | None = None,
    ) -> QuizAnswer:
        """Upsert quiz answer idempotently."""
        query = select(QuizAnswer).where(
            QuizAnswer.attempt_id == attempt_id,
            QuizAnswer.question_id == question_id,
        )
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()
        now = datetime.now(timezone.utc)

        if existing:
            existing.selected_option_ids = selected_option_ids
            existing.text_response = text_response
            existing.updated_at = now
            self.db.add(existing)
            await self.db.flush()
            return existing

        answer = QuizAnswer(
            attempt_id=attempt_id,
            question_id=question_id,
            selected_option_ids=selected_option_ids,
            text_response=text_response,
            created_at=now,
            updated_at=now,
        )
        self.db.add(answer)
        await self.db.flush()
        return answer

    async def update_attempt(self, attempt: QuizAttempt) -> QuizAttempt:
        attempt.updated_at = datetime.now(timezone.utc)
        self.db.add(attempt)
        await self.db.flush()
        loaded = await self.get_attempt_by_id(attempt.id, include_details=True)
        assert loaded is not None
        return loaded
