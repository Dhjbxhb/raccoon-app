"""
Stats Routes - Real user statistics API endpoints

Provides endpoints for:
- Getting real user stats (sessions, time, games)
- Getting premium subscription status with remaining time
- Heartbeat for time tracking
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from middleware.auth_middleware import verify_token
from services.stats_service import stats_service
from services.db_service import get_users_collection, get_guests_collection
from services.subscription_service import subscription_service

router = APIRouter(prefix="/stats", tags=["stats"])


class StatsResponse(BaseModel):
    """User statistics response"""
    total_sessions: int
    total_time_spent: int  # in seconds
    games_played: int
    games_won: int
    formatted_time: str  # Human-readable time


class PremiumStatusResponse(BaseModel):
    """Premium subscription status response"""
    is_premium: bool
    plan_type: Optional[str] = None
    plan_name: Optional[str] = None
    start_date: Optional[str] = None
    expiry_date: Optional[str] = None
    days_remaining: Optional[int] = None
    time_remaining_formatted: Optional[str] = None
    is_lifetime: bool = False
    is_expired: bool = False
    auto_renew: bool = False


class HeartbeatResponse(BaseModel):
    """Heartbeat response"""
    success: bool
    seconds_added: int
    total_time_spent: int


def format_time_spent(seconds: int) -> str:
    """Format seconds into human-readable time"""
    if seconds < 60:
        return f"{seconds}s"
    elif seconds < 3600:
        minutes = seconds // 60
        return f"{minutes}m"
    elif seconds < 86400:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        if minutes > 0:
            return f"{hours}h {minutes}m"
        return f"{hours}h"
    else:
        days = seconds // 86400
        hours = (seconds % 86400) // 3600
        if hours > 0:
            return f"{days}d {hours}h"
        return f"{days}d"


def format_remaining_time(days: int) -> str:
    """Format remaining days into human-readable format"""
    if days <= 0:
        return "Expired"
    elif days == 1:
        return "1 day left"
    elif days < 7:
        return f"{days} days left"
    elif days < 30:
        weeks = days // 7
        return f"{weeks} week{'s' if weeks > 1 else ''} left"
    elif days < 365:
        months = days // 30
        return f"{months} month{'s' if months > 1 else ''} left"
    else:
        years = days // 365
        return f"{years} year{'s' if years > 1 else ''} left"


@router.get("/me", response_model=StatsResponse)
async def get_my_stats(request: Request):
    """Get current user's real statistics"""
    payload = await verify_token(request)
    user_id = payload['user_id']
    is_guest = payload.get('is_guest', False)
    
    # Get real stats from database
    stats = await stats_service.get_user_stats(user_id, is_guest)
    
    return StatsResponse(
        total_sessions=stats['total_sessions'],
        total_time_spent=stats['total_time_spent'],
        games_played=stats['games_played'],
        games_won=stats['games_won'],
        formatted_time=format_time_spent(stats['total_time_spent'])
    )


