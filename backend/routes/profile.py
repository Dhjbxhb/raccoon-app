"""
Profile Routes - Onboarding, profile picture upload, and profile field editing.

Works for both registered users and guests. Profile pictures are stored on
local disk under uploads/avatars/ and served via the /api/static/avatars
static mount configured in server.py.
"""

from fastapi import APIRouter, HTTPException, status, Request, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
from PIL import Image, ImageOps, UnidentifiedImageError
from io import BytesIO
from datetime import datetime, timezone
import time
import logging

from middleware.auth_middleware import verify_token
from services.db_service import get_users_collection, get_guests_collection
from utils.validators import validate_age, validate_username

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profile", tags=["profile"])

UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "avatars"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5MB
AVATAR_SIZE = 512
VALID_GENDERS = ('male', 'female', 'any')


def _account_ctx(payload: dict):
    """(collection, id_field, account_id) for the caller, guest or registered."""
    if payload.get('is_guest'):
        return get_guests_collection(), 'guest_id', payload['user_id']
    return get_users_collection(), 'user_id', payload['user_id']


async def _username_taken(username: str, exclude_id: str) -> bool:
    users = get_users_collection()
    guests = get_guests_collection()
    u = await users.find_one({"username": username, "user_id": {"$ne": exclude_id}}, {"_id": 1})
    if u:
        return True
    g = await guests.find_one({"username": username, "guest_id": {"$ne": exclude_id}}, {"_id": 1})
    return bool(g)


class ProfileUpdateRequest(BaseModel):
    gender: Optional[str] = None


class OnboardingRequest(BaseModel):
    date_of_birth: str
    gender: str
    display_name: Optional[str] = None


@router.post("/onboarding")
async def complete_onboarding(data: OnboardingRequest, request: Request):
    """First-time onboarding: collect date of birth + gender (required) and an
    optional display name. Applies to every sign-up method, including guests."""
    payload = await verify_token(request)
    collection, id_field, account_id = _account_ctx(payload)

    if not validate_age(data.date_of_birth):
        raise HTTPException(status_code=400, detail="You must be 18 or older to use Raccoon")

    gender = data.gender.lower().strip()
    if gender not in VALID_GENDERS:
        raise HTTPException(status_code=400, detail="Please select a valid gender")

    updates = {
        'gender': gender,
        'date_of_birth': data.date_of_birth,
        'age_verified': True,
        'profile_completed': True,
        'updated_at': datetime.now(timezone.utc),
    }

    if data.display_name and data.display_name.strip():
        name = data.display_name.strip()
        ok, msg = validate_username(name)
        if not ok:
            raise HTTPException(status_code=400, detail=msg)
        if await _username_taken(name, account_id):
            raise HTTPException(status_code=400, detail="That name is already taken")
        updates['username'] = name

    result = await collection.update_one({id_field: account_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")

    account = await collection.find_one({id_field: account_id}, {"_id": 0})
    return _account_public(account, payload.get('is_guest', False))


def _account_public(account: dict, is_guest: bool) -> dict:
    """Shape mirrors /auth/me so the frontend can log the user back in with fresh data."""
    if is_guest:
        return {
            "guest_id": account.get('guest_id'),
            "username": account.get('username'),
            "gender": account.get('gender'),
            "is_guest": True,
            "age_verified": account.get('age_verified', False),
            "profile_completed": account.get('profile_completed', False),
            "avatar_url": account.get('avatar_url'),
            "country": account.get('country'),
            "country_code": account.get('country_code'),
            "country_flag": account.get('country_flag'),
            "currentSessionId": account.get('currentSessionId'),
        }
    return {
        "user_id": account.get('user_id'),
        "email": account.get('email') or "",
        "username": account.get('username'),
        "gender": account.get('gender'),
        "is_guest": False,
        "age_verified": account.get('age_verified', False),
        "email_verified": account.get('email_verified', False),
        "profile_completed": account.get('profile_completed', False),
        "avatar_url": account.get('avatar_url'),
        "photo_url": account.get('photo_url'),
        "country": account.get('country'),
        "country_code": account.get('country_code'),
        "country_flag": account.get('country_flag'),
        "currentSessionId": account.get('currentSessionId'),
        "is_admin": account.get('is_admin', False),
        "premium_status": account.get('premium_status', False),
        "is_premium": account.get('premium_status', False),
        "premium_tier": account.get('premium_tier', 'free'),
    }


@router.patch("")
async def update_profile(data: ProfileUpdateRequest, request: Request):
    """Update editable profile fields (currently: gender)."""
    payload = await verify_token(request)
    collection, id_field, account_id = _account_ctx(payload)

    updates = {}
    if data.gender is not None:
        gender = data.gender.lower().strip()
        if gender not in VALID_GENDERS:
            raise HTTPException(status_code=400, detail="Gender must be 'male', 'female', or 'any'")
        updates['gender'] = gender

    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    updates['updated_at'] = datetime.now(timezone.utc)
    result = await collection.update_one({id_field: account_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")

    return {"success": True, **{k: v for k, v in updates.items() if k != 'updated_at'}}


@router.post("/avatar")
async def upload_avatar(request: Request, file: UploadFile = File(...)):
    """Upload/replace the current account's profile picture."""
    payload = await verify_token(request)
    collection, id_field, account_id = _account_ctx(payload)

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WEBP images are allowed")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image must be smaller than 5MB")

    try:
        image = Image.open(BytesIO(contents))
        image = ImageOps.exif_transpose(image)  # fix orientation from phone cameras
        image = image.convert("RGB")
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Invalid or corrupted image file")

    # Center-crop to square, then resize to a fixed avatar size
    width, height = image.size
    side = min(width, height)
    left = (width - side) // 2
    top = (height - side) // 2
    image = image.crop((left, top, left + side, top + side))
    image = image.resize((AVATAR_SIZE, AVATAR_SIZE), Image.LANCZOS)

    file_path = UPLOAD_DIR / f"{account_id}.jpg"
    image.save(file_path, "JPEG", quality=85)

    avatar_url = f"/api/static/avatars/{account_id}.jpg?v={int(time.time())}"

    result = await collection.update_one(
        {id_field: account_id},
        {"$set": {"avatar_url": avatar_url, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")

    logger.info(f"Avatar updated for {id_field}={account_id}")
    return {"success": True, "avatar_url": avatar_url}


@router.delete("/avatar")
async def delete_avatar(request: Request):
    """Remove the current account's custom profile picture (falls back to default)."""
    payload = await verify_token(request)
    collection, id_field, account_id = _account_ctx(payload)

    file_path = UPLOAD_DIR / f"{account_id}.jpg"
    if file_path.exists():
        file_path.unlink()

    await collection.update_one(
        {id_field: account_id},
        {"$set": {"avatar_url": None, "updated_at": datetime.now(timezone.utc)}}
    )

    return {"success": True}
