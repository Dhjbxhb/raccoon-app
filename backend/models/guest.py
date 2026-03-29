"""
Guest Model - Temporary user accounts for the Raccoon app.

Guests are real backend users with limited features.
They can be converted to full users if they sign up later.
"""

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional


class Guest(BaseModel):
    """
    Guest user model - temporary accounts with session expiry.
    
    Guests are stored in a separate collection but follow similar
    structure to regular users for consistency.
    """
    model_config = ConfigDict(extra="ignore")
    
    # === Core Identity ===
    guest_id: str = Field(..., description="Unique guest identifier (UUID)")
    username: str = Field(..., description="Display name (GuestXXXX format)")
    
    # === Profile ===
    gender: str = Field(default="male", description="User gender: male, female")
    
    # === Location ===
    country: str = Field(default="United States", description="Country name")
    country_code: str = Field(default="US", description="ISO country code")
    country_flag: str = Field(default="🇺🇸", description="Country flag emoji")
    
    # === Verification ===
    age_verified: bool = Field(default=False, description="18+ age verification")
    
    # === Session ===
    session_expires_at: datetime = Field(..., description="When guest session expires")
    is_active: bool = Field(default=True, description="Session active status")
    
    # === Status ===
    is_banned: bool = Field(default=False, description="Ban status")
    ban_reason: Optional[str] = Field(default=None, description="Reason for ban")
    
    # === Statistics ===
    total_sessions: int = Field(default=0, description="Total match sessions")
    total_time_spent: int = Field(default=0, description="Total time in seconds")
    total_matches: int = Field(default=0, description="Total successful matches")
    total_messages_sent: int = Field(default=0, description="Messages sent count")
    total_reports_received: int = Field(default=0, description="Reports against guest")
    games_played: int = Field(default=0, description="Total games played")
    games_won: int = Field(default=0, description="Total games won")
    
    # === Timestamps ===
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_active: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # === Conversion ===
    converted_to_user_id: Optional[str] = Field(default=None, description="If converted to full user")
    converted_at: Optional[datetime] = Field(default=None, description="When converted")


class GuestResponse(BaseModel):
    """Public guest response (safe to send to frontend)"""
    guest_id: str
    username: str
    gender: str
    age_verified: bool = False
    country: Optional[str] = None
    country_code: Optional[str] = None
    country_flag: Optional[str] = None
    total_sessions: int = 0
    total_time_spent: int = 0
    games_played: int = 0
    games_won: int = 0
    created_at: Optional[str] = None


class GuestPublic(BaseModel):
    """Minimal guest info shown to matched partners"""
    guest_id: str
    username: str
    gender: str
    country: str = "United States"
    country_code: str = "US"
    country_flag: str = "🇺🇸"


class GuestAdmin(BaseModel):
    """Full guest info for admin panel"""
    guest_id: str
    username: str
    gender: str
    country: str
    country_code: str
    country_flag: str
    age_verified: bool
    is_active: bool
    is_banned: bool
    ban_reason: Optional[str]
    total_sessions: int
    total_time_spent: int
    total_matches: int
    total_reports_received: int
    created_at: str
    last_active: str
    session_expires_at: str


# === Database Indexes ===
GUEST_INDEXES = [
    {"keys": [("guest_id", 1)], "unique": True},
    {"keys": [("username", 1)], "unique": True},
    {"keys": [("is_active", 1)]},
    {"keys": [("is_banned", 1)]},
    {"keys": [("session_expires_at", 1)]},  # For cleanup jobs
    {"keys": [("created_at", -1)]},
    {"keys": [("last_active", -1)]},
]
