from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

class Report(BaseModel):
    report_id: str
    reporter_id: str
    reporter_username: str
    reported_id: str
    reported_username: str
    reason: str
    details: Optional[str] = None
    session_id: Optional[str] = None
    status: str = "pending"  # pending, reviewed, ignored, actioned
    admin_notes: Optional[str] = None
    created_at: datetime = datetime.now(timezone.utc)
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None

class ReportResponse(BaseModel):
    report_id: str
    reporter_id: str
    reporter_username: str
    reported_id: str
    reported_username: str
    reason: str
    details: Optional[str] = None
    session_id: Optional[str] = None
    status: str
    admin_notes: Optional[str] = None
    created_at: str
    reviewed_at: Optional[str] = None
    reviewed_by: Optional[str] = None
