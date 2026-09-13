"""
Regression test: a matched partner's avatar/photo/date_of_birth/country_flag
must survive the trip through MatchingQueue (QueueEntry -> ActiveSession),
since build_partner_payload() (websocket/socket_handlers.py) reads them off
the session snapshot to show the partner's picture and age - both while
connecting and, for a reconnect, via session_restored.

Regression coverage for a real bug: QueueEntry/ActiveSession only carried
username/gender/country/country_code/is_guest/premium/socket_id, silently
dropping avatar_url, photo_url, date_of_birth and country_flag the moment a
user was queued - so no match (fresh or reconnected) ever showed a picture
or age, regardless of what was actually stored on the account.
"""

import pytest
from services.matching_service import MatchingQueue

pytestmark = pytest.mark.unit


def make_user(user_id, avatar_url=None, photo_url=None, date_of_birth=None, country_flag=None):
    return {
        'socket_id': f"sock-{user_id}",
        'username': user_id,
        'gender': 'any',
        'country': 'Pakistan',
        'country_code': 'PK',
        'country_flag': country_flag,
        'is_guest': False,
        'premium_status': False,
        'avatar_url': avatar_url,
        'photo_url': photo_url,
        'date_of_birth': date_of_birth,
    }


class TestPartnerProfileFieldsSurviveQueue:
    def test_avatar_photo_dob_and_flag_reach_the_match_session(self):
        queue = MatchingQueue()
        queue.add_to_queue(
            'alice',
            make_user('alice', photo_url='https://lh3.googleusercontent.com/a/xyz', date_of_birth='2000-12-21', country_flag='🇵🇰'),
            gender_filter='any', country_filter='ANY'
        )
        result = queue.add_to_queue(
            'bob',
            make_user('bob', avatar_url='/api/static/avatars/bob.jpg', date_of_birth='1998-05-01', country_flag='🇵🇰'),
            gender_filter='any', country_filter='ANY'
        )

        assert result is not None
        alice_side = result['user1'] if result['user1']['user_id'] == 'alice' else result['user2']
        bob_side = result['user1'] if result['user1']['user_id'] == 'bob' else result['user2']

        assert alice_side['photo_url'] == 'https://lh3.googleusercontent.com/a/xyz'
        assert alice_side['date_of_birth'] == '2000-12-21'
        assert alice_side['country_flag'] == '🇵🇰'

        assert bob_side['avatar_url'] == '/api/static/avatars/bob.jpg'
        assert bob_side['date_of_birth'] == '1998-05-01'

    def test_fields_still_present_after_reconnect_via_get_session(self):
        """get_session() (used by the rejoin/session_restored flow) must
        return the same enriched snapshot, not a stripped-down one."""
        queue = MatchingQueue()
        queue.add_to_queue('carol', make_user('carol', date_of_birth='1995-03-10'), gender_filter='any', country_filter='ANY')
        queue.add_to_queue('dave', make_user('dave', avatar_url='/api/static/avatars/dave.jpg'), gender_filter='any', country_filter='ANY')

        session = queue.get_session('carol')
        assert session is not None
        dave_side = session['user1'] if session['user1']['user_id'] == 'dave' else session['user2']
        assert dave_side['avatar_url'] == '/api/static/avatars/dave.jpg'

    def test_direct_session_for_private_rooms_also_carries_profile_fields(self):
        """create_direct_session (private rooms) must not lose these fields
        either - it builds QueueEntry objects the same way add_to_queue does."""
        queue = MatchingQueue()
        result = queue.create_direct_session(
            {'user_id': 'erin', 'socket_id': 'sock-erin', 'username': 'erin', 'avatar_url': '/api/static/avatars/erin.jpg'},
            {'user_id': 'frank', 'socket_id': 'sock-frank', 'username': 'frank', 'date_of_birth': '1990-01-01'},
        )
        erin_side = result['user1'] if result['user1']['user_id'] == 'erin' else result['user2']
        frank_side = result['user1'] if result['user1']['user_id'] == 'frank' else result['user2']
        assert erin_side['avatar_url'] == '/api/static/avatars/erin.jpg'
        assert frank_side['date_of_birth'] == '1990-01-01'
