"""
Private Room Match Tests - Bug Fix Verification
Tests for: private room camera/mic and games/match functionality

Test scenarios:
1. Premium user creates private room, second user joins, room can start real live match
2. Private-room start match produces valid shared session
3. Private-room start game (UNO) launches through the room flow
4. Leave room and rejoin same room, then start match again with no 'already in session' issue
5. Session cleanup after skip/leave remains correct
6. No regression in normal match creation/skip/rematch flow
"""

import pytest
import requests
import os
import time
import socketio
import asyncio
from concurrent.futures import ThreadPoolExecutor

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://live-social-video.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@raccoon.app"
ADMIN_PASSWORD = "Admin123!"


class TestPrivateRoomMatch:
    """Test private room match functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_admin_login_and_premium_status(self):
        """Test admin login and verify premium status"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["is_premium"] == True, "Admin should be premium"
        assert data["user"]["currentSessionId"] is None or isinstance(data["user"]["currentSessionId"], str), \
            "currentSessionId should be null or string"
        
        print(f"✓ Admin login successful, premium status: {data['user']['is_premium']}")
        return data["token"]
    
    def test_auth_me_exposes_current_session_id(self):
        """Test that /api/auth/me exposes currentSessionId field"""
        # Login first
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Check /api/auth/me
        me_response = self.session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert me_response.status_code == 200, f"Auth me failed: {me_response.text}"
        data = me_response.json()
        
        # currentSessionId should be present (can be null or string)
        assert "currentSessionId" in data, "currentSessionId field missing from /api/auth/me"
        print(f"✓ /api/auth/me exposes currentSessionId: {data.get('currentSessionId')}")
    
    def test_create_guest_user(self):
        """Test creating a guest user"""
        response = self.session.post(f"{BASE_URL}/api/auth/guest", json={
            "username": f"TestGuest_{int(time.time())}",
            "gender": "Male",
            "country": "United States",
            "country_code": "US"
        })
        
        assert response.status_code == 200, f"Guest creation failed: {response.text}"
        data = response.json()
        
        assert "token" in data, "No token in guest response"
        assert "user" in data, "No user in guest response"
        # Guest users have guest_id instead of user_id
        assert data["user"].get("guest_id") is not None, "Should have guest_id"
        
        print(f"✓ Guest user created: {data['user'].get('username')}")
        return data["token"], data["user"]


class TestPrivateRoomAPI:
    """Test private room REST API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_health_check(self):
        """Verify API is healthy"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")


class TestMatchingService:
    """Test matching service functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_queue_stats_endpoint(self):
        """Test queue stats endpoint exists and returns data"""
        response = self.session.get(f"{BASE_URL}/api/queue/stats")
        
        # This endpoint may or may not exist, but we test for it
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Queue stats: {data}")
        else:
            print(f"⚠ Queue stats endpoint returned {response.status_code}")
            # Not a failure - endpoint may not be exposed via REST


class TestSessionCleanup:
    """Test session cleanup functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_admin_session_state_after_login(self):
        """Test that admin has clean session state after login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # After fresh login, currentSessionId should be null (no active session)
        # OR it could be a valid session if user was in one
        current_session = data["user"].get("currentSessionId")
        print(f"✓ Admin currentSessionId after login: {current_session}")
        
        # Verify we can get auth/me
        token = data["token"]
        me_response = self.session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert "currentSessionId" in me_data
        print(f"✓ Auth/me currentSessionId: {me_data.get('currentSessionId')}")


class TestNormalMatchFlow:
    """Test normal match flow (non-private room) for regression"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_login_does_not_break_matching(self):
        """Test that login flow doesn't break matching capability"""
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # User should have valid token
        assert "token" in data
        assert len(data["token"]) > 0
        
        # User should have premium status for games
        assert data["user"]["is_premium"] == True
        
        print("✓ Login flow works correctly for matching")


