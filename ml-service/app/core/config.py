from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class MLSettings(BaseSettings):
    """Configuration settings for Learnova ML Service."""

    APP_NAME: str = Field(default="learnova-ml-service", description="Service identity")
    APP_ENV: str = Field(default="development", description="Runtime environment")
    APP_VERSION: str = Field(default="0.1.0", description="Service version")
    DEBUG: bool = Field(default=True, description="Debug mode")
    LOG_LEVEL: str = Field(default="INFO", description="Log level")

    ML_SERVICE_HOST: str = Field(default="0.0.0.0", description="Binding host")
    ML_SERVICE_PORT: int = Field(default=8002, description="Binding port")
    API_V1_PREFIX: str = Field(default="/api/v1", description="API v1 prefix")

    CORS_ORIGINS: str | list[str] = Field(
        default=["http://localhost:5173", "http://localhost:8000"],
        description="Allowed CORS origins",
    )

    # ML Architecture & Registry
    MLFLOW_TRACKING_URI: str | None = Field(
        default=None, description="MLflow tracking server URI"
    )
    MODEL_REGISTRY_PATH: str = Field(
        default="./models_store",
        description="Local or artifact model registry storage path",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Internal Microservice Authentication
    INTERNAL_SERVICE_KEY: str | None = Field(
        default=None,
        description="Internal service authentication key",
    )

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_ml_settings() -> MLSettings:
    return MLSettings()
