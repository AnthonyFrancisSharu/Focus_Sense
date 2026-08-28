from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timedelta
import random
import string
from models import (
    UserCreate, UserLogin, UserResponse, Token, 
    UserUpdate, ChangePassword, UserInDB,
    ForgotPasswordRequest, ResetPasswordRequest
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, get_current_active_user
)
from database import get_database
from config import settings
from bson import ObjectId

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/signup", response_model=dict, status_code=status.HTTP_201_CREATED)
async def signup(user: UserCreate):
    """Register a new user"""
    db = await get_database()
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user_dict = user.model_dump()
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    user_dict["created_at"] = datetime.utcnow()
    user_dict["last_login"] = datetime.utcnow()
    user_dict["_id"] = str(ObjectId())
    
    # Insert user into database
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token = create_access_token(
        data={
            "sub": user.email,
            "user_id": user_dict["_id"],
            "role": user.role
        }
    )
    
    # Return user data without password
    user_response = UserResponse(**user_dict)
    
    return {
        "user": user_response.model_dump(),
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/login", response_model=dict)
async def login(credentials: UserLogin):
    """Login user and return access token"""
    db = await get_database()
    
    # Find user by email
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Update last login
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    # Create access token
    access_token = create_access_token(
        data={
            "sub": user["email"],
            "user_id": user["_id"],
            "role": user["role"]
        }
    )
    
    # Return user data without password
    user_response = UserResponse(**user)
    
    return {
        "user": user_response.model_dump(),
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserInDB = Depends(get_current_active_user)):
    """Get current user information"""
    return UserResponse(**current_user.model_dump())

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    user_update: UserUpdate,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Update user profile"""
    db = await get_database()
    
    # Prepare update data (only non-None values)
    update_data = {k: v for k, v in user_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data to update"
        )
    
    # Update user in database
    await db.users.update_one(
        {"_id": current_user.id},
        {"$set": update_data}
    )
    
    # Get updated user
    updated_user = await db.users.find_one({"_id": current_user.id})
    
    return UserResponse(**updated_user)

@router.put("/change-password")
async def change_password(
    password_data: ChangePassword,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Change user password"""
    db = await get_database()
    
    # Verify current password
    user = await db.users.find_one({"_id": current_user.id})
    if not verify_password(password_data.current_password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    new_hashed_password = get_password_hash(password_data.new_password)
    await db.users.update_one(
        {"_id": current_user.id},
        {"$set": {"hashed_password": new_hashed_password}}
    )
    
    return {"message": "Password updated successfully"}


def generate_reset_code(length: int = 6) -> str:
    """Generate a random numeric reset code"""
    return ''.join(random.choices(string.digits, k=length))


async def send_reset_email(email: str, reset_code: str, user_name: str):
    """Send password reset email if SMTP is configured"""
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        return False
    
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Password Reset Code - Learning System"
        msg["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        msg["To"] = email
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="max-width: 500px; margin: 0 auto; background: #f9fafb; border-radius: 12px; padding: 30px;">
                <h2 style="color: #1f2937; text-align: center;">Password Reset Request</h2>
                <p style="color: #4b5563;">Hi {user_name},</p>
                <p style="color: #4b5563;">You requested a password reset. Use the code below to reset your password:</p>
                <div style="background: #4f46e5; color: white; font-size: 32px; letter-spacing: 8px; text-align: center; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    {reset_code}
                </div>
                <p style="color: #6b7280; font-size: 14px;">This code will expire in <strong>10 minutes</strong>.</p>
                <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_body, "html"))
        
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        if settings.SMTP_USE_TLS:
            server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM_EMAIL or settings.SMTP_USER, email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send reset email: {e}")
        return False


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Request a password reset code for any role (admin, teacher, student)"""
    db = await get_database()
    
    # Find user by email (works for all roles)
    user = await db.users.find_one({"email": request.email})
    if not user:
        # Return success even if email not found (security best practice)
        return {
            "message": "If an account with that email exists, a reset code has been sent.",
            "reset_code_sent": True
        }
    
    # Generate a 6-digit reset code
    reset_code = generate_reset_code()
    
    # Remove any existing reset codes for this email
    await db.password_resets.delete_many({"email": request.email})
    
    # Store reset code in database with 10-minute expiry
    reset_doc = {
        "_id": str(ObjectId()),
        "email": request.email,
        "reset_code": reset_code,
        "user_id": user["_id"],
        "role": user["role"],
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(minutes=10)
    }
    await db.password_resets.insert_one(reset_doc)
    
    # Try to send email
    email_sent = await send_reset_email(request.email, reset_code, user.get("name", "User"))
    
    response = {
        "message": "If an account with that email exists, a reset code has been sent.",
        "reset_code_sent": True
    }
    
    # If SMTP is not configured, include the code in the response (development mode)
    if not email_sent:
        response["reset_code"] = reset_code
        response["note"] = "SMTP not configured. Reset code included in response for development."
    
    return response


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using the reset code. Works for all roles."""
    db = await get_database()
    
    # Find valid reset code
    reset_doc = await db.password_resets.find_one({
        "email": request.email,
        "reset_code": request.reset_code
    })
    
    if not reset_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset code. Please request a new one."
        )
    
    # Check if code has expired
    if reset_doc["expires_at"] < datetime.utcnow():
        # Clean up expired code
        await db.password_resets.delete_one({"_id": reset_doc["_id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset code has expired. Please request a new one."
        )
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )
    
    # Find user and update password
    user = await db.users.find_one({"email": request.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
    
    # Hash and update the new password
    new_hashed_password = get_password_hash(request.new_password)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": new_hashed_password}}
    )
    
    # Delete the used reset code and any other codes for this email
    await db.password_resets.delete_many({"email": request.email})
    
    return {
        "message": "Password has been reset successfully. You can now login with your new password.",
        "role": user["role"]
    }
