"""
TURN Credentials Route - Generates short-lived TURN server credentials

Uses coturn's time-limited REST API credential scheme (HMAC-SHA1 shared secret)
so the frontend never receives a permanent, reusable TURN password.
"""

import os
import hmac
import hashlib
import base64
import time
from fastapi import APIRouter

router = APIRouter()

TURN_SECRET = os.environ.get('TURN_SECRET', '')
TURN_SERVER_HOST = os.environ.get('TURN_SERVER_HOST', '72.60.68.161')
TURN_CRED_TTL_SECONDS = 3600  # credentials valid for 1 hour


@router.get('/turn-credentials')
async def get_turn_credentials():
    if not TURN_SECRET:
        return {'iceServers': []}

    expiry = int(time.time()) + TURN_CRED_TTL_SECONDS
    username = str(expiry)

    digest = hmac.new(TURN_SECRET.encode(), username.encode(), hashlib.sha1).digest()
    credential = base64.b64encode(digest).decode()

    return {
        'username': username,
        'credential': credential,
        'ttl': TURN_CRED_TTL_SECONDS,
        'uris': [
            f'turn:{TURN_SERVER_HOST}:3478?transport=udp',
            f'turn:{TURN_SERVER_HOST}:3478?transport=tcp',
        ]
    }
