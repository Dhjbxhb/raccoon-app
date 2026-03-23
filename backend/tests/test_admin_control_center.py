"""
RACCOON APP - Admin Control Center API Tests
Tests for comprehensive admin dashboard, user management, reports, premium, and sessions
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://realtime-raccoon.preview.emergentagent.com')


class TestAdminDashboard:
    """Admin Dashboard Stats Tests - Live stats with comparisons"""
    
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
    
    def test_dashboard_returns_overview_stats(self):
        """Test dashboard returns all overview stats: total users, guests, premium, banned, matches, messages, reports"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Verify overview section exists with all required fields
        assert 'overview' in data, "Missing 'overview' section"
        overview = data['overview']
        required_overview_fields = ['total_users', 'total_guests', 'premium_users', 'banned_users', 'total_matches', 'total_messages', 'total_reports']
        for field in required_overview_fields:
            assert field in overview, f"Missing overview field: {field}"
            assert isinstance(overview[field], int), f"Field {field} should be integer"
    
    def test_dashboard_returns_live_stats(self):
        """Test dashboard returns live online user count"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify live section exists
        assert 'live' in data, "Missing 'live' section"
        live = data['live']
        assert 'online_users' in live
        assert 'online_guests' in live
        assert 'total_online' in live
    
    def test_dashboard_returns_today_vs_yesterday_comparisons(self):
        """Test dashboard returns today vs yesterday comparisons with percentage changes"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify today section
        assert 'today' in data, "Missing 'today' section"
        today = data['today']
        assert 'active_users' in today
        assert 'matches' in today
        assert 'messages' in today
        assert 'new_signups' in today
        
        # Verify yesterday section
        assert 'yesterday' in data, "Missing 'yesterday' section"
        
        # Verify comparisons section with percentage changes
        assert 'comparisons' in data, "Missing 'comparisons' section"
        comparisons = data['comparisons']
        assert 'active_users_change' in comparisons
        assert 'matches_change' in comparisons
        assert 'messages_change' in comparisons
        assert 'signups_change' in comparisons
    
    def test_dashboard_returns_alerts(self):
        """Test dashboard returns alerts for pending reports and expiring premium"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'alerts' in data, "Missing 'alerts' section"
        alerts = data['alerts']
        assert 'pending_reports' in alerts
        assert 'premium_expiring_soon' in alerts


class TestAdminUserManagement:
    """Admin User Management Tests - Search, filter, user details, actions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for tests"""
        requests.post(f"{BASE_URL}/api/admin/setup-admin")
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@raccoon.app",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        self.admin_token = response.json()['token']
    
    def test_users_list_with_pagination(self):
        """Test GET /api/admin/users returns user list with pagination"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'users' in data
        assert 'pagination' in data
        assert 'stats' in data
        
        pagination = data['pagination']
        assert 'page' in pagination
        assert 'limit' in pagination
        assert 'total' in pagination
        assert 'pages' in pagination
    
    def test_users_filter_by_premium(self):
        """Test filtering users by premium status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users?filter=premium",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # All returned users should be premium
        for user in data['users']:
            assert user.get('premium_status') == True, f"Non-premium user in premium filter: {user}"
    
    def test_users_filter_by_banned(self):
        """Test filtering users by banned status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users?filter=banned",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # All returned users should be banned
        for user in data['users']:
            assert user.get('is_banned') == True, f"Non-banned user in banned filter: {user}"
    
    def test_users_search(self):
        """Test searching users by name/email"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users?search=admin",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should find admin user
        assert len(data['users']) > 0 or data['pagination']['total'] >= 0
    
    def test_user_details(self):
        """Test GET /api/admin/users/{user_id} returns detailed user profile"""
        # First get admin user_id
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@raccoon.app",
            "password": "Admin123!"
        })
        admin_user_id = response.json()['user']['user_id']
        
        # Get user details
        response = requests.get(
            f"{BASE_URL}/api/admin/users/{admin_user_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'user' in data
        assert 'stats' in data
        
        stats = data['stats']
        assert 'total_matches' in stats
        assert 'total_messages' in stats
        assert 'reports_received' in stats
        assert 'days_on_platform' in stats


class TestAdminBanSystem:
    """Admin Ban System Tests - Ban/unban with duration options"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token and test user"""
        requests.post(f"{BASE_URL}/api/admin/setup-admin")
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@raccoon.app",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        self.admin_token = response.json()['token']
        
        # Create a test user to ban
        unique_email = f"test_ban_{uuid.uuid4().hex[:8]}@test.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "username": f"TestBan{uuid.uuid4().hex[:6]}",
            "password": "TestPass123!",
            "gender": "male",
            "date_of_birth": "1990-01-01"
        })
        if signup_response.status_code == 200:
            self.test_user_id = signup_response.json()['user']['user_id']
        else:
            self.test_user_id = None
    
    def test_ban_user_permanent(self):
        """Test POST /api/admin/users/{user_id}/ban with permanent ban"""
        if not self.test_user_id:
            pytest.skip("Test user creation failed")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{self.test_user_id}/ban",
            headers={
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "is_banned": True,
                "reason": "Test permanent ban"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'banned' in data['message'].lower()
    
    def test_ban_user_with_duration(self):
        """Test POST /api/admin/users/{user_id}/ban with duration (24 hours)"""
        if not self.test_user_id:
            pytest.skip("Test user creation failed")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{self.test_user_id}/ban",
            headers={
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "is_banned": True,
                "duration_hours": 24,
                "reason": "Test 24h ban"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert '24 hours' in data['message']
    
    def test_unban_user(self):
        """Test unbanning a user"""
        if not self.test_user_id:
            pytest.skip("Test user creation failed")
        
        # First ban the user
        requests.post(
            f"{BASE_URL}/api/admin/users/{self.test_user_id}/ban",
            headers={
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            },
            json={"is_banned": True}
        )
        
        # Then unban
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{self.test_user_id}/ban",
            headers={
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            },
            json={"is_banned": False}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'unbanned' in data['message'].lower()


class TestAdminPremiumManagement:
    """Admin Premium Management Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token and test user"""
        requests.post(f"{BASE_URL}/api/admin/setup-admin")
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@raccoon.app",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        self.admin_token = response.json()['token']
        
        # Create a test user for premium tests
        unique_email = f"test_premium_{uuid.uuid4().hex[:8]}@test.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "username": f"TestPrem{uuid.uuid4().hex[:6]}",
            "password": "TestPass123!",
            "gender": "female",
            "date_of_birth": "1995-05-15"
        })
        if signup_response.status_code == 200:
            self.test_user_id = signup_response.json()['user']['user_id']
        else:
            self.test_user_id = None
    
    def test_get_premium_users(self):
        """Test GET /api/admin/premium returns premium users with expiry dates"""
        response = requests.get(
            f"{BASE_URL}/api/admin/premium",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'users' in data
        assert 'pagination' in data
        assert 'stats' in data
        
        stats = data['stats']
        assert 'active' in stats
        assert 'expiring_soon' in stats
    
    def test_grant_premium_with_duration(self):
        """Test granting premium with duration"""
        if not self.test_user_id:
            pytest.skip("Test user creation failed")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{self.test_user_id}/premium",
            headers={
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "premium": True,
                "duration_days": 30
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'granted' in data['message'].lower()
        assert '30 days' in data['message']
    
    def test_remove_premium(self):
        """Test removing premium from user"""
        if not self.test_user_id:
            pytest.skip("Test user creation failed")
        
        # First grant premium
        requests.post(
            f"{BASE_URL}/api/admin/users/{self.test_user_id}/premium",
            headers={
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            },
            json={"premium": True}
        )
        
        # Then remove
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{self.test_user_id}/premium",
            headers={
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            },
            json={"premium": False}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'removed' in data['message'].lower()


class TestAdminReports:
    """Admin Reports Management Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token"""
        requests.post(f"{BASE_URL}/api/admin/setup-admin")
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@raccoon.app",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        self.admin_token = response.json()['token']
    
    def test_get_reports_with_filters(self):
        """Test GET /api/admin/reports with status filters"""
        # Test pending filter
        response = requests.get(
            f"{BASE_URL}/api/admin/reports?status=pending",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'reports' in data
        assert 'pagination' in data
        assert 'stats' in data
        
        stats = data['stats']
        assert 'pending' in stats
        assert 'reviewed' in stats
        assert 'actioned' in stats
    
    def test_get_reports_all_statuses(self):
        """Test getting reports with different status filters"""
        for status in ['pending', 'reviewed', 'actioned', 'ignored']:
            response = requests.get(
                f"{BASE_URL}/api/admin/reports?status={status}",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            assert response.status_code == 200, f"Failed for status: {status}"


class TestAdminSessions:
    """Admin Sessions/Match History Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token"""
        requests.post(f"{BASE_URL}/api/admin/setup-admin")
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@raccoon.app",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        self.admin_token = response.json()['token']
    
    def test_get_matches(self):
        """Test GET /api/admin/matches returns match history"""
        response = requests.get(
            f"{BASE_URL}/api/admin/matches",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'matches' in data
        assert 'pagination' in data


class TestReportCreation:
    """Report Creation Tests - Report button in chat"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup user tokens for report tests"""
        # Create reporter (guest)
        response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            "gender": "male"
        })
        assert response.status_code == 200
        self.reporter_token = response.json()['token']
        self.reporter_id = response.json()['user']['guest_id']
        
        # Create reported user (guest)
        response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            "gender": "female"
        })
        assert response.status_code == 200
        self.reported_id = response.json()['user']['guest_id']
    
    def test_create_report(self):
        """Test POST /api/reports/create creates a report"""
        response = requests.post(
            f"{BASE_URL}/api/reports/create",
            headers={
                "Authorization": f"Bearer {self.reporter_token}",
                "Content-Type": "application/json"
            },
            json={
                "reported_id": self.reported_id,
                "reason": "Inappropriate behavior",
                "details": "Test report details",
                "session_id": "test-session-123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'report_id' in data
        assert 'message' in data
        assert 'submitted' in data['message'].lower()


class TestAdminAccessControl:
    """Admin Access Control Tests - Non-admins cannot access"""
    
    def test_guest_cannot_access_dashboard(self):
        """Test guest users cannot access admin dashboard"""
        response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            "gender": "male"
        })
        guest_token = response.json()['token']
        
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {guest_token}"}
        )
        assert response.status_code == 403
        assert "Admin access required" in response.json().get('detail', '')
    
    def test_no_token_cannot_access_dashboard(self):
        """Test requests without token cannot access admin dashboard"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard")
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
