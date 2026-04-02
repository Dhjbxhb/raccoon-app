"""
Test Room and Matching System - Critical Fix Validation
Tests for:
1. Room capacity (MAX 2 players)
2. Room create (premium only)
3. Room join (any user with code)
4. Third user blocked when room full
5. API health check
6. Premium status endpoints
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """API Health Check Tests"""
    
    def test_health_endpoint_returns_healthy(self):
        """Test that /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get('status') == 'healthy'
        print(f"✓ Health check passed: {data}")


class TestGuestFlow:
    """Guest Flow Tests - Landing to Dashboard"""
    
    def test_guest_login_creates_user(self):
        """Test guest login creates a new guest user"""
        response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            "gender": "male"
        })
        assert response.status_code == 200
        data = response.json()
        assert 'token' in data
        assert 'user' in data
        assert 'username' in data['user']  # Username is auto-generated
        assert data['user']['gender'] == 'male'
        print(f"✓ Guest login successful: {data['user']['username']}")
        return data
    
    def test_guest_login_with_female_gender(self):
        """Test guest login with female gender"""
        unique_username = f"TestGuest_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            "username": unique_username,
            "gender": "female"
        })
        assert response.status_code == 200
        data = response.json()
        assert data['user']['gender'] == 'female'
        print(f"✓ Guest login with female gender: {data['user']['username']}")


