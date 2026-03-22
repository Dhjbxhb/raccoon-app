from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging
import uuid
import random

logger = logging.getLogger(__name__)

# Raccoon Feud question bank
FEUD_QUESTIONS = [
    {
        "question": "Name something people do on their phone while waiting",
        "answers": [
            {"answer": "social media", "points": 35, "revealed": False},
            {"answer": "text", "points": 25, "revealed": False},
            {"answer": "games", "points": 20, "revealed": False},
            {"answer": "browse internet", "points": 12, "revealed": False},
            {"answer": "music", "points": 8, "revealed": False}
        ]
    },
    {
        "question": "Name a popular pizza topping",
        "answers": [
            {"answer": "pepperoni", "points": 40, "revealed": False},
            {"answer": "cheese", "points": 25, "revealed": False},
            {"answer": "mushrooms", "points": 15, "revealed": False},
            {"answer": "sausage", "points": 12, "revealed": False},
            {"answer": "olives", "points": 8, "revealed": False}
        ]
    },
    {
        "question": "Name something you find in a wallet",
        "answers": [
            {"answer": "money", "points": 35, "revealed": False},
            {"answer": "credit cards", "points": 30, "revealed": False},
            {"answer": "id", "points": 20, "revealed": False},
            {"answer": "photos", "points": 10, "revealed": False},
            {"answer": "receipts", "points": 5, "revealed": False}
        ]
    },
    {
        "question": "Name a reason someone might be late to work",
        "answers": [
            {"answer": "traffic", "points": 35, "revealed": False},
            {"answer": "overslept", "points": 30, "revealed": False},
            {"answer": "car trouble", "points": 15, "revealed": False},
            {"answer": "kids", "points": 12, "revealed": False},
            {"answer": "weather", "points": 8, "revealed": False}
        ]
    },
    {
        "question": "Name something people collect",
        "answers": [
            {"answer": "stamps", "points": 30, "revealed": False},
            {"answer": "coins", "points": 28, "revealed": False},
            {"answer": "cards", "points": 20, "revealed": False},
            {"answer": "art", "points": 12, "revealed": False},
            {"answer": "toys", "points": 10, "revealed": False}
        ]
    },
    {
        "question": "Name a popular streaming service",
        "answers": [
            {"answer": "netflix", "points": 40, "revealed": False},
            {"answer": "youtube", "points": 25, "revealed": False},
            {"answer": "disney plus", "points": 15, "revealed": False},
            {"answer": "hulu", "points": 12, "revealed": False},
            {"answer": "amazon prime", "points": 8, "revealed": False}
        ]
    },
    {
        "question": "Name a color that cars come in",
        "answers": [
            {"answer": "black", "points": 35, "revealed": False},
            {"answer": "white", "points": 28, "revealed": False},
            {"answer": "red", "points": 18, "revealed": False},
            {"answer": "blue", "points": 12, "revealed": False},
            {"answer": "silver", "points": 7, "revealed": False}
        ]
    },
    {
        "question": "Name a social media platform",
        "answers": [
            {"answer": "instagram", "points": 35, "revealed": False},
            {"answer": "facebook", "points": 25, "revealed": False},
            {"answer": "tiktok", "points": 20, "revealed": False},
            {"answer": "twitter", "points": 12, "revealed": False},
            {"answer": "snapchat", "points": 8, "revealed": False}
        ]
    }
]

# Fuzzy matching helper
def fuzzy_match(guess: str, answer: str, threshold: float = 0.7) -> bool:
    """Check if guess matches answer using fuzzy matching"""
    guess = guess.lower().strip()
    answer = answer.lower().strip()
    
    # Exact match
    if guess == answer:
        return True
    
    # Check if guess is contained in answer or vice versa
    if guess in answer or answer in guess:
        return True
    
    # Simple word overlap check
    guess_words = set(guess.split())
    answer_words = set(answer.split())
    if guess_words & answer_words:  # If any words overlap
        return True
    
    # Try rapidfuzz if available
    try:
        from rapidfuzz import fuzz
        ratio = fuzz.ratio(guess, answer) / 100
        return ratio >= threshold
    except ImportError:
        # Fallback to basic similarity
        pass
    
    return False


