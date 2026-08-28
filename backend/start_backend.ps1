# Start Backend Server
Write-Host "Starting Learning System Backend..." -ForegroundColor Green

# Check if virtual environment exists
if (Test-Path ".venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & .venv\Scripts\Activate.ps1
} else {
    Write-Host "Virtual environment not found. Creating..." -ForegroundColor Yellow
    python -m venv .venv
    & .venv\Scripts\Activate.ps1
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# Check if model files exist
if (-not (Test-Path "models\emotion_model.joblib") -or -not (Test-Path "models\label_encoder.joblib")) {
    Write-Host "WARNING: Emotion model files not found in models/ directory" -ForegroundColor Red
    Write-Host "Emotion detection will be disabled until models are added" -ForegroundColor Yellow
}

# Start the server
Write-Host "Starting FastAPI server on http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

uvicorn main:app --reload --host 0.0.0.0 --port 8000
