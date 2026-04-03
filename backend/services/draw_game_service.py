"""
Draw & Guess Game Service - Real-time multiplayer drawing game
Handles game state, word selection, guess validation, and score tracking
"""
from typing import Dict, List, Optional, Set
from datetime import datetime, timezone
import logging
import uuid
import random

logger = logging.getLogger(__name__)

# Word bank for drawing — 200+ drawable words, varied difficulty
WORD_BANK = [
    # Animals (25)
    "cat", "dog", "elephant", "giraffe", "penguin", "octopus", "dolphin", "kangaroo",
    "flamingo", "chameleon", "hedgehog", "jellyfish", "peacock", "scorpion", "lobster",
    "parrot", "squirrel", "buffalo", "crocodile", "hamster", "koala", "panda",
    "seahorse", "vulture", "zebra",

    # Food & Drink (25)
    "pizza", "sushi", "taco", "pancake", "pretzel", "popcorn", "waffle",
    "broccoli", "avocado", "pineapple", "coconut", "mushroom", "lollipop",
    "cupcake", "milkshake", "burrito", "noodles", "dumpling", "baguette",
    "cinnamon roll", "fried egg", "hot dog", "onion ring", "cherry", "mango",

    # Objects (30)
    "telescope", "headphones", "backpack", "umbrella", "candle", "scissors",
    "envelope", "compass", "hourglass", "binoculars", "flashlight", "magnifying glass",
    "padlock", "trophy", "crown", "diamond", "anchor", "boomerang", "ladder",
    "wheelbarrow", "mailbox", "traffic light", "fire hydrant", "microphone",
    "skateboard", "trampoline", "toolbox", "birdhouse", "windmill", "scarecrow",

    # Places & Buildings (20)
    "castle", "lighthouse", "igloo", "pyramid", "volcano", "waterfall",
    "bridge", "ferris wheel", "skyscraper", "tent", "barn", "prison",
    "fountain", "treehouse", "cave", "stadium", "airport", "aquarium",
    "greenhouse", "observatory",

    # Transportation (15)
    "submarine", "helicopter", "sailboat", "rocket", "ambulance", "bulldozer",
    "gondola", "hot air balloon", "jet ski", "canoe", "trolley", "spaceship",
    "scooter", "fire truck", "cable car",

    # Nature & Weather (20)
    "tornado", "avalanche", "rainbow", "cactus", "palm tree", "iceberg",
    "coral reef", "meteor", "eclipse", "northern lights", "geyser", "quicksand",
    "tidal wave", "sandcastle", "campfire", "snowflake", "sunrise", "whirlpool",
    "fossil", "stalactite",

    # Clothing & Accessories (15)
    "sombrero", "bow tie", "flip flops", "snorkel", "monocle", "cape",
    "turban", "earmuffs", "suspenders", "tiara", "mittens", "bandana",
    "top hat", "ballet shoes", "goggles",

    # Activities & Sports (20)
    "surfing", "archery", "juggling", "fencing", "wrestling", "bowling",
    "skydiving", "karate", "hopscotch", "tug of war", "limbo", "leapfrog",
    "arm wrestling", "bungee jumping", "rodeo", "polo", "curling",
    "ice skating", "rock climbing", "hang gliding",

    # Professions (15)
    "astronaut", "pirate", "ninja", "wizard", "detective", "chef",
    "firefighter", "knight", "mermaid", "gladiator", "pharaoh",
    "lumberjack", "beekeeper", "blacksmith", "ringmaster",

    # Household (15)
    "chandelier", "rocking chair", "bathtub", "fireplace", "grandfather clock",
    "toaster", "blender", "ironing board", "ceiling fan", "bookshelf",
    "doorbell", "chimney", "staircase", "hammock", "bunk bed",

    # Miscellaneous (20)
    "treasure chest", "dream catcher", "jack in the box", "voodoo doll",
    "paper airplane", "snow globe", "music box", "message in a bottle",
    "wrecking ball", "time machine", "magic carpet", "pinata",
    "slot machine", "cuckoo clock", "jigsaw puzzle", "dart board",
    "fortune cookie", "chess piece", "disco ball", "sand timer",
]


