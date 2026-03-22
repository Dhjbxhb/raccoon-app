from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime, timezone

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    email: EmailStr
    username: str
    password_hash: str
    country: str
    gender: str  # male, female, non-binary
    date_of_birth: str  # ISO format date
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_active: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    total_sessions: int = 0
    total_time_spent: int = 0  # in seconds
    premium_status: bool = False
    is_admin: bool = False
    is_banned: bool = False

class UserResponse(BaseModel):
    user_id: str
    email: str
    username: str
    country: str
    gender: str
    premium_status: bool
    is_admin: bool
    total_sessions: int
    total_time_spent: int

class UserPublic(BaseModel):
    """Public user info shown to matched partners"""
    user_id: str
    username: str
    gender: str
    country: str
    premium_status: bool
