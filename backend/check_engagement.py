import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
from datetime import datetime

async def check():
    client = AsyncIOMotorClient('mongodb+srv://Learnsys:Learnsys@learnsys.vewigmh.mongodb.net/', tlsCAFile=certifi.where())
    db = client.learnsys
    
    # Test insert first
    test_doc = {
        "_id": "test_123",
        "student_id": "test_student",
        "session_id": "test_session",
        "emotion": "happy",
        "focus_level": 75,
        "timestamp": datetime.utcnow()
    }
    
    try:
        # Delete if exists
        await db.engagement_data.delete_one({"_id": "test_123"})
        
        # Insert
        result = await db.engagement_data.insert_one(test_doc)
        print(f"✅ Test insert successful: {result.inserted_id}")
        
        # Read back
        read_doc = await db.engagement_data.find_one({"_id": "test_123"})
        print(f"✅ Test read successful: {read_doc}")
        
        # Clean up
        await db.engagement_data.delete_one({"_id": "test_123"})
        print("✅ Test cleanup successful")
    except Exception as e:
        print(f"❌ Error during test: {e}")
    
    count = await db.engagement_data.count_documents({})
    print(f'\nTotal engagement records: {count}')
    
    sessions = await db.sessions.find({}).sort('created_at', -1).limit(3).to_list(3)
    for s in sessions:
        sid = s['_id']
        students = s.get("students", [])
        print(f'\nSession: {s.get("subject")} - {len(students)} students - active: {s.get("is_active")}')
        
        eng = await db.engagement_data.count_documents({'session_id': sid})
        print(f'  Engagement records: {eng}')
        
        if eng > 0:
            # Sample record
            sample = await db.engagement_data.find_one({'session_id': sid})
            print(f'  Sample: emotion={sample.get("emotion")}, focus={sample.get("focus_level")}, engagement={sample.get("engagement")}')

asyncio.run(check())
