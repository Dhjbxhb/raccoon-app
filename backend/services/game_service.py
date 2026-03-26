from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone
import logging
import uuid
import random
import asyncio
from rapidfuzz import fuzz, process

logger = logging.getLogger(__name__)

# ============================================================
# RACCOON FEUD QUESTION BANK - Expanded with categories
# ============================================================

FEUD_QUESTIONS = [
    # === TECHNOLOGY ===
    {
        "question": "Name something people do on their phone while waiting",
        "category": "technology",
        "answers": [
            {"answer": "social media", "points": 35, "alt": ["instagram", "facebook", "tiktok", "scroll"]},
            {"answer": "text", "points": 25, "alt": ["message", "texting", "sms"]},
            {"answer": "games", "points": 20, "alt": ["play games", "gaming", "candy crush"]},
            {"answer": "browse internet", "points": 12, "alt": ["browse", "surf", "google"]},
            {"answer": "music", "points": 8, "alt": ["listen to music", "spotify", "songs"]}
        ]
    },
    {
        "question": "Name a popular streaming service",
        "category": "technology",
        "answers": [
            {"answer": "netflix", "points": 40, "alt": []},
            {"answer": "youtube", "points": 25, "alt": ["yt"]},
            {"answer": "disney plus", "points": 15, "alt": ["disney+", "disney"]},
            {"answer": "hulu", "points": 12, "alt": []},
            {"answer": "amazon prime", "points": 8, "alt": ["prime video", "prime"]}
        ]
    },
    {
        "question": "Name a social media platform",
        "category": "technology",
        "answers": [
            {"answer": "instagram", "points": 35, "alt": ["ig", "insta"]},
            {"answer": "facebook", "points": 25, "alt": ["fb", "meta"]},
            {"answer": "tiktok", "points": 20, "alt": ["tik tok"]},
            {"answer": "twitter", "points": 12, "alt": ["x", "tweets"]},
            {"answer": "snapchat", "points": 8, "alt": ["snap"]}
        ]
    },
    
    # === FOOD ===
    {
        "question": "Name a popular pizza topping",
        "category": "food",
        "answers": [
            {"answer": "pepperoni", "points": 40, "alt": []},
            {"answer": "cheese", "points": 25, "alt": ["extra cheese", "mozzarella"]},
            {"answer": "mushrooms", "points": 15, "alt": ["mushroom"]},
            {"answer": "sausage", "points": 12, "alt": ["italian sausage"]},
            {"answer": "olives", "points": 8, "alt": ["olive", "black olives"]}
        ]
    },
    {
        "question": "Name a breakfast food",
        "category": "food",
        "answers": [
            {"answer": "eggs", "points": 35, "alt": ["egg", "scrambled eggs", "fried eggs"]},
            {"answer": "bacon", "points": 28, "alt": []},
            {"answer": "pancakes", "points": 18, "alt": ["pancake"]},
            {"answer": "cereal", "points": 12, "alt": []},
            {"answer": "toast", "points": 7, "alt": ["bread"]}
        ]
    },
    {
        "question": "Name a fast food restaurant",
        "category": "food",
        "answers": [
            {"answer": "mcdonalds", "points": 40, "alt": ["mcdonald's", "mickey d's"]},
            {"answer": "burger king", "points": 22, "alt": ["bk"]},
            {"answer": "wendy's", "points": 18, "alt": ["wendys"]},
            {"answer": "taco bell", "points": 12, "alt": []},
            {"answer": "chick fil a", "points": 8, "alt": ["chick-fil-a", "chickfila"]}
        ]
    },
    
    # === EVERYDAY LIFE ===
    {
        "question": "Name something you find in a wallet",
        "category": "everyday",
        "answers": [
            {"answer": "money", "points": 35, "alt": ["cash", "bills"]},
            {"answer": "credit cards", "points": 30, "alt": ["credit card", "debit card", "cards"]},
            {"answer": "id", "points": 20, "alt": ["driver's license", "license", "identification"]},
            {"answer": "photos", "points": 10, "alt": ["pictures", "photo"]},
            {"answer": "receipts", "points": 5, "alt": ["receipt"]}
        ]
    },
    {
        "question": "Name a reason someone might be late to work",
        "category": "everyday",
        "answers": [
            {"answer": "traffic", "points": 35, "alt": ["stuck in traffic", "traffic jam"]},
            {"answer": "overslept", "points": 30, "alt": ["slept in", "alarm didn't go off", "woke up late"]},
            {"answer": "car trouble", "points": 15, "alt": ["car broke down", "flat tire"]},
            {"answer": "kids", "points": 12, "alt": ["children", "dropping off kids"]},
            {"answer": "weather", "points": 8, "alt": ["bad weather", "snow", "rain"]}
        ]
    },
    {
        "question": "Name something people forget in the morning",
        "category": "everyday",
        "answers": [
            {"answer": "keys", "points": 32, "alt": ["car keys", "house keys"]},
            {"answer": "phone", "points": 28, "alt": ["cell phone", "mobile"]},
            {"answer": "wallet", "points": 18, "alt": ["purse"]},
            {"answer": "lunch", "points": 14, "alt": ["food", "lunch box"]},
            {"answer": "brush teeth", "points": 8, "alt": ["brushing teeth", "toothbrush"]}
        ]
    },
    
    # === HOBBIES ===
    {
        "question": "Name something people collect",
        "category": "hobbies",
        "answers": [
            {"answer": "stamps", "points": 30, "alt": ["stamp"]},
            {"answer": "coins", "points": 28, "alt": ["coin"]},
            {"answer": "cards", "points": 20, "alt": ["trading cards", "baseball cards", "pokemon cards"]},
            {"answer": "art", "points": 12, "alt": ["paintings", "artwork"]},
            {"answer": "toys", "points": 10, "alt": ["action figures", "figurines"]}
        ]
    },
    {
        "question": "Name a hobby people pick up during quarantine",
        "category": "hobbies",
        "answers": [
            {"answer": "baking", "points": 32, "alt": ["cooking", "bread making"]},
            {"answer": "gaming", "points": 26, "alt": ["video games", "games"]},
            {"answer": "exercise", "points": 20, "alt": ["working out", "fitness", "yoga"]},
            {"answer": "reading", "points": 14, "alt": ["books"]},
            {"answer": "crafts", "points": 8, "alt": ["knitting", "painting", "diy"]}
        ]
    },
    
    # === VEHICLES ===
    {
        "question": "Name a color that cars come in",
        "category": "vehicles",
        "answers": [
            {"answer": "black", "points": 35, "alt": []},
            {"answer": "white", "points": 28, "alt": []},
            {"answer": "red", "points": 18, "alt": []},
            {"answer": "blue", "points": 12, "alt": []},
            {"answer": "silver", "points": 7, "alt": ["grey", "gray"]}
        ]
    },
    {
        "question": "Name a car brand",
        "category": "vehicles",
        "answers": [
            {"answer": "toyota", "points": 30, "alt": []},
            {"answer": "honda", "points": 26, "alt": []},
            {"answer": "ford", "points": 22, "alt": []},
            {"answer": "bmw", "points": 14, "alt": []},
            {"answer": "tesla", "points": 8, "alt": []}
        ]
    },
    
    # === DATING ===
    {
        "question": "Name a popular first date activity",
        "category": "dating",
        "answers": [
            {"answer": "dinner", "points": 35, "alt": ["restaurant", "eat"]},
            {"answer": "movie", "points": 25, "alt": ["movies", "cinema"]},
            {"answer": "coffee", "points": 20, "alt": ["cafe", "coffee shop"]},
            {"answer": "walk", "points": 12, "alt": ["walking", "park"]},
            {"answer": "drinks", "points": 8, "alt": ["bar", "happy hour"]}
        ]
    },
    {
        "question": "Name a red flag on a first date",
        "category": "dating",
        "answers": [
            {"answer": "rude to server", "points": 32, "alt": ["rude to waiter", "rude to staff"]},
            {"answer": "on phone", "points": 26, "alt": ["texting", "phone"]},
            {"answer": "talks about ex", "points": 20, "alt": ["ex", "exes"]},
            {"answer": "late", "points": 14, "alt": ["shows up late", "tardy"]},
            {"answer": "bad hygiene", "points": 8, "alt": ["smell", "dirty"]}
        ]
    },
    
    # === HABITS ===
    {
        "question": "Name a bad habit people try to break",
        "category": "habits",
        "answers": [
            {"answer": "smoking", "points": 30, "alt": ["cigarettes", "vaping"]},
            {"answer": "biting nails", "points": 25, "alt": ["nail biting"]},
            {"answer": "eating junk food", "points": 20, "alt": ["junk food", "unhealthy eating"]},
            {"answer": "procrastinating", "points": 15, "alt": ["procrastination"]},
            {"answer": "phone addiction", "points": 10, "alt": ["screen time", "social media addiction"]}
        ]
    },
    
    # === ENTERTAINMENT ===
    {
        "question": "Name a superhero",
        "category": "entertainment",
        "answers": [
            {"answer": "spider-man", "points": 32, "alt": ["spiderman", "spider man"]},
            {"answer": "batman", "points": 26, "alt": []},
            {"answer": "superman", "points": 20, "alt": []},
            {"answer": "iron man", "points": 14, "alt": ["ironman", "tony stark"]},
            {"answer": "wonder woman", "points": 8, "alt": []}
        ]
    },
    {
        "question": "Name something people binge watch",
        "category": "entertainment",
        "answers": [
            {"answer": "netflix shows", "points": 30, "alt": ["netflix", "tv shows"]},
            {"answer": "reality tv", "points": 25, "alt": ["reality shows"]},
            {"answer": "true crime", "points": 20, "alt": ["crime shows"]},
            {"answer": "anime", "points": 15, "alt": []},
            {"answer": "youtube", "points": 10, "alt": ["youtube videos"]}
        ]
    },
    
    # === ANIMALS ===
    {
        "question": "Name a popular pet",
        "category": "animals",
        "answers": [
            {"answer": "dog", "points": 40, "alt": ["dogs", "puppy"]},
            {"answer": "cat", "points": 30, "alt": ["cats", "kitten"]},
            {"answer": "fish", "points": 15, "alt": ["goldfish"]},
            {"answer": "bird", "points": 10, "alt": ["birds", "parrot"]},
            {"answer": "hamster", "points": 5, "alt": ["guinea pig"]}
        ]
    },
    {
        "question": "Name an animal you'd see at a zoo",
        "category": "animals",
        "answers": [
            {"answer": "lion", "points": 32, "alt": ["lions"]},
            {"answer": "elephant", "points": 26, "alt": ["elephants"]},
            {"answer": "monkey", "points": 20, "alt": ["monkeys", "ape"]},
            {"answer": "giraffe", "points": 14, "alt": ["giraffes"]},
            {"answer": "tiger", "points": 8, "alt": ["tigers"]}
        ]
    }
]

