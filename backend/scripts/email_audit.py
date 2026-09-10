"""Read-only: quick picture of how accounts are split by sign-in method and
whether they have an email on file. Prints no full addresses."""

import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
db = client[os.environ.get("DB_NAME", "raccoon_app")]


async def main():
    users = db["users"]
    total = await users.count_documents({})
    with_email = await users.count_documents({"email": {"$type": "string", "$ne": ""}})
    no_email = total - with_email
    print(f"users total={total}  with_email={with_email}  no_email={no_email}")

    print("\nby login_method:")
    async for row in users.aggregate([{"$group": {"_id": "$login_method", "n": {"$sum": 1}}}]):
        print(f"  {row['_id']!r}: {row['n']}")

    print("\nby email domain (with_email only):")
    async for row in users.aggregate([
        {"$match": {"email": {"$type": "string", "$ne": ""}}},
        {"$project": {"domain": {"$arrayElemAt": [{"$split": ["$email", "@"]}, 1]}}},
        {"$group": {"_id": "$domain", "n": {"$sum": 1}}},
        {"$sort": {"n": -1}},
    ]):
        print(f"  {row['_id']}: {row['n']}")

    print("\nemail_verified split:")
    v = await users.count_documents({"email_verified": True})
    print(f"  verified={v}  unverified={with_email - v}")

    client.close()


asyncio.run(main())
