from fastapi import APIRouter, Request, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
import logging
from dotenv import load_dotenv

load_dotenv()

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionRequest, 
    CheckoutSessionResponse,
    CheckoutStatusResponse
)
from services.db_service import get_database
from services.auth_service import AuthService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])

# Premium pricing packages (amounts in dollars, float format)
PREMIUM_PACKAGES = {
    "weekly": {"amount": 4.00, "duration": "week", "name": "Weekly Premium"},
    "monthly": {"amount": 12.00, "duration": "month", "name": "Monthly Premium"},
    "quarterly": {"amount": 28.00, "duration": "3 months", "name": "3 Months Premium"}
}

def get_payment_transactions_collection():
    """Get payment transactions collection"""
    db = get_database()
    return db["payment_transactions"]

def get_users_collection():
    """Get users collection"""
    db = get_database()
    return db["users"]

class CreateCheckoutRequest(BaseModel):
    package_id: str  # weekly, monthly, quarterly
    origin_url: str  # Frontend origin for redirect URLs

class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CreateCheckoutRequest,
    http_request: Request,
    authorization: Optional[str] = Header(None)
):
    """Create a Stripe checkout session for premium subscription"""
    try:
        # Validate user
        user_id = None
        if authorization and authorization.startswith('Bearer '):
            token = authorization.replace('Bearer ', '')
            payload = AuthService.decode_token(token)
            if payload:
                user_id = payload.get('user_id')
        
        # Validate package
        if request.package_id not in PREMIUM_PACKAGES:
            raise HTTPException(status_code=400, detail="Invalid package")
        
        package = PREMIUM_PACKAGES[request.package_id]
        amount = package["amount"]
        
        # Get API key
        api_key = os.environ.get("STRIPE_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Payment system not configured")
        
        # Build URLs
        success_url = f"{request.origin_url}/premium/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}/premium"
        
        # Initialize Stripe
        host_url = str(http_request.base_url)
        webhook_url = f"{host_url}api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        
        # Create checkout session
        checkout_request = CheckoutSessionRequest(
            amount=amount,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user_id or "guest",
                "package_id": request.package_id,
                "package_name": package["name"],
                "duration": package["duration"]
            }
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Store transaction record
        transactions = get_payment_transactions_collection()
        await transactions.insert_one({
            "session_id": session.session_id,
            "user_id": user_id,
            "package_id": request.package_id,
            "amount": amount,
            "currency": "usd",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"Created checkout session {session.session_id} for user {user_id}")
        
        return CheckoutResponse(
            checkout_url=session.url,
            session_id=session.session_id
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")

@router.get("/status/{session_id}")
async def get_payment_status(session_id: str, http_request: Request):
    """Get the status of a payment session"""
    try:
        api_key = os.environ.get("STRIPE_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Payment system not configured")
        
        host_url = str(http_request.base_url)
        webhook_url = f"{host_url}api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction in database
        transactions = get_payment_transactions_collection()
        transaction = await transactions.find_one({"session_id": session_id})
        
        if transaction and status.payment_status == "paid" and transaction.get("payment_status") != "paid":
            # Update transaction status
            await transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "paid_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Update user premium status
            user_id = transaction.get("user_id")
            if user_id and user_id != "guest":
                users = get_users_collection()
                await users.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "premium_status": True,
                        "premium_since": datetime.now(timezone.utc).isoformat(),
                        "premium_package": transaction.get("package_id")
                    }}
                )
                logger.info(f"Activated premium for user {user_id}")
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency
        }
    
    except Exception as e:
        logger.error(f"Error checking payment status: {e}")
        raise HTTPException(status_code=500, detail="Failed to check payment status")

@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        api_key = os.environ.get("STRIPE_API_KEY")
        if not api_key:
            return {"status": "error", "message": "Not configured"}
        
        host_url = str(request.base_url)
        webhook_url = f"{host_url}api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        
        # Get raw body
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logger.info(f"Webhook received: {webhook_response.event_type}")
        
        # Handle payment success
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            metadata = webhook_response.metadata
            
            transactions = get_payment_transactions_collection()
            transaction = await transactions.find_one({"session_id": session_id})
            
            if transaction and transaction.get("payment_status") != "paid":
                await transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "payment_status": "paid",
                        "paid_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                user_id = metadata.get("user_id")
                if user_id and user_id != "guest":
                    users = get_users_collection()
                    await users.update_one(
                        {"user_id": user_id},
                        {"$set": {
                            "premium_status": True,
                            "premium_since": datetime.now(timezone.utc).isoformat(),
                            "premium_package": metadata.get("package_id")
                        }}
                    )
                    logger.info(f"Premium activated via webhook for user {user_id}")
        
        return {"status": "received"}
    
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}
