"""
UNO Game Service Tests - Task 5/5 Testing
Tests for:
- UNO deck creation and shuffling
- Card validation logic (color matching, value matching, wild cards)
- play_card function with all card types
- draw_card function
- call_uno and penalty logic
- Special card effects (skip, reverse, draw_two, wild_draw_four)
"""
import pytest
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.uno_service import (
    create_uno_deck,
    shuffle_deck,
    is_valid_play,
    get_playable_cards,
    UnoGameService,
    UNO_COLORS,
    UNO_NUMBERS,
    UNO_SPECIALS,
    UNO_WILDS
)


class TestUnoDeckCreation:
    """Tests for UNO deck creation and structure"""
    
    def test_deck_has_108_cards(self):
        """Standard UNO deck should have 108 cards"""
        deck = create_uno_deck()
        assert len(deck) == 108, f"Expected 108 cards, got {len(deck)}"
        print("✓ Deck has 108 cards")
    
    def test_deck_has_correct_number_cards(self):
        """Each color should have one 0 and two of each 1-9"""
        deck = create_uno_deck()
        
        for color in UNO_COLORS:
            # Count 0s (should be 1 per color)
            zeros = [c for c in deck if c['color'] == color and c['value'] == '0']
            assert len(zeros) == 1, f"Expected 1 zero for {color}, got {len(zeros)}"
            
            # Count 1-9 (should be 2 each per color)
            for num in UNO_NUMBERS[1:]:
                cards = [c for c in deck if c['color'] == color and c['value'] == num]
                assert len(cards) == 2, f"Expected 2 {num}s for {color}, got {len(cards)}"
        
        print("✓ Number cards distributed correctly")
    
    def test_deck_has_correct_action_cards(self):
        """Each color should have 2 of each action card (skip, reverse, draw_two)"""
        deck = create_uno_deck()
        
        for color in UNO_COLORS:
            for action in UNO_SPECIALS:
                cards = [c for c in deck if c['color'] == color and c['value'] == action]
                assert len(cards) == 2, f"Expected 2 {action}s for {color}, got {len(cards)}"
        
        print("✓ Action cards distributed correctly")
    
    def test_deck_has_correct_wild_cards(self):
        """Should have 4 wild and 4 wild_draw_four cards"""
        deck = create_uno_deck()
        
        wilds = [c for c in deck if c['value'] == 'wild']
        wild_draw_fours = [c for c in deck if c['value'] == 'wild_draw_four']
        
        assert len(wilds) == 4, f"Expected 4 wild cards, got {len(wilds)}"
        assert len(wild_draw_fours) == 4, f"Expected 4 wild_draw_four cards, got {len(wild_draw_fours)}"
        print("✓ Wild cards distributed correctly")
    
    def test_all_cards_have_unique_ids(self):
        """Each card should have a unique ID"""
        deck = create_uno_deck()
        ids = [c['id'] for c in deck]
        assert len(ids) == len(set(ids)), "Card IDs are not unique"
        print("✓ All cards have unique IDs")
    
    def test_shuffle_randomizes_deck(self):
        """Shuffling should change card order"""
        deck1 = create_uno_deck()
        deck2 = shuffle_deck(deck1)
        
        # Check that it's a different order (very unlikely to be same)
        same_position = sum(1 for i in range(len(deck1)) if deck1[i]['id'] == deck2[i]['id'])
        assert same_position < len(deck1), "Shuffle did not change order"
        print(f"✓ Shuffle changed order ({same_position}/{len(deck1)} cards in same position)")


