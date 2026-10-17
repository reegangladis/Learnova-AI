from abc import ABC, abstractmethod

from app.llm.base import LLMMessage
from app.rag.pipeline import BaseRAGPipeline
from pydantic import BaseModel, Field


class TutorSessionContext(BaseModel):
    """Contextual metadata for active AI tutor dialogue."""

    session_id: str = Field(..., description="Unique dialogue session ID")
    student_id: str = Field(..., description="Student identifier")
    course_id: str | None = Field(None, description="Active course identifier")
    lesson_id: str | None = Field(None, description="Active lesson identifier")
    learning_style: str | None = Field(
        "adaptive", description="Student learning preference"
    )
    history: list[LLMMessage] = Field(
        default_factory=list, description="Recent conversation history"
    )


class TutorResponse(BaseModel):
    """Response returned by AI Tutor."""

    message: str = Field(..., description="Tutor guidance or response message")
    is_grounded: bool = Field(default=False, description="Whether answer is grounded in course materials")
    sources: list[dict[str, str]] = Field(
        default_factory=list, description="Course source citations"
    )
    follow_up_questions: list[str] = Field(
        default_factory=list, description="Suggested follow-up prompts"
    )
    recommended_topics: list[str] = Field(
        default_factory=list, description="Relevant learning concepts"
    )


class BaseAITutorService(ABC):
    """Abstract interface for AI Personalized Learning Tutor."""

    @abstractmethod
    async def chat(
        self,
        student_input: str,
        context: TutorSessionContext,
    ) -> TutorResponse:
        """Processes student prompt and returns pedagogical guidance."""


class AITutorService(BaseAITutorService):
    """Pedagogical AI Tutor integrating course-aware RAG synthesis."""

    def __init__(self, rag_pipeline: BaseRAGPipeline):
        self.rag_pipeline = rag_pipeline

    async def chat(
        self,
        student_input: str,
        context: TutorSessionContext,
    ) -> TutorResponse:
        filters = {}
        if context.course_id:
            filters["course_id"] = context.course_id
        if context.lesson_id:
            filters["lesson_id"] = context.lesson_id

        rag_result = await self.rag_pipeline.query(
            question=student_input,
            course_id=context.course_id,
            filters=filters,
            history=context.history,
        )

        formatted_sources = []
        for s in rag_result.sources:
            formatted_sources.append(
                {
                    "chunk_id": s.chunk.chunk_id,
                    "lesson_id": str(s.chunk.metadata.get("lesson_id", "")),
                    "lesson_title": str(s.chunk.metadata.get("lesson_title", "Course Lesson")),
                    "module_title": str(s.chunk.metadata.get("module_title", "")),
                    "similarity_score": str(s.score),
                    "snippet": s.chunk.content[:200] + ("..." if len(s.chunk.content) > 200 else ""),
                }
            )

        topics = []
        if context.course_id:
            topics.append("Core Curriculum")
        if context.lesson_id:
            topics.append("Lesson Concepts")

        return TutorResponse(
            message=rag_result.answer,
            is_grounded=rag_result.is_grounded,
            sources=formatted_sources,
            follow_up_questions=rag_result.follow_up_questions,
            recommended_topics=topics,
        )