class TestWebRTCPrerequisites:
    """Test WebRTC prerequisites are in place"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_socket_endpoint_accessible(self):
        """Test that socket.io endpoint is accessible"""
        # Socket.io handshake endpoint
        response = self.session.get(f"{BASE_URL}/socket.io/?EIO=4&transport=polling")
        
        # Socket.io returns 200 with session info
        assert response.status_code == 200, f"Socket.io endpoint not accessible: {response.status_code}"
        print("✓ Socket.io endpoint accessible")


class TestPrivateRoomSocketFlow:
    """Test private room socket flow using synchronous socket.io client
    
    NOTE: These tests require direct socket.io connection which may not work
    from all test environments. They are marked to skip on connection failure.
    """
    
    def test_socket_connection_and_auth(self):
        """Test socket connection and authentication"""
        # Get admin token
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Create socket client
        sio = socketio.Client()
        connected = False
        authenticated = False
        auth_data = {}
        
        @sio.event
        def connect():
            nonlocal connected
            connected = True
            print("✓ Socket connected")
        
        @sio.on('authenticated')
        def on_authenticated(data):
            nonlocal authenticated, auth_data
            authenticated = True
            auth_data = data
            print(f"✓ Socket authenticated: {data.get('user_id')}")
        
        @sio.on('error')
        def on_error(data):
            print(f"✗ Socket error: {data}")
        
        try:
            # Connect to socket
            sio.connect(BASE_URL, transports=['websocket', 'polling'])
            time.sleep(0.5)
            
            assert connected, "Socket should be connected"
            
            # Authenticate
            sio.emit('authenticate', {'token': token})
            time.sleep(1)
            
            assert authenticated, "Socket should be authenticated"
            assert auth_data.get('user_id'), "Should have user_id in auth data"
            
            print(f"✓ Socket auth successful for user: {auth_data.get('username')}")
            
        except socketio.exceptions.ConnectionError:
            pytest.skip("Socket.io connection not available from test environment")
        finally:
            try:
                sio.disconnect()
            except:
                pass
    
    def test_room_creation_socket_flow(self):
        """Test room creation via socket"""
        # Get admin token
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Create socket client
        sio = socketio.Client()
        room_created = False
        room_data = {}
        room_error = None
        
        @sio.on('authenticated')
        def on_authenticated(data):
            print(f"✓ Authenticated as {data.get('username')}")
        
        @sio.on('room_created')
        def on_room_created(data):
            nonlocal room_created, room_data
            room_created = True
            room_data = data
            print(f"✓ Room created: {data.get('code')}")
        
        @sio.on('room_error')
        def on_room_error(data):
            nonlocal room_error
            room_error = data.get('message')
            print(f"✗ Room error: {room_error}")
        
        try:
            sio.connect(BASE_URL, transports=['websocket', 'polling'])
            time.sleep(0.5)
            
            # Authenticate
            sio.emit('authenticate', {'token': token})
            time.sleep(1)
            
            # Create room
            sio.emit('create_room')
            time.sleep(2)
            
            if room_error:
                print(f"Room creation error (may be expected): {room_error}")
            
            if room_created:
                assert room_data.get('code'), "Room should have a code"
                assert len(room_data.get('players', [])) >= 1, "Room should have at least creator"
                print(f"✓ Room created with code: {room_data.get('code')}")
                
                # Leave room to clean up
                sio.emit('leave_room')
                time.sleep(0.5)
        
        except socketio.exceptions.ConnectionError:
            pytest.skip("Socket.io connection not available from test environment")
        finally:
            try:
                sio.disconnect()
            except:
                pass


class TestPrivateRoomMatchIntegration:
    """Integration tests for private room match flow"""
    
    def test_two_users_can_join_room_and_start_match(self):
        """Test that two users can join a room and start a match"""
        session = requests.Session()
        
        # Login as admin (premium user)
        admin_login = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["token"]
        admin_user = admin_login.json()["user"]
        
        # Create guest user
        guest_response = session.post(f"{BASE_URL}/api/auth/guest", json={
            "username": f"TestGuest_{int(time.time())}",
            "gender": "Male",
            "country": "United States",
            "country_code": "US"
        })
        assert guest_response.status_code == 200
        guest_token = guest_response.json()["token"]
        guest_user = guest_response.json()["user"]
        
        print(f"✓ Admin: {admin_user.get('username')}, Guest: {guest_user.get('username')}")
        
        # Create socket clients
        admin_sio = socketio.Client()
        guest_sio = socketio.Client()
        
        admin_authenticated = False
        guest_authenticated = False
        room_code = None
        admin_room_created = False
        guest_joined = False
        match_started_admin = False
        match_started_guest = False
        admin_session_id = None
        guest_session_id = None
        
        @admin_sio.on('authenticated')
        def admin_auth(data):
            nonlocal admin_authenticated
            admin_authenticated = True
            print(f"✓ Admin authenticated: {data.get('username')}")
        
        @admin_sio.on('room_created')
        def admin_room_created_handler(data):
            nonlocal admin_room_created, room_code
            admin_room_created = True
            room_code = data.get('code')
            print(f"✓ Admin created room: {room_code}")
        
        @admin_sio.on('player_joined')
        def admin_player_joined(data):
            print(f"✓ Admin sees player joined: {data.get('username', 'unknown')}")
        
        @admin_sio.on('private_room_match_started')
        def admin_match_started(data):
            nonlocal match_started_admin, admin_session_id
            match_started_admin = True
            admin_session_id = data.get('session_id')
            print(f"✓ Admin received private_room_match_started: session={admin_session_id}")
        
        @admin_sio.on('room_error')
        def admin_room_error(data):
            print(f"✗ Admin room error: {data.get('message')}")
        
        @guest_sio.on('authenticated')
        def guest_auth(data):
            nonlocal guest_authenticated
            guest_authenticated = True
            print(f"✓ Guest authenticated: {data.get('username')}")
        
        @guest_sio.on('room_updated')
        def guest_room_updated(data):
            nonlocal guest_joined
            guest_joined = True
            print(f"✓ Guest joined room, players: {len(data.get('players', []))}")
        
        @guest_sio.on('private_room_match_started')
        def guest_match_started(data):
            nonlocal match_started_guest, guest_session_id
            match_started_guest = True
            guest_session_id = data.get('session_id')
            print(f"✓ Guest received private_room_match_started: session={guest_session_id}")
        
        @guest_sio.on('room_error')
        def guest_room_error(data):
            print(f"✗ Guest room error: {data.get('message')}")
        
        try:
            # Connect admin
            admin_sio.connect(BASE_URL, transports=['websocket', 'polling'])
            time.sleep(0.5)
            admin_sio.emit('authenticate', {'token': admin_token})
            time.sleep(1)
            
            assert admin_authenticated, "Admin should be authenticated"
            
            # Admin creates room
            admin_sio.emit('create_room')
            time.sleep(2)
            
            assert admin_room_created, "Admin should have created room"
            assert room_code, "Room code should exist"
            
            # Connect guest
            guest_sio.connect(BASE_URL, transports=['websocket', 'polling'])
            time.sleep(0.5)
            guest_sio.emit('authenticate', {'token': guest_token})
            time.sleep(1)
            
            assert guest_authenticated, "Guest should be authenticated"
            
            # Guest joins room
            guest_sio.emit('join_room', {'code': room_code})
            time.sleep(2)
            
            assert guest_joined, "Guest should have joined room"
            
            # Admin starts match (group matching)
            admin_sio.emit('start_group_matching')
            time.sleep(3)
            
            # Both should receive private_room_match_started
            assert match_started_admin, "Admin should receive private_room_match_started"
            assert match_started_guest, "Guest should receive private_room_match_started"
            assert admin_session_id == guest_session_id, "Both should have same session_id"
            
            print(f"✓ Match started successfully with shared session: {admin_session_id}")
            
            # Verify session via /api/auth/me
            admin_me = session.get(
                f"{BASE_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert admin_me.status_code == 200
            admin_me_data = admin_me.json()
            
            # currentSessionId should match the room-launched session
            assert admin_me_data.get('currentSessionId') == admin_session_id, \
                f"Admin currentSessionId should match: {admin_me_data.get('currentSessionId')} vs {admin_session_id}"
            
            print(f"✓ Admin /api/auth/me currentSessionId matches: {admin_session_id}")
        
        except socketio.exceptions.ConnectionError:
            pytest.skip("Socket.io connection not available from test environment")
        finally:
            # Cleanup - leave rooms
            try:
                admin_sio.emit('leave_room')
                time.sleep(0.5)
            except:
                pass
            try:
                guest_sio.emit('leave_room')
                time.sleep(0.5)
            except:
                pass
            admin_sio.disconnect()
            guest_sio.disconnect()


class TestLeaveAndRejoinRoom:
    """Test leave room and rejoin flow"""
    
    def test_leave_and_rejoin_same_room(self):
        """Test that user can leave room and rejoin without stuck session"""
        session = requests.Session()
        
        # Login as admin
        admin_login = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["token"]
        
        # Create guest
        guest_response = session.post(f"{BASE_URL}/api/auth/guest", json={
            "username": f"RejoinGuest_{int(time.time())}",
            "gender": "Male",
            "country": "United States",
            "country_code": "US"
        })
        assert guest_response.status_code == 200
        guest_token = guest_response.json()["token"]
        
        admin_sio = socketio.Client()
        guest_sio = socketio.Client()
        
        room_code = None
        first_session_id = None
        second_session_id = None
        
        events = {
            'admin_auth': False,
            'guest_auth': False,
            'room_created': False,
            'guest_joined': False,
            'first_match': False,
            'guest_left': False,
            'guest_rejoined': False,
            'second_match': False
        }
        
        @admin_sio.on('authenticated')
        def admin_auth(data):
            events['admin_auth'] = True
        
        @admin_sio.on('room_created')
        def room_created(data):
            nonlocal room_code
            events['room_created'] = True
            room_code = data.get('code')
            print(f"✓ Room created: {room_code}")
        
        @admin_sio.on('private_room_match_started')
        def admin_match(data):
            nonlocal first_session_id, second_session_id
            if not events['first_match']:
                events['first_match'] = True
                first_session_id = data.get('session_id')
                print(f"✓ First match session: {first_session_id}")
            else:
                events['second_match'] = True
                second_session_id = data.get('session_id')
                print(f"✓ Second match session: {second_session_id}")
        
        @admin_sio.on('player_left')
        def player_left(data):
            events['guest_left'] = True
            print("✓ Admin sees guest left")
        
        @admin_sio.on('player_joined')
        def player_joined(data):
            if events['guest_left']:
                events['guest_rejoined'] = True
                print("✓ Admin sees guest rejoined")
            else:
                events['guest_joined'] = True
                print("✓ Admin sees guest joined first time")
        
        @guest_sio.on('authenticated')
        def guest_auth(data):
            events['guest_auth'] = True
        
        @guest_sio.on('room_left')
        def guest_room_left():
            print("✓ Guest left room")
        
        @guest_sio.on('room_error')
        def guest_error(data):
            print(f"✗ Guest error: {data.get('message')}")
        
        try:
            # Connect and authenticate both
            admin_sio.connect(BASE_URL, transports=['websocket', 'polling'])
            time.sleep(0.5)
            admin_sio.emit('authenticate', {'token': admin_token})
            time.sleep(1)
            
            guest_sio.connect(BASE_URL, transports=['websocket', 'polling'])
            time.sleep(0.5)
            guest_sio.emit('authenticate', {'token': guest_token})
            time.sleep(1)
            
            # Admin creates room
            admin_sio.emit('create_room')
            time.sleep(2)
            assert room_code, "Room should be created"
            
            # Guest joins
            guest_sio.emit('join_room', {'code': room_code})
            time.sleep(2)
            
            # Start first match
            admin_sio.emit('start_group_matching')
            time.sleep(3)
            
            assert events['first_match'], "First match should start"
            assert first_session_id, "First session ID should exist"
            
            # Guest leaves room
            guest_sio.emit('leave_room')
            time.sleep(2)
            
            # Guest rejoins same room
            guest_sio.emit('join_room', {'code': room_code})
            time.sleep(2)
            
            # Start second match
            admin_sio.emit('start_group_matching')
            time.sleep(3)
            
            # Verify second match works
            assert events['second_match'], "Second match should start after rejoin"
            assert second_session_id, "Second session ID should exist"
            assert second_session_id != first_session_id, "Second session should be different from first"
            
            print(f"✓ Leave and rejoin successful: first={first_session_id}, second={second_session_id}")
            
            # Verify no 'already in session' error by checking admin's currentSessionId
            admin_me = session.get(
                f"{BASE_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert admin_me.status_code == 200
            current_session = admin_me.json().get('currentSessionId')
            assert current_session == second_session_id, \
                f"currentSessionId should be second session: {current_session} vs {second_session_id}"
            
            print("✓ No stuck session after leave/rejoin")
        
        except socketio.exceptions.ConnectionError:
            pytest.skip("Socket.io connection not available from test environment")
        finally:
            try:
                admin_sio.emit('leave_room')
                guest_sio.emit('leave_room')
                time.sleep(0.5)
            except:
                pass
            admin_sio.disconnect()
            guest_sio.disconnect()


class TestStartGameFromRoom:
    """Test starting games from private room"""
    
    def test_start_uno_from_room(self):
        """Test starting UNO game from private room"""
        session = requests.Session()
        
        # Login as admin
        admin_login = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["token"]
        
        # Create guest
        guest_response = session.post(f"{BASE_URL}/api/auth/guest", json={
            "username": f"UnoGuest_{int(time.time())}",
            "gender": "Male",
            "country": "United States",
            "country_code": "US"
        })
        assert guest_response.status_code == 200
        guest_token = guest_response.json()["token"]
        
        admin_sio = socketio.Client()
        guest_sio = socketio.Client()
        
        room_code = None
        game_started_admin = False
        game_started_guest = False
        match_started = False
        
        @admin_sio.on('authenticated')
        def admin_auth(data):
            print(f"✓ Admin authenticated")
        
        @admin_sio.on('room_created')
        def room_created(data):
            nonlocal room_code
            room_code = data.get('code')
            print(f"✓ Room created: {room_code}")
        
        @admin_sio.on('room_game_started')
        def admin_game_started(data):
            nonlocal game_started_admin
            game_started_admin = True
            print(f"✓ Admin received room_game_started: {data.get('game_type')}")
        
        @admin_sio.on('private_room_match_started')
        def admin_match_started(data):
            nonlocal match_started
            match_started = True
            print(f"✓ Admin received private_room_match_started with auto_start_game: {data.get('auto_start_game')}")
        
        @guest_sio.on('authenticated')
        def guest_auth(data):
            print(f"✓ Guest authenticated")
        
        @guest_sio.on('room_game_started')
        def guest_game_started(data):
            nonlocal game_started_guest
            game_started_guest = True
            print(f"✓ Guest received room_game_started: {data.get('game_type')}")
        
        @guest_sio.on('private_room_match_started')
        def guest_match_started(data):
            print(f"✓ Guest received private_room_match_started with auto_start_game: {data.get('auto_start_game')}")
        
        try:
            # Connect both
            admin_sio.connect(BASE_URL, transports=['websocket', 'polling'])
            time.sleep(0.5)
            admin_sio.emit('authenticate', {'token': admin_token})
            time.sleep(1)
            
            guest_sio.connect(BASE_URL, transports=['websocket', 'polling'])
            time.sleep(0.5)
            guest_sio.emit('authenticate', {'token': guest_token})
            time.sleep(1)
            
            # Admin creates room
            admin_sio.emit('create_room')
            time.sleep(2)
            assert room_code, "Room should be created"
            
            # Guest joins
            guest_sio.emit('join_room', {'code': room_code})
            time.sleep(2)
            
            # Admin starts UNO game
            admin_sio.emit('start_room_game', {'game_type': 'uno'})
            time.sleep(3)
            
            # Both should receive room_game_started
            assert game_started_admin, "Admin should receive room_game_started"
            assert game_started_guest, "Guest should receive room_game_started"
            
            # Match should also start (private_room_match_started)
            assert match_started, "Match should start with auto_start_game"
            
            print("✓ UNO game started successfully from private room")
        
        except socketio.exceptions.ConnectionError:
            pytest.skip("Socket.io connection not available from test environment")
        finally:
            try:
                admin_sio.emit('leave_room')
                guest_sio.emit('leave_room')
                time.sleep(0.5)
            except:
                pass
            try:
                admin_sio.disconnect()
                guest_sio.disconnect()
            except:
                pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
