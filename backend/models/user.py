"""
User Model - Complete user foundation for auth, moderation, premium, admin, and stats.

This model supports:
- Email users (traditional signup)
- Guest users (temporary accounts)
- Social users (Google, Apple, Phone)

The model is normalized and future-safe for premium/admin features.
"""

from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
from typing import Optional, List, Literal
from datetime import datetime, timezone
from enum import Enum


class LoginMethod(str, Enum):
    """Supported authentication methods"""
    EMAIL = "email"
    GOOGLE = "google"
    APPLE = "apple"
    PHONE = "phone"
    GUEST = "guest"


class Gender(str, Enum):
    """Supported genders"""
    MALE = "male"
    FEMALE = "female"
    ANY = "any"  # For users who haven't set gender (social auth)


class AccountStatus(str, Enum):
    """Account status states"""
    ACTIVE = "active"
    SUSPENDED = "suspended"  # Temporary suspension
    BANNED = "banned"  # Permanent ban
    DELETED = "deleted"  # Soft delete


class PremiumTier(str, Enum):
    """Premium subscription tiers"""
    FREE = "free"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    LIFETIME = "lifetime"


class User(BaseModel):
    """
    Complete user model for the Raccoon app.
    
    Supports all user types: email, social, phone, and guest users.
    Includes fields for auth, profile, premium, moderation, and analytics.
    """
    model_config = ConfigDict(extra="ignore")
    
    # === Core Identity ===
    user_id: str = Field(..., description="Unique user identifier (UUID)")
    email: str = Field(default="", description="User email (empty for phone/guest users)")
    username: str = Field(..., description="Display name")
    password_hash: str = Field(default="", description="Hashed password (empty for social/guest)")
    
    # === Authentication ===
    login_method: str = Field(default="email", description="Primary auth method")
    firebase_uid: Optional[str] = Field(default=None, description="Firebase UID for social auth")
    phone_number: Optional[str] = Field(default=None, description="Phone number for phone auth")
    auth_provider: Optional[str] = Field(default=None, description="OAuth provider name")
    photo_url: Optional[str] = Field(default=None, description="Profile photo from OAuth")
    
    # === Profile ===
    gender: str = Field(default="any", description="User gender: male, female, any")
    date_of_birth: Optional[str] = Field(default=None, description="ISO format date")
    bio: Optional[str] = Field(default=None, max_length=500, description="User bio")
    avatar_url: Optional[str] = Field(default=None, description="Custom avatar URL")
    
    # === Location ===
    country: str = Field(default="United States", description="Country name")
    country_code: str = Field(default="US", description="ISO country code")
    country_flag: str = Field(default="🇺🇸", description="Country flag emoji")
    timezone: Optional[str] = Field(default=None, description="User timezone")
    
    # === Verification ===
    email_verified: bool = Field(default=False, description="Email verification status")
    phone_verified: bool = Field(default=False, description="Phone verification status")
    age_verified: bool = Field(default=False, description="18+ age verification")
    identity_verified: bool = Field(default=False, description="ID verification (future)")
    
    # === Account Status ===
    account_status: str = Field(default="active", description="Account status")
    is_banned: bool = Field(default=False, description="Quick ban check flag")
    ban_reason: Optional[str] = Field(default=None, description="Reason for ban")
    ban_expires_at: Optional[datetime] = Field(default=None, description="Temp ban expiry")
    banned_by: Optional[str] = Field(default=None, description="Admin who banned")
    banned_at: Optional[datetime] = Field(default=None, description="When banned")
    
    # === Premium ===
    premium_status: bool = Field(default=False, description="Is premium active")
    premium_tier: str = Field(default="free", description="Premium tier")
    premium_started_at: Optional[datetime] = Field(default=None, description="Premium start date")
    premium_expires_at: Optional[datetime] = Field(default=None, description="Premium expiry date")
    stripe_customer_id: Optional[str] = Field(default=None, description="Stripe customer ID")
    stripe_subscription_id: Optional[str] = Field(default=None, description="Stripe subscription ID")
    
    # === Admin ===
    is_admin: bool = Field(default=False, description="Admin privileges")
    is_moderator: bool = Field(default=False, description="Moderator privileges")
    admin_level: int = Field(default=0, description="Admin permission level (0-10)")
    
    # === Statistics ===
    total_sessions: int = Field(default=0, description="Total match sessions")
    total_time_spent: int = Field(default=0, description="Total time in seconds")
    total_matches: int = Field(default=0, description="Total successful matches")
    total_messages_sent: int = Field(default=0, description="Messages sent count")
    total_reports_received: int = Field(default=0, description="Reports against user")
    total_reports_made: int = Field(default=0, description="Reports made by user")
    total_blocks_received: int = Field(default=0, description="Times blocked by others")
    games_played: int = Field(default=0, description="Total games played")
    games_won: int = Field(default=0, description="Total games won")
    
    # === Preferences ===
    preferred_gender: str = Field(default="any", description="Match preference")
    preferred_country: str = Field(default="any", description="Country preference")
    notifications_enabled: bool = Field(default=True, description="Push notifications")
    sound_enabled: bool = Field(default=True, description="Sound effects")
    
    # === Timestamps ===
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_active: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = Field(default=None, description="Last login time")
    
    # === Security ===
    failed_login_attempts: int = Field(default=0, description="Failed login count")
    last_failed_login: Optional[datetime] = Field(default=None, description="Last failed attempt")
    password_changed_at: Optional[datetime] = Field(default=None, description="Last password change")
    
    # === Legal Agreement ===
    terms_accepted: bool = Field(default=False, description="Accepted Terms of Service")
    terms_accepted_at: Optional[datetime] = Field(default=None, description="When terms were accepted")
    terms_version: Optional[str] = Field(default=None, description="Version of terms accepted")
    privacy_accepted: bool = Field(default=False, description="Accepted Privacy Policy")
    privacy_accepted_at: Optional[datetime] = Field(default=None, description="When privacy policy accepted")
    privacy_version: Optional[str] = Field(default=None, description="Version of privacy policy accepted")
    
    @field_validator('gender')
    @classmethod
    def validate_gender(cls, v):
        valid = ['male', 'female', 'any']
        if v.lower() not in valid:
            return 'any'
        return v.lower()
    
    @field_validator('login_method')
    @classmethod
    def validate_login_method(cls, v):
        valid = ['email', 'google', 'apple', 'phone', 'guest']
        if v.lower() not in valid:
            return 'email'
        return v.lower()


