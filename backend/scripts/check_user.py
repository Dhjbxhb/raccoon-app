"""Read-only: inspect a specific user/guest's profile-display-relevant fields
(no full email/PII beyond username printed)."""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
db = client[os.environ.get("DB_NAME", "raccoon_app")]


async def main(username: str):
    users = db["users"]
    guests = db["guests"]

    fields = {
        "_id": 0, "user_id": 1, "guest_id": 1, "username": 1, "avatar_url": 1,
        "photo_url": 1, "date_of_birth": 1, "gender": 1, "country": 1,
        "country_code": 1, "profile_completed": 1, "is_guest": 1,
    }

    u = await users.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}}, fields)
    if u:
        print("USER:", u)
    else:
        print("Not found in users collection")

    g = await guests.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}}, fields)
    if g:
        print("GUEST:", g)

    client.close()


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else "Saif"))
