from app.models.predictor import StudentRiskPredictor
from app.schemas.predictions import StudentRiskFeatures


def test_insufficient_data_behavior():
    predictor = StudentRiskPredictor()
    new_student = StudentRiskFeatures(
        student_id="std-new",
        active_courses_count=0,
        completed_courses_count=0,
        total_lessons_assigned=0,
        completed_lessons_count=0,
        lesson_completion_rate=0.0,
        avg_quiz_score=0.0,
        quiz_pass_rate=0.0,
        total_quiz_attempts=0,
        failed_quiz_attempts=0,
        days_since_last_activity=0,
    )

    pred = predictor.predict_risk(new_student)
    assert pred.is_insufficient_data is True
    assert pred.risk_level == "insufficient_data"
    assert pred.risk_score == 0.0
    assert len(pred.supportive_guidance) > 0
    assert "welcome" in pred.supportive_guidance[0].lower()


def test_low_risk_high_momentum():
    predictor = StudentRiskPredictor()
    engaged_student = StudentRiskFeatures(
        student_id="std-star",
        active_courses_count=2,
        completed_courses_count=1,
        total_lessons_assigned=20,
        completed_lessons_count=18,
        lesson_completion_rate=0.90,
        avg_quiz_score=92.0,
        quiz_pass_rate=100.0,
        total_quiz_attempts=6,
        failed_quiz_attempts=0,
        days_since_last_activity=1,
        total_study_time_minutes=480,
    )

    pred = predictor.predict_risk(engaged_student)
    assert pred.is_insufficient_data is False
    assert pred.risk_level == "low"
    assert pred.momentum_status in ("accelerating", "steady")
    assert pred.risk_score < 0.35

    factor_names = [f.factor_name for f in pred.contributing_factors]
    assert any("Mastery" in fn or "Pace" in fn for fn in factor_names)


def test_concerning_momentum_with_supportive_advice():
    predictor = StudentRiskPredictor()
    struggling_student = StudentRiskFeatures(
        student_id="std-struggling",
        active_courses_count=1,
        completed_courses_count=0,
        total_lessons_assigned=15,
        completed_lessons_count=2,
        lesson_completion_rate=0.13,
        avg_quiz_score=45.0,
        quiz_pass_rate=25.0,
        total_quiz_attempts=4,
        failed_quiz_attempts=3,
        days_since_last_activity=18,
        total_study_time_minutes=40,
    )

    pred = predictor.predict_risk(struggling_student)
    assert pred.is_insufficient_data is False
    assert pred.risk_level in ("moderate", "high")
    assert pred.momentum_status == "needs_attention"
    assert pred.risk_score >= 0.50

    # Ensure advice is encouraging and supportive
    assert len(pred.supportive_guidance) > 0
    for g in pred.supportive_guidance:
        assert not any(punitive in g.lower() for punitive in ["penalized", "failed student", "restricted", "suspended"])
