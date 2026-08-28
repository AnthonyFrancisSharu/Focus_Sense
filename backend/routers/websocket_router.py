from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, List, Optional
import json
import asyncio
from datetime import datetime
from database import get_database
from emotion_detector import EmotionDetector
import os
from websockets.exceptions import ConnectionClosedError, ConnectionClosedOK

router = APIRouter()

# WebSocket configuration
WS_PING_INTERVAL = 20  # Send ping every 20 seconds
WS_PING_TIMEOUT = 30   # Wait 30 seconds for pong response
WS_CLOSE_TIMEOUT = 5   # Wait 5 seconds for close handshake

# Initialize emotion detector (singleton)
emotion_detector = None

def get_emotion_detector():
    """Get or initialize the emotion detector"""
    global emotion_detector
    if emotion_detector is None:
        # Check if model files exist
        model_path = os.getenv("EMOTION_MODEL_PATH", "models/emotion_model.joblib")
        labels_path = os.getenv("EMOTION_LABELS_PATH", "models/label_encoder.joblib")
        
        if os.path.exists(model_path) and os.path.exists(labels_path):
            try:
                emotion_detector = EmotionDetector(model_path, labels_path)
                print("Emotion detector initialized successfully")
            except Exception as e:
                print(f"Warning: Could not initialize emotion detector: {e}")
                emotion_detector = None
        else:
            print(f"Warning: Model files not found. Emotion detection will be disabled.")
            print(f"  Expected: {model_path} and {labels_path}")
            emotion_detector = None
    
    return emotion_detector

