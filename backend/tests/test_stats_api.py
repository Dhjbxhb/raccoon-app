"""
Stats API Tests - Real user statistics tracking for Raccoon App (Task 6/6)

Tests:
- /api/stats/me - Get user stats
- /api/stats/heartbeat - Track time spent
- /api/stats/full - Get complete user data with stats and premium info
- /api/stats/premium-status - Get premium subscription status
- Stats persistence in MongoDB
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestStatsEndpoints:
    """Test stats API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - create a guest user for testing"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Create a guest user for testing
        response = self.session.post(f"{BASE_URL}/api/auth/guest", json={
            "username": f"TEST_StatsUser_{uuid.uuid4().hex[:8]}",
            "gender": "male",
            "age_verified": True
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get('token')
            self.user_id = data.get('user', {}).get('guest_id') or data.get('user', {}).get('user_id')
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Failed to create guest user: {response.status_code}")
    
    def test_stats_me_endpoint_returns_200(self):
        """Test /api/stats/me returns 200 for authenticated user"""
        response = self.session.get(f"{BASE_URL}/api/stats/me")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ /api/stats/me returns 200")
    
    def test_stats_me_returns_correct_structure(self):
        """Test /api/stats/me returns correct data structure"""
        response = self.session.get(f"{BASE_URL}/api/stats/me")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify required fields exist
        assert "total_sessions" in data, "Missing total_sessions field"
        assert "total_time_spent" in data, "Missing total_time_spent field"
        assert "games_played" in data, "Missing games_played field"
        assert "games_won" in data, "Missing games_won field"
        assert "formatted_time" in data, "Missing formatted_time field"
        
        # Verify types
        assert isinstance(data["total_sessions"], int), "total_sessions should be int"
        assert isinstance(data["total_time_spent"], int), "total_time_spent should be int"
        assert isinstance(data["games_played"], int), "games_played should be int"
        assert isinstance(data["games_won"], int), "games_won should be int"
        assert isinstance(data["formatted_time"], str), "formatted_time should be string"
        
        print(f"✓ Stats structure correct: {data}")
    
    def test_stats_me_new_user_starts_at_zero(self):
        """Test that new users start with zero stats"""
        response = self.session.get(f"{BASE_URL}/api/stats/me")
        assert response.status_code == 200
        
        data = response.json()
        
        # New users should have zero stats
        assert data["total_sessions"] == 0, f"New user should have 0 sessions, got {data['total_sessions']}"
        assert data["total_time_spent"] == 0, f"New user should have 0 time spent, got {data['total_time_spent']}"
        assert data["games_played"] == 0, f"New user should have 0 games played, got {data['games_played']}"
        assert data["games_won"] == 0, f"New user should have 0 games won, got {data['games_won']}"
        
        print("✓ New user starts with zero stats")
    
    def test_stats_me_requires_auth(self):
        """Test /api/stats/me requires authentication"""
        # Create a new session without auth
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/stats/me")
        
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ /api/stats/me requires authentication")
    
    def test_heartbeat_endpoint_returns_200(self):
        """Test /api/stats/heartbeat returns 200"""
        response = self.session.post(f"{BASE_URL}/api/stats/heartbeat")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ /api/stats/heartbeat returns 200")
    
    def test_heartbeat_returns_correct_structure(self):
        """Test /api/stats/heartbeat returns correct data structure"""
        response = self.session.post(f"{BASE_URL}/api/stats/heartbeat")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify required fields
        assert "success" in data, "Missing success field"
        assert "seconds_added" in data, "Missing seconds_added field"
        assert "total_time_spent" in data, "Missing total_time_spent field"
        
        # Verify types
        assert isinstance(data["success"], bool), "success should be bool"
        assert isinstance(data["seconds_added"], int), "seconds_added should be int"
        assert isinstance(data["total_time_spent"], int), "total_time_spent should be int"
        
        print(f"✓ Heartbeat structure correct: {data}")
    
    def test_heartbeat_tracks_time(self):
        """Test that heartbeat actually tracks time spent"""
        # First heartbeat - initializes tracking
        response1 = self.session.post(f"{BASE_URL}/api/stats/heartbeat")
        assert response1.status_code == 200
        initial_time = response1.json()["total_time_spent"]
        
        # Wait a bit
        time.sleep(2)
        
        # Second heartbeat - should add time
        response2 = self.session.post(f"{BASE_URL}/api/stats/heartbeat")
        assert response2.status_code == 200
        
        data = response2.json()
        # Time should have increased (at least 1 second)
        assert data["seconds_added"] >= 1, f"Expected seconds_added >= 1, got {data['seconds_added']}"
        assert data["total_time_spent"] >= initial_time, "Total time should not decrease"
        
        print(f"✓ Heartbeat tracked {data['seconds_added']}s, total: {data['total_time_spent']}s")
    
    def test_heartbeat_requires_auth(self):
        """Test /api/stats/heartbeat requires authentication"""
        no_auth_session = requests.Session()
        response = no_auth_session.post(f"{BASE_URL}/api/stats/heartbeat")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ /api/stats/heartbeat requires authentication")
    
    def test_stats_full_endpoint_returns_200(self):
        """Test /api/stats/full returns 200"""
        response = self.session.get(f"{BASE_URL}/api/stats/full")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ /api/stats/full returns 200")
    
    def test_stats_full_returns_complete_data(self):
        """Test /api/stats/full returns complete user data with stats and premium info"""
        response = self.session.get(f"{BASE_URL}/api/stats/full")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify user info fields
        assert "user_id" in data, "Missing user_id"
        assert "username" in data, "Missing username"
        assert "is_guest" in data, "Missing is_guest"
        
        # Verify stats object
        assert "stats" in data, "Missing stats object"
        stats = data["stats"]
        assert "total_sessions" in stats, "Missing stats.total_sessions"
        assert "total_time_spent" in stats, "Missing stats.total_time_spent"
        assert "games_played" in stats, "Missing stats.games_played"
        assert "games_won" in stats, "Missing stats.games_won"
        assert "formatted_time" in stats, "Missing stats.formatted_time"
        
        # Verify premium object
        assert "premium" in data, "Missing premium object"
        premium = data["premium"]
        assert "is_premium" in premium, "Missing premium.is_premium"
        assert "is_lifetime" in premium, "Missing premium.is_lifetime"
        assert "is_expired" in premium, "Missing premium.is_expired"
        
        print(f"✓ Full data structure correct: user_id={data['user_id']}, is_guest={data['is_guest']}")
        print(f"  Stats: {stats}")
        print(f"  Premium: {premium}")
    
    def test_stats_full_guest_not_premium(self):
        """Test that guest users are never premium"""
        response = self.session.get(f"{BASE_URL}/api/stats/full")
        assert response.status_code == 200
        
        data = response.json()
        
        # Guest should not be premium
        assert data["is_guest"] == True, "Test user should be guest"
        assert data["premium"]["is_premium"] == False, "Guest should not be premium"
        
        print("✓ Guest user correctly marked as non-premium")
    
    def test_stats_full_requires_auth(self):
        """Test /api/stats/full requires authentication"""
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/stats/full")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ /api/stats/full requires authentication")
    
    def test_premium_status_endpoint_returns_200(self):
        """Test /api/stats/premium-status returns 200"""
        response = self.session.get(f"{BASE_URL}/api/stats/premium-status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ /api/stats/premium-status returns 200")
    
    def test_premium_status_returns_correct_structure(self):
        """Test /api/stats/premium-status returns correct data structure"""
        response = self.session.get(f"{BASE_URL}/api/stats/premium-status")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify required fields
        assert "is_premium" in data, "Missing is_premium"
        assert "is_lifetime" in data, "Missing is_lifetime"
        assert "is_expired" in data, "Missing is_expired"
        
        # Verify types
        assert isinstance(data["is_premium"], bool), "is_premium should be bool"
        assert isinstance(data["is_lifetime"], bool), "is_lifetime should be bool"
        assert isinstance(data["is_expired"], bool), "is_expired should be bool"
        
        print(f"✓ Premium status structure correct: {data}")
    
    def test_premium_status_guest_not_premium(self):
        """Test that guest users are never premium"""
        response = self.session.get(f"{BASE_URL}/api/stats/premium-status")
        assert response.status_code == 200
        
        data = response.json()
        
        assert data["is_premium"] == False, "Guest should not be premium"
        assert data["is_lifetime"] == False, "Guest should not have lifetime"
        
        print("✓ Guest correctly marked as non-premium")
    
    def test_premium_status_requires_auth(self):
        """Test /api/stats/premium-status requires authentication"""
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/stats/premium-status")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ /api/stats/premium-status requires authentication")


