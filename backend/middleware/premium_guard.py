"""
Premium Guard Middleware

Enforces premium feature gating at the backend level.
This ensures premium features cannot be bypassed even if frontend is manipulated.
"""

from typing import List, Optional, Dict, Tuple
from enum import Enum
from datetime import datetime, timezone
from services.subscription_service import subscription_service


class PremiumFeature(str, Enum):
    """Enumeration of all premium-gated features"""
    GENDER_FILTER = "gender_filter"
    COUNTRY_FILTER = "country_filter"
    CAMERA_FILTERS = "camera_filters"
    PRIORITY_MATCHING = "priority_matching"
    MINI_GAMES = "mini_games"
    PROFILE_BADGE = "profile_badge"
    NO_ADS = "no_ads"
    PRIORITY_SUPPORT = "priority_support"
    CUSTOM_USERNAME_COLOR = "custom_username_color"


# Define which features require premium
PREMIUM_FEATURES: Dict[PremiumFeature, Dict] = {
    PremiumFeature.GENDER_FILTER: {
        "name": "Gender Filter",
        "description": "Filter matches by gender",
        "free_value": "any",  # Free users can only use this value
        "requires_premium": True
    },
    PremiumFeature.COUNTRY_FILTER: {
        "name": "Country Filter",
        "description": "Filter matches by country",
        "free_value": "ANY",  # Free users can only use this value
        "requires_premium": True
    },
    PremiumFeature.CAMERA_FILTERS: {
        "name": "Camera Filters",
        "description": "Apply video filters during calls",
        "free_filters": ["none", "warm", "cool"],  # Free filters
        "requires_premium": True
    },
    PremiumFeature.PRIORITY_MATCHING: {
        "name": "Priority Matching",
        "description": "Get matched faster with priority queue",
        "requires_premium": True
    },
    PremiumFeature.MINI_GAMES: {
        "name": "Mini Games",
        "description": "Play games like Raccoon Feud and Truth or Dare",
        "requires_premium": True
    },
    PremiumFeature.PROFILE_BADGE: {
        "name": "Profile Badge",
        "description": "Show premium badge on profile",
        "requires_premium": True
    },
    PremiumFeature.NO_ADS: {
        "name": "Ad-Free Experience",
        "description": "No advertisements",
        "requires_premium": True
    },
    PremiumFeature.PRIORITY_SUPPORT: {
        "name": "Priority Support",
        "description": "Get faster support responses",
        "requires_premium": True
    }
}


class PremiumGuard:
    """
    Premium feature guard - validates premium access at backend level.
    
    CRITICAL: This is the SOURCE OF TRUTH for premium access.
    Frontend checks are for UX only - backend enforces actual access.
    """
    
    @staticmethod
    async def check_premium_status(user_id: str, is_guest: bool = False) -> Tuple[bool, Optional[str]]:
        """
        Check if user has active premium status.
        
        Returns: (is_premium, expiry_date)
        """
        if is_guest:
            # Guests cannot have premium
            return False, None
        
        status = await subscription_service.get_premium_status(user_id)
        return status.is_premium, status.expiry_date
    
    @staticmethod
    async def validate_feature_access(
        user_id: str, 
        feature: PremiumFeature,
        is_guest: bool = False
    ) -> Tuple[bool, str]:
        """
        Validate if user can access a premium feature.
        
        Returns: (allowed, message)
        """
        is_premium, _ = await PremiumGuard.check_premium_status(user_id, is_guest)
        
        feature_config = PREMIUM_FEATURES.get(feature)
        if not feature_config:
            return True, "Feature not found"
        
        if not feature_config.get("requires_premium", False):
            return True, "Feature is free"
        
        if is_premium:
            return True, "Premium access granted"
        
        return False, f"{feature_config['name']} is a premium feature. Upgrade to access."
    
    @staticmethod
    async def validate_gender_filter(
        user_id: str, 
        requested_filter: str,
        is_guest: bool = False
    ) -> Tuple[bool, str, str]:
        """
        Validate gender filter selection.
        
        Returns: (allowed, message, effective_filter)
        - If not premium and requesting non-'any', returns 'any' as effective filter
        """
        is_premium, _ = await PremiumGuard.check_premium_status(user_id, is_guest)
        free_value = PREMIUM_FEATURES[PremiumFeature.GENDER_FILTER]["free_value"]
        
        if is_premium:
            return True, "Premium filter applied", requested_filter
        
        if requested_filter == free_value:
            return True, "Free filter applied", requested_filter
        
        # Non-premium trying to use premium filter - fall back to free
        return False, f"Gender filter requires premium. Using '{free_value}' instead.", free_value
    
    @staticmethod
    async def validate_country_filter(
        user_id: str, 
        requested_filter: str,
        is_guest: bool = False
    ) -> Tuple[bool, str, str]:
        """
        Validate country filter selection.
        
        Returns: (allowed, message, effective_filter)
        - If not premium and requesting specific country, returns 'ANY' as effective filter
        """
        is_premium, _ = await PremiumGuard.check_premium_status(user_id, is_guest)
        free_value = PREMIUM_FEATURES[PremiumFeature.COUNTRY_FILTER]["free_value"]
        
        if is_premium:
            return True, "Premium filter applied", requested_filter
        
        if requested_filter == free_value:
            return True, "Free filter applied", requested_filter
        
        # Non-premium trying to use premium filter - fall back to free
        return False, f"Country filter requires premium. Using '{free_value}' instead.", free_value
    
    @staticmethod
    async def validate_camera_filter(
        user_id: str, 
        requested_filter: str,
        is_guest: bool = False
    ) -> Tuple[bool, str, str]:
        """
        Validate camera filter selection.
        
        Returns: (allowed, message, effective_filter)
        """
        is_premium, _ = await PremiumGuard.check_premium_status(user_id, is_guest)
        free_filters = PREMIUM_FEATURES[PremiumFeature.CAMERA_FILTERS]["free_filters"]
        
        if is_premium:
            return True, "Premium filter applied", requested_filter
        
        if requested_filter in free_filters:
            return True, "Free filter applied", requested_filter
        
        # Non-premium trying to use premium filter - fall back to 'none'
        return False, f"This camera filter requires premium. Using 'none' instead.", "none"
    
    @staticmethod
    async def validate_game_access(
        user_id: str,
        game_type: str,
        is_guest: bool = False
    ) -> Tuple[bool, str]:
        """
        Validate if user can start a mini-game.
        
        Returns: (allowed, message)
        """
        is_premium, _ = await PremiumGuard.check_premium_status(user_id, is_guest)
        
        if is_premium:
            return True, "Game access granted"
        
        return False, f"Mini-games require premium. Upgrade to play {game_type}."
    
    @staticmethod
    def get_user_features(is_premium: bool) -> Dict[str, bool]:
        """
        Get a map of features and their availability for the user.
        
        Returns: Dict mapping feature names to availability
        """
        features = {}
        for feature, config in PREMIUM_FEATURES.items():
            if config.get("requires_premium", False):
                features[feature.value] = is_premium
            else:
                features[feature.value] = True
        return features
    
    @staticmethod
    def get_feature_info(feature: PremiumFeature) -> Dict:
        """Get information about a specific feature"""
        return PREMIUM_FEATURES.get(feature, {})


# Singleton instance
premium_guard = PremiumGuard()
