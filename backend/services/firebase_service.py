"""
Firebase Admin SDK initialization and ID token verification.

Used to verify Google/Firebase-issued ID tokens server-side, so the backend
never has to trust client-supplied uid/email fields directly.
"""

import os
import logging
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

logger = logging.getLogger(__name__)

_firebase_app = None


def init_firebase():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    service_account_path = os.environ.get('FIREBASE_SERVICE_ACCOUNT_PATH')
    if not service_account_path or not os.path.exists(service_account_path):
        logger.warning(
            'FIREBASE_SERVICE_ACCOUNT_PATH not set or file not found — '
            'Firebase ID token verification will be unavailable'
        )
        return None

    cred = credentials.Certificate(service_account_path)
    _firebase_app = firebase_admin.initialize_app(cred)
    logger.info('Firebase Admin SDK initialized')
    return _firebase_app


def verify_firebase_id_token(id_token: str) -> dict:
    """
    Verifies a Firebase ID token and returns the decoded claims.
    Raises ValueError if verification fails or Firebase Admin isn't configured.
    """
    if _firebase_app is None:
        raise ValueError('Firebase Admin SDK is not initialized')

    try:
        decoded = firebase_auth.verify_id_token(id_token)
        return decoded
    except Exception as e:
        raise ValueError(f'Invalid Firebase ID token: {e}')