class FeudGameService:
    """Manages Raccoon Feud games"""
    
    def __init__(self):
        self.active_games: Dict[str, dict] = {}  # session_id -> game_state
    
    def create_game(self, session_id: str, player1_id: str, player2_id: str) -> dict:
        """Create a new Feud game"""
        game_id = str(uuid.uuid4())
        
        # Pick random questions for this game
        questions = random.sample(FEUD_QUESTIONS, min(5, len(FEUD_QUESTIONS)))
        
        game = {
            'game_id': game_id,
            'session_id': session_id,
            'game_type': 'feud',
            'questions': questions,
            'current_question_index': 0,
            'current_question': self._prepare_question(questions[0]),
            'player1_id': player1_id,
            'player2_id': player2_id,
            'player1_score': 0,
            'player2_score': 0,
            'player1_strikes': 0,
            'player2_strikes': 0,
            'current_player': player1_id,  # Player 1 starts
            'status': 'active',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        self.active_games[session_id] = game
        logger.info(f"Created Feud game {game_id} for session {session_id}")
        return game
    
    def _prepare_question(self, question_data: dict) -> dict:
        """Prepare question with hidden answers"""
        return {
            'question_id': str(uuid.uuid4()),
            'question': question_data['question'],
            'answers': [
                {'answer': a['answer'], 'points': a['points'], 'revealed': False}
                for a in question_data['answers']
            ],
            'total_points': sum(a['points'] for a in question_data['answers'])
        }
    
    def submit_guess(self, session_id: str, player_id: str, guess: str) -> dict:
        """Submit a guess for the current question"""
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if game['status'] != 'active':
            return {'error': 'Game is not active'}
        
        if game['current_player'] != player_id:
            return {'error': 'Not your turn'}
        
        current_q = game['current_question']
        
        # Check if guess matches any unrevealed answer
        matched_answer = None
        for answer in current_q['answers']:
            if not answer['revealed'] and fuzzy_match(guess, answer['answer']):
                matched_answer = answer
                break
        
        result = {
            'player_id': player_id,
            'guess': guess,
            'correct': False,
            'answer': None,
            'points': 0,
            'strike': False
        }
        
        if matched_answer:
            # Correct guess!
            matched_answer['revealed'] = True
            points = matched_answer['points']
            
            if player_id == game['player1_id']:
                game['player1_score'] += points
            else:
                game['player2_score'] += points
            
            result['correct'] = True
            result['answer'] = matched_answer['answer']
            result['points'] = points
            
            # Reset strikes on correct answer
            if player_id == game['player1_id']:
                game['player1_strikes'] = 0
            else:
                game['player2_strikes'] = 0
        else:
            # Wrong guess - add strike
            result['strike'] = True
            if player_id == game['player1_id']:
                game['player1_strikes'] += 1
            else:
                game['player2_strikes'] += 1
        
        # Check if all answers revealed or 3 strikes
        all_revealed = all(a['revealed'] for a in current_q['answers'])
        player_strikes = game['player1_strikes'] if player_id == game['player1_id'] else game['player2_strikes']
        
        if all_revealed or player_strikes >= 3:
            # Move to next question
            result['question_ended'] = True
            result['reason'] = 'all_revealed' if all_revealed else 'strikes'
            self._next_question(game)
        else:
            # Switch turns
            game['current_player'] = game['player2_id'] if game['current_player'] == game['player1_id'] else game['player1_id']
        
        result['game_state'] = self._get_public_game_state(game)
        return result
    
    def _next_question(self, game: dict):
        """Move to the next question or end game"""
        game['current_question_index'] += 1
        
        # Reset strikes
        game['player1_strikes'] = 0
        game['player2_strikes'] = 0
        
        if game['current_question_index'] >= len(game['questions']):
            # Game over
            game['status'] = 'finished'
            game['finished_at'] = datetime.now(timezone.utc).isoformat()
            
            # Determine winner
            if game['player1_score'] > game['player2_score']:
                game['winner_id'] = game['player1_id']
            elif game['player2_score'] > game['player1_score']:
                game['winner_id'] = game['player2_id']
            else:
                game['winner_id'] = 'tie'
        else:
            # Next question
            game['current_question'] = self._prepare_question(
                game['questions'][game['current_question_index']]
            )
            # Alternate who starts each question
            game['current_player'] = game['player2_id'] if game['current_question_index'] % 2 else game['player1_id']
    
    def _get_public_game_state(self, game: dict) -> dict:
        """Get game state safe to send to clients"""
        return {
            'game_id': game['game_id'],
            'game_type': 'feud',
            'current_question': {
                'question': game['current_question']['question'],
                'answers': [
                    {'answer': a['answer'] if a['revealed'] else '???', 
                     'points': a['points'] if a['revealed'] else '?',
                     'revealed': a['revealed']}
                    for a in game['current_question']['answers']
                ],
                'total_points': game['current_question']['total_points']
            },
            'question_number': game['current_question_index'] + 1,
            'total_questions': len(game['questions']),
            'player1_id': game['player1_id'],
            'player2_id': game['player2_id'],
            'player1_score': game['player1_score'],
            'player2_score': game['player2_score'],
            'player1_strikes': game['player1_strikes'],
            'player2_strikes': game['player2_strikes'],
            'current_player': game['current_player'],
            'status': game['status'],
            'winner_id': game.get('winner_id')
        }
    
    def get_game(self, session_id: str) -> Optional[dict]:
        """Get game by session"""
        game = self.active_games.get(session_id)
        if game:
            return self._get_public_game_state(game)
        return None
    
    def end_game(self, session_id: str) -> Optional[dict]:
        """End and cleanup game"""
        game = self.active_games.pop(session_id, None)
        if game:
            game['status'] = 'ended'
            return self._get_public_game_state(game)
        return None


class TruthOrDareService:
    """Manages Truth or Dare games"""
    
    def __init__(self):
        self.active_games: Dict[str, dict] = {}
    
    def create_game(self, session_id: str, player1_id: str, player2_id: str) -> dict:
        """Create a new Truth or Dare game"""
        game_id = str(uuid.uuid4())
        
        game = {
            'game_id': game_id,
            'session_id': session_id,
            'game_type': 'truth_or_dare',
            'player1_id': player1_id,
            'player2_id': player2_id,
            'current_player': None,  # Will be set after spin
            'asker': None,  # The person asking truth/dare
            'current_choice': None,
            'current_question': None,
            'waiting_for_response': False,
            'status': 'ready',  # ready, spinning, choosing, asking, answering
            'rounds_played': 0,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        self.active_games[session_id] = game
        logger.info(f"Created Truth or Dare game {game_id} for session {session_id}")
        return self._get_public_state(game)
    
    def spin_bottle(self, session_id: str, player_id: str) -> dict:
        """Spin the bottle to select who answers"""
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if game['status'] not in ['ready', 'answering']:
            return {'error': 'Cannot spin now'}
        
        # Random spin result
        game['current_player'] = random.choice([game['player1_id'], game['player2_id']])
        game['asker'] = game['player2_id'] if game['current_player'] == game['player1_id'] else game['player1_id']
        game['status'] = 'choosing'
        game['current_choice'] = None
        game['current_question'] = None
        
        return {
            'action': 'spin_result',
            'selected_player': game['current_player'],
            'asker': game['asker'],
            'game_state': self._get_public_state(game)
        }
    
    def choose_truth_or_dare(self, session_id: str, player_id: str, choice: str) -> dict:
        """Player chooses truth or dare"""
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if game['status'] != 'choosing':
            return {'error': 'Not in choosing phase'}
        
        if game['current_player'] != player_id:
            return {'error': 'Not your turn to choose'}
        
        if choice not in ['truth', 'dare']:
            return {'error': 'Invalid choice'}
        
        game['current_choice'] = choice
        game['status'] = 'asking'
        
        return {
            'action': 'choice_made',
            'choice': choice,
            'asker': game['asker'],
            'game_state': self._get_public_state(game)
        }
    
    def submit_question(self, session_id: str, player_id: str, question: str) -> dict:
        """Asker submits their truth/dare question"""
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if game['status'] != 'asking':
            return {'error': 'Not in asking phase'}
        
        if game['asker'] != player_id:
            return {'error': 'You are not the asker'}
        
        game['current_question'] = question
        game['status'] = 'answering'
        
        return {
            'action': 'question_submitted',
            'question': question,
            'choice': game['current_choice'],
            'answerer': game['current_player'],
            'game_state': self._get_public_state(game)
        }
    
    def complete_round(self, session_id: str, player_id: str) -> dict:
        """Mark round as complete and ready for next spin"""
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        game['rounds_played'] += 1
        game['status'] = 'ready'
        game['current_choice'] = None
        game['current_question'] = None
        
        return {
            'action': 'round_complete',
            'rounds_played': game['rounds_played'],
            'game_state': self._get_public_state(game)
        }
    
    def _get_public_state(self, game: dict) -> dict:
        """Get game state safe to send to clients"""
        return {
            'game_id': game['game_id'],
            'game_type': 'truth_or_dare',
            'player1_id': game['player1_id'],
            'player2_id': game['player2_id'],
            'current_player': game['current_player'],
            'asker': game['asker'],
            'current_choice': game['current_choice'],
            'current_question': game['current_question'],
            'status': game['status'],
            'rounds_played': game['rounds_played']
        }
    
    def get_game(self, session_id: str) -> Optional[dict]:
        """Get game by session"""
        game = self.active_games.get(session_id)
        if game:
            return self._get_public_state(game)
        return None
    
    def end_game(self, session_id: str) -> Optional[dict]:
        """End and cleanup game"""
        return self.active_games.pop(session_id, None)


# Global service instances
feud_service = FeudGameService()
truth_or_dare_service = TruthOrDareService()
