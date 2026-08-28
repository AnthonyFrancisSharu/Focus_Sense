"""
Agora RTC Token Generator
Generates tokens for video calling
"""
import os
import time
from typing import Optional

# Install: pip install agora-token-builder
try:
    from agora_token_builder import RtcTokenBuilder
    AGORA_AVAILABLE = True
except ImportError:
    AGORA_AVAILABLE = False
    print("Warning: agora-token-builder not installed. Run: pip install agora-token-builder")


def generate_agora_token(
    channel_name: str,
    uid: int = 0,
    role: int = 1,  # 1 = publisher (can send/receive), 2 = subscriber (receive only)
    expiration_time_in_seconds: int = 3600
) -> Optional[str]:
    """
    Generate Agora RTC token for video calling
    
    Args:
        channel_name: The channel name (session_id)
        uid: User ID (0 for auto-assign)
        role: 1 for publisher, 2 for subscriber
        expiration_time_in_seconds: Token validity duration
    
    Returns:
        Token string or None if Agora not configured
    """
    if not AGORA_AVAILABLE:
        return None
    
    app_id = os.getenv("AGORA_APP_ID")
    app_certificate = os.getenv("AGORA_APP_CERTIFICATE")
    
    if not app_id or not app_certificate:
        print("Warning: AGORA_APP_ID or AGORA_APP_CERTIFICATE not set in .env")
        return None
    
    # Calculate privilege expired timestamp
    current_timestamp = int(time.time())
    privilege_expired_ts = current_timestamp + expiration_time_in_seconds
    
    try:
        token = RtcTokenBuilder.buildTokenWithUid(
            app_id,
            app_certificate,
            channel_name,
            uid,
            role,
            privilege_expired_ts
        )
        return token
    except Exception as e:
        print(f"Error generating Agora token: {e}")
        return None


def get_agora_config() -> dict:
    """Get Agora configuration"""
    app_id = os.getenv("AGORA_APP_ID")
    
    return {
        "app_id": app_id,
        "available": AGORA_AVAILABLE and app_id is not None
    }
