"""
Report Model - User reporting system for the Raccoon app.

Tracks user reports for moderation with:
- Reporter and reported user IDs
- Report reason and details
- Session linkage
- Moderation status and actions
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import re


class ReportReason(str, Enum):
    """Standard report reasons"""
    INAPPROPRIATE_BEHAVIOR = "inappropriate_behavior"
    HARASSMENT = "harassment"
    SPAM = "spam"
    FAKE_PROFILE = "fake_profile"
    UNDERAGE = "underage"
    SCAM_FRAUD = "scam_fraud"
    HATE_SPEECH = "hate_speech"
    NUDITY_SEXUAL = "nudity_sexual"
    VIOLENCE = "violence"
    SELF_HARM = "self_harm"
    IMPERSONATION = "impersonation"
    OTHER = "other"


class ReportStatus(str, Enum):
    """Report processing status"""
    PENDING = "pending"           # Awaiting review
    UNDER_REVIEW = "under_review" # Being reviewed by moderator
    RESOLVED = "resolved"         # Action taken
    DISMISSED = "dismissed"       # No action needed
    ESCALATED = "escalated"       # Escalated to higher authority


class ModerationAction(str, Enum):
    """Actions taken on reports"""
    NONE = "none"
    WARNING = "warning"           # User warned
    TEMP_BAN_1H = "temp_ban_1h"   # 1 hour ban
    TEMP_BAN_24H = "temp_ban_24h" # 24 hour ban
    TEMP_BAN_7D = "temp_ban_7d"   # 7 day ban
    PERMANENT_BAN = "permanent_ban"
    ACCOUNT_DELETED = "account_deleted"


class Report(BaseModel):
    """
    Complete report model for user reports.
    """
    model_config = ConfigDict(extra="ignore")
    
    # === Identity ===
    report_id: str = Field(..., description="Unique report identifier (UUID)")
    
    # === Participants ===
    reporter_id: str = Field(..., description="ID of user making the report")
    reporter_username: str = Field(default="", description="Reporter's username")
    reporter_is_guest: bool = Field(default=False, description="Is reporter a guest")
    
    reported_id: str = Field(..., description="ID of user being reported")
    reported_username: str = Field(default="", description="Reported user's username")
    reported_is_guest: bool = Field(default=False, description="Is reported user a guest")
    
    # === Report Details ===
    reason: str = Field(..., description="Primary report reason")
    reason_category: str = Field(default="other", description="Normalized reason category")
    details: Optional[str] = Field(default=None, description="Additional details from reporter")
    session_id: Optional[str] = Field(default=None, description="Session where incident occurred")
    
    # === Evidence ===
    evidence_type: Optional[str] = Field(default=None, description="Type of evidence (chat, video, etc)")
    message_ids: List[str] = Field(default_factory=list, description="Related message IDs")
    
    # === Timing ===
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default=None)
    reviewed_at: Optional[datetime] = Field(default=None)
    
    # === Status ===
    status: str = Field(default="pending", description="Report status")
    priority: str = Field(default="normal", description="Priority level: low, normal, high, critical")
    
    # === Moderation ===
    moderator_id: Optional[str] = Field(default=None, description="ID of reviewing moderator")
    moderator_notes: Optional[str] = Field(default=None, description="Internal moderator notes")
    action_taken: Optional[str] = Field(default=None, description="Action taken on report")
    action_reason: Optional[str] = Field(default=None, description="Reason for action")
    
    # === Metadata ===
    reporter_ip: Optional[str] = Field(default=None, description="Reporter's IP (for abuse detection)")
    reporter_country: Optional[str] = Field(default=None, description="Reporter's country")


class ReportCreate(BaseModel):
    """Schema for creating a new report"""
    reported_id: str = Field(..., min_length=1, description="ID of user being reported")
    reason: str = Field(..., min_length=1, description="Report reason")
    details: Optional[str] = Field(default=None, max_length=2000, description="Additional details")
    session_id: Optional[str] = Field(default=None, description="Session ID if applicable")
    
    @field_validator('reason')
    @classmethod
    def validate_reason(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Report reason is required')
        return v.strip()
    
    @field_validator('details')
    @classmethod
    def sanitize_details(cls, v):
        if v:
            # Remove potential XSS/injection
            v = re.sub(r'<[^>]+>', '', v)
            v = v.strip()
            if len(v) > 2000:
                v = v[:2000]
        return v if v else None
    
    @field_validator('reported_id')
    @classmethod
    def validate_reported_id(cls, v):
        if not v or len(v.strip()) < 5:
            raise ValueError('Invalid reported user ID')
        return v.strip()


class ReportUpdate(BaseModel):
    """Schema for updating a report (moderator)"""
    status: Optional[str] = Field(default=None)
    priority: Optional[str] = Field(default=None)
    moderator_notes: Optional[str] = Field(default=None, max_length=5000)
    action_taken: Optional[str] = Field(default=None)
    action_reason: Optional[str] = Field(default=None, max_length=1000)
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v:
            valid = [s.value for s in ReportStatus]
            if v not in valid:
                raise ValueError(f'Invalid status. Must be one of: {valid}')
        return v
    
    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v):
        if v:
            valid = ['low', 'normal', 'high', 'critical']
            if v not in valid:
                raise ValueError(f'Invalid priority. Must be one of: {valid}')
        return v
    
    @field_validator('action_taken')
    @classmethod
    def validate_action(cls, v):
        if v:
            valid = [a.value for a in ModerationAction]
            if v not in valid:
                raise ValueError(f'Invalid action. Must be one of: {valid}')
        return v


class ReportResponse(BaseModel):
    """Public report response (for reporter)"""
    report_id: str
    reason: str
    status: str
    created_at: str
    message: str = "Report submitted successfully"


class ReportAdminResponse(BaseModel):
    """Full report details for admin/moderator"""
    report_id: str
    reporter_id: str
    reporter_username: str
    reporter_is_guest: bool = False
    reported_id: str
    reported_username: str
    reported_is_guest: bool = False
    reason: str
    reason_category: str = "other"
    details: Optional[str] = None
    session_id: Optional[str] = None
    status: str
    priority: str = "normal"
    created_at: str
    reviewed_at: Optional[str] = None
    moderator_id: Optional[str] = None
    moderator_notes: Optional[str] = None
    action_taken: Optional[str] = None
    action_reason: Optional[str] = None


class ReportStats(BaseModel):
    """Report statistics"""
    total_reports: int = 0
    pending_reports: int = 0
    under_review: int = 0
    resolved_today: int = 0
    by_reason: dict = {}
    by_status: dict = {}
    by_priority: dict = {}


# === Helper Functions ===
def normalize_reason(reason: str) -> str:
    """Convert display reason to normalized category"""
    reason_map = {
        'inappropriate behavior': 'inappropriate_behavior',
        'inappropriate_behavior': 'inappropriate_behavior',
        'harassment': 'harassment',
        'spam': 'spam',
        'fake profile': 'fake_profile',
        'fake_profile': 'fake_profile',
        'underage user': 'underage',
        'underage': 'underage',
        'scam/fraud': 'scam_fraud',
        'scam_fraud': 'scam_fraud',
        'hate speech': 'hate_speech',
        'hate_speech': 'hate_speech',
        'nudity/sexual content': 'nudity_sexual',
        'nudity_sexual': 'nudity_sexual',
        'violence': 'violence',
        'self harm': 'self_harm',
        'self_harm': 'self_harm',
        'impersonation': 'impersonation',
        'other': 'other'
    }
    return reason_map.get(reason.lower().strip(), 'other')


def calculate_priority(reason_category: str, details: Optional[str] = None) -> str:
    """Calculate report priority based on reason"""
    critical_reasons = ['underage', 'self_harm', 'violence']
    high_reasons = ['nudity_sexual', 'hate_speech', 'harassment', 'scam_fraud']
    
    if reason_category in critical_reasons:
        return 'critical'
    elif reason_category in high_reasons:
        return 'high'
    elif details and len(details) > 100:
        # Detailed reports get slightly higher priority
        return 'normal'
    else:
        return 'low'


# === Database Indexes ===
REPORT_INDEXES = [
    {"keys": [("report_id", 1)], "unique": True},
    {"keys": [("reporter_id", 1)]},
    {"keys": [("reported_id", 1)]},
    {"keys": [("session_id", 1)]},
    {"keys": [("status", 1)]},
    {"keys": [("priority", 1)]},
    {"keys": [("reason_category", 1)]},
    {"keys": [("created_at", -1)]},
    # Compound indexes for common queries
    {"keys": [("status", 1), ("priority", -1), ("created_at", -1)]},
    {"keys": [("reported_id", 1), ("status", 1)]},
    {"keys": [("reporter_id", 1), ("created_at", -1)]},
]
