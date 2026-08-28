from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import asyncio
from database import connect_to_mongo, close_mongo_connection
from config import settings
from routers import auth_router, sessions_router, admin_router, websocket_router, notifications_router, emotion_router, agora_router, reports_router
from routers.websocket_router import get_emotion_detector

# Lifespan context manager for startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    # Pre-warm emotion model so the first WebSocket frame isn't delayed by model loading
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, get_emotion_detector)
    print("Application started successfully")
    yield
    # Shutdown
    await close_mongo_connection()
    print("Application shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="Learning System API",
    description="Backend API for Learning System with Eye and Emotion Tracking",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
# Note: Permissive settings for development. Restrict in production!
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Allow all hosts for development (disable host checking)
# This is necessary for port forwarding and tunnels
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]
)

# Include routers
app.include_router(auth_router)
app.include_router(sessions_router)
app.include_router(admin_router)
app.include_router(notifications_router)
app.include_router(emotion_router)
app.include_router(agora_router)
app.include_router(reports_router)
app.include_router(websocket_router)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Learning System API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        proxy_headers=True,  # Trust X-Forwarded-* headers
        forwarded_allow_ips="*",  # Allow forwarded IPs from any proxy
        # WebSocket configuration for stability
        ws_ping_interval=20.0,  # Send ping every 20 seconds
        ws_ping_timeout=30.0,   # Wait 30 seconds for pong response
        timeout_keep_alive=60,  # Keep connections alive for 60 seconds
    )
