from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from services.auth_service import AuthService
from services.db_service import get_users_collection, get_guests_collection

router = APIRouter(prefix="/admin", tags=["admin"])

class PremiumUpdate(BaseModel):
    premium: bool

async def get_current_admin(authorization: Optional[str] = Header(None)):
    """Verify admin access"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing token")
    
    token = authorization.replace('Bearer ', '')
    payload = AuthService.decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # For now, allow any authenticated user to access admin
    # In production, check payload for admin role
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
