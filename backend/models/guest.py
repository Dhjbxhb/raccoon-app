from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone

class Guest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    guest_id: str
    username: str  # GuestXXXX format
    gender: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    session_expires_at: datetime
    is_active: bool = True

class GuestResponse(BaseModel):
    guest_id: str
    username: str
    gender: str
