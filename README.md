# Focus Sense

An online learning platform that measures student engagement in real time using **webcam-based
emotion detection** and **eye / gaze tracking**, layered on top of live teacher–student video
sessions. Teachers get a live engagement dashboard; students and teachers get post-session
reports.

Final Year Project.

---

## Features

- **Real-time engagement tracking** – per-student emotion + attention scores streamed over
  WebSockets while a session is running.
- **Emotion detection** – MediaPipe FaceMesh landmarks + a scikit-learn classifier
  (`emotion_model.joblib`), with glasses detection, distance adaptation and lighting
  compensation.
- **Eye / gaze tracking** – iris tracking via MediaPipe refined landmarks.
- **Live video calls** – teacher ↔ student video via Agora RTC.
- **Roles** – student, teacher, and admin, with JWT authentication.
- **Reports** – session analytics and PDF export (ReportLab / jsPDF).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Recharts, Framer Motion |
| Backend | FastAPI, Uvicorn, WebSockets |
| Database | MongoDB (via Motor) |
| CV / ML | OpenCV, MediaPipe, scikit-learn, NumPy |
| Video | Agora RTC (`agora-rtc-sdk-ng`, `agora-token-builder`) |
| Auth | JWT (python-jose), bcrypt (passlib) |

## Repository layout

```
Focus_Sense/
├── frontend/                 # Next.js app
├── backend/                  # FastAPI app
│   ├── main.py               # App entrypoint
│   ├── routers/              # API + WebSocket routes
│   ├── emotion_detector.py   # CV / emotion pipeline
│   └── models/               # ML model files (see note below)
└── AGORA_ARCHITECTURE.md     # Deep-dive on the Agora video integration
```

---

## Prerequisites

- **Node.js** 18+
- **Python** 3.9+
- **MongoDB** running locally (`mongodb://localhost:27017/`) or a connection string
- An **Agora** account for the App ID (https://console.agora.io)

## Getting the ML model

`backend/models/emotion_model.joblib` (~202 MB) is **not** stored in git. Download it from the
repository's [Releases](https://github.com/AnthonyFrancisSharu/Focus_Sense/releases) page and
place it at:

```
backend/models/emotion_model.joblib
```

`backend/models/label_encoder.joblib` is included in the repo.

---

## Setup

### 1. Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env        # then edit .env – set SECRET_KEY and any Agora values
```

Verify the CV setup and model files:

```bash
python check_setup.py
```

Run the API:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install

cp .env.local.example .env.local   # set NEXT_PUBLIC_AGORA_APP_ID and API URLs

npm run dev
```

App: http://localhost:3000

---

## Environment variables

**backend/.env** (see `backend/.env.example` and `backend/config.py`)

| Variable | Notes |
|---|---|
| `MONGODB_URL`, `DATABASE_NAME` | MongoDB connection |
| `SECRET_KEY` | JWT signing secret – **required** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime |
| `FRONTEND_URL` | CORS origin |
| `SMTP_*` | Optional – forgot-password emails |

**frontend/.env.local** (see `frontend/.env.local.example`)

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend HTTP URL |
| `NEXT_PUBLIC_WS_URL` | Backend WebSocket URL |
| `NEXT_PUBLIC_AGORA_APP_ID` | From the Agora console |
| `NEXT_PUBLIC_AGORA_TOKEN` | Leave empty for local dev |

> The CORS and trusted-host settings in `backend/main.py` are wide open (`allow_origins=["*"]`)
> for development. Restrict them before any public deployment.

## Documentation

- [AGORA_ARCHITECTURE.md](AGORA_ARCHITECTURE.md) – how the Agora video integration works.
- `backend/README.md` – backend API endpoint reference.