class UserCreate(BaseModel):
    """Schema for creating a new user"""
    email: Optional[EmailStr] = None
    username: str
    password: Optional[str] = None
    gender: str = "any"
    date_of_birth: Optional[str] = None
    login_method: str = "email"
    firebase_uid: Optional[str] = None
    phone_number: Optional[str] = None
    browser_locale: Optional[str] = None


class UserUpdate(BaseModel):
    """Schema for updating user profile"""
    username: Optional[str] = None
    gender: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    preferred_gender: Optional[str] = None
    preferred_country: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    sound_enabled: Optional[bool] = None


class UserResponse(BaseModel):
    """Public user response (safe to send to frontend)"""
    user_id: str
    email: str = ""
    username: str
    country: str = "United States"
    country_code: str = "US"
    country_flag: str = "🇺🇸"
    gender: str = "any"
    age_verified: bool = False
    premium_status: bool = False
    premium_tier: str = "free"
    premium_expires_at: Optional[str] = None
    is_admin: bool = False
    is_moderator: bool = False
    total_sessions: int = 0
    total_time_spent: int = 0
    games_played: int = 0
    games_won: int = 0
    photo_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: Optional[str] = None


class UserPublic(BaseModel):
    """Minimal public user info shown to matched partners"""
    user_id: str
    username: str
    gender: str
    country: str = "United States"
    country_code: str = "US"
    country_flag: str = "🇺🇸"
    premium_status: bool = False


class UserAdmin(BaseModel):
    """Full user info for admin panel"""
    user_id: str
    email: str
    username: str
    login_method: str
    country: str
    country_code: str
    country_flag: str
    gender: str
    age_verified: bool
    email_verified: bool
    phone_verified: bool
    account_status: str
    is_banned: bool
    ban_reason: Optional[str]
    banned_at: Optional[str]
    premium_status: bool
    premium_tier: str
    premium_expires_at: Optional[str]
    is_admin: bool
    is_moderator: bool
    total_sessions: int
    total_time_spent: int
    total_matches: int
    total_reports_received: int
    total_blocks_received: int
    created_at: str
    last_active: str
    last_login: Optional[str]


# === Database Indexes ===
# These should be created when initializing the database
USER_INDEXES = [
    # Primary lookups
    {"keys": [("user_id", 1)], "unique": True},
    {"keys": [("email", 1)], "unique": True, "sparse": True},  # sparse for phone/guest users
    {"keys": [("username", 1)], "unique": True},
    
    # Auth lookups
    {"keys": [("firebase_uid", 1)], "unique": True, "sparse": True},
    {"keys": [("phone_number", 1)], "unique": True, "sparse": True},
    
    # Admin queries
    {"keys": [("is_admin", 1)]},
    {"keys": [("is_banned", 1)]},
    {"keys": [("account_status", 1)]},
    {"keys": [("premium_status", 1)]},
    
    # Analytics
    {"keys": [("created_at", -1)]},
    {"keys": [("last_active", -1)]},
    {"keys": [("login_method", 1)]},
    {"keys": [("country_code", 1)]},
    
    # Compound indexes for common queries
    {"keys": [("is_banned", 1), ("account_status", 1)]},
    {"keys": [("premium_status", 1), ("premium_expires_at", 1)]},
]
