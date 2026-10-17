#!/usr/bin/env bash
# =============================================================================
# Learnova AI - Local Development Startup Script (POSIX / Bash)
# =============================================================================

set -e

COMMAND="${1:-infra}"

show_help() {
    echo "Learnova AI Development CLI"
    echo "----------------------------"
    echo "Usage: ./infrastructure/scripts/dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  infra     Start PostgreSQL and Redis via Docker Compose (Default)"
    echo "  backend   Run FastAPI Backend locally on port 8000"
    echo "  ai        Run AI Service locally on port 8001"
    echo "  ml        Run ML Service locally on port 8002"
    echo "  frontend  Run Vite Frontend dev server on port 5173"
    echo "  all       Start infra + all services in containerized stack"
    echo "  down      Stop all Docker Compose services"
    echo "  test      Run all test suites across backend, AI, ML, frontend"
    echo "  help      Show this help menu"
}

case "$COMMAND" in
    infra)
        echo "[Learnova] Starting PostgreSQL and Redis..."
        docker compose up -d postgres redis
        ;;
    backend)
        echo "[Learnova] Starting Backend on http://localhost:8000..."
        uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
        ;;
    ai)
        echo "[Learnova] Starting AI Service on http://localhost:8001..."
        uvicorn ai_service.app.main:app --host 0.0.0.0 --port 8001 --reload
        ;;
    ml)
        echo "[Learnova] Starting ML Service on http://localhost:8002..."
        uvicorn ml_service.app.main:app --host 0.0.0.0 --port 8002 --reload
        ;;
    frontend)
        echo "[Learnova] Starting Frontend on http://localhost:5173..."
        cd frontend && npm run dev
        ;;
    all)
        echo "[Learnova] Starting full containerized stack..."
        docker compose --profile app-full up --build -d
        ;;
    down)
        echo "[Learnova] Stopping Docker Compose containers..."
        docker compose down
        ;;
    test)
        echo "[Learnova] Running tests..."
        pytest backend/tests ai-service/tests ml-service/tests -v
        (cd frontend && npm test)
        ;;
    help|*)
        show_help
        ;;
esac
