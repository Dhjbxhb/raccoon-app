from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel

class FeudQuestion(BaseModel):
    """A question in Raccoon Feud"""
    question_id: str
    question: str
    answers: List[dict]  # [{answer: str, points: int, revealed: bool}]
    
class FeudGame(BaseModel):
    """Raccoon Feud game state"""
    game_id: str
    session_id: str
    current_question: Optional[FeudQuestion] = None
    question_index: int = 0
    player1_id: str
    player2_id: str
    player1_score: int = 0
    player2_score: int = 0
    player1_strikes: int = 0
    player2_strikes: int = 0
    current_player: str  # who's turn to guess
    status: str = "waiting"  # waiting, active, finished
    created_at: str
    finished_at: Optional[str] = None
    winner_id: Optional[str] = None

class TruthOrDareGame(BaseModel):
    """Truth or Dare game state"""
    game_id: str
    session_id: str
    player1_id: str
    player2_id: str
    current_player: str  # who the bottle points to
    current_choice: Optional[str] = None  # "truth" or "dare"
    current_question: Optional[str] = None  # the truth/dare from opponent
    waiting_for_response: bool = False
    status: str = "waiting"  # waiting, spinning, choosing, answering, finished
    rounds_played: int = 0
    created_at: str
    finished_at: Optional[str] = None
