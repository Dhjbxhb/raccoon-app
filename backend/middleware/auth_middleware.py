from fastapi import Request, HTTPException, status
from services.auth_service import AuthService
from services.db_service import get_users_collection, get_guests_collection


async def verify_token(request: Request) -> dict:
    """Verify JWT token from Authorization header, and confirm the session
    hasn't been invalidated by a logout since the token was issued."""
    auth_header = request.headers.get('Authorization')

    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token"
        )

    try:
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        payload = AuthService.decode_token(token)

        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization token"
        )

    collection = get_guests_collection() if payload.get('is_guest') else get_users_collection()
    id_field = 'guest_id' if payload.get('is_guest') else 'user_id'
    account = await collection.find_one({id_field: payload['user_id']}, {'_id': 0})

    if not account:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account no longer exists"
        )

    token_valid_after = account.get('token_valid_after')
    if token_valid_after and payload.get('iat', 0) < token_valid_after:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been logged out, please sign in again"
        )

    return payload
