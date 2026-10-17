from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from app.api.v1.router import ml_api_router
from app.core.config import get_ml_settings
from app.core.exceptions import register_ml_exception_handlers
from app.core.logging import setup_ml_logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

settings = get_ml_settings()
logger = setup_ml_logging(log_level=settings.LOG_LEVEL)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info(
        f"Starting {settings.APP_NAME} v{settings.APP_VERSION} on port {settings.ML_SERVICE_PORT}..."
    )
    yield
    logger.info("Shutting down Learnova ML Service...")


def create_ml_application() -> FastAPI:
    """FastAPI application factory for ML Service."""
    app = FastAPI(
        title="Learnova AI - Machine Learning Analytics Service",
        version=settings.APP_VERSION,
        description="Dedicated microservice for student performance prediction, churn risk modeling, and course recommendations.",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/api/v1/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_ml_exception_handlers(app)
    app.include_router(ml_api_router, prefix=settings.API_V1_PREFIX)

    @app.get("/", include_in_schema=False)
    async def root_redirect():
        return RedirectResponse(url="/docs")

    return app


app = create_ml_application()
