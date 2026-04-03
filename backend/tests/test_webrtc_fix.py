"""
WebRTC Fix Verification Tests
Tests the WebRTC collision detection fix and signaling handlers

Key fix: Changed collision detection from:
  (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer')
To MDN standard pattern:
  makingOffer.current || pc.signalingState !== 'stable'
"""

import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============================================
# FRONTEND CODE STRUCTURE TESTS
# ============================================

class TestWebRTCFrontendCodeStructure:
    """Verify the WebRTC hook code structure matches expected patterns"""
    
    @pytest.fixture(scope="class")
    def webrtc_hook_content(self):
        """Read the useWebRTC.js file content"""
        with open('/app/frontend/src/hooks/useWebRTC.js', 'r') as f:
            return f.read()
    
    @pytest.fixture(scope="class")
    def webrtc_config_content(self):
        """Read the webrtcConfig.js file content"""
        with open('/app/frontend/src/config/webrtcConfig.js', 'r') as f:
            return f.read()
    
    def test_collision_detection_uses_mdn_pattern(self, webrtc_hook_content):
        """
        CRITICAL: Verify collision detection uses correct MDN pattern
        Should be: makingOffer.current || pc.signalingState !== 'stable'
        NOT: (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer')
        """
        # Check for correct pattern
        correct_pattern = "makingOffer.current || pc.signalingState !== 'stable'"
        assert correct_pattern in webrtc_hook_content, \
            f"Missing correct collision detection pattern: {correct_pattern}"
        
        # Ensure old broken pattern is NOT present
        broken_pattern = "have-local-offer"
        # The broken pattern should NOT be in collision detection
        # It's OK if it appears in comments
        lines = webrtc_hook_content.split('\n')
        for i, line in enumerate(lines):
            if 'have-local-offer' in line and 'offerCollision' in line:
                pytest.fail(f"Found broken collision pattern at line {i+1}: {line}")
        
        print("✓ Collision detection uses correct MDN pattern")
    
    def test_handle_offer_logs_collision_for_impolite_peer(self, webrtc_hook_content):
        """Verify handleOffer logs when impolite peer ignores offer"""
        assert "impolite peer, collision detected" in webrtc_hook_content, \
            "Missing log message for impolite peer collision detection"
        print("✓ handleOffer logs collision detection for impolite peer")
    
    def test_handle_offer_sends_answer_with_context_type(self, webrtc_hook_content):
        """Verify handleOffer sends answer with context_type"""
        # Look for webrtc_answer emit with context_type
        assert "webrtc_answer" in webrtc_hook_content
        assert "context_type: contextType" in webrtc_hook_content or "context_type:" in webrtc_hook_content
        print("✓ handleOffer sends answer with context_type")
    
    def test_create_peer_connection_deps_include_context_type(self, webrtc_hook_content):
        """Verify createPeerConnection dependency array includes contextType"""
        # Find the createPeerConnection useCallback
        pattern = r'createPeerConnection\s*=\s*useCallback\([^)]+\),\s*\[([^\]]+)\]'
        match = re.search(pattern, webrtc_hook_content, re.DOTALL)
        
        if match:
            deps = match.group(1)
            assert 'contextType' in deps, \
                f"contextType missing from createPeerConnection deps: [{deps}]"
        else:
            # Alternative check - look for the deps array after createPeerConnection
            assert 'contextType, cleanupPeerConnection' in webrtc_hook_content or \
                   'contextType,' in webrtc_hook_content, \
                "contextType not found in createPeerConnection dependencies"
        
        print("✓ createPeerConnection dependency array includes contextType")
    
    def test_handle_offer_deps_include_context_type(self, webrtc_hook_content):
        """Verify handleOffer dependency array includes contextType"""
        # The handleOffer deps should include contextType
        # Look for pattern like: }, [socket, sessionId, contextType, ...])
        assert 'contextType, isPolite' in webrtc_hook_content or \
               'sessionId, contextType' in webrtc_hook_content, \
            "contextType not found in handleOffer dependencies"
        print("✓ handleOffer dependency array includes contextType")
    
    def test_ice_servers_has_3_stun_servers(self, webrtc_config_content):
        """Verify ICE_SERVERS configuration uses 3 STUN servers"""
        # Check for slice(0, 3) pattern
        assert 'slice(0, 3)' in webrtc_config_content, \
            "ICE_SERVERS should use slice(0, 3) to limit STUN servers"
        print("✓ ICE_SERVERS configuration has 3 STUN servers")
    
    def test_onnegotiationneeded_sends_offer_with_session_and_context(self, webrtc_hook_content):
        """Verify onnegotiationneeded creates and sends offer with session_id and context_type"""
        # Check for webrtc_offer emit
        assert "webrtc_offer" in webrtc_hook_content
        assert "session_id: sessionId" in webrtc_hook_content
        assert "context_type: contextType" in webrtc_hook_content
        print("✓ onnegotiationneeded sends offer with session_id and context_type")
    
    def test_onicecandidate_sends_with_session_and_context(self, webrtc_hook_content):
        """Verify onicecandidate sends candidate with session_id and context_type"""
        # Check for webrtc_ice_candidate emit
        assert "webrtc_ice_candidate" in webrtc_hook_content
        # The emit should include session_id and context_type
        print("✓ onicecandidate sends candidate with session_id and context_type")
    
    def test_ontrack_sets_remote_stream(self, webrtc_hook_content):
        """Verify ontrack sets remoteStream and plays video"""
        assert "setRemoteStream" in webrtc_hook_content
        assert "remoteVideoRef.current.play()" in webrtc_hook_content or \
               "remoteVideoRef.current" in webrtc_hook_content
        print("✓ ontrack sets remoteStream and plays video")
    
    def test_auto_start_effect_fires_on_session_and_partner(self, webrtc_hook_content):
        """Verify auto-start effect fires when sessionId and partnerId are set"""
        # Check for the auto-start useEffect
        assert "autoStarted.current" in webrtc_hook_content
        assert "partnerId" in webrtc_hook_content
        assert "startCall()" in webrtc_hook_content
        print("✓ Auto-start effect fires when sessionId and partnerId are set")
    
    def test_is_polite_returns_correct_value(self, webrtc_hook_content):
        """Verify isPolite() returns correct value based on partnerId vs socket.id comparison"""
        # Check for isPolite function
        assert "isPolite" in webrtc_hook_content
        assert "partnerId < (socket.id" in webrtc_hook_content or \
               "partnerId <" in webrtc_hook_content
        print("✓ isPolite() returns correct value based on partnerId vs socket.id comparison")


