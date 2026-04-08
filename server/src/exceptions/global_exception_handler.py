from fastapi import status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError

from starlette.requests import Request
from starlette.responses import JSONResponse


async def catch_global_exceptions(request: Request, call_next):
    try:
        return await call_next(request)

    except Exception as exc:
        base_error_message = f"Failed to execute: {request.method}: {request.url}"

        return JSONResponse(status_code=400, content={"message": f"{base_error_message}", "detail": exc.__str__()})


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=jsonable_encoder({"detail": exc.errors(), "body": exc.body}),
    )
