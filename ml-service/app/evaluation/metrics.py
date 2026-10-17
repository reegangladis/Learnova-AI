import numpy as np
from app.schemas.admin import ModelEvaluationMetrics
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


class ModelEvaluator:
    """Evaluates classification models using standardized scikit-learn metrics."""

    @staticmethod
    def evaluate_risk_classifier(
        y_true: np.ndarray,
        y_pred: np.ndarray,
        y_prob: np.ndarray | None = None,
        labels: list[str] | None = None,
    ) -> ModelEvaluationMetrics:
        """Computes comprehensive evaluation metrics for multi-class student risk prediction."""
        labels = labels or ["low", "moderate", "high"]
        acc = float(accuracy_score(y_true, y_pred))
        prec = float(precision_score(y_true, y_pred, labels=labels, average="macro", zero_division=0))
        rec = float(recall_score(y_true, y_pred, labels=labels, average="macro", zero_division=0))
        f1 = float(f1_score(y_true, y_pred, labels=labels, average="macro", zero_division=0))

        # Confusion Matrix
        cm = confusion_matrix(y_true, y_pred, labels=labels).tolist()

        # Detailed class report
        report = classification_report(
            y_true,
            y_pred,
            labels=labels,
            output_dict=True,
            zero_division=0,
        )

        # ROC-AUC if probability distribution available
        roc_auc: float | None = None
        if y_prob is not None and y_prob.shape[1] == len(labels):
            try:
                roc_auc = float(
                    roc_auc_score(
                        y_true,
                        y_prob,
                        multi_class="ovr",
                        labels=labels,
                    )
                )
            except Exception:  # noqa: BLE001
                roc_auc = None

        return ModelEvaluationMetrics(
            accuracy=round(acc, 4),
            precision=round(prec, 4),
            recall=round(rec, 4),
            f1_score=round(f1, 4),
            roc_auc=round(roc_auc, 4) if roc_auc is not None else None,
            sample_size=len(y_true),
            confusion_matrix=cm,
            class_report=report,
        )
