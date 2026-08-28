# This file makes the routers directory a Python package
from .auth_router import router as auth_router
from .sessions_router import router as sessions_router
from .admin_router import router as admin_router
from .websocket_router import router as websocket_router
from .notifications_router import router as notifications_router
from .emotion_router import router as emotion_router
from .agora_router import router as agora_router
from .reports_router import router as reports_router

__all__ = ["auth_router", "sessions_router", "admin_router", "websocket_router", "notifications_router", "emotion_router", "agora_router", "reports_router"]
