"""
Enhanced Game Services with Full Database Persistence
- Raccoon Feud with multiplayer sync and DB storage
- Truth or Dare with bottle mechanics and DB storage
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone
import logging
import uuid
import random
import math
from rapidfuzz import fuzz

logger = logging.getLogger(__name__)

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

def get_truth_sessions_collection():
    return get_database()['truth_sessions']


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


def fuzzy_match_answer(guess: str, answer_data: dict, threshold: float = 65) -> Tuple[bool, int]:
    """
    Enhanced fuzzy matching with alternate answers
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
        
        # Contains check
        if len(guess) >= 3 and len(answer) >= 3:
            if guess in answer or answer in guess:
                length_ratio = min(len(guess), len(answer)) / max(len(guess), len(answer))
                if length_ratio > 0.4:
                    return True, 95
        
        # Word overlap
        guess_words = set(guess.split())
        answer_words = set(answer.split())
        
        if guess_words and answer_words:
            overlap = guess_words & answer_words
            significant_overlap = [w for w in overlap if len(w) > 2]
            if significant_overlap:
                return True, 90
        
        # Fuzzy scoring
        ratio = fuzz.ratio(guess, answer)
        partial = fuzz.partial_ratio(guess, answer)
        token_sort = fuzz.token_sort_ratio(guess, answer)
        
        score = max(ratio, partial, token_sort)
        best_score = max(best_score, score)
    
    return best_score >= threshold, best_score


# ============================================================
# RACCOON FEUD GAME SERVICE
# ============================================================

