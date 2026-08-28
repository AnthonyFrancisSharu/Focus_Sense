from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from typing import Dict
import base64
import cv2
import numpy as np
from emotion_detector import EmotionDetector
from auth import get_current_user
from models import UserInDB, EmotionData
from datetime import datetime
import os

router = APIRouter(prefix="/api/emotion", tags=["Emotion Detection"])

# Initialize emotion detector
emotion_detector = None

def get_detector():
    """Get or initialize the emotion detector"""
    global emotion_detector
    if emotion_detector is None:
        model_path = os.getenv("EMOTION_MODEL_PATH", "models/emotion_model.joblib")
        labels_path = os.getenv("EMOTION_LABELS_PATH", "models/label_encoder.joblib")
        
        if os.path.exists(model_path) and os.path.exists(labels_path):
            try:
                emotion_detector = EmotionDetector(model_path, labels_path)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Emotion detection service unavailable: {str(e)}"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Emotion detection model files not found"
            )
    
    return emotion_detector

@router.post("/detect", response_model=Dict)
async def detect_emotion(
    image_data: Dict[str, str],
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Detect emotion from a base64-encoded image
    
    Request body:
    {
        "image": "base64_encoded_image_string"
    }
    """
    try:
        detector = get_detector()
        
        base64_image = image_data.get("image")
        if not base64_image:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No image data provided"
            )
        
        # Process the frame
        result = detector.process_base64_frame(base64_image)
        
        # Add timestamp
        result["timestamp"] = datetime.utcnow().isoformat()
        result["user_id"] = current_user.id
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing image: {str(e)}"
        )

@router.post("/detect-upload")
async def detect_emotion_upload(
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Detect emotion from an uploaded image file
    """
    try:
        detector = get_detector()
        
        # Read image file
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image file"
            )
        
        # Process the frame
        result = detector.process_frame(frame)
        
        # Add timestamp
        result["timestamp"] = datetime.utcnow().isoformat()
        result["user_id"] = current_user.id
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing image: {str(e)}"
        )

@router.get("/health")
async def emotion_detection_health():
    """
    Check if emotion detection service is available
    """
    model_path = os.getenv("EMOTION_MODEL_PATH", "models/emotion_model.joblib")
    labels_path = os.getenv("EMOTION_LABELS_PATH", "models/label_encoder.joblib")
    
    model_exists = os.path.exists(model_path)
    labels_exist = os.path.exists(labels_path)
    
    if model_exists and labels_exist:
        try:
            detector = get_detector()
            return {
                "status": "healthy",
                "model_loaded": True,
                "model_path": model_path,
                "labels_path": labels_path
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "model_loaded": False,
                "error": str(e)
            }
    else:
        return {
            "status": "unavailable",
            "model_loaded": False,
            "model_exists": model_exists,
            "labels_exist": labels_exist,
            "expected_model_path": model_path,
            "expected_labels_path": labels_path
        }

@router.get("/info")
async def emotion_detection_info():
    """
    Get information about the emotion detection system
    """
    return {
        "features": [
            "Real-time emotion detection",
            "37 facial features analyzed",
            "Head pose estimation (yaw, pitch, roll)",
            "Engagement level classification",
            "Focus level calculation",
            "Temporal smoothing for stability"
        ],
        "emotions": [
            "happy", "sad", "angry", "fear", "surprise", 
            "disgust", "neutral", "focused", "interested", 
            "bored", "confused", "calm", "thoughtful"
        ],
        "engagement_levels": ["active", "passive", "distracted"],
        "focus_range": "0-100"
    }
