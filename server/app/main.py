from datetime import datetime, timezone
import os
import time
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.errors import BusinessError
from app.core.logging import configure_logging, get_logger
from app.core.config import get_settings
from app.db.init_db import init_db

from app.api.v1.router import api_router


def build_meta(request: Request, extra: dict | None = None) -> dict:
    meta = {
        "requestId": getattr(request.state, "request_id", None),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if extra:
        meta.update(extra)
    return meta


def success(data, request: Request, status_code: int = 200) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"ok": True, "data": data, "meta": build_meta(request)},
    )


def failure(
    request: Request,
    code: str,
    message: str,
    detail=None,
    status_code: int = 400,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "ok": False,
            "error": {
                "code": code,
                "message": message,
                "detail": detail,
            },
            "meta": build_meta(request),
        },
    )


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging()
    logger = get_logger()
    app = FastAPI(title=settings.app_name, version=settings.version)
    raw_origins = os.getenv("CORS_ORIGINS", "")
    if raw_origins.strip():
        cors_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    else:
        cors_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        request.state.request_id = str(uuid4())
        start_time = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                "request failed request_id=%s method=%s path=%s duration_ms=%.2f error=%s",
                request.state.request_id,
                request.method,
                request.url.path,
                duration_ms,
                str(exc),
                exc_info=True,
            )
            raise
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.info(
            "request completed request_id=%s method=%s path=%s status=%s duration_ms=%.2f",
            request.state.request_id,
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        response.headers["X-Request-ID"] = request.state.request_id
        return response

    @app.on_event("startup")
    def on_startup() -> None:
        init_db()

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        logger.warning(
            "http_exception request_id=%s method=%s path=%s status=%s detail=%s",
            getattr(request.state, "request_id", None),
            request.method,
            request.url.path,
            exc.status_code,
            str(exc.detail),
        )
        return failure(
            request,
            code=f"HTTP_{exc.status_code}",
            message=str(exc.detail),
            detail=None,
            status_code=exc.status_code,
        )

    @app.exception_handler(BusinessError)
    async def business_exception_handler(request: Request, exc: BusinessError):
        logger.warning(
            "business_exception request_id=%s method=%s path=%s code=%s status=%s message=%s",
            getattr(request.state, "request_id", None),
            request.method,
            request.url.path,
            exc.code,
            exc.status_code,
            exc.message,
        )
        return failure(
            request,
            code=exc.code,
            message=exc.message,
            detail=exc.detail,
            status_code=exc.status_code,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(
            "validation_error request_id=%s method=%s path=%s detail=%s",
            getattr(request.state, "request_id", None),
            request.method,
            request.url.path,
            exc.errors(),
        )
        return failure(
            request,
            code="VALIDATION_ERROR",
            message="Validation error",
            detail=exc.errors(),
            status_code=422,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(
            "unhandled_exception request_id=%s method=%s path=%s error=%s",
            getattr(request.state, "request_id", None),
            request.method,
            request.url.path,
            str(exc),
            exc_info=True,
        )
        return failure(
            request,
            code="INTERNAL_ERROR",
            message="Internal server error",
            detail=str(exc),
            status_code=500,
        )

    @app.get("/health")
    async def health(request: Request):
        return success({"status": "ok"}, request)

    @app.get("/")
    async def root(request: Request):
        return success({"message": "Server is running"}, request)

    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
