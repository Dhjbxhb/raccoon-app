"""
Unit tests for Continent Filter accuracy in MatchingQueue (no server/DB
needed - exercises the queue class directly).

Continent Filter is a paid feature, same as Gender Filter, and must not
silently match someone outside the chosen continent - see
services/continent_service.py for the country -> continent mapping and
services/matching_service.py for the "no server-side relaxation" design
(the spec's "fall back to Worldwide" behavior is an explicit, visible
client-driven rejoin, tested separately on the frontend side).
"""

import pytest
from services.matching_service import MatchingQueue
from services.continent_service import get_continent, CONTINENTS, COUNTRY_CODE_TO_CONTINENT


def make_user(user_id, country_code, gender='any', premium=False):
    return {
        'socket_id': f"sock-{user_id}",
        'username': user_id,
        'gender': gender,
        'country': country_code,
        'country_code': country_code,
        'is_guest': False,
        'premium_status': premium,
    }


@pytest.fixture
def queue():
    return MatchingQueue()


class TestContinentMapping:
    def test_middle_east_is_carved_out_of_asia_and_africa(self):
        # These would geographically be Asia/Africa on a plain continent map,
        # but the spec calls out "Middle East" as its own filter option.
        assert get_continent('SA') == 'Middle East'  # Saudi Arabia
        assert get_continent('TR') == 'Middle East'  # Turkey
        assert get_continent('EG') == 'Africa'        # Egypt stays Africa

    def test_every_mapped_continent_is_a_valid_filter_option(self):
        assert set(COUNTRY_CODE_TO_CONTINENT.values()) == set(CONTINENTS)

    def test_unknown_code_maps_to_none(self):
        assert get_continent('ZZ') is None
        assert get_continent(None) is None


class TestContinentFilterMatching:
    def test_complementary_continent_filters_match_each_other(self, queue):
        """Someone in Pakistan (Asia) wanting Europe, and someone in Germany
        (Europe) wanting Asia, must find each other."""
        result_a = queue.add_to_queue(
            'alice', make_user('alice', 'PK'), gender_filter='any', country_filter='Europe'
        )
        assert result_a is None

        result_b = queue.add_to_queue(
            'bob', make_user('bob', 'DE'), gender_filter='any', country_filter='Asia'
        )
        assert result_b is not None
        matched_ids = {result_b['user1']['user_id'], result_b['user2']['user_id']}
        assert matched_ids == {'alice', 'bob'}

    def test_one_sided_continent_match_is_rejected(self, queue):
        """Alice (in Pakistan/Asia) wants Europe. Carol is in France (Europe)
        but ALSO wants Europe - Carol's filter isn't satisfied by Alice
        (who is in Asia), so they must not be matched."""
        queue.add_to_queue('alice', make_user('alice', 'PK'), gender_filter='any', country_filter='Europe')
        result = queue.add_to_queue('carol', make_user('carol', 'FR'), gender_filter='any', country_filter='Europe')

        assert result is None
        assert queue.is_user_in_queue('alice')
        assert queue.is_user_in_queue('carol')

    def test_continent_filter_is_never_silently_relaxed(self, queue):
        """No instant server-side fallback to Worldwide - if no one in the
        requested continent is queued, the user simply waits."""
        result = queue.add_to_queue(
            'dave', make_user('dave', 'US'), gender_filter='any', country_filter='Asia'
        )
        assert result is None
        assert queue.is_user_in_queue('dave')

    def test_any_continent_matches_a_specific_continent_when_compatible(self, queue):
        """A Worldwide searcher who happens to be IN the requested continent
        should still be matchable by someone filtering specifically for it."""
        queue.add_to_queue('erin', make_user('erin', 'JP'), gender_filter='any', country_filter='Asia')
        result = queue.add_to_queue('frank', make_user('frank', 'TH'), gender_filter='any', country_filter='ANY')

        assert result is not None
        matched_ids = {result['user1']['user_id'], result['user2']['user_id']}
        assert matched_ids == {'erin', 'frank'}

    def test_gender_and_continent_both_required_wrong_continent_blocks(self, queue):
        """Filtering for Female + Asia must not match a woman who isn't in
        Asia, even though the gender half is satisfied."""
        queue.add_to_queue('gina', make_user('gina', 'FR', gender='female'), gender_filter='any', country_filter='ANY')
        blocked = queue.add_to_queue(
            'raj', make_user('raj', 'IN', gender='male'),
            gender_filter='female', country_filter='Asia'
        )
        assert blocked is None
        assert queue.is_user_in_queue('gina')
        assert queue.is_user_in_queue('raj')

    def test_gender_and_continent_both_required_wrong_gender_blocks(self, queue):
        """Filtering for Female + Asia must not match a man who IS in Asia -
        the continent half being satisfied isn't enough on its own."""
        queue.add_to_queue('kenji', make_user('kenji', 'JP', gender='male'), gender_filter='any', country_filter='ANY')
        blocked = queue.add_to_queue(
            'raj', make_user('raj', 'IN', gender='male'),
            gender_filter='female', country_filter='Asia'
        )
        assert blocked is None
        assert queue.is_user_in_queue('kenji')
        assert queue.is_user_in_queue('raj')

    def test_gender_and_continent_both_required_success(self, queue):
        """Filtering for Female + Asia matches a woman who IS in Asia."""
        queue.add_to_queue(
            'raj', make_user('raj', 'IN', gender='male'),
            gender_filter='female', country_filter='Asia'
        )
        result = queue.add_to_queue('yuki', make_user('yuki', 'JP', gender='female'), gender_filter='any', country_filter='ANY')

        assert result is not None
        matched_ids = {result['user1']['user_id'], result['user2']['user_id']}
        assert matched_ids == {'raj', 'yuki'}

    def test_free_users_default_to_worldwide_and_match_broadly(self, queue):
        """Free-tier flow: both users pass country_filter='ANY' (as
        premium_guard downgrades non-premium requests to) and should match
        regardless of country."""
        queue.add_to_queue('hank', make_user('hank', 'US'), gender_filter='any', country_filter='ANY')
        result = queue.add_to_queue('ivan', make_user('ivan', 'RU'), gender_filter='any', country_filter='ANY')

        assert result is not None
        matched_ids = {result['user1']['user_id'], result['user2']['user_id']}
        assert matched_ids == {'hank', 'ivan'}
