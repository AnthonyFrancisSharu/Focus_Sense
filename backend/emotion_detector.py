"""
Emotion Detection Module for Real-time Processing with Enhanced Eye Tracking
Adapted from live_emotion_inference.py for backend integration
Integrated with advanced gaze tracking including glasses detection, distance adaptation, and lighting compensation
"""
import cv2
import math
import joblib
import base64
import numpy as np
from collections import deque, Counter
from typing import Dict, List, Tuple, Optional
import mediapipe as mp
import time

mp_face_mesh = mp.solutions.face_mesh

# -----------------------------
# MUST match training feature order (without 'emotion')
# -----------------------------
FEATURE_ORDER = [
    'mouth_movement', 'mouth_aspect_ratio', 'lip_corner_distance', 'jaw_drop',
    'left_eye_movement', 'right_eye_movement', 'left_eyebrow_movement', 'right_eyebrow_movement',
    'left_eyebrow_slope', 'right_eyebrow_slope', 'eyebrow_asymmetry', 'nostril_flare',
    'nose_tip_movement', 'left_cheek_position', 'right_cheek_position', 'jaw_width',
    'mouth_eye_ratio', 'pose_yaw', 'pose_pitch', 'pose_roll', 'left_eye_ear',
    'right_eye_ear', 'eye_asymmetry', 'interocular_norm', 'mouth_corner_slope',
    'mouth_curvature', 'smile_intensity', 'brow_eye_dist_left',
    'brow_eye_dist_right', 'brow_eye_asymmetry', 'cheek_asymmetry', 'jaw_angle_deg',
    'nose_to_mouth', 'nose_to_chin_norm', 'face_width_norm', 'face_height_norm', 'face_wh_ratio'
]

# -----------------------------
# Math / geometry helpers
# -----------------------------
def safe_L(landmarks: List[Tuple[int,int,float]], i: int) -> Optional[Tuple[int,int,float]]:
    return None if (i < 0 or i >= len(landmarks)) else landmarks[i]

def sdist(a: Optional[Tuple[int,int,float]], b: Optional[Tuple[int,int,float]]) -> Optional[float]:
    if a is None or b is None:
        return None
    return math.hypot(b[0] - a[0], b[1] - a[1])

def sratio(num: Optional[float], den: Optional[float]) -> float:
    if num is None or den in (None, 0):
        return 0.0
    return float(num) / float(den)

def angle_deg(a: Optional[Tuple[int,int,float]], 
              b: Optional[Tuple[int,int,float]], 
              c: Optional[Tuple[int,int,float]]) -> float:
    if a is None or b is None or c is None:
        return 0.0
    v1 = (a[0]-b[0], a[1]-b[1])
    v2 = (c[0]-b[0], c[1]-b[1])
    n1 = math.hypot(*v1); n2 = math.hypot(*v2)
    if n1 == 0 or n2 == 0:
        return 0.0
    cosang = max(-1.0, min(1.0, (v1[0]*v2[0] + v1[1]*v2[1]) / (n1*n2)))
    return math.degrees(math.acos(cosang))

def point_line_signed_distance(p: Optional[Tuple[int,int,float]],
                               a: Optional[Tuple[int,int,float]],
                               b: Optional[Tuple[int,int,float]]) -> float:
    if p is None or a is None or b is None:
        return 0.0
    x0,y0 = p[0], p[1]
    x1,y1 = a[0], a[1]
    x2,y2 = b[0], b[1]
    A = y1 - y2
    B = x2 - x1
    C = x1*y2 - x2*y1
    denom = math.hypot(A, B)
    if denom == 0:
        return 0.0
    return (A*x0 + B*y0 + C) / denom

# -----------------------------
# Head pose estimation via solvePnP
# -----------------------------
def estimate_head_pose(landmarks: List[Tuple[int,int,float]], w: int, h: int) -> Tuple[float,float,float]:
    idxs = [1, 152, 33, 263, 61, 291]
    pts2d = []
    for i in idxs:
        p = safe_L(landmarks, i)
        if p is None:
            return 0.0, 0.0, 0.0
        pts2d.append([float(p[0]), float(p[1])])
    pts2d = np.array(pts2d, dtype=np.float64)

    pts3d = np.array([
        [  0.0,   0.0,   0.0],   # nose tip
        [  0.0, -90.0, -10.0],   # chin
        [-60.0,  40.0, -30.0],   # left eye outer
        [ 60.0,  40.0, -30.0],   # right eye outer
        [-40.0, -40.0, -30.0],   # left mouth
        [ 40.0, -40.0, -30.0],   # right mouth
    ], dtype=np.float64)

    focal = w
    center = (w / 2.0, h / 2.0)
    cam_mtx = np.array([[focal, 0, center[0]],
                        [0, focal, center[1]],
                        [0,    0,        1]], dtype=np.float64)
    dist = np.zeros((4, 1), dtype=np.float64)

    ok, rvec, tvec = cv2.solvePnP(pts3d, pts2d, cam_mtx, dist, flags=cv2.SOLVEPNP_ITERATIVE)
    if not ok:
        return 0.0, 0.0, 0.0

    R, _ = cv2.Rodrigues(rvec)
    sy = math.sqrt(R[0,0]*R[0,0] + R[1,0]*R[1,0])
    singular = sy < 1e-6

    if not singular:
        pitch = math.degrees(math.atan2(-R[2,0], sy))
        yaw   = math.degrees(math.atan2(R[1,0], R[0,0]))
        roll  = math.degrees(math.atan2(R[2,1], R[2,2]))
    else:
        pitch = math.degrees(math.atan2(-R[2,0], sy))
        yaw   = math.degrees(math.atan2(-R[0,1], R[1,1]))
        roll  = 0.0

    return yaw, pitch, roll