class TestCardValidation:
    """Tests for card play validation logic"""
    
    def test_wild_card_always_playable(self):
        """Wild cards can be played on any card"""
        wild = {'id': 'w1', 'color': 'wild', 'value': 'wild', 'type': 'wild'}
        top_card = {'id': 't1', 'color': 'red', 'value': '5', 'type': 'number'}
        
        assert is_valid_play(wild, top_card, 'red') == True
        assert is_valid_play(wild, top_card, 'blue') == True
        print("✓ Wild cards are always playable")
    
    def test_wild_draw_four_always_playable(self):
        """Wild Draw Four can be played on any card"""
        wild_d4 = {'id': 'wd4', 'color': 'wild', 'value': 'wild_draw_four', 'type': 'wild'}
        top_card = {'id': 't1', 'color': 'green', 'value': '9', 'type': 'number'}
        
        assert is_valid_play(wild_d4, top_card, 'green') == True
        print("✓ Wild Draw Four is always playable")
    
    def test_same_color_playable(self):
        """Cards of the same color as current_color are playable"""
        card = {'id': 'c1', 'color': 'red', 'value': '3', 'type': 'number'}
        top_card = {'id': 't1', 'color': 'red', 'value': '7', 'type': 'number'}
        
        assert is_valid_play(card, top_card, 'red') == True
        print("✓ Same color cards are playable")
    
    def test_same_value_playable(self):
        """Cards with same value are playable regardless of color"""
        card = {'id': 'c1', 'color': 'blue', 'value': '5', 'type': 'number'}
        top_card = {'id': 't1', 'color': 'red', 'value': '5', 'type': 'number'}
        
        assert is_valid_play(card, top_card, 'red') == True
        print("✓ Same value cards are playable")
    
    def test_different_color_and_value_not_playable(self):
        """Cards with different color AND value are not playable"""
        card = {'id': 'c1', 'color': 'blue', 'value': '3', 'type': 'number'}
        top_card = {'id': 't1', 'color': 'red', 'value': '7', 'type': 'number'}
        
        assert is_valid_play(card, top_card, 'red') == False
        print("✓ Different color and value cards are not playable")
    
    def test_action_cards_match_by_value(self):
        """Action cards can match by value (e.g., skip on skip)"""
        card = {'id': 'c1', 'color': 'blue', 'value': 'skip', 'type': 'action'}
        top_card = {'id': 't1', 'color': 'red', 'value': 'skip', 'type': 'action'}
        
        assert is_valid_play(card, top_card, 'red') == True
        print("✓ Action cards can match by value")
    
    def test_get_playable_cards_returns_correct_ids(self):
        """get_playable_cards should return IDs of all playable cards"""
        hand = [
            {'id': 'c1', 'color': 'red', 'value': '5', 'type': 'number'},
            {'id': 'c2', 'color': 'blue', 'value': '3', 'type': 'number'},
            {'id': 'c3', 'color': 'wild', 'value': 'wild', 'type': 'wild'},
            {'id': 'c4', 'color': 'green', 'value': '5', 'type': 'number'},
        ]
        top_card = {'id': 't1', 'color': 'red', 'value': '5', 'type': 'number'}
        
        playable = get_playable_cards(hand, top_card, 'red')
        
        # c1 (red), c3 (wild), c4 (same value 5) should be playable
        assert 'c1' in playable, "Red card should be playable"
        assert 'c3' in playable, "Wild card should be playable"
        assert 'c4' in playable, "Same value card should be playable"
        assert 'c2' not in playable, "Blue 3 should not be playable"
        print(f"✓ get_playable_cards returns correct IDs: {playable}")


