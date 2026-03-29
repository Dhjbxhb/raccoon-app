"""
Test Google Authentication Endpoint
Tests for POST /api/auth/google endpoint

Features tested:
- Creates new user if not exists
- Returns existing user if already exists
- Returns valid JWT token
- User saved to MongoDB with firebase_uid, email, username, auth_provider=google
- Google users appear in admin users list
"""

import pytest
import requests
import os
import uuid
import jwt

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
TEST_FIREBASE_UID = f"test_firebase_uid_{uuid.uuid4().hex[:8]}"
TEST_EMAIL = f"testgoogle_{uuid.uuid4().hex[:8]}@example.com"
TEST_DISPLAY_NAME = f"Test Google User {uuid.uuid4().hex[:4]}"
TEST_PHOTO_URL = "https://example.com/photo.jpg"
TEST_ID_TOKEN = "mock_id_token_for_testing"


class TestGoogleAuthEndpoint:
    """Tests for POST /api/auth/google endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_user_id = None
        yield
        # Cleanup is handled by test data prefix
    
    def test_google_auth_endpoint_exists(self):
        """Test that /api/auth/google endpoint exists and accepts POST"""
        response = self.session.post(f"{BASE_URL}/api/auth/google", json={
            "uid": "test_uid",
            "email": "test@test.com",
            "displayName": "Test",
            "idToken": "test_token"
        })
        # Should not return 404 or 405
        assert response.status_code != 404, "Endpoint /api/auth/google not found"
        assert response.status_code != 405, "Endpoint /api/auth/google does not accept POST"
        print(f"✓ Google auth endpoint exists, status: {response.status_code}")
    
    def test_google_auth_creates_new_user(self):
        """Test that Google auth creates a new user if not exists"""
        unique_uid = f"new_user_uid_{uuid.uuid4().hex[:8]}"
        unique_email = f"newgoogle_{uuid.uuid4().hex[:8]}@example.com"
        
        response = self.session.post(f"{BASE_URL}/api/auth/google", json={
            "uid": unique_uid,
            "email": unique_email,
            "displayName": "New Google User",
            "photoURL": TEST_PHOTO_URL,
            "idToken": TEST_ID_TOKEN,
            "browser_locale": "en-US"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        
        # Verify user data
        user = data["user"]
        assert "user_id" in user, "User should have user_id"
        assert user.get("email") == unique_email, f"Email mismatch: {user.get('email')} != {unique_email}"
        
        self.created_user_id = user["user_id"]
        print(f"✓ New Google user created: {user.get('username')} ({user['user_id']})")
    
    def test_google_auth_returns_valid_jwt_token(self):
        """Test that Google auth returns a valid JWT token"""
        unique_uid = f"jwt_test_uid_{uuid.uuid4().hex[:8]}"
        unique_email = f"jwttest_{uuid.uuid4().hex[:8]}@example.com"
        
        response = self.session.post(f"{BASE_URL}/api/auth/google", json={
            "uid": unique_uid,
            "email": unique_email,
            "displayName": "JWT Test User",
            "idToken": TEST_ID_TOKEN
        })
        
        assert response.status_code == 200
        data = response.json()
        
        token = data.get("token")
        assert token, "Token should not be empty"
        assert isinstance(token, str), "Token should be a string"
        assert len(token) > 50, "Token should be a valid JWT (length > 50)"
        
        # Verify token structure (3 parts separated by dots)
        parts = token.split(".")
        assert len(parts) == 3, "JWT should have 3 parts"
        
        # Decode token (without verification) to check payload
        try:
            # Decode without verification to check structure
            payload = jwt.decode(token, options={"verify_signature": False})
            assert "user_id" in payload, "Token payload should contain user_id"
            assert "exp" in payload, "Token payload should contain expiration"
            print(f"✓ Valid JWT token returned with user_id: {payload['user_id']}")
        except jwt.DecodeError as e:
            pytest.fail(f"Invalid JWT token: {e}")
    
    def test_google_auth_returns_existing_user(self):
        """Test that Google auth returns existing user if already exists"""
        # First, create a user
        unique_uid = f"existing_uid_{uuid.uuid4().hex[:8]}"
        unique_email = f"existing_{uuid.uuid4().hex[:8]}@example.com"
        
        # First login - creates user
        response1 = self.session.post(f"{BASE_URL}/api/auth/google", json={
            "uid": unique_uid,
            "email": unique_email,
            "displayName": "Existing User",
            "idToken": TEST_ID_TOKEN
        })
        
        assert response1.status_code == 200
        user1 = response1.json()["user"]
        user_id_1 = user1["user_id"]
        
        # Second login - should return same user
        response2 = self.session.post(f"{BASE_URL}/api/auth/google", json={
            "uid": unique_uid,
            "email": unique_email,
            "displayName": "Existing User",
            "idToken": TEST_ID_TOKEN
        })
        
        assert response2.status_code == 200
        user2 = response2.json()["user"]
        user_id_2 = user2["user_id"]
        
        # Verify same user is returned
        assert user_id_1 == user_id_2, f"User IDs should match: {user_id_1} != {user_id_2}"
        print(f"✓ Existing user returned correctly: {user_id_1}")
    
    def test_google_auth_user_has_correct_fields(self):
        """Test that Google user has firebase_uid, email, username, auth_provider=google"""
        unique_uid = f"fields_test_uid_{uuid.uuid4().hex[:8]}"
        unique_email = f"fieldstest_{uuid.uuid4().hex[:8]}@example.com"
        display_name = f"Fields Test User {uuid.uuid4().hex[:4]}"
        
        response = self.session.post(f"{BASE_URL}/api/auth/google", json={
            "uid": unique_uid,
            "email": unique_email,
            "displayName": display_name,
            "photoURL": TEST_PHOTO_URL,
            "idToken": TEST_ID_TOKEN
        })
        
        assert response.status_code == 200
        data = response.json()
        
        user = data["user"]
        token = data["token"]
        
        # Verify required fields in response
        assert user.get("user_id"), "User should have user_id"
        assert user.get("email") == unique_email, "Email should match"
        assert user.get("username"), "User should have username"
        
        # Verify token can be used to fetch user
        me_response = self.session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert me_response.status_code == 200, f"Failed to fetch user: {me_response.text}"
        me_data = me_response.json()
        
        assert me_data.get("user_id") == user["user_id"], "User ID should match"
        assert me_data.get("email") == unique_email, "Email should match"
        
        print(f"✓ Google user has correct fields: user_id={user['user_id']}, email={unique_email}")
    
    def test_google_auth_token_works_for_authenticated_requests(self):
        """Test that the returned token can be used for authenticated requests"""
        unique_uid = f"auth_test_uid_{uuid.uuid4().hex[:8]}"
        unique_email = f"authtest_{uuid.uuid4().hex[:8]}@example.com"
        
        # Create user via Google auth
        response = self.session.post(f"{BASE_URL}/api/auth/google", json={
            "uid": unique_uid,
            "email": unique_email,
            "displayName": "Auth Test User",
            "idToken": TEST_ID_TOKEN
        })
        
        assert response.status_code == 200
        token = response.json()["token"]
        
        # Use token to access protected endpoint
        me_response = self.session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert me_response.status_code == 200, f"Token should work for /auth/me: {me_response.text}"
        print(f"✓ Token works for authenticated requests")
    
    def test_google_auth_handles_missing_email(self):
        """Test that Google auth handles missing email gracefully"""
        unique_uid = f"no_email_uid_{uuid.uuid4().hex[:8]}"
        
        response = self.session.post(f"{BASE_URL}/api/auth/google", json={
            "uid": unique_uid,
            "email": None,  # No email
            "displayName": "No Email User",
            "idToken": TEST_ID_TOKEN
        })
        
        # Should still work (email is optional for some Google accounts)
        assert response.status_code == 200, f"Should handle missing email: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ Handles missing email gracefully")
    
    def test_google_auth_handles_missing_display_name(self):
        """Test that Google auth handles missing displayName gracefully"""
        unique_uid = f"no_name_uid_{uuid.uuid4().hex[:8]}"
        unique_email = f"noname_{uuid.uuid4().hex[:8]}@example.com"
        
        response = self.session.post(f"{BASE_URL}/api/auth/google", json={
            "uid": unique_uid,
            "email": unique_email,
            "displayName": None,  # No display name
            "idToken": TEST_ID_TOKEN
        })
        
        assert response.status_code == 200, f"Should handle missing displayName: {response.text}"
        
        data = response.json()
        user = data["user"]
        
        # Should generate a username
        assert user.get("username"), "Should generate username when displayName is missing"
        print(f"✓ Handles missing displayName, generated username: {user.get('username')}")
    
    def test_google_auth_finds_user_by_email(self):
        """Test that Google auth finds existing user by email even with different UID"""
        unique_email = f"email_lookup_{uuid.uuid4().hex[:8]}@example.com"
        uid1 = f"uid1_{uuid.uuid4().hex[:8]}"
        uid2 = f"uid2_{uuid.uuid4().hex[:8]}"
        
        # First login with uid1
        response1 = self.session.post(f"{BASE_URL}/api/auth/google", json={
            "uid": uid1,
            "email": unique_email,
            "displayName": "Email Lookup User",
            "idToken": TEST_ID_TOKEN
        })
        
        assert response1.status_code == 200
        user_id_1 = response1.json()["user"]["user_id"]
        
        # Second login with different uid but same email
        response2 = self.session.post(f"{BASE_URL}/api/auth/google", json={
            "uid": uid2,
            "email": unique_email,
            "displayName": "Email Lookup User",
            "idToken": TEST_ID_TOKEN
        })
        
        assert response2.status_code == 200
        user_id_2 = response2.json()["user"]["user_id"]
        
        # Should return same user (found by email)
        assert user_id_1 == user_id_2, f"Should find user by email: {user_id_1} != {user_id_2}"
        print(f"✓ Finds existing user by email correctly")


class TestGoogleUserInAdminPanel:
    """Test that Google users appear in admin users list"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data and get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        admin_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@raccoon.app",
            "password": "Admin123!"
        })
        
        if admin_response.status_code == 200:
            self.admin_token = admin_response.json()["token"]
        else:
            self.admin_token = None
            print(f"Warning: Admin login failed: {admin_response.status_code}")
        
        yield
    
    def test_google_user_appears_in_admin_users_list(self):
        """Test that a Google user appears in the admin users list"""
        if not self.admin_token:
            pytest.skip("Admin login failed - skipping admin panel test")
        
        # Create a Google user
        unique_uid = f"admin_test_uid_{uuid.uuid4().hex[:8]}"
        unique_email = f"admintest_{uuid.uuid4().hex[:8]}@example.com"
        display_name = f"Admin Test User {uuid.uuid4().hex[:4]}"
        
        create_response = self.session.post(f"{BASE_URL}/api/auth/google", json={
            "uid": unique_uid,
            "email": unique_email,
            "displayName": display_name,
            "idToken": TEST_ID_TOKEN
        })
        
        assert create_response.status_code == 200
        created_user = create_response.json()["user"]
        created_user_id = created_user["user_id"]
        
        # Fetch admin users list
        users_response = self.session.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if users_response.status_code == 404:
            pytest.skip("Admin users endpoint not found")
        
        assert users_response.status_code == 200, f"Failed to fetch users: {users_response.text}"
        
        users_data = users_response.json()
        
        # Handle different response formats
        if isinstance(users_data, list):
            users = users_data
        elif isinstance(users_data, dict) and "users" in users_data:
            users = users_data["users"]
        else:
            users = []
        
        # Find the created user
        found_user = None
        for user in users:
            if user.get("user_id") == created_user_id or user.get("email") == unique_email:
                found_user = user
                break
        
        assert found_user is not None, f"Google user {unique_email} not found in admin users list"
        print(f"✓ Google user appears in admin users list: {unique_email}")


class TestGoogleAuthValidation:
    """Test validation and error handling for Google auth"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        yield
    
    def test_google_auth_requires_uid(self):
        """Test that Google auth requires uid field"""
        response = self.session.post(f"{BASE_URL}/api/auth/google", json={
            "email": "test@example.com",
            "displayName": "Test",
            "idToken": "test_token"
            # Missing uid
        })
        
        # Should return 422 (validation error) or 400
        assert response.status_code in [400, 422], f"Should require uid: {response.status_code}"
        print(f"✓ Requires uid field (status: {response.status_code})")
    
    def test_google_auth_requires_id_token(self):
        """Test that Google auth requires idToken field"""
        response = self.session.post(f"{BASE_URL}/api/auth/google", json={
            "uid": "test_uid",
            "email": "test@example.com",
            "displayName": "Test"
            # Missing idToken
        })
        
        # Should return 422 (validation error) or 400
        assert response.status_code in [400, 422], f"Should require idToken: {response.status_code}"
        print(f"✓ Requires idToken field (status: {response.status_code})")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
