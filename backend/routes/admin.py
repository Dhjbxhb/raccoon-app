from fastapi import APIRouter, Depends, HTTPException, Header, Query, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from services.auth_service import AuthService
from services.db_service import (
    get_users_collection, get_guests_collection, get_matches_collection, 
    get_messages_collection, get_reports_collection, get_sessions_collection
)
from services.admin_log_service import admin_log_service
from services.ban_service import ban_service
from services.premium_service import premium_service
from models.admin_log import AdminActionType
import uuid

router = APIRouter(prefix="/admin", tags=["admin"])

# ============================================
# MODELS
# ============================================

class PremiumUpdate(BaseModel):
    premium: bool
    duration_days: Optional[int] = None  # None = permanent

class AdminUpdate(BaseModel):
    is_admin: bool

class BanUpdate(BaseModel):
    is_banned: bool
    duration_hours: Optional[int] = None  # None = permanent
    reason: Optional[str] = None

class ReportAction(BaseModel):
    status: str  # reviewed, ignored, actioned
    admin_notes: Optional[str] = None
    ban_user: Optional[bool] = False
    ban_duration_hours: Optional[int] = None

class CreateReport(BaseModel):
    reported_id: str
    reason: str
    details: Optional[str] = None
    session_id: Optional[str] = None

# ============================================
# AUTH MIDDLEWARE
# ============================================

