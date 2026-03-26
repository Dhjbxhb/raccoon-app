"""
Matching Service - Real-time user pairing queue with session management.

Features:
- Duplicate entry prevention
- Progressive filter relaxation for fast matching (2-5 seconds)
- Proper cleanup on disconnect/skip/cancel
- Session lifecycle tracking
- Queue statistics
"""

from typing import Dict, List, Optional, Set
from datetime import datetime, timezone
from dataclasses import dataclass, field
import logging
import uuid
import threading

logger = logging.getLogger(__name__)


@dataclass
class QueueEntry:
    """Represents a user in the matching queue"""
    user_id: str
    socket_id: str
    username: str
    gender: str
    country: str
    country_code: str
    is_guest: bool
    is_premium: bool
    gender_filter: str
    country_filter: str
    joined_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass  
class ActiveSession:
    """Represents an active match session"""
    session_id: str
    user1_id: str
    user2_id: str
    user1_socket: str
    user2_socket: str
    user1_data: dict
    user2_data: dict
    created_at: datetime
    messages: List[dict] = field(default_factory=list)
    game_active: Optional[str] = None


class MatchingQueue:
    """
    Thread-safe matching queue with optimized real-time pairing.
    
    Key features:
    - Prevents duplicate queue entries
    - Removes stale entries on disconnect
    - Progressive filter relaxation for fast matching
    - Clean session lifecycle management
    """
    
    def __init__(self):
        self._lock = threading.RLock()
        
        # Queue structure: {gender_filter: [QueueEntry]}
        self.queues: Dict[str, List[QueueEntry]] = {
            'male': [],
            'female': [],
            'any': []
        }
        
        # Active sessions: {session_id: ActiveSession}
        self.active_sessions: Dict[str, ActiveSession] = {}
        
        # User to session mapping: {user_id: session_id}
        self.user_sessions: Dict[str, str] = {}
        
        # Socket to user mapping: {socket_id: user_id}
        self.socket_users: Dict[str, str] = {}
        
        # Users currently in queue: {user_id}
        self.users_in_queue: Set[str] = set()
        
        logger.info("MatchingQueue initialized")
    
    def add_to_queue(
        self, 
        user_id: str, 
        user_data: dict, 
        gender_filter: str = 'any', 
        country_filter: str = 'ANY'
    ) -> Optional[dict]:
        """
        Add user to queue and try to find a match.
        
        Args:
            user_id: Unique user identifier
            user_data: User profile data including socket_id
            gender_filter: Preferred match gender ('male', 'female', 'any')
            country_filter: Preferred match country code or 'ANY'
            
        Returns:
            Match session data if match found, None if added to queue
        """
        with self._lock:
            # Prevent duplicate entries
            if user_id in self.users_in_queue:
                logger.warning(f"User {user_id} already in queue, removing old entry")
                self._remove_from_queue_unsafe(user_id)
            
            # Check if user already in active session
            if user_id in self.user_sessions:
                logger.warning(f"User {user_id} already in active session")
                return None
            
            # Normalize filters
            gender_filter = (gender_filter or 'any').lower()
            if gender_filter not in ['male', 'female', 'any']:
                gender_filter = 'any'
            
            country_filter = (country_filter or 'ANY').upper()
            
            # Create queue entry
            entry = QueueEntry(
                user_id=user_id,
                socket_id=user_data.get('socket_id', ''),
                username=user_data.get('username', 'User'),
                gender=user_data.get('gender', 'any'),
                country=user_data.get('country', 'Unknown'),
                country_code=user_data.get('country_code', ''),
                is_guest=user_data.get('is_guest', bool(user_data.get('guest_id'))),
                is_premium=user_data.get('premium_status', user_data.get('premium', False)),
                gender_filter=gender_filter,
                country_filter=country_filter
            )
            
            # Track socket
            if entry.socket_id:
                self.socket_users[entry.socket_id] = user_id
            
            # Try to find a match using progressive relaxation
            match = self._find_match_progressive(entry)
            if match:
                return match
            
            # No match found, add to appropriate queue
            self.queues[gender_filter].append(entry)
            self.users_in_queue.add(user_id)
            
            logger.info(
                f"User {user_id} added to {gender_filter} queue. "
                f"Sizes: male={len(self.queues['male'])}, "
                f"female={len(self.queues['female'])}, "
                f"any={len(self.queues['any'])}"
            )
            
            return None
    
    def _find_match_progressive(self, entry: QueueEntry) -> Optional[dict]:
        """
        Progressive matching strategy for fast pairing (2-5 seconds target):
        
        1. Perfect match: Exact gender and country filters
        2. Relaxed country: Gender matched, any country
        3. Relaxed all: Any compatible user available
        """
        # Stage 1: Perfect match
        match = self._try_match(entry, strict_country=True, strict_gender=True)
        if match:
            logger.info(f"Perfect match found for {entry.user_id}")
            return match
        
        # Stage 2: Relaxed country
        if entry.country_filter != 'ANY':
            match = self._try_match(entry, strict_country=False, strict_gender=True)
            if match:
                logger.info(f"Relaxed country match found for {entry.user_id}")
                return match
        
        # Stage 3: Relaxed gender (match anyone)
        if entry.gender_filter != 'any':
            match = self._try_match(entry, strict_country=False, strict_gender=False)
            if match:
                logger.info(f"Relaxed all match found for {entry.user_id}")
                return match
        
        return None
    
    def _try_match(
        self, 
        entry: QueueEntry, 
        strict_country: bool = True, 
        strict_gender: bool = True
    ) -> Optional[dict]:
        """
        Try to find a compatible match in the queues.
        """
        # Determine which queues to search
        if strict_gender and entry.gender_filter != 'any':
            search_queues = [entry.gender_filter]
        else:
            search_queues = ['male', 'female', 'any']
        
        for queue_name in search_queues:
            queue = self.queues[queue_name]
            
            # Sort by wait time (oldest first) for fairness
            sorted_queue = sorted(queue, key=lambda x: x.joined_at)
            
            for potential_match in sorted_queue:
                if self._is_compatible(entry, potential_match, strict_country, strict_gender):
                    # Match found! Remove from queue
                    self._remove_entry_from_queue(potential_match)
                    
                    # Create session
                    return self._create_session(entry, potential_match)
        
        return None
    
    def _is_compatible(
        self,
        entry1: QueueEntry,
        entry2: QueueEntry,
        strict_country: bool,
        strict_gender: bool
    ) -> bool:
        """Check if two users are compatible for matching."""
        # Don't match with self
        if entry1.user_id == entry2.user_id:
            return False
        
        # Check gender compatibility
        if strict_gender:
            # Entry1 must accept entry2's gender
            if entry1.gender_filter != 'any' and entry1.gender_filter != entry2.gender:
                if entry2.gender != 'any':  # 'any' gender matches any filter
                    return False
            
            # Entry2 must accept entry1's gender
            if entry2.gender_filter != 'any' and entry2.gender_filter != entry1.gender:
                if entry1.gender != 'any':
                    return False
        
        # Check country compatibility
        if strict_country:
            # Entry1's country filter
            if entry1.country_filter != 'ANY':
                if entry1.country_filter != entry2.country_code:
                    return False
            
            # Entry2's country filter
            if entry2.country_filter != 'ANY':
                if entry2.country_filter != entry1.country_code:
                    return False
        
        return True
    
    def _create_session(self, user1: QueueEntry, user2: QueueEntry) -> dict:
        """Create a new match session."""
        session_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        session = ActiveSession(
            session_id=session_id,
            user1_id=user1.user_id,
            user2_id=user2.user_id,
            user1_socket=user1.socket_id,
            user2_socket=user2.socket_id,
            user1_data={
                'user_id': user1.user_id,
                'username': user1.username,
                'gender': user1.gender,
                'country': user1.country,
                'country_code': user1.country_code,
                'is_guest': user1.is_guest,
                'premium': user1.is_premium,
                'socket_id': user1.socket_id
            },
            user2_data={
                'user_id': user2.user_id,
                'username': user2.username,
                'gender': user2.gender,
                'country': user2.country,
                'country_code': user2.country_code,
                'is_guest': user2.is_guest,
                'premium': user2.is_premium,
                'socket_id': user2.socket_id
            },
            created_at=now
        )
        
        # Store session
        self.active_sessions[session_id] = session
        self.user_sessions[user1.user_id] = session_id
        self.user_sessions[user2.user_id] = session_id
        
        logger.info(f"Session {session_id} created: {user1.user_id} <-> {user2.user_id}")
        
        # Return data for socket emission
        return {
            'session_id': session_id,
            'user1': session.user1_data,
            'user2': session.user2_data,
            'created_at': now.isoformat()
        }
    
    def _remove_entry_from_queue(self, entry: QueueEntry) -> None:
        """Remove a specific entry from all queues (internal use)."""
        for queue_name, queue in self.queues.items():
            for i, e in enumerate(queue):
                if e.user_id == entry.user_id:
                    queue.pop(i)
                    break
        
        self.users_in_queue.discard(entry.user_id)
        if entry.socket_id in self.socket_users:
            del self.socket_users[entry.socket_id]
    
    def _remove_from_queue_unsafe(self, user_id: str) -> bool:
        """Remove user from queue (no lock, internal use)."""
        removed = False
        for queue_name, queue in self.queues.items():
            for i, entry in enumerate(queue):
                if entry.user_id == user_id:
                    if entry.socket_id in self.socket_users:
                        del self.socket_users[entry.socket_id]
                    queue.pop(i)
                    removed = True
                    break
        
        self.users_in_queue.discard(user_id)
        return removed
    
    def remove_from_queue(self, user_id: str) -> bool:
        """Remove user from all queues."""
        with self._lock:
            removed = self._remove_from_queue_unsafe(user_id)
            if removed:
                logger.info(f"User {user_id} removed from queue")
            return removed
    
    def end_session(self, user_id: str, reason: str = 'disconnected') -> Optional[dict]:
        """
        End a user's active session.
        
        Args:
            user_id: ID of the user ending the session
            reason: Why session is ending (skipped, disconnected, blocked, etc.)
            
        Returns:
            Session data for DB storage, or None if no session
        """
        with self._lock:
            session_id = self.user_sessions.get(user_id)
            if not session_id:
                return None
            
            session = self.active_sessions.get(session_id)
            if not session:
                # Clean up orphaned mapping
                del self.user_sessions[user_id]
                return None
            
            # Calculate duration
            now = datetime.now(timezone.utc)
            duration = (now - session.created_at).total_seconds()
            
            # Get partner info
            if session.user1_id == user_id:
                partner_id = session.user2_id
            else:
                partner_id = session.user1_id
            
            # Prepare result data
            result = {
                'session_id': session_id,
                'partner_id': partner_id,
                'ended_by': user_id,
                'end_reason': reason,
                'duration_seconds': int(duration),
                'message_count': len(session.messages),
                'game_played': session.game_active,
                'session': {
                    'user1_id': session.user1_id,
                    'user2_id': session.user2_id,
                    'created_at': session.created_at.isoformat(),
                    'ended_at': now.isoformat()
                }
            }
            
            # Clean up session
            del self.active_sessions[session_id]
            
            # Clean up user mappings
            if session.user1_id in self.user_sessions:
                del self.user_sessions[session.user1_id]
            if session.user2_id in self.user_sessions:
                del self.user_sessions[session.user2_id]
            
            # Clean up socket mappings
            if session.user1_socket in self.socket_users:
                del self.socket_users[session.user1_socket]
            if session.user2_socket in self.socket_users:
                del self.socket_users[session.user2_socket]
            
            logger.info(f"Session {session_id} ended: {reason} by {user_id}")
            
            return result
    
    def get_session(self, user_id: str) -> Optional[dict]:
        """Get user's active session data."""
        with self._lock:
            session_id = self.user_sessions.get(user_id)
            if not session_id:
                return None
            
            session = self.active_sessions.get(session_id)
            if not session:
                return None
            
            return {
                'session_id': session.session_id,
                'user1': session.user1_data,
                'user2': session.user2_data,
                'created_at': session.created_at.isoformat(),
                'messages': session.messages,
                'game_active': session.game_active
            }
    
    def get_partner_socket(self, user_id: str) -> Optional[str]:
        """Get partner's socket ID for a user."""
        with self._lock:
            session_id = self.user_sessions.get(user_id)
            if not session_id:
                return None
            
            session = self.active_sessions.get(session_id)
            if not session:
                return None
            
            if session.user1_id == user_id:
                return session.user2_socket
            else:
                return session.user1_socket
    
    def update_socket_id(self, user_id: str, new_socket_id: str) -> None:
        """Update user's socket ID (for reconnection handling)."""
        with self._lock:
            session_id = self.user_sessions.get(user_id)
            if not session_id:
                return
            
            session = self.active_sessions.get(session_id)
            if not session:
                return
            
            # Update socket in session
            if session.user1_id == user_id:
                old_socket = session.user1_socket
                session.user1_socket = new_socket_id
                session.user1_data['socket_id'] = new_socket_id
            else:
                old_socket = session.user2_socket
                session.user2_socket = new_socket_id
                session.user2_data['socket_id'] = new_socket_id
            
            # Update socket mapping
            if old_socket in self.socket_users:
                del self.socket_users[old_socket]
            self.socket_users[new_socket_id] = user_id
    
    def add_message(self, user_id: str, message: dict) -> bool:
        """Add a message to the session."""
        with self._lock:
            session_id = self.user_sessions.get(user_id)
            if not session_id:
                return False
            
            session = self.active_sessions.get(session_id)
            if not session:
                return False
            
            session.messages.append(message)
            return True
    
    def set_game_active(self, user_id: str, game_type: str) -> bool:
        """Set active game for a session."""
        with self._lock:
            session_id = self.user_sessions.get(user_id)
            if not session_id:
                return False
            
            session = self.active_sessions.get(session_id)
            if not session:
                return False
            
            session.game_active = game_type
            return True
    
    def get_queue_position(self, user_id: str) -> Optional[int]:
        """Get user's position in their queue."""
        with self._lock:
            for queue in self.queues.values():
                for i, entry in enumerate(queue):
                    if entry.user_id == user_id:
                        return i + 1
            return None
    
    def get_queue_stats(self) -> dict:
        """Get current queue statistics."""
        with self._lock:
            return {
                'male_queue': len(self.queues['male']),
                'female_queue': len(self.queues['female']),
                'any_queue': len(self.queues['any']),
                'total_waiting': len(self.users_in_queue),
                'active_sessions': len(self.active_sessions)
            }
    
    def is_user_in_queue(self, user_id: str) -> bool:
        """Check if user is in queue."""
        with self._lock:
            return user_id in self.users_in_queue
    
    def is_user_in_session(self, user_id: str) -> bool:
        """Check if user is in active session."""
        with self._lock:
            return user_id in self.user_sessions
    
    def cleanup_stale_entries(self, max_age_seconds: int = 300) -> int:
        """Remove entries that have been in queue too long (cleanup job)."""
        with self._lock:
            now = datetime.now(timezone.utc)
            removed = 0
            
            for queue in self.queues.values():
                stale = [
                    entry for entry in queue 
                    if (now - entry.joined_at).total_seconds() > max_age_seconds
                ]
                for entry in stale:
                    self._remove_entry_from_queue(entry)
                    removed += 1
            
            if removed > 0:
                logger.info(f"Cleaned up {removed} stale queue entries")
            
            return removed


# Global queue instance
matching_queue = MatchingQueue()
