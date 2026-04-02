"""
Database Initialization Service

Creates indexes and initializes collections for the Raccoon app.
Run this on server startup to ensure database is properly configured.
"""

import logging
from services.db_service import get_database
from models.user import USER_INDEXES
from models.guest import GUEST_INDEXES

logger = logging.getLogger(__name__)


async def create_indexes():
    """Create all necessary database indexes"""
    db = get_database()
    
    # User indexes
    logger.info("Creating user collection indexes...")
    for index_config in USER_INDEXES:
        try:
            keys = index_config["keys"]
            options = {k: v for k, v in index_config.items() if k != "keys"}
            await db.users.create_index(keys, **options)
        except Exception as e:
            logger.warning(f"Index creation warning (users): {e}")
    
    # Guest indexes
    logger.info("Creating guest collection indexes...")
    for index_config in GUEST_INDEXES:
        try:
            keys = index_config["keys"]
            options = {k: v for k, v in index_config.items() if k != "keys"}
            await db.guests.create_index(keys, **options)
        except Exception as e:
            logger.warning(f"Index creation warning (guests): {e}")
    
    # Reports indexes
    logger.info("Creating reports collection indexes...")
    try:
        await db.reports.create_index([("report_id", 1)], unique=True, sparse=True)
        await db.reports.create_index([("reporter_id", 1)])
        await db.reports.create_index([("reported_id", 1)])
        await db.reports.create_index([("status", 1)])
        await db.reports.create_index([("created_at", -1)])
    except Exception as e:
        logger.warning(f"Index creation warning (reports): {e}")
    
    # Matches indexes
    logger.info("Creating matches collection indexes...")
    try:
        await db.matches.create_index([("match_id", 1)], unique=True, sparse=True)
        await db.matches.create_index([("user1_id", 1)])
        await db.matches.create_index([("user2_id", 1)])
        await db.matches.create_index([("created_at", -1)])
        await db.matches.create_index([("status", 1)])
    except Exception as e:
        logger.warning(f"Index creation warning (matches): {e}")
    
    # Messages indexes
    logger.info("Creating messages collection indexes...")
    try:
        await db.messages.create_index([("message_id", 1)], unique=True, sparse=True)
        await db.messages.create_index([("session_id", 1)])
        await db.messages.create_index([("sender_id", 1)])
        await db.messages.create_index([("created_at", -1)])
    except Exception as e:
        logger.warning(f"Index creation warning (messages): {e}")
    
    # Blocked users indexes
    logger.info("Creating blocked_users collection indexes...")
    try:
        await db.blocked_users.create_index([("blocker_id", 1), ("blocked_id", 1)], unique=True, sparse=True)
        await db.blocked_users.create_index([("blocker_id", 1)])
        await db.blocked_users.create_index([("blocked_id", 1)])
    except Exception as e:
        logger.warning(f"Index creation warning (blocked_users): {e}")
    
    # Sessions indexes
    logger.info("Creating sessions collection indexes...")
    try:
        await db.sessions.create_index([("session_id", 1)], unique=True)
        await db.sessions.create_index([("user1_id", 1)])
        await db.sessions.create_index([("user2_id", 1)])
        await db.sessions.create_index([("status", 1)])
        await db.sessions.create_index([("start_time", -1)])
        await db.sessions.create_index([("end_time", -1)])
        await db.sessions.create_index([("end_reason", 1)])
        # Compound indexes for user history queries
        await db.sessions.create_index([("user1_id", 1), ("start_time", -1)])
        await db.sessions.create_index([("user2_id", 1), ("start_time", -1)])
        await db.sessions.create_index([("status", 1), ("start_time", -1)])
    except Exception as e:
        logger.warning(f"Index creation warning (sessions): {e}")
    
    logger.info("Database indexes creation complete!")


async def ensure_admin_user():
    """Ensure the default admin user exists"""
    from services.auth_service import AuthService
    import uuid
    from datetime import datetime, timezone
    
    db = get_database()
    
    admin_email = "admin@raccoon.app"
    existing = await db.users.find_one({"email": admin_email})
    
    if not existing:
        logger.info("Creating default admin user...")
        admin_user = {
            "user_id": str(uuid.uuid4()),
            "email": admin_email,
            "username": "RaccoonAdmin",
            "password_hash": AuthService.hash_password("Admin123!"),
            "login_method": "email",
            "gender": "any",
            "country": "United States",
            "country_code": "US",
            "country_flag": "🇺🇸",
            "age_verified": True,
            "email_verified": True,
            "account_status": "active",
            "is_banned": False,
            "currentSessionId": None,
            "premium_status": True,
            "premium_tier": "lifetime",
            "is_admin": True,
            "is_moderator": True,
            "admin_level": 10,
            "total_sessions": 0,
            "total_time_spent": 0,
            "total_matches": 0,
            "total_messages_sent": 0,
            "total_reports_received": 0,
            "total_reports_made": 0,
            "total_blocks_received": 0,
            "notifications_enabled": True,
            "sound_enabled": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_active": datetime.now(timezone.utc).isoformat(),
            "failed_login_attempts": 0,
        }
        await db.users.insert_one(admin_user)
        logger.info(f"Admin user created: {admin_email}")
    else:
        # Ensure admin has all required fields
        update_fields = {}
        if not existing.get('is_admin'):
            update_fields['is_admin'] = True
        if not existing.get('age_verified'):
            update_fields['age_verified'] = True
        if not existing.get('premium_status'):
            update_fields['premium_status'] = True
            update_fields['premium_tier'] = 'lifetime'
        if 'currentSessionId' not in existing:
            update_fields['currentSessionId'] = None
        if existing.get('admin_level', 0) < 10:
            update_fields['admin_level'] = 10
        
        if update_fields:
            await db.users.update_one({"email": admin_email}, {"$set": update_fields})
            logger.info("Admin user updated with missing fields")


async def initialize_database():
    """Initialize database with indexes and seed data"""
    logger.info("Initializing database...")
    await create_indexes()
    await ensure_admin_user()
    logger.info("Database initialization complete!")
