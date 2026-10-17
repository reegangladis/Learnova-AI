import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from backend.app.core.errors import ResourceNotFoundError
from backend.app.core.exceptions import register_exception_handlers


@pytest.mark.asyncio
async def test_custom_app_exception_envelope():
    """Verify AppException handler produces standard error JSON."""
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/trigger-error")
    async def trigger_error():
        raise ResourceNotFoundError("Course module not found.", details={"id": 123})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/trigger-error")
        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "RESOURCE_NOT_FOUND"
        assert data["error"]["message"] == "Course module not found."
        assert data["error"]["details"] == {"id": 123}
