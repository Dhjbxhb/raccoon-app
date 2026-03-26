"""
Premium Status Service

Handles premium status checks, expiry logic, and premium enforcement.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Tuple
from services.db_service import get_users_collection


class PremiumService:
    """Service for managing user premium status"""
    
    @staticmethod
    async def check_premium_status(user_id: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Check if a user currently has active premium.
        Automatically handles expired premium.
        
        Returns: (is_premium, premium_tier, expires_at)
        """
        collection = get_users_collection()
        user = await collection.find_one({'user_id': user_id}, {'_id': 0})
        
        if not user:
            return False, 'free', None
        
        is_premium = user.get('premium_status', False)
        premium_tier = user.get('premium_tier', 'free')
        expires_at = user.get('premium_expires_at')
        
        if not is_premium:
            return False, 'free', None
        
        # Check if premium has expired
        if expires_at:
            try:
                expiry = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                if datetime.now(timezone.utc) > expiry:
                    # Premium expired - auto-remove
                    await PremiumService.auto_expire_premium(user_id)
                    return False, 'free', None
            except (ValueError, TypeError):
                pass
        
        return True, premium_tier, expires_at
    
    @staticmethod
    async def auto_expire_premium(user_id: str) -> bool:
        """
        Automatically expire premium when time limit reached.
        Called internally when checking premium status.
        """
        collection = get_users_collection()
        
        result = await collection.update_one(
            {'user_id': user_id},
            {'$set': {
                'premium_status': False,
                'premium_tier': 'free',
                'premium_expired_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return result.modified_count > 0
    
    @staticmethod
    async def grant_premium(
        user_id: str,
        duration_days: Optional[int] = None,
        tier: str = 'premium',
        granted_by: Optional[str] = None,
        reason: Optional[str] = None
    ) -> Dict:
        """
        Grant premium status to a user.
        
        Args:
            user_id: The user to grant premium to
            duration_days: If provided, premium expires after this many days. None = lifetime
            tier: Premium tier (premium, gold, etc.)
            granted_by: Admin user ID who granted premium
            reason: Reason for granting (admin gift, purchase, promo, etc.)
        """
        collection = get_users_collection()
        
        now = datetime.now(timezone.utc)
        update_data = {
            'premium_status': True,
            'premium_tier': tier,
            'premium_granted_at': now.isoformat(),
            'premium_granted_by': granted_by,
            'premium_grant_reason': reason
        }
        
        if duration_days:
            expires_at = now + timedelta(days=duration_days)
            update_data['premium_expires_at'] = expires_at.isoformat()
            grant_type = 'temporary'
        else:
            update_data['premium_expires_at'] = None
            grant_type = 'lifetime'
        
        result = await collection.update_one(
            {'user_id': user_id},
            {'$set': update_data}
        )
        
        return {
            'success': result.modified_count > 0,
            'grant_type': grant_type,
            'tier': tier,
            'expires_at': update_data.get('premium_expires_at')
        }
    
    @staticmethod
    async def remove_premium(user_id: str, removed_by: Optional[str] = None, reason: Optional[str] = None) -> bool:
        """
        Remove premium status from a user.
        """
        collection = get_users_collection()
        
        result = await collection.update_one(
            {'user_id': user_id},
            {'$set': {
                'premium_status': False,
                'premium_tier': 'free',
                'premium_expires_at': None,
                'premium_removed_at': datetime.now(timezone.utc).isoformat(),
                'premium_removed_by': removed_by,
                'premium_removal_reason': reason
            }}
        )
        
        return result.modified_count > 0
    
    @staticmethod
    async def extend_premium(user_id: str, additional_days: int, extended_by: Optional[str] = None) -> Dict:
        """
        Extend an existing premium subscription.
        """
        collection = get_users_collection()
        user = await collection.find_one({'user_id': user_id}, {'_id': 0})
        
        if not user:
            return {'success': False, 'error': 'User not found'}
        
        current_expiry = user.get('premium_expires_at')
        now = datetime.now(timezone.utc)
        
        if current_expiry:
            try:
                base_time = datetime.fromisoformat(current_expiry.replace('Z', '+00:00'))
                if base_time < now:
                    base_time = now
            except (ValueError, TypeError):
                base_time = now
        else:
            # Lifetime premium - can't extend, but can convert to timed
            return {'success': False, 'error': 'User has lifetime premium'}
        
        new_expiry = base_time + timedelta(days=additional_days)
        
        result = await collection.update_one(
            {'user_id': user_id},
            {'$set': {
                'premium_status': True,
                'premium_expires_at': new_expiry.isoformat(),
                'premium_extended_at': now.isoformat(),
                'premium_extended_by': extended_by
            }}
        )
        
        return {
            'success': result.modified_count > 0,
            'new_expires_at': new_expiry.isoformat()
        }
    
    @staticmethod
    async def process_expired_premiums() -> int:
        """
        Process all expired premium subscriptions.
        Can be called periodically via a scheduled task.
        
        Returns: Number of users whose premium expired
        """
        collection = get_users_collection()
        now = datetime.now(timezone.utc).isoformat()
        
        result = await collection.update_many(
            {
                'premium_status': True,
                'premium_expires_at': {'$ne': None, '$lte': now}
            },
            {'$set': {
                'premium_status': False,
                'premium_tier': 'free',
                'premium_expired_at': now
            }}
        )
        
        return result.modified_count
    
    @staticmethod
    async def get_expiring_soon(days: int = 7) -> list:
        """
        Get users whose premium is expiring within the specified days.
        Useful for sending renewal reminders.
        """
        collection = get_users_collection()
        now = datetime.now(timezone.utc)
        threshold = (now + timedelta(days=days)).isoformat()
        
        cursor = collection.find(
            {
                'premium_status': True,
                'premium_expires_at': {
                    '$ne': None,
                    '$gte': now.isoformat(),
                    '$lte': threshold
                }
            },
            {'_id': 0, 'password_hash': 0}
        )
        
        return await cursor.to_list(length=100)


# Singleton instance
premium_service = PremiumService()
