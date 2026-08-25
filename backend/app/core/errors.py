import logging

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("docflow.errors")


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message
        super().__init__(message)


async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "request_id": getattr(request.state, "request_id", None),
            }
        },
    )


async def unexpected_error_handler(request: Request, exc: Exception):
    logger.exception(
        "unhandled_exception",
        extra={"request_id": getattr(request.state, "request_id", None), "path": request.url.path},
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred",
                "request_id": getattr(request.state, "request_id", None),
            }
        },
    )
