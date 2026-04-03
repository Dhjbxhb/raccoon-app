"""
UNO Bug Fix Tests - player1_id/player2_id in get_player_state
Tests for the specific bug fix where:
1. Backend uno_service.get_player_state() now includes player1_id and player2_id fields
2. Frontend Match.js handleUnoStarted validates my_hand/top_card instead of player1_id/player2_id
"""
import pytest
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.uno_service import UnoGameService


class TestGetPlayerStateIncludesPlayerIds:
    """Tests that get_player_state returns player1_id and player2_id fields"""
    
    @pytest.fixture
    def service(self):
        """Create fresh UnoGameService for each test"""
        return UnoGameService()
    
    @pytest.fixture
    def game_session(self, service):
        """Create a game session for testing"""
        session_id = "test_session_bugfix"
        player1_id = "player1_abc123"
        player2_id = "player2_xyz789"
        
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
    
    def test_get_player_state_includes_player1_id(self, service, game_session):
        """get_player_state should include player1_id field"""
        state = service.get_player_state(game_session['session_id'], game_session['player1_id'])
        
        assert state is not None, "State should not be None"
        assert 'player1_id' in state, "State should include player1_id field"
        assert state['player1_id'] == game_session['player1_id'], f"player1_id should be {game_session['player1_id']}"
        print(f"✓ get_player_state includes player1_id: {state['player1_id']}")
    
    def test_get_player_state_includes_player2_id(self, service, game_session):
        """get_player_state should include player2_id field"""
        state = service.get_player_state(game_session['session_id'], game_session['player1_id'])
        
        assert state is not None, "State should not be None"
        assert 'player2_id' in state, "State should include player2_id field"
        assert state['player2_id'] == game_session['player2_id'], f"player2_id should be {game_session['player2_id']}"
        print(f"✓ get_player_state includes player2_id: {state['player2_id']}")
    
    def test_get_player_state_includes_my_hand(self, service, game_session):
        """get_player_state should include my_hand field (for frontend validation)"""
        state = service.get_player_state(game_session['session_id'], game_session['player1_id'])
        
        assert state is not None, "State should not be None"
        assert 'my_hand' in state, "State should include my_hand field"
        assert isinstance(state['my_hand'], list), "my_hand should be a list"
        assert len(state['my_hand']) == 7, "my_hand should have 7 cards initially"
        print(f"✓ get_player_state includes my_hand with {len(state['my_hand'])} cards")
    
    def test_get_player_state_includes_top_card(self, service, game_session):
        """get_player_state should include top_card field (for frontend validation)"""
        state = service.get_player_state(game_session['session_id'], game_session['player1_id'])
        
        assert state is not None, "State should not be None"
        assert 'top_card' in state, "State should include top_card field"
        assert state['top_card'] is not None, "top_card should not be None"
        assert 'color' in state['top_card'], "top_card should have color"
        assert 'value' in state['top_card'], "top_card should have value"
        print(f"✓ get_player_state includes top_card: {state['top_card']['color']} {state['top_card']['value']}")
    
    def test_get_player_state_for_player2_also_includes_ids(self, service, game_session):
        """get_player_state for player2 should also include both player IDs"""
        state = service.get_player_state(game_session['session_id'], game_session['player2_id'])
        
        assert state is not None, "State should not be None"
        assert 'player1_id' in state, "State should include player1_id field"
        assert 'player2_id' in state, "State should include player2_id field"
        assert state['player1_id'] == game_session['player1_id']
        assert state['player2_id'] == game_session['player2_id']
        print(f"✓ Player2's state also includes both player IDs")
    
    def test_get_player_state_has_all_required_fields_for_frontend(self, service, game_session):
        """get_player_state should have all fields required by frontend UnoGame component"""
        state = service.get_player_state(game_session['session_id'], game_session['player1_id'])
        
        required_fields = [
            'session_id',
            'game_id',
            'status',
            'player1_id',
            'player2_id',
            'my_hand',
            'my_hand_count',
            'opponent_hand_count',
            'opponent_id',
            'opponent_username',
            'top_card',
            'current_color',
            'current_turn',
            'is_my_turn',
            'playable_card_ids',
            'draw_pile_count',
            'direction',
            'pending_draw',
            'last_action',
            'winner_id',
            'winner_username',
            'can_call_uno',
            'must_call_uno'
        ]
        
        missing_fields = [f for f in required_fields if f not in state]
        assert len(missing_fields) == 0, f"Missing fields: {missing_fields}"
        print(f"✓ All {len(required_fields)} required fields present in get_player_state")
    
    def test_frontend_validation_fields_present(self, service, game_session):
        """
        Test that the fields used by frontend Match.js handleUnoStarted are present.
        Frontend validates: game_state.my_hand && game_state.top_card
        """
        state = service.get_player_state(game_session['session_id'], game_session['player1_id'])
        
        # Frontend validation: if (!data?.game_state || !data.game_state.my_hand || !data.game_state.top_card)
        assert state is not None, "game_state should not be None"
        assert state.get('my_hand') is not None, "my_hand should not be None"
        assert state.get('top_card') is not None, "top_card should not be None"
        
        # Verify my_hand is truthy (non-empty list)
        assert len(state['my_hand']) > 0, "my_hand should have cards"
        
        print("✓ Frontend validation fields (my_hand, top_card) are present and valid")


class TestCreateGameReturnsCorrectState:
    """Tests that create_game returns correct initial state"""
    
    @pytest.fixture
    def service(self):
        return UnoGameService()
    
    def test_create_game_returns_player_ids(self, service):
        """create_game should return player1_id and player2_id"""
        result = service.create_game(
            session_id="test_create",
            player1_id="p1_test",
            player2_id="p2_test",
            player1_username="Player1",
            player2_username="Player2"
        )
        
        assert result is not None
        assert result['player1_id'] == "p1_test"
        assert result['player2_id'] == "p2_test"
        print("✓ create_game returns correct player IDs")
    
    def test_create_game_initializes_7_cards_per_player(self, service):
        """Each player should start with 7 cards"""
        result = service.create_game(
            session_id="test_7cards",
            player1_id="p1",
            player2_id="p2",
            player1_username="Alice",
            player2_username="Bob"
        )
        
        assert result['player1_hand_count'] == 7
        assert result['player2_hand_count'] == 7
        print("✓ Both players start with 7 cards")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
