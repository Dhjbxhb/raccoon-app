"""
Test Auth Persistence - Backend API Tests
Tests for login persistence issue fix after Google authentication
"""
import pytest
import requests
import os
import jwt
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-social-31.preview.emergentagent.com').rstrip('/')


class TestAuthEndpoints:
    """Test authentication endpoints return valid JWT tokens"""
    
    def test_health_check(self):
        """Verify API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")
    
    def test_guest_login_returns_valid_jwt(self):
        """Test /api/auth/guest returns valid JWT token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/guest",
            json={"gender": "male", "browser_locale": "en-US"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify token exists
        assert "token" in data, "Response should contain token"
        assert data["token"], "Token should not be empty"
        
        # Verify token is valid JWT
        token = data["token"]
        try:
            # Decode without verification to check structure
            payload = jwt.decode(token, options={"verify_signature": False})
            assert "user_id" in payload, "Token should contain user_id"
            assert "exp" in payload, "Token should contain expiration"
            assert payload["is_guest"] == True, "Token should mark as guest"
            print(f"✓ Guest login returns valid JWT with user_id: {payload['user_id']}")
        except jwt.DecodeError:
            pytest.fail("Token is not a valid JWT")
        
        # Verify user data
        assert "user" in data, "Response should contain user"
        assert data["user"]["guest_id"], "User should have guest_id"
        assert data["user"]["username"].startswith("Guest"), "Username should start with Guest"
        print(f"✓ Guest user created: {data['user']['username']}")
    
    def test_admin_login_returns_valid_jwt(self):
        """Test /api/auth/login returns valid JWT token for admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@raccoon.app", "password": "Admin123!"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify token exists
        assert "token" in data, "Response should contain token"
        assert data["token"], "Token should not be empty"
        
        # Verify token is valid JWT
        token = data["token"]
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            assert "user_id" in payload, "Token should contain user_id"
            assert "exp" in payload, "Token should contain expiration"
            assert payload["is_admin"] == True, "Admin token should have is_admin=True"
            print(f"✓ Admin login returns valid JWT with user_id: {payload['user_id']}")
        except jwt.DecodeError:
            pytest.fail("Token is not a valid JWT")
        
        # Verify user data
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == "admin@raccoon.app"
        assert data["user"]["is_admin"] == True
        print(f"✓ Admin user logged in: {data['user']['username']}")
    
    def test_auth_me_with_valid_token(self):
        """Test /api/auth/me returns user data with valid token"""
        # First get a token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/guest",
            json={"gender": "female", "browser_locale": "en-US"}
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        guest_id = login_response.json()["user"]["guest_id"]
        
        # Now test /api/auth/me
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_response.status_code == 200
        data = me_response.json()
        
        # Verify user data matches
        assert data["guest_id"] == guest_id, "guest_id should match"
        assert "username" in data, "Should have username"
        assert "age_verified" in data, "Should have age_verified field"
        print(f"✓ /api/auth/me returns correct user data for {data['username']}")
    
    def test_auth_me_without_token_fails(self):
        """Test /api/auth/me fails without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [401, 403], "Should fail without token"
        print("✓ /api/auth/me correctly rejects requests without token")
    
    def test_auth_me_with_invalid_token_fails(self):
        """Test /api/auth/me fails with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        assert response.status_code in [401, 403], "Should fail with invalid token"
        print("✓ /api/auth/me correctly rejects invalid tokens")


class TestGoogleAuthEndpoint:
    """Test Google authentication endpoint"""
    
    def test_google_auth_endpoint_exists(self):
        """Test /api/auth/google endpoint exists"""
        # Send minimal request to check endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/auth/google",
            json={}
        )
        # Should fail with validation error, not 404
        assert response.status_code != 404, "Google auth endpoint should exist"
        print("✓ /api/auth/google endpoint exists")
    
    def test_google_auth_creates_user_and_returns_jwt(self):
        """Test /api/auth/google creates user and returns valid JWT"""
        import uuid
        test_uid = f"test_firebase_{uuid.uuid4().hex[:8]}"
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/google",
            json={
                "uid": test_uid,
                "email": test_email,
                "displayName": "Test Google User",
                "photoURL": None,
                "idToken": "test_id_token",
                "browser_locale": "en-US"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify token
        assert "token" in data, "Response should contain token"
        token = data["token"]
        payload = jwt.decode(token, options={"verify_signature": False})
        assert "user_id" in payload
        assert "exp" in payload
        
        # Verify user
        assert "user" in data
        assert data["user"]["email"] == test_email
        assert data["user"]["username"] == "Test Google User"
        print(f"✓ Google auth creates user and returns valid JWT: {data['user']['username']}")
    
    def test_google_auth_token_works_for_me_endpoint(self):
        """Test token from Google auth works with /api/auth/me"""
        import uuid
        test_uid = f"test_firebase_{uuid.uuid4().hex[:8]}"
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        # Create user via Google auth
        auth_response = requests.post(
            f"{BASE_URL}/api/auth/google",
            json={
                "uid": test_uid,
                "email": test_email,
                "displayName": "Test Me User",
                "photoURL": None,
                "idToken": "test_id_token",
                "browser_locale": "en-US"
            }
        )
        assert auth_response.status_code == 200
        token = auth_response.json()["token"]
        user_id = auth_response.json()["user"]["user_id"]
        
        # Use token with /api/auth/me
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_response.status_code == 200
        data = me_response.json()
        
        assert data["user_id"] == user_id
        assert data["email"] == test_email
        print(f"✓ Google auth token works with /api/auth/me: {data['username']}")


class TestTokenPersistence:
    """Test token persistence scenarios"""
    
    def test_token_can_be_reused_multiple_times(self):
        """Test that a token can be used multiple times (simulating page refresh)"""
        # Get a token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/guest",
            json={"gender": "male", "browser_locale": "en-US"}
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Use token multiple times (simulating multiple page loads)
        for i in range(3):
            me_response = requests.get(
                f"{BASE_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert me_response.status_code == 200, f"Request {i+1} should succeed"
        
        print("✓ Token can be reused multiple times (simulating page refresh)")
    
    def test_token_expiration_is_in_future(self):
        """Test that token expiration is set in the future"""
        response = requests.post(
            f"{BASE_URL}/api/auth/guest",
            json={"gender": "male", "browser_locale": "en-US"}
        )
        assert response.status_code == 200
        token = response.json()["token"]
        
        payload = jwt.decode(token, options={"verify_signature": False})
        exp_timestamp = payload["exp"]
        current_timestamp = datetime.utcnow().timestamp()
        
        # Token should expire in the future (at least 1 hour from now)
        assert exp_timestamp > current_timestamp, "Token should not be expired"
        time_until_expiry = exp_timestamp - current_timestamp
        assert time_until_expiry > 3600, "Token should be valid for at least 1 hour"
        
        print(f"✓ Token expires in {time_until_expiry/3600:.1f} hours")


class TestAgeVerification:
    """Test age verification endpoint"""
    
    def test_age_verification_requires_auth(self):
        """Test /api/auth/verify-age requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-age",
            json={"confirmed": True}
        )
        assert response.status_code in [401, 403], "Should require auth"
        print("✓ Age verification requires authentication")
    
    def test_age_verification_updates_user(self):
        """Test age verification updates user's age_verified status"""
        # Create guest
        login_response = requests.post(
            f"{BASE_URL}/api/auth/guest",
            json={"gender": "male", "browser_locale": "en-US"}
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Verify age
        verify_response = requests.post(
            f"{BASE_URL}/api/auth/verify-age",
            json={"confirmed": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data["age_verified"] == True
        
        # Check user is now age verified
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_response.status_code == 200
        assert me_response.json()["age_verified"] == True
        
        print("✓ Age verification updates user status correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