# -----------------------------
# Compute features for a single face
# -----------------------------
def compute_features(landmarks: List[Tuple[int,int,float]], w: int, h: int) -> Dict[str, float]:
    L = lambda i: safe_L(landmarks, i)

    total_reference = sdist(L(4), L(6))
    mouth_width_ref = sdist(L(61), L(291))
    left_eye_width_ref  = sdist(L(33), L(133))
    right_eye_width_ref = sdist(L(362), L(263))

    # Mouth
    mouth_height = sdist(L(13), L(14))
    mouth_aspect_ratio = sratio(mouth_height, mouth_width_ref)
    lip_corner_distance = sratio(mouth_width_ref, total_reference)
    jaw_drop = sratio(sdist(L(152), L(14)), total_reference)

    # Eyes
    left_eye_height  = sdist(L(159), L(145))
    right_eye_height = sdist(L(386), L(374))
    left_eye_openness  = sratio(left_eye_height, left_eye_width_ref) / (total_reference if total_reference else 1)
    right_eye_openness = sratio(right_eye_height, right_eye_width_ref) / (total_reference if total_reference else 1)

    # Brows
    left_eyebrow_height  = sratio(sdist(L(65),  L(33)),  left_eye_width_ref)  / (total_reference if total_reference else 1)
    right_eyebrow_height = sratio(sdist(L(295), L(263)), right_eye_width_ref) / (total_reference if total_reference else 1)
    left_eyebrow_slope  = ((L(159)[1] - L(65)[1])  / (L(159)[0] - L(65)[0]))  if (L(159) and L(65)  and (L(159)[0]-L(65)[0]))   else 0.0
    right_eyebrow_slope = ((L(386)[1] - L(295)[1]) / (L(386)[0] - L(295)[0])) if (L(386) and L(295) and (L(386)[0]-L(295)[0])) else 0.0
    eyebrow_asymmetry = abs(left_eyebrow_height - right_eyebrow_height)

    # Nose
    nostril_flare = sratio(sdist(L(98), L(327)), total_reference)
    nose_tip_movement = sratio(sdist(L(1), L(4)), total_reference)

    # Cheeks / Jaw
    left_cheek_pos  = sratio(sdist(L(230), L(295)), total_reference)
    right_cheek_pos = sratio(sdist(L(450), L(426)), total_reference)
    jaw_width = sratio(sdist(L(234), L(454)), total_reference)

    # Derived
    eye_distance = sratio(sdist(L(33), L(263)), total_reference)
    mouth_eye_ratio = sratio(mouth_height, (eye_distance if eye_distance else None))

    # Head pose
    yaw, pitch, roll = estimate_head_pose(landmarks, w, h)

    # Eye EAR + asymmetry
    left_eye_ear  = sratio(left_eye_height, left_eye_width_ref)
    right_eye_ear = sratio(right_eye_height, right_eye_width_ref)
    eye_asymmetry = abs(left_eye_ear - right_eye_ear)
    interocular_norm = sratio(sdist(L(33), L(263)), total_reference)

    # Mouth slope/curvature/smile
    mouth_corner_slope = 0.0
    if L(61) and L(291) and (L(291)[0] - L(61)[0]) != 0:
        mouth_corner_slope = (L(291)[1] - L(61)[1]) / (L(291)[0] - L(61)[0])
    mouth_mid = ((L(13)[0]+L(14)[0])//2, (L(13)[1]+L(14)[1])//2, 0.0) if (L(13) and L(14)) else None
    mouth_curvature = abs(point_line_signed_distance(mouth_mid, L(61), L(291))) if mouth_mid else 0.0
    mouth_curvature = sratio(mouth_curvature, mouth_width_ref)
    smile_signed = point_line_signed_distance(mouth_mid, L(61), L(291)) if mouth_mid else 0.0
    smile_intensity = sratio(smile_signed, mouth_width_ref)

    # Brow-eye distances
    left_eye_center  = None if (L(33) is None or L(133) is None) else ((L(33)[0]+L(133)[0])//2, (L(33)[1]+L(133)[1])//2, 0.0)
    right_eye_center = None if (L(362) is None or L(263) is None) else ((L(362)[0]+L(263)[0])//2, (L(362)[1]+L(263)[1])//2, 0.0)
    brow_eye_dist_left  = sratio(sdist(L(65),  left_eye_center),  left_eye_width_ref)  / (total_reference if total_reference else 1)
    brow_eye_dist_right = sratio(sdist(L(295), right_eye_center), right_eye_width_ref) / (total_reference if total_reference else 1)
    brow_eye_asymmetry = abs(brow_eye_dist_left - brow_eye_dist_right)

    # Cheek asymmetry & jaw angle
    cheek_asymmetry = abs(left_cheek_pos - right_cheek_pos)
    jaw_angle_deg = angle_deg(L(234), L(152), L(454))

    # Nose distances
    nose_to_mouth = sratio(sdist(L(1), L(13)), total_reference)
    nose_to_chin_norm = sratio(sdist(L(1), L(152)), total_reference)

    # Global shape
    face_width = sdist(L(234), L(454))
    face_height = sdist(L(10), L(152)) if (L(10) and L(152)) else sdist(L(1), L(152))
    face_width_norm = sratio(face_width, total_reference)
    face_height_norm = sratio(face_height, total_reference)
    face_wh_ratio = sratio(face_width, (face_height if face_height else None))

    feat = {
        'mouth_movement': sratio(mouth_height, total_reference),
        'mouth_aspect_ratio': mouth_aspect_ratio,
        'lip_corner_distance': lip_corner_distance,
        'jaw_drop': jaw_drop,
        'left_eye_movement': left_eye_openness,
        'right_eye_movement': right_eye_openness,
        'left_eyebrow_movement': left_eyebrow_height,
        'right_eyebrow_movement': right_eyebrow_height,
        'left_eyebrow_slope': left_eyebrow_slope,
        'right_eyebrow_slope': right_eyebrow_slope,
        'eyebrow_asymmetry': eyebrow_asymmetry,
        'nostril_flare': nostril_flare,
        'nose_tip_movement': nose_tip_movement,
        'left_cheek_position': left_cheek_pos,
        'right_cheek_position': right_cheek_pos,
        'jaw_width': jaw_width,
        'mouth_eye_ratio': mouth_eye_ratio,
        'pose_yaw': yaw,
        'pose_pitch': pitch,
        'pose_roll': roll,
        'left_eye_ear': left_eye_ear,
        'right_eye_ear': right_eye_ear,
        'eye_asymmetry': eye_asymmetry,
        'interocular_norm': interocular_norm,
        'mouth_corner_slope': mouth_corner_slope,
        'mouth_curvature': mouth_curvature,
        'smile_intensity': smile_intensity,
        'brow_eye_dist_left': brow_eye_dist_left,
        'brow_eye_dist_right': brow_eye_dist_right,
        'brow_eye_asymmetry': brow_eye_asymmetry,
        'cheek_asymmetry': cheek_asymmetry,
        'jaw_angle_deg': jaw_angle_deg,
        'nose_to_mouth': nose_to_mouth,
        'nose_to_chin_norm': nose_to_chin_norm,
        'face_width_norm': face_width_norm,
        'face_height_norm': face_height_norm,
        'face_wh_ratio': face_wh_ratio
    }
    return feat

# -----------------------------
# Build feature vector in correct order
# -----------------------------
def vectorize_features(feat_dict: Dict[str, float]) -> np.ndarray:
    return np.array([feat_dict.get(name, 0.0) for name in FEATURE_ORDER], dtype=np.float32).reshape(1, -1)

# -----------------------------
# Engagement mapping from emotion
# -----------------------------
def emotion_to_engagement(emotion: str) -> str:
    """
    Map emotion to engagement level based on the 7 emotion model:
    happy, sad, angry, fear, disgust, neutral, surprise
    """
    emotion_lower = emotion.lower()
    
    # Active learner emotions (positive, focused, attentive)
    if emotion_lower in ['neutral', 'neutrality', 'happy', 'happiness', 'surprised', 'surprise']:
        return 'active'
    
    # Passive learner emotions (neutral, calm, not engaged but not distracted)
    elif emotion_lower in [ 'sad', 'sadness', 'disgust', 'disgusted']:
        return 'passive'
    
    # Distracted learner emotions (negative, unfocused, disengaged)
    elif emotion_lower in ['angry', 'anger', 'fear', 'fearful']:
        return 'distracted'
    
    else:
        return 'passive'  # Default to passive for unknown emotions

def calculate_focus_level(emotion: str, gaze_focused: bool = True) -> int:
    """
    Calculate focus level (0-100) based on emotion and gaze
    Handles the 7 emotion model: happy, sad, angry, fear, disgust, neutral, surprise
    """
    base_focus = {
        # Active emotions (high focus)
        'happy': 85,
        'happiness': 85,
        'surprised': 80,
        'surprise': 80,
        
        # Passive emotions (moderate focus)
        'neutral': 70,
        'neutrality': 70,
        'sad': 55,
        'sadness': 55,
        
        # Distracted emotions (low focus)
        'angry': 35,
        'anger': 35,
        'fear': 40,
        'fearful': 40,
        'disgust': 30,
        'disgusted': 30
    }
    
    emotion_lower = emotion.lower()
    focus = base_focus.get(emotion_lower, 60)  # Default to 60 for unknown
    
    # Adjust based on gaze
    if not gaze_focused:
        focus = max(0, focus - 30)
    
    return min(100, max(0, focus))

# -----------------------------
# EmotionDetector class for real-time processing
# -----------------------------
class EmotionDetector:
    """
    Emotion detector for processing video frames in real-time with advanced eye tracking
    Includes glasses detection, distance adaptation, and lighting compensation
    """
    def __init__(self, model_path: str = None, labels_path: str = None, 
                 smoothing_window: int = 5, min_detection_confidence: float = 0.5):
        """
        Initialize the emotion detector
        
        Args:
            model_path: Path to trained model (.joblib)
            labels_path: Path to label encoder (.joblib)
            smoothing_window: Number of frames for temporal smoothing
            min_detection_confidence: MediaPipe detection confidence threshold
        """
        self.model = None
        self.label_encoder = None
        self.smoothing_window = smoothing_window
        self.recent_predictions = deque(maxlen=smoothing_window)
        
        # Initialize MediaPipe FaceMesh with refined landmarks for iris tracking
        self.face_mesh = mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,  # Enable iris tracking
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=0.5
        )
        
        # Eye landmark indices for iris tracking
        self.LEFT_IRIS = [474, 475, 476, 477]
        self.RIGHT_IRIS = [469, 470, 471, 472]
        self.LEFT_EYE = [362, 385, 387, 263, 373, 380]
        self.RIGHT_EYE = [33, 160, 158, 133, 153, 144]
        
        # Glasses detection landmarks
        self.NOSE_BRIDGE = [6, 168, 197, 195]
        self.FOREHEAD = [10, 151]
        
        # Adaptive thresholds for different conditions
        self.adaptive_focus_threshold = 0.35
        self.adaptive_vertical_threshold = 0.4
        self.adaptive_ear_threshold = 0.2
        
        # Distance and glasses detection
        self.wearing_glasses = False
        self.face_distance = 1.0  # Normalized distance
        self.distance_history = deque(maxlen=30)
        self.lighting_quality = 1.0  # 0 to 1, higher is better
        self.lighting_history = deque(maxlen=30)
        
        # Blink detection parameters
        self.blink_history = deque(maxlen=10)
        self.eye_closure_threshold = 0.2
        self.max_blink_duration = 0.3  # seconds
        self.last_blink_time = time.time()
        
        # Load model if paths provided
        if model_path and labels_path:
            self.load_model(model_path, labels_path)
    
    def load_model(self, model_path: str, labels_path: str):
        """Load the trained model and label encoder"""
        try:
            self.model = joblib.load(model_path)
            self.label_encoder = joblib.load(labels_path)
            print(f"Model loaded successfully from {model_path}")
        except Exception as e:
            print(f"Error loading model: {e}")
            raise
    
    def detect_glasses(self, landmarks, frame_shape):
        """Detect if user is wearing glasses by analyzing landmarks"""
        try:
            # Get eye landmarks
            left_eye_points = [landmarks[i] for i in self.LEFT_EYE]
            right_eye_points = [landmarks[i] for i in self.RIGHT_EYE]
            
            # Calculate eye region clarity (z-coordinate variance)
            left_z_variance = np.var([landmarks[i].z for i in self.LEFT_EYE])
            right_z_variance = np.var([landmarks[i].z for i in self.RIGHT_EYE])
            avg_z_variance = (left_z_variance + right_z_variance) / 2
            
            # Glasses typically reduce z-variance (flatter appearance)
            glasses_detected = bool(avg_z_variance < 0.01)
            
            return glasses_detected
        except Exception as e:
            return bool(self.wearing_glasses)  # Return previous state on error
    
    def estimate_face_distance(self, landmarks, frame_shape):
        """Estimate distance from camera based on face size"""
        try:
            h, w = frame_shape[:2]
            
            # Use eye distance as reference (constant in real world)
            left_eye = landmarks[33]
            right_eye = landmarks[263]
            
            eye_distance_pixels = np.linalg.norm([
                (right_eye.x - left_eye.x) * w,
                (right_eye.y - left_eye.y) * h
            ])
            
            # Normalize based on typical eye distance at optimal distance
            optimal_eye_distance = 70.0
            distance_ratio = optimal_eye_distance / max(eye_distance_pixels, 1)
            
            # Clamp to reasonable range
            distance_ratio = np.clip(distance_ratio, 0.4, 2.5)
            
            return distance_ratio
        except Exception as e:
            return 1.0
    
    def assess_lighting_quality(self, frame):
        """Assess lighting conditions of the frame"""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Calculate mean brightness and contrast
            mean_brightness = np.mean(gray)
            std_brightness = np.std(gray)
            
            # Calculate quality scores
            brightness_score = 1.0
            if mean_brightness < 60:
                brightness_score = mean_brightness / 60.0
            elif mean_brightness > 200:
                brightness_score = (255 - mean_brightness) / 55.0
            
            contrast_score = min(std_brightness / 50.0, 1.0)
            
            # Combined lighting quality score
            quality = (brightness_score * 0.6 + contrast_score * 0.4)
            quality = np.clip(quality, 0.3, 1.0)
            
            return quality
        except Exception as e:
            return 1.0
    
    def adapt_thresholds(self):
        """Adapt detection thresholds based on conditions - Calibrated for webcam gaze tracking"""
        # Base thresholds - CALIBRATED for real webcam setups
        # Natural baseline gaze values can be -0.15 horizontal and -0.15 vertical
        # due to camera position and eye asymmetry
        # Only trigger "looking away" for SIGNIFICANT eye movements beyond natural variation
        base_focus = 0.20  # Horizontal threshold - allows ±0.20 as "looking at screen"
        base_vertical = 0.25  # Vertical threshold - allows ±0.25 to account for camera angle
        base_ear = 0.2
        
        # Adjust for distance - when CLOSE, be slightly more lenient
        if self.face_distance < 1.0:
            distance_factor = 1.0 + (1.0 - self.face_distance) * 0.2
        else:
            distance_factor = 1.0 + (self.face_distance - 1.0) * 0.15
        
        # Glasses adjustment - glasses can affect detection
        glasses_factor = 1.1 if self.wearing_glasses else 1.0
        
        # Adjust for lighting
        lighting_factor = 1.0 + (1.0 - self.lighting_quality) * 0.1
        
        # Apply adjustments
        self.adaptive_focus_threshold = base_focus * distance_factor * glasses_factor
        self.adaptive_vertical_threshold = base_vertical * distance_factor
        self.adaptive_ear_threshold = base_ear * lighting_factor * (0.9 if self.wearing_glasses else 1.0)
        
        # Clamp to reasonable ranges - allow for natural eye position variation
        self.adaptive_focus_threshold = np.clip(self.adaptive_focus_threshold, 0.18, 0.35)
        self.adaptive_vertical_threshold = np.clip(self.adaptive_vertical_threshold, 0.22, 0.40)
        self.adaptive_ear_threshold = np.clip(self.adaptive_ear_threshold, 0.15, 0.28)
    
    def enhance_frame_quality(self, frame):
        """Enhance frame for better landmark detection in poor conditions"""
        if self.lighting_quality < 0.7:
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            
            enhanced = cv2.merge([l, a, b])
            frame = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        return frame
    
    def is_blinking(self, left_ear, right_ear):
        """Determine if current eye closure is a blink or prolonged closure"""
        current_time = time.time()
        avg_ear = (left_ear + right_ear) / 2
        
        # Use adaptive threshold
        threshold = self.adaptive_ear_threshold
        
        # Check if eyes are closed
        if avg_ear < threshold:
            # Record blink start
            if len(self.blink_history) == 0 or self.blink_history[-1].get('state') != 'closed':
                self.blink_history.append({
                    'state': 'closed',
                    'start_time': current_time
                })
            
            # Check duration of closure
            closure_duration = current_time - self.blink_history[-1]['start_time']
            
            # If closed for less than max_blink_duration, it's a blink
            return closure_duration < self.max_blink_duration
        else:
            # Eyes are open
            if len(self.blink_history) > 0 and self.blink_history[-1].get('state') == 'closed':
                self.blink_history.append({
                    'state': 'open',
                    'start_time': current_time
                })
            return False
    
    def process_frame(self, frame: np.ndarray) -> Dict:
        """
        Process a single frame and return emotion data with advanced gaze tracking
        
        Args:
            frame: BGR image frame (numpy array)
            
        Returns:
            dict with emotion, confidence, engagement, focus_level, face_detected, gaze data
        """
        if self.model is None or self.label_encoder is None:
            return {
                'emotion': 'neutral',
                'confidence': 0.0,
                'engagement': 'passive',
                'focus_level': 60,
                'face_detected': False,
                'error': 'Model not loaded'
            }
        
        # Assess lighting quality
        self.lighting_quality = self.assess_lighting_quality(frame)
        self.lighting_history.append(self.lighting_quality)
        
        # Enhance frame if needed
        enhanced_frame = self.enhance_frame_quality(frame.copy())
        
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(enhanced_frame, cv2.COLOR_BGR2RGB)
        result = self.face_mesh.process(rgb)
        
        if not result.multi_face_landmarks:
            return {
                'emotion': None,
                'confidence': 0.0,
                'engagement': 'distracted',
                'focus_level': 0,
                'face_detected': False
            }
        
        try:
            # Get first face landmarks
            fl = result.multi_face_landmarks[0]
            landmarks = []
            for lm in fl.landmark:
                x_px = int(round(lm.x * w))
                y_px = int(round(lm.y * h))
                z_px = lm.z * w
                landmarks.append((x_px, y_px, z_px))
            
            # Compute features
            feats = compute_features(landmarks, w, h)
            X = vectorize_features(feats)
            
            # Predict emotion
            y_pred = self.model.predict(X)[0]
            emotion = self.label_encoder.inverse_transform([y_pred])[0]
            
            # Get confidence if available
            confidence = 0.0
            if hasattr(self.model, "predict_proba"):
                proba = self.model.predict_proba(X)[0]
                confidence = float(np.max(proba))
            
            # Temporal smoothing
            self.recent_predictions.append(emotion)
            if len(self.recent_predictions) >= 2:
                most_common, count = Counter(self.recent_predictions).most_common(1)[0]
                smoothed_emotion = most_common
            else:
                smoothed_emotion = emotion
            
            # Advanced eye tracking focus detection
            is_focused_gaze, gaze_direction, eye_openness = self.is_focused_on_screen(fl.landmark, frame.shape)
            
            # Calculate engagement and focus
            engagement = emotion_to_engagement(smoothed_emotion)
            
            # Adjust focus level based on gaze focus
            base_focus_level = calculate_focus_level(smoothed_emotion, gaze_focused=is_focused_gaze)
            
            # If user is not looking at screen, reduce focus significantly
            if not is_focused_gaze:
                base_focus_level = max(0, base_focus_level - 40)
            
            return {
                'emotion': smoothed_emotion,
                'raw_emotion': emotion,
                'confidence': confidence,
                'engagement': engagement,
                'focus_level': base_focus_level,
                'face_detected': True,
                'is_focused_gaze': bool(is_focused_gaze),
                'gaze_direction': gaze_direction,
                'eye_openness': float(eye_openness),
                'wearing_glasses': bool(self.wearing_glasses),
                'face_distance': float(self.face_distance),
                'lighting_quality': float(self.lighting_quality),
                'pose': {
                    'yaw': float(feats.get('pose_yaw', 0.0)),
                    'pitch': float(feats.get('pose_pitch', 0.0)),
                    'roll': float(feats.get('pose_roll', 0.0))
                }
            }
            
        except Exception as e:
            print(f"Error processing frame: {e}")
            import traceback
            traceback.print_exc()
            return {
                'emotion': None,
                'confidence': 0.0,
                'engagement': 'distracted',
                'focus_level': 0,
                'face_detected': False,
                'error': str(e)
            }
    
    def calculate_gaze_ratio(self, eye_points, iris_points, frame_shape):
        """Calculate gaze ratio to determine if user is looking at screen - matches eye_tracking_monitor2.py methodology"""
        try:
            h, w = frame_shape[:2]
            
            # Get eye region - use landmark objects directly
            eye_region = np.array([(point.x * w, point.y * h) 
                                   for point in eye_points], dtype=np.int32)
            
            # Get iris center
            iris_center = np.mean([(point.x * w, point.y * h) 
                                   for point in iris_points], axis=0)
            
            # Calculate eye center
            eye_center = np.mean(eye_region, axis=0)
            
            # Calculate relative position of iris in eye
            eye_width = np.max(eye_region[:, 0]) - np.min(eye_region[:, 0])
            eye_height = np.max(eye_region[:, 1]) - np.min(eye_region[:, 1])
            
            if eye_width == 0 or eye_height == 0:
                return 0, 0
            
            # Normalized position (-1 to 1)
            horizontal_ratio = (iris_center[0] - eye_center[0]) / (eye_width / 2)
            vertical_ratio = (iris_center[1] - eye_center[1]) / (eye_height / 2)
            
            # Debug logging
            print(f"  Iris: ({iris_center[0]:.1f}, {iris_center[1]:.1f}), Eye: ({eye_center[0]:.1f}, {eye_center[1]:.1f}), "
                  f"Size: ({eye_width:.1f}x{eye_height:.1f}), Ratios: ({horizontal_ratio:.3f}, {vertical_ratio:.3f})")
            
            return horizontal_ratio, vertical_ratio
        except Exception as e:
            print(f"Error calculating gaze ratio: {e}")
            import traceback
            traceback.print_exc()
            return 0, 0
    
    def calculate_head_pose_deviation(self, landmarks, frame_shape):
        """Estimate head pose deviation using facial landmarks"""
        try:
            h, w = frame_shape[:2]
            
            # Key facial landmarks
            nose_tip = landmarks[1]
            left_eye = landmarks[33]
            right_eye = landmarks[263]
            
            # Convert to pixel coordinates
            nose = np.array([nose_tip.x * w, nose_tip.y * h])
            
            # Calculate face center
            face_center = np.array([
                (left_eye.x + right_eye.x) * w / 2,
                (left_eye.y + right_eye.y) * h / 2
            ])
            
            # Normalized deviation from center
            horizontal_deviation = abs(nose[0] - face_center[0]) / (w / 2)
            vertical_deviation = abs(nose[1] - face_center[1]) / (h / 2)
            
            return horizontal_deviation, vertical_deviation
        except Exception as e:
            return 0, 0
    
    def detect_gaze_direction(self, left_gaze, right_gaze):
        """Detect gaze direction (CENTER, LEFT, RIGHT, UP, DOWN, and combinations)"""
        try:
            left_h, left_v = left_gaze
            right_h, right_v = right_gaze
            
            # Average gaze
            avg_h = (left_h + right_h) / 2
            avg_v = (left_v + right_v) / 2
            
            # Use adaptive thresholds
            h_threshold = self.adaptive_focus_threshold
            v_threshold = self.adaptive_vertical_threshold
            
            # Log gaze values for debugging
            print(f"Gaze values - H: {avg_h:.3f}, V: {avg_v:.3f}, Thresholds - H: {h_threshold:.3f}, V: {v_threshold:.3f}")
            
            # Determine direction with priority to vertical movements
            # Check vertical first (more noticeable)
            if abs(avg_v) > v_threshold:
                if avg_v < -v_threshold:
                    # Looking up
                    if abs(avg_h) > h_threshold:
                        return "UP-LEFT" if avg_h < 0 else "UP-RIGHT"
                    return "UP"
                else:
                    # Looking down
                    if abs(avg_h) > h_threshold:
                        return "DOWN-LEFT" if avg_h < 0 else "DOWN-RIGHT"
                    return "DOWN"
            
            # Check horizontal
            if abs(avg_h) > h_threshold:
                return "LEFT" if avg_h < 0 else "RIGHT"
            
            # Only CENTER if both are within strict thresholds
            return "CENTER"
        except Exception as e:
            print(f"Error detecting gaze direction: {e}")
            return "CENTER"
    
    def calculate_eye_aspect_ratio(self, landmarks, eye_points):
        """Calculate Eye Aspect Ratio (EAR) to detect eye closure"""
        try:
            # Convert landmarks to numpy array
            points = np.array([(landmarks[i].x, landmarks[i].y) for i in eye_points])
            
            # Compute vertical distances
            vertical_1 = np.linalg.norm(points[1] - points[5])
            vertical_2 = np.linalg.norm(points[2] - points[4])
            
            # Compute horizontal distance
            horizontal = np.linalg.norm(points[0] - points[3])
            
            if horizontal == 0:
                return 0
            
            # Eye Aspect Ratio
            ear = (vertical_1 + vertical_2) / (2.0 * horizontal)
            return ear
        except Exception as e:
            return 0.25
    
    def is_focused_on_screen(self, landmarks, frame_shape):
        """
        Determine if user is focused on screen - EXACT logic from eye_tracking_monitor2.py
        Returns (is_focused: bool, gaze_direction: str, eye_openness: float)
        """
        try:
            # Detect glasses
            self.wearing_glasses = self.detect_glasses(landmarks, frame_shape)
            
            # Estimate distance from camera
            self.face_distance = self.estimate_face_distance(landmarks, frame_shape)
            self.distance_history.append(self.face_distance)
            
            # Smooth distance using moving average
            if len(self.distance_history) > 0:
                self.face_distance = np.mean(list(self.distance_history))
            
            # Adapt thresholds based on current conditions
            self.adapt_thresholds()
            
            # Get eye and iris landmark objects
            left_eye_points = [landmarks[i] for i in self.LEFT_EYE]
            right_eye_points = [landmarks[i] for i in self.RIGHT_EYE]
            left_iris_points = [landmarks[i] for i in self.LEFT_IRIS]
            right_iris_points = [landmarks[i] for i in self.RIGHT_IRIS]
            
            # Calculate gaze ratios for both eyes
            left_gaze = self.calculate_gaze_ratio(left_eye_points, left_iris_points, frame_shape)
            right_gaze = self.calculate_gaze_ratio(right_eye_points, right_iris_points, frame_shape)
            
            left_h, left_v = left_gaze
            right_h, right_v = right_gaze
            
            # Calculate eye openness (EAR - Eye Aspect Ratio) using eye points directly
            left_ear = self.calculate_ear_from_points(left_eye_points)
            right_ear = self.calculate_ear_from_points(right_eye_points)
            avg_ear = (left_ear + right_ear) / 2
            
            # Check for blinks vs prolonged eye closure - EXACT from eye_tracking_monitor2.py
            is_blink = self.is_blinking(left_ear, right_ear)
            
            # Use adaptive thresholds - EXACTLY as eye_tracking_monitor2.py
            ear_threshold = self.adaptive_ear_threshold
            focus_threshold = self.adaptive_focus_threshold
            vertical_threshold = self.adaptive_vertical_threshold
            
            # Calculate head pose deviation
            head_h, head_v = self.calculate_head_pose_deviation(landmarks, frame_shape)
            
            # Head threshold - EXACT from eye_tracking_monitor2.py
            if self.face_distance < 1.0:
                # Very close - very lenient on head position
                head_threshold = 0.4 + (1.0 - self.face_distance) * 0.3
            else:
                # Normal/far distance
                head_threshold = 0.3 * (1.0 + (self.face_distance - 1.0) * 0.2)
            
            head_forward = (head_h < head_threshold and head_v < head_threshold)
            
            # Determine gaze direction for display
            avg_h = (left_h + right_h) / 2
            avg_v = (left_v + right_v) / 2
            
            # Check for vertical gaze FIRST (looking up or down significantly)
            looking_up_down = (abs(left_v) > vertical_threshold or abs(right_v) > vertical_threshold)
            
            # Check if horizontal gaze is roughly centered
            gaze_centered = (abs(left_h) < focus_threshold and abs(right_h) < focus_threshold)
            
            # Determine gaze direction string
            if looking_up_down:
                if avg_v < -vertical_threshold:
                    gaze_direction = "UP"
                else:
                    gaze_direction = "DOWN"
            elif not gaze_centered:
                if avg_h < -focus_threshold:
                    gaze_direction = "LEFT"
                elif avg_h > focus_threshold:
                    gaze_direction = "RIGHT"
                else:
                    gaze_direction = "CENTER"
            else:
                gaze_direction = "CENTER"
            
            # EXACT is_focused logic from eye_tracking_monitor2.py
            # If eyes are closed and it's not a blink, user is unfocused
            if avg_ear < ear_threshold and not is_blink:
                is_focused = False
            # Ignore if currently blinking - don't penalize for blinking
            elif is_blink:
                is_focused = True
            # Check for vertical gaze (looking up or down significantly)
            elif looking_up_down:
                is_focused = False
            # Check gaze and head position
            else:
                is_focused = gaze_centered and head_forward
            
            # Log for debugging
            print(f"Focus Detection - Direction: {gaze_direction}, Gaze H: {avg_h:.3f}, V: {avg_v:.3f}, "
                  f"Thresholds: H={focus_threshold:.3f}, V={vertical_threshold:.3f}, "
                  f"EAR: {avg_ear:.3f}, Blink: {is_blink}, Head Forward: {head_forward}, Focused: {is_focused}")
            
            return bool(is_focused), str(gaze_direction), float(avg_ear)
            
        except Exception as e:
            print(f"Error in focus detection: {e}")
            import traceback
            traceback.print_exc()
            return False, "ERROR", 0.0
    
    def calculate_ear_from_points(self, eye_points):
        """Calculate Eye Aspect Ratio from eye landmark points - EXACT from eye_tracking_monitor2.py"""
        try:
            # Convert landmarks to numpy array
            points = np.array([(p.x, p.y) for p in eye_points])
            
            # Compute vertical distances
            vertical_1 = np.linalg.norm(points[1] - points[5])
            vertical_2 = np.linalg.norm(points[2] - points[4])
            
            # Compute horizontal distance
            horizontal = np.linalg.norm(points[0] - points[3])
            
            # Avoid division by zero
            if horizontal == 0:
                return 0
            
            # Eye Aspect Ratio
            ear = (vertical_1 + vertical_2) / (2.0 * horizontal)
            return ear
        except Exception as e:
            return 0.25
    
    def process_base64_frame(self, base64_image: str) -> Dict:
        """
        Process a base64-encoded image frame
        
        Args:
            base64_image: Base64-encoded image string (data:image/jpeg;base64,...)
            
        Returns:
            dict with emotion data
        """
        try:
            # Remove data URL prefix if present
            if ',' in base64_image:
                base64_image = base64_image.split(',')[1]
            
            # Decode base64 to numpy array
            img_data = base64.b64decode(base64_image)
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                return {
                    'emotion': None,
                    'confidence': 0.0,
                    'engagement': 'distracted',
                    'focus_level': 0,
                    'face_detected': False,
                    'error': 'Failed to decode image'
                }
            
            return self.process_frame(frame)
            
        except Exception as e:
            print(f"Error processing base64 frame: {e}")
            return {
                'emotion': None,
                'confidence': 0.0,
                'engagement': 'distracted',
                'focus_level': 0,
                'face_detected': False,
                'error': str(e)
            }
    
    def __del__(self):
        """Cleanup resources"""
        if hasattr(self, 'face_mesh'):
            self.face_mesh.close()
