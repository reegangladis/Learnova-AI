from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ModelEvaluationMetrics(BaseModel):
    accuracy: float = Field(..., description="Overall classification accuracy")
    precision: float = Field(..., description="Precision score (macro)")
    recall: float = Field(..., description="Recall score (macro)")
    f1_score: float = Field(..., description="F1-score (macro)")
    roc_auc: float | None = Field(None, description="ROC-AUC score")
    sample_size: int = Field(..., description="Number of evaluation samples")
    confusion_matrix: list[list[int]] = Field(default_factory=list, description="Confusion matrix")
    class_report: dict[str, Any] = Field(default_factory=dict, description="Detailed per-class breakdown")


class ModelVersionInfo(BaseModel):
    model_name: str
    version: str
    framework: str
    status: str
    trained_at: datetime
    metrics: ModelEvaluationMetrics | None = None
    features: list[str] = Field(default_factory=list)


class ModelStatusResponse(BaseModel):
    service_status: str
    active_models: list[ModelVersionInfo]
    registry_path: str
    last_evaluated: datetime | None = None


class TrainModelRequest(BaseModel):
    model_name: str = Field(default="student_risk_predictor", description="Target model name")
    test_size: float = Field(default=0.2, ge=0.1, le=0.5, description="Holdout evaluation ratio")
    random_state: int = Field(default=42, description="Reproducible random seed")


class TrainModelResponse(BaseModel):
    success: bool
    model_name: str
    version: str
    metrics: ModelEvaluationMetrics
    training_samples: int
    test_samples: int
    message: str
