"""
Quick script to verify emotion detection setup
Run this to check if your model files are correctly placed and loadable
"""
import os
import sys

def check_setup():
    print("=" * 60)
    print("Emotion Detection Setup Checker")
    print("=" * 60)
    
    # Check if we're in backend directory
    if not os.path.exists('emotion_detector.py'):
        print("\n❌ Error: Run this script from the backend directory")
        print("   cd backend && python check_setup.py")
        return False
    
    print("\n✓ Running from correct directory")
    
    # Check model files
    model_path = os.getenv("EMOTION_MODEL_PATH", "models/emotion_model.joblib")
    labels_path = os.getenv("EMOTION_LABELS_PATH", "models/label_encoder.joblib")
    
    print(f"\nChecking for model files:")
    print(f"  Model path: {model_path}")
    print(f"  Labels path: {labels_path}")
    
    model_exists = os.path.exists(model_path)
    labels_exist = os.path.exists(labels_path)
    
    if model_exists:
        print(f"  ✓ Model file found")
    else:
        print(f"  ❌ Model file NOT found at {model_path}")
    
    if labels_exist:
        print(f"  ✓ Labels file found")
    else:
        print(f"  ❌ Labels file NOT found at {labels_path}")
    
    if not (model_exists and labels_exist):
        print("\n" + "=" * 60)
        print("MODEL FILES MISSING")
        print("=" * 60)
        print("\nYou need to provide trained model files:")
        print("  1. Create backend/models/ directory:")
        print("     mkdir models")
        print("\n  2. Copy your trained model files:")
        print("     - emotion_model.joblib")
        print("     - label_encoder.joblib")
        print("\n  3. Place them in backend/models/")
        print("\nOr set environment variables:")
        print("  EMOTION_MODEL_PATH=path/to/your/model.joblib")
        print("  EMOTION_LABELS_PATH=path/to/your/labels.joblib")
        return False
    
    # Try loading dependencies
    print("\nChecking Python dependencies:")
    
    deps = {
        'cv2': 'opencv-python',
        'mediapipe': 'mediapipe',
        'sklearn': 'scikit-learn',
        'joblib': 'joblib',
        'numpy': 'numpy'
    }
    
    missing = []
    for module, package in deps.items():
        try:
            __import__(module)
            print(f"  ✓ {package}")
        except ImportError:
            print(f"  ❌ {package} - NOT INSTALLED")
            missing.append(package)
    
    if missing:
        print("\n" + "=" * 60)
        print("MISSING DEPENDENCIES")
        print("=" * 60)
        print("\nInstall missing packages:")
        print(f"  pip install {' '.join(missing)}")
        print("\nOr install all requirements:")
        print("  pip install -r requirements.txt")
        return False
    
    # Try loading the model
    print("\nTesting model loading:")
    try:
        import joblib
        model = joblib.load(model_path)
        le = joblib.load(labels_path)
        print(f"  ✓ Model loaded successfully")
        print(f"  ✓ Label encoder loaded successfully")
        
        # Check if model has predict method
        if hasattr(model, 'predict'):
            print(f"  ✓ Model has predict() method")
        else:
            print(f"  ⚠ Warning: Model doesn't have predict() method")
        
        # Show supported emotions
        if hasattr(le, 'classes_'):
            emotions = le.classes_
            print(f"\n  Supported emotions ({len(emotions)}):")
            for i, emotion in enumerate(emotions, 1):
                print(f"    {i}. {emotion}")
        
    except Exception as e:
        print(f"  ❌ Error loading model: {e}")
        return False
    
    # Try initializing EmotionDetector
    print("\nTesting EmotionDetector initialization:")
    try:
        from emotion_detector import EmotionDetector
        detector = EmotionDetector(model_path, labels_path)
        print(f"  ✓ EmotionDetector initialized successfully")
    except Exception as e:
        print(f"  ❌ Error initializing EmotionDetector: {e}")
        return False
    
    # Success!
    print("\n" + "=" * 60)
    print("✓ SETUP COMPLETE - READY FOR EMOTION DETECTION!")
    print("=" * 60)
    print("\nYou can now:")
    print("  1. Start the backend: uvicorn main:app --reload")
    print("  2. Test the API: http://localhost:8000/api/emotion/health")
    print("  3. Use in sessions: Join a session and grant camera access")
    
    return True

if __name__ == "__main__":
    success = check_setup()
    sys.exit(0 if success else 1)
