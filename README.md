# LEARNOVA AI

> **"Learn Smarter. Learn Personally. Learn with AI."**

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6.svg)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791.svg)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D.svg)](https://redis.io)

Learnova AI is an enterprise, production-grade Learning Management System (LMS) engineered to merge traditional learning workflows with real-time AI tutoring, RAG-powered course knowledge retrieval, and machine learning-driven student performance analytics and personalization.

---

## 1. Project Overview

Learnova AI addresses the limitations of legacy LMS platforms by providing:
- **Scalable LMS Core**: Course management, modular curriculum builders, granular role-based access, and student progress tracking.
- **RAG-Powered AI Knowledge Assistant**: Multi-modal document ingestion, semantic search, and context-aware course tutoring.
- **Machine Learning Student Analytics**: Predictive modeling for student engagement, churn risk detection, and automated learning path recommendations.
- **Enterprise-Grade Architecture**: Fully decoupled microservices, asynchronous execution pools, centralized configuration, and structured observability.

---

## 2. System Architecture

```mermaid
graph TD
    Client[Web Client - React / TS / Vite]
    
    subgraph Infrastructure Layer
        Nginx[Nginx Reverse Proxy / Gateway]
    end

    subgraph Service Tier
        Backend[Learnova Backend - FastAPI :8000]
        AIService[Learnova AI Service - FastAPI :8001]
        MLService[Learnova ML Service - FastAPI :8002]
    end

    subgraph Data & Caching Tier
        Postgres[(PostgreSQL 16+ - Port 5432)]
        RedisCache[(Redis 7+ - Port 6379)]
        VectorDB[(Vector DB / pgvector)]
        ModelRegistry[(Model Registry / MLflow)]
    end

    Client -->|HTTP / WebSocket| Nginx
    Nginx -->|/api/v1/*| Backend
    Nginx -->|/api/v1/ai/*| AIService
    Nginx -->|/api/v1/ml/*| MLService

    Backend -->|Async SQLAlchemy / asyncpg| Postgres
    Backend -->|Async Cache / redis-py| RedisCache
    Backend -->|Internal REST| AIService
    Backend -->|Internal REST| MLService

    AIService -->|Vector Search| VectorDB
    MLService -->|Inference & Metadata| ModelRegistry
```

For detailed architectural principles, design patterns, and layer responsibilities, consult [`docs/architecture.md`](docs/architecture.md).

---

## 3. Technology Stack

### Frontend
- **Framework**: React 18 with Vite
- **Language**: Strict TypeScript (no loose typing or plain JS)
- **Styling**: Tailwind CSS & CSS Variables
- **UI Components**: Accessible shadcn/ui design patterns & Lucide icons
- **Server State**: TanStack Query (React Query)
- **Forms & Validation**: React Hook Form + Zod
- **Data Visualization**: Recharts
- **Testing**: Vitest + React Testing Library

### Backend Core
- **Framework**: FastAPI (Python 3.11+)
- **ORM & Migrations**: SQLAlchemy 2.0 (Async) + Alembic
- **Database Driver**: `asyncpg` (Async) & `psycopg2-binary` (Sync migrations)
- **Validation**: Pydantic v2 & `pydantic-settings`
- **Caching & Sessions**: Redis (`redis.asyncio`)
- **Logging**: Structured JSON Logging with request duration, tracing, and credential redaction
- **Testing**: Pytest + `pytest-asyncio` + `httpx`

### AI Microservice
- **Framework**: FastAPI + Pydantic v2
- **Abstractions**: LLM Provider Factory, Text Chunking, Embeddings Pipeline, Vector Retrieval
- **Services**: AI Tutor, Automated Quiz Synthesis, Assignment Evaluation

### ML Microservice
- **Framework**: FastAPI + Pandas + NumPy + Scikit-learn
- **Abstractions**: Dataset Loaders, Feature Engineering Pipelines, Model Registry, Inference Predictor, Evaluation Metrics
- **MLOps**: MLflow-ready model lifecycle architecture

### Infrastructure & DevOps
- **Containerization**: Docker & Docker Compose
- **Web Server / Gateway**: Nginx
- **Database**: PostgreSQL 16+ with persistent volumes
- **Cache**: Redis 7+ with in-memory persistence

---

## 4. Repository Structure

```
learnova-ai/
├── frontend/                   # React + TypeScript Frontend Application
│   ├── src/
│   │   ├── components/         # Reusable UI & Layout Components (shadcn/ui style)
│   │   ├── pages/              # Route Pages (Landing, Dashboard, Courses, Status, etc.)
│   │   ├── layouts/            # Dashboard & Auth Shell Layouts
│   │   ├── hooks/              # Custom React Hooks (Health, Theme, etc.)
│   │   ├── services/           # Typed API Client & Health Services
│   │   ├── lib/                # Utility Singletons (QueryClient, Tailwind utils)
│   │   ├── types/              # TypeScript Type Definitions
│   │   ├── routes/             # App Router Configuration
│   │   ├── App.tsx             # Application Root
│   │   └── main.tsx            # Entrypoint
│   ├── public/                 # Static Assets
│   ├── package.json            # Node Dependencies & Scripts
│   ├── tsconfig.json           # Strict TypeScript Configuration
│   └── vite.config.ts          # Vite Bundler Configuration
│
├── backend/                    # FastAPI Main LMS Backend
│   ├── app/
│   │   ├── api/                # API Versioning & Route Endpoints
│   │   │   └── v1/
│   │   │       ├── endpoints/  # Health, System, and Resource Endpoints
│   │   │       └── router.py   # Aggregated API v1 Router
│   │   ├── core/               # Central Config, Logging, Errors & Exceptions
│   │   ├── db/                 # Async SQLAlchemy Session & Base
│   │   ├── models/             # SQLAlchemy Declarative Models
│   │   ├── schemas/            # Pydantic Request & Response Envelopes
│   │   ├── repositories/       # Data Access Repository Interfaces
│   │   ├── services/           # Business Logic Service Layer
│   │   ├── middleware/         # Structured Logging & CORS Middleware
│   │   ├── redis/              # Redis Client & Cache Abstractions
│   │   └── main.py             # FastAPI App Factory & Lifespan Hooks
│   ├── tests/                  # Pytest Unit & Integration Test Suite
│   ├── alembic/                # Database Migrations
│   ├── alembic.ini             # Alembic Configuration
│   └── requirements.txt        # Backend Python Dependencies
│
├── ai-service/                 # FastAPI AI Microservice
│   ├── app/
│   │   ├── api/                # AI Endpoints (v1)
│   │   ├── core/               # Configuration & Logging
│   │   ├── embeddings/         # Vector Embedding Generation Interfaces
│   │   ├── llm/                # LLM Provider Registry & Factory
│   │   ├── rag/                # Document Chunking, Ingestion & Retrieval Pipelines
│   │   ├── services/           # AI Tutor, Quiz Generator, Assignment Evaluator
│   │   └── main.py             # FastAPI AI Service Entrypoint
│   ├── tests/                  # AI Service Tests
│   └── requirements.txt        # AI Dependencies
│
├── ml-service/                 # FastAPI ML Microservice
│   ├── app/
│   │   ├── api/                # ML Endpoints (v1)
│   │   ├── core/               # Configuration & Logging
│   │   ├── datasets/           # Dataset Ingestion & Validation
│   │   ├── features/           # Feature Engineering Transformers
│   │   ├── models/             # Model Registry & Inference Predictor
│   │   ├── training/           # Model Training Pipeline Abstractions
│   │   ├── evaluation/         # Performance Metrics & Diagnostics
│   │   └── main.py             # FastAPI ML Service Entrypoint
│   ├── tests/                  # ML Service Tests
│   └── requirements.txt        # ML Dependencies
│
├── infrastructure/             # Infrastructure & Deployment Assets
│   ├── docker/                 # Postgres & Redis Docker configs
│   ├── nginx/                  # Reverse Proxy Gateway Config
│   └── scripts/                # Development startup scripts (PowerShell & Bash)
│
├── docs/                       # Comprehensive System Documentation
│   ├── architecture.md         # Deep-dive System Architecture
│   ├── development.md          # Setup & Contribution Manual
│   └── api.md                  # REST API Endpoints Specification
│
├── docker-compose.yml          # Local Docker Compose Infrastructure
├── .env.example                # Canonical Environment Configuration Template
├── .gitignore                  # Git Ignore Rules
└── README.md                   # Primary Documentation
```

---

## 5. Prerequisites

Before running the project locally, ensure you have:
- **Python**: `3.11` or `3.12`
- **Node.js**: `18.x` or `20.x` (with `npm 9+`)
- **Docker**: Docker Desktop / Docker Engine 24+ (optional for local PostgreSQL/Redis)
- **PostgreSQL**: Version 16+ (default port `5432`)
- **Redis**: Version 7+ (default port `6379`)

---

## 6. Environment Setup

1. Copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```
2. On Windows PowerShell:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Inspect and verify variables in `.env`:
   - `DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/learnova_db`
   - `REDIS_URL=redis://localhost:6379/0`
   - `BACKEND_PORT=8000`
   - `AI_SERVICE_PORT=8001`
   - `ML_SERVICE_PORT=8002`
   - `FRONTEND_PORT=5173`

---

## 7. Docker Infrastructure Setup

To spin up PostgreSQL and Redis with health checks and persistent volumes:

```bash
docker compose up -d postgres redis
```

Check the health status of running containers:
```bash
docker compose ps
```

To stop containers:
```bash
docker compose down
```

---

## 8. Local Development & Service Execution

### Python Virtual Environment:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
pip install -r ai-service/requirements.txt
pip install -r ml-service/requirements.txt
```

### Running Backend Service (Port 8000)
```powershell
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Running AI Service (Port 8001)
```powershell
uvicorn ai-service.app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Running ML Service (Port 8002)
```powershell
uvicorn ml-service.app.main:app --host 0.0.0.0 --port 8002 --reload
```

### Running Frontend Application (Port 5173)
```powershell
cd frontend
npm install
npm run dev
```

The frontend web app will be available at `http://localhost:5173`.
Navigate to `http://localhost:5173/status` to view real-time diagnostics of all microservices, database, and cache connections.

---

## 9. Automated Testing

Run the complete test suite across backend, AI, and ML services:

```powershell
# Python Test Suite
pytest -v

# Frontend Test Suite
cd frontend
npm test
```

Build the production frontend bundle:
```powershell
cd frontend
npm run build
```

---

## 10. Code Quality & Linting

### Python (Ruff):
```powershell
# Check formatting and lint rules
ruff check backend ai-service ml-service

# Format files
ruff format backend ai-service ml-service
```

### Frontend (ESLint & TypeScript):
```powershell
cd frontend
npm run lint
npm run build
```

---

## 11. API Documentation

All microservices provide auto-generated interactive Swagger OpenAPI documentation:

| Service | Endpoint | Swagger UI URL | OpenAPI JSON |
|---|---|---|---|
| **Backend LMS** | `:8000` | [http://localhost:8000/docs](http://localhost:8000/docs) | `/api/v1/openapi.json` |
| **AI Service** | `:8001` | [http://localhost:8001/docs](http://localhost:8001/docs) | `/api/v1/openapi.json` |
| **ML Service** | `:8002` | [http://localhost:8002/docs](http://localhost:8002/docs) | `/api/v1/openapi.json` |

For full request/response schemas, see [`docs/api.md`](docs/api.md).

---

## 12. Future Roadmap

- **Phase 2: Authentication & Multi-Tenancy**: Granular JWT/OAuth2 authentication, RBAC (Student, Instructor, Admin), session management in Redis.
- **Phase 3: LMS Core Domain**: Course creation, curriculum builders, multimedia lessons, enrollment lifecycles, and quiz grading engines.
- **Phase 4: RAG Knowledge Assistant**: Vector database indexing (pgvector / Qdrant), PDF/document ingestion, contextual course Q&A tutor.
- **Phase 5: ML Analytics & Personalization**: Student performance prediction models, adaptive recommendations, churn risk scoring, and instructor analytics dashboard.
- **Phase 6: Production Hardening & Cloud Deployment**: Kubernetes manifests, CI/CD pipelines, rate limiting, and global CDN delivery.

---

## 13. License

Distributed under the MIT License. See `LICENSE` for more information.
