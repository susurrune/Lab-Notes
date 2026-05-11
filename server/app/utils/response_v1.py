from datetime import datetime, timezone
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


def build_meta(request: Request, extra: dict | None = None) -> dict:
    meta = {
        "requestId": getattr(request.state, "request_id", None),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if extra:
        meta.update(extra)
    return meta


def ok(
    data: Any,
    request: Request,
    status_code: int = 200,
    meta: dict | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"ok": True, "data": data, "meta": build_meta(request, meta)},
    )


def fail(
    request: Request,
    code: str,
    message: str,
    detail: Any = None,
    status_code: int = 400,
    meta: dict | None = None,
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
            "meta": build_meta(request, meta),
        },
    )
