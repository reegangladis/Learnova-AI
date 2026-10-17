# Learnova AI - API Specification (Phase 1)

This document details the REST API specifications for Learnova AI services.

---

## 1. Backend Service API (`/api/v1`)

Base URL: `http://localhost:8000/api/v1`
Interactive Swagger Documentation: `http://localhost:8000/docs`
OpenAPI Specification JSON: `http://localhost:8000/api/v1/openapi.json`

### 1.1 `GET /api/v1/health`
Returns basic health and identity information for the backend service.

**Response `200 OK`**:
```json
{
  "status": "ok",
  "service": "learnova-backend",
  "version": "0.1.0"
}
```

---

### 1.2 `GET /api/v1/health/database`
Performs an active round-trip SQL query against PostgreSQL (`SELECT 1 AS alive, version() AS version`) and returns connectivity latency.

**Response `200 OK`**:
```json
{
  "status": "healthy",
  "connected": true,
  "latency_ms": 1.45,
  "version": "PostgreSQL 18.0",
  "error": null
}
```

**Response `503 Service Unavailable`** (when database is down):
```json
{
  "status": "unhealthy",
  "connected": false,
  "latency_ms": 12.3,
  "version": null,
  "error": "Connection refused"
}
```

---

### 1.3 `GET /api/v1/health/redis`
Performs an active Redis `PING` check and returns connectivity latency and server metadata.

**Response `200 OK`**:
```json
{
  "status": "healthy",
  "connected": true,
  "latency_ms": 0.85,
  "version": "7.2.4",
  "error": null
}
```

**Response `503 Service Unavailable`** (when Redis is down):
```json
{
  "status": "unhealthy",
  "connected": false,
  "latency_ms": 8.1,
  "version": null,
  "error": "Error connecting to localhost:6379"
}
```

---

### 1.4 `GET /api/v1/health/all`
Evaluates all critical system dependencies (API, PostgreSQL, Redis) and returns an aggregated diagnostics health matrix.

**Response `200 OK`**:
```json
{
  "status": "ok",
  "service": "learnova-backend",
  "version": "0.1.0",
  "environment": "development",
  "timestamp": "2026-10-04T10:30:00Z",
  "components": {
    "api": {
      "status": "healthy",
      "connected": true,
      "latency_ms": 0.0,
      "version": "0.1.0",
      "error": null
    },
    "database": {
      "status": "healthy",
      "connected": true,
      "latency_ms": 1.2,
      "version": "PostgreSQL 18.0",
      "error": null
    },
    "redis": {
      "status": "healthy",
      "connected": true,
      "latency_ms": 0.6,
      "version": "7.2.4",
      "error": null
    }
  }
}
```

---

### 1.5 `GET /api/v1/system/info`
Returns deployment metadata, active environment status, and configuration flags.

**Response `200 OK`**:
```json
{
  "app_name": "Learnova AI",
  "app_env": "development",
  "app_version": "0.1.0",
  "debug": true,
  "cors_origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
}
```

---

## 2. Authentication & Identity API (`/api/v1/auth`)

All authentication endpoints use secure server-backed sessions and HttpOnly cookies (`learnova_access_token`, `learnova_refresh_token`).

| Method | Endpoint | Description | Rate Limited | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register student account, create verification token | Yes (10/min) | No |
| `POST` | `/api/v1/auth/login` | Authenticate credentials, issue HttpOnly cookies | Yes (10/min) | No |
| `POST` | `/api/v1/auth/logout` | Revoke current session and clear auth cookies | No | Optional |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh token, issue new token family | Yes (20/min) | Cookie |
| `GET` | `/api/v1/auth/me` | Retrieve authenticated user profile and roles | No | Yes |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset token via email | Yes (5/min) | No |
| `POST` | `/api/v1/auth/reset-password` | Reset password using one-time token | Yes (5/min) | No |
| `POST` | `/api/v1/auth/change-password` | Change password for logged-in user | No | Yes |
| `POST` | `/api/v1/auth/verify-email` | Verify email address with one-time token | No | No |
| `POST` | `/api/v1/auth/resend-verification` | Resend email verification token | Yes (5/min) | No |
| `GET` | `/api/v1/auth/sessions` | List active sessions for current user | No | Yes |
| `DELETE` | `/api/v1/auth/sessions/{id}` | Revoke a specific session | No | Yes |
| `POST` | `/api/v1/auth/logout-all` | Revoke all active sessions for current user | No | Yes |

