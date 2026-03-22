from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, EmailStr
from services.auth_service import AuthService
from services.db_service import get_users_collection, get_guests_collection
from models.user import User, UserResponse
from models.guest import Guest, GuestResponse
from utils.validators import validate_age, validate_password, validate_username
from middleware.auth_middleware import verify_token
import uuid
from datetime import datetime, timedelta, timezone
import random

router = APIRouter(prefix="/auth", tags=["authentication"])

class SignupRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    country: str
    gender: str
    date_of_birth: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GuestRequest(BaseModel):
    gender: str

class AuthResponse(BaseModel):
    token: str
    user: UserResponse | GuestResponse

@router.post("/signup", response_model=AuthResponse)
async def signup(data: SignupRequest):
    """Register new user"""
    users = get_users_collection()
    
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
    if data.gender.lower() not in ['male', 'female', 'any']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid gender selection"
        )
    
    # Create user
    user_id = str(uuid.uuid4())
    password_hash = AuthService.hash_password(data.password)
    
    user = User(
        user_id=user_id,
        email=data.email,
        username=data.username,
        password_hash=password_hash,
        country=data.country,
        gender=data.gender.lower(),
        date_of_birth=data.date_of_birth
    )
    
    # Store in DB
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['last_active'] = user_dict['last_active'].isoformat()
    await users.insert_one(user_dict)
    
    # Create token
    token = AuthService.create_token(user_id, is_admin=user.is_admin)
    
    user_response = UserResponse(
        user_id=user.user_id,
        email=user.email,
        username=user.username,
        country=user.country,
        gender=user.gender,
        premium_status=user.premium_status,
        is_admin=user.is_admin,
        total_sessions=user.total_sessions,
        total_time_spent=user.total_time_spent
    )
    
    return AuthResponse(token=token, user=user_response)

@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest):
    """Login existing user"""
    users = get_users_collection()
    
    # Find user
    user_dict = await users.find_one({"email": data.email}, {"_id": 0})
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not AuthService.verify_password(data.password, user_dict['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if banned
    if user_dict.get('is_banned', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been banned"
        )
    
    # Update last_active
    await users.update_one(
        {"email": data.email},
        {"$set": {"last_active": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create token
    token = AuthService.create_token(
        user_dict['user_id'],
        is_admin=user_dict.get('is_admin', False)
    )
    
    user_response = UserResponse(
        user_id=user_dict['user_id'],
        email=user_dict['email'],
        username=user_dict['username'],
        country=user_dict['country'],
        gender=user_dict['gender'],
        premium_status=user_dict.get('premium_status', False),
        is_admin=user_dict.get('is_admin', False),
        total_sessions=user_dict.get('total_sessions', 0),
        total_time_spent=user_dict.get('total_time_spent', 0)
    )
    
    return AuthResponse(token=token, user=user_response)

@router.post("/guest", response_model=AuthResponse)
async def guest_login(data: GuestRequest):
    """Create guest session"""
    guests = get_guests_collection()
    
    # Validate gender
    if data.gender.lower() not in ['male', 'female', 'any']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid gender selection"
        )
    
    # Generate guest ID and username
    guest_id = str(uuid.uuid4())
    guest_number = random.randint(1000, 9999)
    username = f"Guest{guest_number}"
    
    # Check if username exists (unlikely but possible)
    existing = await guests.find_one({"username": username}, {"_id": 0})
    while existing:
        guest_number = random.randint(1000, 9999)
        username = f"Guest{guest_number}"
        existing = await guests.find_one({"username": username}, {"_id": 0})
    
    # Create guest
    guest = Guest(
        guest_id=guest_id,
        username=username,
        gender=data.gender.lower(),
        session_expires_at=datetime.now(timezone.utc) + timedelta(days=1)
    )
    
    # Store in DB
    guest_dict = guest.model_dump()
    guest_dict['created_at'] = guest_dict['created_at'].isoformat()
    guest_dict['session_expires_at'] = guest_dict['session_expires_at'].isoformat()
    await guests.insert_one(guest_dict)
    
    # Create token (1 day expiry for guests)
    token = AuthService.create_token(guest_id, is_guest=True)
    
    guest_response = GuestResponse(
        guest_id=guest.guest_id,
        username=guest.username,
        gender=guest.gender
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
        return GuestResponse(**guest_dict)
    else:
        users = get_users_collection()
        user_dict = await users.find_one({"user_id": payload['user_id']}, {"_id": 0})
        if not user_dict:
            raise HTTPException(status_code=404, detail="User not found")
        return UserResponse(
            user_id=user_dict['user_id'],
            email=user_dict['email'],
            username=user_dict['username'],
            country=user_dict['country'],
            gender=user_dict['gender'],
            premium_status=user_dict.get('premium_status', False),
            is_admin=user_dict.get('is_admin', False),
            total_sessions=user_dict.get('total_sessions', 0),
            total_time_spent=user_dict.get('total_time_spent', 0)
        )
