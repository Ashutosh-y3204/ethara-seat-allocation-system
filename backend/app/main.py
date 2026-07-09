import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config.settings import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()],
)

logger = logging.getLogger("ethara_system")

# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="Enterprise-grade Seat Allocation & Project Mapping System backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handling middleware
@app.middleware("http")
async def exception_handler_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as exc:
        logger.error(
            f"Unhandled exception during request {request.url.path}: {exc}",
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "An internal server error occurred. Please contact the administrator."
            },
        )


# Request logging middleware
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(
        f"Completed request: {request.method} {request.url.path} -> {response.status_code}"
    )
    return response


# Import routers
from app.routers import (
    auth,
    employee,
    project,
    seat,
    dashboard,
    ai_assistant,
)

# Register routers
app.include_router(auth.router)
app.include_router(employee.router)
app.include_router(project.router)
app.include_router(seat.router)
app.include_router(dashboard.router)
app.include_router(ai_assistant.router)


# Root endpoint
@app.get("/", tags=["System"])
def root():
    return {
        "status": "success",
        "message": "Ethara Seat Allocation System API is running successfully!",
        "version": "1.0.0",
        "documentation": "/docs",
        "health": "/health",
    }


# Health endpoint
@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": "1.0.0",
    }