"""
Message Model - Chat message storage for the Raccoon app.

Tracks all chat messages with:
- Session linkage
- Sender/receiver info
- Content and timestamps
- Moderation flags
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone


class Message(BaseModel):
    """Complete message model for chat"""
    model_config = ConfigDict(extra="ignore")
    
    message_id: str = Field(..., description="Unique message identifier (UUID)")
    session_id: str = Field(..., description="Session this message belongs to")
    
    # Sender info
    sender_id: str = Field(..., description="User ID of sender")
    sender_username: Optional[str] = Field(default=None, description="Username of sender")
    sender_is_guest: bool = Field(default=False, description="Is sender a guest")
    
    # Content
    content: str = Field(..., description="Message content")
    
    # Timestamps
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Moderation
    moderated: bool = Field(default=False, description="Was message moderated")
    moderation_reason: Optional[str] = Field(default=None)
    
    # Status
    delivered: bool = Field(default=True)
    read: bool = Field(default=False)


class MessageCreate(BaseModel):
    """Schema for creating a message"""
    content: str = Field(..., min_length=1, max_length=1000)
    session_id: str = Field(...)


class MessageResponse(BaseModel):
    """Public message response"""
    message_id: str
    sender_id: str
    sender_username: Optional[str] = None
    content: str
    timestamp: str
    premium: bool = False
    moderated: bool = False


# Database indexes
MESSAGE_INDEXES = [
    {"keys": [("message_id", 1)], "unique": True},
    {"keys": [("session_id", 1), ("timestamp", 1)]},
    {"keys": [("sender_id", 1)]},
    {"keys": [("timestamp", -1)]},
]
