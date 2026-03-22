import os
import re
import logging
from typing import Optional, Dict, List
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Banned words/patterns (basic list - extend as needed)
BANNED_WORDS = [
    # Explicit content
    'porn', 'xxx', 'nude', 'naked',
    # Slurs and hate speech (abbreviated to avoid explicit content)
    # Add actual terms as needed for production
    # Spam patterns
    'click here', 'free money', 'make money fast', 'earn cash',
    # Contact info spam
    'whatsapp me', 'telegram me', 'add me on', 'my instagram',
]

SPAM_PATTERNS = [
    r'https?://\S+',  # URLs
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Emails
    r'\+?[1-9]\d{1,14}',  # Phone numbers (E.164 format)
]

class ModerationResult:
    def __init__(
        self,
        is_flagged: bool,
        reason: Optional[str] = None,
        confidence: float = 0.0,
        flagged_content: Optional[str] = None,
        action: str = "allow"  # allow, warn, block
    ):
        self.is_flagged = is_flagged
        self.reason = reason
        self.confidence = confidence
        self.flagged_content = flagged_content
        self.action = action

    def to_dict(self) -> Dict:
        return {
            "is_flagged": self.is_flagged,
            "reason": self.reason,
            "confidence": self.confidence,
            "flagged_content": self.flagged_content,
            "action": self.action
        }


class RuleBasedModeration:
    """Simple rule-based content moderation"""
    
    @staticmethod
    def check_banned_words(text: str) -> ModerationResult:
        """Check for banned words"""
        text_lower = text.lower()
        
        for word in BANNED_WORDS:
            if word in text_lower:
                return ModerationResult(
                    is_flagged=True,
                    reason="banned_word",
                    confidence=1.0,
                    flagged_content=word,
                    action="block"
                )
        
        return ModerationResult(is_flagged=False)
    
    @staticmethod
    def check_spam_patterns(text: str) -> ModerationResult:
        """Check for spam patterns like URLs, emails, phone numbers"""
        for pattern in SPAM_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return ModerationResult(
                    is_flagged=True,
                    reason="spam_pattern",
                    confidence=0.9,
                    flagged_content=match.group(),
                    action="warn"
                )
        
        return ModerationResult(is_flagged=False)
    
    @staticmethod
    def check_repetition(text: str) -> ModerationResult:
        """Check for excessive character repetition (spam indicator)"""
        # Check for same character repeated 5+ times
        if re.search(r'(.)\1{4,}', text):
            return ModerationResult(
                is_flagged=True,
                reason="excessive_repetition",
                confidence=0.7,
                flagged_content="Character spam detected",
                action="warn"
            )
        
        return ModerationResult(is_flagged=False)
    
    @staticmethod
    def check_caps_ratio(text: str) -> ModerationResult:
        """Check for excessive CAPS (shouting)"""
        if len(text) < 10:
            return ModerationResult(is_flagged=False)
        
        letters = [c for c in text if c.isalpha()]
        if not letters:
            return ModerationResult(is_flagged=False)
        
        caps_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
        
        if caps_ratio > 0.7:
            return ModerationResult(
                is_flagged=True,
                reason="excessive_caps",
                confidence=0.6,
                flagged_content="Too many capital letters",
                action="warn"
            )
        
        return ModerationResult(is_flagged=False)


class AIModeration:
    """AI-powered content moderation using OpenAI"""
    
    def __init__(self):
        self.api_key = os.environ.get("EMERGENT_LLM_KEY")
        self.enabled = bool(self.api_key)
    
    async def moderate(self, text: str) -> ModerationResult:
        """Use AI to moderate content"""
        if not self.enabled:
            return ModerationResult(is_flagged=False, reason="ai_disabled")
        
        try:
            from emergentintegrations.llm.openai import OpenAIChat, OpenAIMessage
            
            chat = OpenAIChat(api_key=self.api_key)
            
            system_prompt = """You are a content moderation assistant. Analyze the following message for:
1. Explicit or adult content
2. Hate speech or discrimination
3. Harassment or bullying
4. Violence or threats
5. Spam or scam attempts
6. Personal information sharing

Respond with a JSON object:
{
    "is_flagged": true/false,
    "reason": "category if flagged or null",
    "confidence": 0.0-1.0,
    "action": "allow", "warn", or "block"
}

Be lenient with casual conversation but strict with clear violations."""

            response = await chat.chat(
                messages=[
                    OpenAIMessage(role="system", content=system_prompt),
                    OpenAIMessage(role="user", content=f"Moderate this message: \"{text}\"")
                ],
                model="gpt-4o-mini",
                temperature=0.1
            )
            
            # Parse response
            import json
            content = response.content.strip()
            
            # Try to extract JSON from response
            if '{' in content and '}' in content:
                json_str = content[content.find('{'):content.rfind('}')+1]
                result = json.loads(json_str)
                
                return ModerationResult(
                    is_flagged=result.get("is_flagged", False),
                    reason=result.get("reason"),
                    confidence=result.get("confidence", 0.5),
                    action=result.get("action", "allow")
                )
            
            return ModerationResult(is_flagged=False)
            
        except Exception as e:
            logger.error(f"AI moderation error: {e}")
            return ModerationResult(is_flagged=False, reason="ai_error")


class ContentModerator:
    """Combined moderation service"""
    
    def __init__(self):
        self.rule_based = RuleBasedModeration()
        self.ai_moderation = AIModeration()
        self.user_message_counts: Dict[str, List[datetime]] = {}
    
    def check_rate_limit(self, user_id: str, max_messages: int = 10, window_seconds: int = 60) -> ModerationResult:
        """Check if user is sending messages too fast"""
        now = datetime.now(timezone.utc)
        
        if user_id not in self.user_message_counts:
            self.user_message_counts[user_id] = []
        
        # Clean old messages
        cutoff = now.timestamp() - window_seconds
        self.user_message_counts[user_id] = [
            t for t in self.user_message_counts[user_id] 
            if t.timestamp() > cutoff
        ]
        
        # Add current message
        self.user_message_counts[user_id].append(now)
        
        if len(self.user_message_counts[user_id]) > max_messages:
            return ModerationResult(
                is_flagged=True,
                reason="rate_limit",
                confidence=1.0,
                flagged_content=f"Too many messages ({len(self.user_message_counts[user_id])} in {window_seconds}s)",
                action="block"
            )
        
        return ModerationResult(is_flagged=False)
    
    async def moderate(self, text: str, user_id: str, use_ai: bool = False) -> ModerationResult:
        """Full moderation pipeline"""
        
        # 1. Rate limiting
        rate_result = self.check_rate_limit(user_id)
        if rate_result.is_flagged:
            return rate_result
        
        # 2. Rule-based checks (fast)
        checks = [
            self.rule_based.check_banned_words(text),
            self.rule_based.check_spam_patterns(text),
            self.rule_based.check_repetition(text),
            self.rule_based.check_caps_ratio(text),
        ]
        
        for result in checks:
            if result.is_flagged and result.action == "block":
                return result
        
        # Collect warnings
        warnings = [r for r in checks if r.is_flagged]
        
        # 3. AI moderation for flagged/suspicious content
        if use_ai and (warnings or len(text) > 100):
            ai_result = await self.ai_moderation.moderate(text)
            if ai_result.is_flagged:
                return ai_result
        
        # Return warning if any, otherwise allow
        if warnings:
            return warnings[0]
        
        return ModerationResult(is_flagged=False, action="allow")


# Global instance
content_moderator = ContentModerator()