class TestUnoGameService:
    """Tests for UnoGameService class"""
    
    @pytest.fixture
    def service(self):
        """Create fresh UnoGameService for each test"""
        return UnoGameService()
    
    @pytest.fixture
    def game_session(self, service):
        """Create a game session for testing"""
        session_id = "test_session_123"
        player1_id = "player1"
        player2_id = "player2"
        
        service.create_game(
            session_id=session_id,
            player1_id=player1_id,
            player2_id=player2_id,
            player1_username="Alice",
            player2_username="Bob"
        )
        
        return {
            'session_id': session_id,
            'player1_id': player1_id,
            'player2_id': player2_id
        }
    
    def test_create_game_initializes_correctly(self, service):
        """create_game should set up game state properly"""
        result = service.create_game(
            session_id="test_session",
            player1_id="p1",
            player2_id="p2",
            player1_username="Player1",
            player2_username="Player2"
        )
        
        assert result is not None
        assert result['session_id'] == "test_session"
        assert result['player1_id'] == "p1"
        assert result['player2_id'] == "p2"
        assert result['status'] == 'active'
        assert result['player1_hand_count'] == 7, "Each player should start with 7 cards"
        assert result['player2_hand_count'] == 7
        assert result['top_card'] is not None, "Should have a starting card"
        assert result['top_card']['type'] == 'number', "Starting card should be a number"
        print("✓ Game created with correct initial state")
    
    def test_get_player_state_shows_own_hand(self, service, game_session):
        """get_player_state should show player's own hand"""
        state = service.get_player_state(game_session['session_id'], game_session['player1_id'])
        
        assert state is not None
        assert 'my_hand' in state
        assert len(state['my_hand']) == 7
        assert 'opponent_hand_count' in state
        assert state['opponent_hand_count'] == 7
        assert 'playable_card_ids' in state
        print("✓ Player state shows own hand correctly")
    
    def test_play_card_validates_turn(self, service, game_session):
        """play_card should reject plays when not player's turn"""
        state = service.get_player_state(game_session['session_id'], game_session['player1_id'])
        
        # Try to play as the wrong player
        wrong_player = game_session['player2_id'] if state['is_my_turn'] else game_session['player1_id']
        
        result = service.play_card(
            game_session['session_id'],
            wrong_player,
            "any_card_id"
        )
        
        assert 'error' in result
        assert result['error'] == 'Not your turn'
        print("✓ Turn validation works correctly")
    
    def test_play_card_validates_card_in_hand(self, service, game_session):
        """play_card should reject cards not in player's hand"""
        state = service.get_player_state(game_session['session_id'], game_session['player1_id'])
        current_player = game_session['player1_id'] if state['is_my_turn'] else game_session['player2_id']
        
        result = service.play_card(
            game_session['session_id'],
            current_player,
            "nonexistent_card_id"
        )
        
        assert 'error' in result
        assert result['error'] == 'Card not in hand'
        print("✓ Card in hand validation works")
    
    def test_play_valid_card_succeeds(self, service, game_session):
        """Playing a valid card should succeed"""
        # Get current player's state
        p1_state = service.get_player_state(game_session['session_id'], game_session['player1_id'])
        current_player = game_session['player1_id'] if p1_state['is_my_turn'] else game_session['player2_id']
        
        state = service.get_player_state(game_session['session_id'], current_player)
        
        # Find a playable card
        if state['playable_card_ids']:
            card_id = state['playable_card_ids'][0]
            card = next(c for c in state['my_hand'] if c['id'] == card_id)
            
            # If it's a wild card, need to choose color
            chosen_color = 'red' if card['type'] == 'wild' else None
            
            result = service.play_card(
                game_session['session_id'],
                current_player,
                card_id,
                chosen_color
            )
            
            assert 'success' in result
            assert result['success'] == True
            print(f"✓ Valid card play succeeded: {card['color']} {card['value']}")
        else:
            # No playable cards - this is valid, player would need to draw
            print("✓ No playable cards (valid state)")
    
    def test_wild_card_requires_color_choice(self, service, game_session):
        """Wild cards should require a color choice"""
        # Get current player
        p1_state = service.get_player_state(game_session['session_id'], game_session['player1_id'])
        current_player = game_session['player1_id'] if p1_state['is_my_turn'] else game_session['player2_id']
        
        state = service.get_player_state(game_session['session_id'], current_player)
        
        # Find a wild card in hand
        wild_card = next((c for c in state['my_hand'] if c['type'] == 'wild'), None)
        
        if wild_card:
            # Try to play without color choice
            result = service.play_card(
                game_session['session_id'],
                current_player,
                wild_card['id'],
                None  # No color chosen
            )
            
            assert 'error' in result
            assert 'color' in result['error'].lower()
            print("✓ Wild card requires color choice")
        else:
            print("✓ No wild card in hand to test (valid)")
    
    def test_draw_card_adds_to_hand(self, service, game_session):
        """draw_card should add a card to player's hand"""
        # Get current player
        p1_state = service.get_player_state(game_session['session_id'], game_session['player1_id'])
        current_player = game_session['player1_id'] if p1_state['is_my_turn'] else game_session['player2_id']
        
        initial_state = service.get_player_state(game_session['session_id'], current_player)
        initial_hand_count = len(initial_state['my_hand'])
        
        result = service.draw_card(game_session['session_id'], current_player)
        
        assert 'success' in result
        assert result['success'] == True
        assert 'drawn_card' in result
        
        new_state = service.get_player_state(game_session['session_id'], current_player)
        assert len(new_state['my_hand']) == initial_hand_count + 1
        print(f"✓ Draw card works: hand size {initial_hand_count} -> {len(new_state['my_hand'])}")
    
    def test_draw_card_validates_turn(self, service, game_session):
        """draw_card should reject when not player's turn"""
        p1_state = service.get_player_state(game_session['session_id'], game_session['player1_id'])
        wrong_player = game_session['player2_id'] if p1_state['is_my_turn'] else game_session['player1_id']
        
        result = service.draw_card(game_session['session_id'], wrong_player)
        
        assert 'error' in result
        assert result['error'] == 'Not your turn'
        print("✓ Draw card turn validation works")
    
    def test_call_uno_with_two_cards(self, service, game_session):
        """call_uno should work when player has 2 cards"""
        # Manually set up a player with 2 cards
        game = service.active_games[game_session['session_id']]
        game['player1_hand'] = game['player1_hand'][:2]
        
        result = service.call_uno(game_session['session_id'], game_session['player1_id'])
        
        assert 'success' in result
        assert result['success'] == True
        print("✓ UNO call works with 2 cards")
    
    def test_call_uno_fails_with_wrong_card_count(self, service, game_session):
        """call_uno should fail when player doesn't have exactly 2 cards"""
        result = service.call_uno(game_session['session_id'], game_session['player1_id'])
        
        assert 'error' in result
        assert '2 cards' in result['error']
        print("✓ UNO call fails with wrong card count")
    
    def test_end_game_cleans_up(self, service, game_session):
        """end_game should remove game from active games"""
        result = service.end_game(game_session['session_id'])
        
        assert result is not None
        assert result['status'] == 'finished'
        assert game_session['session_id'] not in service.active_games
        print("✓ End game cleans up correctly")


