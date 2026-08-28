# Learning System Backend API

FastAPI backend for the Learning System with Eye and Emotion Tracking.

## Setup

1. Install Python 3.8+
2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Make sure MongoDB is running on `mongodb://localhost:27017/`

6. Copy `.env.example` to `.env` and update the configuration

7. Run the server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

### Authentication
- POST /api/auth/signup - Register a new user
- POST /api/auth/login - Login user
- GET /api/auth/me - Get current user
- PUT /api/auth/profile - Update user profile
- PUT /api/auth/change-password - Change password

### Sessions (Teacher)
- POST /api/sessions/create - Create a new session
- POST /api/sessions/{session_id}/start - Start a session
- POST /api/sessions/{session_id}/end - End a session
- GET /api/sessions/teacher - Get teacher's sessions

### Sessions (Student)
- POST /api/sessions/join - Join a session with code
- GET /api/sessions/student - Get student's sessions
- POST /api/sessions/{session_id}/leave - Leave a session

### Admin
- GET /api/admin/users - Get all users
- GET /api/admin/sessions - Get all sessions
- GET /api/admin/stats - Get system statistics
- DELETE /api/admin/users/{user_id} - Delete user
- PUT /api/admin/users/{user_id}/role - Update user role

### WebSocket
- ws://localhost:8000/ws/session/{session_id}/teacher - Teacher session WebSocket
- ws://localhost:8000/ws/session/{session_id}/student/{student_id} - Student session WebSocket