---

## 3. User Profile & Administrative Governance API (`/api/v1/users`)

| Method | Endpoint | Description | RBAC Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users/me` | Get personal profile | Authenticated User |
| `PATCH` | `/api/v1/users/me` | Update first name, last name, avatar URL | Authenticated User |
| `GET` | `/api/v1/users` | List users with pagination and search | `USER_READ` (Admin) |
| `GET` | `/api/v1/users/{id}` | Get detailed user record by ID | `USER_READ` (Admin) |
| `PATCH` | `/api/v1/users/{id}` | Update user fields (first/last/avatar) | `USER_UPDATE` (Admin) |
| `POST` | `/api/v1/users/{id}/activate` | Re-activate user account | `USER_UPDATE` (Admin) |
| `POST` | `/api/v1/users/{id}/deactivate` | Suspend user account | `USER_UPDATE` (Admin) |
| `POST` | `/api/v1/users/{id}/roles` | Assign role names (`ADMIN`, `INSTRUCTOR`, `STUDENT`) | Admin / Super Admin |

---

## 4. AI Service API (`/api/v1`)

Base URL: `http://localhost:8001/api/v1`
Interactive Swagger Documentation: `http://localhost:8001/docs`

### 4.1 `GET /api/v1/health`
Returns AI microservice identity and capabilities summary.

**Response `200 OK`**:
```json
{
  "status": "ok",
  "service": "learnova-ai-service",
  "version": "0.1.0",
  "timestamp": "2026-10-04T10:30:00Z",
  "capabilities": {
    "rag": "ready",
    "embeddings": "ready",
    "llm_factory": "ready",
    "tutor_service": "ready",
    "quiz_generator": "ready",
    "assignment_evaluator": "ready"
  }
}
```

---

## 5. ML Service API (`/api/v1`)

Base URL: `http://localhost:8002/api/v1`
Interactive Swagger Documentation: `http://localhost:8002/docs`

### 5.1 `GET /api/v1/health`
Returns ML microservice identity and data pipeline readiness.

**Response `200 OK`**:
```json
{
  "status": "ok",
  "service": "learnova-ml-service",
  "version": "0.1.0",
  "timestamp": "2026-10-04T10:30:00Z",
  "capabilities": {
    "dataset_loader": "ready",
    "feature_engineering": "ready",
    "model_registry": "ready",
    "predictor": "ready",
    "training_pipeline": "ready",
    "evaluation_metrics": "ready"
  }
}
```

---

## 6. Standardized Error Response Envelope

All services follow consistent error response envelopes:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested resource was not found.",
    "details": {}
  }
}
```

---

## 7. Course Management & Content Authoring APIs (Phase 3)

Base URL: `http://localhost:8000/api/v1`

### 7.1 Course Categories

| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `GET` | `/api/v1/course-categories` | List active course categories (`?include_inactive=true` for admins) | Public |
| `POST` | `/api/v1/course-categories` | Create a new category | Admin / Super Admin (`COURSE_CREATE`) |
| `PATCH` | `/api/v1/course-categories/{id}` | Update category name, description, active status | Admin / Super Admin (`COURSE_UPDATE`) |
| `DELETE` | `/api/v1/course-categories/{id}` | Soft-deactivate or delete unused category | Admin / Super Admin (`COURSE_DELETE`) |

### 7.2 Courses

| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `GET` | `/api/v1/courses` | Search, filter (category, difficulty), and paginate courses | Public (published only) / Instructor / Admin |
| `GET` | `/api/v1/courses/{id}` | Retrieve course detail with full syllabus breakdown | Public (if published) / Owner / Admin |
| `POST` | `/api/v1/courses` | Create a new course in `draft` status | Instructor (`COURSE_CREATE`) / Admin |
| `PATCH` | `/api/v1/courses/{id}` | Update course metadata, learning objectives, prerequisites | Owner Instructor / Admin |
| `DELETE` | `/api/v1/courses/{id}` | Delete draft course and curriculum | Owner Instructor / Admin |
| `POST` | `/api/v1/courses/{id}/publish` | Validate completeness rules and transition course to `published` | Owner Instructor (`COURSE_PUBLISH`) / Admin |
| `POST` | `/api/v1/courses/{id}/archive` | Archive course to prevent new enrollments | Owner Instructor / Admin |

