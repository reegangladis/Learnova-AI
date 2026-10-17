from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class MLServiceException(Exception):
    """Base exception for ML Service errors."""

    def __init__(
        self,
        message: str = "An error occurred in ML service.",
        code: str = "ML_SERVICE_ERROR",
        status_code: int = 500,
        details: Any | None = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(message)


def register_ml_exception_handlers(app: FastAPI) -> None:
    """Registers exception handlers for ML Service."""

    @app.exception_handler(MLServiceException)
    async def handle_ml_exception(
        request: Request, exc: MLServiceException
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                },
            },
        )

    @app.exception_handler(Exception)
    async def handle_generic_ml_exception(
        request: Request, exc: Exception
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "ML_INTERNAL_ERROR",
                    "message": "An unexpected error occurred in ML service.",
                    "details": str(exc),
                },
            },
        )
