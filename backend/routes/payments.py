"""
Stripe Payment Routes

Handles all payment-related endpoints including:
- Plan listing
- Subscription creation
- Subscription management
- Stripe webhook processing
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Request, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
import json
import hmac
import hashlib

from services.auth_service import AuthService
from services.subscription_service import subscription_service
from models.subscription import (
    SubscriptionCreate, SubscriptionCancel, PaymentProvider,
    get_active_plans, get_plan_by_id, PremiumStatusResponse
)

router = APIRouter(prefix="/payments", tags=["payments"])

# Stripe configuration - will be set when Stripe is configured
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')
STRIPE_ENABLED = bool(STRIPE_SECRET_KEY)


# ============================================
# AUTH MIDDLEWARE
# ============================================

async def get_current_user(authorization: Optional[str] = Header(None)):
    """Verify user authentication"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing token")
    
    token = authorization.replace('Bearer ', '')
    payload = AuthService.decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return payload


# ============================================
# PLAN ENDPOINTS
# ============================================

@router.get("/plans")
async def get_plans():
    """
    Get all available subscription plans.
    No authentication required.
    """
    plans = get_active_plans()
    
    return {
        'plans': [
            {
                'plan_id': p.plan_id,
                'plan_type': p.plan_type.value,
                'display_name': p.display_name,
                'description': p.description,
                'price': p.price_cents / 100,  # Convert to dollars for display
                'price_cents': p.price_cents,
                'currency': p.currency,
                'billing_period_days': p.billing_period_days,
                'features': p.features,
                'badge': p.badge,
                'savings_percent': p.savings_percent,
                'stripe_enabled': STRIPE_ENABLED and p.stripe_price_id is not None
            }
            for p in plans
        ],
        'stripe_enabled': STRIPE_ENABLED
    }


@router.get("/plan/{plan_id}")
async def get_plan(plan_id: str):
    """Get details for a specific plan"""
    plan = get_plan_by_id(plan_id)
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {
        'plan_id': plan.plan_id,
        'plan_type': plan.plan_type.value,
        'display_name': plan.display_name,
        'description': plan.description,
        'price': plan.price_cents / 100,
        'price_cents': plan.price_cents,
        'currency': plan.currency,
        'billing_period_days': plan.billing_period_days,
        'features': plan.features,
        'badge': plan.badge,
        'savings_percent': plan.savings_percent
    }


# ============================================
# PREMIUM STATUS ENDPOINTS
# ============================================

@router.get("/premium-status")
async def get_premium_status(user = Depends(get_current_user)) -> PremiumStatusResponse:
    """
    Get current user's premium status.
    This is the SOURCE OF TRUTH for premium access.
    """
    status = await subscription_service.get_premium_status(user['user_id'])
    return status


@router.get("/subscription")
async def get_current_subscription(user = Depends(get_current_user)):
    """Get user's current active subscription details"""
    subscription = await subscription_service.get_user_active_subscription(user['user_id'])
    
    if not subscription:
        return {
            'has_subscription': False,
            'subscription': None
        }
    
    plan = get_plan_by_id(subscription['plan_id'])
    
    return {
        'has_subscription': True,
        'subscription': {
            'subscription_id': subscription['subscription_id'],
            'plan_id': subscription['plan_id'],
            'plan_name': plan.display_name if plan else subscription['plan_type'],
            'plan_type': subscription['plan_type'],
            'status': subscription['status'],
            'start_date': subscription['start_date'],
            'expiry_date': subscription.get('expiry_date'),
            'auto_renew': subscription.get('auto_renew', False),
            'cancelled_at': subscription.get('cancelled_at')
        }
    }


@router.get("/subscription-history")
async def get_subscription_history(user = Depends(get_current_user)):
    """Get user's subscription history"""
    history = await subscription_service.get_subscription_history(user['user_id'])
    
    return {
        'subscriptions': [
            {
                'subscription_id': s['subscription_id'],
                'plan_type': s['plan_type'],
                'status': s['status'],
                'start_date': s['start_date'],
                'expiry_date': s.get('expiry_date'),
                'amount_paid': s.get('amount_paid', 0) / 100,  # Convert to dollars
                'created_at': s['created_at']
            }
            for s in history
        ]
    }


# ============================================
# SUBSCRIPTION MANAGEMENT ENDPOINTS
# ============================================

class CreateSubscriptionRequest(BaseModel):
    plan_id: str
    payment_method_id: Optional[str] = None  # For Stripe
    promo_code: Optional[str] = None


class CreateCheckoutRequest(BaseModel):
    plan_id: str
    success_url: str
    cancel_url: str