### 7.3 Course Modules & Curriculum

| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `GET` | `/api/v1/courses/{id}/modules` | List all modules and ordered lessons in a course | Public (if published) / Owner / Admin |
| `POST` | `/api/v1/courses/{id}/modules` | Add a module to a course | Owner Instructor / Admin |
| `PATCH` | `/api/v1/modules/{module_id}` | Update module title and description | Owner Instructor / Admin |
| `DELETE` | `/api/v1/modules/{module_id}` | Delete module and cascade reorder | Owner Instructor / Admin |
| `POST` | `/api/v1/modules/{module_id}/reorder` | Move module to target zero-based order index | Owner Instructor / Admin |

### 7.4 Lessons & Content

| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `POST` | `/api/v1/modules/{module_id}/lessons` | Create lesson (`text`, `video`, `pdf`, `external_resource`) | Owner Instructor / Admin |
| `PATCH` | `/api/v1/lessons/{lesson_id}` | Update lesson content, resource URL reference, preview flag | Owner Instructor / Admin |
| `DELETE` | `/api/v1/lessons/{lesson_id}` | Delete lesson and recompact module order | Owner Instructor / Admin |
| `POST` | `/api/v1/lessons/{lesson_id}/reorder` | Move lesson to target zero-based order index in module | Owner Instructor / Admin |

---

## 8. Student Learning System & Progress Tracking APIs (Phase 4)

Base URL: `http://localhost:8000/api/v1`

### 8.1 Enrollments (`/api/v1/enrollments`)

| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `POST` | `/api/v1/enrollments` | Enroll the authenticated student in a published course | Authenticated (`STUDENT`, `INSTRUCTOR`, `ADMIN`) |
| `GET` | `/api/v1/enrollments/me` | List enrolled courses for current student with progress | Authenticated |
| `GET` | `/api/v1/enrollments/{id}` | Get enrollment detail with course and progress | Student (owner) / Admin |
| `DELETE` | `/api/v1/enrollments/{id}` | Drop / unenroll from course (soft status `dropped`) | Student (owner) / Admin |

