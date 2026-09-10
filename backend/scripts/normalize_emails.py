"""
One-off migration: lower-case + trim every stored user email so that
case-insensitive login / password-reset lookups match existing accounts.

Safe to run more than once. Skips (and reports) any record whose normalized
email would collide with a different existing account.

Usage (from backend/):  python scripts/normalize_emails.py
"""

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "raccoon_app")


def normalize(email: str) -> str:
    return (email or "").strip().lower()


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    users = client[DB_NAME]["users"]

    scanned = updated = skipped_same = skipped_collision = 0

    async for user in users.find({"email": {"$type": "string", "$ne": ""}}, {"email": 1, "user_id": 1}):
        scanned += 1
        current = user["email"]
        norm = normalize(current)
        if norm == current:
            skipped_same += 1
            continue

        clash = await users.find_one(
            {"email": norm, "user_id": {"$ne": user["user_id"]}}, {"user_id": 1}
        )
        if clash:
            skipped_collision += 1
            print(f"SKIP collision: {current!r} -> {norm!r} already used by {clash['user_id']}")
            continue

        await users.update_one({"user_id": user["user_id"]}, {"$set": {"email": norm}})
        updated += 1
        print(f"updated: {current!r} -> {norm!r}")

    print(
        f"\nDone. scanned={scanned} updated={updated} "
        f"already_normalized={skipped_same} collisions_skipped={skipped_collision}"
    )
    client.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(1)
