import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()

mongo_url=os.getenv("MONGODB_URI")
client=AsyncIOMotorClient(mongo_url)
db=client.get_database("carevault")

async def create_indexes():
    await db.doctors.create_index(
        "email",unique=True
    )