import os
import sys
from collections.abc import AsyncGenerator
from pathlib import Path

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

os.environ["APP_ENV"] = "testing"
os.environ["INTERNAL_SERVICE_KEY"] = "test-internal-ai-key"

# Resolve ai-service main module without namespace collision
service_dir = Path(__file__).parent.parent
sys.path.insert(0, str(service_dir))

# Unload any previously cached 'app' modules from other services
for mod_name in list(sys.modules.keys()):
    if mod_name == "app" or mod_name.startswith("app."):
        del sys.modules[mod_name]

from app.main import create_ai_application


@pytest_asyncio.fixture
async def ai_client() -> AsyncGenerator[AsyncClient, None]:
    """Test client for AI Service API with authenticated internal service key."""
    app = create_ai_application()
    transport = ASGITransport(app=app)
    headers = {"X-Internal-Service-Key": "test-internal-ai-key"}
    async with AsyncClient(transport=transport, base_url="http://testserver", headers=headers) as client:
        yield client
