"""
Regression test: logging in with Google must not leave an account stuck
needing email verification.

Root cause of the reported bug ("no code get sent unless I press resend"
when logging in with Google): the /auth/google and /auth/social endpoints
looked up an existing user and returned email_verified=<whatever was
already in the DB> - so an account that originally signed up via
email/password and never verified (email_verified=False) stayed
"unverified" forever, even after proving ownership of that same email via
Google/Firebase. The frontend then routes an unverified user to
EmailVerificationPending.js, whose copy claims "we sent a code" but which
never actually sends one on its own (see that file) - only the original
signup endpoint does - so the user was stuck needing "Resend" every time.

These tests mock Firebase verification and the DB collection (no live
Firebase project or MongoDB needed) and exercise the real route handlers
directly.
"""

import os
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret-key-not-used-for-anything-real')

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

import routes.auth as auth_module

pytestmark = pytest.mark.unit


class FakeRequest:
    """Minimal stand-in for fastapi.Request - only what these handlers touch."""
    def __init__(self):
        self.client = MagicMock(host='203.0.113.5')
        self.headers = {}


def make_fake_users_collection(existing_user: dict):
    collection = MagicMock()
    collection.find_one = AsyncMock(return_value=dict(existing_user))
    collection.update_one = AsyncMock()
    return collection


@pytest.mark.asyncio
async def test_google_login_fixes_stale_unverified_email():
    """An account with email_verified=False (e.g. an old, never-verified
    email/password signup) must come back verified after a successful
    Google login, and the DB must be updated to match."""
    existing_user = {
        'user_id': 'u-1',
        'email': 'saif@example.com',
        'username': 'Saif',
        'firebase_uid': 'firebase-uid-1',  # already linked - isolates the email_verified fix
        'email_verified': False,
        'is_banned': False,
        'is_admin': False,
    }
    fake_users = make_fake_users_collection(existing_user)

    with patch.object(auth_module, 'get_users_collection', return_value=fake_users), \
         patch.object(auth_module, 'verify_firebase_id_token', return_value={'uid': 'firebase-uid-1', 'email': 'saif@example.com'}), \
         patch.object(auth_module.CountryService, 'get_country_from_ip', return_value={'country': 'Pakistan', 'countryCode': 'PK', 'flag': '🇵🇰'}), \
         patch.object(auth_module.AuthService, 'create_token', return_value='fake-jwt'):

        data = auth_module.GoogleAuthRequest(uid='client-supplied-uid', email='saif@example.com', idToken='fake-id-token')
        response = await auth_module.google_auth(data, FakeRequest())

    assert response.user.email_verified is True

    update_calls = fake_users.update_one.await_args_list
    assert any(
        call.args[0] == {'user_id': 'u-1'} and call.args[1] == {'$set': {'email_verified': True}}
        for call in update_calls
    ), f"expected an email_verified=True update, got calls: {update_calls}"


@pytest.mark.asyncio
async def test_google_login_does_not_touch_already_verified_email():
    """An already-verified account shouldn't trigger a redundant DB write."""
    existing_user = {
        'user_id': 'u-2',
        'email': 'verified@example.com',
        'username': 'Verified',
        'firebase_uid': 'firebase-uid-2',
        'email_verified': True,
        'is_banned': False,
        'is_admin': False,
    }
    fake_users = make_fake_users_collection(existing_user)

    with patch.object(auth_module, 'get_users_collection', return_value=fake_users), \
         patch.object(auth_module, 'verify_firebase_id_token', return_value={'uid': 'firebase-uid-2', 'email': 'verified@example.com'}), \
         patch.object(auth_module.CountryService, 'get_country_from_ip', return_value={'country': 'Pakistan', 'countryCode': 'PK', 'flag': '🇵🇰'}), \
         patch.object(auth_module.AuthService, 'create_token', return_value='fake-jwt'):

        data = auth_module.GoogleAuthRequest(uid='client-supplied-uid', email='verified@example.com', idToken='fake-id-token')
        response = await auth_module.google_auth(data, FakeRequest())

    assert response.user.email_verified is True
    assert fake_users.update_one.await_count == 0


@pytest.mark.asyncio
async def test_social_login_also_fixes_stale_unverified_email():
    """Same fix must apply to the /auth/social endpoint (also used by the
    frontend for Google sign-in from Login.js/Signup.js)."""
    existing_user = {
        'user_id': 'u-3',
        'email': 'raj@example.com',
        'username': 'Raj',
        'firebase_uid': 'firebase-uid-3',
        'email_verified': False,
        'is_banned': False,
        'is_admin': False,
    }
    fake_users = make_fake_users_collection(existing_user)

    with patch.object(auth_module, 'get_users_collection', return_value=fake_users), \
         patch.object(auth_module, 'verify_firebase_id_token', return_value={'uid': 'firebase-uid-3', 'email': 'raj@example.com'}), \
         patch.object(auth_module.CountryService, 'get_country_from_ip', return_value={'country': 'India', 'countryCode': 'IN', 'flag': '🇮🇳'}), \
         patch.object(auth_module.AuthService, 'create_token', return_value='fake-jwt'):

        data = auth_module.SocialAuthRequest(uid='client-supplied-uid', email='raj@example.com', provider='google', idToken='fake-id-token')
        response = await auth_module.social_auth(data, FakeRequest())

    assert response.user.email_verified is True
    update_calls = fake_users.update_one.await_args_list
    assert any(
        call.args[0] == {'user_id': 'u-3'} and call.args[1] == {'$set': {'email_verified': True}}
        for call in update_calls
    ), f"expected an email_verified=True update, got calls: {update_calls}"
