import pytest
from httpx import AsyncClient, ASGITransport
from backend.api.app import create_app


@pytest.fixture
async def app():
    _app = create_app()
    # Manually run lifespan so app.state.redis etc. are set
    async with _app.router.lifespan_context(_app):
        yield _app


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as c:
        yield c
