"""
Database initialization script
This script creates default users and sets up the database structure
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from auth import get_password_hash
from bson import ObjectId

# Database configuration
MONGODB_URL = "mongodb://localhost:27017/"
DATABASE_NAME = "learning_system"

async def init_database():
    """Initialize the database with default data"""
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    print("Creating indexes...")
    
    # Create indexes for better performance
    await db.users.create_index("email", unique=True)
    await db.sessions.create_index("session_code", unique=True)
    await db.sessions.create_index("teacher_id")
    await db.sessions.create_index("is_active")
    await db.engagement_data.create_index([("session_id", 1), ("student_id", 1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    
    print("✓ Indexes created")
    
    # Check if admin user exists
    admin_exists = await db.users.find_one({"email": "admin@example.com"})
    
    if not admin_exists:
        print("\nCreating default users...")
        
        # Create default admin user
        admin_user = {
            "_id": str(ObjectId()),
            "email": "admin@example.com",
            "name": "Admin User",
            "role": "admin",
            "hashed_password": get_password_hash("admin123"),
            "created_at": datetime.utcnow(),
            "last_login": None,
            "phone": None,
            "location": None,
            "bio": "System Administrator",
            "title": "Administrator",
            "department": "IT",
            "avatar": None
        }
        
        # Create default teacher user
        teacher_user = {
            "_id": str(ObjectId()),
            "email": "teacher@example.com",
            "name": "John Teacher",
            "role": "teacher",
            "hashed_password": get_password_hash("teacher123"),
            "created_at": datetime.utcnow(),
            "last_login": None,
            "phone": None,
            "location": None,
            "bio": "Mathematics Teacher",
            "title": "Senior Teacher",
            "department": "Mathematics",
            "avatar": None
        }
        
        # Create default student user
        student_user = {
            "_id": str(ObjectId()),
            "email": "student@example.com",
            "name": "Jane Student",
            "role": "student",
            "hashed_password": get_password_hash("student123"),
            "created_at": datetime.utcnow(),
            "last_login": None,
            "phone": None,
            "location": None,
            "bio": "Computer Science Student",
            "title": "Student",
            "department": "Computer Science",
            "avatar": None
        }
        
        # Insert default users
        await db.users.insert_many([admin_user, teacher_user, student_user])
        
        print("✓ Default users created:")
        print("  Admin: admin@example.com / admin123")
        print("  Teacher: teacher@example.com / teacher123")
        print("  Student: student@example.com / student123")
    else:
        print("\n✓ Default users already exist")
    
    # Display statistics
    users_count = await db.users.count_documents({})
    sessions_count = await db.sessions.count_documents({})
    
    print(f"\nDatabase Statistics:")
    print(f"  Total Users: {users_count}")
    print(f"  Total Sessions: {sessions_count}")
    
    print("\n✓ Database initialization complete!")
    
    client.close()

if __name__ == "__main__":
    print("=" * 50)
    print("Learning System - Database Initialization")
    print("=" * 50)
    asyncio.run(init_database())
