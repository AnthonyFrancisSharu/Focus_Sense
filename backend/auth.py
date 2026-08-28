from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from config import settings
from models import TokenData, UserInDB
from database import get_database

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    """Get the current authenticated user from the token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        user_id: str = payload.get("user_id")
        role: str = payload.get("role")
        
        if email is None or user_id is None:
            raise credentials_exception
        
        token_data = TokenData(email=email, user_id=user_id, role=role)
    except JWTError:
        raise credentials_exception
    
    # Get user from database
    db = await get_database()
    user = await db.users.find_one({"_id": user_id})
    
    if user is None:
        raise credentials_exception
    
    return UserInDB(**user)

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """Get the current active user"""
    return current_user

def require_role(required_roles: list[str]):
    """Dependency to require specific roles"""
    async def role_checker(current_user: UserInDB = Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker

# Specific role dependencies
async def get_current_admin(current_user: UserInDB = Depends(require_role(["admin"]))) -> UserInDB:
    return current_user

async def get_current_teacher(current_user: UserInDB = Depends(require_role(["teacher", "admin"]))) -> UserInDB:
    return current_user

async def get_current_student(current_user: UserInDB = Depends(require_role(["student", "admin"]))) -> UserInDB:
    return current_user