class FeudGameService:
    """
    Manages Raccoon Feud games with full DB persistence
    """
    
    def __init__(self):
        self.active_games: Dict[str, dict] = {}
    
    def create_game(self, session_id: str, player1_id: str, player2_id: str,
                    player1_username: str = "", player2_username: str = "") -> dict:
        """Create new Feud game"""
        
        # Check for existing active game
        if session_id in self.active_games:
            existing = self.active_games[session_id]
            if existing['status'] == 'active':
                return {'error': 'Game already in progress'}
        
        game_id = str(uuid.uuid4())
        
        # Select 5 random questions
        selected = random.sample(FEUD_QUESTIONS, min(5, len(FEUD_QUESTIONS)))
        
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
                        'guessed_by': None
                    }
                    for a in q['answers']
                ]
            })
        
        game = {
            'game_id': game_id,
            'session_id': session_id,
            'game_type': 'feud',
            
            'questions': questions,
            'current_question_index': 0,
            'current_question': self._prepare_question(questions[0]),
            
            'player1_id': player1_id,
            'player2_id': player2_id,
            'player1_username': player1_username or 'Player 1',
            'player2_username': player2_username or 'Player 2',
            
            'player1_score': 0,
            'player2_score': 0,
            'player1_strikes': 0,
            'player2_strikes': 0,
            'player1_round_score': 0,
            'player2_round_score': 0,
            
            'current_player': player1_id,
            'is_steal_attempt': False,
            
            'status': 'active',
            'winner_id': None,
            'winner_username': None,
            
            'created_at': datetime.now(timezone.utc).isoformat(),
            'started_at': datetime.now(timezone.utc).isoformat(),
            'finished_at': None,
            
            'guess_history': []
        }
        
        self.active_games[session_id] = game
        logger.info(f"Created Feud game {game_id} for session {session_id}")
        
        return self._get_public_state(game)
    
    def _prepare_question(self, q: dict) -> dict:
        """Prepare question state"""
        return {
            'question_id': q['question_id'],
            'question': q['question'],
            'category': q.get('category', 'general'),
            'answers': q['answers'],
            'total_points': sum(a['points'] for a in q['answers']),
            'revealed_count': 0
        }
    
    def submit_guess(self, session_id: str, player_id: str, guess: str) -> dict:
        """Submit a guess"""
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if game['status'] != 'active':
            return {'error': 'Game not active'}
        
        if game['current_player'] != player_id:
            return {'error': 'Not your turn'}
        
        guess = guess.strip()
        if not guess:
            return {'error': 'Empty guess'}
        
        current_q = game['current_question']
        
        # Find match
        matched = None
        match_score = 0
        
        for ans in current_q['answers']:
            if ans['revealed']:
                continue
            
            is_match, score = fuzzy_match_answer(guess, ans)
            if is_match and score > match_score:
                matched = ans
                match_score = score
        
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
        
        # Record guess
        game['guess_history'].append({
            'player_id': player_id,
            'guess': guess,
            'correct': matched is not None,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
        if matched:
            # Correct!
            matched['revealed'] = True
            matched['guessed_by'] = player_id
            points = matched['points']
            
            if player_id == game['player1_id']:
                game['player1_score'] += points
                game['player1_round_score'] += points
                game['player1_strikes'] = 0
            else:
                game['player2_score'] += points
                game['player2_round_score'] += points
                game['player2_strikes'] = 0
            
            current_q['revealed_count'] = sum(1 for a in current_q['answers'] if a['revealed'])
            
            result['correct'] = True
            result['matched_answer'] = matched['answer']
            result['points'] = points
            
            # Check all revealed
            if all(a['revealed'] for a in current_q['answers']):
                result['question_ended'] = True
                result['reason'] = 'all_revealed'
                result['round_winner'] = self._get_round_winner(game)
                self._next_question(game)
        else:
            # Wrong
            result['strike'] = True
            
            if player_id == game['player1_id']:
                game['player1_strikes'] += 1
                strikes = game['player1_strikes']
            else:
                game['player2_strikes'] += 1
                strikes = game['player2_strikes']
            
            if strikes >= 3:
                if not game['is_steal_attempt']:
                    game['is_steal_attempt'] = True
                    game['current_player'] = game['player2_id'] if player_id == game['player1_id'] else game['player1_id']
                    result['steal_opportunity'] = True
                    result['steal_player'] = game['current_player']
                else:
                    result['question_ended'] = True
                    result['reason'] = 'steal_failed'
                    result['round_winner'] = self._get_round_winner(game)
                    for a in current_q['answers']:
                        a['revealed'] = True
                    self._next_question(game)
            else:
                game['current_player'] = game['player2_id'] if player_id == game['player1_id'] else game['player1_id']
        
        result['game_state'] = self._get_public_state(game)
        return result
    
    def _get_round_winner(self, game: dict) -> dict:
        """Get round winner"""
        if game['player1_round_score'] > game['player2_round_score']:
            return {'player_id': game['player1_id'], 'username': game['player1_username'], 'score': game['player1_round_score']}
        elif game['player2_round_score'] > game['player1_round_score']:
            return {'player_id': game['player2_id'], 'username': game['player2_username'], 'score': game['player2_round_score']}
        return {'player_id': 'tie', 'username': 'Tie', 'score': game['player1_round_score']}
    
    def _next_question(self, game: dict):
        """Move to next question"""
        game['player1_round_score'] = 0
        game['player2_round_score'] = 0
        game['player1_strikes'] = 0
        game['player2_strikes'] = 0
        game['is_steal_attempt'] = False
        
        game['current_question_index'] += 1
        
        if game['current_question_index'] >= len(game['questions']):
            self._finish_game(game)
        else:
            game['current_question'] = self._prepare_question(game['questions'][game['current_question_index']])
            game['current_player'] = game['player2_id'] if game['current_question_index'] % 2 else game['player1_id']
    
    def _finish_game(self, game: dict):
        """Finish game"""
        game['status'] = 'finished'
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
        
        logger.info(f"Feud game finished: {game['winner_username']} wins")
    
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
                'questions_played': game['current_question_index'] + 1,
                'guess_history': game['guess_history'],
                'created_at': game['created_at'],
                'finished_at': game.get('finished_at')
            }
            
            await collection.update_one(
                {'game_id': game['game_id']},
                {'$set': doc},
                upsert=True
            )
            
            logger.info(f"Saved Feud game {game['game_id']} to DB")
            return doc
        except Exception as e:
            logger.error(f"Error saving Feud game: {e}")
            return None
    
    def _get_public_state(self, game: dict) -> dict:
        """Get public game state"""
        cq = game['current_question']
        
        return {
            'game_id': game['game_id'],
            'game_type': 'feud',
            
            'current_question': {
                'question_id': cq['question_id'],
                'question': cq['question'],
                'category': cq.get('category', 'general'),
                'answers': [
                    {
                        'answer': a['answer'] if a['revealed'] else '???',
                        'points': a['points'] if a['revealed'] else '?',
                        'revealed': a['revealed'],
                        'guessed_by': a.get('guessed_by')
                    }
                    for a in cq['answers']
                ],
                'total_points': cq['total_points'],
                'revealed_count': cq.get('revealed_count', 0)
            },
            
            'question_number': game['current_question_index'] + 1,
            'total_questions': len(game['questions']),
            
            'player1_id': game['player1_id'],
            'player2_id': game['player2_id'],
            'player1_username': game['player1_username'],
            'player2_username': game['player2_username'],
            
            'player1_score': game['player1_score'],
            'player2_score': game['player2_score'],
            'player1_strikes': game['player1_strikes'],
            'player2_strikes': game['player2_strikes'],
            'player1_round_score': game.get('player1_round_score', 0),
            'player2_round_score': game.get('player2_round_score', 0),
            
            'current_player': game['current_player'],
            'is_steal_attempt': game.get('is_steal_attempt', False),
            
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


# ============================================================
# TRUTH OR DARE GAME SERVICE
# ============================================================

class TruthOrDareService:
    """
    Manages Truth or Dare games with bottle sync
    """
    
    def __init__(self):
        self.active_games: Dict[str, dict] = {}
    
    def create_game(self, session_id: str, player1_id: str, player2_id: str,
                    player1_username: str = "", player2_username: str = "") -> dict:
        """Create new Truth or Dare game"""
        
        if session_id in self.active_games:
            existing = self.active_games[session_id]
            if existing['status'] == 'active':
                return {'error': 'Game already in progress'}
        
        game_id = str(uuid.uuid4())
        
        game = {
            'game_id': game_id,
            'session_id': session_id,
            'game_type': 'truth_or_dare',
            
            'player1_id': player1_id,
            'player2_id': player2_id,
            'player1_username': player1_username or 'Player 1',
            'player2_username': player2_username or 'Player 2',
            
            'selected_player': None,
            'asker': None,
            'current_choice': None,
            'current_question': None,
            
            'round_state': 'ready',  # ready, spinning, choosing, asking, answering
            'rounds_played': 0,
            
            'spin_rotation': 0.0,
            'bottle_target': None,  # 'player1' or 'player2'
            
            'rounds_history': [],
            
            'status': 'active',
            'created_at': datetime.now(timezone.utc).isoformat(),
            'finished_at': None
        }
        
        self.active_games[session_id] = game
        logger.info(f"Created Truth or Dare game {game_id}")
        
        return self._get_public_state(game)
    
    def spin_bottle(self, session_id: str, spinner_id: str) -> dict:
        """Spin the bottle - deterministic direction based on random rotation"""
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if game['status'] != 'active':
            return {'error': 'Game not active'}
        
        if game['round_state'] not in ['ready', 'answering']:
            return {'error': 'Cannot spin now'}
        
        # Calculate spin
        base_rotation = game['spin_rotation']
        full_spins = 3 + random.randint(0, 3)  # 3-6 full rotations
        extra_degrees = random.random() * 360
        total_rotation = base_rotation + (full_spins * 360) + extra_degrees
        
        game['spin_rotation'] = total_rotation
        
        # Determine target based on final angle
        final_angle = total_rotation % 360
        
        # For desktop: 0-90 or 270-360 = right (player2/stranger), 90-270 = left (player1/me)
        # We normalize: bottle pointing RIGHT = player2, LEFT = player1
        if (final_angle >= 0 and final_angle < 90) or (final_angle >= 270 and final_angle <= 360):
            bottle_target = 'player2'
        else:
            bottle_target = 'player1'
        
        game['bottle_target'] = bottle_target
        
        # Set selected player (who must answer) and asker
        if bottle_target == 'player1':
            game['selected_player'] = game['player1_id']
            game['asker'] = game['player2_id']
        else:
            game['selected_player'] = game['player2_id']
            game['asker'] = game['player1_id']
        
        game['round_state'] = 'choosing'
        game['current_choice'] = None
        game['current_question'] = None
        
        return {
            'action': 'spin_result',
            'spin_rotation': total_rotation,
            'final_angle': final_angle,
            'bottle_target': bottle_target,
            'selected_player': game['selected_player'],
            'selected_username': game['player1_username'] if game['selected_player'] == game['player1_id'] else game['player2_username'],
            'asker': game['asker'],
            'asker_username': game['player1_username'] if game['asker'] == game['player1_id'] else game['player2_username'],
            'game_state': self._get_public_state(game)
        }
    
    def choose_truth_or_dare(self, session_id: str, player_id: str, choice: str) -> dict:
        """Selected player chooses truth or dare"""
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if game['round_state'] != 'choosing':
            return {'error': 'Not in choosing phase'}
        
        if game['selected_player'] != player_id:
            return {'error': 'Not your turn to choose'}
        
        if choice not in ['truth', 'dare']:
            return {'error': 'Invalid choice'}
        
        game['current_choice'] = choice
        game['round_state'] = 'asking'
        
        return {
            'action': 'choice_made',
            'choice': choice,
            'selected_player': game['selected_player'],
            'asker': game['asker'],
            'game_state': self._get_public_state(game)
        }
    
    def submit_question(self, session_id: str, asker_id: str, question: str) -> dict:
        """Asker submits the truth question or dare"""
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if game['round_state'] != 'asking':
            return {'error': 'Not in asking phase'}
        
        if game['asker'] != asker_id:
            return {'error': 'You are not the asker'}
        
        if not question or not question.strip():
            return {'error': 'Question cannot be empty'}
        
        game['current_question'] = question.strip()
        game['round_state'] = 'answering'
        
        return {
            'action': 'question_submitted',
            'choice': game['current_choice'],
            'question': game['current_question'],
            'selected_player': game['selected_player'],
            'asker': game['asker'],
            'game_state': self._get_public_state(game)
        }
    
    def complete_round(self, session_id: str, player_id: str, completed: bool = True) -> dict:
        """Mark round as complete"""
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        # Record round
        round_record = {
            'round_number': game['rounds_played'] + 1,
            'selected_player': game['selected_player'],
            'asker': game['asker'],
            'choice': game['current_choice'],
            'question': game['current_question'],
            'completed': completed,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        game['rounds_history'].append(round_record)
        
        game['rounds_played'] += 1
        game['round_state'] = 'ready'
        game['current_choice'] = None
        game['current_question'] = None
        game['selected_player'] = None
        game['asker'] = None
        
        return {
            'action': 'round_complete',
            'rounds_played': game['rounds_played'],
            'completed': completed,
            'game_state': self._get_public_state(game)
        }
    
    async def save_to_db(self, session_id: str):
        """Save game to MongoDB"""
        game = self.active_games.get(session_id)
        if not game:
            return None
        
        try:
            collection = get_truth_sessions_collection()
            
            doc = {
                'game_id': game['game_id'],
                'session_id': game['session_id'],
                'player1_id': game['player1_id'],
                'player2_id': game['player2_id'],
                'player1_username': game['player1_username'],
                'player2_username': game['player2_username'],
                'rounds_played': game['rounds_played'],
                'rounds_history': game['rounds_history'],
                'status': game['status'],
                'created_at': game['created_at'],
                'finished_at': game.get('finished_at')
            }
            
            await collection.update_one(
                {'game_id': game['game_id']},
                {'$set': doc},
                upsert=True
            )
            
            logger.info(f"Saved Truth or Dare game {game['game_id']} to DB")
            return doc
        except Exception as e:
            logger.error(f"Error saving Truth or Dare game: {e}")
            return None
    
    def _get_public_state(self, game: dict) -> dict:
        """Get public game state"""
        return {
            'game_id': game['game_id'],
            'game_type': 'truth_or_dare',
            
            'player1_id': game['player1_id'],
            'player2_id': game['player2_id'],
            'player1_username': game['player1_username'],
            'player2_username': game['player2_username'],
            
            'selected_player': game.get('selected_player'),
            'selected_username': game['player1_username'] if game.get('selected_player') == game['player1_id'] else game['player2_username'] if game.get('selected_player') else None,
            'asker': game.get('asker'),
            'asker_username': game['player1_username'] if game.get('asker') == game['player1_id'] else game['player2_username'] if game.get('asker') else None,
            
            'current_choice': game.get('current_choice'),
            'current_question': game.get('current_question'),
            
            'round_state': game['round_state'],
            'rounds_played': game['rounds_played'],
            
            'spin_rotation': game.get('spin_rotation', 0),
            'bottle_target': game.get('bottle_target'),
            
            'status': game['status']
        }
    
    def get_game(self, session_id: str) -> Optional[dict]:
        """Get game state"""
        game = self.active_games.get(session_id)
        return self._get_public_state(game) if game else None
    
    def end_game(self, session_id: str) -> Optional[dict]:
        """End and cleanup game"""
        game = self.active_games.pop(session_id, None)
        if game:
            game['status'] = 'finished'
            game['finished_at'] = datetime.now(timezone.utc).isoformat()
            return self._get_public_state(game)
        return None
    
    def has_active_game(self, session_id: str) -> bool:
        """Check if session has active game"""
        game = self.active_games.get(session_id)
        return game is not None and game['status'] == 'active'


# Global service instances
feud_service = FeudGameService()
truth_or_dare_service = TruthOrDareService()
