import logging
import time
from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from backend.app.core.config import get_settings

logger = logging.getLogger("learnova")

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Returns or initializes the singleton AsyncEngine."""
    global _engine
    if _engine is None:
        settings = get_settings()
        if "sqlite" in settings.DATABASE_URL:
            _engine = create_async_engine(
                settings.DATABASE_URL,
                echo=False,
                future=True,
            )
        else:
            _engine = create_async_engine(
                settings.DATABASE_URL,
                echo=False,
                future=True,
                pool_size=settings.DB_POOL_SIZE,
                max_overflow=settings.DB_MAX_OVERFLOW,
                pool_timeout=settings.DB_POOL_TIMEOUT,
                pool_pre_ping=True,
            )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Returns or initializes the singleton session factory."""
    global _session_factory
    if _session_factory is None:
        engine = get_engine()
        _session_factory = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            autoflush=False,
            expire_on_commit=False,
        )
    return _session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for yielding transactional async database sessions."""
    session_maker = get_session_factory()
    async with session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_db_engine() -> None:
    """Closes all active database pool connections cleanly during shutdown."""
    global _engine, _session_factory
    if _engine is not None:
        logger.info("Closing PostgreSQL database engine pool...")
        await _engine.dispose()
        _engine = None
        _session_factory = None
        logger.info("PostgreSQL database engine pool closed.")


async def check_database_connection() -> dict[str, Any]:
    """Performs a real round-trip query against PostgreSQL and measures latency."""
    engine = get_engine()
    start_time = time.perf_counter()

    try:
        settings = get_settings()
        query = (
            text("SELECT 1 AS alive, sqlite_version() AS version;")
            if "sqlite" in settings.DATABASE_URL
            else text("SELECT 1 AS alive, version() AS version;")
        )
        async with engine.connect() as conn:
            result = await conn.execute(query)
            row = result.first()
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            db_version = str(row[1]) if row and len(row) > 1 else "Unknown"

            return {
                "status": "healthy",
                "connected": True,
                "latency_ms": duration_ms,
                "version": db_version.split(" on ")[0]
                if " on " in db_version
                else db_version,
                "error": None,
            }
    except Exception as e:  # noqa: BLE001
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.error(f"PostgreSQL health check failed: {e}")
        return {
            "status": "unhealthy",
            "connected": False,
            "latency_ms": duration_ms,
            "version": None,
            "error": str(e),
        }
