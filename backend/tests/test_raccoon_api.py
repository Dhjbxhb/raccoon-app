"""
RACCOON APP API Tests
Tests for admin security, authentication, and premium features
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://realtime-raccoon.preview.emergentagent.com')

class TestAdminSecurity:
    """Admin security and access control tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for tests"""
        # Setup admin account first
        requests.post(f"{BASE_URL}/api/admin/setup-admin")
        
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@raccoon.app",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.admin_token = data['token']
        self.admin_user = data['user']
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@raccoon.app",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify admin has admin and premium status
        assert data['user']['is_admin'] == True
        assert data['user']['premium_status'] == True
        assert data['user']['email'] == "admin@raccoon.app"
        assert 'token' in data
    
    def test_admin_stats_endpoint(self):
        """Test admin stats endpoint returns all 7 stat cards"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all 7 stat fields are present
        required_fields = [
            'total_users', 'total_guests', 'premium_users', 
            'banned_users', 'total_matches', 'messages_today', 'active_sessions'
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], int), f"Field {field} should be integer"
    
    def test_admin_users_endpoint(self):
        """Test admin users endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'users' in data
        assert 'stats' in data
        assert isinstance(data['users'], list)
    
    def test_guest_cannot_access_admin(self):
        """Test that guest users cannot access admin endpoints"""
        # Create guest
        guest_response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            "gender": "male"
        })
        assert guest_response.status_code == 200
        guest_token = guest_response.json()['token']
        
        # Try to access admin stats
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {guest_token}"}
        )
        assert response.status_code == 403
        assert "Admin access required" in response.json().get('detail', '')
    
    def test_regular_user_cannot_access_admin(self):
        """Test that regular users cannot access admin endpoints"""
        # Create a test user
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "username": f"TestUser{uuid.uuid4().hex[:6]}",
            "password": "TestPass123!",
            "gender": "male",
            "date_of_birth": "1990-01-01"
        })
        
        if signup_response.status_code == 200:
            user_token = signup_response.json()['token']
            
            # Try to access admin stats
            response = requests.get(
                f"{BASE_URL}/api/admin/stats",
                headers={"Authorization": f"Bearer {user_token}"}
            )
            assert response.status_code == 403
            assert "Admin access required" in response.json().get('detail', '')
    
    def test_no_token_cannot_access_admin(self):
        """Test that requests without token cannot access admin"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 401


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_guest_login(self):
        """Test guest login creates session"""
        response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            "gender": "female"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert 'token' in data
        assert 'user' in data
        assert data['user']['gender'] == 'female'
        assert data['user']['username'].startswith('Guest')
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
    
    def test_api_health(self):
        """Test API is running"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        assert "Raccoon" in response.json().get('message', '')


class TestPremiumFeatures:
    """Premium feature gating tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for premium tests"""
        requests.post(f"{BASE_URL}/api/admin/setup-admin")
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@raccoon.app",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        self.admin_token = response.json()['token']
        self.admin_user = response.json()['user']
    
    def test_admin_has_premium(self):
        """Test admin user has premium status"""
        assert self.admin_user['premium_status'] == True
    
    def test_guest_no_premium(self):
        """Test guest users don't have premium"""
        response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            "gender": "male"
        })
        assert response.status_code == 200
        # Guests don't have premium_status field in response
        user = response.json()['user']
        assert 'premium_status' not in user or user.get('premium_status') == False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
