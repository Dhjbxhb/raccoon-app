from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.auth_service import AuthService
from typing import Optional

security = HTTPBearer()

async def verify_token(request: Request) -> dict:
    """Verify JWT token from Authorization header"""
    auth_header = request.headers.get('Authorization')
    
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token"
        )
    
    try:
        # Extract token from 'Bearer <token>'
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        payload = AuthService.decode_token(token)
        
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization token"
        )

async def verify_admin(request: Request) -> dict:
    """Verify user is admin"""
    payload = await verify_token(request)
    
    if not payload.get('is_admin', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return payload