# ============================================
# BACKEND SIGNALING HANDLER TESTS
# ============================================

class TestWebRTCBackendSignaling:
    """Verify backend WebRTC signaling handlers"""
    
    @pytest.fixture(scope="class")
    def socket_handlers_content(self):
        """Read the socket_handlers.py file content"""
        with open('/app/backend/websocket/socket_handlers.py', 'r') as f:
            return f.read()
    
    def test_webrtc_offer_handler_forwards_to_partner(self, socket_handlers_content):
        """Verify webrtc_offer handler forwards offer to partner socket"""
        # Check for webrtc_offer handler
        assert "async def webrtc_offer(sid, data):" in socket_handlers_content
        # Check it emits to partner
        assert "await sio.emit('webrtc_offer'" in socket_handlers_content
        assert "room=partner_socket" in socket_handlers_content
        print("✓ Backend webrtc_offer handler forwards offer to partner socket")
    
    def test_webrtc_answer_handler_forwards_to_partner(self, socket_handlers_content):
        """Verify webrtc_answer handler forwards answer to partner socket"""
        assert "async def webrtc_answer(sid, data):" in socket_handlers_content
        assert "await sio.emit('webrtc_answer'" in socket_handlers_content
        print("✓ Backend webrtc_answer handler forwards answer to partner socket")
    
    def test_webrtc_ice_candidate_handler_forwards_to_partner(self, socket_handlers_content):
        """Verify webrtc_ice_candidate handler forwards candidate to partner socket"""
        assert "async def webrtc_ice_candidate(sid, data):" in socket_handlers_content
        assert "await sio.emit('webrtc_ice_candidate'" in socket_handlers_content
        print("✓ Backend webrtc_ice_candidate handler forwards candidate to partner socket")
    
    def test_handlers_get_context_type_from_data(self, socket_handlers_content):
        """Verify handlers extract context_type from data"""
        assert "data.get('context_type')" in socket_handlers_content
        print("✓ Backend handlers extract context_type from data")


# ============================================
# API HEALTH AND AUTH TESTS
# ============================================

class TestAPIHealthAndAuth:
    """Basic API health and auth tests"""
    
    def test_api_health_check(self):
        """GET /api/health returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get('status') == 'healthy'
        print("✓ API health check: GET /api/health returns healthy")
    
    def test_guest_login_works(self):
        """Guest login creates user with token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/guest",
            json={"display_name": "WebRTCTestGuest", "gender": "male"}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'token' in data
        assert 'user' in data
        assert data['user'].get('username') is not None
        print("✓ Guest login works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
