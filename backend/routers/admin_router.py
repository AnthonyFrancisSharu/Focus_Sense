from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from models import UserResponse, SessionResponse, SystemStats, UserInDB
from auth import get_current_admin
from database import get_database
from bson import ObjectId

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: UserInDB = Depends(get_current_admin)
):
    """Get all users (Admin only)"""
    db = await get_database()
    
    users = await db.users.find().skip(skip).limit(limit).to_list(length=limit)
    
    return [UserResponse(**user) for user in users]

@router.get("/users/role/{role}", response_model=List[UserResponse])
async def get_users_by_role(
    role: str,
    skip: int = 0,
    limit: int = 100,
    current_user: UserInDB = Depends(get_current_admin)
):
    """Get users by role (Admin only)"""
    db = await get_database()
    
    if role not in ["admin", "teacher", "student"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role"
        )
    
    users = await db.users.find({"role": role}).skip(skip).limit(limit).to_list(length=limit)
    
    return [UserResponse(**user) for user in users]

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: UserInDB = Depends(get_current_admin)
):
    """Get a specific user by ID (Admin only)"""
    db = await get_database()
    
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(**user)

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: UserInDB = Depends(get_current_admin)
):
    """Delete a user (Admin only)"""
    db = await get_database()
    
    # Prevent admin from deleting themselves
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Delete user
    result = await db.users.delete_one({"_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Also remove user from all sessions
    await db.sessions.update_many(
        {"students.id": user_id},
        {"$pull": {"students": {"id": user_id}}}
    )
    
    return {"message": "User deleted successfully"}

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    new_role: str,
    current_user: UserInDB = Depends(get_current_admin)
):
    """Update user role (Admin only)"""
    db = await get_database()
    
    if new_role not in ["admin", "teacher", "student"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role"
        )
    
    # Prevent admin from changing their own role
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role"
        )
    
    # Update user role
    result = await db.users.update_one(
        {"_id": user_id},
        {"$set": {"role": new_role}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"message": f"User role updated to {new_role}"}

@router.get("/sessions", response_model=List[SessionResponse])
async def get_all_sessions(
    skip: int = 0,
    limit: int = 100,
    current_user: UserInDB = Depends(get_current_admin)
):
    """Get all sessions (Admin only)"""
    db = await get_database()
    
    sessions = await db.sessions.find().skip(skip).limit(limit).sort("created_at", -1).to_list(length=limit)
    
    return [SessionResponse(**session) for session in sessions]

@router.get("/sessions/active", response_model=List[SessionResponse])
async def get_active_sessions(
    current_user: UserInDB = Depends(get_current_admin)
):
    """Get all active sessions (Admin only)"""
    db = await get_database()
    
    sessions = await db.sessions.find({"is_active": True}).sort("started_at", -1).to_list(length=100)
    
    return [SessionResponse(**session) for session in sessions]

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: UserInDB = Depends(get_current_admin)
):
    """Delete a session (Admin only)"""
    db = await get_database()
    
    # Delete session
    result = await db.sessions.delete_one({"_id": session_id})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Delete related engagement data
    await db.engagement_data.delete_many({"session_id": session_id})
    
    return {"message": "Session deleted successfully"}

@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    current_user: UserInDB = Depends(get_current_admin)
):
    """Get system statistics (Admin only)"""
    db = await get_database()
    
    # Count users by role
    total_users = await db.users.count_documents({})
    total_admins = await db.users.count_documents({"role": "admin"})
    total_teachers = await db.users.count_documents({"role": "teacher"})
    total_students = await db.users.count_documents({"role": "student"})
    
    # Count sessions
    total_sessions = await db.sessions.count_documents({})
    active_sessions = await db.sessions.count_documents({"is_active": True})
    completed_sessions = await db.sessions.count_documents({"is_active": False, "ended_at": {"$ne": None}})
    
    return SystemStats(
        total_users=total_users,
        total_admins=total_admins,
        total_teachers=total_teachers,
        total_students=total_students,
        total_sessions=total_sessions,
        active_sessions=active_sessions,
        completed_sessions=completed_sessions
    )

@router.get("/engagement/{session_id}")
async def get_session_engagement_data(
    session_id: str,
    current_user: UserInDB = Depends(get_current_admin)
):
    """Get engagement data for a specific session (Admin only)"""
    db = await get_database()
    
    # Verify session exists
    session = await db.sessions.find_one({"_id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get all engagement data for this session
    engagement_data = await db.engagement_data.find(
        {"session_id": session_id}
    ).sort("timestamp", 1).to_list(length=1000)
    
    return {
        "session_id": session_id,
        "session_code": session["session_code"],
        "subject": session["subject"],
        "teacher_name": session["teacher_name"],
        "engagement_data": engagement_data
    }
