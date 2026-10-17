from datetime import datetime, timezone

from app.models.registry import get_model_registry
from app.schemas.admin import (
    ModelStatusResponse,
    TrainModelRequest,
    TrainModelResponse,
)
from app.training.pipeline import RiskModelTrainingPipeline
from fastapi import APIRouter, status

router = APIRouter(prefix="/models", tags=["Model Lifecycle & Administration"])


@router.get(
    "/status",
    response_model=ModelStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="List active models and evaluation metrics",
    description="Inspects the local model registry and returns versions, architectures, and evaluation scores.",
)
async def get_models_status() -> ModelStatusResponse:
    registry = get_model_registry()
    models = registry.list_models()

    last_eval = None
    if models:
        last_eval = max(m.trained_at for m in models)

    return ModelStatusResponse(
        service_status="operational",
        active_models=models,
        registry_path=str(registry.storage_dir),
        last_evaluated=last_eval,
    )


@router.post(
    "/train",
    response_model=TrainModelResponse,
    status_code=status.HTTP_200_OK,
    summary="Train and evaluate student risk model",
    description="Executes training pipeline with reproducible split, computes validation metrics, and registers new artifact.",
)
async def train_model(request: TrainModelRequest) -> TrainModelResponse:
    pipeline = RiskModelTrainingPipeline(random_state=request.random_state)
    version = f"v1.{int(datetime.now(timezone.utc).timestamp()) % 10000}"

    _clf, metrics, n_train, n_test = pipeline.train_and_evaluate(
        test_size=request.test_size,
        version=version,
        persist=True,
    )

    return TrainModelResponse(
        success=True,
        model_name=request.model_name,
        version=version,
        metrics=metrics,
        training_samples=n_train,
        test_samples=n_test,
        message="Model trained, evaluated, and persisted successfully to local registry.",
    )
