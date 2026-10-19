from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from backend.app.api.v1.router import api_router
from backend.app.core.config import get_settings
from backend.app.core.exceptions import register_exception_handlers
from backend.app.core.logging import setup_logging
from backend.app.db.session import close_db_engine
from backend.app.middleware.cors import setup_cors_middleware
from backend.app.middleware.logging import StructuredLoggingMiddleware
from backend.app.middleware.security import SecurityHeadersMiddleware
from backend.app.redis.client import close_redis

settings = get_settings()
logger = setup_logging(log_level=settings.LOG_LEVEL)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifecycle management for startup and graceful shutdown."""
    logger.info(
        f"Starting {settings.APP_NAME} v{settings.APP_VERSION} [Env: {settings.APP_ENV}]..."
    )
    from backend.app.db.init_db import init_db
    try:
        await init_db()
    except Exception as exc:
        logger.warning(f"Database auto-initialization check skipped/deferred: {exc}")
    yield
    logger.info("Initiating graceful shutdown for Learnova AI Backend...")
    await close_db_engine()
    await close_redis()
    logger.info("Learnova AI Backend shutdown complete.")


def create_application() -> FastAPI:
    """FastAPI application factory."""
    app = FastAPI(
        title=f"{settings.APP_NAME} - Backend API",
        version=settings.APP_VERSION,
        description=(
            "Production-grade Backend API for Learnova AI - "
            "Learn Smarter. Learn Personally. Learn with AI."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/api/v1/openapi.json",
        lifespan=lifespan,
    )

    # 1. Setup CORS Middleware
    setup_cors_middleware(app, settings)

    # 2. Setup Security Headers Middleware
    app.add_middleware(SecurityHeadersMiddleware)

    # 3. Setup Structured Request Logging Middleware
    app.add_middleware(StructuredLoggingMiddleware)

    # 3. Register Global Exception Handlers
    register_exception_handlers(app)

    # 4. Mount API v1 Routes
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    # 5. Root endpoint
    @app.get("/", include_in_schema=False)
    async def root_redirect():
        return RedirectResponse(url="/docs")

    return app


app = create_application()
