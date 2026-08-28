#!/bin/bash

# Setup script for backend (Linux/Mac)
echo "Setting up Learning System Backend..."

# Check if Python is installed
echo ""
echo "Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✓ Python is installed: $PYTHON_VERSION"
else
    echo "✗ Python is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if MongoDB is running
echo ""
echo "Checking MongoDB connection..."
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.version()" --quiet &> /dev/null; then
        echo "✓ MongoDB is running"
    else
        echo "⚠ MongoDB might not be running. Please ensure MongoDB is running on localhost:27017"
    fi
else
    echo "⚠ Could not verify MongoDB. Please ensure MongoDB is running on localhost:27017"
fi

# Create virtual environment
echo ""
echo "Creating virtual environment..."
if [ -d "venv" ]; then
    echo "Virtual environment already exists"
else
    python3 -m venv venv
    echo "✓ Virtual environment created"
fi

# Activate virtual environment
echo ""
echo "Activating virtual environment..."
source venv/bin/activate
echo "✓ Virtual environment activated"

# Install dependencies
echo ""
echo "Installing dependencies..."
pip install -r requirements.txt
if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed successfully"
else
    echo "✗ Failed to install dependencies"
    exit 1
fi

# Check if .env file exists
echo ""
echo "Checking environment configuration..."
if [ -f ".env" ]; then
    echo "✓ .env file exists"
else
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "✓ .env file created. Please update the SECRET_KEY in .env file!"
fi

echo ""
echo "========================================"
echo "Backend setup complete!"
echo "========================================"
echo ""
echo "To start the backend server, run:"
echo "  uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "Or simply run:"
echo "  python main.py"
echo ""
echo "API Documentation will be available at:"
echo "  http://localhost:8000/docs"
echo "========================================"
echo ""
