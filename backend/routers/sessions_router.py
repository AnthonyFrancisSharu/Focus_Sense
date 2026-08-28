from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from typing import List, Optional
from models import (
    SessionCreate, SessionResponse, SessionJoin, 
    StudentInSession, UserInDB, EngagementData
)
from auth import get_current_user, get_current_teacher, get_current_student
from database import get_database
from utils import generate_session_code
from bson import ObjectId

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

# Import manager for WebSocket notifications (lazy import to avoid circular deps)
def get_websocket_manager():
    from routers.websocket_router import manager
    return manager

# Teacher Session Management
@router.post("/create", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_data: SessionCreate,
    current_user: UserInDB = Depends(get_current_teacher)
):
    """Create a new learning session (Teacher only)"""
    db = await get_database()
    
    # Generate unique session code
    session_code = generate_session_code()
    while await db.sessions.find_one({"session_code": session_code}):
        session_code = generate_session_code()
    
    # Create session (active by default so students can join immediately)
    session_dict = {
        "_id": str(ObjectId()),
        "session_code": session_code,
        "teacher_id": current_user.id,
        "teacher_name": current_user.name,
        "subject": session_data.subject,
        "max_students": session_data.max_students,
        "is_active": True,  # Active by default
        "students": [],
        "participants": [],  # Historical participant list (who joined)
        "created_at": datetime.utcnow(),
        "started_at": datetime.utcnow(),  # Set start time immediately
        "ended_at": None
    }
    
    await db.sessions.insert_one(session_dict)
    
    return SessionResponse(**session_dict)

