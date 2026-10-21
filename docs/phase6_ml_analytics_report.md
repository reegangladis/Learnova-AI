# Learnova AI — Phase 6: ML Analytics & Personalization Report
**Repository**: [Learnova-AI](https://github.com/reegangladis/Learnova-AI)  
**Tagline**: *"Learn Smarter. Learn Personally. Learn with AI."*  
**Date**: October 21, 2026  
**Status**: Completed — Ready for Review

---

## 1. Executive Summary

Phase 6 audits, hardens, and completes the machine learning analytics, multi-signal personalized course recommendations, and model governance infrastructure in Learnova AI. Rather than rebuilding existing components, the implementation cleanly extends existing backend analytics endpoints, the `ml-service` microservice, local fallback heuristics, and React frontend dashboards.

### Key Highlights
- **Multi-Signal Course Recommender**: Recommendations now integrate declared learning goals, assessment-derived skill gaps (<70% or failed quiz attempts), curriculum prerequisites, category matching, and difficulty progression, complete with transparent explanations and exclusion of active/completed enrollments.
- **Instructor Course-Level & Tenant Analytics**: Instructors can now filter studio overview metrics by specific authored courses (`course_id`) and organization boundaries (`organization_id`), with strict RBAC enforcement preventing access to unauthorized courses (403 Forbidden). Duplicate progress events are prevented from double-counting via distinct progress counts.
- **Strict ML Model Governance**: The student risk prediction model is explicitly cataloged as `status="experimental"` with provenance `provenance="synthetic_educational_benchmark"`. Retraining endpoints are protected with RBAC (`ADMIN` and `SUPER_ADMIN` only), and predictions are bounded to supportive telemetry rather than consequential or punitive decisions. Safe fallback behavior handles microservice outages seamlessly.
- **Frontend Dashboard Enhancements**: Instructor analytics now features an authored course selector dropdown for granular KPI inspection, and the student recommendation card renders distinct visual badges and rationale for skill gap remediation and goal alignment.

---

## 2. Initial Audit Findings

| Component | Audit Status | Findings & Remediation |
|---|---|---|
| `ml-service` Recommender | Incomplete | Previously only evaluated completed course title keywords; did not evaluate declared learning goals, assessment skill gaps, or course prerequisites. Extended to multi-signal scoring. |
| Model Registry & Governance | Incomplete | Defaulted to `status="production"` on load if unspecified, and lacked provenance tracking. Updated to enforce `status="experimental"` and `provenance="synthetic_educational_benchmark"`. |
| Backend ML Integration | Incomplete | Sent empty `recent_quiz_scores: []` and lacked skill-gap extraction from student `QuizAttempt` history. Extended to query finalized attempts, extract gap topics, and accept `goal`, `category_id`, and `preferred_difficulty`. |
| Local Recommender Fallback | Incomplete | Did not mirror the multi-signal ranking when `ml-service` was offline. Updated `_local_recommendations_fallback` to evaluate skill gaps, goals, prerequisites, and difficulty. |
| Instructor Overview Analytics | Incomplete | Could only aggregate across all authored courses collectively; lacked `course_id` and `organization_id` query filters. Updated repository, service, router, and frontend. |
| Model Training Authorization | Missing in Tests | Needed explicit verification that students and instructors receive 403 Forbidden when attempting to trigger model retraining. Tested and verified. |
| Frontend Recommendation Badges | Incomplete | Missing badge variants for `"skill_gap_remediation"` and `"goal_alignment"`. Implemented with icons and distinct color tokens. |

---

## 3. Implemented Features & Architecture

### 3.1 Multi-Signal Course Recommendation Engine

The recommendation pipeline operates through `ml-service` (port 8002) with seamless local Python fallback in `backend/app/services/ml_service.py`:
1. **Student Signal Aggregation**:
   - Queries student's finalized `QuizAttempt` records.
   - Extracts `skill_gaps` from failed attempts or scores below 70%, identifying target topics and quiz titles for remediation.
   - Accepts declared learning goals (`goal`), target category (`category_id`), and preferred difficulty level (`preferred_difficulty`).
2. **Exclusion Filtering**:
   - Active enrollments and completed courses are strictly excluded from recommendation candidates.
   - Draft and archived courses are excluded (`status == PUBLISHED`).
   - Tenant boundaries are respected (`organization_id` matching or global public courses).
3. **Scoring & Strategy Selection**:
   - **Skill Gap Remediation** (`strategy: "skill_gap_remediation"`, +0.35 weight): Triggered when candidate learning objectives or title match identified skill gap topics from failed assessments.
   - **Goal Alignment** (`strategy: "goal_alignment"`, +0.30 weight): Triggered when course objectives match the student's declared goal.
   - **Prerequisite Evaluation**: Checks completed courses against candidate course prerequisites (+0.08 bonus if prerequisites are satisfied; -0.15 penalty if prerequisites are missing).
   - **Category & Difficulty Progression**: Awards relevance for matching preferred category and appropriate difficulty progression.
   - **Popularity Fallback** (`strategy: "popularity_fallback"`): Used during cold start when student has 0 historical enrollments or assessments.
4. **Transparent Rationale**: Every recommendation returns an explicit, human-readable `reason` explaining why the course was selected (e.g., *"Targets skill gaps identified in your recent assessment"* or *"Aligns directly with your learning goal 'Concurrency'"*).

### 3.2 Granular Instructor & Organization Analytics

- **Endpoint**: `GET /api/v1/analytics/instructor/overview?course_id=...&organization_id=...&days=...`
- **Ownership Verification**: Validates that any requested `course_id` belongs to `current_user.id` (instructors attempting to inspect courses authored by others receive 403 Forbidden).
- **Tenant Isolation**: Non-superadmin users are restricted to their own `organization_id` via `_get_scoped_org_id`.
- **Deduplicated Completions**: `func.count(distinct(LessonProgress.id))` ensures progress events cannot artificially inflate completion metrics.
- **Frontend Dropdown**: `InstructorAnalyticsDashboard.tsx` includes an interactive course filter dropdown allowing instructors to switch between "All Authored Courses" and specific course metrics seamlessly.

### 3.3 Model Governance & Provenance Tracking

- **Dataset Provenance**: The Random Forest student risk predictor was trained on a rule-generated educational telemetry benchmark (`generate_benchmark_dataset` with 1,000 synthetic student profiles).
- **Experimental Status**: The model is explicitly cataloged as:
  ```json
  {
    "model_name": "student_risk_predictor",
    "version": "v1.0",
    "status": "experimental",
    "provenance": "synthetic_educational_benchmark"
  }
  ```
- **Non-Consequential Use**: Risk classifications (`low`, `moderate`, `high`) are presented solely as supportive learning recommendations (e.g., suggested review steps, milestone check-ins) and are never used for grading, punitive actions, or access revocation.
- **Retraining Protection**: Only users with `ADMIN` or `SUPER_ADMIN` roles can invoke `POST /api/v1/ml/train` or `POST /api/v1/ml/models/train`. Students and instructors attempting retraining receive 403 Forbidden.

---

## 4. Files & Code Changed

### Backend (`backend/`)
- `backend/app/schemas/ml.py`: Added `provenance` and `status` to `ModelVersionInfoDTO` and `TrainModelResponseDTO`.
- `backend/app/schemas/analytics.py`: Added `course_id` and `organization_id` to `InstructorOverviewResponse`.
- `backend/app/repositories/analytics_repo.py`: Enhanced `get_instructor_overview_stats` with `course_id` and `organization_id` filtering, scoped subqueries, and distinct completion counts. Added `organization_id` to `get_instructor_course_comparisons`.
- `backend/app/services/analytics_service.py`: Added course ownership validation (`Course.instructor_id == current_user.id`) and org-scoping to `get_instructor_overview`, `get_instructor_courses`, and `get_instructor_assessments`.
- `backend/app/api/v1/endpoints/analytics.py`: Added `course_id` and `organization_id` query parameters to `GET /instructor/overview` and `organization_id` to `GET /instructor/courses`.
- `backend/app/services/ml_service.py`:
  - Updated `get_recommendations`: queries student's finalized `QuizAttempt`s, derives `recent_quiz_scores` and `skill_gaps`, passes `goal`, `category_id`, and `preferred_difficulty`.
  - Updated `_local_recommendations_fallback`: implements multi-signal scoring (skill gaps, goals, prerequisites, difficulty).
  - Propagates `provenance="synthetic_educational_benchmark"` and `status="experimental"` across model status and training responses.
- `backend/app/api/v1/endpoints/ml.py`: Added missing `import uuid` and added `goal`, `category_id`, and `preferred_difficulty` parameters to `GET /recommendations`.
- `backend/tests/test_analytics.py`: Added `test_instructor_course_level_overview_filtering` and `test_instructor_unauthorized_course_filter_forbidden`.
- `backend/tests/test_ml.py`: Added `test_multi_signal_recommendations_goals_and_skill_gaps` and `test_model_training_rbac_and_provenance`.

### ML Service (`ml-service/`)
- `ml-service/app/schemas/recommendations.py`: Added `learning_goals` and `skill_gaps` to `StudentProfile`.
- `ml-service/app/schemas/admin.py`: Added `status` and `provenance` to `ModelVersionInfo` and `TrainModelResponse`.
- `ml-service/app/models/recommender.py`: Implemented multi-signal candidate scoring evaluating skill gaps (`"skill_gap_remediation"`), declared goals (`"goal_alignment"`), and prerequisites.
- `ml-service/app/models/registry.py`: Ensured default `status="experimental"` and `provenance="synthetic_educational_benchmark"`.
- `ml-service/app/api/v1/endpoints/models.py`: Returned `status="experimental"` and `provenance="synthetic_educational_benchmark"` from `POST /train`.
- `ml-service/tests/test_recommender.py`: Added `test_recommendation_with_skill_gaps_and_goals`.

### Frontend (`frontend/`)
- `frontend/src/types/analytics.ts`: Added `course_id` and `organization_id` to `InstructorOverview`.
- `frontend/src/services/analyticsService.ts`: Added `courseId` and `organizationId` parameters to `getInstructorOverview`.
- `frontend/src/pages/InstructorAnalyticsDashboard.tsx`: Added authored course selector dropdown for overview KPI filtering.
- `frontend/src/components/ml/CourseRecommendationsCard.tsx`: Added badge handlers and icons for `"skill_gap_remediation"` and `"goal_alignment"`.

---

## 5. Verification & Test Results

### 5.1 ML Microservice Tests
```bash
.venv\Scripts\pytest ml-service/tests -v
```
**Result**: 22 passed in 0.86s
- `test_recommendations_endpoint`: PASSED
- `test_predict_risk_endpoint`: PASSED
- `test_learning_path_endpoint`: PASSED
- `test_models_status_and_train_endpoint`: PASSED
- `test_ml_service_internal_auth_enforcement`: PASSED
- `test_student_feature_extractor_normal_values`: PASSED
- `test_student_feature_extractor_bounds_and_zero_division`: PASSED
- `test_insufficient_data_detection`: PASSED
- `test_course_content_similarity_computation`: PASSED
- `test_ml_health_endpoint`: PASSED
- `test_insufficient_data_behavior`: PASSED
- `test_low_risk_high_momentum`: PASSED
- `test_concerning_momentum_with_supportive_advice`: PASSED
- `test_cold_start_popularity_fallback`: PASSED
- `test_exclusion_of_enrolled_and_completed_courses`: PASSED
- `test_personalized_content_matching`: PASSED
- `test_empty_candidates_handling`: PASSED
- `test_recommendation_with_skill_gaps_and_goals`: PASSED
- `test_reproducible_benchmark_dataset`: PASSED
- `test_model_training_and_evaluation_metrics`: PASSED
- `test_registry_persistence_and_loading`: PASSED
- `test_registry_corrupt_artifact_handling`: PASSED

### 5.2 Backend Analytics & ML Tests
```bash
.venv\Scripts\pytest backend/tests/test_analytics.py backend/tests/test_ml.py -v
```
**Result**: 19 passed
- `test_student_analytics_empty_dataset`: PASSED
- `test_student_analytics_overview_and_resume`: PASSED
- `test_student_activity_and_trends`: PASSED
- `test_instructor_ownership_isolation`: PASSED
- `test_instructor_assessments_and_distributions`: PASSED
- `test_admin_organization_scoped_analytics`: PASSED
- `test_unauthorized_role_access`: PASSED
- `test_date_filtering_and_boundaries`: PASSED
- `test_instructor_course_level_overview_filtering`: PASSED
- `test_instructor_unauthorized_course_filter_forbidden`: PASSED
- `test_recommendations_unauthenticated`: PASSED
- `test_recommendations_cold_start_and_exclusion`: PASSED
- `test_recommendations_multi_tenant_isolation`: PASSED
- `test_learning_insights_cold_start`: PASSED
- `test_learning_insights_active_student`: PASSED
- `test_learning_path_next_lesson_and_skill_gap`: PASSED
- `test_model_status_rbac`: PASSED
- `test_multi_signal_recommendations_goals_and_skill_gaps`: PASSED
- `test_model_training_rbac_and_provenance`: PASSED

### 5.3 Frontend Unit & Integration Tests
```bash
npm run test
```
**Result**: 11 test suites passed, 69 passed (including `ml.test.tsx`, `aiTutor.test.tsx`, `courses.test.tsx`, `authPages.test.tsx`, `profileSecurity.test.tsx`, `routes.test.tsx`).

### 5.4 Frontend Production Build & Linting
```bash
npm run build && npm run lint
```
**Result**:
- `npm run build`: `tsc && vite build` succeeded with exit code 0.
- `npm run lint`: `eslint .` passed with 0 errors.

---

## 6. Security & Governance Audit Findings

1. **Role-Based Access Control**:
   - `GET /api/v1/ml/recommendations`: Requires authenticated student or instructor.
   - `GET /api/v1/ml/learning-insights` & `learning-path`: Scoped strictly to `current_user.id`.
   - `GET /api/v1/ml/model-status` & `POST /api/v1/ml/train`: Restricted strictly to `ADMIN` and `SUPER_ADMIN`.
2. **Cross-Tenant & Cross-Instructor Isolation**:
   - Instructors can only query course-level overview analytics for courses where `course.instructor_id == current_user.id`. Requests for other instructors' courses return HTTP 403 Forbidden.
   - Non-superadmin users are restricted to their own organization. Cross-organization query attempts return HTTP 403 Forbidden.
3. **Data Provenance Disclosure**:
   - The synthetic nature of the risk model's training data is transparently recorded in all registry descriptors and API responses via `provenance: "synthetic_educational_benchmark"` and `status: "experimental"`.

---

## 7. Remaining Limitations & Manual Verification

### Limitations
- **Empirical Training Data**: The risk model remains trained on synthetic distributions. Empirical student data should only be introduced once a real-world, privacy-cleared dataset is collected under institutional consent.
- **Offline ML Microservice Latency**: When the standalone `ml-service` is offline, the backend executes an in-process local fallback pipeline. While accurate, local execution involves scikit-learn training inside the backend worker process.

### Manual Verification Steps
1. **Student Personalization**:
   - Log in as a student at `http://localhost:5173/login`.
   - Take a quiz on Course A and score under 70%.
   - Visit the Student Dashboard (`/dashboard`) or Course Recommendations card.
   - Verify that related courses display a `"Skill Gap Remediation"` badge and clear rationale.
2. **Instructor Course Filtering**:
   - Log in as an instructor at `http://localhost:5173/login`.
   - Navigate to `/instructor/analytics`.
   - Use the course filter dropdown in the top header to select an authored course.
   - Verify KPIs and trend charts update to reflect that specific course's enrollment and completion counts.
3. **Admin Model Retraining Protection**:
   - Attempt `POST http://localhost:8000/api/v1/ml/train` with a Student or Instructor JWT cookie; verify response is 403 Forbidden.
   - Log in as an Admin and send `POST http://localhost:8000/api/v1/ml/train`; verify response contains `status="experimental"` and `provenance="synthetic_educational_benchmark"`.
