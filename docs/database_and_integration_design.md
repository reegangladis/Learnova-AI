# ExcelR Learnova — Database & Integration Design Document

**Document Version:** 1.0  
**Target Platform:** ExcelR Learnova — Learning & Progress Platform  
**Integration Partner:** ExcelR Track360 Operational Management Platform  
**Author:** Senior Software Architect & Full-Stack Integration Engineer  
**Date:** October 28, 2026  

---

## 1. Executive Summary & Architectural Separation of Concerns

The goal of this architectural transformation is to unify **ExcelR Learnova** (the modern Learning Management System) with **ExcelR Track360** (the authoritative operational progress and compliance tracking engine) into a cohesive enterprise learning ecosystem.

### Core Architectural Principle
To eliminate data silos, conflicting calculation engines, and synchronization drift, responsibilities are strictly divided according to functional domain:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EXCELR LEARNING ECOSYSTEM                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌───────────────────────────────────┐    ┌───────────────────────────────────┐
│          EXCELR LEARNOVA          │    │          EXCELR TRACK360          │
│        (Learning Platform)        │    │       (Operational Master)        │
├───────────────────────────────────┤    ├───────────────────────────────────┤
│ • Course Catalog & Syllabus       │    │ • Candidate Master (Golden ID)    │
│ • Modules, Lessons, Rich Text     │    │ • Authoritative Assignment Status │
│ • Video Player & Streaming        │    │   (Not submitted/Submitted/       │
│ • Lesson Completion Tracking      │    │    Redo/Done)                     │
│ • Learner Learning Experience     │    │ • Mandatory Evaluator Redo Notes  │
│ • Staff Learning Administration   │    │ • Project Allocation Queue        │
│ • Cache & Display of Track360     │    │ • 15 Business-Day SLA Engine      │
│   Operational Metrics             │    │ • Dropped Project Audit Logs      │
│ • Public / Demo Showcase          │    │ • 2-Stage Certificate Approval    │
│                                   │    │ • 3/6/9 Month Duration Calculator │
│                                   │    │ • Cryptographic QR Verification   │
└───────────────────────────────────┘    └───────────────────────────────────┘
```

**Golden Rule of Data Authority:**  
Learnova never maintains independent authoritative state for candidate master records, assignment evaluation statuses, project allocation SLA queues, or certificate issuance credentials. Learnova functions as the rich presentation and learning delivery layer, consuming Track360 via strict REST/JSON APIs, caching data with deterministic invalidation, and exposing operational progress directly in learner and coordinator views.

---

## 2. Learnova Database Schema & Current Alembic Migration State

Learnova is built on **PostgreSQL 15+** utilizing **SQLAlchemy 2.0 Async ORM** and managed by **Alembic** migrations located in `backend/alembic/versions/`.

### Current Table Inventory (27 Retained Tables)
| Table Name | Category | Primary Function | Authority |
|---|---|---|---|
| `users` | Auth & Identity | Learnova LMS user accounts (admin, instructors, learners) | Learnova Local / SSO |
| `roles` | RBAC | System roles (`SUPER_ADMIN`, `ADMIN`, `INSTRUCTOR`, `STUDENT`) | Learnova Local |
| `permissions` | RBAC | Fine-grained capability definitions | Learnova Local |
| `user_roles` | RBAC | Many-to-many user to role mapping | Learnova Local |
| `role_permissions` | RBAC | Many-to-many role to permission mapping | Learnova Local |
| `audit_logs` | Security | Immutable login, RBAC change, and security audit log | Learnova Local |
| `refresh_tokens` | Security | Rotating JWT refresh token family and revocation store | Learnova Local |
| `revoked_tokens` | Security | Explicitly blacklisted access tokens | Learnova Local |
| `user_sessions` | Security | Active IP, user-agent, and session heartbeat tracking | Learnova Local |
| `courses` | Learning | Master course curriculum (title, code, description, tier) | Learnova Local |
| `course_categories` | Learning | Taxonomy classification (Data Science, Cloud, AI, etc.) | Learnova Local |
| `modules` | Learning | Course chapters / syllabus units | Learnova Local |
| `lessons` | Learning | Discrete learning units (video lessons, text guides, code) | Learnova Local |
| `lesson_resources` | Learning | Downloadable code, datasets, PDF lecture notes | Learnova Local |
| `enrollments` | Learning | Course enrollment relation linking user to course | Learnova Local (LMS) |
| `lesson_progress` | Learning | Granular per-lesson completion status & timestamps | Learnova Local |
| `quizzes` | Assessment | Formative knowledge checks attached to courses/modules | Learnova Local |
| `quiz_questions` | Assessment | Multiple-choice, multiple-select, and code questions | Learnova Local |
| `quiz_options` | Assessment | Possible answers with correct answer indicators | Learnova Local |
| `quiz_attempts` | Assessment | Student submission sessions for quizzes | Learnova Local |
| `quiz_answers` | Assessment | Individual option choices submitted by students | Learnova Local |
| `media_assets` | Media | S3/MinIO bucket references for video and thumbnail files | Learnova Local |
| `tags` | Taxonomy | Tag keywords for courses and discovery | Learnova Local |
| `course_tags` | Taxonomy | Association table for course tags | Learnova Local |
| `system_settings` | Core | Dynamic platform settings and maintenance toggles | Learnova Local |
| `notifications` | Engagement | System notifications and reminders | Learnova Local |
| `notification_preferences` | Engagement | Learner notification channel preferences | Learnova Local |

### Alembic Migration State
- **Revision 001_initial_schema**: Base identity, roles, permissions, and audit logs.
- **Revision 002_courses_and_curriculum**: Courses, modules, lessons, resources, and categories.
- **Revision 003_enrollments_and_progress**: LMS course enrollments and lesson progress telemetry.
- **Revision 004_quizzes_and_assessments**: Assessment definitions, question banks, and attempt grading.

All tables are maintained in `backend/app/models/`. No destructive table drops were executed; deprecated synthetic ML prediction tables (`student_churn_predictions`, `rag_document_chunks`) have been decommissioned from active service dependencies while retaining schema migration backward compatibility.

---

## 3. ExcelR Track360 Schema & Cross-System Entity Mapping

Track360 is built with PostgreSQL 15, FastAPI, and Alembic (migrated through Phase 12). It manages 37 authoritative operational tables.

### Explicit Cross-System Entity Mapping
| ExcelR Domain Entity | Learnova Table (LMS) | Track360 Authoritative Table | Sync Relationship & Rules |
|---|---|---|---|
| **Learner Identity** | `users` (id, email) | `candidates` (id, candidate_number, first_name, last_name, email, phone) | **Track360 is Authoritative Golden Master**. Candidate numbers (e.g. `EXCELR-2026-0042`) originate in Track360. Learnova references `candidate_id` as external foreign key. |
| **Course Master** | `courses` (id, title, slug) | `courses` (id, course_code, course_name, nasscom_aligned) | Synchronized on course code. Learnova manages video/lesson hierarchy; Track360 tracks course codes for certificate templates. |
| **Batch Management** | N/A (grouped by course) | `batches` (id, course_id, batch_code, start_date, status) | **Track360 is Authoritative**. Batch codes originate in Track360; Learnova displays batch association via API. |
| **Course Enrollment** | `enrollments` (user_id, course_id, status) | `enrollments` (candidate_id, batch_id, status) | Track360 manages operational enrollment lifecycle (`Enrolled`, `Dropped`, `Completed`). Learnova LMS enrollment reflects access to lessons. |
| **Assignments** | N/A (Instructions only) | `assignments`, `assignment_submissions` | **Track360 is Authoritative Golden Master**. Statuses: `Not submitted`, `Submitted`, `Redo`, `Done`. `Redo` requires evaluator note &ge; 5 characters. |
| **Project Allocation** | N/A | `allocation_queue`, `project_groups`, `group_allocations` | **Track360 is Authoritative Golden Master**. Real-time SLA engine: &le;15 business days target. Overdue flags calculated by Track360. |
| **Dropped Projects** | N/A | `dropped_projects` (allocation_id, reason, dropped_by, created_at) | **Track360 is Authoritative**. Mandatory drop justification &ge; 10 characters. Never hard deleted; full historical audit preserved. |
| **Internship Duration** | N/A | `certificates` (accredited_duration_months) | **Track360 is Authoritative Calculator**. 1 project = 3 months, 2 projects = 6 months, 3+ projects = 9 months. |
| **Certificate Approvals** | N/A | `certificates`, `certificate_approvals` | **Track360 is Authoritative**. Two-stage signoff: Coordinator Stage 1 approval followed by Delivery Head Stage 2 approval. |
| **Public Verification** | N/A | `certificates` (serial_number, verification_token, qr_code) | **Track360 is Authoritative**. Zero-auth public verification page `/verify/{serial_number}`. |

---

## 4. Integration Architecture & HTTP Client Contracts

### Communication Pattern
Learnova communicates with Track360 via a hardened, asynchronous HTTP client service (`backend/app/services/track360_service.py`).

```
┌────────────────────────────────┐                 ┌────────────────────────────────┐
│        EXCELR LEARNOVA         │                 │        EXCELR TRACK360         │
│                                │                 │                                │
│   ┌────────────────────────┐   │    HTTPS/JSON   │   ┌────────────────────────┐   │
│   │     FastAPI Router     │   │ ──────────────> │   │   Track360 API v1      │   │
│   │   /api/v1/track360/*   │   │  Bearer Auth    │   │ /api/v1/candidates     │   │
│   └───────────┬────────────┘   │                 │   │ /api/v1/assignments    │   │
│               │                │                 │   │ /api/v1/projects       │   │
│   ┌───────────▼────────────┐   │                 │   │ /api/v1/certificates   │   │
│   │    Track360Client      │   │                 │   └────────────────────────┘   │
│   │  • Connection Pooling  │   │                 │                                │
│   │  • Timeout (5.0s)      │   │                 │                                │
│   │  • Circuit Breaker     │   │                 │                                │
│   │  • Mock Fallback       │   │                 │                                │
│   └───────────┬────────────┘   │                 │                                │
│               │                │                 │                                │
│   ┌───────────▼────────────┐   │                 │                                │
│   │      Redis Cache       │   │                 │                                │
│   │  • Candidates (300s)   │   │                 │                                │
│   │  • Reports (60s)       │   │                 │                                │
│   └────────────────────────┘   │                 │                                │
└────────────────────────────────┘                 └────────────────────────────────┘
```

### Authentication Contract
1. **Service Account Tokens**: Learnova authenticates to Track360 using a dedicated service credential (`TRACK360_SERVICE_EMAIL` and `TRACK360_SERVICE_PASSWORD`).
2. **Bearer Token Injection**: All requests pass `Authorization: Bearer <jwt_token>` in HTTP headers.
3. **Session Re-use**: Bearer tokens are cached in Redis and refreshed automatically upon expiry (HTTP 401).

### Resilience, Timeouts & Circuit Breaking
- **Timeout Policy**: Strict 5.0-second timeout on all outbound Track360 HTTP requests (`TRACK360_TIMEOUT_SECONDS=5.0`).
- **Connection Retry**: 3 attempts with exponential backoff (0.5s, 1.0s, 2.0s) for idempotent GET requests.
- **Circuit Breaker & Fallback**: If Track360 is temporarily unreachable, Learnova routes switch transparently to the deterministic `Track360MockAdapter`. This ensures that local developer environments, CI pipelines, and temporary network disruptions never bring down the Learnova LMS front-office.
- **Cache TTLs**:
  - Operational KPI Reports: 60 seconds.
  - Candidate Profile Summary: 300 seconds.
  - Allocation Queue: 30 seconds.
  - Immediate Cache Eviction: Any status update (Redo note, grading change, project drop) invalidates relevant cache keys immediately.

---

## 5. Input Validation & Track360 Business Rule Enforcement

Learnova implements strict Pydantic v2 validation models (`backend/app/schemas/track360.py`) that strictly mirror Track360 business invariants:

1. **Mandatory Evaluator Feedback for Redo**:
   ```python
   @model_validator(mode="after")
   def validate_redo_note(self) -> "BulkAssignmentUpdateItem":
       if self.status in (AssignmentBusinessStatus.REDO, "CORRECTIONS_REQUESTED"):
           if not self.evaluator_note or len(self.evaluator_note.strip()) < 5:
               raise ValueError("Evaluator note is mandatory (min 5 characters) when marking assignment as Redo.")
       return self
   ```
2. **Mandatory Justification for Dropped Project**:
   ```python
   @field_validator("reason")
   @classmethod
   def validate_reason(cls, v: str) -> str:
       clean = v.strip()
       if len(clean) < 10:
           raise ValueError("A detailed drop reason (at least 10 characters) is mandatory.")
       return clean
   ```
3. **Accredited Internship Duration Calculation**:
   ```
   1 Internship Project Completed  ──> 3 Months Accredited
   2 Internship Projects Completed ──> 6 Months Accredited
   3+ Internship Projects Completed ─> 9 Months Accredited
   ```

---

## 6. Data Migration Strategy for Legacy ExcelR Spreadsheets

ExcelR currently maintains historical records across distributed spreadsheets containing approximately **69,000 candidate profiles** and **285,000 historical assignment/enrollment records**.

### Migration Architecture Pipeline

```
┌─────────────────────────────────┐
│     Legacy ExcelR Spreadsheets  │
│  (69k candidates, 285k rows)    │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     Staging Database Tables     │
│  • raw_candidates_staging       │
│  • raw_enrollments_staging      │
│  • raw_submissions_staging      │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     Deduplication & Hygiene     │
│  1. Email normalization         │
│  2. Phone E.164 standardization │
│  3. Roll number canonicalization│
│  4. Fuzzy name conflict alert   │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     Dry-Run Validation Engine   │
│  • Reject invalid status values │
│  • Flag orphan submissions      │
│  • Output reconciliation CSV    │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     Production Batch Ingestion  │
│  • Upsert Candidates (Track360) │
│  • Seed LMS Users (Learnova)    │
│  • Link Enrollments & Batches   │
│  • Generate Migration Audit Log │
└─────────────────────────────────┘
```

### Deduplication & Reconciliation Rules
1. **Primary Golden Key**: Candidate Email (lowercase, stripped of leading/trailing whitespace).
2. **Secondary Disambiguation Key**: Phone Number (E.164 formatted, e.g. `+91XXXXXXXXXX`).
3. **Roll Number Precedence**: Where a candidate has multiple spreadsheet entries due to enrolling in multiple batches, the candidate record is unified into a single Golden Record in Track360, while creating multiple records in `enrollments`.
4. **Data Quality Warnings**:
   - Records with identical phone numbers but differing names are routed to a human review queue (`migration_exceptions`).
   - Assignment records with missing evaluation dates default to the batch completion timestamp with an `AUDIT_LEGACY_IMPORT` tag.
5. **Rollback Strategy**:
   - Every batch ingestion is executed inside a PostgreSQL database transaction (`BEGIN ... COMMIT`).
   - A dedicated `migration_batches` table logs the exact row range and timestamps. If anomalies exceed 1%, an automated rollback script (`scripts/rollback_migration.py <batch_id>`) restores state.

