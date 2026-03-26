"""
Subscription Service

Handles all subscription-related business logic including creation,
cancellation, status checks, and Stripe integration preparation.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Tuple
from services.db_service import get_database
from models.subscription import (
    Subscription, SubscriptionStatus, PaymentProvider, PlanType,
    PlanDefinition, get_plan_by_id, get_active_plans,
    PremiumStatusResponse, SubscriptionResponse
)


class SubscriptionService:
    """Service for managing user subscriptions"""
    
    @staticmethod
    def get_collection():
        """Get the subscriptions collection"""
        db = get_database()
        return db['subscriptions']
    
    @staticmethod
    def get_users_collection():
        """Get the users collection"""
        db = get_database()
        return db['users']
    
    @staticmethod
    async def get_user_active_subscription(user_id: str) -> Optional[Dict]:
        """
        Get user's current active subscription.
        Checks for expiry and updates status if needed.
        """
        collection = SubscriptionService.get_collection()
        
        # Find active or trialing subscription
        subscription = await collection.find_one(
            {
                'user_id': user_id,
                'status': {'$in': ['active', 'trialing']}
            },
            {'_id': 0}
        )
        
        if not subscription:
            return None
        
        # Check if subscription has expired
        expiry_date = subscription.get('expiry_date')
        if expiry_date:
            try:
                expiry = datetime.fromisoformat(expiry_date.replace('Z', '+00:00'))
                if datetime.now(timezone.utc) > expiry:
                    # Mark as expired
                    await SubscriptionService.expire_subscription(
                        subscription['subscription_id']
                    )
                    return None
            except (ValueError, TypeError):
                pass
        
        return subscription
    
    @staticmethod
    async def get_premium_status(user_id: str) -> PremiumStatusResponse:
        """
        Get comprehensive premium status for a user.
        This is the SOURCE OF TRUTH for premium access.
        """
        subscription = await SubscriptionService.get_user_active_subscription(user_id)
        
        if not subscription:
            # Check if user has admin-granted premium
            users = SubscriptionService.get_users_collection()
            user = await users.find_one({'user_id': user_id}, {'_id': 0})
            
            if user and user.get('premium_status'):
                # Admin-granted premium
                expiry = user.get('premium_expires_at')
                days_remaining = None
                
                if expiry:
                    try:
                        expiry_dt = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
                        if datetime.now(timezone.utc) > expiry_dt:
                            # Admin premium expired
                            await users.update_one(
                                {'user_id': user_id},
                                {'$set': {'premium_status': False, 'premium_tier': 'free'}}
                            )
                            return PremiumStatusResponse(is_premium=False)
                        
                        days_remaining = (expiry_dt - datetime.now(timezone.utc)).days
                    except (ValueError, TypeError):
                        pass
                
                return PremiumStatusResponse(
                    is_premium=True,
                    plan_type='admin_grant',
                    plan_name='Admin Granted Premium',
                    expiry_date=expiry,
                    days_remaining=days_remaining,
                    features=[
                        "Gender & country filters",
                        "Camera filters & effects",
                        "Priority matching",
                        "No ads",
                        "Exclusive games access"
                    ],
                    auto_renew=False,
                    can_upgrade=True
                )
            
            return PremiumStatusResponse(is_premium=False)
        
        # Has active subscription
        plan = get_plan_by_id(subscription['plan_id'])
        days_remaining = None
        expiry = subscription.get('expiry_date')
        
        if expiry:
            try:
                expiry_dt = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
                days_remaining = max(0, (expiry_dt - datetime.now(timezone.utc)).days)
            except (ValueError, TypeError):
                pass
        
        return PremiumStatusResponse(
            is_premium=True,
            plan_type=subscription['plan_type'],
            plan_name=plan.display_name if plan else subscription['plan_type'],
            expiry_date=expiry,
            days_remaining=days_remaining,
            features=plan.features if plan else [],
            subscription_id=subscription['subscription_id'],
            auto_renew=subscription.get('auto_renew', False),
            can_upgrade=subscription['plan_type'] != PlanType.LIFETIME
        )
    
    @staticmethod
    async def create_subscription(
        user_id: str,
        plan_id: str,
        provider: PaymentProvider = PaymentProvider.STRIPE,
        provider_subscription_id: Optional[str] = None,
        provider_customer_id: Optional[str] = None,
        amount_paid: int = 0
    ) -> Tuple[bool, str, Optional[Dict]]:
        """
        Create a new subscription for a user.
        
        Returns: (success, message, subscription_data)
        """
        # Validate plan
        plan = get_plan_by_id(plan_id)
        if not plan:
            return False, "Invalid plan selected", None
        
        # Check for existing active subscription
        existing = await SubscriptionService.get_user_active_subscription(user_id)
        if existing:
            return False, "User already has an active subscription", None
        
        collection = SubscriptionService.get_collection()
        users = SubscriptionService.get_users_collection()
        
        now = datetime.now(timezone.utc)
        subscription_id = str(uuid.uuid4())
        
        # Calculate expiry date
        if plan.plan_type == PlanType.LIFETIME:
            expiry_date = None  # Never expires
        else:
            expiry_date = (now + timedelta(days=plan.billing_period_days)).isoformat()
        
        subscription_data = {
            'subscription_id': subscription_id,
            'user_id': user_id,
            'plan_type': plan.plan_type.value,
            'plan_id': plan_id,
            'status': SubscriptionStatus.ACTIVE.value,
            'start_date': now.isoformat(),
            'expiry_date': expiry_date,
            'cancelled_at': None,
            'provider': provider.value,
            'provider_subscription_id': provider_subscription_id,
            'provider_customer_id': provider_customer_id,
            'amount_paid': amount_paid or plan.price_cents,
            'currency': plan.currency,
            'auto_renew': plan.plan_type != PlanType.LIFETIME,
            'created_at': now.isoformat(),
            'updated_at': now.isoformat()
        }
        
        await collection.insert_one(subscription_data)
        
        # Update user's premium status
        await users.update_one(
            {'user_id': user_id},
            {'$set': {
                'premium_status': True,
                'premium_tier': 'premium',
                'premium_expires_at': expiry_date,
                'subscription_id': subscription_id
            }}
        )
        
        # Remove _id for response
        subscription_data.pop('_id', None)
        
        return True, "Subscription created successfully", subscription_data
    
    @staticmethod
    async def cancel_subscription(
        user_id: str,
        subscription_id: str,
        reason: Optional[str] = None,
        immediate: bool = False
    ) -> Tuple[bool, str]:
        """
        Cancel a subscription.
        
        If immediate=True, cancel now. Otherwise, cancel at period end.
        """
        collection = SubscriptionService.get_collection()
        users = SubscriptionService.get_users_collection()
        
        subscription = await collection.find_one(
            {'subscription_id': subscription_id, 'user_id': user_id},
            {'_id': 0}
        )
        
        if not subscription:
            return False, "Subscription not found"
        
        if subscription['status'] not in ['active', 'trialing']:
            return False, "Subscription is not active"
        
        now = datetime.now(timezone.utc).isoformat()
        
        if immediate:
            # Cancel immediately
            await collection.update_one(
                {'subscription_id': subscription_id},
                {'$set': {
                    'status': SubscriptionStatus.CANCELLED.value,
                    'cancelled_at': now,
                    'auto_renew': False,
                    'updated_at': now,
                    'cancellation_reason': reason
                }}
            )
            
            # Remove premium from user
            await users.update_one(
                {'user_id': user_id},
                {'$set': {
                    'premium_status': False,
                    'premium_tier': 'free',
                    'premium_expires_at': None,
                    'subscription_id': None
                }}
            )
            
            return True, "Subscription cancelled immediately"
        else:
            # Cancel at period end
            await collection.update_one(
                {'subscription_id': subscription_id},
                {'$set': {
                    'auto_renew': False,
                    'cancelled_at': now,
                    'updated_at': now,
                    'cancellation_reason': reason
                }}
            )
            
            return True, "Subscription will be cancelled at the end of the billing period"
    
    @staticmethod
    async def expire_subscription(subscription_id: str) -> bool:
        """Mark a subscription as expired and update user status"""
        collection = SubscriptionService.get_collection()
        users = SubscriptionService.get_users_collection()
        
        subscription = await collection.find_one(
            {'subscription_id': subscription_id},
            {'_id': 0}
        )
        
        if not subscription:
            return False
        
        now = datetime.now(timezone.utc).isoformat()
        
        await collection.update_one(
            {'subscription_id': subscription_id},
            {'$set': {
                'status': SubscriptionStatus.EXPIRED.value,
                'updated_at': now
            }}
        )
        
        # Update user premium status
        await users.update_one(
            {'user_id': subscription['user_id']},
            {'$set': {
                'premium_status': False,
                'premium_tier': 'free',
                'premium_expires_at': None,
                'subscription_id': None
            }}
        )
        
        return True
    
    @staticmethod
    async def renew_subscription(subscription_id: str, amount_paid: int = 0) -> Tuple[bool, str]:
        """
        Renew an existing subscription.
        Called by Stripe webhook when payment succeeds.
        """
        collection = SubscriptionService.get_collection()
        users = SubscriptionService.get_users_collection()
        
        subscription = await collection.find_one(
            {'subscription_id': subscription_id},
            {'_id': 0}
        )
        
        if not subscription:
            return False, "Subscription not found"
        
        plan = get_plan_by_id(subscription['plan_id'])
        if not plan:
            return False, "Plan not found"
        
        now = datetime.now(timezone.utc)
        new_expiry = (now + timedelta(days=plan.billing_period_days)).isoformat()
        
        await collection.update_one(
            {'subscription_id': subscription_id},
            {'$set': {
                'status': SubscriptionStatus.ACTIVE.value,
                'expiry_date': new_expiry,
                'updated_at': now.isoformat(),
                'amount_paid': amount_paid or plan.price_cents
            }}
        )
        
        # Update user
        await users.update_one(
            {'user_id': subscription['user_id']},
            {'$set': {
                'premium_status': True,
                'premium_expires_at': new_expiry
            }}
        )
        
        return True, "Subscription renewed"
    
    @staticmethod
    async def handle_payment_failed(subscription_id: str) -> bool:
        """Handle failed payment - mark subscription as past due"""
        collection = SubscriptionService.get_collection()
        
        await collection.update_one(
            {'subscription_id': subscription_id},
            {'$set': {
                'status': SubscriptionStatus.PAST_DUE.value,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return True
    
    @staticmethod
    async def get_subscription_history(user_id: str, limit: int = 10) -> list:
        """Get user's subscription history"""
        collection = SubscriptionService.get_collection()
        
        cursor = collection.find(
            {'user_id': user_id},
            {'_id': 0}
        ).sort('created_at', -1).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    @staticmethod
    async def process_expired_subscriptions() -> int:
        """
        Process all expired subscriptions.
        Should be called periodically via a scheduled task.
        """
        collection = SubscriptionService.get_collection()
        now = datetime.now(timezone.utc).isoformat()
        
        # Find expired subscriptions
        cursor = collection.find({
            'status': {'$in': ['active', 'trialing']},
            'expiry_date': {'$ne': None, '$lte': now}
        })
        
        expired_count = 0
        async for subscription in cursor:
            await SubscriptionService.expire_subscription(subscription['subscription_id'])
            expired_count += 1
        
        return expired_count


# Singleton instance
subscription_service = SubscriptionService()
