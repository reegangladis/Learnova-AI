import tempfile
from pathlib import Path

import pytest
from app.models.registry import LocalModelRegistry
from app.training.pipeline import RiskModelTrainingPipeline


def test_reproducible_benchmark_dataset():
    p1 = RiskModelTrainingPipeline(random_state=42)
    p2 = RiskModelTrainingPipeline(random_state=42)

    X1, y1 = p1.generate_benchmark_dataset(n_samples=100)
    X2, y2 = p2.generate_benchmark_dataset(n_samples=100)

    assert (X1 == X2).all()
    assert (y1 == y2).all()


def test_model_training_and_evaluation_metrics():
    with tempfile.TemporaryDirectory():
        p = RiskModelTrainingPipeline(random_state=42)
        _clf, metrics, n_train, n_test = p.train_and_evaluate(
            test_size=0.2,
            version="test-v1",
            persist=False,
        )

        assert n_train == 480
        assert n_test == 120
        assert 0.70 <= metrics.accuracy <= 1.0
        assert 0.70 <= metrics.precision <= 1.0
        assert 0.70 <= metrics.recall <= 1.0
        assert 0.70 <= metrics.f1_score <= 1.0
        assert metrics.confusion_matrix is not None
        assert len(metrics.confusion_matrix) == 3


def test_registry_persistence_and_loading():
    with tempfile.TemporaryDirectory() as tmpdir:
        registry = LocalModelRegistry(storage_dir=tmpdir)
        p = RiskModelTrainingPipeline(random_state=42)
        clf, metrics, _, _ = p.train_and_evaluate(persist=False)

        artifact_path = registry.save_model(
            model_name="test_model",
            version="v1.0.0",
            model_artifact=clf,
            metrics=metrics,
            features=["f1", "f2"],
        )

        assert artifact_path.exists()

        # Load back
        loaded_clf, meta = registry.load_model("test_model", "v1.0.0")
        assert loaded_clf is not None
        assert meta["version"] == "v1.0.0"
        assert meta["metrics"]["accuracy"] == metrics.accuracy

        # List models
        models = registry.list_models()
        assert len(models) == 1
        assert models[0].model_name == "test_model"


def test_registry_corrupt_artifact_handling():
    with tempfile.TemporaryDirectory() as tmpdir:
        registry = LocalModelRegistry(storage_dir=tmpdir)
        model_dir = Path(tmpdir) / "corrupt_model"
        model_dir.mkdir(parents=True)
        # Create 0-byte corrupt file
        (model_dir / "bad.pkl").write_bytes(b"")

        with pytest.raises(ValueError, match="Corrupt or empty artifact"):
            registry.load_model("corrupt_model", "bad")
