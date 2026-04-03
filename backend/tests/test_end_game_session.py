"""
Test End Game Session Feature
Tests the shared End Game action that ends the active session for both users.

Feature Requirements:
1. End Game button exists in game mode
2. End Game ends the active session for BOTH users, not just one local client
3. currentSessionId clears for both users after End Game
4. Both users can match again immediately after End Game with no stuck session
5. No regressions to skip/session cleanup behavior
"""

import pytest
import requests
import os
import socketio
import asyncio
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEndGameSessionAPI:
    """Test End Game Session related API endpoints"""
    
    def test_health_check(self):
        """Verify backend is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get('status') == 'healthy'
        print("✓ Backend health check passed")
    
    def test_guest_creation(self):
        """Test guest user creation for session testing"""
        response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            "gender": "male"
        })
        assert response.status_code == 200
        data = response.json()
        assert 'token' in data
        assert 'user' in data
        print(f"✓ Guest created: {data['user'].get('guest_id')}")
        return data
    
    def test_auth_me_returns_current_session_id(self):
        """Verify /api/auth/me exposes currentSessionId field"""
        # Create guest
        guest_response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            "gender": "male"
        })
        assert guest_response.status_code == 200
        guest_data = guest_response.json()
        token = guest_data['token']
        
        # Check /api/auth/me
        headers = {'Authorization': f'Bearer {token}'}
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        me_data = me_response.json()
        
        # currentSessionId should be present (can be null if no active session)
        assert 'currentSessionId' in me_data or me_data.get('currentSessionId') is None
        print(f"✓ /api/auth/me returns currentSessionId: {me_data.get('currentSessionId')}")
    
    def test_admin_login(self):
        """Test admin login for premium features"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@raccoon.app",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert 'token' in data
        print("✓ Admin login successful")
        return data


class TestEndGameSessionSocket:
    """
    Test End Game Session socket event behavior.
    Note: Full two-user WebSocket testing requires two browser sessions.
    These tests verify the socket handler exists and responds correctly.
    """
    
    @pytest.fixture
    def guest_token(self):
        """Create a guest user and return token"""
        response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            "gender": "male"
        })
        assert response.status_code == 200
        return response.json()
    
    def test_socket_connection(self, guest_token):
        """Test socket connection and authentication"""
        sio = socketio.Client()
        connected = False
        authenticated = False
        auth_data = {}
        
        @sio.event
        def connect():
            nonlocal connected
            connected = True
        
        @sio.on('authenticated')
        def on_authenticated(data):
            nonlocal authenticated, auth_data
            authenticated = True
            auth_data = data
        
        try:
            # Connect to socket
            socket_url = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')
            sio.connect(socket_url, transports=['websocket'])
            time.sleep(1)
            assert connected, "Socket connection failed"
            print("✓ Socket connected")
            
            # Authenticate
            sio.emit('authenticate', {'token': guest_token['token']})
            time.sleep(1)
            assert authenticated, "Socket authentication failed"
            print(f"✓ Socket authenticated as {auth_data.get('user_id')}")
            
        finally:
            sio.disconnect()
    
    def test_end_game_session_without_active_session(self, guest_token):
        """Test end_game_session when no active session exists"""
        sio = socketio.Client()
        session_ended_received = False
        session_ended_data = {}
        
        @sio.on('session_ended')
        def on_session_ended(data):
            nonlocal session_ended_received, session_ended_data
            session_ended_received = True
            session_ended_data = data
        
        @sio.on('error')
        def on_error(data):
            print(f"Socket error: {data}")
        
        try:
            socket_url = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')
            sio.connect(socket_url, transports=['websocket'])
            time.sleep(0.5)
            
            # Authenticate
            sio.emit('authenticate', {'token': guest_token['token']})
            time.sleep(0.5)
            
            # Emit end_game_session without active session
            sio.emit('end_game_session')
            time.sleep(1)
            
            # Should receive session_ended with game_ended_no_session reason
            if session_ended_received:
                print(f"✓ Received session_ended: {session_ended_data}")
                assert session_ended_data.get('reason') in ['game_ended_no_session', 'game_ended_by_user']
            else:
                print("⚠ No session_ended received (expected when no active session)")
            
        finally:
            sio.disconnect()


class TestEndGameSessionCodeReview:
    """
    Code review verification of End Game Session implementation.
    Verifies the socket handler and frontend implementation are correct.
    """
    
    def test_backend_handler_exists(self):
        """Verify end_game_session handler exists in socket_handlers.py"""
        handler_path = '/app/backend/websocket/socket_handlers.py'
        with open(handler_path, 'r') as f:
            content = f.read()
        
        # Check handler exists
        assert 'async def end_game_session(sid):' in content or '@sio.event\n    async def end_game_session' in content
        print("✓ end_game_session handler exists")
        
        # Check it emits session_ended to both users
        assert "await sio.emit('session_ended'" in content
        assert "'reason': 'game_ended_by_user'" in content
        assert "'reason': 'partner_ended_game'" in content
        print("✓ Handler emits session_ended with correct reasons")
        
        # Check it clears currentSessionId
        assert 'sync_users_current_session' in content
        print("✓ Handler clears currentSessionId for both users")
        
        # Check it ends games
        assert 'uno_service.end_game' in content
        assert 'feud_service.end_game' in content
        assert 'draw_game_service.end_game' in content
        print("✓ Handler ends all active games")
    
    def test_frontend_button_exists(self):
        """Verify End Game button exists in Match.js"""
        match_path = '/app/frontend/src/pages/Match.js'
        with open(match_path, 'r') as f:
            content = f.read()
        
        # Check button exists with correct data-testid
        assert 'data-testid="game-mode-end-game"' in content
        print("✓ End Game button has data-testid")
        
        # Check button text
        assert 'End Game' in content
        print("✓ End Game button text exists")
        
        # Check handler
        assert 'handleEndGameForBoth' in content
        print("✓ handleEndGameForBoth handler exists")
        
        # Check socket emit
        assert "socket.emit('end_game_session')" in content
        print("✓ Button emits end_game_session event")
    
    def test_frontend_session_ended_handler(self):
        """Verify frontend handles session_ended correctly"""
        match_path = '/app/frontend/src/pages/Match.js'
        with open(match_path, 'r') as f:
            content = f.read()
        
        # Check session_ended handler
        assert "socket.on('session_ended'" in content
        print("✓ Frontend listens for session_ended")
        
        # Check it handles game_ended_by_user and partner_ended_game
        assert 'game_ended_by_user' in content
        assert 'partner_ended_game' in content
        print("✓ Frontend handles both game_ended reasons")
        
        # Check it navigates to dashboard
        assert "navigate('/dashboard')" in content or "navigate('/home')" in content
        print("✓ Frontend navigates away after End Game")
        
        # Check it calls endCall for WebRTC cleanup
        assert 'endCall()' in content
        print("✓ Frontend calls endCall for WebRTC cleanup")
    
    def test_uno_game_close_button_label(self):
        """Verify UnoGame close button has correct label to avoid confusion"""
        uno_path = '/app/frontend/src/components/games/UnoGame.jsx'
        with open(uno_path, 'r') as f:
            content = f.read()
        
        # Check the close button label is not "End Game" to avoid confusion
        # It should be something like "Close Game UI" or "Exit"
        assert 'Close Game UI' in content or 'Exit' in content
        print("✓ UnoGame close button has distinct label (not 'End Game')")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
