import logging
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from redis import Redis
from sqlalchemy import create_engine, text
from starlette.exceptions import HTTPException

from nilart.bootstrap.settings import settings
from nilart.contexts.catalog.presentation.artworks import router as artworks_router
from nilart.contexts.catalog.presentation.bundles import router as bundles_router
from nilart.contexts.catalog.presentation.options import router as options_router
from nilart.contexts.catalog.presentation.prices import router as prices_router
from nilart.contexts.catalog.presentation.router import router as catalog_router
from nilart.contexts.catalog.presentation.sku_authoring import router as sku_authoring_router
from nilart.contexts.commissions.router import router as commissions_router
from nilart.contexts.identity.presentation.access import router as access_router
from nilart.contexts.identity.presentation.otp_router import router as otp_router
from nilart.contexts.identity.presentation.profile import router as profile_router
from nilart.contexts.identity.presentation.router import router as identity_router

logger = logging.getLogger("nilart")
app = FastAPI(title="Nilart API", version="0.1.0")
app.include_router(catalog_router)
app.include_router(bundles_router)
app.include_router(commissions_router)
app.include_router(artworks_router)
app.include_router(options_router)
app.include_router(prices_router)
app.include_router(sku_authoring_router)
app.include_router(identity_router)
app.include_router(access_router)
app.include_router(otp_router)
app.include_router(profile_router)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request.state.request_id = str(uuid4())
    response = await call_next(request)
    # Validation and routing failures bypass individual private endpoint handlers.
    if any(request.url.path == prefix or request.url.path.startswith(prefix + "/")
           for prefix in ("/api/v1/auth", "/api/v1/account", "/api/v1/admin")):
        response.headers["Cache-Control"] = "no-store"
    response.headers["X-Request-ID"] = request.state.request_id
    logger.info("request", extra={"request_id": request.state.request_id,
                                 "path": request.url.path, "status": response.status_code})
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"code": "validation_error",
        "request_id": request.state.request_id,
        "fields": [{"path": list(e["loc"]), "code": e["type"]} for e in exc.errors()]})


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    identity_code = exc.detail.get("code") if isinstance(exc.detail, dict) else None
    return JSONResponse(status_code=exc.status_code, headers=exc.headers,
        content={"code": identity_code if identity_code in {"unauthenticated", "permission_denied"}
                 else "not_found" if exc.status_code == 404 else "http_error",
                 "detail": exc.detail, "request_id": request.state.request_id})


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    request_id = request.state.request_id
    # Exception messages and traces can contain credentials or submitted data.
    logger.error("unexpected_error", extra={"request_id": request_id,
                                          "error_type": type(exc).__name__})
    return JSONResponse(status_code=500,
        content={"code": "internal_error", "request_id": request_id},
        headers={"Cache-Control": "no-store", "X-Request-ID": request_id})


@app.get("/api/v1/health/live")
def live():
    return {"status": "ok", "environment": settings.environment}


@app.get("/api/v1/health/ready")
def ready():
    engine = create_engine(settings.database_url, connect_args={"connect_timeout": 2})
    cache = Redis.from_url(settings.redis_url, socket_connect_timeout=2, socket_timeout=2)
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        cache.ping()
    except Exception:
        return JSONResponse(status_code=503, content={"status": "not_ready"})
    finally:
        engine.dispose()
        cache.close()
    return {"status": "ready"}