# ============================================================
# FUZZY MATCHING ENGINE - Enhanced for better answer matching
# ============================================================

def normalize_text(text: str) -> str:
    """Normalize text for comparison"""
    import re
    # Remove punctuation, extra spaces, convert to lowercase
    text = text.lower().strip()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text


def fuzzy_match(guess: str, answer_data: dict, threshold: float = 70) -> Tuple[bool, int]:
    """
    Enhanced fuzzy matching with alternate answers support
    Returns (is_match, confidence_score)
    """
    guess = normalize_text(guess)
    main_answer = normalize_text(answer_data['answer'])
    alt_answers = [normalize_text(a) for a in answer_data.get('alt', [])]
    
    all_answers = [main_answer] + alt_answers
    
    # Skip very short guesses (likely accidents)
    if len(guess) < 2:
        return False, 0
    
    best_score = 0
    
    for answer in all_answers:
        # 1. Exact match
        if guess == answer:
            return True, 100
        
        # 2. One contains the other
        if guess in answer or answer in guess:
            # Give higher score for closer length match
            length_ratio = min(len(guess), len(answer)) / max(len(guess), len(answer))
            if length_ratio > 0.5:
                return True, 95
        
        # 3. Word overlap (for multi-word answers)
        guess_words = set(guess.split())
        answer_words = set(answer.split())
        
        if guess_words and answer_words:
            # At least one significant word matches
            overlap = guess_words & answer_words
            significant_overlap = [w for w in overlap if len(w) > 2]
            if significant_overlap:
                return True, 90
        
        # 4. Rapidfuzz scoring
        ratio = fuzz.ratio(guess, answer)
        partial_ratio = fuzz.partial_ratio(guess, answer)
        token_sort = fuzz.token_sort_ratio(guess, answer)
        
        # Weighted average
        score = max(ratio, partial_ratio, token_sort)
        best_score = max(best_score, score)
    
    return best_score >= threshold, best_score