@router.post("/{session_id}/start", response_model=SessionResponse)
async def start_session(
    session_id: str,
    current_user: UserInDB = Depends(get_current_teacher)
):
    """Start a session (Teacher only)"""
    db = await get_database()
    
    # Find session
    session = await db.sessions.find_one({"_id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Verify teacher owns the session
    if session["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to start this session"
        )
    
    # Check if already active (return current state if so)
    if session["is_active"]:
        # Session already active, just return it
        session_dict = {k: v for k, v in session.items()}
        session_dict["id"] = str(session_dict.pop("_id"))
        return SessionResponse(**session_dict)
    
    # Start session
    await db.sessions.update_one(
        {"_id": session_id},
        {
            "$set": {
                "is_active": True,
                "started_at": datetime.utcnow()
            }
        }
    )
    
    # Get updated session
    updated_session = await db.sessions.find_one({"_id": session_id})
    
    return SessionResponse(**updated_session)

@router.post("/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: str,
    current_user: UserInDB = Depends(get_current_teacher)
):
    """End a session (Teacher only)"""
    db = await get_database()
    
    # Find session
    session = await db.sessions.find_one({"_id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Verify teacher owns the session
    if session["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to end this session"
        )
    
    # Import manager to send WebSocket notification
    from routers.websocket_router import manager
    
    # Notify all students that session has ended
    await manager.send_to_students(session_id, {
        "type": "session_ended",
        "message": "Teacher has ended the session",
        "timestamp": datetime.utcnow().isoformat()
    })
    
    # End session
    await db.sessions.update_one(
        {"_id": session_id},
        {
            "$set": {
                "is_active": False,
                "ended_at": datetime.utcnow()
            }
        }
    )
    
    # Get updated session
    updated_session = await db.sessions.find_one({"_id": session_id})
    
    return SessionResponse(**updated_session)

@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    current_user: UserInDB = Depends(get_current_teacher)
):
    """Delete a session (Teacher only)"""
    db = await get_database()
    
    # Find session
    session = await db.sessions.find_one({"_id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Verify teacher owns the session
    if session["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this session"
        )
    
    # Don't allow deleting active sessions
    if session.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete an active session. End the session first."
        )
    
    # Delete the session
    await db.sessions.delete_one({"_id": session_id})
    
    # Also delete associated engagement data
    await db.engagement_data.delete_many({"session_id": session_id})
    
    print(f"🗑️ Session {session_id} deleted by teacher {current_user.id}")
    
    return {"message": "Session deleted successfully", "session_id": session_id}

@router.post("/{session_id}/restart", response_model=SessionResponse)
async def restart_session(
    session_id: str,
    current_user: UserInDB = Depends(get_current_teacher)
):
    """Restart a past session with the same ID (Teacher only)"""
    db = await get_database()
    
    # Find session
    session = await db.sessions.find_one({"_id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Verify teacher owns the session
    if session["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to restart this session"
        )
    
    # Check if session is already active
    if session.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is already active"
        )
    
    # Restart the session - clear students and reactivate
    await db.sessions.update_one(
        {"_id": session_id},
        {
            "$set": {
                "is_active": True,
                "students": [],  # Clear previous students
                "started_at": datetime.utcnow(),
                "ended_at": None
            }
        }
    )
    
    # Get updated session
    updated_session = await db.sessions.find_one({"_id": session_id})
    
    print(f"🔄 Session {session_id} restarted by teacher {current_user.id}")
    
    return SessionResponse(**updated_session)

@router.get("/teacher", response_model=List[SessionResponse])
async def get_teacher_sessions(
    current_user: UserInDB = Depends(get_current_teacher)
):
    """Get all sessions for the current teacher"""
    db = await get_database()
    
    # Find all sessions for this teacher
    sessions = await db.sessions.find(
        {"teacher_id": current_user.id}
    ).sort("created_at", -1).to_list(length=100)
    
    return [SessionResponse(**session) for session in sessions]

@router.get("/teacher/active")
async def get_active_teacher_session(
    current_user: UserInDB = Depends(get_current_teacher)
):
    """Get the current active session for the teacher (returns null if no active session)"""
    db = await get_database()
    
    # Find active session
    session = await db.sessions.find_one({
        "teacher_id": current_user.id,
        "is_active": True
    })
    
    # Return null if no active session (not an error)
    if not session:
        return None
    
    return SessionResponse(**session)

# Student Session Management
@router.post("/join", response_model=SessionResponse)
async def join_session(
    join_data: SessionJoin,
    current_user: UserInDB = Depends(get_current_student)
):
    """Join a session with session code (Student only)"""
    db = await get_database()
    
    # Find session by code
    session = await db.sessions.find_one({"session_code": join_data.session_code})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check if session is active
    if not session["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is not active"
        )
    
    # Check if student is already in session
    if any(s["id"] == current_user.id for s in session["students"]):
        return SessionResponse(**session)
    
    # Check if session is full
    if len(session["students"]) >= session["max_students"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is full"
        )
    
    # Add student to session
    joined_at = datetime.utcnow()
    student_data = {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "joined_at": joined_at,
        "emotion": None,
        "engagement": None,
        "focus_level": None
    }
    
    await db.sessions.update_one(
        {"_id": session["_id"]},
        {"$push": {"students": student_data}}
    )

    # Track historical participants even if they later leave from active students list.
    participant_update = await db.sessions.update_one(
        {
            "_id": session["_id"],
            "participants.id": current_user.id
        },
        {
            "$set": {
                "participants.$.name": current_user.name,
                "participants.$.email": current_user.email,
                "participants.$.last_joined_at": joined_at
            }
        }
    )
    if participant_update.modified_count == 0:
        await db.sessions.update_one(
            {"_id": session["_id"]},
            {
                "$push": {
                    "participants": {
                        "id": current_user.id,
                        "name": current_user.name,
                        "email": current_user.email,
                        "first_joined_at": joined_at,
                        "last_joined_at": joined_at,
                        "last_left_at": None
                    }
                }
            }
        )
    
    # Get updated session
    updated_session = await db.sessions.find_one({"_id": session["_id"]})
    
    return SessionResponse(**updated_session)

@router.post("/{session_id}/leave")
async def leave_session(
    session_id: str,
    current_user: UserInDB = Depends(get_current_student)
):
    """Leave a session (Student only)"""
    db = await get_database()
    
    # Check if session exists
    session = await db.sessions.find_one({"_id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get student info before removing (for notification)
    student_info = next((s for s in session.get("students", []) if s["id"] == current_user.id), None)
    student_name = student_info.get("name", current_user.name) if student_info else current_user.name
    
    # Remove student from session (may already be removed by WebSocket disconnect)
    result = await db.sessions.update_one(
        {"_id": session_id},
        {"$pull": {"students": {"id": current_user.id}}}
    )

    await db.sessions.update_one(
        {
            "_id": session_id,
            "participants.id": current_user.id
        },
        {
            "$set": {
                "participants.$.last_left_at": datetime.utcnow()
            }
        }
    )
    
    # Send WebSocket notification to teacher about student leaving
    try:
        ws_manager = get_websocket_manager()
        await ws_manager.send_to_teacher(session_id, {
            "type": "student_leave",
            "data": {
                "student_id": current_user.id,
                "student_name": student_name,
                "timestamp": datetime.utcnow().isoformat(),
                "source": "api"  # Indicates this came from the leave API
            }
        })
        print(f"📨 Sent student_leave notification via API for {student_name}")
    except Exception as e:
        print(f"⚠️ Failed to send WebSocket notification: {e}")
    
    # Return success even if student was already removed (by WebSocket handler)
    # This prevents errors when WebSocket disconnect races with API call
    if result.modified_count == 0:
        print(f"Student {current_user.id} was already removed from session {session_id}")
    else:
        print(f"Student {current_user.id} ({student_name}) removed from session {session_id} via API")
    
    return {"message": "Left session successfully", "student_id": current_user.id}

@router.get("/student", response_model=List[SessionResponse])
async def get_student_sessions(
    current_user: UserInDB = Depends(get_current_student)
):
    """Get all sessions the student has joined"""
    db = await get_database()
    
    # Find all sessions where student is in students array
    sessions = await db.sessions.find(
        {"students.id": current_user.id}
    ).sort("created_at", -1).to_list(length=100)
    
    return [SessionResponse(**session) for session in sessions]

@router.get("/student/active", response_model=SessionResponse)
async def get_active_student_session(
    current_user: UserInDB = Depends(get_current_student)
):
    """Get the current active session for the student"""
    db = await get_database()
    
    # Find active session where student is enrolled
    session = await db.sessions.find_one({
        "students.id": current_user.id,
        "is_active": True
    })
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active session found"
        )
    
    return SessionResponse(**session)

# Engagement Tracking
@router.post("/{session_id}/engagement")
async def update_engagement(
    session_id: str,
    engagement_data: EngagementData,
    current_user: UserInDB = Depends(get_current_user)
):
    """Update student engagement data in a session"""
    db = await get_database()
    
    # Verify session exists
    session = await db.sessions.find_one({"_id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Update student data in session
    await db.sessions.update_one(
        {
            "_id": session_id,
            "students.id": engagement_data.student_id
        },
        {
            "$set": {
                "students.$.emotion": engagement_data.emotion,
                "students.$.engagement": engagement_data.engagement,
                "students.$.focus_level": engagement_data.focus_level
            }
        }
    )
    
    # Store engagement data history
    engagement_dict = engagement_data.model_dump()
    engagement_dict["_id"] = str(ObjectId())
    await db.engagement_data.insert_one(engagement_dict)
    
    return {"message": "Engagement data updated successfully"}

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get a specific session by ID"""
    db = await get_database()
    
    session = await db.sessions.find_one({"_id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check if user has access to this session
    is_teacher = session["teacher_id"] == current_user.id
    is_student = any(s["id"] == current_user.id for s in session["students"])
    is_admin = current_user.role == "admin"
    
    if not (is_teacher or is_student or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this session"
        )
    
    return SessionResponse(**session)
