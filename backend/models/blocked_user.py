from pydantic import BaseModel
from datetime import datetime

class BlockedUser(BaseModel):
    blocker_id: str
    blocked_id: str
    created_at: datetime
    reason: str = "User blocked"
