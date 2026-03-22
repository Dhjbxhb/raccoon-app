from datetime import datetime
import re

def validate_age(date_of_birth: str) -> bool:
    """Validate user is 18+ years old"""
    try:
        dob = datetime.fromisoformat(date_of_birth.replace('Z', '+00:00'))
        today = datetime.now()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return age >= 18
    except:
        return False

def validate_email(email: str) -> bool:
    """Basic email validation"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password: str) -> tuple[bool, str]:
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not any(char.isdigit() for char in password):
        return False, "Password must contain at least one number"
    if not any(char.isalpha() for char in password):
        return False, "Password must contain at least one letter"
    return True, "Valid"

def validate_username(username: str) -> tuple[bool, str]:
    """Validate username"""
    if len(username) < 3 or len(username) > 20:
        return False, "Username must be 3-20 characters"
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return False, "Username can only contain letters, numbers, and underscores"
    return True, "Valid"
