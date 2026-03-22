from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Match(BaseModel):
    session_id: str
    user1_id: str
    user2_id: str
    created_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
