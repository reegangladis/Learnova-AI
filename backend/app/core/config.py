import os

os.environ.setdefault("DISABLE_SQLALCHEMY_CEXT", "1")

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # App Identity
    APP_NAME: str = Field(default="Learnova AI", description="Application name")
    APP_ENV: str = Field(
        default="development",
        description="Runtime environment: development, staging, production",
    )
    APP_VERSION: str = Field(
        default="0.1.0", description="Application semantic version"
    )
    DEBUG: bool = Field(default=True, description="Debug mode flag")
    LOG_LEVEL: str = Field(
        default="INFO", description="Log level: DEBUG, INFO, WARNING, ERROR, CRITICAL"
    )

    # Service Bindings
    BACKEND_HOST: str = Field(default="0.0.0.0", description="Backend binding host")
    BACKEND_PORT: int = Field(default=8000, description="Backend binding port")
    API_V1_PREFIX: str = Field(
        default="/api/v1", description="Base API version 1 prefix"
    )

    # Database Configuration
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/learnova_db",
        description="Async PostgreSQL connection URL",
    )
    DATABASE_SYNC_URL: str = Field(
        default="postgresql+psycopg2://postgres:postgres@localhost:5432/learnova_db",
        description="Sync PostgreSQL connection URL for migrations",
    )
    DB_POOL_SIZE: int = Field(default=10, description="Database connection pool size")
    DB_MAX_OVERFLOW: int = Field(
        default=20, description="Database connection max overflow"
    )
    DB_POOL_TIMEOUT: int = Field(
        default=30, description="Database connection pool timeout in seconds"
    )

    # Redis Configuration
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL",
    )
    REDIS_POOL_MAX_CONNECTIONS: int = Field(
        default=20, description="Redis connection pool max connections"
    )

    # Security & CORS
    CORS_ORIGINS: str | list[str] = Field(
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
        ],
        description="Allowed CORS origins",
    )

    # Authentication & JWT Configuration
    JWT_SECRET_KEY: str = Field(
        default="learnova-ai-insecure-dev-secret-key-change-in-production-1234567890",
        description="Secret key for signing JWT tokens",
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT signing algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=15, description="Access token expiration in minutes"
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7, description="Refresh token expiration in days"
    )
    SESSION_EXPIRE_DAYS: int = Field(
        default=7, description="User session expiration in days"
    )
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = Field(
        default=60, description="Password reset token expiration in minutes"
    )
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = Field(
        default=24, description="Email verification token expiration in hours"
    )

    # Account Security & Protection
    MAX_FAILED_LOGIN_ATTEMPTS: int = Field(
        default=5,
        description="Maximum failed login attempts before temporary account lock",
    )
    ACCOUNT_LOCKOUT_MINUTES: int = Field(
        default=15,
        description="Duration in minutes an account is locked after consecutive failures",
    )

    # Secure Cookie Settings
    COOKIE_SECURE: bool = Field(
        default=False,
        description="Whether auth cookies require HTTPS (True in production)",
    )
    COOKIE_SAMESITE: str = Field(
        default="lax", description="SameSite cookie policy (lax, strict, none)"
    )
    COOKIE_DOMAIN: str | None = Field(
        default=None, description="Optional cookie domain"
    )
    ACCESS_TOKEN_COOKIE_NAME: str = Field(
        default="learnova_access_token",
        description="Name of access token HttpOnly cookie",
    )
    REFRESH_TOKEN_COOKIE_NAME: str = Field(
        default="learnova_refresh_token",
        description="Name of refresh token HttpOnly cookie",
    )

    # Rate Limiting Configuration
    RATE_LIMIT_ENABLED: bool = Field(
        default=True, description="Enable Redis-backed rate limiting"
    )
    RATE_LIMIT_LOGIN_MAX_REQUESTS: int = Field(
        default=10, description="Max login attempts per window"
    )
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: int = Field(
        default=60, description="Login rate limit window in seconds"
    )
    RATE_LIMIT_REGISTER_MAX_REQUESTS: int = Field(
        default=5, description="Max register attempts per window"
    )
    RATE_LIMIT_REGISTER_WINDOW_SECONDS: int = Field(
        default=60, description="Register rate limit window in seconds"
    )
    RATE_LIMIT_AUTH_DEFAULT_MAX: int = Field(
        default=20, description="Default auth endpoint max requests"
    )
    RATE_LIMIT_AUTH_DEFAULT_WINDOW: int = Field(
        default=60, description="Default auth endpoint window in seconds"
    )

    # Future AI / ML Service Endpoints
    AI_SERVICE_URL: str = Field(
        default="http://localhost:8001/api/v1", description="AI service base URL"
    )
    ML_SERVICE_URL: str = Field(
        default="http://localhost:8002/api/v1", description="ML service base URL"
    )
    INTERNAL_SERVICE_SECRET: str = Field(
        default="learnova-staging-internal-sec-key-32chars",
        description="Shared secret for authenticated internal microservice communication",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    def validate_production_requirements(self) -> None:
        """Fail fast if critical production settings are using insecure defaults."""
        if self.APP_ENV.lower() == "production":
            if (
                "localhost" in self.DATABASE_URL
                or "postgres:postgres" in self.DATABASE_URL
            ):
                raise ValueError(
                    "CRITICAL: Production DATABASE_URL must not use default local credentials."
                )
            if "localhost" in self.REDIS_URL:
                raise ValueError(
                    "CRITICAL: Production REDIS_URL must point to a secured Redis cluster/host."
                )
            if (
                "learnova-ai-insecure-dev" in self.JWT_SECRET_KEY
                or len(self.JWT_SECRET_KEY) < 32
            ):
                raise ValueError(
                    "CRITICAL: Production JWT_SECRET_KEY must be a strong secret of at least 32 characters."
                )
            if not self.COOKIE_SECURE:
                raise ValueError(
                    "CRITICAL: Production COOKIE_SECURE must be True (HTTPS required)."
                )
            if self.DEBUG:
                raise ValueError(
                    "CRITICAL: DEBUG mode cannot be enabled in production."
                )

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    settings = Settings()
    if settings.APP_ENV.lower() == "production":
        settings.validate_production_requirements()
    return settings
