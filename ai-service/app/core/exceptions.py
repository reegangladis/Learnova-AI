from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class AIServiceException(Exception):
    """Base exception for AI Service errors."""

    def __init__(
        self,
        message: str = "An error occurred in AI service.",
        code: str = "AI_SERVICE_ERROR",
        status_code: int = 500,
        details: Any | None = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class AIConfigurationError(AIServiceException):
    """Raised when an AI provider is unconfigured or missing credentials."""

    def __init__(
        self,
        message: str = "AI provider is not configured or missing API credentials.",
        details: Any | None = None,
    ):
        super().__init__(
            message=message,
            code="AI_PROVIDER_UNCONFIGURED",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details,
        )


class AIProviderError(AIServiceException):
    """Raised when an external AI provider encounters an API error or timeout."""

    def __init__(
        self,
        message: str = "AI provider call failed.",
        status_code: int = status.HTTP_502_BAD_GATEWAY,
        details: Any | None = None,
    ):
        super().__init__(
            message=message,
            code="AI_PROVIDER_ERROR",
            status_code=status_code,
            details=details,
        )


class AIRateLimitError(AIServiceException):
    """Raised when an AI provider or internal rate limit is exceeded."""

    def __init__(
        self,
        message: str = "AI service rate limit exceeded. Please try again later.",
        details: Any | None = None,
    ):
        super().__init__(
            message=message,
            code="AI_RATE_LIMIT_EXCEEDED",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=details,
        )


def register_ai_exception_handlers(app: FastAPI) -> None:
    """Registers exception handlers for AI Service."""

    @app.exception_handler(AIServiceException)
    async def handle_ai_exception(
        request: Request, exc: AIServiceException
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
    async def handle_generic_ai_exception(
        request: Request, exc: Exception
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "AI_INTERNAL_ERROR",
                    "message": "An unexpected error occurred in AI service.",
                    "details": str(exc),
                },
            },
        )
