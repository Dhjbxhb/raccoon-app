"""
Raccoon Feud Game Models - MongoDB collections for game persistence
"""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class FeudAnswer(BaseModel):
    """A single answer in a Feud question"""
    answer: str
    points: int
    revealed: bool = False
    guessed_by: Optional[str] = None  # player_id who guessed this


class FeudQuestion(BaseModel):
    """A question in Raccoon Feud with its survey answers"""
    question_id: str
    question: str
    category: str = "general"
    answers: List[FeudAnswer]
    total_points: int = 0
    
    def __init__(self, **data):
        super().__init__(**data)
        if not self.total_points:
            self.total_points = sum(a.points for a in self.answers)


class FeudGameState(BaseModel):
    """Complete Feud game state - stored in MongoDB"""
    game_id: str
    session_id: str
    game_type: str = "feud"
    
    # Players
    player1_id: str
    player2_id: str
    player1_username: str = ""
    player2_username: str = ""
    
    # Scores
    player1_score: int = 0
    player2_score: int = 0
    player1_strikes: int = 0
    player2_strikes: int = 0
    
    # Game progress
    current_question_index: int = 0
    total_questions: int = 5
    current_player: str  # whose turn
    
    # Current question state
    current_question: Optional[Dict[str, Any]] = None
    
    # Game status
    status: str = "waiting"  # waiting, active, finished
    winner_id: Optional[str] = None
    winner_username: Optional[str] = None
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    finished_at: Optional[str] = None
    
    # History of guesses
    guess_history: List[Dict[str, Any]] = []


class FeudGameResult(BaseModel):
    """Final result of a Feud game - for leaderboard/stats"""
    game_id: str
    session_id: str
    player1_id: str
    player2_id: str
    player1_username: str
    player2_username: str
    player1_score: int
    player2_score: int
    winner_id: str
    winner_username: str
    questions_played: int
    duration_seconds: int
    created_at: str
    finished_at: str