# Connection manager for WebSockets
class ConnectionManager:
    def __init__(self):
        # Store connections by session_id -> role -> connections
        self.active_connections: Dict[str, Dict[str, List[WebSocket]]] = {}
        # Store last ping time for each connection
        self.last_ping: Dict[WebSocket, datetime] = {}
        # Store connection state
        self.connection_alive: Dict[WebSocket, bool] = {}
        # Store user info by WebSocket for retrieval on disconnect
        self.user_info: Dict[WebSocket, Dict] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str, role: str, user_id: str, user_name: str = None):
        """Connect a WebSocket client"""
        # Accept connection without origin checking (for development)
        await websocket.accept()
        
        if session_id not in self.active_connections:
            self.active_connections[session_id] = {"teacher": [], "students": []}
        
        self.active_connections[session_id][role].append(websocket)
        self.last_ping[websocket] = datetime.utcnow()
        self.connection_alive[websocket] = True
        # Store user info for later retrieval
        self.user_info[websocket] = {
            "user_id": user_id,
            "user_name": user_name,
            "session_id": session_id,
            "role": role
        }
        print(f"{role.capitalize()} {user_name or user_id} connected to session {session_id}")
    
    def get_user_info(self, websocket: WebSocket) -> Dict:
        """Get stored user info for a WebSocket connection"""
        return self.user_info.get(websocket, {})
    
    def disconnect(self, websocket: WebSocket, session_id: str, role: str, user_id: str):
        """Disconnect a WebSocket client"""
        # Clean up tracking
        if websocket in self.last_ping:
            del self.last_ping[websocket]
        if websocket in self.connection_alive:
            del self.connection_alive[websocket]
        if websocket in self.user_info:
            del self.user_info[websocket]
            
        if session_id in self.active_connections and role in self.active_connections[session_id]:
            if websocket in self.active_connections[session_id][role]:
                self.active_connections[session_id][role].remove(websocket)
                print(f"{role.capitalize()} {user_id} disconnected from session {session_id}")
            
            # Clean up empty session
            if (not self.active_connections[session_id]["teacher"] and 
                not self.active_connections[session_id]["students"]):
                del self.active_connections[session_id]
    
    def is_connected(self, websocket: WebSocket) -> bool:
        """Check if a WebSocket is still connected"""
        return self.connection_alive.get(websocket, False)
    
    def mark_disconnected(self, websocket: WebSocket):
        """Mark a WebSocket as disconnected"""
        self.connection_alive[websocket] = False
    
    async def safe_send_json(self, websocket: WebSocket, message: dict) -> bool:
        """Safely send JSON message, returns False if connection is dead"""
        if not self.is_connected(websocket):
            return False
        try:
            await asyncio.wait_for(
                websocket.send_json(message),
                timeout=5.0  # 5 second timeout for sending
            )
            return True
        except asyncio.TimeoutError:
            print(f"Timeout sending message to WebSocket")
            self.mark_disconnected(websocket)
            return False
        except (ConnectionClosedError, ConnectionClosedOK, WebSocketDisconnect) as e:
            print(f"Connection closed while sending: {e}")
            self.mark_disconnected(websocket)
            return False
        except Exception as e:
            print(f"Error sending to WebSocket: {e}")
            self.mark_disconnected(websocket)
            return False
    
    async def send_to_teacher(self, session_id: str, message: dict):
        """Send message to teacher in a session"""
        if session_id in self.active_connections:
            teacher_connections = self.active_connections[session_id]["teacher"]
            if not teacher_connections:
                print(f"⚠️ No teacher connections for session {session_id}")
                return
            dead_connections = []
            for connection in teacher_connections:
                success = await self.safe_send_json(connection, message)
                if not success:
                    dead_connections.append(connection)
                else:
                    msg_type = message.get("type")
                    if msg_type == "student_update":
                        print(f"✅ Sent student_update to teacher")
                    elif msg_type == "student_leave":
                        data = message.get('data', {})
                        print(f"✅ Sent student_leave to teacher: {data.get('student_name')} ({data.get('student_id')})")
            
            # Remove dead connections
            for conn in dead_connections:
                if conn in self.active_connections[session_id]["teacher"]:
                    self.active_connections[session_id]["teacher"].remove(conn)
        else:
            print(f"⚠️ Session {session_id} not in active_connections")
    
    async def send_to_students(self, session_id: str, message: dict):
        """Send message to all students in a session"""
        if session_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[session_id]["students"]:
                success = await self.safe_send_json(connection, message)
                if not success:
                    dead_connections.append(connection)
            
            # Remove dead connections
            for conn in dead_connections:
                if conn in self.active_connections[session_id]["students"]:
                    self.active_connections[session_id]["students"].remove(conn)
    
    async def send_to_all(self, session_id: str, message: dict):
        """Send message to everyone in a session"""
        await self.send_to_teacher(session_id, message)
        await self.send_to_students(session_id, message)
    
    async def broadcast_student_update(self, session_id: str, student_data: dict):
        """Broadcast student data update to teacher"""
        message = {
            "type": "student_update",
            "data": student_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        print(f"🔔 Broadcasting student update for session {session_id}: {student_data.get('student_name')} - {student_data.get('emotion')}/{student_data.get('focus_level')}%")
        await self.send_to_teacher(session_id, message)

manager = ConnectionManager()

# Per-connection frame processing flags (skip-if-busy) and engagement write buffers
_frame_processing: Dict[str, bool] = {}
_engagement_buffer: Dict[str, list] = {}

@router.websocket("/ws/session/{session_id}/teacher/{teacher_id}")
async def teacher_websocket(websocket: WebSocket, session_id: str, teacher_id: str):
    """WebSocket endpoint for teachers"""
    db = await get_database()
    
    # Verify session exists
    session = await db.sessions.find_one({"_id": session_id})
    if not session:
        await websocket.close(code=1008, reason="Session not found")
        return
    
    # Verify teacher owns the session (compare with session's teacher_id)
    # Accept connection for now - authentication is handled by JWT at session creation
    # This allows teachers to connect with their name or ID
    
    await manager.connect(websocket, session_id, "teacher", teacher_id)
    
    try:
        # Fetch fresh session data with all students
        session = await db.sessions.find_one({"_id": session_id})
        
        # Serialize students data (convert datetime objects to strings)
        serialized_students = []
        for student in session.get("students", []):
            s = {
                "id": student.get("id"),
                "name": student.get("name"),
                "email": student.get("email"),
                "emotion": student.get("emotion"),
                "engagement": student.get("engagement"),
                "focus_level": student.get("focus_level")
            }
            if student.get("joined_at"):
                s["joined_at"] = student["joined_at"].isoformat() if hasattr(student["joined_at"], 'isoformat') else str(student["joined_at"])
            serialized_students.append(s)
        
        # Send initial session data with all currently enrolled students
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to session as teacher",
            "session": {
                "id": session["_id"],
                "code": session["session_code"],
                "subject": session["subject"],
                "students": serialized_students
            }
        })
        
        # Send initial student updates for all connected students
        for student in session.get("students", []):
            await manager.broadcast_student_update(session_id, {
                "student_id": student["id"],
                "student_name": student["name"],
                "status": "connected",
                "emotion": student.get("emotion"),
                "engagement": student.get("engagement"),
                "focus_level": student.get("focus_level")
            })
        
        while True:
            # Receive messages from teacher with timeout
            try:
                # Use asyncio.wait_for to add timeout to receive
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=WS_PING_TIMEOUT + 10  # Allow extra time beyond ping timeout
                )
            except asyncio.TimeoutError:
                # No message received in timeout period, check if connection is alive
                try:
                    await websocket.send_json({"type": "ping", "timestamp": datetime.utcnow().isoformat()})
                    continue
                except Exception:
                    print(f"Teacher {teacher_id} connection timed out")
                    break
            except (ConnectionClosedError, ConnectionClosedOK) as e:
                print(f"Teacher WebSocket connection closed: {e}")
                break
            
            message_type = data.get("type")
            
            if message_type == "session_update":
                # Broadcast session update to all students
                await manager.send_to_students(session_id, {
                    "type": "session_update",
                    "data": data.get("data"),
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            elif message_type == "session_ended":
                # Broadcast session ended to all students
                await manager.send_to_students(session_id, {
                    "type": "session_ended",
                    "message": "Teacher has ended the session",
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            elif message_type == "ping":
                # Respond to ping
                manager.last_ping[websocket] = datetime.utcnow()
                try:
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                except Exception as e:
                    print(f"Error sending pong to teacher: {e}")
                    break
    
    except WebSocketDisconnect:
        print(f"Teacher {teacher_id} disconnected normally")
        manager.disconnect(websocket, session_id, "teacher", teacher_id)
    except (ConnectionClosedError, ConnectionClosedOK) as e:
        print(f"Teacher WebSocket closed: {e}")
        manager.disconnect(websocket, session_id, "teacher", teacher_id)
    except Exception as e:
        print(f"Error in teacher WebSocket: {e}")
        import traceback
        traceback.print_exc()
        manager.disconnect(websocket, session_id, "teacher", teacher_id)

@router.websocket("/ws/session/{session_id}/student/{student_id}")
async def student_websocket(websocket: WebSocket, session_id: str, student_id: str):
    """WebSocket endpoint for students"""
    db = await get_database()
    
    # Check if this is a mock session (for development/testing)
    is_mock_session = session_id.startswith("mock_session_")
    
    # Variable to store student name for caching
    student_name_for_cache = "Unknown"
    
    if not is_mock_session:
        # Verify session exists
        session = await db.sessions.find_one({"_id": session_id})
        if not session:
            await websocket.close(code=1008, reason="Session not found")
            return
        
        # Check if student is in session (authentication already done at join time)
        # Accept connection if student exists in session
        student_in_session = next((s for s in session["students"] if s["id"] == student_id), None)
        if student_in_session:
            student_name_for_cache = student_in_session.get("name", "Unknown")
        else:
            # Student might have just joined, allow connection anyway
            print(f"Warning: Student {student_id} not found in session, but allowing connection")
    else:
        # Mock session - create a fake session object
        session = {
            "_id": session_id,
            "session_code": "MOCK",
            "subject": "Mock Session",
            "teacher_name": "Mock Teacher",
            "students": []
        }
        student_name_for_cache = f"MockStudent_{student_id[:8]}"
        print(f"Mock session detected: {session_id}, allowing connection for testing")
    
    # Connect with student name cached for later use (e.g., when they disconnect)
    await manager.connect(websocket, session_id, "students", student_id, student_name_for_cache)
    print(f"🔗 Student {student_name_for_cache} ({student_id}) connected and cached")
    
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to session as student",
            "session": {
                "id": session["_id"],
                "code": session["session_code"],
                "subject": session["subject"],
                "teacher": session["teacher_name"]
            }
        })
        
        # Notify teacher that student has connected
        if not is_mock_session:
            # Get student info from session
            student_info = next((s for s in session["students"] if s["id"] == student_id), None)
            if student_info:
                # Send initial update with default values if not yet available
                await manager.broadcast_student_update(session_id, {
                    "student_id": student_id,
                    "student_name": student_info["name"],
                    "status": "connected",
                    "emotion": student_info.get("emotion") or "neutral",
                    "engagement": student_info.get("engagement") or "passive",
                    "focus_level": student_info.get("focus_level") if student_info.get("focus_level") is not None else 50
                })
                print(f"Student {student_info['name']} connected - sent initial update to teacher")
        
        while True:
            # Receive messages from student with timeout
            try:
                # Use asyncio.wait_for to add timeout to receive
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=WS_PING_TIMEOUT + 10  # Allow extra time beyond ping timeout
                )
            except asyncio.TimeoutError:
                # No message received in timeout period, check if connection is alive
                try:
                    await websocket.send_json({"type": "ping", "timestamp": datetime.utcnow().isoformat()})
                    continue
                except Exception:
                    print(f"Student {student_id} connection timed out")
                    break
            except WebSocketDisconnect:
                print(f"WebSocket disconnected for {student_id}")
                break
            except (ConnectionClosedError, ConnectionClosedOK) as e:
                print(f"Student WebSocket connection closed: {e}")
                break
            except Exception as e:
                # Log error but continue - don't break connection for processing errors
                print(f"Error receiving message from {student_id}: {e}")
                # Check if connection is still alive
                if not manager.is_connected(websocket):
                    break
                continue
            
            message_type = data.get("type")
            
            if message_type == "ping":
                # Respond to ping to keep connection alive
                manager.last_ping[websocket] = datetime.utcnow()
                try:
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                except Exception as e:
                    print(f"Error sending pong to student: {e}")
                    break
                continue
            
            if message_type == "video_frame":
                # Process video frame for emotion detection
                detector = get_emotion_detector()
                print(f"🎥 Processing video frame for {student_id}, is_mock={is_mock_session}, detector={detector is not None}")
                if detector:
                    try:
                        frame_data = data.get("frame")  # Base64 encoded image
                        if frame_data:
                            # Skip frame if previous inference is still running for this student
                            proc_key = f"{session_id}:{student_id}"
                            if _frame_processing.get(proc_key):
                                continue
                            _frame_processing[proc_key] = True
                            try:
                                loop = asyncio.get_event_loop()
                                emotion_result = await loop.run_in_executor(
                                    None, detector.process_base64_frame, frame_data
                                )
                            finally:
                                _frame_processing[proc_key] = False

                            # Only log when face is detected to reduce console spam
                            if emotion_result.get('face_detected'):
                                print(f"Emotion result for {student_id}:")
                                print(f"  - Emotion: {emotion_result.get('emotion')}")
                                print(f"  - Focused Gaze: {emotion_result.get('is_focused_gaze')}")
                                print(f"  - Gaze Direction: {emotion_result.get('gaze_direction')}")
                                print(f"  - Eye Openness: {emotion_result.get('eye_openness')}")

                            # Update student live state in session (per-frame, needed for teacher dashboard)
                            print(f"💾 About to save, is_mock_session={is_mock_session}")
                            if not is_mock_session:
                                await db.sessions.update_one(
                                    {
                                        "_id": session_id,
                                        "students.id": student_id
                                    },
                                    {
                                        "$set": {
                                            "students.$.emotion": emotion_result.get("emotion"),
                                            "students.$.engagement": emotion_result.get("engagement"),
                                            "students.$.focus_level": emotion_result.get("focus_level")
                                        }
                                    }
                                )

                                # Buffer engagement history and flush every 10 records (~5s at 2fps)
                                from bson import ObjectId
                                engagement_history = {
                                    "_id": str(ObjectId()),
                                    "student_id": student_id,
                                    "session_id": session_id,
                                    "emotion": emotion_result.get("emotion"),
                                    "raw_emotion": emotion_result.get("raw_emotion"),
                                    "confidence": emotion_result.get("confidence"),
                                    "engagement": emotion_result.get("engagement"),
                                    "focus_level": emotion_result.get("focus_level"),
                                    "face_detected": emotion_result.get("face_detected"),
                                    "pose": emotion_result.get("pose", {}),
                                    "timestamp": datetime.utcnow()
                                }
                                buf = _engagement_buffer.setdefault(session_id, [])
                                buf.append(engagement_history)
                                if len(buf) >= 10:
                                    records = _engagement_buffer.pop(session_id)
                                    try:
                                        await db.engagement_data.insert_many(records)
                                        print(f"📊 Batch saved {len(records)} engagement records for session {session_id}")
                                    except Exception as db_err:
                                        print(f"❌ Error batch saving engagement data: {db_err}")
                            else:
                                # Only log mock results when face is detected
                                if emotion_result.get('face_detected'):
                                    print(f"Mock session - emotion result: {emotion_result}")

                            # Send result back to student (always send, even if no face detected)
                            send_success = await manager.safe_send_json(websocket, {
                                "type": "emotion_result",
                                "data": emotion_result,
                                "timestamp": datetime.utcnow().isoformat()
                            })

                            if not send_success:
                                print(f"Failed to send emotion result to student {student_id}, connection may be closed")
                                break

                            # Broadcast to teacher (skip for mock sessions)
                            if not is_mock_session:
                                student_info = next((s for s in session["students"] if s["id"] == student_id), None)
                                if student_info:
                                    update_data = {
                                        "student_id": student_id,
                                        "student_name": student_info["name"],
                                        "student_email": student_info.get("email"),
                                        "emotion": emotion_result.get("emotion"),
                                        "engagement": emotion_result.get("engagement"),
                                        "focus_level": emotion_result.get("focus_level"),
                                        "face_detected": emotion_result.get("face_detected"),
                                        "gaze_direction": emotion_result.get("gaze_direction"),
                                        "is_focused_gaze": emotion_result.get("is_focused_gaze")
                                    }

                                    print(f"📤 Broadcasting to teacher: {student_info['name']} - Emotion: {update_data['emotion']}, Focus: {update_data['focus_level']}%, Engagement: {update_data['engagement']}, Face: {update_data['face_detected']}")

                                    await manager.broadcast_student_update(session_id, update_data)
                    except Exception as e:
                        # Log error but don't break connection - continue processing
                        print(f"Error processing video frame: {e}")
                        import traceback
                        traceback.print_exc()
                        # Send error but keep connection alive
                        try:
                            send_success = await manager.safe_send_json(websocket, {
                                "type": "error",
                                "message": f"Error processing frame: {str(e)}",
                                "timestamp": datetime.utcnow().isoformat()
                            })
                            if not send_success:
                                print(f"Connection lost while sending error to student {student_id}")
                                break
                        except Exception:
                            pass  # If send fails, just continue
            
            elif message_type == "engagement_update":
                # Update engagement data in database
                engagement_data = data.get("data")
                
                # Update student in session
                await db.sessions.update_one(
                    {
                        "_id": session_id,
                        "students.id": student_id
                    },
                    {
                        "$set": {
                            "students.$.emotion": engagement_data.get("emotion"),
                            "students.$.engagement": engagement_data.get("engagement"),
                            "students.$.focus_level": engagement_data.get("focus_level")
                        }
                    }
                )
                
                # Store in engagement history
                from bson import ObjectId
                engagement_history = {
                    "_id": str(ObjectId()),
                    "student_id": student_id,
                    "session_id": session_id,
                    "emotion": engagement_data.get("emotion"),
                    "engagement": engagement_data.get("engagement"),
                    "focus_level": engagement_data.get("focus_level"),
                    "timestamp": datetime.utcnow()
                }
                await db.engagement_data.insert_one(engagement_history)
                
                # Broadcast to teacher
                student_info = next((s for s in session["students"] if s["id"] == student_id), None)
                if student_info:
                    await manager.broadcast_student_update(session_id, {
                        "student_id": student_id,
                        "student_name": student_info["name"],
                        **engagement_data
                    })
            
            elif message_type == "ping":
                # Respond to ping
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat()
                })
    
    except WebSocketDisconnect:
        print(f"📤 Student {student_id} disconnected from session {session_id}")
        # Get student name from cache (set when they connected)
        cached_info = manager.get_user_info(websocket)
        student_name = cached_info.get("user_name", "Unknown")
        print(f"📋 Using cached student name: {student_name}")
        
        # Try to remove from database if they haven't already left via API
        should_notify = False
        try:
            if not is_mock_session:
                result = await db.sessions.update_one(
                    {"_id": session_id},
                    {"$pull": {"students": {"id": student_id}}}
                )
                await db.sessions.update_one(
                    {
                        "_id": session_id,
                        "participants.id": student_id
                    },
                    {
                        "$set": {
                            "participants.$.last_left_at": datetime.utcnow()
                        }
                    }
                )
                if result.modified_count > 0:
                    print(f"✅ Removed student {student_name} from session database")
                    should_notify = True  # Only notify if we actually removed them
                else:
                    print(f"ℹ️ Student {student_name} already removed from database (left via API - notification already sent)")
        except Exception as db_err:
            print(f"Error removing student from database: {db_err}")
        
        # Notify teacher that student left (only if they weren't already removed via API)
        if should_notify:
            try:
                await manager.send_to_teacher(session_id, {
                    "type": "student_leave",
                    "data": {
                        "student_id": student_id,
                        "student_name": student_name,
                        "timestamp": datetime.utcnow().isoformat(),
                        "source": "websocket"
                    }
                })
                print(f"📨 Sent student_leave notification to teacher for {student_name}")
            except Exception as notify_err:
                print(f"Could not notify teacher of student leave: {notify_err}")
        manager.disconnect(websocket, session_id, "students", student_id)
    except (ConnectionClosedError, ConnectionClosedOK) as e:
        print(f"Student WebSocket connection closed: {e}")
        # Get student name from cache
        cached_info = manager.get_user_info(websocket)
        student_name = cached_info.get("user_name", "Unknown")
        
        # Try to remove from database if they haven't already left via API
        should_notify = False
        try:
            if not is_mock_session:
                result = await db.sessions.update_one(
                    {"_id": session_id},
                    {"$pull": {"students": {"id": student_id}}}
                )
                await db.sessions.update_one(
                    {
                        "_id": session_id,
                        "participants.id": student_id
                    },
                    {
                        "$set": {
                            "participants.$.last_left_at": datetime.utcnow()
                        }
                    }
                )
                if result.modified_count > 0:
                    print(f"✅ Removed student {student_name} from session database")
                    should_notify = True
                else:
                    print(f"ℹ️ Student {student_name} already removed (left via API)")
        except Exception as db_err:
            print(f"Error removing student from database: {db_err}")
        
        # Notify teacher that student left (only if they weren't already removed via API)
        if should_notify:
            try:
                await manager.send_to_teacher(session_id, {
                    "type": "student_leave",
                    "data": {
                        "student_id": student_id,
                        "student_name": student_name,
                        "timestamp": datetime.utcnow().isoformat(),
                        "source": "websocket"
                    }
                })
            except Exception as notify_err:
                print(f"Could not notify teacher of student leave: {notify_err}")
        manager.disconnect(websocket, session_id, "students", student_id)
    except Exception as e:
        print(f"Error in student WebSocket: {e}")
        import traceback
        traceback.print_exc()
        # Get student name from cache
        cached_info = manager.get_user_info(websocket)
        student_name = cached_info.get("user_name", "Unknown")
        
        # Try to remove from database if they haven't already left via API
        should_notify = False
        try:
            if not is_mock_session:
                result = await db.sessions.update_one(
                    {"_id": session_id},
                    {"$pull": {"students": {"id": student_id}}}
                )
                await db.sessions.update_one(
                    {
                        "_id": session_id,
                        "participants.id": student_id
                    },
                    {
                        "$set": {
                            "participants.$.last_left_at": datetime.utcnow()
                        }
                    }
                )
                if result.modified_count > 0:
                    print(f"✅ Removed student {student_name} from session database")
                    should_notify = True
                else:
                    print(f"ℹ️ Student {student_name} already removed (left via API)")
        except Exception as db_err:
            print(f"Error removing student from database: {db_err}")
        
        # Notify teacher that student left (only if they weren't already removed via API)
        if should_notify:
            try:
                await manager.send_to_teacher(session_id, {
                    "type": "student_leave",
                    "data": {
                        "student_id": student_id,
                        "student_name": student_name,
                        "timestamp": datetime.utcnow().isoformat(),
                        "source": "websocket"
                    }
                })
            except Exception as notify_err:
                print(f"Could not notify teacher of student leave: {notify_err}")
        manager.disconnect(websocket, session_id, "students", student_id)