class TestTimeFormatting:
    """Test time formatting in stats responses"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Create a guest user
        response = self.session.post(f"{BASE_URL}/api/auth/guest", json={
            "username": f"TEST_TimeFormat_{uuid.uuid4().hex[:8]}",
            "gender": "female",
            "age_verified": True
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get('token')
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Failed to create guest user: {response.status_code}")
    
    def test_formatted_time_for_zero_seconds(self):
        """Test formatted_time shows correctly for 0 seconds"""
        response = self.session.get(f"{BASE_URL}/api/stats/me")
        assert response.status_code == 200
        
        data = response.json()
        # For 0 seconds, should show "0s" or similar
        assert data["formatted_time"] in ["0s", "0m", "0"], f"Unexpected format for 0: {data['formatted_time']}"
        print(f"✓ Zero time formatted as: {data['formatted_time']}")


class TestStatsPersistence:
    """Test that stats persist across sessions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_stats_persist_after_heartbeat(self):
        """Test that time spent persists after heartbeat"""
        # Create guest user
        response = self.session.post(f"{BASE_URL}/api/auth/guest", json={
            "username": f"TEST_Persist_{uuid.uuid4().hex[:8]}",
            "gender": "male",
            "age_verified": True
        })
        assert response.status_code == 200
        
        data = response.json()
        token = data.get('token')
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Send first heartbeat
        response1 = self.session.post(f"{BASE_URL}/api/stats/heartbeat")
        assert response1.status_code == 200
        
        # Wait and send second heartbeat
        time.sleep(2)
        response2 = self.session.post(f"{BASE_URL}/api/stats/heartbeat")
        assert response2.status_code == 200
        
        time_after_heartbeat = response2.json()["total_time_spent"]
        
        # Verify stats endpoint shows same time
        response3 = self.session.get(f"{BASE_URL}/api/stats/me")
        assert response3.status_code == 200
        
        stats_time = response3.json()["total_time_spent"]
        
        # Times should match (or be very close due to timing)
        assert abs(stats_time - time_after_heartbeat) <= 2, \
            f"Stats time ({stats_time}) should match heartbeat time ({time_after_heartbeat})"
        
        print(f"✓ Stats persist correctly: heartbeat={time_after_heartbeat}s, stats={stats_time}s")


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API is responding"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✓ API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
