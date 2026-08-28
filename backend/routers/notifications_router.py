from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from models import NotificationCreate, NotificationResponse, UserInDB, BroadcastNotification
from auth import get_current_user, get_current_teacher
from database import get_database
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("/", response_model=List[NotificationResponse])
async def get_user_notifications(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get notifications for the current user"""
    db = await get_database()
    
    query = {"user_id": current_user.id}
    if unread_only:
        query["read"] = False
    
    notifications = await db.notifications.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    return [NotificationResponse(**notification) for notification in notifications]

@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification: NotificationCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Create a new notification"""
    db = await get_database()
    
    notification_dict = notification.model_dump()
    notification_dict["_id"] = str(ObjectId())
    notification_dict["created_at"] = datetime.utcnow()
    notification_dict["read"] = False
    
    await db.notifications.insert_one(notification_dict)
    
    return NotificationResponse(**notification_dict)

@router.post("/broadcast", status_code=status.HTTP_201_CREATED)
async def broadcast_notification(
    notification: BroadcastNotification,
    current_user: UserInDB = Depends(get_current_teacher)
):
    """Broadcast a notification to all users of a specific role (teacher only)"""
    db = await get_database()
    
    # Build query for target users
    query = {}
    if notification.target_role == "student":
        query["role"] = "student"
    elif notification.target_role == "teacher":
        query["role"] = "teacher"
    # "all" means no role filter
    
    # Get all target users
    users = await db.users.find(query).to_list(length=None)
    
    if not users:
        return {"message": "No users found to notify", "count": 0}
    
    # Create notifications for all users
    notifications_to_insert = []
    for user in users:
        user_id = user.get("_id") or user.get("id")
        notification_doc = {
            "_id": str(ObjectId()),
            "user_id": user_id,
            "title": notification.title,
            "message": notification.message,
            "type": notification.type,
            "category": notification.category,
            "session_id": notification.session_id,
            "session_code": notification.session_code,
            "action_url": notification.action_url,
            "action_label": notification.action_label,
            "created_at": datetime.utcnow(),
            "read": False,
            "sender_id": current_user.id,
            "sender_name": current_user.name
        }
        notifications_to_insert.append(notification_doc)
    
    # Insert all notifications
    if notifications_to_insert:
        await db.notifications.insert_many(notifications_to_insert)
    
    return {
        "message": f"Notification sent to {len(notifications_to_insert)} {notification.target_role}(s)",
        "count": len(notifications_to_insert)
    }

@router.post("/session/{session_id}/notify", status_code=status.HTTP_201_CREATED)
async def notify_session_started(
    session_id: str,
    current_user: UserInDB = Depends(get_current_teacher)
):
    """Send notification to all students about a session (quick session notify)"""
    db = await get_database()
    
    # Get session details
    session = await db.sessions.find_one({"_id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Verify teacher owns this session
    if session["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only send notifications for your own sessions"
        )
    
    # Get all students
    students = await db.users.find({"role": "student"}).to_list(length=None)
    
    if not students:
        return {"message": "No students found to notify", "count": 0}
    
    # Create notification for each student
    notifications_to_insert = []
    for student in students:
        student_id = student.get("_id") or student.get("id")
        notification_doc = {
            "_id": str(ObjectId()),
            "user_id": student_id,
            "title": f"📚 New Session: {session['subject']}",
            "message": f"Teacher {current_user.name} has started a new learning session. Join with code: {session['session_code']}",
            "type": "info",
            "category": "session",
            "session_id": session_id,
            "session_code": session["session_code"],
            "action_url": "/student/dashboard",
            "action_label": "Join Session",
            "created_at": datetime.utcnow(),
            "read": False,
            "sender_id": current_user.id,
            "sender_name": current_user.name
        }
        notifications_to_insert.append(notification_doc)
    
    # Insert all notifications
    if notifications_to_insert:
        await db.notifications.insert_many(notifications_to_insert)
    
    return {
        "message": f"Session notification sent to {len(notifications_to_insert)} student(s)",
        "count": len(notifications_to_insert),
        "session_code": session["session_code"]
    }

@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Mark a notification as read"""
    db = await get_database()
    
    result = await db.notifications.update_one(
        {"_id": notification_id, "user_id": current_user.id},
        {"$set": {"read": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return {"message": "Notification marked as read"}

@router.put("/read-all")
async def mark_all_notifications_read(
    current_user: UserInDB = Depends(get_current_user)
):
    """Mark all notifications as read for the current user"""
    db = await get_database()
    
    result = await db.notifications.update_many(
        {"user_id": current_user.id, "read": False},
        {"$set": {"read": True}}
    )
    
    return {"message": f"Marked {result.modified_count} notifications as read"}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Delete a notification"""
    db = await get_database()
    
    result = await db.notifications.delete_one(
        {"_id": notification_id, "user_id": current_user.id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return {"message": "Notification deleted successfully"}

@router.get("/unread-count")
async def get_unread_count(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get count of unread notifications"""
    db = await get_database()
    
    count = await db.notifications.count_documents({
        "user_id": current_user.id,
        "read": False
    })
    
    return {"unread_count": count}
