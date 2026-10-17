import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_ml_health_endpoint(ml_client: AsyncClient):
    """Test ML Service Health Endpoint GET /api/v1/health."""
    response = await ml_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "learnova-ml-service"
    assert "version" in data
    assert "capabilities" in data
    assert "student_risk_predictor" in data["capabilities"]
