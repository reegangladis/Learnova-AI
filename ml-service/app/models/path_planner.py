from app.schemas.learning_path import (
    CoursePrerequisiteCheck,
    LearningPathRequest,
    LearningPathResponse,
    LearningPathStep,
    SkillGapAlert,
)


class LearningPathPlanner:
    """Plans ordered student learning paths with prerequisite validation and skill gap detection."""

    def plan_path(self, request: LearningPathRequest) -> LearningPathResponse:
        student_id = request.student_id
        active_enrollments = request.active_enrollments
        completed_titles = {t.lower() for t in request.completed_course_titles}
        quizzes = request.quiz_history
        catalog = request.available_courses

        # 1. Identify skill gaps from failed or low-scoring quizzes
        skill_gaps: list[SkillGapAlert] = []
        for q in quizzes:
            if not q.passed or q.percentage_score < 70.0:
                skill_gaps.append(
                    SkillGapAlert(
                        topic=q.course_title,
                        assessment_title=q.quiz_title,
                        score=round(q.percentage_score, 1),
                        recommendation=(
                            f"Score of {q.percentage_score:.1f}% indicates an opportunity to review "
                            f"key topics in '{q.course_title}' before undertaking new advanced assessments."
                        ),
                    )
                )

        # 2. Case A: In-progress active course enrollment
        if active_enrollments:
            # Pick course with highest progress or first active
            current_enr = active_enrollments[0]
            if current_enr.next_lesson_id and current_enr.next_lesson_title:
                next_step = LearningPathStep(
                    step_type="lesson_completion",
                    title=f"Complete '{current_enr.next_lesson_title}'",
                    description=f"Continue where you left off in '{current_enr.course_title}'. You have completed {current_enr.completed_lessons} of {current_enr.total_lessons} lessons.",
                    course_id=current_enr.course_id,
                    course_title=current_enr.course_title,
                    lesson_id=current_enr.next_lesson_id,
                    lesson_title=current_enr.next_lesson_title,
                    estimated_minutes=15,
                    confidence_level="high",
                )
                focus = f"Active Course: '{current_enr.course_title}' ({current_enr.completed_lessons}/{current_enr.total_lessons} completed)"
                rationale = f"Continuing sequential lesson progress in your current course '{current_enr.course_title}' maintains study velocity."
                return LearningPathResponse(
                    student_id=student_id,
                    current_focus=focus,
                    next_step=next_step,
                    prerequisite_checks=[],
                    skill_gaps=skill_gaps,
                    rationale=rationale,
                )

        # 3. Case B: Pick next course from available catalog based on prerequisites
        prereq_checks: list[CoursePrerequisiteCheck] = []
        best_candidate = None

        if catalog:
            # Check candidate courses where prerequisites are satisfied
            for cand in catalog:
                prereqs = cand.get("prerequisites", [])
                checks_for_cand: list[CoursePrerequisiteCheck] = []
                all_met = True
                for p in prereqs:
                    p_clean = str(p).lower().strip()
                    # Check if student completed a course containing prerequisite keyword
                    met = any(p_clean in ct or ct in p_clean for ct in completed_titles)
                    if not met:
                        all_met = False
                    checks_for_cand.append(
                        CoursePrerequisiteCheck(
                            prerequisite_name=str(p),
                            is_met=met,
                            evidence="Matched against completed coursework" if met else "No prior completion recorded",
                        )
                    )

                if all_met and best_candidate is None:
                    best_candidate = cand
                    prereq_checks = checks_for_cand
                    break

            if best_candidate is None:
                # Fallback to first available course
                best_candidate = catalog[0]
                prereqs = best_candidate.get("prerequisites", [])
                prereq_checks = [
                    CoursePrerequisiteCheck(
                        prerequisite_name=str(p),
                        is_met=False,
                        evidence="Prerequisite pending verification",
                    )
                    for p in prereqs
                ]

        if best_candidate:
            c_title = best_candidate.get("title", "Recommended Course")
            c_id = str(best_candidate.get("id", ""))
            next_step = LearningPathStep(
                step_type="course_enrollment",
                title=f"Enroll in '{c_title}'",
                description=best_candidate.get("short_description", f"Begin next course milestone: '{c_title}'."),
                course_id=c_id,
                course_title=c_title,
                estimated_minutes=best_candidate.get("duration_minutes", 60),
                confidence_level="high" if all(c.is_met for c in prereq_checks) else "medium",
            )
            focus = f"Ready for Next Curriculum Milestone: '{c_title}'"
            rationale = (
                f"Course '{c_title}' is the logical next step in your curriculum track."
                if all(c.is_met for c in prereq_checks)
                else f"Recommended starter course '{c_title}' to begin your learning curriculum."
            )
        else:
            next_step = LearningPathStep(
                step_type="course_enrollment",
                title="Explore Course Catalog",
                description="Browse available courses to select your next learning objective.",
                confidence_level="exploratory",
            )
            focus = "Catalog Discovery"
            rationale = "Explore our course catalog to find a subject matching your career and academic interests."

        return LearningPathResponse(
            student_id=student_id,
            current_focus=focus,
            next_step=next_step,
            prerequisite_checks=prereq_checks,
            skill_gaps=skill_gaps,
            rationale=rationale,
        )
