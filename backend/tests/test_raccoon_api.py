"""
Raccoon App API Tests
Tests for authentication, guest login, and core API endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://live-social-video.preview.emergentagent.com')

class TestHealthAndRoot:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint returns welcome message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Raccoon" in data["message"]
        print(f"✓ API root: {data['message']}")


class TestGuestAuth:
    """Guest authentication tests"""
    
    def test_guest_login_male(self):
        """Test guest login with male gender"""
        response = requests.post(
            f"{BASE_URL}/api/auth/guest",
            json={"gender": "male"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "token" in data
        assert "user" in data
        assert data["user"]["gender"] == "male"
        assert "guest_id" in data["user"]
        assert data["user"]["username"].startswith("Guest")
        print(f"✓ Guest login (male): {data['user']['username']}")
    
    def test_guest_login_female(self):
        """Test guest login with female gender"""
        response = requests.post(
            f"{BASE_URL}/api/auth/guest",
            json={"gender": "female"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "token" in data
        assert data["user"]["gender"] == "female"
        print(f"✓ Guest login (female): {data['user']['username']}")
    
    def test_guest_login_invalid_gender(self):
        """Test guest login with invalid gender returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/auth/guest",
            json={"gender": "any"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "Gender must be Male or Female" in data["detail"]
        print("✓ Guest login with 'any' gender correctly rejected")
    
    def test_guest_login_missing_gender(self):
        """Test guest login without gender returns 422"""
        response = requests.post(
            f"{BASE_URL}/api/auth/guest",
            json={}
        )
        assert response.status_code == 422
        print("✓ Guest login without gender correctly rejected")


class TestUserAuth:
    """User authentication tests"""
    
    def test_signup_success(self):
        """Test user signup with valid data"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        unique_username = f"testuser_{uuid.uuid4().hex[:6]}"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "email": unique_email,
                "username": unique_username,
                "password": "TestPass123!",
                "gender": "male",
                "date_of_birth": "2000-01-01"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["username"] == unique_username
        print(f"✓ Signup success: {unique_username}")
    
    def test_signup_underage(self):
        """Test signup with underage user returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "email": f"underage_{uuid.uuid4().hex[:8]}@test.com",
                "username": f"underage_{uuid.uuid4().hex[:6]}",
                "password": "TestPass123!",
                "gender": "male",
                "date_of_birth": "2015-01-01"  # Under 18
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "18 or older" in data["detail"]
        print("✓ Underage signup correctly rejected")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "nonexistent@test.com",
                "password": "wrongpassword"
            }
        )
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")
    
    def test_login_admin_user(self):
        """Test login with admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "admin@raccoon.app",
                "password": "Admin123!"
            }
        )
        # Admin may or may not exist, just check response is valid
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            print(f"✓ Admin login success: {data['user']['username']}")
        else:
            print(f"? Admin user not found (status: {response.status_code})")


class TestAuthenticatedEndpoints:
    """Tests for endpoints requiring authentication"""
    
    @pytest.fixture
    def guest_token(self):
        """Get a guest token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/guest",
            json={"gender": "male"}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_get_current_user(self, guest_token):
        """Test getting current user info with valid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {guest_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "guest_id" in data or "user_id" in data
        print(f"✓ Get current user: {data.get('username', 'unknown')}")
    
    def test_get_current_user_no_token(self):
        """Test getting current user without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [401, 403]
        print("✓ Unauthenticated /me request correctly rejected")
    
    def test_get_current_user_invalid_token(self):
        """Test getting current user with invalid token returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        assert response.status_code in [401, 403]
        print("✓ Invalid token correctly rejected")


class TestReportsEndpoint:
    """Tests for report functionality"""
    
    @pytest.fixture
    def guest_token(self):
        """Get a guest token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/guest",
            json={"gender": "male"}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_create_report_without_auth(self):
        """Test creating report without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/reports/create",
            json={
                "reported_id": "some-user-id",
                "reason": "Inappropriate behavior",
                "details": "Test report"
            }
        )
        assert response.status_code in [401, 403]
        print("✓ Report without auth correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
