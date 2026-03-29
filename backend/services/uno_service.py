"""
UNO Game Engine - Complete Backend Implementation
Full multiplayer sync with room-based state management
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone
import logging
import uuid
import random

logger = logging.getLogger(__name__)

# ============================================================
# UNO CARD DEFINITIONS
# ============================================================

UNO_COLORS = ['red', 'blue', 'green', 'yellow']
UNO_NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
UNO_SPECIALS = ['skip', 'reverse', 'draw_two']
UNO_WILDS = ['wild', 'wild_draw_four']

def create_uno_deck() -> List[dict]:
    """Create a standard 108-card UNO deck"""
    deck = []
    card_id = 0
    
    for color in UNO_COLORS:
        # One 0 per color
        deck.append({
            'id': f'card_{card_id}',
            'color': color,
            'value': '0',
            'type': 'number'
        })
        card_id += 1
        
        # Two of each 1-9 per color
        for number in UNO_NUMBERS[1:]:
            for _ in range(2):
                deck.append({
                    'id': f'card_{card_id}',
                    'color': color,
                    'value': number,
                    'type': 'number'
                })
                card_id += 1
        
        # Two of each special card per color
        for special in UNO_SPECIALS:
            for _ in range(2):
                deck.append({
                    'id': f'card_{card_id}',
                    'color': color,
                    'value': special,
                    'type': 'action'
                })
                card_id += 1
    
    # Four Wild cards
    for _ in range(4):
        deck.append({
            'id': f'card_{card_id}',
            'color': 'wild',
            'value': 'wild',
            'type': 'wild'
        })
        card_id += 1
    
    # Four Wild Draw Four cards
    for _ in range(4):
        deck.append({
            'id': f'card_{card_id}',
            'color': 'wild',
            'value': 'wild_draw_four',
            'type': 'wild'
        })
        card_id += 1
    
    return deck


def shuffle_deck(deck: List[dict]) -> List[dict]:
    """Secure shuffle of deck"""
    shuffled = deck.copy()
    random.shuffle(shuffled)
    return shuffled


def is_valid_play(card: dict, top_card: dict, current_color: str) -> bool:
    """
    Check if a card can be played on the current discard pile
    
    Valid plays:
    - Wild cards can always be played
    - Same color as current_color
    - Same number/value as top card
    """
    # Wild cards can always be played
    if card['type'] == 'wild':
        return True
    
    # Match current color
    if card['color'] == current_color:
        return True
    
    # Match value (number or action type)
    if card['value'] == top_card['value']:
        return True
    
    return False


def get_playable_cards(hand: List[dict], top_card: dict, current_color: str) -> List[str]:
    """Return list of card IDs that can be played"""
    playable = []
    for card in hand:
        if is_valid_play(card, top_card, current_color):
            playable.append(card['id'])
    return playable


# ============================================================
# UNO GAME SERVICE
# ============================================================

class UnoGameService:
    """
    Manages UNO games with full backend state control
    """
    
    def __init__(self):
        self.active_games: Dict[str, dict] = {}
        self.uno_called: Dict[str, set] = {}  # Track UNO calls per session
        self.STARTING_HAND_SIZE = 7
        self.UNO_PENALTY_CARDS = 2
    
    def create_game(self, session_id: str, player1_id: str, player2_id: str,
                    player1_username: str = "Player 1", player2_username: str = "Player 2") -> dict:
        """Create a new UNO game for a room"""
        
        # Create and shuffle deck
        deck = create_uno_deck()
        deck = shuffle_deck(deck)
        
        # Deal hands
        player1_hand = deck[:self.STARTING_HAND_SIZE]
        player2_hand = deck[self.STARTING_HAND_SIZE:self.STARTING_HAND_SIZE * 2]
        draw_pile = deck[self.STARTING_HAND_SIZE * 2:]
        
        # Find first valid starting card (must be a number card)
        discard_pile = []
        starting_card = None
        
        while draw_pile and not starting_card:
            card = draw_pile.pop(0)
            if card['type'] == 'number':
                starting_card = card
                discard_pile.append(card)
            else:
                # Put action/wild cards back at bottom
                draw_pile.append(card)
        
        # Determine starting color from first card
        current_color = starting_card['color'] if starting_card else 'red'
        
        # Randomly determine who goes first
        first_player = random.choice([player1_id, player2_id])
        
        game = {
            'session_id': session_id,
            'game_id': str(uuid.uuid4()),
            'player1_id': player1_id,
            'player2_id': player2_id,
            'player1_username': player1_username,
            'player2_username': player2_username,
            'player1_hand': player1_hand,
            'player2_hand': player2_hand,
            'draw_pile': draw_pile,
            'discard_pile': discard_pile,
            'current_turn': first_player,
            'current_color': current_color,
            'direction': 1,  # 1 = normal, -1 = reversed (only matters in 2+ player)
            'status': 'active',
            'winner_id': None,
            'winner_username': None,
            'last_action': None,
            'pending_draw': 0,  # For stacking draw cards
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        self.active_games[session_id] = game
        self.uno_called[session_id] = set()
        
        logger.info(f"UNO game created for session {session_id}")
        
        return self._get_public_state(game)
    
    def get_game(self, session_id: str) -> Optional[dict]:
        """Get current game state"""
        game = self.active_games.get(session_id)
        if game:
            return self._get_public_state(game)
        return None
    
    def get_player_state(self, session_id: str, player_id: str) -> Optional[dict]:
        """Get game state from a specific player's perspective"""
        game = self.active_games.get(session_id)
        if not game:
            return None
        
        is_player1 = player_id == game['player1_id']
        my_hand = game['player1_hand'] if is_player1 else game['player2_hand']
        opponent_hand_count = len(game['player2_hand']) if is_player1 else len(game['player1_hand'])
        opponent_id = game['player2_id'] if is_player1 else game['player1_id']
        opponent_username = game['player2_username'] if is_player1 else game['player1_username']
        
        top_card = game['discard_pile'][-1] if game['discard_pile'] else None
        playable_cards = get_playable_cards(my_hand, top_card, game['current_color']) if top_card else []
        
        return {
            'session_id': session_id,
            'game_id': game['game_id'],
            'status': game['status'],
            'my_hand': my_hand,
            'my_hand_count': len(my_hand),
            'opponent_hand_count': opponent_hand_count,
            'opponent_id': opponent_id,
            'opponent_username': opponent_username,
            'top_card': top_card,
            'current_color': game['current_color'],
            'current_turn': game['current_turn'],
            'is_my_turn': game['current_turn'] == player_id,
            'playable_card_ids': playable_cards,
            'draw_pile_count': len(game['draw_pile']),
            'direction': game['direction'],
            'pending_draw': game['pending_draw'],
            'last_action': game['last_action'],
            'winner_id': game['winner_id'],
            'winner_username': game['winner_username'],
            'can_call_uno': len(my_hand) == 2,
            'must_call_uno': len(my_hand) == 2 and not self._has_called_uno(session_id, player_id)
        }
    
    def play_card(self, session_id: str, player_id: str, card_id: str, 
                  chosen_color: Optional[str] = None) -> dict:
        """
        Attempt to play a card
        
        Returns result with success status and updated game state
        """
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if game['status'] != 'active':
            return {'error': 'Game is not active'}
        
        if game['current_turn'] != player_id:
            return {'error': 'Not your turn'}
        
        # Get player's hand
        is_player1 = player_id == game['player1_id']
        hand = game['player1_hand'] if is_player1 else game['player2_hand']
        
        # Find the card in hand
        card = None
        card_index = None
        for i, c in enumerate(hand):
            if c['id'] == card_id:
                card = c
                card_index = i
                break
        
        if not card:
            return {'error': 'Card not in hand'}
        
        # Validate the play
        top_card = game['discard_pile'][-1] if game['discard_pile'] else None
        if not is_valid_play(card, top_card, game['current_color']):
            return {'error': 'Invalid play', 'reason': 'Card does not match color or value'}
        
        # For wild cards, require color choice
        if card['type'] == 'wild':
            if not chosen_color or chosen_color not in UNO_COLORS:
                return {'error': 'Must choose a color for wild card'}
        
        # Check UNO penalty - if player has 2 cards and didn't call UNO before playing
        uno_penalty = False
        if len(hand) == 2 and not self._has_called_uno(session_id, player_id):
            uno_penalty = True
        
        # Remove card from hand and add to discard pile
        hand.pop(card_index)
        game['discard_pile'].append(card)
        
        # Update color
        if card['type'] == 'wild':
            game['current_color'] = chosen_color
        else:
            game['current_color'] = card['color']
        
        # Process special card effects
        opponent_id = game['player2_id'] if is_player1 else game['player1_id']
        action_result = self._process_card_effect(game, card, player_id, opponent_id)
        
        # Apply UNO penalty if needed (draw 2 cards)
        if uno_penalty:
            self._apply_uno_penalty(game, player_id)
            action_result['uno_penalty'] = True
            action_result['penalty_cards'] = self.UNO_PENALTY_CARDS
        
        # Clear UNO call status after playing
        if session_id in self.uno_called:
            self.uno_called[session_id].discard(player_id)
        
        # Check for winner
        if len(hand) == 0:
            game['status'] = 'finished'
            game['winner_id'] = player_id
            game['winner_username'] = game['player1_username'] if is_player1 else game['player2_username']
        
        game['last_action'] = {
            'type': 'play',
            'player_id': player_id,
            'card': card,
            'chosen_color': chosen_color,
            **action_result
        }
        game['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        return {
            'success': True,
            'action': 'play_card',
            'card': card,
            'chosen_color': chosen_color,
            'new_color': game['current_color'],
            'current_turn': game['current_turn'],
            'game_state': self._get_public_state(game),
            **action_result
        }
    
    def draw_card(self, session_id: str, player_id: str) -> dict:
        """
        Draw a card from the draw pile
        """
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        if game['status'] != 'active':
            return {'error': 'Game is not active'}
        
        if game['current_turn'] != player_id:
            return {'error': 'Not your turn'}
        
        # Reshuffle if draw pile is empty
        if len(game['draw_pile']) == 0:
            self._reshuffle_discard(game)
        
        if len(game['draw_pile']) == 0:
            return {'error': 'No cards left to draw'}
        
        # Draw card
        drawn_card = game['draw_pile'].pop(0)
        
        # Add to player's hand
        is_player1 = player_id == game['player1_id']
        hand = game['player1_hand'] if is_player1 else game['player2_hand']
        hand.append(drawn_card)
        
        # Check if drawn card is playable
        top_card = game['discard_pile'][-1] if game['discard_pile'] else None
        can_play = is_valid_play(drawn_card, top_card, game['current_color']) if top_card else False
        
        # If drawn card can't be played, switch turns
        if not can_play:
            opponent_id = game['player2_id'] if is_player1 else game['player1_id']
            game['current_turn'] = opponent_id
        
        game['last_action'] = {
            'type': 'draw',
            'player_id': player_id,
            'card_count': 1,
            'can_play_drawn': can_play
        }
        game['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        return {
            'success': True,
            'action': 'draw_card',
            'drawn_card': drawn_card,
            'can_play_drawn': can_play,
            'current_turn': game['current_turn'],
            'game_state': self._get_public_state(game)
        }
    
    def call_uno(self, session_id: str, player_id: str) -> dict:
        """
        Player calls UNO when they have 2 cards
        """
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        is_player1 = player_id == game['player1_id']
        hand = game['player1_hand'] if is_player1 else game['player2_hand']
        
        if len(hand) != 2:
            return {'error': 'Can only call UNO with 2 cards'}
        
        # Register UNO call
        if session_id not in self.uno_called:
            self.uno_called[session_id] = set()
        self.uno_called[session_id].add(player_id)
        
        logger.info(f"Player {player_id} called UNO in session {session_id}")
        
        return {
            'success': True,
            'action': 'uno_call',
            'player_id': player_id,
            'player_username': game['player1_username'] if is_player1 else game['player2_username']
        }
    
    def challenge_uno(self, session_id: str, challenger_id: str, target_id: str) -> dict:
        """
        Challenge another player for not calling UNO
        Only valid if target has 1 card and didn't call UNO
        """
        game = self.active_games.get(session_id)
        if not game:
            return {'error': 'Game not found'}
        
        is_target_player1 = target_id == game['player1_id']
        target_hand = game['player1_hand'] if is_target_player1 else game['player2_hand']
        
        # Challenge only valid if target has 1 card and didn't call UNO
        if len(target_hand) != 1:
            return {'error': 'Target does not have 1 card'}
        
        if self._has_called_uno(session_id, target_id):
            return {'error': 'Target called UNO correctly', 'valid_challenge': False}
        
        # Apply penalty
        self._apply_uno_penalty(game, target_id)
        
        return {
            'success': True,
            'action': 'uno_challenge',
            'valid_challenge': True,
            'penalized_player': target_id,
            'penalty_cards': self.UNO_PENALTY_CARDS,
            'game_state': self._get_public_state(game)
        }
    
    def end_game(self, session_id: str) -> Optional[dict]:
        """End and cleanup game"""
        game = self.active_games.pop(session_id, None)
        self.uno_called.pop(session_id, None)
        
        if game:
            game['status'] = 'finished'
            game['updated_at'] = datetime.now(timezone.utc).isoformat()
            return self._get_public_state(game)
        return None
    
    # ============================================================
    # PRIVATE HELPERS
    # ============================================================
    
    def _has_called_uno(self, session_id: str, player_id: str) -> bool:
        """Check if player has called UNO"""
        return player_id in self.uno_called.get(session_id, set())
    
    def _apply_uno_penalty(self, game: dict, player_id: str):
        """Apply UNO penalty - draw cards"""
        is_player1 = player_id == game['player1_id']
        hand = game['player1_hand'] if is_player1 else game['player2_hand']
        
        for _ in range(self.UNO_PENALTY_CARDS):
            if len(game['draw_pile']) == 0:
                self._reshuffle_discard(game)
            if len(game['draw_pile']) > 0:
                hand.append(game['draw_pile'].pop(0))
        
        logger.info(f"UNO penalty applied to player {player_id}: +{self.UNO_PENALTY_CARDS} cards")
    
    def _reshuffle_discard(self, game: dict):
        """Reshuffle discard pile back into draw pile, keeping top card"""
        if len(game['discard_pile']) <= 1:
            return
        
        top_card = game['discard_pile'].pop()
        cards_to_shuffle = game['discard_pile']
        game['discard_pile'] = [top_card]
        
        random.shuffle(cards_to_shuffle)
        game['draw_pile'] = cards_to_shuffle + game['draw_pile']
        
        logger.info(f"Reshuffled {len(cards_to_shuffle)} cards back into draw pile")
    
    def _process_card_effect(self, game: dict, card: dict, player_id: str, opponent_id: str) -> dict:
        """Process special card effects"""
        result = {}
        
        if card['type'] == 'action':
            if card['value'] == 'skip':
                # In 2-player, skip means opponent loses turn
                game['current_turn'] = player_id  # Stay on current player
                result['effect'] = 'skip'
                result['skipped_player'] = opponent_id
                
            elif card['value'] == 'reverse':
                # In 2-player, reverse acts like skip
                game['direction'] *= -1
                game['current_turn'] = player_id  # Stay on current player
                result['effect'] = 'reverse'
                
            elif card['value'] == 'draw_two':
                # Opponent draws 2 and loses turn
                opponent_hand = game['player2_hand'] if player_id == game['player1_id'] else game['player1_hand']
                for _ in range(2):
                    if len(game['draw_pile']) == 0:
                        self._reshuffle_discard(game)
                    if len(game['draw_pile']) > 0:
                        opponent_hand.append(game['draw_pile'].pop(0))
                game['current_turn'] = player_id  # Stay on current player
                result['effect'] = 'draw_two'
                result['affected_player'] = opponent_id
                result['cards_drawn'] = 2
                
        elif card['type'] == 'wild':
            if card['value'] == 'wild_draw_four':
                # Opponent draws 4 and loses turn
                opponent_hand = game['player2_hand'] if player_id == game['player1_id'] else game['player1_hand']
                for _ in range(4):
                    if len(game['draw_pile']) == 0:
                        self._reshuffle_discard(game)
                    if len(game['draw_pile']) > 0:
                        opponent_hand.append(game['draw_pile'].pop(0))
                game['current_turn'] = player_id  # Stay on current player
                result['effect'] = 'wild_draw_four'
                result['affected_player'] = opponent_id
                result['cards_drawn'] = 4
            else:
                # Regular wild - just switch turns normally
                game['current_turn'] = opponent_id
                result['effect'] = 'wild'
        else:
            # Normal number card - switch turns
            game['current_turn'] = opponent_id
            result['effect'] = 'none'
        
        return result
    
    def _get_public_state(self, game: dict) -> dict:
        """Get public game state (no hidden hands)"""
        return {
            'session_id': game['session_id'],
            'game_id': game['game_id'],
            'player1_id': game['player1_id'],
            'player2_id': game['player2_id'],
            'player1_username': game['player1_username'],
            'player2_username': game['player2_username'],
            'player1_hand_count': len(game['player1_hand']),
            'player2_hand_count': len(game['player2_hand']),
            'top_card': game['discard_pile'][-1] if game['discard_pile'] else None,
            'current_color': game['current_color'],
            'current_turn': game['current_turn'],
            'direction': game['direction'],
            'draw_pile_count': len(game['draw_pile']),
            'status': game['status'],
            'winner_id': game['winner_id'],
            'winner_username': game['winner_username'],
            'last_action': game['last_action']
        }


# Global service instance
uno_service = UnoGameService()