**Enroll Request (`POST /api/v1/enrollments`)**:
```json
{
  "course_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

**Enroll Response (`201 Created`)**:
```json
{
  "id": "e0a1b2c3-d4e5-4f67-8901-234567890abc",
  "user_id": "u1a2b3c4-d4e5-4f67-8901-234567890abc",
  "course_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "organization_id": null,
  "status": "active",
  "enrolled_at": "2026-10-11T10:00:00Z",
  "completed_at": null,
  "created_at": "2026-10-11T10:00:00Z",
  "updated_at": "2026-10-11T10:00:00Z",
  "progress_percentage": 0.0,
  "completed_lessons_count": 0,
  "total_lessons_count": 12,
  "next_lesson_id": "les-1"
}
```

---

### 8.2 Learning Experience & Progress (`/api/v1/learning`)

| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `GET` | `/api/v1/learning/courses/{course_id}` | Retrieve course learning syllabus with nested modules, lessons, and per-lesson completion states | Enrolled Student / Instructor (owner) / Admin |
| `GET` | `/api/v1/learning/courses/{course_id}/progress` | Retrieve aggregated progress metric (% completed, counts, completed lesson IDs, course completion status) | Enrolled Student / Instructor (owner) / Admin |
| `GET` | `/api/v1/learning/courses/{course_id}/resume` | Retrieve the next incomplete lesson payload or first lesson if finished | Enrolled Student / Instructor (owner) / Admin |
| `PUT` | `/api/v1/learning/lessons/{lesson_id}/progress` | Idempotently mark lesson completed or incomplete (`is_completed: boolean`) | Enrolled Student / Admin |
| `GET` | `/api/v1/learning/lessons/{lesson_id}/progress` | Retrieve individual lesson progress status for current user | Enrolled Student / Admin |

**Progress Update Request (`PUT /api/v1/learning/lessons/{id}/progress`)**:
```json
{
  "is_completed": true
}
```

**Progress Update Response (`200 OK`)**:
```json
{
  "lesson_id": "les-1",
  "is_completed": true,
  "completed_at": "2026-10-11T10:15:00Z",
  "course_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "course_progress_percentage": 25.0,
  "completed_lessons_count": 3,
  "total_lessons_count": 12,
  "is_course_completed": false
}
```

---

## 9. Quiz & Assessment System (`/api/v1/quizzes`, `/api/v1/quiz-attempts`)

### 9.1 Instructor Quiz Management (`/api/v1/quizzes`)

| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `POST` | `/api/v1/quizzes` | Create a draft quiz for an owned course | Instructor / Admin |
| `GET` | `/api/v1/quizzes/instructor/me` | List quizzes created by authenticated instructor | Instructor / Admin |
| `GET` | `/api/v1/quizzes/{quiz_id}` | Get full quiz details with questions and answer keys | Instructor (owner) / Admin |
| `PATCH` | `/api/v1/quizzes/{quiz_id}` | Update quiz parameters (passing score, duration, etc.) | Instructor (owner) / Admin |
| `DELETE` | `/api/v1/quizzes/{quiz_id}` | Delete a draft quiz | Instructor (owner) / Admin |
| `POST` | `/api/v1/quizzes/{quiz_id}/publish` | Validate completeness (min 1 question, valid options, positive points) and publish | Instructor (owner) / Admin |
| `POST` | `/api/v1/quizzes/{quiz_id}/archive` | Archive a published quiz | Instructor (owner) / Admin |
| `POST` | `/api/v1/quizzes/{quiz_id}/questions` | Add a question with options and correct answers | Instructor (owner) / Admin |
| `PATCH` | `/api/v1/quizzes/{quiz_id}/questions/{question_id}` | Update question text, points, or options | Instructor (owner) / Admin |
| `DELETE` | `/api/v1/quizzes/{quiz_id}/questions/{question_id}` | Remove a question from a draft quiz | Instructor (owner) / Admin |
| `POST` | `/api/v1/quizzes/{quiz_id}/questions/reorder` | Reorder questions in a draft quiz | Instructor (owner) / Admin |

**Create Quiz Request (`POST /api/v1/quizzes`)**:
```json
{
  "course_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "title": "Module 1 Mastery Assessment",
  "description": "Comprehensive knowledge check covering fundamental syntax and data models.",
  "instructions": "All questions must be answered within 30 minutes. Pass mark is 75%.",
  "duration_minutes": 30,
  "passing_score_percentage": 75.0,
  "max_attempts": 3,
  "shuffle_questions": false,
  "shuffle_options": false
}
```

**Question Types Supported**:
1. `single_choice`: Awards points when selected option ID matches the correct option.
2. `true_false`: Awards points when selected option matches the single true/false key.
3. `multiple_select`: Deterministic all-or-nothing grading; awards points only when all correct option IDs and no incorrect option IDs are selected.

---

### 9.2 Student Assessment Lifecycle (`/api/v1/learning/courses/{course_id}/quizzes`, `/api/v1/quiz-attempts`)

| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `GET` | `/api/v1/learning/courses/{course_id}/quizzes` | List published quizzes with attempt counts, best score, and eligibility for enrolled student | Enrolled Student / Instructor (owner) / Admin |
| `GET` | `/api/v1/quizzes/{quiz_id}/take` | Student-facing quiz view (strictly strips answer keys, `is_correct`, and internal metadata) | Enrolled Student / Instructor (owner) / Admin |
| `POST` | `/api/v1/quizzes/{quiz_id}/attempts` | Start a new assessment attempt with server-side timestamp & active attempt validation | Enrolled Student / Admin |
| `PUT` | `/api/v1/quiz-attempts/{attempt_id}/answers/{question_id}` | Concurrency-safe, autosaved answer recording during active attempt | Attempt Owner / Admin |
| `POST` | `/api/v1/quiz-attempts/{attempt_id}/submit` | Finalize and grade attempt; idempotent server-side scoring and pass/fail evaluation | Attempt Owner / Admin |
| `GET` | `/api/v1/quiz-attempts/{attempt_id}/result` | Graded result details including score, percentage, outcome, and feedback | Attempt Owner / Admin |
| `GET` | `/api/v1/quizzes/{quiz_id}/attempts/me` | History of all attempts for this quiz by the current student | Authenticated Student / Admin |

**Submit Attempt Response (`200 OK`)**:
```json
{
  "attempt_id": "b1c2d3e4-f5a6-47b8-9012-3456789abcde",
  "quiz_id": "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
  "quiz_title": "Module 1 Mastery Assessment",
  "attempt_number": 1,
  "status": "completed",
  "started_at": "2026-10-11T12:00:00Z",
  "submitted_at": "2026-10-11T12:18:30Z",
  "time_spent_seconds": 1110,
  "score": 40.0,
  "max_score": 50.0,
  "percentage_score": 80.0,
  "passed": true,
  "passing_score_percentage": 75.0,
  "can_retake": true,
  "attempts_remaining": 2,
  "question_results": [
    {
      "question_id": "q1",
      "question_text": "What is the runtime complexity of hash map lookup?",
      "question_type": "single_choice",
      "points_possible": 10,
      "points_awarded": 10,
      "is_correct": true,
      "selected_option_ids": ["opt1"],
      "correct_option_ids": ["opt1"],
      "explanation": "Hash maps utilize hashing algorithms providing O(1) amortized lookup."
    }
  ]
}
```---

## 10. Analytics, Insights & Role-Based Dashboards (`/api/v1/analytics`)

The Phase 6 Analytics API delivers role-isolated, multi-tenant performance analytics, activity trends, and assessment statistics. All calculations are executed directly within PostgreSQL / SQLAlchemy queries avoiding N+1 overhead and memory exhaustion.

### 10.1 Metric Definitions and Calculation Formulas

| Metric | Formula | Exclusions / Boundary Conditions |
|---|---|---|
| **Course Completion Rate** | `(Completed Enrollments / Total Eligible Enrollments) * 100` | Excludes enrollments outside tenant / selected date range. Zero denominator evaluates to `0.0`. |
| **Lesson Progress Rate** | `(Completed Lessons / Total Lessons) * 100` | Evaluated across enrolled courses. If no lessons exist, evaluates to `0.0`. |
| **Quiz Pass Rate** | `(Passed Finalized Attempts / Total Finalized Attempts) * 100` | **Strictly excludes** `in_progress` (unfinished) attempts. Zero denominator returns `0.0`. |
| **Average Quiz Score** | `AVG(percentage_score)` over finalized attempts | Excludes unsubmitted attempts. Returns `0.0` if no attempts finalized. |
| **Active Users** | Count of distinct users with `is_active = True` | Super Admin sees global counts; Organization Admin is strictly scoped to tenant. |

---

### 10.2 Student Analytics (`/api/v1/analytics/student`)

Provides personal learning progression, assessment records, and resume-learning actions. Strictly restricted to the authenticated student's own records.

| Method | Endpoint | Query Parameters | Description | Permissions |
|---|---|---|---|---|
| `GET` | `/api/v1/analytics/student/overview` | `start_date`, `end_date` (ISO-8601 date, optional) | Summary metrics (enrolled, completed, progress %, lessons, quiz pass rate, avg score, recent activity, resume cards, trends) | Authenticated Student / Admin |
| `GET` | `/api/v1/analytics/student/activity` | `limit` (int, default 20), `offset` (int, default 0) | Chronological log of lesson completions and quiz submissions with titles and timestamps | Authenticated Student / Admin |
| `GET` | `/api/v1/analytics/student/assessments` | `course_id` (UUID, optional) | Assessment breakdown: finalized attempts, average score, pass rate, score distribution quartiles, and recent quiz scores | Authenticated Student / Admin |

**Student Overview Response (`200 OK`)**:
```json
{
  "total_enrolled_courses": 4,
  "courses_in_progress": 2,
  "courses_completed": 2,
  "overall_progress_percentage": 68.5,
  "lessons_completed": 24,
  "lessons_remaining": 11,
  "quiz_attempts_count": 8,
  "average_quiz_score": 84.2,
  "quiz_pass_rate": 87.5,
  "recent_activity": [
    {
      "activity_type": "quiz_submission",
      "title": "Module 1 Mastery Assessment",
      "timestamp": "2026-10-12T09:40:00Z",
      "details": {
        "score": 42.0,
        "max_score": 50.0,
        "percentage": 84.0,
        "passed": true
      }
    }
  ],
  "recent_quiz_results": [
    {
      "quiz_id": "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
      "quiz_title": "Module 1 Mastery Assessment",
      "attempt_number": 1,
      "percentage_score": 84.0,
      "passed": true,
      "submitted_at": "2026-10-12T09:40:00Z"
    }
  ],
  "resume_learning": [
    {
      "course_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "course_title": "Advanced Distributed Systems",
      "progress_percentage": 50.0,
      "next_lesson_id": "les-4",
      "next_lesson_title": "Consensus Protocols with Raft",
      "last_activity_at": "2026-10-12T08:15:00Z"
    }
  ],
  "progress_trends": [
    {
      "date": "2026-10-10",
      "lessons_completed": 3,
      "quizzes_completed": 1
    }
  ]
}
```

---

### 10.3 Instructor Analytics (`/api/v1/analytics/instructor`)

Provides course management metrics and assessment performance exclusively for courses authored/owned by the authenticated instructor. Cross-instructor and cross-tenant leakage is prevented at the database query layer.

| Method | Endpoint | Query Parameters | Description | Permissions |
|---|---|---|---|---|
| `GET` | `/api/v1/analytics/instructor/overview` | `start_date`, `end_date` (ISO-8601 date, optional) | Aggregated instructor stats: courses, enrollments (active, completed, dropped), completion rate, quiz attempts, pass rate, avg score, trends | Instructor (owner) / Admin |
| `GET` | `/api/v1/analytics/instructor/courses` | `category_id` (UUID, opt), `is_published` (bool, opt) | Granular course-by-course metrics: enrollment counts by status, completion rate, lesson progress %, and student count | Instructor (owner) / Admin |
| `GET` | `/api/v1/analytics/instructor/assessments` | `course_id` (UUID, opt) | Quiz participation metrics, pass rates, average scores, and 4-quartile score distributions for owned courses | Instructor (owner) / Admin |

**Instructor Course Comparison Item (`200 OK`)**:
```json
{
  "course_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "title": "Modern Cloud Architecture",
  "is_published": true,
  "total_enrollments": 45,
  "active_enrollments": 32,
  "completed_enrollments": 10,
  "dropped_enrollments": 3,
  "completion_rate": 22.2,
  "average_lesson_progress": 64.0,
  "quiz_attempts_count": 28,
  "quiz_pass_rate": 89.3,
  "average_quiz_score": 81.5
}
```

---

### 10.4 Administrator Analytics (`/api/v1/analytics/admin`)

Organization-scoped administrative analytics. Admins can view analytics only within their assigned organization. Super Admins may query cross-tenant metrics or supply an optional `organization_id` filter.

| Method | Endpoint | Query Parameters | Description | Permissions |
|---|---|---|---|---|
| `GET` | `/api/v1/analytics/admin/overview` | `start_date`, `end_date`, `organization_id` (optional for Super Admin) | Tenant-level summary: total/active users, user counts by role, total/published courses, enrollments, completion rate, assessment stats, platform activity, trends | Admin / Super Admin |
| `GET` | `/api/v1/analytics/admin/users` | `start_date`, `end_date`, `organization_id` | User growth metrics, role distribution counts, active vs inactive ratio, and registration trends | Admin / Super Admin |
| `GET` | `/api/v1/analytics/admin/courses` | `category_id`, `organization_id` | Platform-wide course catalog health: publication ratios, enrollments per course, and top performing courses | Admin / Super Admin |
| `GET` | `/api/v1/analytics/admin/enrollments` | `start_date`, `end_date`, `organization_id` | Enrollment lifecycle statistics: active, completed, dropped counts, completion rates, and enrollment timeline trends | Admin / Super Admin |

**Admin Overview Response (`200 OK`)**:
```json
{
  "total_users": 150,
  "active_users": 142,
  "users_by_role": {
    "student": 125,
    "instructor": 20,
    "admin": 5
  },
  "total_courses": 18,
  "published_courses": 14,
  "total_enrollments": 320,
  "completed_enrollments": 78,
  "overall_completion_rate": 24.4,
  "total_quiz_attempts": 412,
  "average_quiz_score": 79.8,
  "overall_quiz_pass_rate": 82.5,
  "recent_activity": [
    {
      "activity_type": "user_registration",
      "title": "New User Registered",
      "timestamp": "2026-10-12T10:12:00Z",
      "details": { "user_email": "jane.doe@example.com", "role": "student" }
    }
  ],
  "enrollment_trends": [
    {
      "date": "2026-10-10",
      "enrollments_count": 12,
      "completions_count": 3
    }
  ]
}
```

---

## 11. AI Tutor, RAG & Document Ingestion APIs (`/api/v1/ai`)

Phase 7 implements course-aware pedagogical AI tutoring powered by Retrieval-Augmented Generation (RAG).

### 11.1 Endpoints Summary

| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `POST` | `/api/v1/ai/chat` | Submit a question and receive a grounded answer with citations and follow-ups | Authenticated Student enrolled in course / Instructor / Admin |
| `GET` | `/api/v1/ai/conversations` | List conversation threads owned by the authenticated student | Authenticated User |
| `GET` | `/api/v1/ai/conversations/{conversation_id}` | Retrieve conversation history with message citations | Conversation Owner |
| `DELETE` | `/api/v1/ai/conversations/{conversation_id}` | Delete a conversation and associated message history | Conversation Owner |
| `POST` | `/api/v1/ai/ingestion/courses/{course_id}` | Request RAG ingestion of published course lesson materials | Course Instructor / Org Admin / Super Admin |
| `GET` | `/api/v1/ai/ingestion/courses/{course_id}/status` | Inspect chunk count, last ingestion timestamp, and active jobs | Enrolled Student / Instructor / Admin |
| `POST` | `/api/v1/ai/ingestion/lessons/{lesson_id}` | Reprocess and re-embed a specific lesson upon content updates | Course Instructor / Org Admin / Super Admin |

### 11.2 `POST /api/v1/ai/chat`
Submit a question with optional course and lesson context. Grounded answers are generated using similarity retrieval over authorized course materials.

**Request Body**:
```json
{
  "message": "Explain the CAP theorem and how it applies to distributed databases",
  "course_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "lesson_id": "7fa85f64-5717-4562-b3fc-2c963f66afa7",
  "conversation_id": "4fa85f64-5717-4562-b3fc-2c963f66afa8"
}
```

**Response `200 OK`**:
```json
{
  "conversation_id": "4fa85f64-5717-4562-b3fc-2c963f66afa8",
  "message_id": "5fa85f64-5717-4562-b3fc-2c963f66afa9",
  "role": "assistant",
  "content": "According to the course materials, the CAP theorem states that a distributed data store can guarantee at most two out of Consistency, Availability, and Partition tolerance...",
  "grounded_in_sources": true,
  "citations": [
    {
      "chunk_id": "6fa85f64-5717-4562-b3fc-2c963f66afa0",
      "course_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "lesson_id": "7fa85f64-5717-4562-b3fc-2c963f66afa7",
      "lesson_title": "CAP Theorem and Consistency Models",
      "similarity_score": 0.892,
      "snippet": "Brewer's theorem states any distributed data store can only guarantee 2 of 3..."
    }
  ],
  "follow_up_suggestions": [
    "How does PACELC theorem extend the CAP theorem?",
    "Can you provide a concrete example of an AP database?"
  ],
  "tokens_used": 284
}
```

### 11.3 Ingestion Status Response (`200 OK`)
```json
{
  "course_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "total_chunks": 18,
  "last_ingested_at": "2026-10-12T14:30:00Z",
  "active_jobs": 0,
  "recent_status": "completed"
}
```


