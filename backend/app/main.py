# Import routers
from app.routers import auth, employee, project, seat, dashboard, ai_assistant

# Include routers
app.include_router(auth.router)
app.include_router(employee.router)
app.include_router(project.router)
app.include_router(seat.router)
app.include_router(dashboard.router)
app.include_router(ai_assistant.router)

# ===================== Root Endpoint =====================
@app.get("/", tags=["System"])
def root():
    return {
        "status": "success",
        "message": "Ethara Seat Allocation System API is running successfully!",
        "docs": "/docs",
        "health": "/health"
    }

# ===================== Health Check =====================
@app.get("/health", tags=["System Health"])
def health_check():
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": "1.0.0"
    }