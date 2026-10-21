import hashlib
import json
import os
import pickle
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import get_ml_settings
from app.schemas.admin import ModelEvaluationMetrics, ModelVersionInfo


class LocalModelRegistry:
    """Manages versioned persistence and validation of trained machine learning artifacts."""

    def __init__(self, storage_dir: str | None = None):
        settings = get_ml_settings()
        self.storage_dir = Path(storage_dir or settings.MODEL_REGISTRY_PATH)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _get_model_dir(self, model_name: str) -> Path:
        p = self.storage_dir / model_name
        p.mkdir(parents=True, exist_ok=True)
        return p

    def save_model(
        self,
        model_name: str,
        version: str,
        model_artifact: Any,
        metrics: ModelEvaluationMetrics,
        features: list[str],
        framework: str = "scikit-learn",
    ) -> Path:
        """Saves model weights binary and JSON descriptor with cryptographic integrity hash."""
        model_dir = self._get_model_dir(model_name)
        artifact_path = model_dir / f"{version}.pkl"
        metadata_path = model_dir / f"{version}.json"

        # Safe binary write
        with open(artifact_path, "wb") as f:
            pickle.dump(model_artifact, f, protocol=pickle.HIGHEST_PROTOCOL)

        # Compute SHA-256 digest of serialized artifact
        with open(artifact_path, "rb") as f:
            digest = hashlib.sha256(f.read()).hexdigest()

        try:
            os.chmod(artifact_path, 0o644)
        except OSError:
            pass

        meta = {
            "model_name": model_name,
            "version": version,
            "framework": framework,
            "status": "experimental",
            "provenance": "synthetic_educational_benchmark",
            "sha256": digest,
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "features": features,
            "metrics": metrics.model_dump(),
        }

        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

        try:
            os.chmod(metadata_path, 0o644)
        except OSError:
            pass

        return artifact_path

    def load_model(self, model_name: str, version: str = "latest") -> tuple[Any, dict[str, Any]]:
        """Safely loads model artifact and validates metadata and cryptographic integrity."""
        model_dir = self._get_model_dir(model_name)

        if version == "latest":
            # Find newest .pkl
            pkl_files = sorted(model_dir.glob("*.pkl"), key=os.path.getmtime, reverse=True)
            if not pkl_files:
                raise FileNotFoundError(f"No trained artifacts found for '{model_name}'.")
            artifact_path = pkl_files[0]
            version = artifact_path.stem
        else:
            artifact_path = model_dir / f"{version}.pkl"
            if not artifact_path.exists():
                raise FileNotFoundError(f"Model '{model_name}' version '{version}' not found.")

        # Restrict loading strictly within designated model storage tree
        resolved_path = artifact_path.resolve()
        if not str(resolved_path).startswith(str(self.storage_dir.resolve())):
            raise ValueError(f"Path traversal detected in model artifact path: {artifact_path}")

        metadata_path = model_dir / f"{version}.json"
        metadata: dict[str, Any] = {}
        if metadata_path.exists():
            with open(metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)

        # Validate file size
        if artifact_path.stat().st_size == 0:
            raise ValueError(f"Corrupt or empty artifact at {artifact_path}")

        # Validate cryptographic integrity if sha256 is recorded
        expected_sha = metadata.get("sha256")
        if expected_sha:
            with open(artifact_path, "rb") as f:
                actual_sha = hashlib.sha256(f.read()).hexdigest()
            if actual_sha != expected_sha:
                raise ValueError(
                    f"Cryptographic integrity mismatch for model artifact '{artifact_path}'. "
                    f"Expected {expected_sha}, got {actual_sha}."
                )

        with open(artifact_path, "rb") as f:
            model_artifact = pickle.load(f)

        return model_artifact, metadata

    def list_models(self) -> list[ModelVersionInfo]:
        """Scans registry directory for registered model versions."""
        infos: list[ModelVersionInfo] = []
        if not self.storage_dir.exists():
            return infos

        for model_subdir in self.storage_dir.iterdir():
            if not model_subdir.is_dir():
                continue
            model_name = model_subdir.name
            for meta_file in sorted(model_subdir.glob("*.json")):
                try:
                    with open(meta_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    metrics_data = data.get("metrics")
                    metrics = ModelEvaluationMetrics(**metrics_data) if metrics_data else None
                    info = ModelVersionInfo(
                        model_name=data.get("model_name", model_name),
                        version=data.get("version", meta_file.stem),
                        framework=data.get("framework", "scikit-learn"),
                        status=data.get("status", "experimental"),
                        provenance=data.get("provenance", "synthetic_educational_benchmark"),
                        trained_at=datetime.fromisoformat(data.get("trained_at")),
                        metrics=metrics,
                        features=data.get("features", []),
                    )
                    infos.append(info)
                except Exception:  # noqa: BLE001, S112
                    continue
        return infos


_registry_instance: LocalModelRegistry | None = None


def get_model_registry() -> LocalModelRegistry:
    global _registry_instance
    if _registry_instance is None:
        _registry_instance = LocalModelRegistry()
    return _registry_instance
