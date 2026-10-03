import asyncio
import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

mongo_url = os.getenv("MONGODB_URI")

client = AsyncIOMotorClient(
    mongo_url,
    serverSelectionTimeoutMS=10000
)


async def test():
    await client.admin.command("ping")
    print("MongoDB connection successful")


asyncio.run(test())