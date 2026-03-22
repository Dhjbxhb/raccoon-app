from pydantic import BaseModel
from datetime import datetime

class Message(BaseModel):
    message_id: str
    session_id: str
    sender_id: str
    content: str
    timestamp: datetime
