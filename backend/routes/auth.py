from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, EmailStr
from services.auth_service import AuthService
from services.db_service import get_users_collection, get_guests_collection
from services.country_service import CountryService
from models.user import User, UserResponse
from models.guest import Guest, GuestResponse
from utils.validators import validate_age, validate_password, validate_username
from middleware.auth_middleware import verify_token
from services.premium_service import premium_service
from services.firebase_service import verify_firebase_id_token
from services.email_service import send_password_reset_email, send_verification_email
import secrets
import hashlib


def _generate_code_pair() -> tuple[str, str]:
    """Returns (raw_code, code_hash). A 6-digit numeric code; only the hash is ever stored."""
    raw_code = ''.join(secrets.choice('0123456789') for _ in range(6))
    code_hash = hashlib.sha256(raw_code.encode()).hexdigest()
    return raw_code, code_hash


PASSWORD_RESET_CODE_TTL_MINUTES = 15
EMAIL_VERIFICATION_CODE_TTL_MINUTES = 15
MAX_CODE_ATTEMPTS = 5
import uuid
from datetime import datetime, timedelta, timezone
import random
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])

class SignupRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    gender: str
    date_of_birth: str
    browser_locale: str | None = None
    terms_accepted: bool = False
    privacy_accepted: bool = False

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GuestRequest(BaseModel):
    gender: str
    browser_locale: str | None = None

class AuthResponse(BaseModel):
    token: str
    user: UserResponse | GuestResponse

