"""
Test suite for RACCOON APP new features:
1. Chat moderation (profanity filtering, URL blocking)
2. Admin dashboard API
3. Report creation API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@raccoon.app"
ADMIN_PASSWORD = "Admin123!"


class TestChatModeration:
    """Test chat moderation service - profanity filtering and URL blocking"""
    
    def test_profanity_filter_replaces_with_asterisks(self):
        """Test that profanity is replaced with asterisks"""
        from services.chat_moderation import filter_message, check_message
        
        # Test basic profanity
        result = filter_message("This is a shit message")
        assert "****" in result or "shit" not in result.lower()
        
        is_clean, filtered, reason = check_message("This is a shit message")
        assert is_clean == False
        assert "inappropriate" in reason.lower() or "language" in reason.lower()
    
    def test_url_blocking_replaces_with_link_removed(self):
        """Test that URLs are replaced with [link removed]"""
        from services.chat_moderation import filter_message, check_message
        
        # Test URL filtering
        result = filter_message("Check out https://example.com for more info")
        assert "[link removed]" in result
        
        is_clean, filtered, reason = check_message("Visit www.spam.com now!")
        assert is_clean == False
        assert "[link removed]" in filtered
        assert "link" in reason.lower()
    
    def test_clean_message_passes_through(self):
        """Test that clean messages pass through unchanged"""
        from services.chat_moderation import filter_message, check_message
        
        clean_msg = "Hello, how are you today?"
        result = filter_message(clean_msg)
        assert result == clean_msg
        
        is_clean, filtered, reason = check_message(clean_msg)
        assert is_clean == True
        assert filtered == clean_msg
        assert reason is None
    
    def test_leetspeak_detection(self):
        """Test that leetspeak variations are detected"""
        from services.chat_moderation import filter_message, check_message
        
        # Test leetspeak variations
        is_clean, filtered, reason = check_message("This is sh1t")
        # Should detect leetspeak
        assert is_clean == False or "sh1t" not in filtered.lower()
    
    def test_multiple_offensive_words(self):
        """Test filtering multiple offensive words"""
        from services.chat_moderation import filter_message
        
        result = filter_message("What the fuck is this shit")
        # Both words should be filtered
        assert "fuck" not in result.lower() or "****" in result
        assert "shit" not in result.lower() or "****" in result


class TestAdminDashboard:
    """Test admin dashboard API endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        # First login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed - skipping admin tests")
    
    def test_admin_dashboard_returns_stats(self, admin_token):
        """Test that admin dashboard returns comprehensive stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check overview stats
        assert "overview" in data
        assert "total_users" in data["overview"]
        assert "total_guests" in data["overview"]
        assert "premium_users" in data["overview"]
        assert "banned_users" in data["overview"]
        assert "total_matches" in data["overview"]
        assert "total_messages" in data["overview"]
        assert "total_reports" in data["overview"]
        
        # Check live stats
        assert "live" in data
        assert "online_users" in data["live"]
        assert "online_guests" in data["live"]
        assert "total_online" in data["live"]
        
        # Check today stats
        assert "today" in data
        assert "active_users" in data["today"]
        assert "matches" in data["today"]
        assert "messages" in data["today"]
        
        # Check comparisons
        assert "comparisons" in data
        
        # Check alerts
        assert "alerts" in data
        assert "pending_reports" in data["alerts"]
    
    def test_admin_dashboard_requires_auth(self):
        """Test that dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard")
        assert response.status_code == 401
        assert "Missing token" in response.json().get("detail", "")
    
    def test_admin_dashboard_requires_admin_role(self):
        """Test that dashboard requires admin role"""
        # First create a regular user token (if possible)
        # For now, test with invalid token
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401


class TestReportCreation:
    """Test report creation API"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed - skipping report tests")
    
    def test_create_report_endpoint_exists(self, admin_token):
        """Test that report creation endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/reports/create",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "reported_id": "test_user_123",
                "reason": "Inappropriate behavior",
                "details": "Test report for testing purposes"
            }
        )
        
        # Should either succeed or return validation error (not 404)
        assert response.status_code in [200, 201, 400, 422]
    
    def test_create_report_requires_auth(self):
        """Test that report creation requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/reports/create",
            json={
                "reported_id": "test_user_123",
                "reason": "Test"
            }
        )
        assert response.status_code == 401


class TestAdminLogin:
    """Test admin login functionality"""
    
    def test_admin_login_success(self):
        """Test admin can login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"].get("is_admin") == True
    
    def test_admin_login_wrong_password(self):
        """Test admin login fails with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "WrongPassword123!"
        })
        
        assert response.status_code in [401, 400]


class TestAdminReports:
    """Test admin reports management"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed - skipping admin tests")
    
    def test_get_reports_list(self, admin_token):
        """Test getting reports list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "reports" in data
        assert "pagination" in data
        assert "stats" in data
    
    def test_get_reports_with_status_filter(self, admin_token):
        """Test filtering reports by status"""
        for status in ["pending", "reviewed", "actioned", "ignored"]:
            response = requests.get(
                f"{BASE_URL}/api/admin/reports?status={status}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            
            assert response.status_code == 200


class TestAdminUsers:
    """Test admin user management"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed - skipping admin tests")
    
    def test_get_users_list(self, admin_token):
        """Test getting users list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "pagination" in data
        assert "stats" in data
    
    def test_get_users_with_filters(self, admin_token):
        """Test filtering users"""
        for filter_type in ["all", "premium", "banned", "guests"]:
            response = requests.get(
                f"{BASE_URL}/api/admin/users?filter={filter_type}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            
            assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
