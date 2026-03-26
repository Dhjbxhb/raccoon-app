"""
Session Model - Match session tracking for the Raccoon app.

Tracks the complete lifecycle of a match session including:
- Creation and ending
- Duration calculation
- End reasons (skip, disconnect, block, timeout)
- Message count and game data
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone
from enum import Enum


class SessionEndReason(str, Enum):
    """Possible reasons for session ending"""
    SKIPPED = "skipped"           # User skipped the match
    PARTNER_SKIPPED = "partner_skipped"  # Partner skipped
    DISCONNECTED = "disconnected"  # User disconnected
    PARTNER_DISCONNECTED = "partner_disconnected"  # Partner disconnected
    BLOCKED = "blocked"           # User blocked partner
    BLOCKED_BY = "blocked_by"     # Blocked by partner
    TIMEOUT = "timeout"           # Session timed out
    REPORTED = "reported"         # Ended due to report
    MUTUAL = "mutual"             # Both agreed to end
    SYSTEM = "system"             # System ended session


class SessionStatus(str, Enum):
    """Session status states"""
    ACTIVE = "active"
    ENDED = "ended"


class Session(BaseModel):
    """
    Complete session model for match tracking.
    """
    model_config = ConfigDict(extra="ignore")
    
    # === Identity ===
    session_id: str = Field(..., description="Unique session identifier (UUID)")
    
    # === Participants ===
    user1_id: str = Field(..., description="First user's ID")
    user2_id: str = Field(..., description="Second user's ID")
    user1_username: str = Field(default="", description="First user's display name")
    user2_username: str = Field(default="", description="Second user's display name")
    user1_is_guest: bool = Field(default=False, description="Is user1 a guest")
    user2_is_guest: bool = Field(default=False, description="Is user2 a guest")
    
    # === Timing ===
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = Field(default=None, description="When session ended")
    duration_seconds: int = Field(default=0, description="Session duration in seconds")
    
    # === Status ===
    status: str = Field(default="active", description="Session status")
    ended_by: Optional[str] = Field(default=None, description="User ID who ended session")
    end_reason: Optional[str] = Field(default=None, description="Why session ended")
    
    # === Activity ===
    message_count: int = Field(default=0, description="Total messages exchanged")
    video_enabled: bool = Field(default=False, description="Was video used")
    game_played: Optional[str] = Field(default=None, description="Game played (tod/feud)")
    
    # === Metadata ===
    match_type: str = Field(default="random", description="How match was made")
    user1_country: str = Field(default="", description="User1's country")
    user2_country: str = Field(default="", description="User2's country")


class SessionCreate(BaseModel):
    """Schema for creating a new session"""
    session_id: str
    user1_id: str
    user2_id: str
    user1_username: str = ""
    user2_username: str = ""
    user1_is_guest: bool = False
    user2_is_guest: bool = False
    user1_country: str = ""
    user2_country: str = ""


class SessionEnd(BaseModel):
    """Schema for ending a session"""
    ended_by: str
    end_reason: str


class SessionResponse(BaseModel):
    """Public session response"""
    session_id: str
    partner_id: str
    partner_username: str
    partner_country: str = ""
    partner_is_premium: bool = False
    start_time: str
    status: str


class SessionStats(BaseModel):
    """Session statistics"""
    session_id: str
    duration_seconds: int
    message_count: int
    video_enabled: bool
    game_played: Optional[str]
    end_reason: Optional[str]


# === Database Indexes ===
SESSION_INDEXES = [
    {"keys": [("session_id", 1)], "unique": True},
    {"keys": [("user1_id", 1)]},
    {"keys": [("user2_id", 1)]},
    {"keys": [("status", 1)]},
    {"keys": [("start_time", -1)]},
    {"keys": [("end_time", -1)]},
    {"keys": [("end_reason", 1)]},
    # Compound indexes
    {"keys": [("user1_id", 1), ("start_time", -1)]},
    {"keys": [("user2_id", 1), ("start_time", -1)]},
    {"keys": [("status", 1), ("start_time", -1)]},
]
