"""
RACCOON APP - Final Production Validation Backend Tests (Task 41/41)
Tests all critical API endpoints for production readiness
"""

import pytest
import requests
import os
import random

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-social-31.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = f"backendtest{random.randint(10000, 99999)}@test.com"
TEST_PASSWORD = "BackendTest123!"
TEST_USERNAME = f"BackendTest{random.randint(10000, 99999)}"


class TestHealthAndBasicEndpoints:
    """Test health check and basic API endpoints"""
    
    def test_health_endpoint(self):
        """Test API health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get('status') == 'healthy'
        print("✅ Health endpoint working")
    
    def test_payment_plans_endpoint(self):
        """Test payment plans endpoint (public)"""
        response = requests.get(f"{BASE_URL}/api/payments/plans")
        assert response.status_code == 200
        data = response.json()
        assert 'plans' in data
        assert len(data['plans']) > 0
        print(f"✅ Payment plans endpoint working - {len(data['plans'])} plans available")


class TestAuthenticationFlow:
    """Test authentication endpoints"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        """Create a test user for auth tests"""
        return {
            'email': TEST_EMAIL,
            'password': TEST_PASSWORD,
            'username': TEST_USERNAME
        }
    
    def test_signup_endpoint(self, test_user):
        """Test user signup"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            'email': test_user['email'],
            'username': test_user['username'],
            'password': test_user['password'],
            'gender': 'male',
            'date_of_birth': '2000-01-01',
            'terms_accepted': True,
            'privacy_accepted': True
        })
        
        # Should succeed or fail with "already registered"
        if response.status_code == 200:
            data = response.json()
            assert 'token' in data
            assert 'user' in data
            assert data['user']['email'] == test_user['email']
            print(f"✅ Signup successful for {test_user['email']}")
        elif response.status_code == 400:
            # User might already exist
            data = response.json()
            assert 'already registered' in data.get('detail', '').lower() or 'already taken' in data.get('detail', '').lower()
            print(f"⚠️ User already exists: {test_user['email']}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_signup_requires_terms(self):
        """Test that signup requires terms acceptance"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            'email': f"noterms{random.randint(10000, 99999)}@test.com",
            'username': f"NoTerms{random.randint(10000, 99999)}",
            'password': 'TestPass123!',
            'gender': 'male',
            'date_of_birth': '2000-01-01',
            'terms_accepted': False
        })
        assert response.status_code == 400
        data = response.json()
        assert 'terms' in data.get('detail', '').lower()
        print("✅ Terms acceptance validation working")
    
    def test_login_endpoint(self, test_user):
        """Test user login"""
        # First ensure user exists
        requests.post(f"{BASE_URL}/api/auth/signup", json={
            'email': test_user['email'],
            'username': test_user['username'],
            'password': test_user['password'],
            'gender': 'male',
            'date_of_birth': '2000-01-01',
            'terms_accepted': True
        })
        
        # Now test login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            'email': test_user['email'],
            'password': test_user['password']
        })
        assert response.status_code == 200
        data = response.json()
        assert 'token' in data
        assert 'user' in data
        print(f"✅ Login successful for {test_user['email']}")
        return data['token']
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            'email': 'nonexistent@test.com',
            'password': 'wrongpassword'
        })
        assert response.status_code == 401
        print("✅ Invalid credentials properly rejected")
    
    def test_guest_login(self):
        """Test guest login"""
        response = requests.post(f"{BASE_URL}/api/auth/guest", json={
            'gender': 'male'
        })
        assert response.status_code == 200
        data = response.json()
        assert 'token' in data
        assert 'user' in data
        assert 'Guest' in data['user']['username']
        print(f"✅ Guest login successful: {data['user']['username']}")
        return data['token']


class TestAgeVerification:
    """Test age verification endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        # Create a new user
        email = f"ageverify{random.randint(10000, 99999)}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            'email': email,
            'username': f"AgeVerify{random.randint(10000, 99999)}",
            'password': 'TestPass123!',
            'gender': 'male',
            'date_of_birth': '2000-01-01',
            'terms_accepted': True
        })
        if response.status_code == 200:
            return response.json()['token']
        # If user exists, login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            'email': email,
            'password': 'TestPass123!'
        })
        return response.json()['token']
    
    def test_age_verification(self, auth_token):
        """Test age verification endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-age",
            json={'confirmed': True},
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        assert data.get('age_verified') == True
        print("✅ Age verification endpoint working")
    
    def test_age_verification_requires_confirmation(self, auth_token):
        """Test that age verification requires confirmation"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-age",
            json={'confirmed': False},
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        assert response.status_code == 400
        print("✅ Age verification requires confirmation")


class TestProtectedEndpoints:
    """Test protected endpoints require authentication"""
    
    def test_me_endpoint_requires_auth(self):
        """Test /auth/me requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✅ /auth/me properly requires authentication")
    
    def test_premium_status_requires_auth(self):
        """Test premium status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/payments/premium-status")
        assert response.status_code == 401
        print("✅ Premium status properly requires authentication")
    
    def test_admin_dashboard_requires_admin(self):
        """Test admin dashboard requires admin role"""
        # First get a regular user token
        response = requests.post(f"{BASE_URL}/api/auth/guest", json={'gender': 'male'})
        token = response.json()['token']
        
        # Try to access admin dashboard
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 403
        print("✅ Admin dashboard properly requires admin role")


class TestPaymentEndpoints:
    """Test payment-related endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/guest", json={'gender': 'male'})
        return response.json()['token']
    
    def test_get_plans(self):
        """Test getting subscription plans"""
        response = requests.get(f"{BASE_URL}/api/payments/plans")
        assert response.status_code == 200
        data = response.json()
        assert 'plans' in data
        
        # Verify plan structure
        for plan in data['plans']:
            assert 'plan_id' in plan
            assert 'display_name' in plan
            assert 'price' in plan
            assert 'features' in plan
        
        print(f"✅ Plans endpoint working - {len(data['plans'])} plans")
    
    def test_get_subscription_requires_auth(self):
        """Test subscription endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/payments/subscription")
        assert response.status_code == 401
        print("✅ Subscription endpoint requires auth")
    
    def test_get_subscription_with_auth(self, auth_token):
        """Test subscription endpoint with auth"""
        response = requests.get(
            f"{BASE_URL}/api/payments/subscription",
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'has_subscription' in data
        print("✅ Subscription endpoint working with auth")


class TestUserProfile:
    """Test user profile endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        email = f"profile{random.randint(10000, 99999)}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            'email': email,
            'username': f"Profile{random.randint(10000, 99999)}",
            'password': 'TestPass123!',
            'gender': 'female',
            'date_of_birth': '2000-01-01',
            'terms_accepted': True
        })
        if response.status_code == 200:
            return response.json()['token']
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            'email': email,
            'password': 'TestPass123!'
        })
        return response.json()['token']
    
    def test_get_current_user(self, auth_token):
        """Test getting current user info"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'username' in data
        assert 'gender' in data
        print(f"✅ Current user endpoint working - {data['username']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