class DrawGameService:
    """
    Manages Draw & Guess games with full backend state control
    """
    
    def __init__(self):
        self.active_games: Dict[str, dict] = {}
        self.ROUND_TIME_SECONDS = 30
        self.MAX_ROUNDS = 4  # Each player draws once in a 4-player game
        self.CORRECT_GUESS_POINTS = 100
        self.DRAWER_POINTS = 50  # Points for drawer when someone guesses correctly
    
    def create_game(self, session_id: str, players: List[dict]) -> dict:
        """
        Create a new Draw & Guess game
        
        Args:
            session_id: Unique session identifier
            players: List of player dicts with {user_id, username, socket_id}
        """
        if len(players) < 2 or len(players) > 4:
            return {'error': 'Game requires 2-4 players'}
        
        # Generate room code
        room_code = ''.join(random.choices('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', k=6))
        
        # Select unique words for all rounds (no repeats within a game)
        num_words = min(len(players) * 2, len(WORD_BANK))  # Extra words in case of replays
        words = random.sample(WORD_BANK, num_words)
        
        # Initialize player scores
        player_scores = {p['user_id']: 0 for p in players}
        
        # Determine drawer order (randomize)
        drawer_order = [p['user_id'] for p in players]
        random.shuffle(drawer_order)
        
        game = {
            'session_id': session_id,
            'game_id': str(uuid.uuid4()),
            'room_code': room_code,
            'players': players,
            'player_scores': player_scores,
            'drawer_order': drawer_order,
            'current_round': 1,
            'total_rounds': len(players),  # Each player draws once
            'current_drawer_id': drawer_order[0],
            'current_word': words[0],
            'words': words,
            'round_start_time': datetime.now(timezone.utc).isoformat(),
            'round_time_limit': self.ROUND_TIME_SECONDS,
            'guessed_players': [],  # Players who guessed correctly this round
            'round_active': True,
            'status': 'active',
            'winner_id': None,
            'winner_username': None,
            'canvas_data': [],  # Drawing strokes for sync
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        self.active_games[session_id] = game
        
        logger.info(f"Draw game created for session {session_id} with {len(players)} players")
        
        return self._get_game_state(game)
    
    def get_game(self, session_id: str) -> Optional[dict]:
        """Get current game state"""
        game = self.active_games.get(session_id)
        if game:
            return self._get_game_state(game)
        return None
    
    def get_player_state(self, session_id: str, player_id: str) -> Optional[dict]:
        """Get game state from a specific player's perspective"""
        game = self.active_games.get(session_id)
        if not game:
            return None
        
        is_drawer = player_id == game['current_drawer_id']
        has_guessed = player_id in game['guessed_players']
        
        state = self._get_game_state(game)
        state['is_drawer'] = is_drawer
        state['has_guessed'] = has_guessed
        
        # Only drawer can see the word
        if is_drawer:
            state['current_word'] = game['current_word']
        else:
            # Show word length as hint (underscores)
            word_length = len(game['current_word'])
            state['word_hint'] = '_' * word_length
            state['current_word'] = None
        
        # Include player's own score
        state['my_score'] = game['player_scores'].get(player_id, 0)
        
        return state
    
    def add_stroke(self, session_id: str, player_id: str, stroke_data: dict) -> dict:
        """
        Add a drawing stroke (only drawer can draw)
        
        stroke_data: {
            points: [[x, y], ...],
            color: '#000000',
            width: 5,
            tool: 'pen' | 'eraser'
        }
        """
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if game['status'] != 'active' or not game['round_active']:
            return {'error': 'Round not active'}
        
        if player_id != game['current_drawer_id']:
            return {'error': 'Only the drawer can draw'}
        
        # Add stroke to canvas data
        stroke = {
            'id': str(uuid.uuid4()),
            'timestamp': datetime.now(timezone.utc).isoformat(),
            **stroke_data
        }
        game['canvas_data'].append(stroke)
        game['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        return {
            'success': True,
            'stroke': stroke
        }
    
    def undo_stroke(self, session_id: str, player_id: str) -> dict:
        """Remove last stroke (only drawer)"""
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if player_id != game['current_drawer_id']:
            return {'error': 'Only the drawer can undo'}
        
        if game['canvas_data']:
            removed = game['canvas_data'].pop()
            return {'success': True, 'removed_stroke_id': removed['id']}
        
        return {'success': True, 'removed_stroke_id': None}
    
    def clear_canvas(self, session_id: str, player_id: str) -> dict:
        """Clear entire canvas (only drawer)"""
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if player_id != game['current_drawer_id']:
            return {'error': 'Only the drawer can clear'}
        
        game['canvas_data'] = []
        game['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        return {'success': True}
    
    def submit_guess(self, session_id: str, player_id: str, guess: str) -> dict:
        """
        Submit a guess
        
        Returns result with correct/incorrect and updated scores
        """
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if game['status'] != 'active' or not game['round_active']:
            return {'error': 'Round not active'}
        
        # Drawer can't guess
        if player_id == game['current_drawer_id']:
            return {'error': 'Drawer cannot guess'}
        
        # Already guessed correctly
        if player_id in game['guessed_players']:
            return {'error': 'Already guessed correctly'}
        
        # Normalize guess
        guess = guess.lower().strip()
        correct_word = game['current_word'].lower().strip()
        
        # Check if correct (exact match or very close)
        is_correct = guess == correct_word or self._fuzzy_match(guess, correct_word)
        
        result = {
            'player_id': player_id,
            'guess': guess,
            'correct': is_correct,
            'points_earned': 0
        }
        
        if is_correct:
            # Award points to guesser
            game['player_scores'][player_id] = game['player_scores'].get(player_id, 0) + self.CORRECT_GUESS_POINTS
            result['points_earned'] = self.CORRECT_GUESS_POINTS
            
            # Award points to drawer
            drawer_id = game['current_drawer_id']
            game['player_scores'][drawer_id] = game['player_scores'].get(drawer_id, 0) + self.DRAWER_POINTS
            
            # Mark as guessed
            game['guessed_players'].append(player_id)
            
            # Get player username
            for p in game['players']:
                if p['user_id'] == player_id:
                    result['player_username'] = p['username']
                    break
            
            # Check if all players have guessed (except drawer)
            non_drawer_players = [p['user_id'] for p in game['players'] if p['user_id'] != game['current_drawer_id']]
            if set(game['guessed_players']) >= set(non_drawer_players):
                result['round_complete'] = True
                result['reason'] = 'all_guessed'
        
        game['updated_at'] = datetime.now(timezone.utc).isoformat()
        result['game_state'] = self._get_game_state(game)
        result['scores'] = game['player_scores']
        
        return result
    
    def skip_turn(self, session_id: str, player_id: str) -> dict:
        """Drawer skips their turn"""
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if player_id != game['current_drawer_id']:
            return {'error': 'Only the drawer can skip'}
        
        return self.end_round(session_id, reason='skipped')
    
    def end_round(self, session_id: str, reason: str = 'timeout') -> dict:
        """
        End the current round
        
        reason: 'timeout', 'all_guessed', 'skipped'
        """
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        game['round_active'] = False
        
        result = {
            'round': game['current_round'],
            'word': game['current_word'],
            'reason': reason,
            'guessed_players': game['guessed_players'],
            'scores': game['player_scores']
        }
        
        # Check if game is over
        if game['current_round'] >= game['total_rounds']:
            game['status'] = 'finished'
            
            # Determine winner
            max_score = max(game['player_scores'].values())
            for p in game['players']:
                if game['player_scores'].get(p['user_id'], 0) == max_score:
                    game['winner_id'] = p['user_id']
                    game['winner_username'] = p['username']
                    break
            
            result['game_over'] = True
            result['winner_id'] = game['winner_id']
            result['winner_username'] = game['winner_username']
            result['final_scores'] = game['player_scores']
        else:
            result['game_over'] = False
        
        game['updated_at'] = datetime.now(timezone.utc).isoformat()
        result['game_state'] = self._get_game_state(game)
        
        return result
    
    def next_round(self, session_id: str) -> dict:
        """Start the next round"""
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if game['status'] != 'active':
            return {'error': 'Game is not active'}
        
        if game['current_round'] >= game['total_rounds']:
            return {'error': 'Game is already complete'}
        
        # Move to next round
        game['current_round'] += 1
        
        # Next drawer
        drawer_index = game['current_round'] - 1
        game['current_drawer_id'] = game['drawer_order'][drawer_index % len(game['drawer_order'])]
        
        # New word — never repeat within the same game
        if drawer_index < len(game['words']):
            game['current_word'] = game['words'][drawer_index]
        else:
            used = set(game['words'])
            available = [w for w in WORD_BANK if w not in used]
            if not available:
                available = WORD_BANK  # All exhausted, reset pool
            pick = random.choice(available)
            game['words'].append(pick)
            game['current_word'] = pick
        
        # Reset round state
        game['guessed_players'] = []
        game['canvas_data'] = []
        game['round_active'] = True
        game['round_start_time'] = datetime.now(timezone.utc).isoformat()
        game['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        return {
            'success': True,
            'round': game['current_round'],
            'drawer_id': game['current_drawer_id'],
            'game_state': self._get_game_state(game)
        }
    
    def end_game(self, session_id: str) -> Optional[dict]:
        """End and cleanup game"""
        game = self.active_games.pop(session_id, None)
        if game:
            game['status'] = 'finished'
            game['updated_at'] = datetime.now(timezone.utc).isoformat()
            return self._get_game_state(game)
        return None
    
    def _fuzzy_match(self, guess: str, word: str) -> bool:
        """STRICT matching — exact match or single-character typo only"""
        # Exact match
        if guess == word:
            return True

        # Space-insensitive exact match (e.g. "icecream" vs "ice cream")
        if guess.replace(' ', '') == word.replace(' ', ''):
            return True

        # Allow exactly 1 typo via Levenshtein distance, only if lengths are close
        if abs(len(guess) - len(word)) <= 1 and self._levenshtein_distance(guess, word) <= 1:
            return True

        return False
    
    def _levenshtein_distance(self, s1: str, s2: str) -> int:
        """Calculate Levenshtein distance between two strings"""
        if len(s1) < len(s2):
            return self._levenshtein_distance(s2, s1)
        
        if len(s2) == 0:
            return len(s1)
        
        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        
        return previous_row[-1]
    
    def _get_game_state(self, game: dict) -> dict:
        """Get public game state (word hidden)"""
        # Build player list with scores
        players_with_scores = []
        for p in game['players']:
            players_with_scores.append({
                'user_id': p['user_id'],
                'username': p['username'],
                'score': game['player_scores'].get(p['user_id'], 0),
                'is_drawer': p['user_id'] == game['current_drawer_id'],
                'has_guessed': p['user_id'] in game['guessed_players']
            })
        
        # Get drawer username
        drawer_username = None
        for p in game['players']:
            if p['user_id'] == game['current_drawer_id']:
                drawer_username = p['username']
                break
        
        return {
            'session_id': game['session_id'],
            'game_id': game['game_id'],
            'room_code': game['room_code'],
            'players': players_with_scores,
            'current_round': game['current_round'],
            'total_rounds': game['total_rounds'],
            'current_drawer_id': game['current_drawer_id'],
            'drawer_username': drawer_username,
            'round_time_limit': game['round_time_limit'],
            'round_start_time': game['round_start_time'],
            'round_active': game['round_active'],
            'guessed_count': len(game['guessed_players']),
            'total_guessers': len(game['players']) - 1,
            'status': game['status'],
            'winner_id': game['winner_id'],
            'winner_username': game['winner_username'],
            'canvas_data': game['canvas_data'],
            'scores': game['player_scores']
        }


# Global service instance
draw_game_service = DrawGameService()
