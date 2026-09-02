import jwt
import bcrypt
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict

SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
if not SECRET_KEY:
    raise RuntimeError('JWT_SECRET_KEY environment variable is not set - refusing to start with an insecure default')
ALGORITHM = 'HS256'

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    @staticmethod
    def create_token(user_id: str, is_guest: bool = False, is_admin: bool = False, days: int = 7) -> str:
        """Create JWT token"""
        now = datetime.now(timezone.utc)
        expiry = now + timedelta(days=days if not is_guest else 1)
        payload = {
            'user_id': user_id,
            'is_guest': is_guest,
            'is_admin': is_admin,
            'iat': int(now.timestamp()),
            'exp': expiry
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        return token
    
    @staticmethod
    def decode_token(token: str) -> Optional[Dict]:
        """Decode and verify JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
