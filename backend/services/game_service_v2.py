"""
Enhanced Game Services with Full Database Persistence
- Raccoon Feud with multiplayer sync and DB storage
- UNO card game
PERFORMANCE: Optimized for <100ms response time
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone
import logging
import uuid
import random
import math
from rapidfuzz import fuzz

# PERFORMANCE: Only log errors, not info
logger = logging.getLogger(__name__)
logger.setLevel(logging.WARNING)

# ============================================================
# DATABASE HELPERS
# ============================================================

_db = None

def get_database():
    """Get database instance"""
    global _db
    if _db is None:
        from services.db_service import get_database as get_db
        _db = get_db()
    return _db

def get_feud_sessions_collection():
    return get_database()['feud_sessions']

def get_feud_questions_collection():
    return get_database()['feud_questions']


# ============================================================
# RACCOON FEUD QUESTION BANK
# ============================================================

FEUD_QUESTIONS = [
    {
        "question_id": "q001",
        "question": "Name something people do on their phone while waiting",
        "category": "technology",
        "difficulty": "easy",
        "answers": [
            {"answer": "social media", "points": 35, "alt": ["instagram", "facebook", "tiktok", "scroll", "scrolling"]},
            {"answer": "text", "points": 25, "alt": ["message", "texting", "sms", "messaging"]},
            {"answer": "games", "points": 20, "alt": ["play games", "gaming", "candy crush", "game"]},
            {"answer": "browse internet", "points": 12, "alt": ["browse", "surf", "google", "internet", "web"]},
            {"answer": "music", "points": 8, "alt": ["listen to music", "spotify", "songs", "listening"]}
        ]
    },
    {
        "question_id": "q002",
        "question": "Name a popular streaming service",
        "category": "technology",
        "difficulty": "easy",
        "answers": [
            {"answer": "netflix", "points": 40, "alt": []},
            {"answer": "youtube", "points": 25, "alt": ["yt"]},
            {"answer": "disney plus", "points": 15, "alt": ["disney+", "disney"]},
            {"answer": "hulu", "points": 12, "alt": []},
            {"answer": "amazon prime", "points": 8, "alt": ["prime video", "prime", "amazon"]}
        ]
    },
    {
        "question_id": "q003",
        "question": "Name a social media platform",
        "category": "technology",
        "difficulty": "easy",
        "answers": [
            {"answer": "instagram", "points": 35, "alt": ["ig", "insta"]},
            {"answer": "facebook", "points": 25, "alt": ["fb", "meta"]},
            {"answer": "tiktok", "points": 20, "alt": ["tik tok"]},
            {"answer": "twitter", "points": 12, "alt": ["x", "tweets"]},
            {"answer": "snapchat", "points": 8, "alt": ["snap"]}
        ]
    },
    {
        "question_id": "q004",
        "question": "Name a popular pizza topping",
        "category": "food",
        "difficulty": "easy",
        "answers": [
            {"answer": "pepperoni", "points": 40, "alt": []},
            {"answer": "cheese", "points": 25, "alt": ["extra cheese", "mozzarella"]},
            {"answer": "mushrooms", "points": 15, "alt": ["mushroom"]},
            {"answer": "sausage", "points": 12, "alt": ["italian sausage"]},
            {"answer": "olives", "points": 8, "alt": ["olive", "black olives"]}
        ]
    },
    {
        "question_id": "q005",
        "question": "Name a breakfast food",
        "category": "food",
        "difficulty": "easy",
        "answers": [
            {"answer": "eggs", "points": 35, "alt": ["egg", "scrambled eggs", "fried eggs"]},
            {"answer": "bacon", "points": 28, "alt": []},
            {"answer": "pancakes", "points": 18, "alt": ["pancake"]},
            {"answer": "cereal", "points": 12, "alt": []},
            {"answer": "toast", "points": 7, "alt": ["bread"]}
        ]
    },
    {
        "question_id": "q006",
        "question": "Name something you find in a wallet",
        "category": "everyday",
        "difficulty": "easy",
        "answers": [
            {"answer": "money", "points": 35, "alt": ["cash", "bills", "dollar", "dollars"]},
            {"answer": "credit cards", "points": 30, "alt": ["credit card", "debit card", "cards", "card"]},
            {"answer": "id", "points": 20, "alt": ["driver's license", "license", "identification", "drivers license"]},
            {"answer": "photos", "points": 10, "alt": ["pictures", "photo", "picture"]},
            {"answer": "receipts", "points": 5, "alt": ["receipt"]}
        ]
    },
    {
        "question_id": "q007",
        "question": "Name a reason someone might be late to work",
        "category": "everyday",
        "difficulty": "medium",
        "answers": [
            {"answer": "traffic", "points": 35, "alt": ["stuck in traffic", "traffic jam"]},
            {"answer": "overslept", "points": 30, "alt": ["slept in", "alarm", "woke up late", "sleep"]},
            {"answer": "car trouble", "points": 15, "alt": ["car broke down", "flat tire", "car"]},
            {"answer": "kids", "points": 12, "alt": ["children", "dropping off kids", "child"]},
            {"answer": "weather", "points": 8, "alt": ["bad weather", "snow", "rain"]}
        ]
    },
    {
        "question_id": "q008",
        "question": "Name something people collect",
        "category": "hobbies",
        "difficulty": "medium",
        "answers": [
            {"answer": "stamps", "points": 30, "alt": ["stamp"]},
            {"answer": "coins", "points": 28, "alt": ["coin"]},
            {"answer": "cards", "points": 20, "alt": ["trading cards", "baseball cards", "pokemon cards", "card"]},
            {"answer": "art", "points": 12, "alt": ["paintings", "artwork", "painting"]},
            {"answer": "toys", "points": 10, "alt": ["action figures", "figurines", "toy"]}
        ]
    },
    {
        "question_id": "q009",
        "question": "Name a color that cars come in",
        "category": "vehicles",
        "difficulty": "easy",
        "answers": [
            {"answer": "black", "points": 35, "alt": []},
            {"answer": "white", "points": 28, "alt": []},
            {"answer": "red", "points": 18, "alt": []},
            {"answer": "blue", "points": 12, "alt": []},
            {"answer": "silver", "points": 7, "alt": ["grey", "gray"]}
        ]
    },
    {
        "question_id": "q010",
        "question": "Name a popular first date activity",
        "category": "dating",
        "difficulty": "easy",
        "answers": [
            {"answer": "dinner", "points": 35, "alt": ["restaurant", "eat", "eating"]},
            {"answer": "movie", "points": 25, "alt": ["movies", "cinema", "film"]},
            {"answer": "coffee", "points": 20, "alt": ["cafe", "coffee shop"]},
            {"answer": "walk", "points": 12, "alt": ["walking", "park", "hike"]},
            {"answer": "drinks", "points": 8, "alt": ["bar", "happy hour", "drink"]}
        ]
    },
    {
        "question_id": "q011",
        "question": "Name a bad habit people try to break",
        "category": "habits",
        "difficulty": "medium",
        "answers": [
            {"answer": "smoking", "points": 30, "alt": ["cigarettes", "vaping", "smoke"]},
            {"answer": "biting nails", "points": 25, "alt": ["nail biting", "nails"]},
            {"answer": "eating junk food", "points": 20, "alt": ["junk food", "unhealthy eating", "fast food"]},
            {"answer": "procrastinating", "points": 15, "alt": ["procrastination"]},
            {"answer": "phone addiction", "points": 10, "alt": ["screen time", "social media addiction", "phone"]}
        ]
    },
    {
        "question_id": "q012",
        "question": "Name a superhero",
        "category": "entertainment",
        "difficulty": "easy",
        "answers": [
            {"answer": "spider-man", "points": 32, "alt": ["spiderman", "spider man", "peter parker"]},
            {"answer": "batman", "points": 26, "alt": ["bruce wayne"]},
            {"answer": "superman", "points": 20, "alt": ["clark kent"]},
            {"answer": "iron man", "points": 14, "alt": ["ironman", "tony stark"]},
            {"answer": "wonder woman", "points": 8, "alt": []}
        ]
    },
    {
        "question_id": "q013",
        "question": "Name a popular pet",
        "category": "animals",
        "difficulty": "easy",
        "answers": [
            {"answer": "dog", "points": 40, "alt": ["dogs", "puppy", "puppies"]},
            {"answer": "cat", "points": 30, "alt": ["cats", "kitten", "kittens"]},
            {"answer": "fish", "points": 15, "alt": ["goldfish", "fishes"]},
            {"answer": "bird", "points": 10, "alt": ["birds", "parrot"]},
            {"answer": "hamster", "points": 5, "alt": ["guinea pig", "hamsters"]}
        ]
    },
    {
        "question_id": "q014",
        "question": "Name a fast food restaurant",
        "category": "food",
        "difficulty": "easy",
        "answers": [
            {"answer": "mcdonalds", "points": 40, "alt": ["mcdonald's", "mickey d's", "mcd"]},
            {"answer": "burger king", "points": 22, "alt": ["bk"]},
            {"answer": "wendys", "points": 18, "alt": ["wendy's"]},
            {"answer": "taco bell", "points": 12, "alt": []},
            {"answer": "chick fil a", "points": 8, "alt": ["chick-fil-a", "chickfila"]}
        ]
    },
    {
        "question_id": "q015",
        "question": "Name an animal you'd see at a zoo",
        "category": "animals",
        "difficulty": "easy",
        "answers": [
            {"answer": "lion", "points": 32, "alt": ["lions"]},
            {"answer": "elephant", "points": 26, "alt": ["elephants"]},
            {"answer": "monkey", "points": 20, "alt": ["monkeys", "ape", "apes"]},
            {"answer": "giraffe", "points": 14, "alt": ["giraffes"]},
            {"answer": "tiger", "points": 8, "alt": ["tigers"]}
        ]
    },
    {
        "question_id": "q016",
        "question": "Name something people forget in the morning",
        "category": "everyday",
        "difficulty": "medium",
        "answers": [
            {"answer": "keys", "points": 32, "alt": ["car keys", "house keys", "key"]},
            {"answer": "phone", "points": 28, "alt": ["cell phone", "mobile", "cellphone"]},
            {"answer": "wallet", "points": 18, "alt": ["purse"]},
            {"answer": "lunch", "points": 14, "alt": ["food", "lunch box"]},
            {"answer": "brush teeth", "points": 8, "alt": ["brushing teeth", "toothbrush", "teeth"]}
        ]
    },
    {
        "question_id": "q017",
        "question": "Name something people binge watch",
        "category": "entertainment",
        "difficulty": "medium",
        "answers": [
            {"answer": "netflix shows", "points": 30, "alt": ["netflix", "tv shows", "shows"]},
            {"answer": "reality tv", "points": 25, "alt": ["reality shows", "reality"]},
            {"answer": "true crime", "points": 20, "alt": ["crime shows", "crime"]},
            {"answer": "anime", "points": 15, "alt": []},
            {"answer": "youtube", "points": 10, "alt": ["youtube videos"]}
        ]
    },
    {
        "question_id": "q018",
        "question": "Name a car brand",
        "category": "vehicles",
        "difficulty": "easy",
        "answers": [
            {"answer": "toyota", "points": 30, "alt": []},
            {"answer": "honda", "points": 26, "alt": []},
            {"answer": "ford", "points": 22, "alt": []},
            {"answer": "bmw", "points": 14, "alt": []},
            {"answer": "tesla", "points": 8, "alt": []}
        ]
    },
    {
        "question_id": "q019",
        "question": "Name a red flag on a first date",
        "category": "dating",
        "difficulty": "medium",
        "answers": [
            {"answer": "rude to server", "points": 32, "alt": ["rude to waiter", "rude to staff", "rude"]},
            {"answer": "on phone", "points": 26, "alt": ["texting", "phone", "looking at phone"]},
            {"answer": "talks about ex", "points": 20, "alt": ["ex", "exes", "ex boyfriend", "ex girlfriend"]},
            {"answer": "late", "points": 14, "alt": ["shows up late", "tardy", "being late"]},
            {"answer": "bad hygiene", "points": 8, "alt": ["smell", "dirty", "smells bad"]}
        ]
    },
    {
        "question_id": "q020",
        "question": "Name a hobby people pick up during quarantine",
        "category": "hobbies",
        "difficulty": "medium",
        "answers": [
            {"answer": "baking", "points": 32, "alt": ["cooking", "bread making", "cook"]},
            {"answer": "gaming", "points": 26, "alt": ["video games", "games", "game"]},
            {"answer": "exercise", "points": 20, "alt": ["working out", "fitness", "yoga", "workout"]},
            {"answer": "reading", "points": 14, "alt": ["books", "book"]},
            {"answer": "crafts", "points": 8, "alt": ["knitting", "painting", "diy", "craft"]}
        ]
    }
]


# ============================================================
# FUZZY MATCHING ENGINE
# ============================================================

def normalize_text(text: str) -> str:
    """Normalize text for comparison"""
    import re
    text = text.lower().strip()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text


def fuzzy_match_answer(guess: str, answer_data: dict, threshold: float = 90) -> Tuple[bool, int]:
    """
    STRICT answer matching — only exact or near-exact matches accepted.
    Returns (is_match, confidence_score)
    """
    guess = normalize_text(guess)
    main_answer = normalize_text(answer_data['answer'])
    alt_answers = [normalize_text(a) for a in answer_data.get('alt', [])]
    
    all_answers = [main_answer] + alt_answers
    
    if len(guess) < 2:
        return False, 0
    
    best_score = 0
    
    for answer in all_answers:
        # Exact match
        if guess == answer:
            return True, 100
        
        # Full-string fuzzy ratio only (no partial, no token tricks)
        ratio = fuzz.ratio(guess, answer)
        best_score = max(best_score, ratio)
    
    return best_score >= threshold, best_score


# ============================================================
# RACCOON FEUD GAME SERVICE - SPEED MODE
# ============================================================

class FeudGameService:
    """
    Raccoon Feud SPEED MODE - Fast typing competition:
    - NO TURNS - All players type simultaneously
    - First to type correct answer LOCKS it and gets points
    - 5 answers per question, 5 rounds total
    - Fast transitions, instant gameplay
    """
    
    ROUND_TIME_SECONDS = 30  # Seconds per round
    TOTAL_ROUNDS = 5
    
    def __init__(self):
        self.active_games: Dict[str, dict] = {}
    
    def create_game(self, session_id: str, player1_id: str, player2_id: str,
                    player1_username: str = "", player2_username: str = "") -> dict:
        """Create new Speed Feud game"""
        
        # Check for existing active game
        if session_id in self.active_games:
            existing = self.active_games[session_id]
            if existing['status'] == 'active':
                return {'error': 'Game already in progress'}
        
        game_id = str(uuid.uuid4())
        
        # Select 5 random questions for 5 rounds
        selected = random.sample(FEUD_QUESTIONS, min(self.TOTAL_ROUNDS, len(FEUD_QUESTIONS)))
        
        questions = []
        for q in selected:
            questions.append({
                'question_id': q['question_id'],
                'question': q['question'],
                'category': q.get('category', 'general'),
                'answers': [
                    {
                        'answer': a['answer'],
                        'alt': a.get('alt', []),
                        'points': a['points'],
                        'revealed': False,
                        'claimed_by_id': None,
                        'claimed_by_username': None
                    }
                    for a in q['answers']
                ]
            })
        
        game = {
            'game_id': game_id,
            'session_id': session_id,
            'game_type': 'feud_speed',
            
            'questions': questions,
            'current_round': 1,
            'total_rounds': self.TOTAL_ROUNDS,
            'current_question': self._prepare_question(questions[0]),
            
            'player1_id': player1_id,
            'player2_id': player2_id,
            'player1_username': player1_username or 'Player 1',
            'player2_username': player2_username or 'Player 2',
            
            # Total scores across all rounds
            'player1_score': 0,
            'player2_score': 0,
            
            # Round timing
            'round_start_time': datetime.now(timezone.utc).isoformat(),
            'round_time_limit': self.ROUND_TIME_SECONDS,
            
            'status': 'active',
            'round_active': True,
            'winner_id': None,
            'winner_username': None,
            
            'created_at': datetime.now(timezone.utc).isoformat(),
            'started_at': datetime.now(timezone.utc).isoformat(),
            'finished_at': None,
            
            'guess_history': []
        }
        
        self.active_games[session_id] = game
        logger.info(f"Created Speed Feud game {game_id} for session {session_id}")
        
        return self._get_public_state(game)
    
    def _prepare_question(self, q: dict) -> dict:
        """Prepare question state for a round"""
        return {
            'question_id': q['question_id'],
            'question': q['question'],
            'category': q.get('category', 'general'),
            'answers': q['answers'],
            'total_points': sum(a['points'] for a in q['answers']),
            'claimed_count': 0
        }
    
    def submit_guess(self, session_id: str, player_id: str, guess: str) -> dict:
        """
        Submit a guess - SPEED MODE
        Any player can guess at any time. First correct guess locks the answer.
        """
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if game['status'] != 'active':
            return {'error': 'Game not active'}
        
        if not game['round_active']:
            return {'error': 'Round not active'}
        
        guess = guess.strip()
        if not guess:
            return {'error': 'Empty guess'}
        
        current_q = game['current_question']
        player_username = game['player1_username'] if player_id == game['player1_id'] else game['player2_username']
        
        # Find match among UNCLAIMED answers only
        matched = None
        match_score = 0
        matched_idx = -1
        
        for idx, ans in enumerate(current_q['answers']):
            if ans['claimed_by_id']:
                continue  # Already claimed
            
            is_match, score = fuzzy_match_answer(guess, ans)
            if is_match and score > match_score:
                matched = ans
                match_score = score
                matched_idx = idx
        
        result = {
            'player_id': player_id,
            'player_username': player_username,
            'guess': guess,
            'correct': False,
            'matched_answer': None,
            'matched_index': -1,
            'points': 0,
            'round_ended': False
        }
        
        # Record guess
        game['guess_history'].append({
            'player_id': player_id,
            'guess': guess,
            'correct': matched is not None,
            'round': game['current_round'],
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
        if matched:
            # CORRECT! Lock the answer for this player
            matched['claimed_by_id'] = player_id
            matched['claimed_by_username'] = player_username
            matched['revealed'] = True
            points = matched['points']
            
            # Award points
            if player_id == game['player1_id']:
                game['player1_score'] += points
            else:
                game['player2_score'] += points
            
            current_q['claimed_count'] = sum(1 for a in current_q['answers'] if a['claimed_by_id'])
            
            result['correct'] = True
            result['matched_answer'] = matched['answer']
            result['matched_index'] = matched_idx
            result['points'] = points
            
            # Check if all answers claimed = round ends
            if all(a['claimed_by_id'] for a in current_q['answers']):
                result['round_ended'] = True
                result['reason'] = 'all_claimed'
        
        result['game_state'] = self._get_public_state(game)
        return result
    
    def skip_round(self, session_id: str) -> dict:
        """Skip to next round (either player can trigger)"""
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        return self._end_round(game, reason='skipped')
    
    def time_up(self, session_id: str) -> dict:
        """Handle round timeout"""
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if not game['round_active']:
            return {'error': 'Round already ended'}
        
        return self._end_round(game, reason='timeout')
    
    def _end_round(self, game: dict, reason: str = 'timeout') -> dict:
        """End current round and reveal all answers"""
        game['round_active'] = False
        
        # Reveal all unclaimed answers
        current_q = game['current_question']
        for ans in current_q['answers']:
            ans['revealed'] = True
        
        result = {
            'round': game['current_round'],
            'reason': reason,
            'player1_score': game['player1_score'],
            'player2_score': game['player2_score'],
            'answers': current_q['answers'],
            'game_over': False
        }
        
        # Check if game is over
        if game['current_round'] >= game['total_rounds']:
            self._finish_game(game)
            result['game_over'] = True
            result['winner_id'] = game['winner_id']
            result['winner_username'] = game['winner_username']
        
        result['game_state'] = self._get_public_state(game)
        return result
    
    def next_round(self, session_id: str) -> dict:
        """Move to next round"""
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if game['status'] != 'active':
            return {'error': 'Game not active'}
        
        if game['current_round'] >= game['total_rounds']:
            return {'error': 'Game already complete'}
        
        # Move to next round
        game['current_round'] += 1
        game['current_question'] = self._prepare_question(game['questions'][game['current_round'] - 1])
        game['round_active'] = True
        game['round_start_time'] = datetime.now(timezone.utc).isoformat()
        
        logger.info(f"Feud game moving to round {game['current_round']}")
        
        return {
            'round': game['current_round'],
            'game_state': self._get_public_state(game)
        }
    
    def _finish_game(self, game: dict):
        """Finish game and determine winner"""
        game['status'] = 'finished'
        game['round_active'] = False
        game['finished_at'] = datetime.now(timezone.utc).isoformat()
        
        if game['player1_score'] > game['player2_score']:
            game['winner_id'] = game['player1_id']
            game['winner_username'] = game['player1_username']
        elif game['player2_score'] > game['player1_score']:
            game['winner_id'] = game['player2_id']
            game['winner_username'] = game['player2_username']
        else:
            game['winner_id'] = 'tie'
            game['winner_username'] = 'Tie'
        
        logger.info(f"Speed Feud game finished: {game['winner_username']} wins with {max(game['player1_score'], game['player2_score'])} points")
    
    async def save_to_db(self, session_id: str):
        """Save game to MongoDB"""
        game = self.active_games.get(session_id)
        if not game:
            return None
        
        try:
            collection = get_feud_sessions_collection()
            
            doc = {
                'game_id': game['game_id'],
                'session_id': game['session_id'],
                'player1_id': game['player1_id'],
                'player2_id': game['player2_id'],
                'player1_username': game['player1_username'],
                'player2_username': game['player2_username'],
                'player1_score': game['player1_score'],
                'player2_score': game['player2_score'],
                'winner_id': game.get('winner_id'),
                'winner_username': game.get('winner_username'),
                'status': game['status'],
                'rounds_played': game['current_round'],
                'guess_history': game['guess_history'],
                'created_at': game['created_at'],
                'finished_at': game.get('finished_at')
            }
            
            await collection.update_one(
                {'game_id': game['game_id']},
                {'$set': doc},
                upsert=True
            )
            
            logger.info(f"Saved Speed Feud game {game['game_id']} to DB")
            return doc
        except Exception as e:
            logger.error(f"Error saving Speed Feud game: {e}")
            return None
    
    def _get_public_state(self, game: dict) -> dict:
        """Get public game state for Speed Feud"""
        cq = game['current_question']
        
        return {
            'game_id': game['game_id'],
            'game_type': 'feud_speed',
            
            'current_question': {
                'question_id': cq['question_id'],
                'question': cq['question'],
                'category': cq.get('category', 'general'),
                'answers': [
                    {
                        'answer': a['answer'] if a['revealed'] else '???',
                        'points': a['points'],
                        'revealed': a['revealed'],
                        'claimed_by_id': a.get('claimed_by_id'),
                        'claimed_by_username': a.get('claimed_by_username')
                    }
                    for a in cq['answers']
                ],
                'total_points': cq['total_points'],
                'claimed_count': cq.get('claimed_count', 0)
            },
            
            'current_round': game['current_round'],
            'total_rounds': game['total_rounds'],
            
            'player1_id': game['player1_id'],
            'player2_id': game['player2_id'],
            'player1_username': game['player1_username'],
            'player2_username': game['player2_username'],
            
            'player1_score': game['player1_score'],
            'player2_score': game['player2_score'],
            
            'round_start_time': game['round_start_time'],
            'round_time_limit': game['round_time_limit'],
            'round_active': game['round_active'],
            
            'status': game['status'],
            'winner_id': game.get('winner_id'),
            'winner_username': game.get('winner_username')
        }
    
    def get_game(self, session_id: str) -> Optional[dict]:
        """Get game state"""
        game = self.active_games.get(session_id)
        return self._get_public_state(game) if game else None
    
    def end_game(self, session_id: str) -> Optional[dict]:
        """End and cleanup game"""
        game = self.active_games.pop(session_id, None)
        if game:
            game['status'] = 'cancelled'
            return self._get_public_state(game)
        return None
    
    def has_active_game(self, session_id: str) -> bool:
        """Check if session has active game"""
        game = self.active_games.get(session_id)
        return game is not None and game['status'] == 'active'


# Global service instances
feud_service = FeudGameService()
