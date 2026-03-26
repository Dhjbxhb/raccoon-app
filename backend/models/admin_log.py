"""
Admin Action Audit Log Model

Tracks all administrative actions for auditability and compliance.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from enum import Enum


class AdminActionType(str, Enum):
    BAN_USER = "ban_user"
    UNBAN_USER = "unban_user"
    TEMP_BAN_USER = "temp_ban_user"
    GRANT_PREMIUM = "grant_premium"
    REMOVE_PREMIUM = "remove_premium"
    GRANT_ADMIN = "grant_admin"
    REMOVE_ADMIN = "remove_admin"
    REVIEW_REPORT = "review_report"
    ACTION_REPORT = "action_report"
    DISMISS_REPORT = "dismiss_report"
    DELETE_MESSAGE = "delete_message"
    WARNING_ISSUED = "warning_issued"


class AdminLog(BaseModel):
    log_id: str
    action_type: AdminActionType
    admin_id: str
    admin_username: str
    target_id: str  # User ID or Report ID
    target_type: str  # "user", "guest", "report", "message"
    target_username: Optional[str] = None
    details: Optional[dict] = None  # Additional context (reason, duration, etc.)
    ip_address: Optional[str] = None
    created_at: str = None

    def __init__(self, **data):
        if 'created_at' not in data or data['created_at'] is None:
            data['created_at'] = datetime.now(timezone.utc).isoformat()
        super().__init__(**data)


class AdminLogResponse(BaseModel):
    log_id: str
    action_type: str
    admin_id: str
    admin_username: str
    target_id: str
    target_type: str
    target_username: Optional[str] = None
    details: Optional[dict] = None
    created_at: str
