from abc import ABC, abstractmethod

from pydantic import BaseModel, Field


class EvaluationFeedback(BaseModel):
    """Detailed evaluation feedback on student submission."""

    rubric_criterion: str = Field(..., description="Rubric criterion evaluated")
    score: float = Field(..., description="Score awarded")
    max_score: float = Field(..., description="Maximum possible score")
    strengths: list[str] = Field(default_factory=list, description="Observed strengths")
    improvements: list[str] = Field(
        default_factory=list, description="Constructive improvement pointers"
    )


class AssignmentEvaluationResult(BaseModel):
    """Aggregated evaluation assessment."""

    total_score: float = Field(..., description="Overall calculated score")
    max_total_score: float = Field(..., description="Maximum total score")
    percentage: float = Field(..., description="Percentage score")
    summary: str = Field(..., description="Qualitative evaluation summary")
    criterion_feedback: list[EvaluationFeedback] = Field(default_factory=list)


class BaseAssignmentEvaluatorService(ABC):
    """Abstract interface for AI Assignment and Code Evaluation."""

    @abstractmethod
    async def evaluate_submission(
        self,
        submission_text: str,
        assignment_prompt: str,
        rubric: str | None = None,
    ) -> AssignmentEvaluationResult:
        """Evaluates student submission against prompt and rubric."""
