# Setup script for backend
Write-Host "Setting up Learning System Backend..." -ForegroundColor Green

# Check if Python is installed
Write-Host "`nChecking Python installation..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Python is installed: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Python is not installed. Please install Python 3.8 or higher." -ForegroundColor Red
    exit 1
}

# Check if MongoDB is running
Write-Host "`nChecking MongoDB connection..." -ForegroundColor Yellow
try {
    $mongoTest = mongosh --eval "db.version()" --quiet 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ MongoDB is running" -ForegroundColor Green
    } else {
        Write-Host "⚠ MongoDB might not be running. Please ensure MongoDB is running on localhost:27017" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not verify MongoDB. Please ensure MongoDB is running on localhost:27017" -ForegroundColor Yellow
}

# Create virtual environment
Write-Host "`nCreating virtual environment..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Write-Host "Virtual environment already exists" -ForegroundColor Cyan
} else {
    python -m venv venv
    Write-Host "✓ Virtual environment created" -ForegroundColor Green
}

# Activate virtual environment
Write-Host "`nActivating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1
Write-Host "✓ Virtual environment activated" -ForegroundColor Green

# Install dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Check if .env file exists
Write-Host "`nChecking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✓ .env file exists" -ForegroundColor Green
} else {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ .env file created. Please update the SECRET_KEY in .env file!" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Backend setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nTo start the backend server, run:" -ForegroundColor Yellow
Write-Host "  uvicorn main:app --reload --host 0.0.0.0 --port 8000" -ForegroundColor White
Write-Host "`nOr simply run:" -ForegroundColor Yellow
Write-Host "  python main.py" -ForegroundColor White
Write-Host "`nAPI Documentation will be available at:" -ForegroundColor Yellow
Write-Host "  http://localhost:8000/docs" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Cyan
