"""
Unit tests for MatchingQueue gender-filter accuracy (no server/DB needed -
exercises the queue class directly).

Regression coverage for a real bug: the queue used to bucket waiting users
by the gender they were SEARCHING for instead of their own actual gender,
so two people with complementary filters (e.g. a woman wanting a man and a
man wanting a woman) could never find each other via the strict search path
- and a since-removed "relax everything" fallback stage silently matched a
Male/Female filter with literally anyone, defeating the paid filter entirely.
"""

import pytest
from services.matching_service import MatchingQueue

# Pure unit tests (no server/DB/network) - safe to run as an automated
# deploy gate, unlike most of this directory which are legacy integration
# tests that expect a live server on BASE_URL.
pytestmark = pytest.mark.unit


def make_user(user_id, gender, socket_id=None, premium=False):
    return {
        'socket_id': socket_id or f"sock-{user_id}",
        'username': user_id,
        'gender': gender,
        'country': 'United States',
        'country_code': 'US',
        'is_guest': False,
        'premium_status': premium,
    }


@pytest.fixture
def queue():
    return MatchingQueue()


def test_complementary_gender_filters_match_each_other(queue):
    """A woman wanting a man, and a man wanting a woman, must find each other."""
    result_a = queue.add_to_queue('alice', make_user('alice', 'female'), gender_filter='male')
    assert result_a is None  # Alice waits - Bob hasn't joined yet

    result_b = queue.add_to_queue('bob', make_user('bob', 'male'), gender_filter='female')
    assert result_b is not None
    matched_ids = {result_b['user1']['user_id'], result_b['user2']['user_id']}
    assert matched_ids == {'alice', 'bob'}


def test_same_specific_filter_does_not_match(queue):
    """Two users who both want a 'male' partner must not be matched with
    each other - neither one is offering what the other is looking for."""
    queue.add_to_queue('alice', make_user('alice', 'female'), gender_filter='male')
    result = queue.add_to_queue('carol', make_user('carol', 'female'), gender_filter='male')

    assert result is None
    assert queue.is_user_in_queue('alice')
    assert queue.is_user_in_queue('carol')


def test_gender_filter_is_never_silently_relaxed(queue):
    """A strict Male/Female filter must not fall back to matching an
    incompatible partner just because no compatible one is available yet."""
    queue.add_to_queue('carol', make_user('carol', 'female'), gender_filter='male')
    result = queue.add_to_queue('dave', make_user('dave', 'male'), gender_filter='male')

    # Both want a male partner; dave being male doesn't satisfy dave's own
    # filter, and carol wanting male doesn't make carol a valid match for dave.
    assert result is None
    assert queue.is_user_in_queue('carol')
    assert queue.is_user_in_queue('dave')


def test_any_filter_matches_a_specific_filter_when_compatible(queue):
    """A user with no gender preference should still be matchable by someone
    filtering for their actual gender."""
    queue.add_to_queue('erin', make_user('erin', 'female'), gender_filter='male')
    result = queue.add_to_queue('frank', make_user('frank', 'male'), gender_filter='any')

    assert result is not None
    matched_ids = {result['user1']['user_id'], result['user2']['user_id']}
    assert matched_ids == {'erin', 'frank'}


def test_free_users_default_to_any_and_match_broadly(queue):
    """Free-tier flow: both users pass gender_filter='any' (as premium_guard
    downgrades non-premium requests to) and should match each other."""
    queue.add_to_queue('gina', make_user('gina', 'female'), gender_filter='any')
    result = queue.add_to_queue('hank', make_user('hank', 'male'), gender_filter='any')

    assert result is not None
    matched_ids = {result['user1']['user_id'], result['user2']['user_id']}
    assert matched_ids == {'gina', 'hank'}