class TestSpecialCardEffects:
    """Tests for special card effects (skip, reverse, draw_two, wild_draw_four)"""
    
    @pytest.fixture
    def service(self):
        return UnoGameService()
    
    @pytest.fixture
    def game_with_skip(self, service):
        """Create game and give current player a skip card"""
        session_id = "skip_test"
        service.create_game(session_id, "p1", "p2", "Alice", "Bob")
        
        game = service.active_games[session_id]
        # Ensure p1 goes first and has a skip card
        game['current_turn'] = "p1"
        game['current_color'] = 'red'
        game['player1_hand'] = [
            {'id': 'skip1', 'color': 'red', 'value': 'skip', 'type': 'action'}
        ]
        game['discard_pile'] = [
            {'id': 'top', 'color': 'red', 'value': '5', 'type': 'number'}
        ]
        
        return session_id
    
    def test_skip_card_keeps_turn(self, service, game_with_skip):
        """Skip card should keep turn with current player (in 2-player)"""
        result = service.play_card(game_with_skip, "p1", "skip1")
        
        assert result['success'] == True
        assert result.get('effect') == 'skip'
        # In 2-player, skip means current player keeps turn
        assert result['current_turn'] == "p1"
        print("✓ Skip card effect works correctly")
    
    @pytest.fixture
    def game_with_draw_two(self, service):
        """Create game and give current player a draw_two card"""
        session_id = "draw2_test"
        service.create_game(session_id, "p1", "p2", "Alice", "Bob")
        
        game = service.active_games[session_id]
        game['current_turn'] = "p1"
        game['current_color'] = 'blue'
        game['player1_hand'] = [
            {'id': 'd2', 'color': 'blue', 'value': 'draw_two', 'type': 'action'}
        ]
        game['player2_hand'] = [
            {'id': 'c1', 'color': 'red', 'value': '1', 'type': 'number'}
        ]
        game['discard_pile'] = [
            {'id': 'top', 'color': 'blue', 'value': '3', 'type': 'number'}
        ]
        
        return session_id
    
    def test_draw_two_makes_opponent_draw(self, service, game_with_draw_two):
        """Draw Two should make opponent draw 2 cards"""
        game = service.active_games[game_with_draw_two]
        initial_p2_count = len(game['player2_hand'])
        
        result = service.play_card(game_with_draw_two, "p1", "d2")
        
        assert result['success'] == True
        assert result.get('effect') == 'draw_two'
        assert result.get('cards_drawn') == 2
        
        # Check opponent drew 2 cards
        assert len(game['player2_hand']) == initial_p2_count + 2
        print(f"✓ Draw Two effect works: opponent hand {initial_p2_count} -> {len(game['player2_hand'])}")
    
    @pytest.fixture
    def game_with_wild_draw_four(self, service):
        """Create game and give current player a wild_draw_four card"""
        session_id = "wd4_test"
        service.create_game(session_id, "p1", "p2", "Alice", "Bob")
        
        game = service.active_games[session_id]
        game['current_turn'] = "p1"
        game['current_color'] = 'green'
        game['player1_hand'] = [
            {'id': 'wd4', 'color': 'wild', 'value': 'wild_draw_four', 'type': 'wild'}
        ]
        game['player2_hand'] = [
            {'id': 'c1', 'color': 'red', 'value': '1', 'type': 'number'}
        ]
        game['discard_pile'] = [
            {'id': 'top', 'color': 'green', 'value': '7', 'type': 'number'}
        ]
        
        return session_id
    
    def test_wild_draw_four_makes_opponent_draw_four(self, service, game_with_wild_draw_four):
        """Wild Draw Four should make opponent draw 4 cards"""
        game = service.active_games[game_with_wild_draw_four]
        initial_p2_count = len(game['player2_hand'])
        
        result = service.play_card(game_with_wild_draw_four, "p1", "wd4", "red")
        
        assert result['success'] == True
        assert result.get('effect') == 'wild_draw_four'
        assert result.get('cards_drawn') == 4
        
        # Check opponent drew 4 cards
        assert len(game['player2_hand']) == initial_p2_count + 4
        print(f"✓ Wild Draw Four effect works: opponent hand {initial_p2_count} -> {len(game['player2_hand'])}")
    
    def test_wild_draw_four_changes_color(self, service, game_with_wild_draw_four):
        """Wild Draw Four should change the current color"""
        result = service.play_card(game_with_wild_draw_four, "p1", "wd4", "yellow")
        
        assert result['success'] == True
        assert result['new_color'] == 'yellow'
        
        game = service.active_games[game_with_wild_draw_four]
        assert game['current_color'] == 'yellow'
        print("✓ Wild Draw Four changes color correctly")


