from motor.motor_asyncio import AsyncIOMotorClient
import os
from typing import Optional
import logging
import asyncio

logger = logging.getLogger(__name__)

# Local MongoDB URL as fallback when Atlas is unreachable
LOCAL_MONGO_URL = "mongodb://localhost:27017"

class DatabaseService:
    client: Optional[AsyncIOMotorClient] = None
    db = None
    _indexes_created = False
    _using_local = False
    _connectivity_checked = False
    
    @classmethod
    async def _check_and_fallback(cls):
        """Check Atlas connectivity and fallback to local if needed"""
        if cls._connectivity_checked:
            return
        
        mongo_url = os.environ.get('MONGO_URL', LOCAL_MONGO_URL)
        db_name = os.environ.get('DB_NAME', 'raccoon_app')
        
        # Try primary (Atlas) first
        try:
            test_client = AsyncIOMotorClient(
                mongo_url,
                serverSelectionTimeoutMS=3000,
                connectTimeoutMS=3000
            )
            # Test connection with ping
            await asyncio.wait_for(test_client.admin.command('ping'), timeout=3.0)
            
            cls.client = AsyncIOMotorClient(
                mongo_url,
                maxPoolSize=50,
                minPoolSize=10,
                maxIdleTimeMS=45000,
                waitQueueTimeoutMS=10000,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=30000
            )
            cls.db = cls.client[db_name]
            logger.info("Connected to MongoDB Atlas")
            cls._connectivity_checked = True
            return
        except Exception as e:
            logger.warning(f"MongoDB Atlas unavailable: {e}")
        
        # Fallback to local MongoDB
        try:
            cls.client = AsyncIOMotorClient(
                LOCAL_MONGO_URL,
                serverSelectionTimeoutMS=2000,
                connectTimeoutMS=2000,
                maxPoolSize=50,
                minPoolSize=5
            )
            await asyncio.wait_for(cls.client.admin.command('ping'), timeout=2.0)
            cls.db = cls.client[db_name]
            cls._using_local = True
            cls._connectivity_checked = True
            logger.info("Using local MongoDB fallback")
        except Exception as e2:
            logger.error(f"Failed to connect to local MongoDB fallback: {e2}")
            # Last resort - keep the Atlas client, operations will timeout but app runs
            cls.client = AsyncIOMotorClient(
                mongo_url,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000
            )
            cls.db = cls.client[db_name]
            cls._connectivity_checked = True
    
    @classmethod
    def get_db(cls):
        """Get database instance - may need async check first"""
        if cls.db is None:
            # Synchronous initial setup - async check happens on first operation
            mongo_url = os.environ.get('MONGO_URL', LOCAL_MONGO_URL)
            db_name = os.environ.get('DB_NAME', 'raccoon_app')
            
            cls.client = AsyncIOMotorClient(
                mongo_url,
                maxPoolSize=50,
                minPoolSize=10,
                maxIdleTimeMS=45000,
                waitQueueTimeoutMS=10000,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=30000
            )
            cls.db = cls.client[db_name]
        return cls.db
    
    @classmethod
    async def get_db_async(cls):
        """Get database instance with connectivity check"""
        if not cls._connectivity_checked:
            await cls._check_and_fallback()
        return cls.db
    
    @classmethod
    async def create_indexes(cls):
        """Create database indexes for optimal query performance"""
        if cls._indexes_created:
            return
            
        db = cls.get_db()
        
        try:
            # Users collection indexes
            users = db.users
            await users.create_index("user_id", unique=True)
            await users.create_index("email", unique=True, sparse=True)
            await users.create_index("username", unique=True, sparse=True)
            await users.create_index("is_banned")
            await users.create_index("premium_status")
            await users.create_index("premium_expires_at")
            await users.create_index("account_status")
            await users.create_index("last_active")
            await users.create_index([("country_code", 1), ("gender", 1)])  # Compound for matching
            await users.create_index("created_at")
            
            # Guests collection indexes
            guests = db.guests
            await guests.create_index("guest_id", unique=True)
            await guests.create_index("is_banned")
            await guests.create_index("created_at")
            await guests.create_index([("country_code", 1), ("gender", 1)])
            
            # Sessions collection indexes
            sessions = db.sessions
            await sessions.create_index("session_id", unique=True)
            await sessions.create_index([("user1_id", 1), ("started_at", -1)])
            await sessions.create_index([("user2_id", 1), ("started_at", -1)])
            await sessions.create_index("started_at")
            await sessions.create_index("ended_at")
            await sessions.create_index("status")
            
            # Messages collection indexes
            messages = db.messages
            await messages.create_index([("session_id", 1), ("timestamp", 1)])
            await messages.create_index("sender_id")
            await messages.create_index("timestamp")
            
            # Reports collection indexes
            reports = db.reports
            await reports.create_index("report_id", unique=True)
            await reports.create_index("reporter_id")
            await reports.create_index("reported_id")
            await reports.create_index("status")
            await reports.create_index("created_at")
            await reports.create_index([("status", 1), ("created_at", -1)])  # For admin queue
            
            # Subscriptions collection indexes
            subscriptions = db.subscriptions
            await subscriptions.create_index([("user_id", 1), ("status", 1)])
            await subscriptions.create_index("stripe_subscription_id", sparse=True)
            await subscriptions.create_index("current_period_end")
            await subscriptions.create_index("status")
            
            # Admin logs collection indexes
            admin_logs = db.admin_logs
            await admin_logs.create_index([("admin_id", 1), ("timestamp", -1)])
            await admin_logs.create_index([("target_id", 1), ("timestamp", -1)])
            await admin_logs.create_index("action")
            await admin_logs.create_index("timestamp")
            
            # Blocked users collection indexes
            blocked_users = db.blocked_users
            await blocked_users.create_index([("blocker_id", 1), ("blocked_id", 1)], unique=True)
            await blocked_users.create_index("blocker_id")
            await blocked_users.create_index("blocked_id")
            
            # Matches collection indexes
            matches = db.matches
            await matches.create_index("match_id", unique=True)
            await matches.create_index([("user1_id", 1), ("created_at", -1)])
            await matches.create_index([("user2_id", 1), ("created_at", -1)])
            await matches.create_index("created_at")
            
            cls._indexes_created = True
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.error(f"Error creating indexes: {e}")
    
    @classmethod
    async def close_db(cls):
        if cls.client:
            cls.client.close()
            cls.client = None
            cls.db = None
            cls._indexes_created = False

# Collections
def get_database():
    return DatabaseService.get_db()

def get_users_collection():
    db = DatabaseService.get_db()
    return db.users

def get_guests_collection():
    db = DatabaseService.get_db()
    return db.guests

def get_matches_collection():
    db = DatabaseService.get_db()
    return db.matches

def get_messages_collection():
    db = DatabaseService.get_db()
    return db.messages

def get_blocked_users_collection():
    db = DatabaseService.get_db()
    return db.blocked_users

def get_reports_collection():
    db = DatabaseService.get_db()
    return db.reports

def get_sessions_collection():
    db = DatabaseService.get_db()
    return db.sessions
