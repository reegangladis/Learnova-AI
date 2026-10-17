# Learnova AI - Developer Guide & Setup

This guide provides step-by-step instructions for configuring, running, and contributing to the **Learnova AI** development environment.

---

## 1. Prerequisites

Ensure you have the following installed on your development workstation:
- **Python 3.11+** or **Python 3.12+**
- **Node.js 18+** or **Node.js 20+** (npm 9+)
- **Docker & Docker Compose** (or local PostgreSQL 16+ and Redis 7+)
- **Git**

---

## 2. Environment Configuration

1. Copy the example environment template:
   ```bash
   cp .env.example .env
   ```
2. On Windows PowerShell:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Update `.env` with your local database credentials if they differ from the defaults:
   - `DATABASE_URL`: `postgresql+asyncpg://postgres:postgres@localhost:5432/learnova_db`
   - `REDIS_URL`: `redis://localhost:6379/0`
   - `BACKEND_PORT`: `8000`
   - `AI_SERVICE_PORT`: `8001`
   - `ML_SERVICE_PORT`: `8002`
   - `FRONTEND_PORT`: `5173`

---

## 3. Starting the Infrastructure (PostgreSQL & Redis)

### Option A: Docker Compose (Recommended)
```bash
docker compose up -d postgres redis
```

### Option B: Local Services
Ensure local PostgreSQL is running on port 5432 with database `learnova_db` created, and Redis is running on port 6379.

---

## 4. Python Environment & Services Setup

1. Create and activate a Python virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
   *(Or on Linux/macOS: `source .venv/bin/activate`)*

2. Install dependencies for all services:
   ```bash
   pip install -r backend/requirements.txt
   pip install -r ai-service/requirements.txt
   pip install -r ml-service/requirements.txt
   ```

---

## 5. Running the Application Services

### 5.1 Running Backend API (Port 8000)
```powershell
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/v1/health`
- Composite Health: `http://localhost:8000/api/v1/health/all`

### 5.2 Running AI Service (Port 8001)
```powershell
uvicorn ai-service.app.main:app --host 0.0.0.0 --port 8001 --reload
```
- AI Service Docs: `http://localhost:8001/docs`
- AI Health Check: `http://localhost:8001/api/v1/health`

### 5.3 Running ML Service (Port 8002)
```powershell
uvicorn ml-service.app.main:app --host 0.0.0.0 --port 8002 --reload
```
- ML Service Docs: `http://localhost:8002/docs`
- ML Health Check: `http://localhost:8002/api/v1/health`

### 5.4 Running Frontend Application (Port 5173)
```powershell
cd frontend
npm install
npm run dev
```
- Frontend Web App: `http://localhost:5173`
- System Status & Diagnostics: `http://localhost:5173/status`

---

## 6. Running Automated Tests

### 6.1 Backend, AI, and ML Service Tests (Pytest)
```powershell
pytest -v
```

### 6.2 Frontend Unit & Integration Tests (Vitest)
```powershell
cd frontend
npm test
```

### 6.3 Building Frontend for Production
```powershell
cd frontend
npm run build
```

---

## 7. Code Quality & Linting

### Python Linting & Formatting:
```powershell
# Check with Ruff
ruff check backend ai-service ml-service

# Auto-format with Ruff
ruff format backend ai-service ml-service
```

### Frontend Typecheck & Lint:
```powershell
cd frontend
npm run lint
npm run build
```

---

## 8. Database Migrations & Development Seed Data

### 8.1 Applying Database Migrations (Alembic)
To migrate the database schema to the latest revision with Alembic:
```powershell
alembic upgrade head
```

### 8.2 Seeding Development Personas
In local development, seed the default organization, roles, permissions, and 4 test personas:
```powershell
python -m backend.app.db.seed
```

> **Security Note:** Seed credentials are strictly restricted to local development environments (`APP_ENV=development`) and are prohibited from running in production (`APP_ENV=production`).

#### Development Personas & Test Credentials
| Role | Email | Password | Permissions Scope |
| :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | `superadmin@learnova.ai` | `SuperAdmin123!` | Full platform administration, system governance |
| **ADMIN** | `admin@learnova.ai` | `Admin123!` | User management, RBAC assignment, organization access |
| **INSTRUCTOR** | `instructor@learnova.ai` | `Instructor123!` | Course authoring, student management |
| **STUDENT** | `student@learnova.ai` | `Student123!` | Student learning experience, AI assistant |

