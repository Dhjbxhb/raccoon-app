"""
Stats Service - Real-time user statistics tracking for the Raccoon App.

Handles:
- Session count tracking
- Time spent tracking
- Games played/won tracking
- Platform usage time (heartbeat-based)

All stats are persisted to MongoDB and retrieved in real-time.
"""

from datetime import datetime, timezone
import logging
from typing import Optional, Tuple, Dict, Any
from services.db_service import get_users_collection, get_guests_collection, get_sessions_collection

logger = logging.getLogger(__name__)


class StatsService:
    """Service for tracking and updating user statistics"""
    
    def __init__(self):
        # In-memory tracking for active sessions (user_id -> session_start_time)
        self._active_sessions: Dict[str, datetime] = {}
        # In-memory tracking for platform time (user_id -> last_heartbeat_time)
        self._platform_heartbeats: Dict[str, datetime] = {}
    
    async def get_user_stats(self, user_id: str, is_guest: bool = False) -> Dict[str, Any]:
        """
        Get real user stats from database.
        
        Returns dict with:
        - total_sessions: int
        - total_time_spent: int (seconds)
        - games_played: int
        - games_won: int
        """
        try:
            if is_guest:
                collection = get_guests_collection()
                user = await collection.find_one(
                    {"guest_id": user_id},
                    {"_id": 0, "total_sessions": 1, "total_time_spent": 1, 
                     "games_played": 1, "games_won": 1}
                )
            else:
                collection = get_users_collection()
                user = await collection.find_one(
                    {"user_id": user_id},
                    {"_id": 0, "total_sessions": 1, "total_time_spent": 1,
                     "games_played": 1, "games_won": 1}
                )
            
            if not user:
                return {
                    "total_sessions": 0,
                    "total_time_spent": 0,
                    "games_played": 0,
                    "games_won": 0
                }
            
            return {
                "total_sessions": user.get("total_sessions", 0),
                "total_time_spent": user.get("total_time_spent", 0),
                "games_played": user.get("games_played", 0),
                "games_won": user.get("games_won", 0)
            }
        except Exception as e:
            logger.error(f"Error getting user stats: {e}")
            return {
                "total_sessions": 0,
                "total_time_spent": 0,
                "games_played": 0,
                "games_won": 0
            }
    
    async def increment_session_count(self, user_id: str, is_guest: bool = False) -> bool:
        """Increment user's session count by 1"""
        try:
            if is_guest:
                collection = get_guests_collection()
                result = await collection.update_one(
                    {"guest_id": user_id},
                    {"$inc": {"total_sessions": 1}}
                )
            else:
                collection = get_users_collection()
                result = await collection.update_one(
                    {"user_id": user_id},
                    {"$inc": {"total_sessions": 1}}
                )
            
            if result.modified_count > 0:
                logger.debug(f"Incremented session count for user {user_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error incrementing session count: {e}")
            return False
    
    async def add_time_spent(self, user_id: str, seconds: int, is_guest: bool = False) -> bool:
        """Add time spent to user's total"""
        try:
            if seconds <= 0:
                return False
                
            if is_guest:
                collection = get_guests_collection()
                result = await collection.update_one(
                    {"guest_id": user_id},
                    {"$inc": {"total_time_spent": seconds}}
                )
            else:
                collection = get_users_collection()
                result = await collection.update_one(
                    {"user_id": user_id},
                    {"$inc": {"total_time_spent": seconds}}
                )
            
            if result.modified_count > 0:
                logger.debug(f"Added {seconds}s to user {user_id}'s time spent")
                return True
            return False
        except Exception as e:
            logger.error(f"Error adding time spent: {e}")
            return False
    
    async def increment_games_played(self, user_id: str, is_guest: bool = False) -> bool:
        """Increment user's games played count by 1"""
        try:
            if is_guest:
                collection = get_guests_collection()
                result = await collection.update_one(
                    {"guest_id": user_id},
                    {"$inc": {"games_played": 1}}
                )
            else:
                collection = get_users_collection()
                result = await collection.update_one(
                    {"user_id": user_id},
                    {"$inc": {"games_played": 1}}
                )
            
            if result.modified_count > 0:
                logger.debug(f"Incremented games played for user {user_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error incrementing games played: {e}")
            return False
    
    async def increment_games_won(self, user_id: str, is_guest: bool = False) -> bool:
        """Increment user's games won count by 1"""
        try:
            if is_guest:
                collection = get_guests_collection()
                result = await collection.update_one(
                    {"guest_id": user_id},
                    {"$inc": {"games_won": 1}}
                )
            else:
                collection = get_users_collection()
                result = await collection.update_one(
                    {"user_id": user_id},
                    {"$inc": {"games_won": 1}}
                )
            
            if result.modified_count > 0:
                logger.debug(f"Incremented games won for user {user_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error incrementing games won: {e}")
            return False
    
    # ==========================================
    # Platform Time Tracking (Heartbeat-based)
    # ==========================================
    
    def start_platform_session(self, user_id: str):
        """Mark user as active on platform (called on connect/authenticate)"""
        self._platform_heartbeats[user_id] = datetime.now(timezone.utc)
        logger.debug(f"Platform session started for user {user_id}")
    
    async def process_heartbeat(self, user_id: str, is_guest: bool = False) -> int:
        """
        Process heartbeat from client - updates time spent.
        Called periodically (e.g., every 30 seconds) by frontend.
        
        Returns the seconds added this heartbeat.
        """
        now = datetime.now(timezone.utc)
        last_heartbeat = self._platform_heartbeats.get(user_id)
        
        if not last_heartbeat:
            # First heartbeat - start tracking
            self._platform_heartbeats[user_id] = now
            return 0
        
        # Calculate time since last heartbeat (max 60 seconds to prevent abuse)
        delta = (now - last_heartbeat).total_seconds()
        seconds_to_add = min(int(delta), 60)  # Cap at 60 seconds per heartbeat
        
        if seconds_to_add > 0:
            await self.add_time_spent(user_id, seconds_to_add, is_guest)
            self._platform_heartbeats[user_id] = now
        
        return seconds_to_add
    
    async def end_platform_session(self, user_id: str, is_guest: bool = False) -> int:
        """
        End platform session and persist final time delta.
        Called on disconnect.
        
        Returns the total seconds added in this final update.
        """
        now = datetime.now(timezone.utc)
        last_heartbeat = self._platform_heartbeats.get(user_id)
        
        if last_heartbeat:
            delta = (now - last_heartbeat).total_seconds()
            seconds_to_add = min(int(delta), 120)  # Cap at 2 minutes for final update
            
            if seconds_to_add > 0:
                await self.add_time_spent(user_id, seconds_to_add, is_guest)
            
            # Clean up
            del self._platform_heartbeats[user_id]
            logger.debug(f"Platform session ended for user {user_id}, added {seconds_to_add}s")
            return seconds_to_add
        
        return 0
    
    # ==========================================
    # Match Session Tracking
    # ==========================================
    
    def start_match_session(self, user_id: str):
        """Mark start of a match session for time tracking"""
        self._active_sessions[user_id] = datetime.now(timezone.utc)
    
    async def end_match_session(self, user_id: str, is_guest: bool = False) -> int:
        """
        End match session, calculate duration, update stats.
        
        Returns session duration in seconds.
        """
        start_time = self._active_sessions.get(user_id)
        if not start_time:
            return 0
        
        now = datetime.now(timezone.utc)
        duration_seconds = int((now - start_time).total_seconds())
        
        # Clean up
        if user_id in self._active_sessions:
            del self._active_sessions[user_id]
        
        # Increment session count
        await self.increment_session_count(user_id, is_guest)
        
        # Add session time to total time spent
        if duration_seconds > 0:
            await self.add_time_spent(user_id, duration_seconds, is_guest)
        
        logger.info(f"Match session ended for {user_id}: {duration_seconds}s")
        return duration_seconds
    
    # ==========================================
    # Computed Stats from Sessions Collection
    # ==========================================
    
    async def recalculate_user_stats(self, user_id: str, is_guest: bool = False) -> Dict[str, int]:
        """
        Recalculate user stats from sessions collection.
        Useful for data integrity checks or migration.
        """
        sessions = get_sessions_collection()
        
        # Count sessions where user was participant
        session_count = await sessions.count_documents({
            "$or": [
                {"user1_id": user_id},
                {"user2_id": user_id}
            ]
        })
        
        # Sum all session durations
        pipeline = [
            {"$match": {
                "$or": [
                    {"user1_id": user_id},
                    {"user2_id": user_id}
                ]
            }},
            {"$group": {
                "_id": None,
                "total_time": {"$sum": "$duration_seconds"}
            }}
        ]
        
        cursor = sessions.aggregate(pipeline)
        result = await cursor.to_list(length=1)
        total_time = result[0]["total_time"] if result else 0
        
        # Update user record
        if is_guest:
            collection = get_guests_collection()
            await collection.update_one(
                {"guest_id": user_id},
                {"$set": {
                    "total_sessions": session_count,
                    "total_time_spent": total_time
                }}
            )
        else:
            collection = get_users_collection()
            await collection.update_one(
                {"user_id": user_id},
                {"$set": {
                    "total_sessions": session_count,
                    "total_time_spent": total_time
                }}
            )
        
        return {
            "total_sessions": session_count,
            "total_time_spent": total_time
        }


# Singleton instance
stats_service = StatsService()
