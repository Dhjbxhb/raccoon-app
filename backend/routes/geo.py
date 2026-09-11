"""Public IP-based country detection, used to show/pre-fill the detected
country on the signup and onboarding forms before an account exists."""

from fastapi import APIRouter, Request
from services.country_service import CountryService

router = APIRouter(prefix="/geo", tags=["geo"])


@router.get("/detect-country")
async def detect_country(request: Request):
    client_ip = request.client.host
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        client_ip = forwarded_for.split(',')[0].strip()

    browser_locale = request.query_params.get('locale')
    info = await CountryService.get_country_from_ip_async(client_ip, browser_locale)

    return {
        "country": info['country'],
        "country_code": info['countryCode'],
        "country_flag": info['flag'],
    }
