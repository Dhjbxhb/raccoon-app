import requests
import logging

logger = logging.getLogger(__name__)

class CountryService:
    @staticmethod
    def get_country_from_ip(ip_address: str) -> dict:
        """
        Get country information from IP address using ip-api.com (free service)
        Returns dict with country, countryCode, and flag emoji
        """
        # Handle localhost/development
        if ip_address in ['127.0.0.1', 'localhost', '::1'] or ip_address.startswith('192.168.') or ip_address.startswith('10.'):
            return {
                'country': 'United States',
                'countryCode': 'US',
                'flag': '🇺🇸'
            }
        
        try:
            response = requests.get(
                f'http://ip-api.com/json/{ip_address}?fields=status,country,countryCode',
                timeout=3
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'success':
                    country = data.get('country', 'Unknown')
                    country_code = data.get('countryCode', 'XX')
                    
                    # Convert country code to flag emoji
                    flag = CountryService._country_code_to_flag(country_code)
                    
                    return {
                        'country': country,
                        'countryCode': country_code,
                        'flag': flag
                    }
        except Exception as e:
            logger.error(f"Error detecting country from IP {ip_address}: {e}")
        
        # Fallback
        return {
            'country': 'Unknown',
            'countryCode': 'XX',
            'flag': '🌐'
        }
    
    @staticmethod
    def _country_code_to_flag(country_code: str) -> str:
        """
        Convert country code to flag emoji
        """
        if len(country_code) != 2:
            return '🌐'
        
        # Convert country code to regional indicator symbols
        return ''.join(chr(127397 + ord(char)) for char in country_code.upper())