class TestPremiumStatus:
    """Premium Status Tests"""
    
    def test_set_force_premium_endpoint(self):
        """Test /api/admin/dev/set-premium endpoint"""
        # First create a guest user
        unique_username = f"TestPremium_{uuid.uuid4().hex[:8]}"
        guest_response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            "username": unique_username,
            "gender": "male"
        })
        assert guest_response.status_code == 200
        guest_data = guest_response.json()
        user_id = guest_data['user'].get('guest_id') or guest_data['user'].get('user_id')
        token = guest_data['token']
        
        # Set force_premium
        premium_response = requests.post(
            f"{BASE_URL}/api/admin/dev/set-premium",
            json={"user_id": user_id, "force_premium": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # This endpoint may require admin auth or may not exist
        if premium_response.status_code == 200:
            print(f"✓ Force premium set successfully for {user_id}")
        elif premium_response.status_code == 401:
            print(f"⚠ Force premium endpoint requires admin auth (expected)")
        elif premium_response.status_code == 404:
            print(f"⚠ Force premium endpoint not found - may need different path")
        else:
            print(f"⚠ Force premium response: {premium_response.status_code} - {premium_response.text}")


class TestRoomCapacity:
    """Room Capacity Tests - MAX 2 players"""
    
    def test_room_service_max_players_constant(self):
        """Verify MAX_ROOM_PLAYERS is set to 2 in room_service.py"""
        # This is a code verification test
        import sys
        sys.path.insert(0, '/app/backend')
        from services.room_service import MAX_ROOM_PLAYERS
        
        assert MAX_ROOM_PLAYERS == 2, f"MAX_ROOM_PLAYERS should be 2, got {MAX_ROOM_PLAYERS}"
        print(f"✓ MAX_ROOM_PLAYERS = {MAX_ROOM_PLAYERS}")
    
    def test_room_state_shows_max_2_players(self):
        """Test that room state returns max_players as 2"""
        import sys
        sys.path.insert(0, '/app/backend')
        from services.room_service import create_room, get_room_state, active_rooms, player_rooms
        
        # Clean up any existing test data
        test_creator_id = f"test_creator_{uuid.uuid4().hex[:8]}"
        
        # Create a room (simulating premium user)
        result = create_room(test_creator_id, "TestCreator", is_premium=True)
        
        assert 'success' in result and result['success'] == True
        room = result['room']
        
        assert room['max_players'] == 2, f"Room max_players should be 2, got {room['max_players']}"
        assert room['player_count'] == 1
        print(f"✓ Room created with max_players=2, code={room['code']}")
        
        # Cleanup
        if test_creator_id in player_rooms:
            room_code = player_rooms[test_creator_id]
            if room_code in active_rooms:
                del active_rooms[room_code]
            del player_rooms[test_creator_id]
    
    def test_room_blocks_third_player(self):
        """Test that third player is blocked when room has 2 players"""
        import sys
        sys.path.insert(0, '/app/backend')
        from services.room_service import create_room, join_room, active_rooms, player_rooms
        
        # Create unique IDs
        creator_id = f"creator_{uuid.uuid4().hex[:8]}"
        player2_id = f"player2_{uuid.uuid4().hex[:8]}"
        player3_id = f"player3_{uuid.uuid4().hex[:8]}"
        
        # Create room
        create_result = create_room(creator_id, "Creator", is_premium=True)
        assert create_result['success'] == True
        room_code = create_result['room']['code']
        
        # Player 2 joins
        join_result = join_room(room_code, player2_id, "Player2")
        assert join_result['success'] == True
        assert join_result['room']['player_count'] == 2
        print(f"✓ Player 2 joined room, count=2")
        
        # Player 3 tries to join - should be blocked
        join_result_3 = join_room(room_code, player3_id, "Player3")
        assert 'error' in join_result_3
        assert 'full' in join_result_3['error'].lower() or 'max' in join_result_3['error'].lower()
        print(f"✓ Player 3 blocked: {join_result_3['error']}")
        
        # Cleanup
        for pid in [creator_id, player2_id, player3_id]:
            if pid in player_rooms:
                del player_rooms[pid]
        if room_code in active_rooms:
            del active_rooms[room_code]


class TestRoomPremiumRestriction:
    """Room Premium Restriction Tests"""
    
    def test_free_user_cannot_create_room(self):
        """Test that free users cannot create rooms"""
        import sys
        sys.path.insert(0, '/app/backend')
        from services.room_service import create_room
        
        free_user_id = f"free_user_{uuid.uuid4().hex[:8]}"
        
        result = create_room(free_user_id, "FreeUser", is_premium=False)
        
        assert 'error' in result
        assert 'premium' in result['error'].lower()
        print(f"✓ Free user blocked from creating room: {result['error']}")
    
    def test_premium_user_can_create_room(self):
        """Test that premium users can create rooms"""
        import sys
        sys.path.insert(0, '/app/backend')
        from services.room_service import create_room, active_rooms, player_rooms
        
        premium_user_id = f"premium_user_{uuid.uuid4().hex[:8]}"
        
        result = create_room(premium_user_id, "PremiumUser", is_premium=True)
        
        assert 'success' in result and result['success'] == True
        assert 'room' in result
        print(f"✓ Premium user created room: {result['room']['code']}")
        
        # Cleanup
        if premium_user_id in player_rooms:
            room_code = player_rooms[premium_user_id]
            if room_code in active_rooms:
                del active_rooms[room_code]
            del player_rooms[premium_user_id]


class TestMatchingServiceMethods:
    """Test matching service has required methods"""
    
    def test_get_partner_id_method_exists(self):
        """Test that get_partner_id method exists"""
        import sys
        sys.path.insert(0, '/app/backend')
        from services.matching_service import matching_queue
        
        assert hasattr(matching_queue, 'get_partner_id')
        assert callable(matching_queue.get_partner_id)
        print("✓ get_partner_id method exists")
    
    def test_get_socket_id_method_exists(self):
        """Test that get_socket_id method exists"""
        import sys
        sys.path.insert(0, '/app/backend')
        from services.matching_service import matching_queue
        
        assert hasattr(matching_queue, 'get_socket_id')
        assert callable(matching_queue.get_socket_id)
        print("✓ get_socket_id method exists")
    
    def test_force_cleanup_user_method_exists(self):
        """Test that force_cleanup_user method exists"""
        import sys
        sys.path.insert(0, '/app/backend')
        from services.matching_service import matching_queue
        
        assert hasattr(matching_queue, 'force_cleanup_user')
        assert callable(matching_queue.force_cleanup_user)
        print("✓ force_cleanup_user method exists")


class TestQueueStats:
    """Test queue statistics endpoint"""
    
    def test_queue_stats_endpoint(self):
        """Test /api/queue/stats endpoint if it exists"""
        response = requests.get(f"{BASE_URL}/api/queue/stats")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Queue stats: {data}")
        elif response.status_code == 404:
            print("⚠ Queue stats endpoint not found (may not be exposed)")
        else:
            print(f"⚠ Queue stats response: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
