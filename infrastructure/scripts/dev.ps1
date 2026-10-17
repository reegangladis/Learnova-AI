# =============================================================================
# Learnova AI - Local Development Startup Script (PowerShell)
# =============================================================================

param (
    [Parameter(Position=0)]
    [ValidateSet("infra", "backend", "ai", "ml", "frontend", "all", "down", "test", "help")]
    [string]$Command = "infra"
)

function Show-Help {
    Write-Host "Learnova AI Development CLI" -ForegroundColor Cyan
    Write-Host "----------------------------"
    Write-Host "Usage: .\infrastructure\scripts\dev.ps1 [command]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  infra     Start PostgreSQL and Redis via Docker Compose (Default)"
    Write-Host "  backend   Run FastAPI Backend locally on port 8000"
    Write-Host "  ai        Run AI Service locally on port 8001"
    Write-Host "  ml        Run ML Service locally on port 8002"
    Write-Host "  frontend  Run Vite Frontend dev server on port 5173"
    Write-Host "  all       Start infra + all services in containerized stack"
    Write-Host "  down      Stop all Docker Compose services"
    Write-Host "  test      Run all test suites across backend, AI, ML, frontend"
    Write-Host "  help      Show this help menu"
}

switch ($Command) {
    "infra" {
        Write-Host "[Learnova] Starting PostgreSQL and Redis..." -ForegroundColor Green
        docker compose up -d postgres redis
    }
    "backend" {
        Write-Host "[Learnova] Starting Backend on http://localhost:8000..." -ForegroundColor Green
        & .venv\Scripts\uvicorn.exe backend.app.main:app --host 0.0.0.0 --port 8000 --reload
    }
    "ai" {
        Write-Host "[Learnova] Starting AI Service on http://localhost:8001..." -ForegroundColor Green
        & .venv\Scripts\uvicorn.exe ai-service.app.main:app --host 0.0.0.0 --port 8001 --reload
    }
    "ml" {
        Write-Host "[Learnova] Starting ML Service on http://localhost:8002..." -ForegroundColor Green
        & .venv\Scripts\uvicorn.exe ml-service.app.main:app --host 0.0.0.0 --port 8002 --reload
    }
    "frontend" {
        Write-Host "[Learnova] Starting Frontend on http://localhost:5173..." -ForegroundColor Green
        Set-Location frontend
        npm run dev
        Set-Location ..
    }
    "all" {
        Write-Host "[Learnova] Starting full containerized stack..." -ForegroundColor Green
        docker compose --profile app-full up --build -d
    }
    "down" {
        Write-Host "[Learnova] Stopping Docker Compose containers..." -ForegroundColor Yellow
        docker compose down
    }
    "test" {
        Write-Host "[Learnova] Running tests..." -ForegroundColor Green
        & .venv\Scripts\pytest.exe backend/tests ai-service/tests ml-service/tests -v
        Set-Location frontend
        npm test
        Set-Location ..
    }
    "help" {
        Show-Help
    }
}
