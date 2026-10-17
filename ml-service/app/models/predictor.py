from typing import Any

import numpy as np
from app.features.engineering import StudentFeatureExtractor
from app.models.registry import get_model_registry
from app.schemas.predictions import (
    ContributingFactor,
    StudentRiskFeatures,
    StudentRiskPrediction,
)


class StudentRiskPredictor:
    """Inference engine for assessing student learning risk and pacing momentum."""

    def __init__(self):
        self.registry = get_model_registry()
        self._cached_model = None
        self._cached_version = "v1.0.0"

    def _get_model(self) -> tuple[Any | None, str]:
        if self._cached_model is not None:
            return self._cached_model, self._cached_version
        try:
            model, meta = self.registry.load_model("student_risk_predictor", "latest")
            self._cached_model = model
            self._cached_version = meta.get("version", "v1.0.0")
            return self._cached_model, self._cached_version
        except Exception:  # noqa: BLE001
            return None, "heuristic-baseline"

    def predict_risk(self, features: StudentRiskFeatures) -> StudentRiskPrediction:
        """Evaluates student risk level, momentum, and contributing factors."""
        data_dict = features.model_dump()

        # 1. Cold start / Insufficient data check
        if StudentFeatureExtractor.is_insufficient_data(data_dict):
            return StudentRiskPrediction(
                student_id=features.student_id,
                risk_level="insufficient_data",
                risk_score=0.0,
                confidence_score=0.0,
                momentum_status="insufficient_data",
                contributing_factors=[
                    ContributingFactor(
                        factor_name="New Learner",
                        impact="neutral",
                        description="Not enough learning activity recorded yet to estimate study pace.",
                        weight=0.0,
                    )
                ],
                supportive_guidance=[
                    "Welcome to Learnova! Begin with your enrolled course's first lesson to start tracking your learning momentum.",
                    "Take a quick practice quiz to unlock personalized mastery insights.",
                ],
                model_version="baseline",
                is_insufficient_data=True,
            )

        # 2. Extract feature vector
        feat_vec = StudentFeatureExtractor.extract_features_vector(data_dict).reshape(1, -1)

        # 3. Predict via registered ML model or heuristic baseline
        model, version = self._get_model()

        if model is not None:
            try:
                risk_level = str(model.predict(feat_vec)[0])
                probs = model.predict_proba(feat_vec)[0]
                classes = list(model.classes_)
                prob_map = dict(zip(classes, probs))
                high_prob = float(prob_map.get("high", 0.0))
                mod_prob = float(prob_map.get("moderate", 0.0))
                risk_score = round(high_prob + (mod_prob * 0.5), 3)
                confidence = round(float(np.max(probs)), 2)
            except Exception:  # noqa: BLE001
                risk_level, risk_score, confidence = self._heuristic_predict(features)
        else:
            risk_level, risk_score, confidence = self._heuristic_predict(features)

        # 4. Momentum status
        if risk_level == "low":
            momentum = "accelerating" if features.lesson_completion_rate > 0.6 else "steady"
        elif risk_level == "moderate":
            momentum = "needs_attention"
        else:
            momentum = "needs_attention"

        # 5. Extract contributing factors
        factors: list[ContributingFactor] = []
        guidance: list[str] = []

        # Activity factor
        if features.days_since_last_activity > 10:
            factors.append(
                ContributingFactor(
                    factor_name="Extended Inactivity",
                    impact="concerning",
                    description=f"{features.days_since_last_activity} days since last lesson completion or quiz attempt.",
                    weight=-0.35,
                )
            )
            guidance.append("Setting aside just 15 minutes today can quickly rebuild your study momentum.")
        elif features.days_since_last_activity <= 2:
            factors.append(
                ContributingFactor(
                    factor_name="Consistent Learning Pace",
                    impact="positive",
                    description="Active within the last 48 hours. Excellent study continuity!",
                    weight=0.30,
                )
            )

        # Quiz performance factor
        if features.total_quiz_attempts > 0:
            if features.avg_quiz_score >= 80.0:
                factors.append(
                    ContributingFactor(
                        factor_name="Strong Concept Mastery",
                        impact="positive",
                        description=f"Average quiz score of {features.avg_quiz_score:.1f}% demonstrates solid retention.",
                        weight=0.35,
                    )
                )
            elif features.avg_quiz_score < 60.0 or features.quiz_pass_rate < 50.0:
                factors.append(
                    ContributingFactor(
                        factor_name="Assessment Pacing",
                        impact="concerning",
                        description=f"Quiz pass rate is {features.quiz_pass_rate:.1f}%. Reviewing prior modules may help.",
                        weight=-0.30,
                    )
                )
                guidance.append("Try revisiting lesson key takeaways before retaking formative quizzes.")

        # Lesson completion factor
        if features.lesson_completion_rate >= 0.70:
            factors.append(
                ContributingFactor(
                    factor_name="Course Progression",
                    impact="positive",
                    description=f"{features.lesson_completion_rate * 100:.0f}% of enrolled lessons completed.",
                    weight=0.25,
                )
            )
        elif features.lesson_completion_rate < 0.25 and features.total_lessons_assigned > 0:
            factors.append(
                ContributingFactor(
                    factor_name="Curriculum Milestone",
                    impact="concerning",
                    description=f"Currently completed {features.lesson_completion_rate * 100:.0f}% of course lessons.",
                    weight=-0.20,
                )
            )
            guidance.append("Focus on finishing your current module's next lesson to maintain steady progression.")

        if not guidance:
            guidance.append("Keep up your structured study routine to stay on track for course completion!")

        return StudentRiskPrediction(
            student_id=features.student_id,
            risk_level=risk_level,
            risk_score=risk_score,
            confidence_score=confidence,
            momentum_status=momentum,
            contributing_factors=factors,
            supportive_guidance=guidance,
            model_version=version,
            is_insufficient_data=False,
        )

    def _heuristic_predict(self, f: StudentRiskFeatures) -> tuple[str, float, float]:
        """Calibrated transparent baseline heuristic when model artifact is unavailable."""
        score = 0.0

        if f.days_since_last_activity > 14:
            score += 0.40
        elif f.days_since_last_activity > 7:
            score += 0.20

        if f.total_quiz_attempts > 0:
            if f.quiz_pass_rate < 50.0:
                score += 0.35
            elif f.quiz_pass_rate < 70.0:
                score += 0.15
            else:
                score -= 0.15

        if f.lesson_completion_rate < 0.20:
            score += 0.25
        elif f.lesson_completion_rate > 0.60:
            score -= 0.20

        score = float(np.clip(score, 0.05, 0.95))

        if score >= 0.60:
            return "high", round(score, 2), 0.85
        elif score >= 0.35:
            return "moderate", round(score, 2), 0.80
        else:
            return "low", round(score, 2), 0.85
