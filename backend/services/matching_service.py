from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

class MatchingQueue:
    """Manages matching queue for real-time user pairing"""
    
    def __init__(self):
        # Queue structure: {gender_filter: [user_data]}
        self.queues: Dict[str, List[dict]] = {
            'male': [],
            'female': [],
            'any': []
        }
        # Active sessions: {session_id: {user1_id, user2_id, ...}}
        self.active_sessions: Dict[str, dict] = {}
        # User to session mapping: {user_id: session_id}
        self.user_sessions: Dict[str, str] = {}
    
    def add_to_queue(self, user_id: str, user_data: dict, gender_filter: str = 'any', country_filter: str = 'ANY') -> Optional[dict]:
        """Add user to queue and try to find a match"""
        # Check if user already in a session
        if user_id in self.user_sessions:
            logger.warning(f"User {user_id} already in active session")
            return None
        
        # Normalize gender filter
        gender_filter = gender_filter.lower()
        if gender_filter not in ['male', 'female', 'any']:
            gender_filter = 'any'
        
        # Normalize country filter
        country_filter = country_filter.upper() if country_filter else 'ANY'
        
        user_data['joined_at'] = datetime.now(timezone.utc).isoformat()
        user_data['gender_filter'] = gender_filter
        user_data['country_filter'] = country_filter
        
        # Try to find a match first
        match = self._find_match(user_id, user_data)
        if match:
            return match
        
        # No match found, add to queue
        self.queues[gender_filter].append({
            'user_id': user_id,
            **user_data
        })
        
        logger.info(f"User {user_id} added to {gender_filter} queue. Queue size: {len(self.queues[gender_filter])}")
        return None
    
    def _find_match(self, user_id: str, user_data: dict) -> Optional[dict]:
        """Try to find a match for the user"""
        gender_filter = user_data['gender_filter']
        country_filter = user_data.get('country_filter', 'ANY')
        user_gender = user_data.get('gender', 'any')
        user_country = user_data.get('country', '')
        
        # Search order: specific gender queue first, then 'any' queue
        search_queues = [gender_filter]
        if gender_filter != 'any':
            search_queues.append('any')
        
        for queue_name in search_queues:
            queue = self.queues[queue_name]
            
            for i, potential_match in enumerate(queue):
                partner_id = potential_match['user_id']
                partner_gender = potential_match.get('gender', 'any')
                partner_filter = potential_match['gender_filter']
                partner_country = potential_match.get('country', '')
                partner_country_filter = potential_match.get('country_filter', 'ANY')
                
                # Don't match with self
                if partner_id == user_id:
                    continue
                
                # Check if gender preferences match
                user_matches_partner = (
                    gender_filter == 'any' or 
                    gender_filter == partner_gender or
                    partner_gender == 'any'
                )
                
                partner_matches_user = (
                    partner_filter == 'any' or 
                    partner_filter == user_gender or
                    user_gender == 'any'
                )
                
                # Check country preferences
                user_country_matches = (
                    country_filter == 'ANY' or
                    country_filter == partner_country or
                    not partner_country
                )
                
                partner_country_matches = (
                    partner_country_filter == 'ANY' or
                    partner_country_filter == user_country or
                    not user_country
                )
                
                if user_matches_partner and partner_matches_user and user_country_matches and partner_country_matches:
                    # Match found! Remove from queue
                    self.queues[queue_name].pop(i)
                    
                    # Create session
                    session = self._create_session(user_id, user_data, partner_id, potential_match)
                    logger.info(f"Match created: {user_id} <-> {partner_id}")
                    return session
        
        return None
    
    def _create_session(self, user1_id: str, user1_data: dict, user2_id: str, user2_data: dict) -> dict:
        """Create a new match session"""
        import uuid
        session_id = str(uuid.uuid4())
        
        session = {
            'session_id': session_id,
            'user1': {
                'user_id': user1_id,
                'username': user1_data.get('username'),
                'gender': user1_data.get('gender'),
                'country': user1_data.get('country'),
                'premium': user1_data.get('premium', False),
                'socket_id': user1_data.get('socket_id')
            },
            'user2': {
                'user_id': user2_id,
                'username': user2_data.get('username'),
                'gender': user2_data.get('gender'),
                'country': user2_data.get('country'),
                'premium': user2_data.get('premium', False),
                'socket_id': user2_data.get('socket_id')
            },
            'created_at': datetime.now(timezone.utc).isoformat(),
            'messages': []
        }
        
        self.active_sessions[session_id] = session
        self.user_sessions[user1_id] = session_id
        self.user_sessions[user2_id] = session_id
        
        return session
    
    def remove_from_queue(self, user_id: str) -> bool:
        """Remove user from all queues"""
        removed = False
        for queue_name, queue in self.queues.items():
            for i, user in enumerate(queue):
                if user['user_id'] == user_id:
                    queue.pop(i)
                    logger.info(f"User {user_id} removed from {queue_name} queue")
                    removed = True
                    break
        return removed
    
    def end_session(self, user_id: str) -> Optional[dict]:
        """End a user's active session"""
        session_id = self.user_sessions.get(user_id)
        if not session_id:
            return None
        
        session = self.active_sessions.get(session_id)
        if not session:
            return None
        
        # Get partner info
        user1_id = session['user1']['user_id']
        user2_id = session['user2']['user_id']
        partner_id = user2_id if user1_id == user_id else user1_id
        
        # Clean up
        del self.active_sessions[session_id]
        if user1_id in self.user_sessions:
            del self.user_sessions[user1_id]
        if user2_id in self.user_sessions:
            del self.user_sessions[user2_id]
        
        logger.info(f"Session {session_id} ended")
        
        return {
            'session_id': session_id,
            'partner_id': partner_id,
            'session': session
        }
    
    def get_session(self, user_id: str) -> Optional[dict]:
        """Get user's active session"""
        session_id = self.user_sessions.get(user_id)
        if session_id:
            return self.active_sessions.get(session_id)
        return None
    
    def get_partner_socket(self, user_id: str) -> Optional[str]:
        """Get partner's socket ID"""
        session = self.get_session(user_id)
        if not session:
            return None
        
        user1_id = session['user1']['user_id']
        if user1_id == user_id:
            return session['user2']['socket_id']
        else:
            return session['user1']['socket_id']
    
    def update_socket_id(self, user_id: str, socket_id: str):
        """Update user's socket ID in active session"""
        session = self.get_session(user_id)
        if session:
            if session['user1']['user_id'] == user_id:
                session['user1']['socket_id'] = socket_id
            elif session['user2']['user_id'] == user_id:
                session['user2']['socket_id'] = socket_id
    
    def get_queue_position(self, user_id: str) -> Optional[int]:
        """Get user's position in queue"""
        for queue in self.queues.values():
            for i, user in enumerate(queue):
                if user['user_id'] == user_id:
                    return i + 1
        return None

# Global queue instance
matching_queue = MatchingQueue()
