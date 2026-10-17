import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_ai_health_endpoint(ai_client: AsyncClient):
    """Test AI Service Health Endpoint GET /api/v1/health."""
    response = await ai_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "learnova-ai-service"
    assert "version" in data
    assert "providers" in data
    assert "openai" in data["providers"]
    assert "embeddings" in data["providers"]
