"""
Continent classification for the Continent Filter (Phase 2 spec).

"Middle East" is not a real continent but is one of the filter's required
options, so it's carved out of Asia/Africa here to match the spec exactly:
Europe, Asia, Middle East, North America, South America, Africa, Oceania.
"""

from typing import Optional

CONTINENTS = [
    "Europe",
    "Asia",
    "Middle East",
    "North America",
    "South America",
    "Africa",
    "Oceania",
]

# ISO 3166-1 alpha-2 country code -> continent bucket used by the filter.
COUNTRY_CODE_TO_CONTINENT = {
    # Europe
    'AL': 'Europe', 'AD': 'Europe', 'AT': 'Europe', 'BY': 'Europe', 'BE': 'Europe',
    'BA': 'Europe', 'BG': 'Europe', 'HR': 'Europe', 'CY': 'Europe', 'CZ': 'Europe',
    'DK': 'Europe', 'EE': 'Europe', 'FI': 'Europe', 'FR': 'Europe', 'DE': 'Europe',
    'GR': 'Europe', 'HU': 'Europe', 'IS': 'Europe', 'IE': 'Europe', 'IT': 'Europe',
    'LV': 'Europe', 'LI': 'Europe', 'LT': 'Europe', 'LU': 'Europe', 'MT': 'Europe',
    'MD': 'Europe', 'MC': 'Europe', 'ME': 'Europe', 'NL': 'Europe', 'MK': 'Europe',
    'NO': 'Europe', 'PL': 'Europe', 'PT': 'Europe', 'RO': 'Europe', 'RU': 'Europe',
    'SM': 'Europe', 'RS': 'Europe', 'SK': 'Europe', 'SI': 'Europe', 'ES': 'Europe',
    'SE': 'Europe', 'CH': 'Europe', 'UA': 'Europe', 'GB': 'Europe', 'VA': 'Europe',

    # Middle East
    'BH': 'Middle East', 'IR': 'Middle East', 'IQ': 'Middle East', 'IL': 'Middle East',
    'JO': 'Middle East', 'KW': 'Middle East', 'LB': 'Middle East', 'OM': 'Middle East',
    'PS': 'Middle East', 'QA': 'Middle East', 'SA': 'Middle East', 'SY': 'Middle East',
    'TR': 'Middle East', 'AE': 'Middle East', 'YE': 'Middle East',

    # Asia (excluding the Middle East carve-out above)
    'AF': 'Asia', 'AM': 'Asia', 'AZ': 'Asia', 'BD': 'Asia', 'BT': 'Asia', 'BN': 'Asia',
    'KH': 'Asia', 'CN': 'Asia', 'GE': 'Asia', 'IN': 'Asia', 'ID': 'Asia', 'JP': 'Asia',
    'KZ': 'Asia', 'KP': 'Asia', 'KR': 'Asia', 'KG': 'Asia', 'LA': 'Asia', 'MY': 'Asia',
    'MV': 'Asia', 'MN': 'Asia', 'MM': 'Asia', 'NP': 'Asia', 'PK': 'Asia', 'PH': 'Asia',
    'SG': 'Asia', 'LK': 'Asia', 'TW': 'Asia', 'TJ': 'Asia', 'TH': 'Asia', 'TL': 'Asia',
    'TM': 'Asia', 'UZ': 'Asia', 'VN': 'Asia',

    # North America
    'AG': 'North America', 'BS': 'North America', 'BB': 'North America', 'BZ': 'North America',
    'CA': 'North America', 'CR': 'North America', 'CU': 'North America', 'DM': 'North America',
    'DO': 'North America', 'SV': 'North America', 'GD': 'North America', 'GT': 'North America',
    'HT': 'North America', 'HN': 'North America', 'JM': 'North America', 'MX': 'North America',
    'NI': 'North America', 'PA': 'North America', 'KN': 'North America', 'LC': 'North America',
    'VC': 'North America', 'TT': 'North America', 'US': 'North America',

    # South America
    'AR': 'South America', 'BO': 'South America', 'BR': 'South America', 'CL': 'South America',
    'CO': 'South America', 'EC': 'South America', 'GY': 'South America', 'PY': 'South America',
    'PE': 'South America', 'SR': 'South America', 'UY': 'South America', 'VE': 'South America',

    # Africa
    'DZ': 'Africa', 'AO': 'Africa', 'BJ': 'Africa', 'BW': 'Africa', 'BF': 'Africa', 'BI': 'Africa',
    'CV': 'Africa', 'CM': 'Africa', 'CF': 'Africa', 'TD': 'Africa', 'KM': 'Africa', 'CG': 'Africa',
    'CI': 'Africa', 'DJ': 'Africa', 'EG': 'Africa', 'GQ': 'Africa', 'ER': 'Africa', 'SZ': 'Africa',
    'ET': 'Africa', 'GA': 'Africa', 'GM': 'Africa', 'GH': 'Africa', 'GN': 'Africa', 'GW': 'Africa',
    'KE': 'Africa', 'LS': 'Africa', 'LR': 'Africa', 'LY': 'Africa', 'MG': 'Africa', 'MW': 'Africa',
    'ML': 'Africa', 'MR': 'Africa', 'MU': 'Africa', 'MA': 'Africa', 'MZ': 'Africa', 'NA': 'Africa',
    'NE': 'Africa', 'NG': 'Africa', 'RW': 'Africa', 'ST': 'Africa', 'SN': 'Africa', 'SC': 'Africa',
    'SL': 'Africa', 'SO': 'Africa', 'ZA': 'Africa', 'SS': 'Africa', 'SD': 'Africa', 'TZ': 'Africa',
    'TG': 'Africa', 'TN': 'Africa', 'UG': 'Africa', 'ZM': 'Africa', 'ZW': 'Africa',

    # Oceania
    'AU': 'Oceania', 'FJ': 'Oceania', 'KI': 'Oceania', 'MH': 'Oceania', 'FM': 'Oceania',
    'NR': 'Oceania', 'NZ': 'Oceania', 'PW': 'Oceania', 'PG': 'Oceania', 'WS': 'Oceania',
    'SB': 'Oceania', 'TO': 'Oceania', 'TV': 'Oceania', 'VU': 'Oceania',
}


def get_continent(country_code: Optional[str]) -> Optional[str]:
    """Maps an ISO alpha-2 country code to one of the 7 filter continents.
    Returns None for an unrecognized/missing code (never matches a specific
    continent filter, but is still reachable by an 'ANY' search)."""
    if not country_code:
        return None
    return COUNTRY_CODE_TO_CONTINENT.get(country_code.strip().upper())