@router.get("/premium-status", response_model=PremiumStatusResponse)
async def get_premium_status(request: Request):
    """Get current user's premium subscription status with remaining time"""
    payload = await verify_token(request)
    user_id = payload['user_id']
    is_guest = payload.get('is_guest', False)
    
    # Guests are never premium
    if is_guest:
        return PremiumStatusResponse(
            is_premium=False,
            is_expired=False,
            is_lifetime=False
        )
    
    # Get user data
    users = get_users_collection()
    user = await users.find_one(
        {"user_id": user_id},
        {"_id": 0, "premium_status": 1, "premium_tier": 1, 
         "premium_started_at": 1, "premium_expires_at": 1,
         "stripe_subscription_id": 1}
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    is_premium = user.get('premium_status', False)
    premium_tier = user.get('premium_tier', 'free')
    
    if not is_premium or premium_tier == 'free':
        return PremiumStatusResponse(
            is_premium=False,
            is_expired=False,
            is_lifetime=False
        )
    
    # Get subscription details
    premium_started = user.get('premium_started_at')
    premium_expires = user.get('premium_expires_at')
    
    # Check if lifetime
    is_lifetime = premium_tier == 'lifetime'
    
    # Calculate remaining time
    days_remaining = None
    time_remaining_formatted = None
    is_expired = False
    
    if premium_expires and not is_lifetime:
        try:
            if isinstance(premium_expires, str):
                expiry_dt = datetime.fromisoformat(premium_expires.replace('Z', '+00:00'))
            else:
                expiry_dt = premium_expires
            
            now = datetime.now(timezone.utc)
            delta = expiry_dt - now
            days_remaining = max(0, delta.days)
            
            if days_remaining == 0 and delta.total_seconds() > 0:
                # Less than a day but not expired
                hours = int(delta.total_seconds() // 3600)
                if hours > 0:
                    time_remaining_formatted = f"{hours} hours left"
                else:
                    minutes = int(delta.total_seconds() // 60)
                    time_remaining_formatted = f"{minutes} minutes left"
            elif days_remaining > 0:
                time_remaining_formatted = format_remaining_time(days_remaining)
            else:
                is_expired = True
                time_remaining_formatted = "Expired"
        except Exception as e:
            print(f"Error parsing expiry date: {e}")
    
    # Map tier to display name
    plan_names = {
        'weekly': 'Weekly Premium',
        'monthly': 'Monthly Premium',
        'quarterly': '3-Month Premium',
        'yearly': 'Annual Premium',
        'lifetime': 'Lifetime Premium'
    }
    
    # Format start date
    start_date_formatted = None
    if premium_started:
        try:
            if isinstance(premium_started, str):
                start_dt = datetime.fromisoformat(premium_started.replace('Z', '+00:00'))
            else:
                start_dt = premium_started
            start_date_formatted = start_dt.strftime('%b %d, %Y')
        except Exception:
            pass
    
    # Format expiry date
    expiry_date_formatted = None
    if premium_expires and not is_lifetime:
        try:
            if isinstance(premium_expires, str):
                expiry_dt = datetime.fromisoformat(premium_expires.replace('Z', '+00:00'))
            else:
                expiry_dt = premium_expires
            expiry_date_formatted = expiry_dt.strftime('%b %d, %Y')
        except Exception:
            pass
    
    return PremiumStatusResponse(
        is_premium=is_premium and not is_expired,
        plan_type=premium_tier,
        plan_name=plan_names.get(premium_tier, 'Premium'),
        start_date=start_date_formatted,
        expiry_date=expiry_date_formatted,
        days_remaining=days_remaining,
        time_remaining_formatted=time_remaining_formatted if not is_lifetime else "Forever",
        is_lifetime=is_lifetime,
        is_expired=is_expired,
        auto_renew=bool(user.get('stripe_subscription_id'))
    )


@router.post("/heartbeat", response_model=HeartbeatResponse)
async def heartbeat(request: Request):
    """
    Process heartbeat from client for time tracking.
    Call this every 30 seconds from the frontend.
    """
    payload = await verify_token(request)
    user_id = payload['user_id']
    is_guest = payload.get('is_guest', False)
    
    # Process heartbeat and get time added
    seconds_added = await stats_service.process_heartbeat(user_id, is_guest)
    
    # Get updated total time
    stats = await stats_service.get_user_stats(user_id, is_guest)
    
    return HeartbeatResponse(
        success=True,
        seconds_added=seconds_added,
        total_time_spent=stats['total_time_spent']
    )


@router.get("/full")
async def get_full_user_data(request: Request):
    """
    Get full user data including stats and premium status.
    Single endpoint for Profile page to reduce API calls.
    """
    payload = await verify_token(request)
    user_id = payload['user_id']
    is_guest = payload.get('is_guest', False)
    
    if is_guest:
        guests = get_guests_collection()
        user = await guests.find_one({"guest_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="Guest not found")
        
        return {
            "user_id": user.get('guest_id'),
            "username": user.get('username'),
            "email": None,
            "gender": user.get('gender'),
            "country": user.get('country'),
            "country_code": user.get('country_code'),
            "country_flag": user.get('country_flag'),
            "is_guest": True,
            "age_verified": user.get('age_verified', False),
            "created_at": user.get('created_at'),
            "stats": {
                "total_sessions": user.get('total_sessions', 0),
                "total_time_spent": user.get('total_time_spent', 0),
                "games_played": user.get('games_played', 0),
                "games_won": user.get('games_won', 0),
                "formatted_time": format_time_spent(user.get('total_time_spent', 0))
            },
            "premium": {
                "is_premium": False,
                "plan_type": None,
                "plan_name": None,
                "expiry_date": None,
                "days_remaining": None,
                "time_remaining_formatted": None,
                "is_lifetime": False,
                "is_expired": False
            }
        }
    
    # Regular user
    users = get_users_collection()
    user = await users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get premium status
    is_premium = user.get('premium_status', False)
    premium_tier = user.get('premium_tier', 'free')
    premium_expires = user.get('premium_expires_at')
    premium_started = user.get('premium_started_at')
    
    # Calculate remaining time
    days_remaining = None
    time_remaining_formatted = None
    is_expired = False
    is_lifetime = premium_tier == 'lifetime'
    
    if premium_expires and is_premium and not is_lifetime:
        try:
            if isinstance(premium_expires, str):
                expiry_dt = datetime.fromisoformat(premium_expires.replace('Z', '+00:00'))
            else:
                expiry_dt = premium_expires
            
            now = datetime.now(timezone.utc)
            delta = expiry_dt - now
            days_remaining = max(0, delta.days)
            
            if days_remaining == 0 and delta.total_seconds() > 0:
                hours = int(delta.total_seconds() // 3600)
                if hours > 0:
                    time_remaining_formatted = f"{hours} hours left"
                else:
                    minutes = int(delta.total_seconds() // 60)
                    time_remaining_formatted = f"{minutes} minutes left"
            elif days_remaining > 0:
                time_remaining_formatted = format_remaining_time(days_remaining)
            else:
                is_expired = True
                time_remaining_formatted = "Expired"
        except Exception:
            pass
    
    plan_names = {
        'weekly': 'Weekly Premium',
        'monthly': 'Monthly Premium',
        'quarterly': '3-Month Premium',
        'yearly': 'Annual Premium',
        'lifetime': 'Lifetime Premium'
    }
    
    # Format dates
    expiry_formatted = None
    if premium_expires:
        try:
            if isinstance(premium_expires, str):
                expiry_dt = datetime.fromisoformat(premium_expires.replace('Z', '+00:00'))
            else:
                expiry_dt = premium_expires
            expiry_formatted = expiry_dt.strftime('%b %d, %Y')
        except Exception:
            pass
    
    start_formatted = None
    if premium_started:
        try:
            if isinstance(premium_started, str):
                start_dt = datetime.fromisoformat(premium_started.replace('Z', '+00:00'))
            else:
                start_dt = premium_started
            start_formatted = start_dt.strftime('%b %d, %Y')
        except Exception:
            pass
    
    return {
        "user_id": user.get('user_id'),
        "username": user.get('username'),
        "email": user.get('email'),
        "gender": user.get('gender'),
        "country": user.get('country'),
        "country_code": user.get('country_code'),
        "country_flag": user.get('country_flag'),
        "is_guest": False,
        "age_verified": user.get('age_verified', False),
        "created_at": user.get('created_at'),
        "photo_url": user.get('photo_url'),
        "bio": user.get('bio'),
        "stats": {
            "total_sessions": user.get('total_sessions', 0),
            "total_time_spent": user.get('total_time_spent', 0),
            "games_played": user.get('games_played', 0),
            "games_won": user.get('games_won', 0),
            "formatted_time": format_time_spent(user.get('total_time_spent', 0))
        },
        "premium": {
            "is_premium": is_premium and not is_expired,
            "plan_type": premium_tier if is_premium else None,
            "plan_name": plan_names.get(premium_tier) if is_premium else None,
            "start_date": start_formatted,
            "expiry_date": expiry_formatted,
            "days_remaining": days_remaining,
            "time_remaining_formatted": time_remaining_formatted if is_premium else None,
            "is_lifetime": is_lifetime,
            "is_expired": is_expired,
            "auto_renew": bool(user.get('stripe_subscription_id'))
        }
    }
