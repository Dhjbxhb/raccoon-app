"""
Chat Moderation Service - Filter offensive and inappropriate content
"""
import re
from typing import Tuple

# Offensive words list (basic - can be expanded)
OFFENSIVE_WORDS = {
    # Profanity
    'fuck', 'shit', 'ass', 'damn', 'bitch', 'bastard', 'crap', 'piss',
    'dick', 'cock', 'pussy', 'cunt', 'whore', 'slut', 'fag', 'faggot',
    # Racial slurs
    'nigger', 'nigga', 'chink', 'spic', 'wetback', 'kike',
    # Other offensive
    'retard', 'rape', 'kill yourself', 'kys', 'nazi',
    # Spam patterns
    'buy now', 'click here', 'free money', 'make money fast',
}

# Variations and leetspeak patterns
LEETSPEAK_MAP = {
    '@': 'a', '4': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o',
    '$': 's', '5': 's', '7': 't', '+': 't'
}

def normalize_text(text: str) -> str:
    """Convert leetspeak and normalize text for matching"""
    normalized = text.lower()
    for leet, char in LEETSPEAK_MAP.items():
        normalized = normalized.replace(leet, char)
    # Remove repeated characters (e.g., "fuuuuck" -> "fuck")
    normalized = re.sub(r'(.)\1{2,}', r'\1\1', normalized)
    # Remove spaces between characters (e.g., "f u c k" -> "fuck")
    no_space = re.sub(r'\s+', '', normalized)
    return normalized, no_space

def check_message(message: str) -> Tuple[bool, str, str]:
    """
    Check if message contains offensive content
    Returns: (is_clean, filtered_message, reason)
    """
    if not message or len(message.strip()) == 0:
        return True, message, None
    
    normalized, no_space = normalize_text(message)
    
    # Check for offensive words
    for word in OFFENSIVE_WORDS:
        # Check in normalized text
        if word in normalized or word in no_space:
            # Replace with asterisks
            pattern = re.compile(re.escape(word), re.IGNORECASE)
            filtered = pattern.sub('*' * len(word), message)
            # Also check normalized versions
            for orig_word in message.lower().split():
                if word in normalize_text(orig_word)[0] or word in normalize_text(orig_word)[1]:
                    filtered = re.sub(re.escape(orig_word), '*' * len(orig_word), filtered, flags=re.IGNORECASE)
            return False, filtered, "Contains inappropriate language"
    
    # Check for URLs (potential spam)
    url_pattern = r'https?://\S+|www\.\S+'
    if re.search(url_pattern, message):
        return False, re.sub(url_pattern, '[link removed]', message), "Contains links"
    
    # Check for excessive caps (shouting)
    if len(message) > 10:
        caps_ratio = sum(1 for c in message if c.isupper()) / len(message)
        if caps_ratio > 0.7:
            return True, message.lower().capitalize(), "Excessive caps"
    
    return True, message, None

def filter_message(message: str) -> str:
    """Filter message and return cleaned version"""
    is_clean, filtered, reason = check_message(message)
    return filtered

def is_message_allowed(message: str) -> Tuple[bool, str]:
    """Check if message is allowed to be sent"""
    is_clean, filtered, reason = check_message(message)
    return is_clean, reason
