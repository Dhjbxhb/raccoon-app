import httpx
import logging
from typing import Optional, Dict
import asyncio

logger = logging.getLogger(__name__)

# Complete country code to name mapping
COUNTRY_CODE_TO_NAME = {
    'AF': 'Afghanistan', 'AL': 'Albania', 'DZ': 'Algeria', 'AD': 'Andorra', 'AO': 'Angola',
    'AG': 'Antigua and Barbuda', 'AR': 'Argentina', 'AM': 'Armenia', 'AU': 'Australia', 'AT': 'Austria',
    'AZ': 'Azerbaijan', 'BS': 'Bahamas', 'BH': 'Bahrain', 'BD': 'Bangladesh', 'BB': 'Barbados',
    'BY': 'Belarus', 'BE': 'Belgium', 'BZ': 'Belize', 'BJ': 'Benin', 'BT': 'Bhutan',
    'BO': 'Bolivia', 'BA': 'Bosnia and Herzegovina', 'BW': 'Botswana', 'BR': 'Brazil', 'BN': 'Brunei',
    'BG': 'Bulgaria', 'BF': 'Burkina Faso', 'BI': 'Burundi', 'KH': 'Cambodia', 'CM': 'Cameroon',
    'CA': 'Canada', 'CV': 'Cape Verde', 'CF': 'Central African Republic', 'TD': 'Chad', 'CL': 'Chile',
    'CN': 'China', 'CO': 'Colombia', 'KM': 'Comoros', 'CG': 'Congo', 'CR': 'Costa Rica',
    'HR': 'Croatia', 'CU': 'Cuba', 'CY': 'Cyprus', 'CZ': 'Czech Republic', 'DK': 'Denmark',
    'DJ': 'Djibouti', 'DM': 'Dominica', 'DO': 'Dominican Republic', 'EC': 'Ecuador', 'EG': 'Egypt',
    'SV': 'El Salvador', 'GQ': 'Equatorial Guinea', 'ER': 'Eritrea', 'EE': 'Estonia', 'ET': 'Ethiopia',
    'FJ': 'Fiji', 'FI': 'Finland', 'FR': 'France', 'GA': 'Gabon', 'GM': 'Gambia',
    'GE': 'Georgia', 'DE': 'Germany', 'GH': 'Ghana', 'GR': 'Greece', 'GD': 'Grenada',
    'GT': 'Guatemala', 'GN': 'Guinea', 'GW': 'Guinea-Bissau', 'GY': 'Guyana', 'HT': 'Haiti',
    'HN': 'Honduras', 'HU': 'Hungary', 'IS': 'Iceland', 'IN': 'India', 'ID': 'Indonesia',
    'IR': 'Iran', 'IQ': 'Iraq', 'IE': 'Ireland', 'IL': 'Israel', 'IT': 'Italy',
    'CI': 'Ivory Coast', 'JM': 'Jamaica', 'JP': 'Japan', 'JO': 'Jordan', 'KZ': 'Kazakhstan',
    'KE': 'Kenya', 'KI': 'Kiribati', 'KP': 'North Korea', 'KR': 'South Korea', 'KW': 'Kuwait',
    'KG': 'Kyrgyzstan', 'LA': 'Laos', 'LV': 'Latvia', 'LB': 'Lebanon', 'LS': 'Lesotho',
    'LR': 'Liberia', 'LY': 'Libya', 'LI': 'Liechtenstein', 'LT': 'Lithuania', 'LU': 'Luxembourg',
    'MK': 'North Macedonia', 'MG': 'Madagascar', 'MW': 'Malawi', 'MY': 'Malaysia', 'MV': 'Maldives',
    'ML': 'Mali', 'MT': 'Malta', 'MH': 'Marshall Islands', 'MR': 'Mauritania', 'MU': 'Mauritius',
    'MX': 'Mexico', 'FM': 'Micronesia', 'MD': 'Moldova', 'MC': 'Monaco', 'MN': 'Mongolia',
    'ME': 'Montenegro', 'MA': 'Morocco', 'MZ': 'Mozambique', 'MM': 'Myanmar', 'NA': 'Namibia',
    'NR': 'Nauru', 'NP': 'Nepal', 'NL': 'Netherlands', 'NZ': 'New Zealand', 'NI': 'Nicaragua',
    'NE': 'Niger', 'NG': 'Nigeria', 'NO': 'Norway', 'OM': 'Oman', 'PK': 'Pakistan',
    'PW': 'Palau', 'PS': 'Palestine', 'PA': 'Panama', 'PG': 'Papua New Guinea', 'PY': 'Paraguay',
    'PE': 'Peru', 'PH': 'Philippines', 'PL': 'Poland', 'PT': 'Portugal', 'QA': 'Qatar',
    'RO': 'Romania', 'RU': 'Russia', 'RW': 'Rwanda', 'KN': 'Saint Kitts and Nevis', 'LC': 'Saint Lucia',
    'VC': 'Saint Vincent and the Grenadines', 'WS': 'Samoa', 'SM': 'San Marino', 'ST': 'Sao Tome and Principe',
    'SA': 'Saudi Arabia', 'SN': 'Senegal', 'RS': 'Serbia', 'SC': 'Seychelles', 'SL': 'Sierra Leone',
    'SG': 'Singapore', 'SK': 'Slovakia', 'SI': 'Slovenia', 'SB': 'Solomon Islands', 'SO': 'Somalia',
    'ZA': 'South Africa', 'SS': 'South Sudan', 'ES': 'Spain', 'LK': 'Sri Lanka', 'SD': 'Sudan',
    'SR': 'Suriname', 'SZ': 'Eswatini', 'SE': 'Sweden', 'CH': 'Switzerland', 'SY': 'Syria',
    'TW': 'Taiwan', 'TJ': 'Tajikistan', 'TZ': 'Tanzania', 'TH': 'Thailand', 'TL': 'Timor-Leste',
    'TG': 'Togo', 'TO': 'Tonga', 'TT': 'Trinidad and Tobago', 'TN': 'Tunisia', 'TR': 'Turkey',
    'TM': 'Turkmenistan', 'TV': 'Tuvalu', 'UG': 'Uganda', 'UA': 'Ukraine', 'AE': 'United Arab Emirates',
    'GB': 'United Kingdom', 'US': 'United States', 'UY': 'Uruguay', 'UZ': 'Uzbekistan', 'VU': 'Vanuatu',
    'VA': 'Vatican City', 'VE': 'Venezuela', 'VN': 'Vietnam', 'YE': 'Yemen', 'ZM': 'Zambia', 'ZW': 'Zimbabwe'
}

