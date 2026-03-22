from motor.motor_asyncio import AsyncIOMotorClient
import os
from typing import Optional

class DatabaseService:
    client: Optional[AsyncIOMotorClient] = None
    db = None
    
    @classmethod
    def get_db(cls):
        if cls.db is None:
            mongo_url = os.environ['MONGO_URL']
            cls.client = AsyncIOMotorClient(mongo_url)
            cls.db = cls.client[os.environ['DB_NAME']]
        return cls.db
    
    @classmethod
    async def close_db(cls):
        if cls.client:
            cls.client.close()

# Collections
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
