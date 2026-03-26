"""
Subscription Model

Complete subscription model for premium plans with Stripe-ready architecture.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timezone
from enum import Enum


class PlanType(str, Enum):
    """Available subscription plan types"""
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    LIFETIME = "lifetime"


class SubscriptionStatus(str, Enum):
    """Subscription lifecycle states"""
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    PENDING = "pending"
    PAST_DUE = "past_due"
    TRIALING = "trialing"


class PaymentProvider(str, Enum):
    """Supported payment providers"""
    STRIPE = "stripe"
    ADMIN_GRANT = "admin_grant"
    PROMO = "promo"
    MANUAL = "manual"


class PlanDefinition(BaseModel):
    """Plan configuration - defines available subscription plans"""
    plan_id: str
    plan_type: PlanType
    display_name: str
    description: str
    price_cents: int  # Price in cents for precision
    currency: str = "usd"
    billing_period_days: int
    features: list[str] = []
    is_active: bool = True
    stripe_price_id: Optional[str] = None  # For Stripe integration
    sort_order: int = 0
    badge: Optional[str] = None  # e.g., "Most Popular", "Best Value"
    savings_percent: Optional[int] = None  # Discount vs monthly


class Subscription(BaseModel):
    """User subscription record"""
    subscription_id: str
    user_id: str
    plan_type: PlanType
    plan_id: str
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    
    # Dates
    start_date: str  # ISO format
    expiry_date: Optional[str] = None  # None = lifetime
    cancelled_at: Optional[str] = None
    trial_end: Optional[str] = None
    
    # Payment provider info
    provider: PaymentProvider = PaymentProvider.STRIPE
    provider_subscription_id: Optional[str] = None  # Stripe subscription ID
    provider_customer_id: Optional[str] = None  # Stripe customer ID
    
    # Billing
    amount_paid: int = 0  # In cents
    currency: str = "usd"
    auto_renew: bool = True
    
    # Metadata
    created_at: str = None
    updated_at: str = None
    metadata: Optional[dict] = None

    def __init__(self, **data):
        now = datetime.now(timezone.utc).isoformat()
        if 'created_at' not in data or data['created_at'] is None:
            data['created_at'] = now
        if 'updated_at' not in data or data['updated_at'] is None:
            data['updated_at'] = now
        super().__init__(**data)


class SubscriptionCreate(BaseModel):
    """Request model for creating a subscription"""
    plan_id: str
    payment_method_id: Optional[str] = None  # Stripe payment method
    promo_code: Optional[str] = None


class SubscriptionCancel(BaseModel):
    """Request model for cancelling a subscription"""
    reason: Optional[str] = None
    immediate: bool = False  # If True, cancel immediately; else at period end


class SubscriptionResponse(BaseModel):
    """Response model for subscription data"""
    subscription_id: str
    plan_type: str
    plan_name: str
    status: str
    start_date: str
    expiry_date: Optional[str]
    auto_renew: bool
    is_active: bool
    days_remaining: Optional[int]


class PremiumStatusResponse(BaseModel):
    """Response model for user's premium status"""
    is_premium: bool
    plan_type: Optional[str] = None
    plan_name: Optional[str] = None
    expiry_date: Optional[str] = None
    days_remaining: Optional[int] = None
    features: list[str] = []
    subscription_id: Optional[str] = None
    auto_renew: bool = False
    can_upgrade: bool = True


# Pre-defined plans configuration
PREMIUM_PLANS: list[PlanDefinition] = [
    PlanDefinition(
        plan_id="weekly_premium",
        plan_type=PlanType.WEEKLY,
        display_name="Weekly",
        description="Perfect for trying out premium features",
        price_cents=499,  # $4.99
        billing_period_days=7,
        features=[
            "Gender & country filters",
            "Camera filters & effects",
            "Priority matching",
            "No ads"
        ],
        sort_order=1,
        stripe_price_id=None  # Set when Stripe is configured
    ),
    PlanDefinition(
        plan_id="monthly_premium",
        plan_type=PlanType.MONTHLY,
        display_name="Monthly",
        description="Most popular choice for regular users",
        price_cents=999,  # $9.99
        billing_period_days=30,
        features=[
            "Gender & country filters",
            "Camera filters & effects",
            "Priority matching",
            "No ads",
            "Exclusive games access",
            "Profile badges"
        ],
        sort_order=2,
        badge="Most Popular",
        savings_percent=50,
        stripe_price_id=None
    ),
    PlanDefinition(
        plan_id="quarterly_premium",
        plan_type=PlanType.QUARTERLY,
        display_name="3 Months",
        description="Great value for committed users",
        price_cents=1999,  # $19.99
        billing_period_days=90,
        features=[
            "All Monthly features",
            "Priority support",
            "Early access to new features"
        ],
        sort_order=3,
        savings_percent=33,
        stripe_price_id=None
    ),
    PlanDefinition(
        plan_id="yearly_premium",
        plan_type=PlanType.YEARLY,
        display_name="Annual",
        description="Best value - save 60%",
        price_cents=3999,  # $39.99
        billing_period_days=365,
        features=[
            "All Quarterly features",
            "Exclusive annual badge",
            "VIP status in matches"
        ],
        sort_order=4,
        badge="Best Value",
        savings_percent=67,
        stripe_price_id=None
    ),
    PlanDefinition(
        plan_id="lifetime_premium",
        plan_type=PlanType.LIFETIME,
        display_name="Lifetime",
        description="One-time payment, forever premium",
        price_cents=9999,  # $99.99
        billing_period_days=0,  # Never expires
        features=[
            "All features forever",
            "Founder badge",
            "Future features included",
            "Priority everything"
        ],
        sort_order=5,
        badge="Limited Offer",
        stripe_price_id=None
    )
]


def get_plan_by_id(plan_id: str) -> Optional[PlanDefinition]:
    """Get a plan definition by its ID"""
    for plan in PREMIUM_PLANS:
        if plan.plan_id == plan_id and plan.is_active:
            return plan
    return None


def get_active_plans() -> list[PlanDefinition]:
    """Get all active plans sorted by sort_order"""
    return sorted(
        [p for p in PREMIUM_PLANS if p.is_active],
        key=lambda x: x.sort_order
    )
