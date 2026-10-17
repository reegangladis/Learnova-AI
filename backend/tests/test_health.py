from unittest.mock import patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_basic_health_endpoint(async_client: AsyncClient):
    """Test standard basic health endpoint GET /api/v1/health."""
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "learnova-backend"
    assert "version" in data


@pytest.mark.asyncio
async def test_database_health_endpoint_healthy(async_client: AsyncClient):
    """Test database health check when connection succeeds."""
    mock_db_result = {
        "status": "healthy",
        "connected": True,
        "latency_ms": 1.25,
        "version": "PostgreSQL 16.1",
        "error": None,
    }
    with patch(
        "backend.app.services.health.check_database_connection",
        return_value=mock_db_result,
    ):
        response = await async_client.get("/api/v1/health/database")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["connected"] is True
        assert data["latency_ms"] == 1.25
        assert data["error"] is None


@pytest.mark.asyncio
async def test_database_health_endpoint_unhealthy(async_client: AsyncClient):
    """Test database health check returns 503 when connection fails."""
    mock_db_result = {
        "status": "unhealthy",
        "connected": False,
        "latency_ms": 500.0,
        "version": None,
        "error": "Connection refused",
    }
    with patch(
        "backend.app.services.health.check_database_connection",
        return_value=mock_db_result,
    ):
        response = await async_client.get("/api/v1/health/database")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["connected"] is False
        assert "Connection refused" in data["error"]


@pytest.mark.asyncio
async def test_redis_health_endpoint_healthy(async_client: AsyncClient):
    """Test Redis health check when connection succeeds."""
    mock_redis_result = {
        "status": "healthy",
        "connected": True,
        "latency_ms": 0.85,
        "version": "7.2.4",
        "error": None,
    }
    with patch(
        "backend.app.services.health.check_redis_connection",
        return_value=mock_redis_result,
    ):
        response = await async_client.get("/api/v1/health/redis")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["connected"] is True
        assert data["version"] == "7.2.4"


@pytest.mark.asyncio
async def test_redis_health_endpoint_unhealthy(async_client: AsyncClient):
    """Test Redis health check returns 503 when connection fails."""
    mock_redis_result = {
        "status": "unhealthy",
        "connected": False,
        "latency_ms": 1000.0,
        "version": None,
        "error": "Redis node unreachable",
    }
    with patch(
        "backend.app.services.health.check_redis_connection",
        return_value=mock_redis_result,
    ):
        response = await async_client.get("/api/v1/health/redis")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["connected"] is False


@pytest.mark.asyncio
async def test_composite_health_all_healthy(async_client: AsyncClient):
    """Test composite health check GET /api/v1/health/all when all subsystems are operational."""
    with (
        patch(
            "backend.app.services.health.check_database_connection",
            return_value={
                "status": "healthy",
                "connected": True,
                "latency_ms": 1.0,
                "version": "16.1",
                "error": None,
            },
        ),
        patch(
            "backend.app.services.health.check_redis_connection",
            return_value={
                "status": "healthy",
                "connected": True,
                "latency_ms": 0.5,
                "version": "7.2",
                "error": None,
            },
        ),
    ):
        response = await async_client.get("/api/v1/health/all")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "learnova-backend"
        assert "components" in data
        assert data["components"]["api"]["connected"] is True
        assert data["components"]["database"]["connected"] is True
        assert data["components"]["redis"]["connected"] is True


@pytest.mark.asyncio
async def test_composite_health_degraded(async_client: AsyncClient):
    """Test composite health check GET /api/v1/health/all returns degraded status when one dependency is down."""
    with (
        patch(
            "backend.app.services.health.check_database_connection",
            return_value={
                "status": "healthy",
                "connected": True,
                "latency_ms": 1.0,
                "version": "16.1",
                "error": None,
            },
        ),
        patch(
            "backend.app.services.health.check_redis_connection",
            return_value={
                "status": "unhealthy",
                "connected": False,
                "latency_ms": 500.0,
                "version": None,
                "error": "Redis timeout",
            },
        ),
    ):
        response = await async_client.get("/api/v1/health/all")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"


@pytest.mark.asyncio
async def test_system_info_endpoint(async_client: AsyncClient):
    """Test system info endpoint GET /api/v1/system/info."""
    response = await async_client.get("/api/v1/system/info")
    assert response.status_code == 200
    data = response.json()
    assert "app_name" in data
    assert "python_version" in data
    assert data["api_prefix"] == "/api/v1"
