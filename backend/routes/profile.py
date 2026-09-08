"""
Profile Routes - Profile picture upload and profile field editing.

Registered users only (guests are temporary accounts and are not offered
profile editing). Profile pictures are stored on local disk under
uploads/avatars/ and served via the /api/static/avatars static mount
configured in server.py.
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
from services.db_service import get_users_collection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profile", tags=["profile"])

UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "avatars"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5MB
AVATAR_SIZE = 512


def _require_registered_user(payload: dict):
    if payload.get('is_guest'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Guests cannot edit profile - please create an account"
        )


class ProfileUpdateRequest(BaseModel):
    gender: Optional[str] = None


@router.patch("")
async def update_profile(data: ProfileUpdateRequest, request: Request):
    """Update editable profile fields (currently: gender)."""
    payload = await verify_token(request)
    _require_registered_user(payload)

    updates = {}

    if data.gender is not None:
        gender = data.gender.lower().strip()
        if gender not in ('male', 'female', 'any'):
            raise HTTPException(status_code=400, detail="Gender must be 'male', 'female', or 'any'")
        updates['gender'] = gender

    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    updates['updated_at'] = datetime.now(timezone.utc)

    users = get_users_collection()
    result = await users.update_one({"user_id": payload['user_id']}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"success": True, **{k: v for k, v in updates.items() if k != 'updated_at'}}


@router.post("/avatar")
async def upload_avatar(request: Request, file: UploadFile = File(...)):
    """Upload/replace the current user's profile picture."""
    payload = await verify_token(request)
    _require_registered_user(payload)

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

    user_id = payload['user_id']
    file_path = UPLOAD_DIR / f"{user_id}.jpg"
    image.save(file_path, "JPEG", quality=85)

    avatar_url = f"/api/static/avatars/{user_id}.jpg?v={int(time.time())}"

    users = get_users_collection()
    result = await users.update_one(
        {"user_id": user_id},
        {"$set": {"avatar_url": avatar_url, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    logger.info(f"Avatar updated for user {user_id}")
    return {"success": True, "avatar_url": avatar_url}


@router.delete("/avatar")
async def delete_avatar(request: Request):
    """Remove the current user's custom profile picture (falls back to default)."""
    payload = await verify_token(request)
    _require_registered_user(payload)

    user_id = payload['user_id']
    file_path = UPLOAD_DIR / f"{user_id}.jpg"
    if file_path.exists():
        file_path.unlink()

    users = get_users_collection()
    await users.update_one(
        {"user_id": user_id},
        {"$set": {"avatar_url": None, "updated_at": datetime.now(timezone.utc)}}
    )

    return {"success": True}
