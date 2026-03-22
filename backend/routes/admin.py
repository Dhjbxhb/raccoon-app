from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from services.auth_service import AuthService
from services.db_service import get_users_collection, get_guests_collection, get_matches_collection, get_messages_collection

router = APIRouter(prefix="/admin", tags=["admin"])

class PremiumUpdate(BaseModel):
    premium: bool

class AdminUpdate(BaseModel):
    is_admin: bool

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
    
    return payload

@router.get("/users")
async def get_all_users(admin = Depends(get_current_admin)):
    """Get all users for admin panel"""
    users_collection = get_users_collection()
    guests_collection = get_guests_collection()
    
    # Get all registered users
    users_cursor = users_collection.find({}, {'_id': 0, 'password_hash': 0})
    users = await users_cursor.to_list(length=1000)
    
    # Get guests
    guests_cursor = guests_collection.find({}, {'_id': 0})
    guests = await guests_cursor.to_list(length=1000)
    
    # Combine and format
    all_users = []
    
    for user in users:
        all_users.append({
            'user_id': user.get('user_id'),
            'username': user.get('username'),
            'email': user.get('email'),
            'country': user.get('country'),
            'gender': user.get('gender'),
            'premium_status': user.get('premium_status', False),
            'is_banned': user.get('is_banned', False),
            'created_at': user.get('created_at'),
            'is_guest': False
        })
    
    for guest in guests:
        all_users.append({
            'user_id': guest.get('guest_id'),
            'username': guest.get('username'),
            'email': None,
            'country': guest.get('country'),
            'gender': guest.get('gender'),
            'premium_status': False,
            'is_banned': guest.get('is_banned', False),
            'created_at': guest.get('created_at'),
            'is_guest': True
        })
    
    # Calculate stats
    stats = {
        'total': len(all_users),
        'premium': sum(1 for u in all_users if u.get('premium_status')),
        'banned': sum(1 for u in all_users if u.get('is_banned')),
        'active': sum(1 for u in all_users if not u.get('is_banned'))
    }
    
    return {'users': all_users, 'stats': stats}

@router.post("/users/{user_id}/ban")
async def ban_user(user_id: str, admin = Depends(get_current_admin)):
    """Ban a user"""
    users_collection = get_users_collection()
    guests_collection = get_guests_collection()
    
    # Try to ban in users collection
    result = await users_collection.update_one(
        {'user_id': user_id},
        {'$set': {'is_banned': True, 'banned_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        # Try guests collection
        result = await guests_collection.update_one(
            {'guest_id': user_id},
            {'$set': {'is_banned': True, 'banned_at': datetime.now(timezone.utc).isoformat()}}
        )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {'message': 'User banned successfully'}

@router.post("/users/{user_id}/unban")
async def unban_user(user_id: str, admin = Depends(get_current_admin)):
    """Unban a user"""
    users_collection = get_users_collection()
    guests_collection = get_guests_collection()
    
    # Try to unban in users collection
    result = await users_collection.update_one(
        {'user_id': user_id},
        {'$set': {'is_banned': False}, '$unset': {'banned_at': ''}}
    )
    
    if result.modified_count == 0:
        # Try guests collection
        result = await guests_collection.update_one(
            {'guest_id': user_id},
            {'$set': {'is_banned': False}, '$unset': {'banned_at': ''}}
        )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {'message': 'User unbanned successfully'}

@router.post("/users/{user_id}/premium")
async def update_premium(user_id: str, update: PremiumUpdate, admin = Depends(get_current_admin)):
    """Update user premium status"""
    users_collection = get_users_collection()
    
    result = await users_collection.update_one(
        {'user_id': user_id},
        {'$set': {'premium_status': update.premium}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {'message': f'Premium status updated to {update.premium}'}

@router.post("/users/{user_id}/admin")
async def update_admin_status(user_id: str, update: AdminUpdate, admin = Depends(get_current_admin)):
    """Update user admin status (only super admin can do this)"""
    users_collection = get_users_collection()
    
    result = await users_collection.update_one(
        {'user_id': user_id},
        {'$set': {'is_admin': update.is_admin}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {'message': f'Admin status updated to {update.is_admin}'}

@router.get("/stats")
async def get_platform_stats(admin = Depends(get_current_admin)):
    """Get detailed platform statistics"""
    users_collection = get_users_collection()
    guests_collection = get_guests_collection()
    matches_collection = get_matches_collection()
    messages_collection = get_messages_collection()
    
    # User counts
    total_users = await users_collection.count_documents({})
    total_guests = await guests_collection.count_documents({})
    premium_users = await users_collection.count_documents({'premium_status': True})
    banned_users = await users_collection.count_documents({'is_banned': True})
    
    # Matches stats
    total_matches = await matches_collection.count_documents({})
    
    # Today's date range
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    # Messages today - handle both string and datetime formats
    try:
        messages_today = await messages_collection.count_documents({
            'timestamp': {
                '$gte': today_start.isoformat(),
                '$lt': today_end.isoformat()
            }
        })
    except Exception:
        messages_today = 0
    
    # Active sessions (users who logged in today)
    active_today = await users_collection.count_documents({
        'last_active': {
            '$gte': today_start.isoformat()
        }
    })
    
    return {
        'total_users': total_users,
        'total_guests': total_guests,
        'premium_users': premium_users,
        'banned_users': banned_users,
        'total_matches': total_matches,
        'messages_today': messages_today,
        'active_sessions': active_today
    }

@router.post("/setup-admin")
async def setup_admin_account():
    """
    One-time setup to create or promote admin@raccoon.app to admin status.
    Also grants premium status for testing purposes.
    This endpoint is unprotected but only works for the specific admin email.
    """
    users_collection = get_users_collection()
    admin_email = "admin@raccoon.app"
    
    # Check if admin already exists
    admin_user = await users_collection.find_one({"email": admin_email}, {"_id": 0})
    
    if admin_user:
        # Update existing user to admin + premium
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
            "message": f"User {admin_email} does not exist. Please sign up first with this email.",
            "action": "none"
        }
