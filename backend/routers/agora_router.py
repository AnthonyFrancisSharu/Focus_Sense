from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional
from models import UserInDB
from auth import get_current_user
from agora_utils import generate_agora_token, get_agora_config
from pydantic import BaseModel

router = APIRouter(prefix="/api/agora", tags=["Agora Video"])


class TokenRequest(BaseModel):
    channel_name: str
    uid: Optional[int] = 0
    role: Optional[int] = 1  # 1 = publisher, 2 = subscriber


class TokenResponse(BaseModel):
    token: str
    app_id: str
    channel_name: str
    uid: int
    expires_in: int


@router.post("/token", response_model=TokenResponse)
async def get_agora_token(
    request: TokenRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Generate Agora RTC token for video calling
    
    - **channel_name**: Session ID to join
    - **uid**: User ID (0 for auto-assign)
    - **role**: 1 for publisher (teacher/student who can send video), 2 for subscriber
    """
    config = get_agora_config()
    
    if not config["available"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Agora video service is not configured. Please set AGORA_APP_ID and AGORA_APP_CERTIFICATE in .env"
        )
    
    token = generate_agora_token(
        channel_name=request.channel_name,
        uid=request.uid,
        role=request.role,
        expiration_time_in_seconds=3600  # 1 hour
    )
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate Agora token"
        )
    
    return TokenResponse(
        token=token,
        app_id=config["app_id"],
        channel_name=request.channel_name,
        uid=request.uid,
        expires_in=3600
    )


@router.get("/config")
async def get_config(current_user: UserInDB = Depends(get_current_user)):
    """Get Agora configuration (without sensitive data)"""
    config = get_agora_config()
    
    return {
        "available": config["available"],
        "app_id": config["app_id"] if config["available"] else None,
        "status": "configured" if config["available"] else "not_configured"
    }


@router.get("/health")
async def health_check():
    """Check if Agora service is available"""
    config = get_agora_config()
    
    return {
        "status": "healthy" if config["available"] else "unavailable",
        "configured": config["available"],
        "message": "Agora video service is ready" if config["available"] else "Agora not configured"
    }
