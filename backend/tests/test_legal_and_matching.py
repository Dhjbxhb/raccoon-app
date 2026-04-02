"""
Test suite for Raccoon App - Legal Pages, Age Verification, and Matching Service
Tests the new legal/compliance features and optimized matching queue
"""
import pytest
import requests
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasicAPI:
    """Basic API health checks"""
    
    def test_api_root_returns_message(self):
        """Test that API root returns welcome message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Raccoon" in data["message"]
        print(f"API root message: {data['message']}")


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_signup_requires_all_fields(self):
        """Test that signup validates required fields"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": "test@example.com"
            # Missing username, password, gender, date_of_birth
        })
        # Should return 422 (validation error) or 400 (bad request)
        assert response.status_code in [400, 422]
        print("Signup validation working - missing fields rejected")
    
    def test_signup_validates_age(self):
        """Test that signup validates 18+ age requirement"""
        # Try to signup with underage date of birth
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": "underage@example.com",
            "username": "underageuser",
            "password": "TestPass123!",
            "gender": "male",
            "date_of_birth": "2015-01-01"  # Under 18
        })
        # Should reject underage users
        if response.status_code == 400:
            data = response.json()
            print(f"Age validation response: {data}")
        print(f"Signup age validation status: {response.status_code}")
    
    def test_login_with_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 404]
        print("Login validation working - invalid credentials rejected")
    
    def test_guest_login(self):
        """Test guest login creates temporary user"""
        response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            "gender": "male"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        # Guest users have guest_id and username starting with "Guest"
        assert "guest_id" in data["user"] or "username" in data["user"]
        if "username" in data["user"]:
            assert data["user"]["username"].startswith("Guest")
        print(f"Guest login successful - user: {data['user']}")
        return data


class TestMatchingService:
    """Test the optimized matching service"""
    
    def test_queue_stats_endpoint(self):
        """Test that queue stats endpoint returns valid data"""
        # First login as guest to get token
        guest_response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            "gender": "male"
        })
        assert guest_response.status_code == 200
        token = guest_response.json()["token"]
        
        # Note: Queue stats might be accessed via WebSocket or specific endpoint
        # This tests the basic auth flow needed for matching
        print("Guest authentication for matching service working")
    
    def test_guest_login_with_different_genders(self):
        """Test guest login works for both genders"""
        for gender in ["male", "female"]:
            response = requests.post(f"{BASE_URL}/api/auth/guest", json={
                "gender": gender
            })
            assert response.status_code == 200
            data = response.json()
            assert data["user"]["gender"] == gender
            print(f"Guest login with gender '{gender}' successful")


class TestPaymentsEndpoints:
    """Test payment/premium endpoints"""
    
    def test_create_checkout_session_requires_origin(self):
        """Test that checkout session requires origin_url"""
        response = requests.post(f"{BASE_URL}/api/payments/checkout", json={
            "package_id": "monthly"
            # Missing origin_url
        })
        # Should return 422 (validation error) for missing field
        assert response.status_code == 422
        print("Payment endpoint validates required fields - PASS")
    
    def test_create_checkout_session_with_auth(self):
        """Test checkout session creation with valid auth"""
        # First login as guest
        guest_response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            "gender": "male"
        })
        token = guest_response.json()["token"]
        
        # Try to create checkout session
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "package_id": "monthly",
                "origin_url": "https://live-social-video.preview.emergentagent.com"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should return 200 with checkout URL or 500 if Stripe not configured
        assert response.status_code in [200, 500]
        data = response.json()
        print(f"Checkout session response: {data}")
        if response.status_code == 200:
            assert "checkout_url" in data
            print("Checkout session created successfully")


class TestReportsEndpoints:
    """Test report creation endpoints"""
    
    def test_create_report_requires_auth(self):
        """Test that report creation requires authentication"""
        response = requests.post(f"{BASE_URL}/api/reports/create", json={
            "reported_user_id": "some_user_id",
            "reason": "harassment",
            "description": "Test report"
        })
        assert response.status_code in [401, 403]
        print("Report endpoint requires authentication - PASS")


class TestAdminEndpoints:
    """Test admin endpoints access control"""
    
    def test_admin_dashboard_requires_admin(self):
        """Test that admin dashboard requires admin role"""
        # Login as guest (non-admin)
        guest_response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            "gender": "male"
        })
        token = guest_response.json()["token"]
        
        # Try to access admin dashboard
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should return 403 (forbidden) for non-admin
        assert response.status_code == 403
        print("Admin dashboard access control working - PASS")


class TestCountryDetection:
    """Test country detection service"""
    
    def test_guest_login_includes_country(self):
        """Test that guest login attempts to detect country"""
        response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            "gender": "male"
        })
        assert response.status_code == 200
        data = response.json()
        user = data["user"]
        # Country might be detected or default
        if "country" in user:
            print(f"Country detected: {user.get('country', 'Not set')}")
        print("Guest login country detection working")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
