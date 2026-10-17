import os
import sys
from collections.abc import AsyncGenerator
from pathlib import Path

# Ensure pure-python fallback for SQLAlchemy
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"
os.environ["APP_ENV"] = "testing"
os.environ["RATE_LIMIT_ENABLED"] = "0"
os.environ["JWT_SECRET_KEY"] = (
    "testing-jwt-secret-key-at-least-32-chars-long-1234567890"
)

# Ensure repository root is in sys.path
repo_root = str(Path(__file__).parent.parent.parent)
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from backend.app.core.config import Settings, get_settings
from backend.app.db.session import get_db
from backend.app.main import create_application
from backend.app.models import Base
from backend.app.repositories.role_repo import RoleRepository

# In-memory SQLite for fast, isolated backend test execution
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    autoflush=False,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    return get_settings()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides a transactional database session for each test, creating tables and seeding default roles."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        # Seed default system roles and permissions
        role_repo = RoleRepository(session)
        await role_repo.ensure_default_roles_and_permissions()
        await session.commit()
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Test client configured with overridden DB dependency for isolation."""
    app = create_application()

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        cookies={},
        follow_redirects=True,
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def async_client(client: AsyncClient) -> AsyncClient:
    """Alias for backwards compatibility with Phase 1 tests."""
    return client
