"""
Ban Enforcement Service

Handles ban status checks, temp ban expiry, and ban enforcement across the application.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Tuple
from services.db_service import get_users_collection, get_guests_collection


class BanService:
    """Service for managing and enforcing user bans"""
    
    @staticmethod
    async def check_ban_status(user_id: str, is_guest: bool = False) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Check if a user is currently banned.
        Automatically clears expired temp bans.
        
        Returns: (is_banned, ban_reason, ban_expires_at)
        """
        if is_guest:
            collection = get_guests_collection()
            user = await collection.find_one({'guest_id': user_id}, {'_id': 0})
        else:
            collection = get_users_collection()
            user = await collection.find_one({'user_id': user_id}, {'_id': 0})
        
        if not user:
            return False, None, None
        
        is_banned = user.get('is_banned', False)
        ban_reason = user.get('ban_reason')
        ban_expires_at = user.get('ban_expires_at')
        
        if not is_banned:
            return False, None, None
        
        # Check if temp ban has expired
        if ban_expires_at:
            try:
                expiry = datetime.fromisoformat(ban_expires_at.replace('Z', '+00:00'))
                if datetime.now(timezone.utc) > expiry:
                    # Temp ban expired - auto-unban
                    await BanService.auto_unban(user_id, is_guest)
                    return False, None, None
            except (ValueError, TypeError):
                pass
        
        return True, ban_reason, ban_expires_at
    
    @staticmethod
    async def auto_unban(user_id: str, is_guest: bool = False) -> bool:
        """
        Automatically unban a user when their temp ban expires.
        Called internally when checking ban status.
        """
        if is_guest:
            collection = get_guests_collection()
            id_field = 'guest_id'
        else:
            collection = get_users_collection()
            id_field = 'user_id'
        
        result = await collection.update_one(
            {id_field: user_id},
            {'$set': {
                'is_banned': False,
                'ban_reason': None,
                'ban_expires_at': None,
                'auto_unbanned_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return result.modified_count > 0
    
    @staticmethod
    async def ban_user(
        user_id: str,
        reason: Optional[str] = None,
        duration_hours: Optional[int] = None,
        banned_by: Optional[str] = None,
        is_guest: bool = False
    ) -> Dict:
        """
        Ban a user (permanent or temporary)
        
        Args:
            user_id: The user to ban
            reason: Ban reason
            duration_hours: If provided, creates a temp ban
            banned_by: Admin user ID who issued the ban
            is_guest: Whether this is a guest user
        """
        if is_guest:
            collection = get_guests_collection()
            id_field = 'guest_id'
        else:
            collection = get_users_collection()
            id_field = 'user_id'
        
        update_data = {
            'is_banned': True,
            'ban_reason': reason,
            'banned_at': datetime.now(timezone.utc).isoformat(),
            'banned_by': banned_by
        }
        
        if duration_hours:
            from datetime import timedelta
            expires_at = datetime.now(timezone.utc) + timedelta(hours=duration_hours)
            update_data['ban_expires_at'] = expires_at.isoformat()
            ban_type = 'temporary'
        else:
            update_data['ban_expires_at'] = None
            ban_type = 'permanent'
        
        result = await collection.update_one(
            {id_field: user_id},
            {'$set': update_data}
        )
        
        return {
            'success': result.modified_count > 0,
            'ban_type': ban_type,
            'expires_at': update_data.get('ban_expires_at')
        }
    
    @staticmethod
    async def unban_user(user_id: str, unbanned_by: Optional[str] = None, is_guest: bool = False) -> bool:
        """
        Unban a user (clear all ban-related fields)
        """
        if is_guest:
            collection = get_guests_collection()
            id_field = 'guest_id'
        else:
            collection = get_users_collection()
            id_field = 'user_id'
        
        result = await collection.update_one(
            {id_field: user_id},
            {'$set': {
                'is_banned': False,
                'ban_reason': None,
                'ban_expires_at': None,
                'unbanned_at': datetime.now(timezone.utc).isoformat(),
                'unbanned_by': unbanned_by
            }}
        )
        
        return result.modified_count > 0
    
    @staticmethod
    async def process_expired_bans() -> int:
        """
        Process all expired temp bans across the system.
        Can be called periodically via a scheduled task.
        
        Returns: Number of users unbanned
        """
        now = datetime.now(timezone.utc).isoformat()
        unbanned_count = 0
        
        # Process users
        users = get_users_collection()
        result = await users.update_many(
            {
                'is_banned': True,
                'ban_expires_at': {'$ne': None, '$lte': now}
            },
            {'$set': {
                'is_banned': False,
                'ban_reason': None,
                'ban_expires_at': None,
                'auto_unbanned_at': now
            }}
        )
        unbanned_count += result.modified_count
        
        # Process guests
        guests = get_guests_collection()
        result = await guests.update_many(
            {
                'is_banned': True,
                'ban_expires_at': {'$ne': None, '$lte': now}
            },
            {'$set': {
                'is_banned': False,
                'ban_reason': None,
                'ban_expires_at': None,
                'auto_unbanned_at': now
            }}
        )
        unbanned_count += result.modified_count
        
        return unbanned_count


# Singleton instance
ban_service = BanService()
