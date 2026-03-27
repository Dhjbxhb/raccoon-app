from motor.motor_asyncio import AsyncIOMotorClient
import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    client: Optional[AsyncIOMotorClient] = None
    db = None
    _indexes_created = False
    
    @classmethod
    def get_db(cls):
        if cls.db is None:
            mongo_url = os.environ['MONGO_URL']
            cls.client = AsyncIOMotorClient(
                mongo_url,
                maxPoolSize=50,  # Connection pool for performance
                minPoolSize=10,
                maxIdleTimeMS=45000,
                waitQueueTimeoutMS=10000,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=30000
            )
            cls.db = cls.client[os.environ['DB_NAME']]
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
