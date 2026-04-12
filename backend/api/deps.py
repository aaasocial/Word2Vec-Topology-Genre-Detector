"""FastAPI dependency injection for Redis and arq pool."""
from fastapi import Request


async def get_redis(request: Request):
    return request.app.state.redis


async def get_arq_pool(request: Request):
    return request.app.state.arq_pool
