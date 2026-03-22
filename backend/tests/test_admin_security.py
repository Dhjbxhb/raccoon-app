"""
Test Admin Panel Security and Stats
- Admin access control (only admin@raccoon.app can access /admin endpoints)
- Admin stats endpoint (total matches, messages today, active sessions, guest users)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@raccoon.app"
ADMIN_PASSWORD = "Admin123!"

# Test user credentials (non-admin)
TEST_USER_EMAIL = "testuser_security@test.com"
TEST_USER_PASSWORD = "TestPass123!"
TEST_USER_USERNAME = "TEST_SecurityUser"


class TestAdminSecurity:
    """Test admin panel security - only admin users can access admin endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token by logging in as admin@raccoon.app"""
        # First ensure admin is set up
        setup_response = requests.post(f"{BASE_URL}/api/admin/setup-admin")
        print(f"Admin setup response: {setup_response.status_code} - {setup_response.text}")
        
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"Admin login successful: {data.get('user', {}).get('username')}")
            return data.get("token")
        else:
            print(f"Admin login failed: {response.status_code} - {response.text}")
            pytest.skip("Admin login failed - admin user may not exist")
    
    @pytest.fixture(scope="class")
    def non_admin_token(self):
        """Create a non-admin user and get their token"""
        # Try to signup a test user
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": TEST_USER_EMAIL,
            "username": TEST_USER_USERNAME,
            "password": TEST_USER_PASSWORD,
            "gender": "male",
            "date_of_birth": "1990-01-01"
        })
        
        if signup_response.status_code == 200:
            data = signup_response.json()
            print(f"Test user created: {data.get('user', {}).get('username')}")
            return data.get("token")
        elif signup_response.status_code == 400 and "already" in signup_response.text.lower():
            # User exists, try login
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            })
            if login_response.status_code == 200:
                return login_response.json().get("token")
        
        # Fallback to guest token
        guest_response = requests.post(f"{BASE_URL}/api/auth/guest", json={"gender": "male"})
        if guest_response.status_code == 200:
            print("Using guest token for non-admin tests")
            return guest_response.json().get("token")
        
        pytest.skip("Could not create non-admin user")
    
    def test_admin_users_endpoint_with_admin_token(self, admin_token):
        """Admin should be able to access /api/admin/users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "users" in data, "Response should contain 'users' key"
        assert "stats" in data, "Response should contain 'stats' key"
        
        # Verify stats structure
        stats = data["stats"]
        assert "total" in stats, "Stats should have 'total'"
        assert "premium" in stats, "Stats should have 'premium'"
        assert "banned" in stats, "Stats should have 'banned'"
        assert "active" in stats, "Stats should have 'active'"
        
        print(f"Admin users endpoint - Total users: {stats['total']}, Premium: {stats['premium']}")
    
    def test_admin_users_endpoint_without_token(self):
        """Accessing /api/admin/users without token should return 401"""
        response = requests.get(f"{BASE_URL}/api/admin/users")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("Correctly denied access without token")
    
    def test_admin_users_endpoint_with_non_admin_token(self, non_admin_token):
        """Non-admin user should get 403 when accessing /api/admin/users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {non_admin_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "admin" in data.get("detail", "").lower() or "access" in data.get("detail", "").lower(), \
            "Error message should mention admin access"
        
        print(f"Correctly denied non-admin access: {data.get('detail')}")
    
    def test_admin_stats_endpoint_with_admin_token(self, admin_token):
        """Admin should be able to access /api/admin/stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify all required stats are present
        required_stats = [
            "total_users", "total_guests", "premium_users", "banned_users",
            "total_matches", "messages_today", "active_sessions"
        ]
        
        for stat in required_stats:
            assert stat in data, f"Stats should contain '{stat}'"
            assert isinstance(data[stat], int), f"'{stat}' should be an integer"
        
        print(f"Admin stats: Users={data['total_users']}, Guests={data['total_guests']}, "
              f"Matches={data['total_matches']}, Messages Today={data['messages_today']}, "
              f"Active Sessions={data['active_sessions']}")
    
    def test_admin_stats_endpoint_with_non_admin_token(self, non_admin_token):
        """Non-admin user should get 403 when accessing /api/admin/stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {non_admin_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Correctly denied non-admin access to stats")
    
    def test_admin_ban_endpoint_with_non_admin_token(self, non_admin_token):
        """Non-admin user should get 403 when trying to ban a user"""
        response = requests.post(
            f"{BASE_URL}/api/admin/users/fake-user-id/ban",
            headers={"Authorization": f"Bearer {non_admin_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Correctly denied non-admin ban attempt")
    
    def test_admin_premium_endpoint_with_non_admin_token(self, non_admin_token):
        """Non-admin user should get 403 when trying to update premium status"""
        response = requests.post(
            f"{BASE_URL}/api/admin/users/fake-user-id/premium",
            headers={"Authorization": f"Bearer {non_admin_token}"},
            json={"premium": True}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Correctly denied non-admin premium update attempt")


class TestAdminLogin:
    """Test admin login flow"""
    
    def test_admin_login_success(self):
        """Admin user should be able to login with correct credentials"""
        # First ensure admin is set up
        requests.post(f"{BASE_URL}/api/admin/setup-admin")
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        
        user = data["user"]
        assert user.get("email") == ADMIN_EMAIL, "Email should match"
        assert user.get("is_admin") == True, "User should be admin"
        assert user.get("premium_status") == True, "Admin should have premium status"
        
        print(f"Admin login successful: {user.get('username')} (admin={user.get('is_admin')}, premium={user.get('premium_status')})")
    
    def test_admin_login_wrong_password(self):
        """Admin login with wrong password should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "WrongPassword123!"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("Correctly rejected wrong password")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
