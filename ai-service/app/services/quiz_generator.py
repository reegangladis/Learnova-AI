from abc import ABC, abstractmethod

from pydantic import BaseModel, Field


class QuizQuestion(BaseModel):
    """Single generated quiz question."""

    question_text: str = Field(..., description="Prompt of the question")
    options: list[str] = Field(..., description="Multiple choice options")
    correct_option_index: int = Field(
        ..., description="0-indexed pointer to correct option"
    )
    explanation: str = Field(..., description="Pedagogical explanation of the solution")
    difficulty: str = Field("medium", description="Difficulty tier: easy, medium, hard")


class QuizGenerationRequest(BaseModel):
    """Parameters requesting quiz generation."""

    topic: str = Field(..., description="Subject or concept to generate questions for")
    num_questions: int = Field(
        default=5, ge=1, le=20, description="Quantity of questions"
    )
    difficulty: str = Field(default="medium", description="Desired difficulty level")
    source_material: str | None = Field(
        None, description="Optional raw text / chapter material"
    )


class BaseQuizGeneratorService(ABC):
    """Abstract interface for AI Quiz Generation."""

    @abstractmethod
    async def generate_quiz(self, request: QuizGenerationRequest) -> list[QuizQuestion]:
        """Synthesizes structured quiz questions from topic or content."""
