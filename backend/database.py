from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import certifi
import ssl

class Database:
    client: AsyncIOMotorClient = None
    
database = Database()

async def get_database():
    return database.client[settings.DATABASE_NAME]

async def connect_to_mongo():
    """Connect to MongoDB on application startup"""
    # Use certifi for SSL certificates to fix SSL handshake issues on Windows
    database.client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=30000,
        connectTimeoutMS=30000,
        socketTimeoutMS=30000
    )
    print(f"Connected to MongoDB at {settings.MONGODB_URL}")
    
async def close_mongo_connection():
    """Close MongoDB connection on application shutdown"""
    database.client.close()
    print("Closed MongoDB connection")