class CountryService:
    """
    Production-grade IP geolocation service using multiple free providers
    with fallback mechanism for reliability on both desktop and mobile.
    NEVER returns empty/unknown - always provides a valid country.
    """
    
    # List of free IP geolocation APIs (in order of preference)
    PROVIDERS = [
        {
            'name': 'ipapi.co',
            'url': 'https://ipapi.co/{ip}/json/',
            'country_key': 'country_name',
            'code_key': 'country_code',
            'timeout': 5
        },
        {
            'name': 'ip-api.com',
            'url': 'http://ip-api.com/json/{ip}?fields=status,country,countryCode',
            'country_key': 'country',
            'code_key': 'countryCode',
            'status_key': 'status',
            'status_value': 'success',
            'timeout': 5
        },
        {
            'name': 'ipwho.is',
            'url': 'https://ipwho.is/{ip}',
            'country_key': 'country',
            'code_key': 'country_code',
            'status_key': 'success',
            'status_value': True,
            'timeout': 5
        }
    ]
    
    # Default fallback - will be overridden by browser locale if provided
    DEFAULT_COUNTRY = {
        'country': 'United States',
        'countryCode': 'US',
        'flag': '🇺🇸'
    }
    
    @staticmethod
    def _is_private_ip(ip_address: str) -> bool:
        """Check if IP is private/local"""
        if not ip_address:
            return True
        return (
            ip_address in ['127.0.0.1', 'localhost', '::1', '0.0.0.0'] or
            ip_address.startswith('192.168.') or
            ip_address.startswith('10.') or
            ip_address.startswith('172.16.') or
            ip_address.startswith('172.17.') or
            ip_address.startswith('172.18.') or
            ip_address.startswith('172.19.') or
            ip_address.startswith('172.20.') or
            ip_address.startswith('172.21.') or
            ip_address.startswith('172.22.') or
            ip_address.startswith('172.23.') or
            ip_address.startswith('172.24.') or
            ip_address.startswith('172.25.') or
            ip_address.startswith('172.26.') or
            ip_address.startswith('172.27.') or
            ip_address.startswith('172.28.') or
            ip_address.startswith('172.29.') or
            ip_address.startswith('172.30.') or
            ip_address.startswith('172.31.')
        )
    
    @staticmethod
    def _country_code_to_flag(country_code: str) -> str:
        """Convert country code to flag emoji"""
        if not country_code or len(country_code) != 2:
            return '🌐'
        try:
            return ''.join(chr(127397 + ord(char)) for char in country_code.upper())
        except Exception:
            return '🌐'
    
    @staticmethod
    def get_country_from_locale(locale: str) -> Dict[str, str]:
        """
        Get country from browser locale string (e.g., 'en-US', 'fr-FR', 'de')
        This is used as a fallback when IP detection fails.
        """
        if not locale:
            return CountryService.DEFAULT_COUNTRY
        
        # Extract country code from locale (e.g., 'en-US' -> 'US', 'fr-FR' -> 'FR')
        parts = locale.replace('_', '-').split('-')
        country_code = None
        
        if len(parts) >= 2:
            # Try the second part (country code)
            potential_code = parts[1].upper()
            if potential_code in COUNTRY_CODE_TO_NAME:
                country_code = potential_code
        
        if not country_code and len(parts) >= 1:
            # Try common language-to-country mappings
            lang = parts[0].lower()
            lang_to_country = {
                'en': 'US', 'es': 'ES', 'fr': 'FR', 'de': 'DE', 'it': 'IT',
                'pt': 'BR', 'ru': 'RU', 'ja': 'JP', 'ko': 'KR', 'zh': 'CN',
                'ar': 'SA', 'hi': 'IN', 'bn': 'BD', 'tr': 'TR', 'vi': 'VN',
                'th': 'TH', 'pl': 'PL', 'nl': 'NL', 'sv': 'SE', 'no': 'NO',
                'da': 'DK', 'fi': 'FI', 'el': 'GR', 'he': 'IL', 'id': 'ID',
                'ms': 'MY', 'tl': 'PH', 'uk': 'UA', 'cs': 'CZ', 'hu': 'HU',
                'ro': 'RO', 'sk': 'SK', 'bg': 'BG', 'hr': 'HR', 'sr': 'RS'
            }
            country_code = lang_to_country.get(lang)
        
        if country_code and country_code in COUNTRY_CODE_TO_NAME:
            return {
                'country': COUNTRY_CODE_TO_NAME[country_code],
                'countryCode': country_code,
                'flag': CountryService._country_code_to_flag(country_code)
            }
        
        return CountryService.DEFAULT_COUNTRY
    
    @staticmethod
    async def get_country_from_ip_async(ip_address: str, browser_locale: str = None) -> Dict[str, str]:
        """
        Async method to get country from IP with multiple provider fallback.
        Returns dict with country, countryCode, and flag emoji.
        NEVER returns empty/unknown - always provides a valid country.
        
        Fallback order:
        1. IP geolocation (multiple providers)
        2. Browser locale
        3. Default (US)
        """
        # Handle private/local IPs - use browser locale or default
        if CountryService._is_private_ip(ip_address):
            logger.info(f"Private IP detected: {ip_address}, using locale fallback")
            if browser_locale:
                result = CountryService.get_country_from_locale(browser_locale)
                logger.info(f"Using browser locale {browser_locale} -> {result['country']}")
                return result
            return CountryService.DEFAULT_COUNTRY
        
        # Try each provider
        async with httpx.AsyncClient() as client:
            for provider in CountryService.PROVIDERS:
                try:
                    url = provider['url'].format(ip=ip_address)
                    response = await client.get(url, timeout=provider['timeout'])
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        # Check status if required
                        if 'status_key' in provider:
                            if data.get(provider['status_key']) != provider['status_value']:
                                logger.warning(f"{provider['name']} returned unsuccessful status for {ip_address}")
                                continue
                        
                        country = data.get(provider['country_key'])
                        country_code = data.get(provider['code_key'])
                        
                        if country and country_code:
                            flag = CountryService._country_code_to_flag(country_code)
                            logger.info(f"Country detected via {provider['name']}: {country} ({country_code}) for IP {ip_address}")
                            return {
                                'country': country,
                                'countryCode': country_code.upper(),
                                'flag': flag
                            }
                            
                except httpx.TimeoutException:
                    logger.warning(f"{provider['name']} timed out for IP {ip_address}")
                except Exception as e:
                    logger.warning(f"{provider['name']} error for IP {ip_address}: {e}")
        
        # All IP providers failed - use browser locale fallback
        logger.warning(f"All IP geolocation providers failed for {ip_address}, using locale fallback")
        if browser_locale:
            result = CountryService.get_country_from_locale(browser_locale)
            logger.info(f"Fallback to browser locale {browser_locale} -> {result['country']}")
            return result
        
        # Final fallback - return default (never return Unknown)
        logger.warning("No locale provided, using default country")
        return CountryService.DEFAULT_COUNTRY
    
    @staticmethod
    def get_country_from_ip(ip_address: str, browser_locale: str = None) -> Dict[str, str]:
        """
        Synchronous method to get country from IP.
        Uses asyncio to run the async version.
        """
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is already running (e.g., in FastAPI), create task
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    future = pool.submit(
                        asyncio.run, 
                        CountryService.get_country_from_ip_async(ip_address, browser_locale)
                    )
                    return future.result(timeout=15)
            else:
                return loop.run_until_complete(
                    CountryService.get_country_from_ip_async(ip_address, browser_locale)
                )
        except Exception as e:
            logger.error(f"Error in sync get_country_from_ip: {e}")
            return CountryService._get_fallback_sync(ip_address, browser_locale)
    
    @staticmethod
    def _get_fallback_sync(ip_address: str, browser_locale: str = None) -> Dict[str, str]:
        """Synchronous fallback using requests"""
        import requests
        
        if CountryService._is_private_ip(ip_address):
            if browser_locale:
                return CountryService.get_country_from_locale(browser_locale)
            return CountryService.DEFAULT_COUNTRY
        
        for provider in CountryService.PROVIDERS:
            try:
                url = provider['url'].format(ip=ip_address)
                response = requests.get(url, timeout=provider['timeout'])
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if 'status_key' in provider:
                        if data.get(provider['status_key']) != provider['status_value']:
                            continue
                    
                    country = data.get(provider['country_key'])
                    country_code = data.get(provider['code_key'])
                    
                    if country and country_code:
                        flag = CountryService._country_code_to_flag(country_code)
                        return {
                            'country': country,
                            'countryCode': country_code.upper(),
                            'flag': flag
                        }
            except:
                continue
        
        # Fallback to browser locale or default
        if browser_locale:
            return CountryService.get_country_from_locale(browser_locale)
        return CountryService.DEFAULT_COUNTRY


# Helper function for direct API usage
async def detect_country_async(ip_address: str, browser_locale: str = None) -> Dict[str, str]:
    """Async helper function for country detection"""
    return await CountryService.get_country_from_ip_async(ip_address, browser_locale)


def detect_country(ip_address: str, browser_locale: str = None) -> Dict[str, str]:
    """Sync helper function for country detection"""
    return CountryService.get_country_from_ip(ip_address, browser_locale)