@router.post("/create-subscription")
async def create_subscription(
    data: CreateSubscriptionRequest, 
    user = Depends(get_current_user)
):
    """
    Create a new subscription.
    
    If Stripe is enabled and payment_method_id is provided, processes payment.
    Otherwise, creates a pending subscription for manual activation.
    """
    plan = get_plan_by_id(data.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan selected")
    
    # Check for existing subscription
    existing = await subscription_service.get_user_active_subscription(user['user_id'])
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="You already have an active subscription. Please cancel it first."
        )
    
    # If Stripe is enabled and configured
    if STRIPE_ENABLED and data.payment_method_id:
        # Stripe payment processing would go here
        # For now, return that Stripe checkout is needed
        return {
            'success': False,
            'requires_action': True,
            'action_type': 'stripe_checkout',
            'message': 'Please complete payment through Stripe checkout'
        }
    
    # For development/testing - create subscription directly
    # In production, this would only work for promo codes or admin
    if not STRIPE_ENABLED:
        success, message, subscription = await subscription_service.create_subscription(
            user_id=user['user_id'],
            plan_id=data.plan_id,
            provider=PaymentProvider.MANUAL,
            amount_paid=plan.price_cents
        )
        
        if not success:
            raise HTTPException(status_code=400, detail=message)
        
        return {
            'success': True,
            'message': message,
            'subscription': subscription,
            'note': 'Stripe integration pending - subscription created for testing'
        }
    
    raise HTTPException(
        status_code=400, 
        detail="Payment method required"
    )


