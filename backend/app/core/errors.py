from typing import Any


class AppException(Exception):
    """Base exception for all domain and application errors."""

    def __init__(
        self,
        message: str = "An unexpected error occurred.",
        code: str = "INTERNAL_SERVER_ERROR",
        status_code: int = 500,
        details: Any | None = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class BadRequestError(AppException):
    """Raised when client input or state is malformed or invalid."""

    def __init__(
        self,
        message: str = "Bad request.",
        code: str = "BAD_REQUEST",
        details: Any | None = None,
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=400,
            details=details,
        )



class UnauthorizedError(AppException):
    """Raised when authentication is missing, invalid, or expired."""

    def __init__(
        self,
        message: str = "Authentication required.",
        code: str = "UNAUTHORIZED",
        details: Any | None = None,
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=401,
            details=details,
        )


class ForbiddenError(AppException):
    """Raised when an authenticated user lacks required role or permission."""

    def __init__(
        self,
        message: str = "You do not have permission to perform this action.",
        code: str = "FORBIDDEN",
        details: Any | None = None,
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=403,
            details=details,
        )


class ResourceNotFoundError(AppException):
    """Raised when a requested resource is not found."""

    def __init__(
        self, message: str = "Resource not found.", details: Any | None = None
    ):
        super().__init__(
            message=message,
            code="RESOURCE_NOT_FOUND",
            status_code=404,
            details=details,
        )


class ConflictError(AppException):
    """Raised when a resource already exists (e.g. duplicate email)."""

    def __init__(
        self,
        message: str = "A resource with these details already exists.",
        code: str = "CONFLICT",
        details: Any | None = None,
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=409,
            details=details,
        )


class ValidationException(AppException):
    """Raised for custom input/business validation failures."""

    def __init__(self, message: str = "Validation failed.", details: Any | None = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=422,
            details=details,
        )


class RateLimitExceededError(AppException):
    """Raised when rate limiting thresholds are exceeded."""

    def __init__(
        self,
        message: str = "Too many requests. Please try again later.",
        details: Any | None = None,
    ):
        super().__init__(
            message=message,
            code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            details=details,
        )


class AccountLockedError(AppException):
    """Raised when an account is temporarily locked due to failed login attempts."""

    def __init__(
        self,
        message: str = "Account is temporarily locked. Please try again later.",
        details: Any | None = None,
    ):
        super().__init__(
            message=message,
            code="ACCOUNT_LOCKED",
            status_code=423,
            details=details,
        )


class DatabaseConnectionError(AppException):
    """Raised when PostgreSQL database connectivity fails."""

    def __init__(
        self, message: str = "Database connection failed.", details: Any | None = None
    ):
        super().__init__(
            message=message,
            code="DATABASE_CONNECTION_ERROR",
            status_code=503,
            details=details,
        )


class RedisConnectionError(AppException):
    """Raised when Redis connectivity fails."""

    def __init__(
        self,
        message: str = "Redis cache connection failed.",
        details: Any | None = None,
    ):
        super().__init__(
            message=message,
            code="REDIS_CONNECTION_ERROR",
            status_code=503,
            details=details,
        )


class ConfigurationError(AppException):
    """Raised when application configuration is invalid or missing."""

    def __init__(
        self, message: str = "Invalid configuration.", details: Any | None = None
    ):
        super().__init__(
            message=message,
            code="CONFIGURATION_ERROR",
            status_code=500,
            details=details,
        )


class AppExceptions:
    """Namespace convenience accessor for common application exceptions."""

    BadRequestException = BadRequestError
    UnauthorizedException = UnauthorizedError
    ForbiddenException = ForbiddenError
    NotFoundException = ResourceNotFoundError
    ConflictException = ConflictError
    ValidationException = ValidationException
    RateLimitException = RateLimitExceededError
    AccountLockedException = AccountLockedError
    DatabaseException = DatabaseConnectionError
    RedisException = RedisConnectionError
