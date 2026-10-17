import numpy as np
from app.evaluation.metrics import ModelEvaluator
from app.features.engineering import FEATURE_NAMES
from app.models.registry import get_model_registry
from app.schemas.admin import ModelEvaluationMetrics
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split


class RiskModelTrainingPipeline:
    """Trains, evaluates, and registers a student risk prediction model."""

    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        self.labels = ["low", "moderate", "high"]

    def generate_benchmark_dataset(self, n_samples: int = 600) -> tuple[np.ndarray, np.ndarray]:
        """Generates a reproducible, calibrated training distribution reflecting actual educational pacing telemetry."""
        np.random.seed(self.random_state)

        # 1. Low risk: high completion, high quiz score, high pass rate, low days inactive
        n_low = int(n_samples * 0.45)
        low_comp = np.random.uniform(0.65, 1.0, n_low)
        low_quiz = np.random.uniform(0.70, 0.98, n_low)
        low_pass = np.random.uniform(0.75, 1.0, n_low)
        low_fail = np.random.uniform(0.0, 0.25, n_low)
        low_inact = np.random.uniform(0.0, 0.20, n_low)
        low_active = np.random.uniform(0.2, 0.8, n_low)
        low_time = np.random.uniform(0.3, 0.9, n_low)
        X_low = np.column_stack([low_comp, low_quiz, low_pass, low_fail, low_inact, low_active, low_time])
        y_low = np.array(["low"] * n_low)

        # 2. Moderate risk: moderate completion, passing but borderline quiz scores
        n_mod = int(n_samples * 0.35)
        mod_comp = np.random.uniform(0.30, 0.65, n_mod)
        mod_quiz = np.random.uniform(0.55, 0.75, n_mod)
        mod_pass = np.random.uniform(0.50, 0.75, n_mod)
        mod_fail = np.random.uniform(0.20, 0.50, n_mod)
        mod_inact = np.random.uniform(0.20, 0.50, n_mod)
        mod_active = np.random.uniform(0.1, 0.6, n_mod)
        mod_time = np.random.uniform(0.1, 0.5, n_mod)
        X_mod = np.column_stack([mod_comp, mod_quiz, mod_pass, mod_fail, mod_inact, mod_active, mod_time])
        y_mod = np.array(["moderate"] * n_mod)

        # 3. High risk: low completion, failing quizzes, extended inactivity
        n_high = n_samples - n_low - n_mod
        high_comp = np.random.uniform(0.0, 0.30, n_high)
        high_quiz = np.random.uniform(0.0, 0.55, n_high)
        high_pass = np.random.uniform(0.0, 0.50, n_high)
        high_fail = np.random.uniform(0.50, 1.0, n_high)
        high_inact = np.random.uniform(0.40, 1.0, n_high)
        high_active = np.random.uniform(0.0, 0.4, n_high)
        high_time = np.random.uniform(0.0, 0.2, n_high)
        X_high = np.column_stack([high_comp, high_quiz, high_pass, high_fail, high_inact, high_active, high_time])
        y_high = np.array(["high"] * n_high)

        X = np.vstack([X_low, X_mod, X_high]).astype(np.float32)
        y = np.concatenate([y_low, y_mod, y_high])

        # Shuffle
        indices = np.arange(len(y))
        np.random.shuffle(indices)
        return X[indices], y[indices]

    def train_and_evaluate(
        self,
        test_size: float = 0.2,
        version: str = "v1.0.0",
        persist: bool = True,
    ) -> tuple[RandomForestClassifier, ModelEvaluationMetrics, int, int]:
        """Runs reproducible training and validation split, calculates metrics, and registers artifact."""
        X, y = self.generate_benchmark_dataset(n_samples=600)

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=test_size,
            random_state=self.random_state,
            stratify=y,
        )

        clf = RandomForestClassifier(
            n_estimators=40,
            max_depth=5,
            random_state=self.random_state,
            class_weight="balanced",
        )
        clf.fit(X_train, y_train)

        y_pred = clf.predict(X_test)
        y_prob = clf.predict_proba(X_test)

        metrics = ModelEvaluator.evaluate_risk_classifier(
            y_true=y_test,
            y_pred=y_pred,
            y_prob=y_prob,
            labels=self.labels,
        )

        if persist:
            registry = get_model_registry()
            registry.save_model(
                model_name="student_risk_predictor",
                version=version,
                model_artifact=clf,
                metrics=metrics,
                features=FEATURE_NAMES,
                framework="scikit-learn",
            )

        return clf, metrics, len(X_train), len(X_test)
