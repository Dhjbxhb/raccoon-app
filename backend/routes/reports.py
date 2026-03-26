"""
Report Routes - User reporting API for the Raccoon app.

Provides endpoints for:
- Creating reports
- Fetching user's reports
- Admin report management
- Report statistics
"""

from fastapi import APIRouter, HTTPException, Header, Request, Depends, Query
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from services.auth_service import AuthService
from services.db_service import (
    get_users_collection, 
    get_guests_collection, 
    get_reports_collection,
    get_sessions_collection
)
from models.report import (
    ReportCreate, 
    ReportUpdate, 
    ReportResponse, 
    ReportAdminResponse,
    ReportStats,
    normalize_reason,
    calculate_priority,
    ReportStatus,
    ModerationAction
)
import uuid
import re
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])


# === Authentication Dependencies ===

async def get_current_user(authorization: Optional[str] = Header(None)):
    """Verify user is authenticated"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.replace('Bearer ', '')
    payload = AuthService.decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return payload


async def get_moderator_user(authorization: Optional[str] = Header(None)):
    """Verify user is authenticated and is a moderator/admin"""
    user = await get_current_user(authorization)
    
    # Check if user is moderator or admin
    users_collection = get_users_collection()
    user_data = await users_collection.find_one(
        {'user_id': user['user_id']}, 
        {'_id': 0, 'is_moderator': 1, 'is_admin': 1}
    )
    
    if not user_data:
        raise HTTPException(status_code=403, detail="User not found")
    
    if not (user_data.get('is_moderator') or user_data.get('is_admin')):
        raise HTTPException(status_code=403, detail="Moderator access required")
    
    return user


# === User Endpoints ===

@router.post("/create", response_model=ReportResponse)
async def create_report(
    request: Request,
    data: ReportCreate, 
    user = Depends(get_current_user)
):
    """
    Create a new report against another user.
    
    Validates:
    - Reporter is authenticated
    - Reported user exists
    - Can't report yourself
    - Reason is valid
    """
    users_collection = get_users_collection()
    guests_collection = get_guests_collection()
    reports_collection = get_reports_collection()
    sessions_collection = get_sessions_collection()
    
    reporter_id = user['user_id']
    is_guest = user.get('is_guest', False)
    
    # Prevent self-reporting
    if reporter_id == data.reported_id:
        raise HTTPException(status_code=400, detail="Cannot report yourself")
    
    # Validate reported user exists
    reported = await users_collection.find_one({'user_id': data.reported_id}, {'_id': 0})
    reported_is_guest = False
    if not reported:
        reported = await guests_collection.find_one({'guest_id': data.reported_id}, {'_id': 0})
        reported_is_guest = True
    
    if not reported:
        raise HTTPException(status_code=404, detail="Reported user not found")
    
    # Validate session exists if provided
    if data.session_id:
        session = await sessions_collection.find_one(
            {'session_id': data.session_id},
            {'_id': 0, 'user1_id': 1, 'user2_id': 1}
        )
        if not session:
            logger.warning(f"Report with invalid session_id: {data.session_id}")
            # Don't fail - session might have been cleaned up
        elif reporter_id not in [session.get('user1_id'), session.get('user2_id')]:
            raise HTTPException(status_code=400, detail="Invalid session - you were not a participant")
    
    # Get reporter info
    if is_guest:
        reporter = await guests_collection.find_one({'guest_id': reporter_id}, {'_id': 0})
        reporter_username = reporter.get('username', 'Guest') if reporter else 'Guest'
    else:
        reporter = await users_collection.find_one({'user_id': reporter_id}, {'_id': 0})
        reporter_username = reporter.get('username', 'User') if reporter else 'User'
    
    reported_username = reported.get('username', 'Unknown')
    
    # Check for duplicate recent reports (prevent spam)
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    existing = await reports_collection.find_one({
        'reporter_id': reporter_id,
        'reported_id': data.reported_id,
        'created_at': {'$gte': one_hour_ago}
    })
    
    if existing:
        raise HTTPException(
            status_code=429, 
            detail="You recently reported this user. Please wait before reporting again."
        )
    
    # Normalize reason and calculate priority
    reason_category = normalize_reason(data.reason)
    priority = calculate_priority(reason_category, data.details)
    
    # Get reporter IP for abuse detection
    reporter_ip = None
    if hasattr(request, 'client') and request.client:
        reporter_ip = request.client.host
    
    # Create report
    report_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    report = {
        'report_id': report_id,
        'reporter_id': reporter_id,
        'reporter_username': reporter_username,
        'reporter_is_guest': is_guest,
        'reported_id': data.reported_id,
        'reported_username': reported_username,
        'reported_is_guest': reported_is_guest,
        'reason': data.reason,
        'reason_category': reason_category,
        'details': data.details,
        'session_id': data.session_id,
        'status': 'pending',
        'priority': priority,
        'moderator_id': None,
        'moderator_notes': None,
        'action_taken': None,
        'action_reason': None,
        'created_at': now,
        'updated_at': None,
        'reviewed_at': None,
        'reporter_ip': reporter_ip,
        'reporter_country': reporter.get('country') if reporter else None
    }
    
    await reports_collection.insert_one(report)
    
    # Update reported user's report count
    update_collection = guests_collection if reported_is_guest else users_collection
    id_field = 'guest_id' if reported_is_guest else 'user_id'
    
    await update_collection.update_one(
        {id_field: data.reported_id},
        {
            '$inc': {'report_count': 1},
            '$set': {'last_reported_at': now}
        }
    )
    
    logger.info(f"Report {report_id} created: {reporter_id} reported {data.reported_id} for {reason_category}")
    
    return ReportResponse(
        report_id=report_id,
        reason=data.reason,
        status='pending',
        created_at=now,
        message="Report submitted successfully. Our team will review it shortly."
    )


@router.get("/my-reports", response_model=List[ReportResponse])
async def get_my_reports(
    user = Depends(get_current_user),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
):
    """Get reports submitted by the current user"""
    reports_collection = get_reports_collection()
    
    cursor = reports_collection.find(
        {'reporter_id': user['user_id']},
        {'_id': 0, 'report_id': 1, 'reason': 1, 'status': 1, 'created_at': 1}
    ).sort('created_at', -1).skip(offset).limit(limit)
    
    reports = await cursor.to_list(length=limit)
    
    return [
        ReportResponse(
            report_id=r['report_id'],
            reason=r['reason'],
            status=r['status'],
            created_at=r['created_at'],
            message=""
        ) for r in reports
    ]


# === Admin/Moderator Endpoints ===

@router.get("/admin/list", response_model=List[ReportAdminResponse])
async def list_reports(
    moderator = Depends(get_moderator_user),
    status: Optional[str] = Query(default=None),
    priority: Optional[str] = Query(default=None),
    reason_category: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0)
):
    """
    List all reports (admin/moderator only).
    Supports filtering by status, priority, and reason.
    """
    reports_collection = get_reports_collection()
    
    # Build query filter
    query = {}
    if status:
        query['status'] = status
    if priority:
        query['priority'] = priority
    if reason_category:
        query['reason_category'] = reason_category
    
    cursor = reports_collection.find(
        query,
        {'_id': 0}
    ).sort([('priority', -1), ('created_at', -1)]).skip(offset).limit(limit)
    
    reports = await cursor.to_list(length=limit)
    
    return [ReportAdminResponse(**r) for r in reports]


@router.get("/admin/{report_id}", response_model=ReportAdminResponse)
async def get_report(
    report_id: str,
    moderator = Depends(get_moderator_user)
):
    """Get a specific report by ID (admin/moderator only)"""
    reports_collection = get_reports_collection()
    
    report = await reports_collection.find_one(
        {'report_id': report_id},
        {'_id': 0}
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return ReportAdminResponse(**report)


@router.patch("/admin/{report_id}")
async def update_report(
    report_id: str,
    data: ReportUpdate,
    moderator = Depends(get_moderator_user)
):
    """
    Update a report's status, priority, or add moderator notes.
    Admin/moderator only.
    """
    reports_collection = get_reports_collection()
    
    # Check report exists
    report = await reports_collection.find_one({'report_id': report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Build update
    update_data = {
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'moderator_id': moderator['user_id']
    }
    
    if data.status:
        update_data['status'] = data.status
        if data.status in ['resolved', 'dismissed']:
            update_data['reviewed_at'] = datetime.now(timezone.utc).isoformat()
    
    if data.priority:
        update_data['priority'] = data.priority
    
    if data.moderator_notes is not None:
        update_data['moderator_notes'] = data.moderator_notes
    
    if data.action_taken:
        update_data['action_taken'] = data.action_taken
    
    if data.action_reason:
        update_data['action_reason'] = data.action_reason
    
    await reports_collection.update_one(
        {'report_id': report_id},
        {'$set': update_data}
    )
    
    logger.info(f"Report {report_id} updated by moderator {moderator['user_id']}")
    
    # If action involves a ban, update the reported user
    if data.action_taken and data.action_taken != 'none' and data.action_taken != 'warning':
        await apply_moderation_action(report['reported_id'], data.action_taken)
    
    return {"message": "Report updated successfully", "report_id": report_id}


@router.get("/admin/stats", response_model=ReportStats)
async def get_report_stats(
    moderator = Depends(get_moderator_user)
):
    """Get report statistics (admin/moderator only)"""
    reports_collection = get_reports_collection()
    
    # Get counts by status
    pipeline_status = [
        {'$group': {'_id': '$status', 'count': {'$sum': 1}}}
    ]
    status_results = await reports_collection.aggregate(pipeline_status).to_list(length=100)
    by_status = {r['_id']: r['count'] for r in status_results}
    
    # Get counts by reason
    pipeline_reason = [
        {'$group': {'_id': '$reason_category', 'count': {'$sum': 1}}}
    ]
    reason_results = await reports_collection.aggregate(pipeline_reason).to_list(length=100)
    by_reason = {r['_id']: r['count'] for r in reason_results}
    
    # Get counts by priority
    pipeline_priority = [
        {'$group': {'_id': '$priority', 'count': {'$sum': 1}}}
    ]
    priority_results = await reports_collection.aggregate(pipeline_priority).to_list(length=100)
    by_priority = {r['_id']: r['count'] for r in priority_results}
    
    # Get resolved today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    resolved_today = await reports_collection.count_documents({
        'status': 'resolved',
        'reviewed_at': {'$gte': today_start}
    })
    
    total = sum(by_status.values())
    pending = by_status.get('pending', 0)
    under_review = by_status.get('under_review', 0)
    
    return ReportStats(
        total_reports=total,
        pending_reports=pending,
        under_review=under_review,
        resolved_today=resolved_today,
        by_reason=by_reason,
        by_status=by_status,
        by_priority=by_priority
    )


@router.get("/admin/user/{user_id}")
async def get_user_reports(
    user_id: str,
    moderator = Depends(get_moderator_user),
    limit: int = Query(default=50, ge=1, le=200)
):
    """Get all reports against a specific user (admin/moderator only)"""
    reports_collection = get_reports_collection()
    
    cursor = reports_collection.find(
        {'reported_id': user_id},
        {'_id': 0}
    ).sort('created_at', -1).limit(limit)
    
    reports = await cursor.to_list(length=limit)
    
    # Count by status
    status_counts = {}
    for r in reports:
        status = r.get('status', 'unknown')
        status_counts[status] = status_counts.get(status, 0) + 1
    
    return {
        'user_id': user_id,
        'total_reports': len(reports),
        'status_breakdown': status_counts,
        'reports': [ReportAdminResponse(**r) for r in reports]
    }


# === Helper Functions ===

async def apply_moderation_action(user_id: str, action: str):
    """Apply moderation action to a user"""
    users_collection = get_users_collection()
    guests_collection = get_guests_collection()
    
    now = datetime.now(timezone.utc)
    update_data = {}
    
    if action == ModerationAction.TEMP_BAN_1H.value:
        update_data['banned_until'] = (now + timedelta(hours=1)).isoformat()
    elif action == ModerationAction.TEMP_BAN_24H.value:
        update_data['banned_until'] = (now + timedelta(hours=24)).isoformat()
    elif action == ModerationAction.TEMP_BAN_7D.value:
        update_data['banned_until'] = (now + timedelta(days=7)).isoformat()
    elif action == ModerationAction.PERMANENT_BAN.value:
        update_data['is_banned'] = True
        update_data['banned_at'] = now.isoformat()
    elif action == ModerationAction.ACCOUNT_DELETED.value:
        update_data['is_deleted'] = True
        update_data['deleted_at'] = now.isoformat()
    
    if update_data:
        # Try updating in users collection
        result = await users_collection.update_one(
            {'user_id': user_id},
            {'$set': update_data}
        )
        
        # If not found, try guests collection
        if result.matched_count == 0:
            await guests_collection.update_one(
                {'guest_id': user_id},
                {'$set': update_data}
            )
        
        logger.info(f"Applied moderation action {action} to user {user_id}")
