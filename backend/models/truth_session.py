"""
Truth or Dare Session Model - MongoDB schema for multiplayer game sessions
"""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import uuid


class TruthDareRound(BaseModel):
    """Record of a single round in Truth or Dare"""
    round_number: int
    selected_player_id: str
    selected_player_username: str
    asker_id: str
    asker_username: str
    action_type: Optional[str] = None  # "truth" or "dare"
    question_or_dare: Optional[str] = None
    completed: bool = False
    skipped: bool = False
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TruthSession(BaseModel):
    """
    Complete Truth or Dare game session stored in MongoDB
    Tracks game state with bottle spin mechanics
    """
    # Identifiers
    session_id: str  # Links to main match session
    game_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Players
    player1_id: str
    player2_id: str
    player1_username: str = "Player 1"
    player2_username: str = "Player 2"
    
    # Current round state
    selected_player_id: Optional[str] = None  # Who bottle points to (must answer)
    asker_id: Optional[str] = None  # Who asks the truth/dare
    selected_action_type: Optional[str] = None  # "truth" or "dare"
    current_question: Optional[str] = None
    
    # Game flow state
    round_state: str = "ready"  # ready, spinning, choosing, asking, answering, completed
    round_number: int = 0
    
    # Bottle spin tracking (for direction sync)
    spin_rotation: float = 0.0
    bottle_direction: Optional[str] = None  # "player1", "player2"
    
    # History
    rounds_history: List[TruthDareRound] = []
    
    # Status
    status: str = "active"  # active, paused, finished
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    finished_at: Optional[str] = None


class TruthSessionDB:
    """Database operations for Truth or Dare sessions"""
    
    def __init__(self, collection):
        self.collection = collection
    
    async def create(self, session: TruthSession) -> str:
        """Create new game session"""
        doc = session.model_dump()
        await self.collection.insert_one(doc)
        return session.game_id
    
    async def get_by_game_id(self, game_id: str) -> Optional[dict]:
        """Get session by game ID"""
        return await self.collection.find_one(
            {'game_id': game_id},
            {'_id': 0}
        )
    
    async def get_by_session_id(self, session_id: str) -> Optional[dict]:
        """Get active game for a match session"""
        return await self.collection.find_one(
            {'session_id': session_id, 'status': 'active'},
            {'_id': 0}
        )
    
    async def update(self, game_id: str, updates: dict) -> bool:
        """Update game session"""
        updates['updated_at'] = datetime.now(timezone.utc).isoformat()
        result = await self.collection.update_one(
            {'game_id': game_id},
            {'$set': updates}
        )
        return result.modified_count > 0
    
    async def add_round(self, game_id: str, round_data: TruthDareRound) -> bool:
        """Add completed round to history"""
        result = await self.collection.update_one(
            {'game_id': game_id},
            {
                '$push': {'rounds_history': round_data.model_dump()},
                '$inc': {'round_number': 1},
                '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
            }
        )
        return result.modified_count > 0
    
    async def finish_game(self, game_id: str) -> bool:
        """Mark game as finished"""
        return await self.update(game_id, {
            'status': 'finished',
            'finished_at': datetime.now(timezone.utc).isoformat()
        })
    
    async def get_player_history(self, player_id: str, limit: int = 20) -> List[dict]:
        """Get game history for a player"""
        cursor = self.collection.find(
            {
                '$or': [{'player1_id': player_id}, {'player2_id': player_id}],
                'status': 'finished'
            },
            {'_id': 0}
        ).sort('finished_at', -1).limit(limit)
        return await cursor.to_list(length=limit)