@router.post("/create-checkout-session")
async def create_checkout_session(
    data: CreateCheckoutRequest,
    user = Depends(get_current_user)
):
    """
    Create a Stripe Checkout Session for payment.
    
    This is the preferred flow for Stripe integration:
    1. Frontend calls this endpoint with plan_id
    2. Backend creates Stripe Checkout Session
    3. Frontend redirects to Stripe-hosted checkout
    4. Stripe sends webhook on success/failure
    """
    plan = get_plan_by_id(data.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan selected")
    
    if not STRIPE_ENABLED:
        # Return mock checkout URL for testing
        return {
            'success': True,
            'checkout_url': None,
            'session_id': None,
            'stripe_enabled': False,
            'message': 'Stripe not configured. Use /create-subscription for testing.',
            'plan': {
                'plan_id': plan.plan_id,
                'display_name': plan.display_name,
                'price': plan.price_cents / 100
            }
        }
    
    # When Stripe is configured, create actual checkout session
    # import stripe
    # stripe.api_key = STRIPE_SECRET_KEY
    # 
    # session = stripe.checkout.Session.create(
    #     customer_email=user.get('email'),
    #     payment_method_types=['card'],
    #     line_items=[{
    #         'price': plan.stripe_price_id,
    #         'quantity': 1,
    #     }],
    #     mode='subscription' if plan.plan_type != 'lifetime' else 'payment',
    #     success_url=data.success_url,
    #     cancel_url=data.cancel_url,
    #     metadata={
    #         'user_id': user['user_id'],
    #         'plan_id': plan.plan_id
    #     }
    # )
    # 
    # return {
    #     'success': True,
    #     'checkout_url': session.url,
    #     'session_id': session.id
    # }
    
    raise HTTPException(
        status_code=503,
        detail="Stripe checkout not yet implemented"
    )


@router.post("/cancel-subscription")
async def cancel_subscription(
    data: SubscriptionCancel,
    user = Depends(get_current_user)
):
    """
    Cancel user's subscription.
    
    By default, cancels at period end.
    Set immediate=True to cancel immediately.
    """
    subscription = await subscription_service.get_user_active_subscription(user['user_id'])
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")
    
    success, message = await subscription_service.cancel_subscription(
        user_id=user['user_id'],
        subscription_id=subscription['subscription_id'],
        reason=data.reason,
        immediate=data.immediate
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    # If Stripe is enabled, also cancel on Stripe
    if STRIPE_ENABLED and subscription.get('provider_subscription_id'):
        # import stripe
        # stripe.api_key = STRIPE_SECRET_KEY
        # stripe.Subscription.modify(
        #     subscription['provider_subscription_id'],
        #     cancel_at_period_end=not data.immediate
        # )
        pass
    
    return {
        'success': True,
        'message': message,
        'immediate': data.immediate
    }


@router.post("/reactivate-subscription")
async def reactivate_subscription(user = Depends(get_current_user)):
    """
    Reactivate a cancelled subscription (if still within billing period).
    """
    subscription = await subscription_service.get_user_active_subscription(user['user_id'])
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription to reactivate")
    
    if subscription.get('cancelled_at') is None:
        raise HTTPException(status_code=400, detail="Subscription is not cancelled")
    
    from services.db_service import get_database
    db = get_database()
    
    await db['subscriptions'].update_one(
        {'subscription_id': subscription['subscription_id']},
        {'$set': {
            'cancelled_at': None,
            'auto_renew': True,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        'success': True,
        'message': 'Subscription reactivated'
    }


# ============================================
# STRIPE WEBHOOK ENDPOINT
# ============================================

@router.post("/webhook/stripe")
async def stripe_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Handle Stripe webhook events.
    
    Important events handled:
    - checkout.session.completed: Payment successful
    - invoice.paid: Subscription renewed
    - invoice.payment_failed: Payment failed
    - customer.subscription.deleted: Subscription cancelled
    - customer.subscription.updated: Subscription modified
    """
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    if not STRIPE_ENABLED:
        return {'received': True, 'note': 'Stripe not configured'}
    
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    
    # Verify webhook signature
    try:
        # import stripe
        # event = stripe.Webhook.construct_event(
        #     payload, sig_header, STRIPE_WEBHOOK_SECRET
        # )
        
        # For now, parse payload directly (replace with Stripe verification)
        event = json.loads(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {str(e)}")
    
    event_type = event.get('type')
    data = event.get('data', {}).get('object', {})
    
    # Process webhook in background
    background_tasks.add_task(process_stripe_event, event_type, data)
    
    return {'received': True}


async def process_stripe_event(event_type: str, data: dict):
    """
    Process Stripe webhook events asynchronously.
    
    This function handles the business logic for each event type.
    """
    try:
        if event_type == 'checkout.session.completed':
            # New subscription or one-time payment completed
            user_id = data.get('metadata', {}).get('user_id')
            plan_id = data.get('metadata', {}).get('plan_id')
            subscription_id = data.get('subscription')
            customer_id = data.get('customer')
            
            if user_id and plan_id:
                await subscription_service.create_subscription(
                    user_id=user_id,
                    plan_id=plan_id,
                    provider=PaymentProvider.STRIPE,
                    provider_subscription_id=subscription_id,
                    provider_customer_id=customer_id,
                    amount_paid=data.get('amount_total', 0)
                )
        
        elif event_type == 'invoice.paid':
            # Subscription renewal payment successful
            subscription_id = data.get('subscription')
            if subscription_id:
                # Find our subscription by Stripe subscription ID
                from services.db_service import get_database
                db = get_database()
                subscription = await db['subscriptions'].find_one(
                    {'provider_subscription_id': subscription_id},
                    {'_id': 0}
                )
                if subscription:
                    await subscription_service.renew_subscription(
                        subscription['subscription_id'],
                        amount_paid=data.get('amount_paid', 0)
                    )
        
        elif event_type == 'invoice.payment_failed':
            # Payment failed
            subscription_id = data.get('subscription')
            if subscription_id:
                from services.db_service import get_database
                db = get_database()
                subscription = await db['subscriptions'].find_one(
                    {'provider_subscription_id': subscription_id},
                    {'_id': 0}
                )
                if subscription:
                    await subscription_service.handle_payment_failed(
                        subscription['subscription_id']
                    )
        
        elif event_type == 'customer.subscription.deleted':
            # Subscription cancelled on Stripe
            subscription_id = data.get('id')
            if subscription_id:
                from services.db_service import get_database
                db = get_database()
                subscription = await db['subscriptions'].find_one(
                    {'provider_subscription_id': subscription_id},
                    {'_id': 0}
                )
                if subscription:
                    await subscription_service.cancel_subscription(
                        user_id=subscription['user_id'],
                        subscription_id=subscription['subscription_id'],
                        reason='Cancelled via Stripe',
                        immediate=True
                    )
        
        elif event_type == 'customer.subscription.updated':
            # Subscription updated (e.g., plan change, renewal date change)
            subscription_id = data.get('id')
            status = data.get('status')
            
            if subscription_id:
                from services.db_service import get_database
                db = get_database()
                subscription = await db['subscriptions'].find_one(
                    {'provider_subscription_id': subscription_id},
                    {'_id': 0}
                )
                if subscription:
                    # Map Stripe status to our status
                    status_map = {
                        'active': 'active',
                        'past_due': 'past_due',
                        'canceled': 'cancelled',
                        'unpaid': 'past_due',
                        'trialing': 'trialing'
                    }
                    new_status = status_map.get(status, 'active')
                    
                    await db['subscriptions'].update_one(
                        {'subscription_id': subscription['subscription_id']},
                        {'$set': {
                            'status': new_status,
                            'updated_at': datetime.now(timezone.utc).isoformat()
                        }}
                    )
    
    except Exception as e:
        # Log error but don't raise - webhook should always return 200
        print(f"Error processing Stripe event {event_type}: {e}")


# ============================================
# ADMIN ENDPOINTS
# ============================================

async def get_admin_user(authorization: Optional[str] = Header(None)):
    """Verify admin access"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing token")
    
    token = authorization.replace('Bearer ', '')
    payload = AuthService.decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if not payload.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return payload


@router.post("/admin/grant-premium")
async def admin_grant_premium(
    user_id: str,
    plan_id: str,
    admin = Depends(get_admin_user)
):
    """Admin endpoint to grant premium to a user"""
    plan = get_plan_by_id(plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    success, message, subscription = await subscription_service.create_subscription(
        user_id=user_id,
        plan_id=plan_id,
        provider=PaymentProvider.ADMIN_GRANT,
        amount_paid=0
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {
        'success': True,
        'message': message,
        'subscription_id': subscription['subscription_id'] if subscription else None
    }


@router.post("/admin/process-expirations")
async def admin_process_expirations(admin = Depends(get_admin_user)):
    """Manually trigger expiration processing"""
    count = await subscription_service.process_expired_subscriptions()
    return {
        'success': True,
        'expired_count': count
    }