@router.post("/signup", response_model=AuthResponse)
async def signup(data: SignupRequest, request: Request):
    """Register new user"""
    users = get_users_collection()
    
    # Validate terms acceptance
    if not data.terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must agree to the Terms of Service to register"
        )
    
    # Validate age
    if not validate_age(data.date_of_birth):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be 18 or older to register"
        )
    
    # Validate password
    is_valid, message = validate_password(data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Validate username
    is_valid, message = validate_username(data.username)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Check if email exists
    existing_user = await users.find_one({"email": data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username exists
    existing_username = await users.find_one({"username": data.username}, {"_id": 0})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Validate gender
    if data.gender.lower() not in ['male', 'female']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gender must be Male or Female"
        )
    
    # Auto-detect country from IP
    client_ip = request.client.host
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        client_ip = forwarded_for.split(',')[0].strip()
    
    country_info = CountryService.get_country_from_ip(client_ip, data.browser_locale)
    
    # Create user
    user_id = str(uuid.uuid4())
    password_hash = AuthService.hash_password(data.password)
    now = datetime.now(timezone.utc)
    
    user_dict = {
        "user_id": user_id,
        "email": data.email,
        "username": data.username,
        "password_hash": password_hash,
        "login_method": "email",
        "gender": data.gender.lower(),
        "date_of_birth": data.date_of_birth,
        "country": country_info['country'],
        "country_code": country_info['countryCode'],
        "country_flag": country_info['flag'],
        "email_verified": False,
        "phone_verified": False,
        "age_verified": False,
        "account_status": "active",
        "is_banned": False,
        "currentSessionId": None,
        "premium_status": False,
        "premium_tier": "free",
        "is_admin": False,
        "is_moderator": False,
        "admin_level": 0,
        "total_sessions": 0,
        "total_time_spent": 0,
        "total_matches": 0,
        "total_messages_sent": 0,
        "total_reports_received": 0,
        "total_reports_made": 0,
        "total_blocks_received": 0,
        "games_played": 0,
        "games_won": 0,
        "preferred_gender": "any",
        "preferred_country": "any",
        "notifications_enabled": True,
        "sound_enabled": True,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "last_active": now.isoformat(),
        "last_login": now.isoformat(),
        "failed_login_attempts": 0,
        "terms_accepted": data.terms_accepted,
        "terms_accepted_at": now.isoformat() if data.terms_accepted else None,
        "terms_version": "2025-12",
        "privacy_accepted": data.privacy_accepted or data.terms_accepted,
        "privacy_accepted_at": now.isoformat() if (data.privacy_accepted or data.terms_accepted) else None,
        "privacy_version": "2025-12",
    }
    
    await users.insert_one(user_dict)

    # Send email verification code (best-effort - must never block signup)
    try:
        raw_code, code_hash = _generate_code_pair()
        expires_at = int(
            (datetime.now(timezone.utc) + timedelta(minutes=EMAIL_VERIFICATION_CODE_TTL_MINUTES)).timestamp()
        )
        await users.update_one(
            {"user_id": user_id},
            {"$set": {
                "email_verification_code_hash": code_hash,
                "email_verification_expires_at": expires_at,
                "email_verification_attempts": 0
            }}
        )
        await send_verification_email(data.email, raw_code)
    except Exception as e:
        logger.warning(f"Failed to send verification email to {data.email}: {e}")

    token = AuthService.create_token(user_id)
    
    user_response = UserResponse(
        user_id=user_id,
        email=data.email,
        username=data.username,
        country=country_info['country'],
        country_code=country_info['countryCode'],
        country_flag=country_info['flag'],
        gender=data.gender.lower(),
        age_verified=False,
        email_verified=False,
        currentSessionId=None,
        premium_status=False,
        is_premium=False,  # New users are not premium
        premium_tier="free",
        is_admin=False,
        is_moderator=False,
        total_sessions=0,
        total_time_spent=0,
        games_played=0,
        games_won=0,
        created_at=now.isoformat()
    )
    
    return AuthResponse(token=token, user=user_response)

@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest):
    """Login existing user"""
    users = get_users_collection()
    
    user_dict = await users.find_one({"email": data.email}, {"_id": 0})
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not AuthService.verify_password(data.password, user_dict['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check ban status
    from services.ban_service import ban_service
    is_banned, ban_reason, ban_expires = await ban_service.check_ban_status(
        user_dict['user_id'], 
        is_guest=False
    )
    
    if is_banned:
        error_msg = "Your account has been banned"
        if ban_reason:
            error_msg += f": {ban_reason}"
        if ban_expires:
            error_msg += f". Ban expires at {ban_expires}"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error_msg
        )
    
    # Check premium status
    from services.premium_service import premium_service
    is_premium, premium_tier, premium_expires = await premium_service.check_premium_status(
        user_dict['user_id']
    )
    
    # Update last_active and last_login
    await users.update_one(
        {"email": data.email},
        {"$set": {
            "last_active": datetime.now(timezone.utc).isoformat(),
            "last_login": datetime.now(timezone.utc).isoformat(),
            "failed_login_attempts": 0
        }}
    )
    
    token = AuthService.create_token(
        user_dict['user_id'],
        is_admin=user_dict.get('is_admin', False)
    )
    
    # Format premium_expires_at
    premium_expires_at = user_dict.get('premium_expires_at')
    if premium_expires_at and hasattr(premium_expires_at, 'isoformat'):
        premium_expires_at = premium_expires_at.isoformat()
    
    user_response = UserResponse(
        user_id=user_dict['user_id'],
        email=user_dict['email'],
        username=user_dict['username'],
        country=user_dict['country'],
        country_code=user_dict.get('country_code', 'US'),
        country_flag=user_dict.get('country_flag', '🇺🇸'),
        gender=user_dict['gender'],
        age_verified=user_dict.get('age_verified', False),
        email_verified=user_dict.get('email_verified', False),
        premium_status=is_premium,
        is_premium=is_premium,  # Computed premium status for frontend
        premium_tier=premium_tier,
        premium_expires_at=premium_expires_at,
        is_admin=user_dict.get('is_admin', False),
        is_moderator=user_dict.get('is_moderator', False),
        total_sessions=user_dict.get('total_sessions', 0),
        total_time_spent=user_dict.get('total_time_spent', 0),
        games_played=user_dict.get('games_played', 0),
        games_won=user_dict.get('games_won', 0),
        photo_url=user_dict.get('photo_url'),
        bio=user_dict.get('bio'),
        created_at=user_dict.get('created_at')
    )
    
    return AuthResponse(token=token, user=user_response)

@router.post("/guest", response_model=AuthResponse)
async def guest_login(data: GuestRequest, request: Request):
    """Create guest session"""
    guests = get_guests_collection()
    
    if data.gender.lower() not in ['male', 'female']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gender must be Male or Female"
        )
    
    client_ip = request.client.host
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        client_ip = forwarded_for.split(',')[0].strip()
    
    country_info = CountryService.get_country_from_ip(client_ip, data.browser_locale)
    
    guest_id = str(uuid.uuid4())
    guest_number = random.randint(1000, 9999)
    username = f"Guest{guest_number}"
    
    existing = await guests.find_one({"username": username}, {"_id": 0})
    while existing:
        guest_number = random.randint(1000, 9999)
        username = f"Guest{guest_number}"
        existing = await guests.find_one({"username": username}, {"_id": 0})
    
    now = datetime.now(timezone.utc)
    
    guest_dict = {
        "guest_id": guest_id,
        "username": username,
        "gender": data.gender.lower(),
        "country": country_info['country'],
        "country_code": country_info['countryCode'],
        "country_flag": country_info['flag'],
        "age_verified": False,
        "session_expires_at": (now + timedelta(days=1)).isoformat(),
        "is_active": True,
        "currentSessionId": None,
        "is_banned": False,
        "total_sessions": 0,
        "total_time_spent": 0,
        "total_matches": 0,
        "total_messages_sent": 0,
        "total_reports_received": 0,
        "games_played": 0,
        "games_won": 0,
        "created_at": now.isoformat(),
        "last_active": now.isoformat(),
    }
    
    await guests.insert_one(guest_dict)
    
    token = AuthService.create_token(guest_id, is_guest=True)
    
    guest_response = GuestResponse(
        is_guest=True,
        guest_id=guest_id,
        username=username,
        gender=data.gender.lower(),
        age_verified=False,
        currentSessionId=None,
        country=country_info['country'],
        country_code=country_info['countryCode'],
        country_flag=country_info['flag'],
        total_sessions=0,
        total_time_spent=0,
        games_played=0,
        games_won=0,
        created_at=now.isoformat()
    )
    
    return AuthResponse(token=token, user=guest_response)

@router.get("/me")
async def get_current_user(request: Request):
    """Get current authenticated user info"""
    payload = await verify_token(request)
    
    if payload.get('is_guest'):
        guests = get_guests_collection()
        guest_dict = await guests.find_one({"guest_id": payload['user_id']}, {"_id": 0})
        if not guest_dict:
            raise HTTPException(status_code=404, detail="Guest session not found")
        
        # Compute backend-controlled premium status
        is_premium, tier, expires = await premium_service.check_premium_status(payload['user_id'], is_guest=True)
        
        return {
            "guest_id": guest_dict['guest_id'],
            "username": guest_dict['username'],
            "gender": guest_dict['gender'],
            "age_verified": guest_dict.get('age_verified', False),
            "currentSessionId": guest_dict.get('currentSessionId'),
            "country": guest_dict.get('country'),
            "country_code": guest_dict.get('country_code'),
            "country_flag": guest_dict.get('country_flag'),
            "total_sessions": guest_dict.get('total_sessions', 0),
            "total_time_spent": guest_dict.get('total_time_spent', 0),
            "games_played": guest_dict.get('games_played', 0),
            "games_won": guest_dict.get('games_won', 0),
            "created_at": guest_dict.get('created_at'),
            "is_guest": True,
            "is_premium": is_premium,  # COMPUTED premium status
            "premium_status": is_premium,
            "premium_tier": tier
        }
    else:
        users = get_users_collection()
        user_dict = await users.find_one({"user_id": payload['user_id']}, {"_id": 0})
        if not user_dict:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Compute backend-controlled premium status
        is_premium, tier, expires = await premium_service.check_premium_status(payload['user_id'], is_guest=False)
        
        # Format premium_expires_at if present
        premium_expires_at = user_dict.get('premium_expires_at')
        if premium_expires_at:
            if hasattr(premium_expires_at, 'isoformat'):
                premium_expires_at = premium_expires_at.isoformat()
        
        return {
            "user_id": user_dict['user_id'],
            "email": user_dict['email'],
            "username": user_dict['username'],
            "country": user_dict['country'],
            "country_code": user_dict.get('country_code', 'US'),
            "country_flag": user_dict.get('country_flag', '🇺🇸'),
            "gender": user_dict['gender'],
            "age_verified": user_dict.get('age_verified', False),
            "email_verified": user_dict.get('email_verified', False),
            "currentSessionId": user_dict.get('currentSessionId'),
            "premium_status": is_premium,  # COMPUTED premium status
            "is_premium": is_premium,  # COMPUTED premium status
            "premium_tier": tier,
            "premium_expires_at": premium_expires_at,
            "is_admin": user_dict.get('is_admin', False),
            "is_moderator": user_dict.get('is_moderator', False),
            "total_sessions": user_dict.get('total_sessions', 0),
            "total_time_spent": user_dict.get('total_time_spent', 0),
            "games_played": user_dict.get('games_played', 0),
            "games_won": user_dict.get('games_won', 0),
            "photo_url": user_dict.get('photo_url'),
            "bio": user_dict.get('bio'),
            "created_at": user_dict.get('created_at'),
            "is_guest": False
        }


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyResetCodeRequest(BaseModel):
    email: EmailStr
    code: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

async def _check_reset_code(user: dict | None, code: str) -> None:
    """Validates a password-reset code without consuming it. Raises
    HTTPException on any failure, incrementing the attempt counter on a
    wrong (but not expired/missing) code."""
    users = get_users_collection()

    def invalid_code_error():
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

    now_ts = int(datetime.now(timezone.utc).timestamp())
    if (not user or not user.get('password_reset_code_hash')
            or not user.get('password_reset_expires_at') or user['password_reset_expires_at'] < now_ts):
        raise invalid_code_error()

    if user.get('password_reset_attempts', 0) >= MAX_CODE_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many incorrect attempts. Please request a new code."
        )

    code_hash = hashlib.sha256(code.encode()).hexdigest()
    if code_hash != user['password_reset_code_hash']:
        await users.update_one({"user_id": user['user_id']}, {"$inc": {"password_reset_attempts": 1}})
        raise invalid_code_error()

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Request a password reset code by email.

    Always returns the same generic response whether or not the email is
    registered, so this endpoint can't be used to check which emails exist.
    Calling this again (e.g. "resend code") simply issues a fresh code.
    """
    users = get_users_collection()
    user = await users.find_one({"email": data.email}, {"_id": 0})

    generic_response = {
        "message": "If an account exists with this email, a reset code has been sent."
    }

    if not user:
        return generic_response

    raw_code, code_hash = _generate_code_pair()
    expires_at = int(
        (datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_CODE_TTL_MINUTES)).timestamp()
    )

    await users.update_one(
        {"user_id": user['user_id']},
        {"$set": {
            "password_reset_code_hash": code_hash,
            "password_reset_expires_at": expires_at,
            "password_reset_attempts": 0
        }}
    )

    await send_password_reset_email(data.email, raw_code)

    return generic_response

@router.post("/verify-reset-code")
async def verify_reset_code(data: VerifyResetCodeRequest):
    """Checks a password-reset code is valid WITHOUT consuming it, so the
    frontend can move to the "enter new password" step only after the code
    has actually been confirmed correct."""
    users = get_users_collection()
    user = await users.find_one({"email": data.email}, {"_id": 0})
    await _check_reset_code(user, data.code)
    return {"message": "Code verified"}

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Reset a password using a valid, unexpired reset code (max attempts enforced).

    Re-validates the code even if the frontend already called
    /verify-reset-code - the client-side "verified" state can't be trusted
    on its own for something as sensitive as a password change.
    """
    is_valid, message = validate_password(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

    users = get_users_collection()
    user = await users.find_one({"email": data.email}, {"_id": 0})
    await _check_reset_code(user, data.code)

    now_ts = int(datetime.now(timezone.utc).timestamp())
    new_password_hash = AuthService.hash_password(data.new_password)

    await users.update_one(
        {"user_id": user['user_id']},
        {
            "$set": {
                "password_hash": new_password_hash,
                "token_valid_after": now_ts
            },
            "$unset": {
                "password_reset_code_hash": "",
                "password_reset_expires_at": "",
                "password_reset_attempts": ""
            }
        }
    )

    return {"message": "Password has been reset successfully. Please sign in with your new password."}

class VerifyEmailRequest(BaseModel):
    code: str

@router.post("/verify-email")
async def verify_email(data: VerifyEmailRequest, request: Request):
    """Verify the current authenticated user's email using a valid, unexpired code."""
    payload = await verify_token(request)
    if payload.get('is_guest'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Guests don't have an email to verify")

    users = get_users_collection()
    user = await users.find_one({"user_id": payload['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.get('email_verified'):
        return {"message": "Email already verified"}

    def invalid_code_error():
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

    now_ts = int(datetime.now(timezone.utc).timestamp())
    if (not user.get('email_verification_code_hash')
            or not user.get('email_verification_expires_at') or user['email_verification_expires_at'] < now_ts):
        raise invalid_code_error()

    if user.get('email_verification_attempts', 0) >= MAX_CODE_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many incorrect attempts. Please request a new code."
        )

    code_hash = hashlib.sha256(data.code.encode()).hexdigest()
    if code_hash != user['email_verification_code_hash']:
        await users.update_one({"user_id": user['user_id']}, {"$inc": {"email_verification_attempts": 1}})
        raise invalid_code_error()

    await users.update_one(
        {"user_id": user['user_id']},
        {
            "$set": {"email_verified": True},
            "$unset": {
                "email_verification_code_hash": "",
                "email_verification_expires_at": "",
                "email_verification_attempts": ""
            }
        }
    )

    return {"message": "Email verified successfully"}

@router.post("/resend-verification-email")
async def resend_verification_email(request: Request):
    """Resend the verification code for the currently authenticated user."""
    payload = await verify_token(request)
    if payload.get('is_guest'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Guests don't have an email to verify")

    users = get_users_collection()
    user = await users.find_one({"user_id": payload['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.get('email_verified'):
        return {"message": "Email already verified"}

    raw_code, code_hash = _generate_code_pair()
    expires_at = int(
        (datetime.now(timezone.utc) + timedelta(minutes=EMAIL_VERIFICATION_CODE_TTL_MINUTES)).timestamp()
    )
    await users.update_one(
        {"user_id": user['user_id']},
        {"$set": {
            "email_verification_code_hash": code_hash,
            "email_verification_expires_at": expires_at,
            "email_verification_attempts": 0
        }}
    )
    await send_verification_email(user['email'], raw_code)

    return {"message": "Verification code sent"}

@router.post("/logout")
async def logout(request: Request):
    """Log the current session out server-side.

    Sets token_valid_after on the account so this (and any other previously
    issued) token is rejected by verify_token from this point on, instead of
    only relying on the client discarding the token locally.
    """
    payload = await verify_token(request)
    now_ts = int(datetime.now(timezone.utc).timestamp())

    if payload.get('is_guest'):
        guests = get_guests_collection()
        await guests.update_one(
            {"guest_id": payload['user_id']},
            {"$set": {"token_valid_after": now_ts, "currentSessionId": None}}
        )
    else:
        users = get_users_collection()
        await users.update_one(
            {"user_id": payload['user_id']},
            {"$set": {"token_valid_after": now_ts, "currentSessionId": None}}
        )

    return {"message": "Logged out successfully"}


class AgeVerifyRequest(BaseModel):
    confirmed: bool

@router.post("/verify-age")
async def verify_age(data: AgeVerifyRequest, request: Request):
    """Verify user's age - persisted to database"""
    if not data.confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Age confirmation required"
        )
    
    payload = await verify_token(request)
    
    if payload.get('is_guest'):
        guests = get_guests_collection()
        result = await guests.update_one(
            {"guest_id": payload['user_id']},
            {"$set": {"age_verified": True}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Guest session not found")
    else:
        users = get_users_collection()
        result = await users.update_one(
            {"user_id": payload['user_id']},
            {"$set": {"age_verified": True}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "age_verified": True}


class SocialAuthRequest(BaseModel):
    uid: str
    email: str | None = None
    displayName: str | None = None
    photoURL: str | None = None
    provider: str
    idToken: str
    browser_locale: str | None = None
    isAnonymous: bool = False

class GoogleAuthRequest(BaseModel):
    uid: str
    email: str | None = None
    displayName: str | None = None
    photoURL: str | None = None
    idToken: str
    browser_locale: str | None = None

@router.post("/google", response_model=AuthResponse)
async def google_auth(data: GoogleAuthRequest, request: Request):
    """Handle Google authentication specifically"""
    logger.info("=== GOOGLE AUTH REQUEST ===")

    # Verify the Firebase ID token server-side instead of trusting client-supplied
    # uid/email fields directly - prevents account takeover via forged requests.
    try:
        decoded_token = verify_firebase_id_token(data.idToken)
    except ValueError as e:
        logger.warning(f"Google auth rejected - invalid ID token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google sign-in token"
        )

    verified_uid = decoded_token.get('uid')
    verified_email = decoded_token.get('email') or data.email

    if not verified_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google sign-in token"
        )

    data.uid = verified_uid
    data.email = verified_email

    logger.info(f"Firebase UID (verified): {data.uid}")
    logger.info(f"Email (verified): {data.email}")
    logger.info(f"Display Name: {data.displayName}")
    
    users = get_users_collection()
    
    # Auto-detect country from IP
    client_ip = request.client.host
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        client_ip = forwarded_for.split(',')[0].strip()
    
    country_info = CountryService.get_country_from_ip(client_ip, data.browser_locale)
    
    # Check if user exists by Firebase UID or email
    existing_user = None
    if data.email:
        existing_user = await users.find_one({"email": data.email}, {"_id": 0})
        if existing_user:
            logger.info(f"Found existing user by email: {existing_user['user_id']}")
    
    if not existing_user:
        existing_user = await users.find_one({"firebase_uid": data.uid}, {"_id": 0})
        if existing_user:
            logger.info(f"Found existing user by Firebase UID: {existing_user['user_id']}")
    
    if existing_user:
        # Update existing user with Firebase UID if not set
        if not existing_user.get('firebase_uid'):
            await users.update_one(
                {"user_id": existing_user['user_id']},
                {"$set": {
                    "firebase_uid": data.uid,
                    "last_active": datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info("Updated existing user with Firebase UID")
        
        # Check if banned
        if existing_user.get('is_banned', False):
            logger.warning(f"Banned user attempted login: {existing_user['user_id']}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been banned"
            )
        
        token = AuthService.create_token(
            existing_user['user_id'],
            is_admin=existing_user.get('is_admin', False)
        )
        
        logger.info(f"Token generated for existing user: {existing_user['username']}")
        
        user_response = UserResponse(
            user_id=existing_user['user_id'],
            email=existing_user.get('email', ''),
            username=existing_user['username'],
            country=existing_user.get('country', country_info['country']),
            country_code=existing_user.get('country_code', country_info['countryCode']),
            country_flag=existing_user.get('country_flag', country_info['flag']),
            gender=existing_user.get('gender', 'any'),
            age_verified=existing_user.get('age_verified', False),
            email_verified=existing_user.get('email_verified', False),
            premium_status=existing_user.get('premium_status', False),
            premium_tier=existing_user.get('premium_tier', 'free'),
            is_admin=existing_user.get('is_admin', False),
            is_moderator=existing_user.get('is_moderator', False),
            total_sessions=existing_user.get('total_sessions', 0),
            total_time_spent=existing_user.get('total_time_spent', 0),
            games_played=existing_user.get('games_played', 0),
            games_won=existing_user.get('games_won', 0),
            photo_url=existing_user.get('photo_url'),
            bio=existing_user.get('bio'),
            created_at=existing_user.get('created_at')
        )
        
        return AuthResponse(token=token, user=user_response)
    
    # Create new user (Google sign-in)
    user_id = str(uuid.uuid4())
    username = data.displayName or f"User{random.randint(1000, 9999)}"
    
    existing_username = await users.find_one({"username": username}, {"_id": 0})
    if existing_username:
        username = f"{username}{random.randint(100, 999)}"
    
    now = datetime.now(timezone.utc)
    
    logger.info(f"Creating new Google user: {username} ({user_id})")
    
    new_user = {
        "user_id": user_id,
        "firebase_uid": data.uid,
        "email": data.email or "",
        "username": username,
        "password_hash": "",
        "country": country_info['country'],
        "country_code": country_info['countryCode'],
        "country_flag": country_info['flag'],
        "gender": "any",
        "date_of_birth": None,
        "age_verified": False,
        "email_verified": True,  # Google/Firebase already verified this email
        "account_status": "active",
        "is_banned": False,
        "currentSessionId": None,
        "premium_status": False,
        "premium_tier": "free",
        "is_admin": False,
        "is_moderator": False,
        "total_sessions": 0,
        "total_time_spent": 0,
        "total_matches": 0,
        "total_messages_sent": 0,
        "total_reports_received": 0,
        "total_reports_made": 0,
        "total_blocks_received": 0,
        "games_played": 0,
        "games_won": 0,
        "auth_provider": "google",
        "photo_url": data.photoURL,
        "terms_accepted": True,
        "terms_accepted_at": now.isoformat(),
        "terms_version": "2025-12",
        "privacy_accepted": True,
        "privacy_accepted_at": now.isoformat(),
        "privacy_version": "2025-12",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "last_active": now.isoformat()
    }
    
    await users.insert_one(new_user)
    
    logger.info(f"New Google user created successfully: {username} ({user_id})")
    
    token = AuthService.create_token(user_id)
    
    user_response = UserResponse(
        user_id=user_id,
        email=data.email or "",
        username=username,
        country=country_info['country'],
        country_code=country_info['countryCode'],
        country_flag=country_info['flag'],
        gender="any",
        age_verified=False,
        email_verified=True,
        currentSessionId=None,
        premium_status=False,
        premium_tier="free",
        is_admin=False,
        is_moderator=False,
        total_sessions=0,
        total_time_spent=0,
        games_played=0,
        games_won=0,
        photo_url=data.photoURL,
        created_at=now.isoformat()
    )
    
    return AuthResponse(token=token, user=user_response)

@router.post("/social", response_model=AuthResponse)
async def social_auth(data: SocialAuthRequest, request: Request):
    """Handle social authentication (Google, Anonymous)"""
    users = get_users_collection()
    guests = get_guests_collection()
    
    # Auto-detect country from IP
    client_ip = request.client.host
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        client_ip = forwarded_for.split(',')[0].strip()
    
    country_info = CountryService.get_country_from_ip(client_ip, data.browser_locale)
    
    # Handle anonymous users - create as guest
    if data.isAnonymous or data.provider == 'anonymous':
        guest_id = str(uuid.uuid4())
        guest_number = random.randint(1000, 9999)
        username = f"Guest{guest_number}"
        
        existing = await guests.find_one({"username": username}, {"_id": 0})
        while existing:
            guest_number = random.randint(1000, 9999)
            username = f"Guest{guest_number}"
            existing = await guests.find_one({"username": username}, {"_id": 0})
        
        now = datetime.now(timezone.utc)
        
        guest_dict = {
            "guest_id": guest_id,
            "firebase_uid": data.uid,
            "username": username,
            "gender": "any",
            "country": country_info['country'],
            "country_code": country_info['countryCode'],
            "country_flag": country_info['flag'],
            "age_verified": False,
            "session_expires_at": (now + timedelta(days=7)).isoformat(),
            "is_active": True,
            "currentSessionId": None,
            "is_banned": False,
            "total_sessions": 0,
            "total_time_spent": 0,
            "total_matches": 0,
            "total_messages_sent": 0,
            "total_reports_received": 0,
            "games_played": 0,
            "games_won": 0,
            "auth_provider": "anonymous",
            "created_at": now.isoformat(),
            "last_active": now.isoformat(),
        }
        
        await guests.insert_one(guest_dict)
        
        token = AuthService.create_token(guest_id, is_guest=True)
        
        guest_response = GuestResponse(
            is_guest=True,
            guest_id=guest_id,
            username=username,
            gender="any",
            age_verified=False,
            currentSessionId=None,
            country=country_info['country'],
            country_code=country_info['countryCode'],
            country_flag=country_info['flag'],
            total_sessions=0,
            total_time_spent=0,
            games_played=0,
            games_won=0,
            created_at=now.isoformat()
        )
        
        logger.info(f"Anonymous user created: {username} ({guest_id})")
        
        return AuthResponse(token=token, user=guest_response)
    
    # Verify the Firebase ID token server-side before trusting uid/email
    # (anonymous users are handled above and never reach this point).
    try:
        decoded_token = verify_firebase_id_token(data.idToken)
    except ValueError as e:
        logger.warning(f"Social auth rejected - invalid ID token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired sign-in token"
        )

    verified_uid = decoded_token.get('uid')
    if not verified_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid sign-in token"
        )
    data.uid = verified_uid
    data.email = decoded_token.get('email') or data.email

    # Check if user exists by Firebase UID or email (for Google login)
    existing_user = None
    if data.email:
        existing_user = await users.find_one({"email": data.email}, {"_id": 0})
    
    if not existing_user:
        existing_user = await users.find_one({"firebase_uid": data.uid}, {"_id": 0})
    
    if existing_user:
        # Update existing user with Firebase UID if not set
        if not existing_user.get('firebase_uid'):
            await users.update_one(
                {"user_id": existing_user['user_id']},
                {"$set": {
                    "firebase_uid": data.uid,
                    "last_active": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        # Check if banned
        if existing_user.get('is_banned', False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been banned"
            )
        
        token = AuthService.create_token(
            existing_user['user_id'],
            is_admin=existing_user.get('is_admin', False)
        )
        
        user_response = UserResponse(
            user_id=existing_user['user_id'],
            email=existing_user.get('email', ''),
            username=existing_user['username'],
            country=existing_user.get('country', country_info['country']),
            country_code=existing_user.get('country_code', country_info['countryCode']),
            country_flag=existing_user.get('country_flag', country_info['flag']),
            gender=existing_user.get('gender', 'any'),
            age_verified=existing_user.get('age_verified', False),
            email_verified=existing_user.get('email_verified', False),
            premium_status=existing_user.get('premium_status', False),
            premium_tier=existing_user.get('premium_tier', 'free'),
            is_admin=existing_user.get('is_admin', False),
            is_moderator=existing_user.get('is_moderator', False),
            total_sessions=existing_user.get('total_sessions', 0),
            total_time_spent=existing_user.get('total_time_spent', 0),
            games_played=existing_user.get('games_played', 0),
            games_won=existing_user.get('games_won', 0),
            photo_url=existing_user.get('photo_url'),
            bio=existing_user.get('bio'),
            created_at=existing_user.get('created_at')
        )
        
        logger.info(f"Google user logged in: {existing_user['username']} ({existing_user['user_id']})")
        
        return AuthResponse(token=token, user=user_response)
    
    # Create new user (Google sign-in)
    user_id = str(uuid.uuid4())
    username = data.displayName or f"User{random.randint(1000, 9999)}"
    
    existing_username = await users.find_one({"username": username}, {"_id": 0})
    if existing_username:
        username = f"{username}{random.randint(100, 999)}"
    
    now = datetime.now(timezone.utc)
    
    new_user = {
        "user_id": user_id,
        "firebase_uid": data.uid,
        "email": data.email or "",
        "username": username,
        "password_hash": "",
        "country": country_info['country'],
        "country_code": country_info['countryCode'],
        "country_flag": country_info['flag'],
        "gender": "any",
        "date_of_birth": None,
        "age_verified": False,
        "email_verified": True,  # Google/Firebase already verified this email
        "account_status": "active",
        "is_banned": False,
        "currentSessionId": None,
        "premium_status": False,
        "premium_tier": "free",
        "is_admin": False,
        "is_moderator": False,
        "total_sessions": 0,
        "total_time_spent": 0,
        "total_matches": 0,
        "total_messages_sent": 0,
        "total_reports_received": 0,
        "total_reports_made": 0,
        "total_blocks_received": 0,
        "games_played": 0,
        "games_won": 0,
        "auth_provider": data.provider,
        "photo_url": data.photoURL,
        "terms_accepted": True,
        "terms_accepted_at": now.isoformat(),
        "terms_version": "2025-12",
        "privacy_accepted": True,
        "privacy_accepted_at": now.isoformat(),
        "privacy_version": "2025-12",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "last_active": now.isoformat()
    }
    
    await users.insert_one(new_user)
    
    logger.info(f"New Google user created: {username} ({user_id}) - Provider: {data.provider}")
    
    token = AuthService.create_token(user_id)
    
    user_response = UserResponse(
        user_id=user_id,
        email=data.email or "",
        username=username,
        country=country_info['country'],
        country_code=country_info['countryCode'],
        country_flag=country_info['flag'],
        gender="any",
        age_verified=False,
        email_verified=True,
        currentSessionId=None,
        premium_status=False,
        premium_tier="free",
        is_admin=False,
        is_moderator=False,
        total_sessions=0,
        total_time_spent=0,
        games_played=0,
        games_won=0,
        photo_url=data.photoURL,
        created_at=now.isoformat()
    )
    
    return AuthResponse(token=token, user=user_response)
