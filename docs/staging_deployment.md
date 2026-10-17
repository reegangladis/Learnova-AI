# Learnova AI - Staging Deployment Architecture & Operations Guide

> **Project**: Learnova AI  
> **Tagline**: *“Learn Smarter. Learn Personally. Learn with AI.”*  
> **Phase**: 10A — Deployment Readiness & Staging Verification  
> **Date**: October 2026  
> **Target Environment**: Staging / Non-Production Pre-Release  

---

## 1. Executive Summary

This specification outlines the staging architecture, service topology, test account matrices, provider configurations, security controls, and rollback playbooks for **Learnova AI**. Staging replicates production topology and security constraints while isolating testing activities from public production data.

---

## 2. Staging Infrastructure & Service Topology

```mermaid
graph TD
    User([Staging User / QA Engineer])
    
    subgraph Staging Edge Tier
        EdgeDNS[Custom Domain / Route53 / Cloudflare]
        VercelCDN[Vercel Edge Network - Frontend SPA]
    end

    subgraph Container Orchestration Tier
        Ingress[Ingress Reverse Proxy / Nginx SSL Gateway]
        BackendSvc[learnova-backend - FastAPI :8000]
        AISvc[learnova-ai-service - FastAPI :8001]
        MLSvc[learnova-ml-service - FastAPI :8002]
    end

    subgraph Managed Cloud Data Tier
        ManagedPG[(Managed PostgreSQL 16+ - Neon / AWS RDS)]
        ManagedRedis[(Managed Redis 7+ - Upstash / ElastiCache)]
        CloudStorage[(Cloud Object Storage - AWS S3 / GCS)]
    end

    subgraph External AI Services
        OpenAIAPI[OpenAI API / Claude API]
    end

    User -->|HTTPS| VercelCDN
    User -->|HTTPS API Requests| EdgeDNS
    EdgeDNS --> Ingress
    Ingress -->|/api/v1/*| BackendSvc
    
    BackendSvc -->|Private Internal REST + X-Internal-Service-Key| AISvc
    BackendSvc -->|Private Internal REST + X-Internal-Service-Key| MLSvc
    
    BackendSvc -->|SSL asyncpg| ManagedPG
    BackendSvc -->|rediss:// TLS| ManagedRedis
    BackendSvc -->|Boto3 / Signed URLs| CloudStorage
    
    AISvc -->|API Key| OpenAIAPI
    AISvc -->|TLS| ManagedRedis
    MLSvc -->|Read-only Analytics| ManagedPG
```

### 2.1 Component Specifications

| Component | Target Platform | Sizing / Plan | Scaling & Resiliency |
| :--- | :--- | :--- | :--- |
| **Frontend SPA** | Vercel / Cloudflare Pages | Pro / Team | Global Edge CDN, automated preview builds per PR |
| **Backend API** | AWS ECS Fargate / Render / Fly.io | 1 vCPU, 2 GB RAM (2 instances) | Horizontal autoscaling on CPU > 70% |
| **AI Microservice** | AWS ECS Fargate / Render / Fly.io | 1 vCPU, 2 GB RAM (1-2 instances) | Internal network only; bounded concurrency |
| **ML Microservice** | AWS ECS Fargate / Render / Fly.io | 1 vCPU, 2 GB RAM (1 instance) | Internal network only; batch inference caching |
| **Database** | Managed PostgreSQL 16 (RDS / Neon) | db.t4g.medium (2 vCPU, 4GB) | Automated daily snapshots, point-in-time recovery |
| **Cache & Broker** | Managed Redis 7 (ElastiCache / Upstash) | cache.t4g.micro (TLS enabled) | In-memory eviction policy `allkeys-lru` |
| **Object Storage** | AWS S3 / Google Cloud Storage | Standard Tier with Lifecycle | Private bucket, KMS encryption, pre-signed URLs |

---

## 3. Environment Configuration & Secret Management

### 3.1 Secret Storage & Injection
- In staging, **zero secrets are committed to version control**.
- Secrets are injected at runtime via AWS Secrets Manager, Doppler, or platform environment settings.
- All secrets adhere to strict cryptographic entropy requirements.

### 3.2 Configuration Matrix

| Variable Name | Staging Value Pattern | Description & Constraints |
| :--- | :--- | :--- |
| `APP_ENV` | `staging` | Triggers strict startup validation (refuses dev defaults) |
| `APP_DEBUG` | `false` | Disables debug stack traces in API responses |
| `BACKEND_PORT` | `8000` | Port for backend service |
| `JWT_SECRET_KEY` | `stg_sec_...` (64+ hex chars) | HMAC-SHA256 signing secret for access tokens |
| `REFRESH_SECRET_KEY` | `stg_ref_...` (64+ hex chars) | Secret for rotating refresh tokens |
| `INTERNAL_SERVICE_SECRET` | `stg_internal_...` (64+ hex) | Authenticates inter-microservice communication |
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@host:5432/dbname?ssl=require` | Primary async database connection |
| `DATABASE_SYNC_URL` | `postgresql+psycopg2://user:pass@host:5432/dbname?ssl=require` | Synchronous driver for Alembic migrations |
| `REDIS_URL` | `rediss://:pass@host:6379/0` | TLS-encrypted Redis connection string |
| `AI_SERVICE_URL` | `http://ai-service.internal:8001/api/v1` | Private VPC endpoint for AI microservice |
| `ML_SERVICE_URL` | `http://ml-service.internal:8002/api/v1` | Private VPC endpoint for ML microservice |
| `CORS_ORIGINS` | `["https://staging.learnova.ai"]` | Strictly scoped allowed browser origins |
| `OPENAI_API_KEY` | `sk-stg-...` | Bounded API key with $50/mo staging billing limit |
| `LLM_PROVIDER` | `openai` (or `mock` for deterministic test runs) | Primary LLM inference provider |
| `LLM_MODEL` | `gpt-4o-mini` | Cost-effective, high-throughput model for staging |

