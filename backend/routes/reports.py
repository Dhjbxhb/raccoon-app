from fastapi import APIRouter, HTTPException, Header, Request, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from services.auth_service import AuthService
from services.db_service import get_users_collection, get_guests_collection, get_reports_collection
import uuid

router = APIRouter(prefix="/reports", tags=["reports"])

class CreateReportRequest(BaseModel):
    reported_id: str
    reason: str
    details: Optional[str] = None
    session_id: Optional[str] = None

async def get_current_user(authorization: Optional[str] = Header(None)):
    """Verify user is authenticated"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing token")
    
    token = authorization.replace('Bearer ', '')
    payload = AuthService.decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return payload

@router.post("/create")
async def create_report(data: CreateReportRequest, user = Depends(get_current_user)):
    """Create a new report"""
    users_collection = get_users_collection()
    guests_collection = get_guests_collection()
    reports_collection = get_reports_collection()
    
    reporter_id = user['user_id']
    is_guest = user.get('is_guest', False)
    
    # Get reporter info
    if is_guest:
        reporter = await guests_collection.find_one({'guest_id': reporter_id}, {'_id': 0})
        reporter_username = reporter.get('username', 'Guest') if reporter else 'Guest'
    else:
        reporter = await users_collection.find_one({'user_id': reporter_id}, {'_id': 0})
        reporter_username = reporter.get('username', 'User') if reporter else 'User'
    
    # Get reported user info
    reported = await users_collection.find_one({'user_id': data.reported_id}, {'_id': 0})
    if not reported:
        reported = await guests_collection.find_one({'guest_id': data.reported_id}, {'_id': 0})
    
    reported_username = reported.get('username', 'Unknown') if reported else 'Unknown'
    
    # Create report
    report_id = str(uuid.uuid4())
    report = {
        'report_id': report_id,
        'reporter_id': reporter_id,
        'reporter_username': reporter_username,
        'reported_id': data.reported_id,
        'reported_username': reported_username,
        'reason': data.reason,
        'details': data.details,
        'session_id': data.session_id,
        'status': 'pending',
        'admin_notes': None,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'reviewed_at': None,
        'reviewed_by': None
    }
    
    await reports_collection.insert_one(report)
    
    # Update reported user's report count
    if reported:
        await users_collection.update_one(
            {'user_id': data.reported_id},
            {'$inc': {'report_count': 1}}
        )
    
    return {
        'message': 'Report submitted successfully',
        'report_id': report_id
    }