class TestUnoPenalty:
    """Tests for UNO penalty logic"""
    
    @pytest.fixture
    def service(self):
        return UnoGameService()
    
    def test_penalty_for_not_calling_uno(self, service):
        """Player should get penalty if they play with 2 cards without calling UNO"""
        session_id = "penalty_test"
        service.create_game(session_id, "p1", "p2", "Alice", "Bob")
        
        game = service.active_games[session_id]
        game['current_turn'] = "p1"
        game['current_color'] = 'red'
        # Give player exactly 2 cards
        game['player1_hand'] = [
            {'id': 'c1', 'color': 'red', 'value': '5', 'type': 'number'},
            {'id': 'c2', 'color': 'blue', 'value': '3', 'type': 'number'}
        ]
        game['discard_pile'] = [
            {'id': 'top', 'color': 'red', 'value': '7', 'type': 'number'}
        ]
        
        # Play without calling UNO first
        result = service.play_card(session_id, "p1", "c1")
        
        assert result['success'] == True
        assert result.get('uno_penalty') == True
        assert result.get('penalty_cards') == 2
        
        # Player should now have more cards (1 remaining + 2 penalty)
        assert len(game['player1_hand']) == 3
        print("✓ UNO penalty applied correctly")
    
    def test_no_penalty_when_uno_called(self, service):
        """No penalty if player called UNO before playing"""
        session_id = "no_penalty_test"
        service.create_game(session_id, "p1", "p2", "Alice", "Bob")
        
        game = service.active_games[session_id]
        game['current_turn'] = "p1"
        game['current_color'] = 'red'
        game['player1_hand'] = [
            {'id': 'c1', 'color': 'red', 'value': '5', 'type': 'number'},
            {'id': 'c2', 'color': 'blue', 'value': '3', 'type': 'number'}
        ]
        game['discard_pile'] = [
            {'id': 'top', 'color': 'red', 'value': '7', 'type': 'number'}
        ]
        
        # Call UNO first
        service.call_uno(session_id, "p1")
        
        # Then play
        result = service.play_card(session_id, "p1", "c1")
        
        assert result['success'] == True
        assert result.get('uno_penalty') != True
        
        # Player should have just 1 card remaining
        assert len(game['player1_hand']) == 1
        print("✓ No penalty when UNO was called")


class TestWinCondition:
    """Tests for game win condition"""
    
    @pytest.fixture
    def service(self):
        return UnoGameService()
    
    def test_player_wins_when_hand_empty(self, service):
        """Player wins when they play their last card"""
        session_id = "win_test"
        service.create_game(session_id, "p1", "p2", "Alice", "Bob")
        
        game = service.active_games[session_id]
        game['current_turn'] = "p1"
        game['current_color'] = 'red'
        # Give player exactly 1 card
        game['player1_hand'] = [
            {'id': 'c1', 'color': 'red', 'value': '5', 'type': 'number'}
        ]
        game['discard_pile'] = [
            {'id': 'top', 'color': 'red', 'value': '7', 'type': 'number'}
        ]
        
        # Mark UNO as called to avoid penalty
        service.uno_called[session_id] = {"p1"}
        
        result = service.play_card(session_id, "p1", "c1")
        
        assert result['success'] == True
        assert game['status'] == 'finished'
        assert game['winner_id'] == "p1"
        assert game['winner_username'] == "Alice"
        print("✓ Win condition detected correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
