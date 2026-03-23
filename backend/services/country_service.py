import httpx
import logging
from typing import Optional, Dict
import asyncio

logger = logging.getLogger(__name__)

class CountryService:
    """
    Production-grade IP geolocation service using multiple free providers
    with fallback mechanism for reliability on both desktop and mobile.
    """
    
    # List of free IP geolocation APIs (in order of preference)
    PROVIDERS = [
        {
            'name': 'ipapi.co',
            'url': 'https://ipapi.co/{ip}/json/',
            'country_key': 'country_name',
            'code_key': 'country_code',
            'timeout': 3
        },
        {
            'name': 'ip-api.com',
            'url': 'http://ip-api.com/json/{ip}?fields=status,country,countryCode',
            'country_key': 'country',
            'code_key': 'countryCode',
            'status_key': 'status',
            'status_value': 'success',
            'timeout': 3
        },
        {
            'name': 'ipwho.is',
            'url': 'https://ipwho.is/{ip}',
            'country_key': 'country',
            'code_key': 'country_code',
            'status_key': 'success',
            'status_value': True,
            'timeout': 3
        }
    ]
    
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
        except:
            return '🌐'
    
    @staticmethod
    async def get_country_from_ip_async(ip_address: str) -> Dict[str, str]:
        """
        Async method to get country from IP with multiple provider fallback.
        Returns dict with country, countryCode, and flag emoji.
        """
        # Handle private/local IPs
        if CountryService._is_private_ip(ip_address):
            logger.info(f"Private IP detected: {ip_address}, using default")
            return {
                'country': 'United States',
                'countryCode': 'US',
                'flag': '🇺🇸'
            }
        
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
        
        # All providers failed
        logger.error(f"All IP geolocation providers failed for {ip_address}")
        return {
            'country': 'Unknown',
            'countryCode': 'XX',
            'flag': '🌐'
        }
    
    @staticmethod
    def get_country_from_ip(ip_address: str) -> Dict[str, str]:
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
                        CountryService.get_country_from_ip_async(ip_address)
                    )
                    return future.result(timeout=10)
            else:
                return loop.run_until_complete(
                    CountryService.get_country_from_ip_async(ip_address)
                )
        except Exception as e:
            logger.error(f"Error in sync get_country_from_ip: {e}")
            return CountryService._get_fallback_sync(ip_address)
    
    @staticmethod
    def _get_fallback_sync(ip_address: str) -> Dict[str, str]:
        """Synchronous fallback using requests"""
        import requests
        
        if CountryService._is_private_ip(ip_address):
            return {
                'country': 'United States',
                'countryCode': 'US',
                'flag': '🇺🇸'
            }
        
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
        
        return {
            'country': 'Unknown',
            'countryCode': 'XX',
            'flag': '🌐'
        }


# Helper function for direct API usage
async def detect_country_async(ip_address: str) -> Dict[str, str]:
    """Async helper function for country detection"""
    return await CountryService.get_country_from_ip_async(ip_address)


def detect_country(ip_address: str) -> Dict[str, str]:
    """Sync helper function for country detection"""
    return CountryService.get_country_from_ip(ip_address)
