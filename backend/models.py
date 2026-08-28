from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Literal, Dict
from datetime import datetime
from bson import ObjectId

# Custom ObjectId field for Pydantic
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)
    
    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: Literal["admin", "teacher", "student"]
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    avatar: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    avatar: Optional[str] = None

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_code: str
    new_password: str

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    hashed_password: str
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class UserResponse(UserBase):
    id: str = Field(alias="_id")
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# Session Models
class SessionCreate(BaseModel):
    subject: str
    max_students: int = 30

class SessionJoin(BaseModel):
    session_code: str

class StudentInSession(BaseModel):
    id: str
    name: str
    email: str
    joined_at: datetime
    emotion: Optional[str] = None
    raw_emotion: Optional[str] = None
    confidence: Optional[float] = None
    engagement: Optional[Literal["active", "passive", "distracted"]] = None
    focus_level: Optional[int] = None
    face_detected: Optional[bool] = None
    pose: Optional[Dict[str, float]] = None  # yaw, pitch, roll

class SessionBase(BaseModel):
    session_code: str
    teacher_id: str
    teacher_name: str
    subject: str
    max_students: int
    is_active: bool
    students: list[StudentInSession] = []

class SessionInDB(SessionBase):
    id: str = Field(alias="_id")
    created_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class SessionResponse(SessionBase):
    id: str = Field(alias="_id")
    created_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
        # Ensure _id is serialized as both id and _id for frontend compatibility
        by_alias = False

# Emotion and Engagement Models
class EmotionData(BaseModel):
    emotion: str
    raw_emotion: Optional[str] = None
    confidence: float
    engagement: Optional[Literal["active", "passive", "distracted"]] = None
    focus_level: Optional[int] = None
    face_detected: bool
    pose: Optional[Dict[str, float]] = None
    timestamp: datetime

class EngagementData(BaseModel):
    student_id: str
    session_id: str
    emotion: Optional[str] = None
    raw_emotion: Optional[str] = None
    confidence: Optional[float] = None
    engagement: Optional[Literal["active", "passive", "distracted"]] = None
    focus_level: Optional[int] = None
    face_detected: Optional[bool] = None
    pose: Optional[Dict[str, float]] = None
    timestamp: datetime

class EngagementInDB(EngagementData):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# Notification Models
class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: Literal["info", "warning", "error", "success"]
    category: Optional[Literal["system", "session", "user", "achievement"]] = "system"
    session_id: Optional[str] = None
    session_code: Optional[str] = None
    action_url: Optional[str] = None
    action_label: Optional[str] = None

class BroadcastNotification(BaseModel):
    title: str
    message: str
    type: Literal["info", "warning", "error", "success"] = "info"
    category: Literal["system", "session", "user", "achievement"] = "session"
    session_id: Optional[str] = None
    session_code: Optional[str] = None
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    target_role: Literal["student", "teacher", "all"] = "student"

class NotificationInDB(NotificationCreate):
    id: str = Field(alias="_id")
    created_at: datetime
    read: bool = False
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class NotificationResponse(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    title: str
    message: str
    type: str
    category: Optional[str] = "system"
    session_id: Optional[str] = None
    session_code: Optional[str] = None
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    created_at: datetime
    read: bool = False
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# Token Models
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[str] = None
    role: Optional[str] = None

# Admin Statistics
class SystemStats(BaseModel):
    total_users: int
    total_teachers: int
    total_students: int
    total_admins: int
    total_sessions: int
    active_sessions: int
    completed_sessions: int
