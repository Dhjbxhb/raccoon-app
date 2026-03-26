"""
Feud Session Model - MongoDB schema for multiplayer game sessions
"""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import uuid


class FeudAnswerState(BaseModel):
    """State of a single answer during gameplay"""
    answer_text: str
    points: int
    revealed: bool = False
    guessed_by: Optional[str] = None  # player_id who revealed this
    guessed_at: Optional[str] = None


class FeudQuestionState(BaseModel):
    """State of current question during gameplay"""
    question_id: str
    question_text: str
    category: str = "general"
    answers: List[FeudAnswerState]
    total_points: int = 0
    revealed_count: int = 0


class FeudGuessRecord(BaseModel):
    """Record of a single guess attempt"""
    player_id: str
    player_username: str
    guess: str
    correct: bool
    matched_answer: Optional[str] = None
    points_earned: int = 0
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class FeudSession(BaseModel):
    """
    Complete Feud game session stored in MongoDB
    Tracks full multiplayer game state with persistence
    """
    # Identifiers
    session_id: str  # Links to main match session
    game_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Players
    player1_id: str
    player2_id: str
    player1_username: str = "Player 1"
    player2_username: str = "Player 2"
    
    # Game progress
    current_round: int = 1
    total_rounds: int = 5
    current_question_id: Optional[str] = None
    current_question: Optional[Dict[str, Any]] = None
    
    # Answer tracking
    answers_submitted: List[FeudGuessRecord] = []
    revealed_answers: List[str] = []  # List of revealed answer texts
    
    # Scores
    player1_score: int = 0
    player2_score: int = 0
    player1_strikes: int = 0
    player2_strikes: int = 0
    player1_round_score: int = 0
    player2_round_score: int = 0
    
    # Turn management
    current_player_id: str = ""
    is_steal_attempt: bool = False
    
    # Game status
    game_status: str = "pending"  # pending, active, finished, cancelled
    winner_id: Optional[str] = None
    winner_username: Optional[str] = None
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class FeudSessionDB:
    """Database operations for Feud sessions"""
    
    def __init__(self, collection):
        self.collection = collection
    
    async def create(self, session: FeudSession) -> str:
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
            {'session_id': session_id, 'game_status': {'$in': ['pending', 'active']}},
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
    
    async def add_guess(self, game_id: str, guess: FeudGuessRecord) -> bool:
        """Add a guess to the session"""
        result = await self.collection.update_one(
            {'game_id': game_id},
            {
                '$push': {'answers_submitted': guess.model_dump()},
                '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
            }
        )
        return result.modified_count > 0
    
    async def finish_game(self, game_id: str, winner_id: str, winner_username: str,
                          player1_score: int, player2_score: int) -> bool:
        """Mark game as finished with final results"""
        return await self.update(game_id, {
            'game_status': 'finished',
            'winner_id': winner_id,
            'winner_username': winner_username,
            'player1_score': player1_score,
            'player2_score': player2_score,
            'finished_at': datetime.now(timezone.utc).isoformat()
        })
    
    async def cancel_game(self, game_id: str, reason: str = "cancelled") -> bool:
        """Cancel an active game"""
        return await self.update(game_id, {
            'game_status': 'cancelled',
            'finished_at': datetime.now(timezone.utc).isoformat()
        })
    
    async def get_player_history(self, player_id: str, limit: int = 20) -> List[dict]:
        """Get game history for a player"""
        cursor = self.collection.find(
            {
                '$or': [{'player1_id': player_id}, {'player2_id': player_id}],
                'game_status': 'finished'
            },
            {'_id': 0}
        ).sort('finished_at', -1).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def get_leaderboard(self, limit: int = 10) -> List[dict]:
        """Get top players by total wins"""
        pipeline = [
            {'$match': {'game_status': 'finished'}},
            {'$group': {
                '_id': '$winner_id',
                'wins': {'$sum': 1},
                'username': {'$first': '$winner_username'}
            }},
            {'$match': {'_id': {'$ne': 'tie'}}},
            {'$sort': {'wins': -1}},
            {'$limit': limit}
        ]
        cursor = self.collection.aggregate(pipeline)
        return await cursor.to_list(length=limit)
