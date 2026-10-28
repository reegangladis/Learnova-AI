import pytest

from backend.app.core.config import Settings


def test_settings_defaults():
    """Verify default configuration attributes for ExcelR Learnova."""
    settings = Settings()
    assert settings.APP_NAME == "ExcelR Learnova"
    assert settings.APP_SUBTITLE == "Learning & Progress Platform"
    assert settings.API_V1_PREFIX == "/api/v1"
    assert settings.BACKEND_PORT == 8000
    assert isinstance(settings.CORS_ORIGINS, list)


def test_cors_origins_parsing_from_string():
    """Verify that comma-separated CORS string is automatically parsed into a list."""
    settings = Settings(
        CORS_ORIGINS="http://localhost:3000, https://learnova.ai, http://example.com"
    )
    assert isinstance(settings.CORS_ORIGINS, list)
    assert len(settings.CORS_ORIGINS) == 3
    assert "https://learnova.ai" in settings.CORS_ORIGINS


def test_production_fails_with_default_localhost_db():
    """Ensure production deployment fails fast if localhost database credentials are used."""
    settings = Settings(
        APP_ENV="production",
        DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/learnova_db",
        DEBUG=False,
    )
    with pytest.raises(ValueError, match="CRITICAL: Production DATABASE_URL"):
        settings.validate_production_requirements()


def test_production_fails_with_debug_enabled():
    """Ensure production deployment fails fast if DEBUG is left enabled."""
    settings = Settings(
        APP_ENV="production",
        DATABASE_URL="postgresql+asyncpg://app_user:strong_prod_pass@prod-cluster.internal:5432/learnova_db",
        REDIS_URL="redis://prod-redis.internal:6379/0",
        JWT_SECRET_KEY="a-super-secret-key-that-is-at-least-32-chars-long-for-production",
        COOKIE_SECURE=True,
        DEBUG=True,
    )
    with pytest.raises(ValueError, match="DEBUG mode cannot be enabled in production"):
        settings.validate_production_requirements()


def test_production_fails_with_insecure_jwt_secret():
    """Ensure production deployment fails if default insecure JWT secret is used."""
    settings = Settings(
        APP_ENV="production",
        DATABASE_URL="postgresql+asyncpg://app_user:strong_prod_pass@prod-cluster.internal:5432/learnova_db",
        REDIS_URL="redis://prod-redis.internal:6379/0",
        JWT_SECRET_KEY="learnova-ai-insecure-dev-key",
        COOKIE_SECURE=True,
        DEBUG=False,
    )
    with pytest.raises(ValueError, match="CRITICAL: Production JWT_SECRET_KEY"):
        settings.validate_production_requirements()