# ============================================================
# DATABASE SERVICE HELPER - For game persistence
# ============================================================

_db = None

def get_feud_games_collection():
    """Get the feud_games collection"""
    global _db
    if _db is None:
        from services.db_service import get_database
        _db = get_database()
    return _db['feud_games']

def get_feud_results_collection():
    """Get the feud_results collection"""
    global _db
    if _db is None:
        from services.db_service import get_database
        _db = get_database()
    return _db['feud_results']


# ============================================================
# RACCOON FEUD GAME SERVICE - Full multiplayer logic with DB
# ============================================================

class FeudGameService:
    """
    Manages Raccoon Feud games with:
    - Real-time synchronized state between 2 players
    - Fuzzy answer matching with alternate answers
    - Score tracking and winner determination
    - MongoDB persistence for game results
    - Turn-based gameplay with strike system
    """
    
    def __init__(self):
        self.active_games: Dict[str, dict] = {}  # session_id -> game_state
        self._lock = asyncio.Lock() if asyncio else None
    
    def create_game(self, session_id: str, player1_id: str, player2_id: str,
                    player1_username: str = "", player2_username: str = "") -> dict:
        """Create a new Feud game with random questions"""
        game_id = str(uuid.uuid4())
        
        # Pick random questions for this game (5 questions)
        num_questions = min(5, len(FEUD_QUESTIONS))
        selected_questions = random.sample(FEUD_QUESTIONS, num_questions)
        
        # Prepare questions with fresh state
        questions = []
        for q in selected_questions:
            questions.append({
                'question_id': str(uuid.uuid4()),
                'question': q['question'],
                'category': q.get('category', 'general'),
                'answers': [
                    {
                        'answer': a['answer'],
                        'alt': a.get('alt', []),
                        'points': a['points'],
                        'revealed': False,
                        'guessed_by': None
                    }
                    for a in q['answers']
                ]
            })
        
        game = {
            'game_id': game_id,
            'session_id': session_id,
            'game_type': 'feud',
            
            # Questions
            'questions': questions,
            'current_question_index': 0,
            'current_question': self._prepare_question_state(questions[0]),
            
            # Players
            'player1_id': player1_id,
            'player2_id': player2_id,
            'player1_username': player1_username or 'Player 1',
            'player2_username': player2_username or 'Player 2',
            
            # Scores
            'player1_score': 0,
            'player2_score': 0,
            'player1_strikes': 0,
            'player2_strikes': 0,
            'player1_round_score': 0,
            'player2_round_score': 0,
            
            # Turn management
            'current_player': player1_id,  # Player 1 starts first round
            'is_steal_attempt': False,  # True when opponent gets to steal
            
            # Game status
            'status': 'active',
            'winner_id': None,
            'winner_username': None,
            
            # Timestamps
            'created_at': datetime.now(timezone.utc).isoformat(),
            'finished_at': None,
            
            # History for replay/audit
            'guess_history': []
        }
        
        self.active_games[session_id] = game
        logger.info(f"Created Feud game {game_id} for session {session_id}")
        
        return self._get_public_game_state(game)
    
    def _prepare_question_state(self, question: dict) -> dict:
        """Prepare question with computed total points"""
        total_points = sum(a['points'] for a in question['answers'])
        return {
            'question_id': question['question_id'],
            'question': question['question'],
            'category': question.get('category', 'general'),
            'answers': question['answers'],
            'total_points': total_points,
            'revealed_count': 0
        }
    
    def submit_guess(self, session_id: str, player_id: str, guess: str) -> dict:
        """
        Submit a guess for the current question
        Returns result with updated game state for both players
        """
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if game['status'] != 'active':
            return {'error': 'Game is not active'}
        
        if game['current_player'] != player_id:
            return {'error': 'Not your turn', 'current_player': game['current_player']}
        
        guess = guess.strip()
        if not guess:
            return {'error': 'Empty guess'}
        
        current_q = game['current_question']
        
        # Find matching answer using fuzzy matching
        matched_answer = None
        match_score = 0
        
        for answer in current_q['answers']:
            if answer['revealed']:
                continue
            
            is_match, score = fuzzy_match(guess, answer)
            if is_match and score > match_score:
                matched_answer = answer
                match_score = score
        
        # Prepare result
        result = {
            'player_id': player_id,
            'player_username': game['player1_username'] if player_id == game['player1_id'] else game['player2_username'],
            'guess': guess,
            'correct': False,
            'matched_answer': None,
            'points': 0,
            'strike': False,
            'question_ended': False,
            'steal_opportunity': False,
            'round_winner': None
        }
        
        # Record guess in history
        game['guess_history'].append({
            'player_id': player_id,
            'guess': guess,
            'correct': matched_answer is not None,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
        if matched_answer:
            # CORRECT GUESS!
            matched_answer['revealed'] = True
            matched_answer['guessed_by'] = player_id
            points = matched_answer['points']
            
            # Add points to current player
            if player_id == game['player1_id']:
                game['player1_score'] += points
                game['player1_round_score'] += points
                # Reset strikes on correct answer
                game['player1_strikes'] = 0
            else:
                game['player2_score'] += points
                game['player2_round_score'] += points
                game['player2_strikes'] = 0
            
            current_q['revealed_count'] = current_q.get('revealed_count', 0) + 1
            
            result['correct'] = True
            result['matched_answer'] = matched_answer['answer']
            result['points'] = points
            
            # Check if all answers revealed
            all_revealed = all(a['revealed'] for a in current_q['answers'])
            if all_revealed:
                result['question_ended'] = True
                result['reason'] = 'all_revealed'
                result['round_winner'] = self._determine_round_winner(game)
                self._next_question(game)
            # else: Same player continues
            
        else:
            # WRONG GUESS - add strike
            result['strike'] = True
            
            if player_id == game['player1_id']:
                game['player1_strikes'] += 1
                player_strikes = game['player1_strikes']
            else:
                game['player2_strikes'] += 1
                player_strikes = game['player2_strikes']
            
            # Check for 3 strikes
            if player_strikes >= 3:
                if not game['is_steal_attempt']:
                    # Give opponent chance to steal
                    game['is_steal_attempt'] = True
                    game['current_player'] = game['player2_id'] if player_id == game['player1_id'] else game['player1_id']
                    result['steal_opportunity'] = True
                    result['steal_player'] = game['current_player']
                else:
                    # Steal attempt failed - end question
                    result['question_ended'] = True
                    result['reason'] = 'steal_failed'
                    result['round_winner'] = self._determine_round_winner(game)
                    self._reveal_all_answers(current_q)
                    self._next_question(game)
            else:
                # Switch turns (within same team conceptually)
                other_player = game['player2_id'] if player_id == game['player1_id'] else game['player1_id']
                game['current_player'] = other_player
        
        result['game_state'] = self._get_public_game_state(game)
        return result
    
    def _determine_round_winner(self, game: dict) -> dict:
        """Determine who won the current round"""
        if game['player1_round_score'] > game['player2_round_score']:
            return {
                'player_id': game['player1_id'],
                'username': game['player1_username'],
                'score': game['player1_round_score']
            }
        elif game['player2_round_score'] > game['player1_round_score']:
            return {
                'player_id': game['player2_id'],
                'username': game['player2_username'],
                'score': game['player2_round_score']
            }
        return {
            'player_id': 'tie',
            'username': 'Tie',
            'score': game['player1_round_score']
        }
    
    def _reveal_all_answers(self, question: dict):
        """Reveal all unrevealed answers"""
        for answer in question['answers']:
            answer['revealed'] = True
    
    def _next_question(self, game: dict):
        """Move to the next question or end game"""
        # Reset round scores and strikes
        game['player1_round_score'] = 0
        game['player2_round_score'] = 0
        game['player1_strikes'] = 0
        game['player2_strikes'] = 0
        game['is_steal_attempt'] = False
        
        game['current_question_index'] += 1
        
        if game['current_question_index'] >= len(game['questions']):
            # GAME OVER
            self._finish_game(game)
        else:
            # Next question
            game['current_question'] = self._prepare_question_state(
                game['questions'][game['current_question_index']]
            )
            # Alternate who starts each round
            game['current_player'] = game['player2_id'] if game['current_question_index'] % 2 else game['player1_id']
    
    def _finish_game(self, game: dict):
        """Finish the game and determine winner"""
        game['status'] = 'finished'
        game['finished_at'] = datetime.now(timezone.utc).isoformat()
        
        # Determine overall winner
        if game['player1_score'] > game['player2_score']:
            game['winner_id'] = game['player1_id']
            game['winner_username'] = game['player1_username']
        elif game['player2_score'] > game['player1_score']:
            game['winner_id'] = game['player2_id']
            game['winner_username'] = game['player2_username']
        else:
            game['winner_id'] = 'tie'
            game['winner_username'] = 'Tie Game'
        
        logger.info(f"Feud game {game['game_id']} finished. Winner: {game['winner_username']}")
    
    async def save_game_result(self, session_id: str):
        """Save finished game to MongoDB"""
        game = self.active_games.get(session_id)
        if not game or game['status'] != 'finished':
            return None
        
        try:
            collection = get_feud_results_collection()
            
            # Calculate duration
            created = datetime.fromisoformat(game['created_at'].replace('Z', '+00:00'))
            finished = datetime.fromisoformat(game['finished_at'].replace('Z', '+00:00'))
            duration = int((finished - created).total_seconds())
            
            result = {
                'game_id': game['game_id'],
                'session_id': game['session_id'],
                'player1_id': game['player1_id'],
                'player2_id': game['player2_id'],
                'player1_username': game['player1_username'],
                'player2_username': game['player2_username'],
                'player1_score': game['player1_score'],
                'player2_score': game['player2_score'],
                'winner_id': game['winner_id'],
                'winner_username': game['winner_username'],
                'questions_played': game['current_question_index'] + 1,
                'duration_seconds': duration,
                'created_at': game['created_at'],
                'finished_at': game['finished_at'],
                'guess_history': game['guess_history']
            }
            
            await collection.insert_one(result)
            logger.info(f"Saved Feud game result {game['game_id']}")
            return result
            
        except Exception as e:
            logger.error(f"Error saving Feud game result: {e}")
            return None
    
    def _get_public_game_state(self, game: dict) -> dict:
        """Get game state safe to send to clients (hides answer texts until revealed)"""
        current_q = game['current_question']
        
        return {
            'game_id': game['game_id'],
            'game_type': 'feud',
            
            # Current question (with hidden unrevealed answers)
            'current_question': {
                'question_id': current_q['question_id'],
                'question': current_q['question'],
                'category': current_q.get('category', 'general'),
                'answers': [
                    {
                        'answer': a['answer'] if a['revealed'] else '???',
                        'points': a['points'] if a['revealed'] else '?',
                        'revealed': a['revealed'],
                        'guessed_by': a.get('guessed_by')
                    }
                    for a in current_q['answers']
                ],
                'total_points': current_q['total_points'],
                'revealed_count': current_q.get('revealed_count', 0)
            },
            
            # Progress
            'question_number': game['current_question_index'] + 1,
            'total_questions': len(game['questions']),
            
            # Players
            'player1_id': game['player1_id'],
            'player2_id': game['player2_id'],
            'player1_username': game['player1_username'],
            'player2_username': game['player2_username'],
            
            # Scores
            'player1_score': game['player1_score'],
            'player2_score': game['player2_score'],
            'player1_strikes': game['player1_strikes'],
            'player2_strikes': game['player2_strikes'],
            'player1_round_score': game.get('player1_round_score', 0),
            'player2_round_score': game.get('player2_round_score', 0),
            
            # Turn
            'current_player': game['current_player'],
            'is_steal_attempt': game.get('is_steal_attempt', False),
            
            # Status
            'status': game['status'],
            'winner_id': game.get('winner_id'),
            'winner_username': game.get('winner_username')
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
