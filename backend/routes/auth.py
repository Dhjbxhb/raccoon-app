from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, EmailStr
from services.auth_service import AuthService
from services.db_service import get_users_collection, get_guests_collection
from services.country_service import CountryService
from models.user import User, UserResponse
from models.guest import Guest, GuestResponse
from utils.validators import validate_age, validate_password, validate_username
from middleware.auth_middleware import verify_token
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
        premium_status=False,
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
        premium_status=is_premium,
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
        guest_id=guest_id,
        username=username,
        gender=data.gender.lower(),
        age_verified=False,
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
        return GuestResponse(
            guest_id=guest_dict['guest_id'],
            username=guest_dict['username'],
            gender=guest_dict['gender'],
            age_verified=guest_dict.get('age_verified', False),
            country=guest_dict.get('country'),
            country_code=guest_dict.get('country_code'),
            country_flag=guest_dict.get('country_flag'),
            total_sessions=guest_dict.get('total_sessions', 0),
            total_time_spent=guest_dict.get('total_time_spent', 0),
            games_played=guest_dict.get('games_played', 0),
            games_won=guest_dict.get('games_won', 0),
            created_at=guest_dict.get('created_at')
        )
    else:
        users = get_users_collection()
        user_dict = await users.find_one({"user_id": payload['user_id']}, {"_id": 0})
        if not user_dict:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Format premium_expires_at if present
        premium_expires_at = user_dict.get('premium_expires_at')
        if premium_expires_at:
            if hasattr(premium_expires_at, 'isoformat'):
                premium_expires_at = premium_expires_at.isoformat()
        
        return UserResponse(
            user_id=user_dict['user_id'],
            email=user_dict['email'],
            username=user_dict['username'],
            country=user_dict['country'],
            country_code=user_dict.get('country_code', 'US'),
            country_flag=user_dict.get('country_flag', '🇺🇸'),
            gender=user_dict['gender'],
            age_verified=user_dict.get('age_verified', False),
            premium_status=user_dict.get('premium_status', False),
            premium_tier=user_dict.get('premium_tier', 'free'),
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
    logger.info(f"=== GOOGLE AUTH REQUEST ===")
    logger.info(f"Firebase UID: {data.uid}")
    logger.info(f"Email: {data.email}")
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
        "account_status": "active",
        "is_banned": False,
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
            guest_id=guest_id,
            username=username,
            gender="any",
            age_verified=False,
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
        "account_status": "active",
        "is_banned": False,
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