async def get_current_admin(authorization: Optional[str] = Header(None)):
    """Verify admin access - ONLY admins can access admin routes"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing token")
    
    token = authorization.replace('Bearer ', '')
    payload = AuthService.decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Check if user is admin from JWT payload
    if not payload.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get admin username for logging
    users = get_users_collection()
    admin_user = await users.find_one({'user_id': payload['user_id']}, {'_id': 0, 'username': 1})
    payload['username'] = admin_user.get('username', 'Admin') if admin_user else 'Admin'
    
    return payload

# ============================================
# DASHBOARD STATS
# ============================================

@router.get("/dashboard")
async def get_dashboard_stats(admin = Depends(get_current_admin)):
    """Get comprehensive dashboard statistics with comparisons"""
    users_collection = get_users_collection()
    guests_collection = get_guests_collection()
    matches_collection = get_matches_collection()
    messages_collection = get_messages_collection()
    reports_collection = get_reports_collection()
    
    # Time ranges
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    week_start = today_start - timedelta(days=7)
    
    # User counts
    total_users = await users_collection.count_documents({})
    total_guests = await guests_collection.count_documents({})
    premium_users = await users_collection.count_documents({'premium_status': True})
    banned_users = await users_collection.count_documents({'is_banned': True})
    
    # Active users (last 5 minutes = "online now")
    five_min_ago = (now - timedelta(minutes=5)).isoformat()
    online_users = await users_collection.count_documents({
        'last_active': {'$gte': five_min_ago}
    })
    online_guests = await guests_collection.count_documents({
        'last_active': {'$gte': five_min_ago}
    })
    
    # Active today
    active_today = await users_collection.count_documents({
        'last_active': {'$gte': today_start.isoformat()}
    })
    active_yesterday = await users_collection.count_documents({
        'last_active': {
            '$gte': yesterday_start.isoformat(),
            '$lt': today_start.isoformat()
        }
    })
    
    # Matches
    matches_today = await matches_collection.count_documents({
        'created_at': {'$gte': today_start.isoformat()}
    })
    matches_yesterday = await matches_collection.count_documents({
        'created_at': {
            '$gte': yesterday_start.isoformat(),
            '$lt': today_start.isoformat()
        }
    })
    total_matches = await matches_collection.count_documents({})
    
    # Messages
    messages_today = await messages_collection.count_documents({
        'timestamp': {'$gte': today_start.isoformat()}
    })
    messages_yesterday = await messages_collection.count_documents({
        'timestamp': {
            '$gte': yesterday_start.isoformat(),
            '$lt': today_start.isoformat()
        }
    })
    total_messages = await messages_collection.count_documents({})
    
    # Reports
    total_reports = await reports_collection.count_documents({})
    pending_reports = await reports_collection.count_documents({'status': 'pending'})
    reports_today = await reports_collection.count_documents({
        'created_at': {'$gte': today_start.isoformat()}
    })
    
    # New signups
    new_users_today = await users_collection.count_documents({
        'created_at': {'$gte': today_start.isoformat()}
    })
    new_users_yesterday = await users_collection.count_documents({
        'created_at': {
            '$gte': yesterday_start.isoformat(),
            '$lt': today_start.isoformat()
        }
    })
    new_users_week = await users_collection.count_documents({
        'created_at': {'$gte': week_start.isoformat()}
    })
    
    # Premium stats
    premium_expiring_soon = await users_collection.count_documents({
        'premium_status': True,
        'premium_expires_at': {
            '$lte': (now + timedelta(days=7)).isoformat(),
            '$gte': now.isoformat()
        }
    })
    
    # Calculate comparisons
    def calc_change(today_val, yesterday_val):
        if yesterday_val == 0:
            return 100 if today_val > 0 else 0
        return round(((today_val - yesterday_val) / yesterday_val) * 100, 1)
    
    return {
        'overview': {
            'total_users': total_users,
            'total_guests': total_guests,
            'premium_users': premium_users,
            'banned_users': banned_users,
            'total_matches': total_matches,
            'total_messages': total_messages,
            'total_reports': total_reports
        },
        'live': {
            'online_users': online_users,
            'online_guests': online_guests,
            'total_online': online_users + online_guests
        },
        'today': {
            'active_users': active_today,
            'matches': matches_today,
            'messages': messages_today,
            'new_signups': new_users_today,
            'reports': reports_today
        },
        'yesterday': {
            'active_users': active_yesterday,
            'matches': matches_yesterday,
            'messages': messages_yesterday,
            'new_signups': new_users_yesterday
        },
        'comparisons': {
            'active_users_change': calc_change(active_today, active_yesterday),
            'matches_change': calc_change(matches_today, matches_yesterday),
            'messages_change': calc_change(messages_today, messages_yesterday),
            'signups_change': calc_change(new_users_today, new_users_yesterday)
        },
        'weekly': {
            'new_users': new_users_week
        },
        'alerts': {
            'pending_reports': pending_reports,
            'premium_expiring_soon': premium_expiring_soon
        }
    }

# ============================================
# USER MANAGEMENT
# ============================================

@router.get("/users")
async def get_users(
    admin = Depends(get_current_admin),
    search: Optional[str] = Query(None),
    filter: Optional[str] = Query("all"),  # all, premium, banned, guests
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get paginated list of users with search and filter"""
    users_collection = get_users_collection()
    guests_collection = get_guests_collection()
    
    # Build query
    query = {}
    if search:
        query['$or'] = [
            {'username': {'$regex': search, '$options': 'i'}},
            {'email': {'$regex': search, '$options': 'i'}},
            {'user_id': {'$regex': search, '$options': 'i'}}
        ]
    
    if filter == 'premium':
        query['premium_status'] = True
    elif filter == 'banned':
        query['is_banned'] = True
    
    # Get counts
    total_users = await users_collection.count_documents(query)
    
    # Paginate
    skip = (page - 1) * limit
    users_cursor = users_collection.find(query, {'_id': 0, 'password_hash': 0}).skip(skip).limit(limit).sort('created_at', -1)
    users = await users_cursor.to_list(length=limit)
    
    # Get guest count for stats
    total_guests = await guests_collection.count_documents({})
    premium_count = await users_collection.count_documents({'premium_status': True})
    banned_count = await users_collection.count_documents({'is_banned': True})
    
    # If filter is guests, get guests instead
    guests = []
    if filter == 'guests':
        guests_cursor = guests_collection.find({}, {'_id': 0}).skip(skip).limit(limit).sort('created_at', -1)
        guests = await guests_cursor.to_list(length=limit)
    
    return {
        'users': users if filter != 'guests' else [],
        'guests': guests if filter == 'guests' else [],
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total_users if filter != 'guests' else total_guests,
            'pages': (total_users // limit) + (1 if total_users % limit else 0)
        },
        'stats': {
            'total': total_users,
            'premium': premium_count,
            'banned': banned_count,
            'guests': total_guests,
            'active': await users_collection.count_documents({
                'last_active': {'$gte': (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()}
            })
        }
    }

@router.get("/users/{user_id}")
async def get_user_details(user_id: str, admin = Depends(get_current_admin)):
    """Get detailed user profile for admin view"""
    users_collection = get_users_collection()
    guests_collection = get_guests_collection()
    matches_collection = get_matches_collection()
    messages_collection = get_messages_collection()
    reports_collection = get_reports_collection()
    
    # Try to find user
    user = await users_collection.find_one({'user_id': user_id}, {'_id': 0, 'password_hash': 0})
    is_guest = False
    
    if not user:
        # Try guest
        user = await guests_collection.find_one({'guest_id': user_id}, {'_id': 0})
        is_guest = True
        
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get activity stats
    user_id_field = 'guest_id' if is_guest else 'user_id'
    actual_id = user.get(user_id_field)
    
    # Match count
    match_count = await matches_collection.count_documents({
        '$or': [
            {'user1_id': actual_id},
            {'user2_id': actual_id}
        ]
    })
    
    # Message count
    message_count = await messages_collection.count_documents({
        'sender_id': actual_id
    })
    
    # Report stats
    reports_received = await reports_collection.count_documents({
        'reported_id': actual_id
    })
    reports_made = await reports_collection.count_documents({
        'reporter_id': actual_id
    })
    
    # Recent matches
    recent_matches = await matches_collection.find({
        '$or': [
            {'user1_id': actual_id},
            {'user2_id': actual_id}
        ]
    }, {'_id': 0}).sort('created_at', -1).limit(10).to_list(length=10)
    
    # Calculate time on platform
    created_at = user.get('created_at')
    if created_at:
        if isinstance(created_at, str):
            created_dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        else:
            created_dt = created_at
        days_on_platform = (datetime.now(timezone.utc) - created_dt).days
    else:
        days_on_platform = 0
    
    return {
        'user': user,
        'is_guest': is_guest,
        'stats': {
            'total_matches': match_count,
            'total_messages': message_count,
            'reports_received': reports_received,
            'reports_made': reports_made,
            'days_on_platform': days_on_platform
        },
        'recent_matches': recent_matches
    }

@router.post("/users/{user_id}/ban")
async def ban_user(user_id: str, data: BanUpdate, request: Request, admin = Depends(get_current_admin)):
    """Ban or unban a user with optional duration and full audit logging"""
    users_collection = get_users_collection()
    
    # Get target user info for logging
    target_user = await users_collection.find_one({'user_id': user_id}, {'_id': 0, 'username': 1})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get client IP for audit
    client_ip = request.client.host
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        client_ip = forwarded_for.split(',')[0].strip()
    
    if data.is_banned:
        # Ban user using ban service
        result = await ban_service.ban_user(
            user_id=user_id,
            reason=data.reason,
            duration_hours=data.duration_hours,
            banned_by=admin['user_id'],
            is_guest=False
        )
        
        # Determine action type for audit log
        action_type = AdminActionType.TEMP_BAN_USER if data.duration_hours else AdminActionType.BAN_USER
        
        # Log the action
        await admin_log_service.log_action(
            action_type=action_type,
            admin_id=admin['user_id'],
            admin_username=admin.get('username', 'Admin'),
            target_id=user_id,
            target_type='user',
            target_username=target_user.get('username'),
            details={
                'reason': data.reason,
                'duration_hours': data.duration_hours,
                'ban_type': 'temporary' if data.duration_hours else 'permanent',
                'expires_at': result.get('expires_at')
            },
            ip_address=client_ip
        )
        
        action = "banned"
        duration = f" for {data.duration_hours} hours" if data.duration_hours else " permanently"
    else:
        # Unban user
        await ban_service.unban_user(
            user_id=user_id,
            unbanned_by=admin['user_id'],
            is_guest=False
        )
        
        # Log the unban action
        await admin_log_service.log_action(
            action_type=AdminActionType.UNBAN_USER,
            admin_id=admin['user_id'],
            admin_username=admin.get('username', 'Admin'),
            target_id=user_id,
            target_type='user',
            target_username=target_user.get('username'),
            details={'previous_reason': data.reason},
            ip_address=client_ip
        )
        
        action = "unbanned"
        duration = ""
    
    return {'message': f'User {action}{duration}', 'success': True}

@router.post("/users/{user_id}/premium")
async def update_premium(user_id: str, data: PremiumUpdate, request: Request, admin = Depends(get_current_admin)):
    """Update user premium status with optional duration and full audit logging"""
    users_collection = get_users_collection()
    
    # Get target user info for logging
    target_user = await users_collection.find_one({'user_id': user_id}, {'_id': 0, 'username': 1})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get client IP for audit
    client_ip = request.client.host
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        client_ip = forwarded_for.split(',')[0].strip()
    
    if data.premium:
        # Grant premium using premium service
        result = await premium_service.grant_premium(
            user_id=user_id,
            duration_days=data.duration_days,
            tier='premium',
            granted_by=admin['user_id'],
            reason='admin_grant'
        )
        
        # Log the action
        await admin_log_service.log_action(
            action_type=AdminActionType.GRANT_PREMIUM,
            admin_id=admin['user_id'],
            admin_username=admin.get('username', 'Admin'),
            target_id=user_id,
            target_type='user',
            target_username=target_user.get('username'),
            details={
                'duration_days': data.duration_days,
                'grant_type': 'temporary' if data.duration_days else 'lifetime',
                'expires_at': result.get('expires_at')
            },
            ip_address=client_ip
        )
        
        action = "granted"
        duration = f" for {data.duration_days} days" if data.duration_days else " (lifetime)"
    else:
        # Remove premium
        await premium_service.remove_premium(
            user_id=user_id,
            removed_by=admin['user_id'],
            reason='admin_removal'
        )
        
        # Log the removal action
        await admin_log_service.log_action(
            action_type=AdminActionType.REMOVE_PREMIUM,
            admin_id=admin['user_id'],
            admin_username=admin.get('username', 'Admin'),
            target_id=user_id,
            target_type='user',
            target_username=target_user.get('username'),
            details={'reason': 'admin_removal'},
            ip_address=client_ip
        )
        
        action = "removed"
        duration = ""
    
    return {'message': f'Premium {action}{duration}', 'success': True}

@router.post("/users/{user_id}/admin")
async def update_admin_status(user_id: str, data: AdminUpdate, request: Request, admin = Depends(get_current_admin)):
    """Update user admin status with audit logging"""
    users_collection = get_users_collection()
    
    # Get target user info for logging
    target_user = await users_collection.find_one({'user_id': user_id}, {'_id': 0, 'username': 1})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get client IP for audit
    client_ip = request.client.host
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        client_ip = forwarded_for.split(',')[0].strip()
    
    result = await users_collection.update_one(
        {'user_id': user_id},
        {'$set': {'is_admin': data.is_admin}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found or no change")
    
    # Log the action
    action_type = AdminActionType.GRANT_ADMIN if data.is_admin else AdminActionType.REMOVE_ADMIN
    await admin_log_service.log_action(
        action_type=action_type,
        admin_id=admin['user_id'],
        admin_username=admin.get('username', 'Admin'),
        target_id=user_id,
        target_type='user',
        target_username=target_user.get('username'),
        details={'new_admin_status': data.is_admin},
        ip_address=client_ip
    )
    
    return {'message': f'Admin status updated to {data.is_admin}', 'success': True}

# ============================================
# REPORTS MANAGEMENT
# ============================================

@router.get("/reports")
async def get_reports(
    admin = Depends(get_current_admin),
    status: Optional[str] = Query(None),  # pending, reviewed, ignored, actioned
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get paginated list of reports"""
    reports_collection = get_reports_collection()
    
    query = {}
    if status:
        query['status'] = status
    
    total = await reports_collection.count_documents(query)
    skip = (page - 1) * limit
    
    reports_cursor = reports_collection.find(query, {'_id': 0}).skip(skip).limit(limit).sort('created_at', -1)
    reports = await reports_cursor.to_list(length=limit)
    
    # Get stats
    pending = await reports_collection.count_documents({'status': 'pending'})
    reviewed = await reports_collection.count_documents({'status': 'reviewed'})
    actioned = await reports_collection.count_documents({'status': 'actioned'})
    
    return {
        'reports': reports,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'pages': (total // limit) + (1 if total % limit else 0)
        },
        'stats': {
            'pending': pending,
            'reviewed': reviewed,
            'actioned': actioned,
            'total': total
        }
    }

@router.post("/reports/{report_id}/action")
async def action_report(report_id: str, data: ReportAction, request: Request, admin = Depends(get_current_admin)):
    """Take action on a report with full audit logging"""
    reports_collection = get_reports_collection()
    users_collection = get_users_collection()
    
    report = await reports_collection.find_one({'report_id': report_id}, {'_id': 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Get client IP for audit
    client_ip = request.client.host
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        client_ip = forwarded_for.split(',')[0].strip()
    
    update_data = {
        'status': data.status,
        'admin_notes': data.admin_notes,
        'reviewed_at': datetime.now(timezone.utc).isoformat(),
        'reviewed_by': admin['user_id']
    }
    
    await reports_collection.update_one(
        {'report_id': report_id},
        {'$set': update_data}
    )
    
    # Determine action type for audit log
    if data.status == 'actioned':
        action_type = AdminActionType.ACTION_REPORT
    elif data.status == 'ignored':
        action_type = AdminActionType.DISMISS_REPORT
    else:
        action_type = AdminActionType.REVIEW_REPORT
    
    # Log the report action
    await admin_log_service.log_action(
        action_type=action_type,
        admin_id=admin['user_id'],
        admin_username=admin.get('username', 'Admin'),
        target_id=report_id,
        target_type='report',
        target_username=report.get('reported_username'),
        details={
            'status': data.status,
            'admin_notes': data.admin_notes,
            'reported_id': report.get('reported_id'),
            'reporter_id': report.get('reporter_id'),
            'reason': report.get('reason'),
            'ban_user': data.ban_user,
            'ban_duration_hours': data.ban_duration_hours
        },
        ip_address=client_ip
    )
    
    # Ban user if requested
    if data.ban_user and report.get('reported_id'):
        reported_user = await users_collection.find_one({'user_id': report['reported_id']}, {'_id': 0, 'username': 1})
        
        # Use ban service
        await ban_service.ban_user(
            user_id=report['reported_id'],
            reason=f"Banned from report: {report.get('reason')}",
            duration_hours=data.ban_duration_hours,
            banned_by=admin['user_id'],
            is_guest=False
        )
        
        # Log the ban action separately
        action_type = AdminActionType.TEMP_BAN_USER if data.ban_duration_hours else AdminActionType.BAN_USER
        await admin_log_service.log_action(
            action_type=action_type,
            admin_id=admin['user_id'],
            admin_username=admin.get('username', 'Admin'),
            target_id=report['reported_id'],
            target_type='user',
            target_username=reported_user.get('username') if reported_user else None,
            details={
                'reason': f"Banned from report: {report.get('reason')}",
                'duration_hours': data.ban_duration_hours,
                'from_report_id': report_id
            },
            ip_address=client_ip
        )
    
    return {'message': 'Report updated', 'success': True}

# ============================================
# MATCHES & SESSIONS
# ============================================

@router.get("/matches")
async def get_matches(
    admin = Depends(get_current_admin),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user_id: Optional[str] = Query(None)
):
    """Get match history"""
    matches_collection = get_matches_collection()
    
    query = {}
    if user_id:
        query['$or'] = [
            {'user1_id': user_id},
            {'user2_id': user_id}
        ]
    
    total = await matches_collection.count_documents(query)
    skip = (page - 1) * limit
    
    matches_cursor = matches_collection.find(query, {'_id': 0}).skip(skip).limit(limit).sort('created_at', -1)
    matches = await matches_cursor.to_list(length=limit)
    
    return {
        'matches': matches,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'pages': (total // limit) + (1 if total % limit else 0)
        }
    }

@router.get("/matches/{session_id}/messages")
async def get_session_messages(session_id: str, admin = Depends(get_current_admin)):
    """Get messages from a specific session"""
    messages_collection = get_messages_collection()
    
    messages_cursor = messages_collection.find(
        {'session_id': session_id}, 
        {'_id': 0}
    ).sort('timestamp', 1)
    messages = await messages_cursor.to_list(length=1000)
    
    return {'messages': messages, 'count': len(messages)}

# ============================================
# PREMIUM MANAGEMENT
# ============================================

@router.get("/premium")
async def get_premium_users(
    admin = Depends(get_current_admin),
    filter: Optional[str] = Query("active"),  # active, expired, expiring
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get premium users with filters"""
    users_collection = get_users_collection()
    now = datetime.now(timezone.utc).isoformat()
    
    query = {}
    if filter == 'active':
        query['premium_status'] = True
    elif filter == 'expired':
        query['$and'] = [
            {'premium_status': False},
            {'premium_expires_at': {'$exists': True, '$ne': None}}
        ]
    elif filter == 'expiring':
        week_later = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        query['$and'] = [
            {'premium_status': True},
            {'premium_expires_at': {'$lte': week_later, '$gte': now}}
        ]
    
    total = await users_collection.count_documents(query)
    skip = (page - 1) * limit
    
    users_cursor = users_collection.find(query, {'_id': 0, 'password_hash': 0}).skip(skip).limit(limit).sort('premium_granted_at', -1)
    users = await users_cursor.to_list(length=limit)
    
    # Stats
    active_premium = await users_collection.count_documents({'premium_status': True})
    expiring_soon = await users_collection.count_documents({
        'premium_status': True,
        'premium_expires_at': {
            '$lte': (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            '$gte': now
        }
    })
    
    return {
        'users': users,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'pages': (total // limit) + (1 if total % limit else 0)
        },
        'stats': {
            'active': active_premium,
            'expiring_soon': expiring_soon
        }
    }

# ============================================
# SETUP / UTILITY
# ============================================

@router.get("/logs")
async def get_admin_logs(
    admin = Depends(get_current_admin),
    admin_id: Optional[str] = Query(None),
    target_id: Optional[str] = Query(None),
    action_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100)
):
    """Get admin action audit logs with filters"""
    result = await admin_log_service.get_logs(
        admin_id=admin_id,
        target_id=target_id,
        action_type=action_type,
        page=page,
        limit=limit
    )
    return result

@router.get("/logs/user/{user_id}")
async def get_user_admin_history(user_id: str, admin = Depends(get_current_admin)):
    """Get all admin actions taken on a specific user"""
    logs = await admin_log_service.get_user_action_history(user_id)
    return {'logs': logs, 'count': len(logs)}

@router.post("/process-expired")
async def process_expired_items(admin = Depends(get_current_admin)):
    """Manually trigger processing of expired bans and premiums"""
    unbanned_count = await ban_service.process_expired_bans()
    expired_premium_count = await premium_service.process_expired_premiums()
    
    return {
        'success': True,
        'unbanned_users': unbanned_count,
        'expired_premiums': expired_premium_count
    }

@router.post("/setup-admin")
async def setup_admin_account():
    """One-time setup to create admin account"""
    users_collection = get_users_collection()
    admin_email = "admin@raccoon.app"
    
    admin_user = await users_collection.find_one({"email": admin_email}, {"_id": 0})
    
    if admin_user:
        await users_collection.update_one(
            {"email": admin_email},
            {"$set": {"is_admin": True, "premium_status": True}}
        )
        return {
            "message": f"User {admin_email} has been granted admin and premium status",
            "user_id": admin_user.get("user_id"),
            "action": "updated"
        }
    else:
        return {
            "message": f"User {admin_email} does not exist. Please sign up first.",
            "action": "none"
        }
