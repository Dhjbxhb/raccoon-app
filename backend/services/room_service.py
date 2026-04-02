"""
Private Room Service
- Room creation (premium only)
- Room joining via code
- Player management (2-4 players)
- Group matchmaking
"""

import random
import string
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# In-memory storage for rooms
active_rooms: Dict[str, dict] = {}
player_rooms: Dict[str, str] = {}  # player_id -> room_code

def generate_room_code() -> str:
    """Generate unique 5-character room code"""
    chars = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(random.choices(chars, k=5))
        if code not in active_rooms:
            return code

def create_room(creator_id: str, creator_username: str, is_premium: bool) -> dict:
    """Create a new private room (premium only)"""
    if not is_premium:
        return {'error': 'Only premium users can create rooms'}
    
    # Check if already in a room
    if creator_id in player_rooms:
        return {'error': 'You are already in a room'}
    
    room_code = generate_room_code()
    room = {
        'room_id': str(uuid.uuid4()),
        'code': room_code,
        'creator_id': creator_id,
        'players': [{
            'id': creator_id,
            'username': creator_username,
            'is_creator': True,
            'joined_at': datetime.now(timezone.utc).isoformat()
        }],
        'max_players': 4,
        'status': 'waiting',  # waiting, in_game, matching, matched
        'current_game': None,
        'game_state': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    active_rooms[room_code] = room
    player_rooms[creator_id] = room_code
    
    logger.info(f"Room {room_code} created by {creator_username}")
    
    return {
        'success': True,
        'room': get_room_state(room)
    }

def join_room(room_code: str, player_id: str, player_username: str) -> dict:
    """Join an existing room"""
    room_code = room_code.upper()
    
    # Check if already in a room
    if player_id in player_rooms:
        existing_code = player_rooms[player_id]
        if existing_code == room_code:
            # Already in this room
            room = active_rooms.get(room_code)
            if room:
                return {'success': True, 'room': get_room_state(room)}
        return {'error': 'You are already in another room'}
    
    room = active_rooms.get(room_code)
    if not room:
        return {'error': 'Room not found'}
    
    if len(room['players']) >= room['max_players']:
        return {'error': 'Room is full'}
    
    if room['status'] not in ['waiting', 'in_game']:
        return {'error': 'Room is not accepting players'}
    
    # Add player
    room['players'].append({
        'id': player_id,
        'username': player_username,
        'is_creator': False,
        'joined_at': datetime.now(timezone.utc).isoformat()
    })
    
    player_rooms[player_id] = room_code
    
    logger.info(f"Player {player_username} joined room {room_code}")
    
    return {
        'success': True,
        'room': get_room_state(room)
    }

def leave_room(player_id: str) -> dict:
    """Leave current room"""
    room_code = player_rooms.get(player_id)
    if not room_code:
        return {'error': 'Not in a room'}
    
    room = active_rooms.get(room_code)
    if not room:
        del player_rooms[player_id]
        return {'error': 'Room not found'}
    
    # Remove player
    room['players'] = [p for p in room['players'] if p['id'] != player_id]
    del player_rooms[player_id]
    
    # If room is empty or creator left, destroy room
    if len(room['players']) == 0:
        del active_rooms[room_code]
        logger.info(f"Room {room_code} destroyed (empty)")
        return {'success': True, 'room_destroyed': True}
    
    # If creator left, assign new creator
    creator_exists = any(p['is_creator'] for p in room['players'])
    if not creator_exists and room['players']:
        room['players'][0]['is_creator'] = True
    
    logger.info(f"Player left room {room_code}")
    
    return {
        'success': True,
        'room': get_room_state(room)
    }

def get_room(room_code: str) -> Optional[dict]:
    """Get room by code"""
    return active_rooms.get(room_code.upper())

def get_player_room(player_id: str) -> Optional[dict]:
    """Get room for a player"""
    room_code = player_rooms.get(player_id)
    if room_code:
        return active_rooms.get(room_code)
    return None

def get_room_state(room: dict) -> dict:
    """Get sanitized room state for clients"""
    return {
        'room_id': room['room_id'],
        'code': room['code'],
        'players': room['players'],
        'player_count': len(room['players']),
        'max_players': room['max_players'],
        'status': room['status'],
        'current_game': room['current_game'],
        'is_full': len(room['players']) >= room['max_players']
    }

def start_room_game(room_code: str, game_type: str, player_id: str) -> dict:
    """Start a game inside the room"""
    room = active_rooms.get(room_code)
    if not room:
        return {'error': 'Room not found'}
    
    # Only creator can start games
    creator = next((p for p in room['players'] if p['is_creator']), None)
    if not creator or creator['id'] != player_id:
        return {'error': 'Only room creator can start games'}
    
    if len(room['players']) < 2:
        return {'error': 'Need at least 2 players to start a game'}
    
    room['status'] = 'in_game'
    room['current_game'] = game_type
    
    logger.info(f"Game {game_type} started in room {room_code}")
    
    return {
        'success': True,
        'game_type': game_type,
        'room': get_room_state(room)
    }

def end_room_game(room_code: str) -> dict:
    """End the current game in room"""
    room = active_rooms.get(room_code)
    if not room:
        return {'error': 'Room not found'}
    
    room['status'] = 'waiting'
    room['current_game'] = None
    room['game_state'] = None
    
    return {
        'success': True,
        'room': get_room_state(room)
    }

def start_group_matching(room_code: str, player_id: str) -> dict:
    """Start matchmaking for the entire room as a group"""
    room = active_rooms.get(room_code)
    if not room:
        return {'error': 'Room not found'}
    
    # Only creator can start matching
    creator = next((p for p in room['players'] if p['is_creator']), None)
    if not creator or creator['id'] != player_id:
        return {'error': 'Only room creator can start matching'}
    
    room['status'] = 'matching'
    
    logger.info(f"Room {room_code} started group matching with {len(room['players'])} players")
    
    return {
        'success': True,
        'room': get_room_state(room),
        'group_size': len(room['players'])
    }

def stop_group_matching(room_code: str) -> dict:
    """Stop group matching"""
    room = active_rooms.get(room_code)
    if not room:
        return {'error': 'Room not found'}
    
    room['status'] = 'waiting'
    
    return {
        'success': True,
        'room': get_room_state(room)
    }

def get_room_players(room_code: str) -> List[dict]:
    """Get list of players in room"""
    room = active_rooms.get(room_code)
    if room:
        return room['players']
    return []

def is_player_in_room(player_id: str) -> bool:
    """Check if player is in any room"""
    return player_id in player_rooms

def get_player_room_code(player_id: str) -> Optional[str]:
    """Get room code for player"""
    return player_rooms.get(player_id)