---

## 4. Test Accounts Matrix for Staging Verification

The staging database should be pre-seeded with standardized personas to validate Role-Based Access Control (RBAC) and multi-tenancy boundaries:

| Persona | Role | Organization | Seed Email | Test Scenarios Covered |
| :--- | :--- | :--- | :--- | :--- |
| **Global Administrator** | `SUPER_ADMIN` | `None` (Platform-wide) | `superadmin@staging.learnova.ai` | System metrics, user provisioning, global configuration |
| **Org 1 Administrator** | `ADMIN` | `Org Alpha (UUID 1)` | `admin@alpha.learnova.ai` | Alpha tenant courses, student enrollment, alpha telemetry |
| **Org 2 Administrator** | `ADMIN` | `Org Beta (UUID 2)` | `admin@beta.learnova.ai` | Boundary tests: Verify zero visibility into Org Alpha |
| **Instructor Alpha** | `INSTRUCTOR` | `Org Alpha (UUID 1)` | `prof.smith@alpha.learnova.ai` | Course authoring, quiz creation, grading, RAG ingestion |
| **Student Alpha** | `STUDENT` | `Org Alpha (UUID 1)` | `student.jane@alpha.learnova.ai` | Alpha enrollment, AI tutoring, quiz attempts, progress |
| **Student Beta** | `STUDENT` | `Org Beta (UUID 2)` | `student.bob@beta.learnova.ai` | Isolation: Attempt enrollment in Alpha private courses (expect 403) |
| **Independent Student** | `STUDENT` | `None` (Public Learner) | `solo.learner@staging.learnova.ai` | Public course catalog, self-paced progress |

---

## 5. AI Provider Configuration: Mock vs. Live

To optimize costs and test reliability, the staging environment supports two modes:

### 5.1 Mock Provider Mode (`LLM_PROVIDER=mock`)
- **Use Case**: Continuous Integration, automated end-to-end regression runs, load tests.
- **Behavior**:
  - AI Tutor returns deterministic, synthesized responses with zero OpenAI billing.
  - Chunk retrieval still executes vector search against test document embeddings.
  - Latency is simulated (~150ms) to mirror realistic network streaming.

### 5.2 Live Staging Provider Mode (`LLM_PROVIDER=openai`)
- **Use Case**: Human QA verification, prompt engineering evaluation, UX validation.
- **Controls**:
  - Bound to dedicated OpenAI project with hard spending limit ($50/month).
  - Rate limited at application layer (10 queries/minute per student user).
  - Prompts and completions logged (with PII redaction) for quality auditing.

---

## 6. Staging Migration & Deployment Workflow

### Step 1: Pre-Deployment Automated Quality Gates
Before any staging deployment trigger, CI/CD executes:
```bash
# 1. Linting
ruff check backend/ ai-service/ ml-service/
npm run lint --prefix frontend/

# 2. Unit and Integration Test Suites
pytest backend/tests/
pytest ai-service/tests/
pytest ml-service/tests/
npm test --prefix frontend/

# 3. Production Frontend Asset Compilation
npm run build --prefix frontend/
```

### Step 2: Database Migration Execution
Migrations are applied via a pre-deployment container task:
```bash
# Verify current state against head
alembic current
# Apply pending linear migrations
alembic upgrade head
```
> [!NOTE]
> Database migrations must be backwards-compatible (expand-and-contract pattern) to prevent downtime during rolling container updates.

### Step 3: Rolling Service Updates
1. Deploy new container revisions for `ai-service` and `ml-service`.
2. Await passing container healthchecks (`/api/v1/health`).
3. Deploy new container revisions for `backend`.
4. Deploy static frontend assets to Vercel staging preview.

---

## 7. Disaster Recovery & Rollback Playbook

### 7.1 Automatic Rollback Triggers
Rollback is immediately triggered if:
1. Container healthchecks fail for > 3 consecutive checks during rolling deployment.
2. HTTP 5xx error rate on backend exceeds 1% over a 5-minute window post-deployment.
3. Database migration fails or locks critical tables.

### 7.2 Rollback Procedure
1. **Frontend**: Point Vercel staging alias to previous deployment commit (instant DNS/CDN switch).
2. **Backend & Microservices**: Revert ECS task definition / container tags to previous stable image digest.
3. **Database Reversion**:
   - If migration was additive (new nullable columns or tables), leave schema in place to avoid table lock risks.
   - If schema downgrade is necessary and safe:
     ```bash
     alembic downgrade -1
     ```
   - If database corruption occurred, trigger automated snapshot restore using `infrastructure/scripts/restore_db.sh`:
     ```bash
     ./infrastructure/scripts/restore_db.sh infrastructure/backups/learnova_backup_LATEST.sql.gz
     ```
