"""
Eye Tracking Focus Monitor using MediaPipe
Monitors user's attention on computer screen and alerts when focus is lost
"""

import cv2
import mediapipe as mp
import numpy as np
from datetime import datetime, timedelta
import time
import threading
from collections import deque
import tkinter as tk
from tkinter import messagebox
import sys

class EyeTrackingMonitor:
    def __init__(self):
        # Initialize MediaPipe Face Mesh
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.drawing_spec = self.mp_drawing.DrawingSpec(thickness=1, circle_radius=1)
        
        # Eye landmark indices for iris tracking
        self.LEFT_IRIS = [474, 475, 476, 477]
        self.RIGHT_IRIS = [469, 470, 471, 472]
        self.LEFT_EYE = [362, 385, 387, 263, 373, 380]
        self.RIGHT_EYE = [33, 160, 158, 133, 153, 144]
        
        # Glasses detection landmarks
        self.NOSE_BRIDGE = [6, 168, 197, 195]  # Top of nose bridge
        self.FOREHEAD = [10, 151]  # Forehead points
        
        # Focus tracking parameters
        self.focus_threshold = 0.35  # Threshold for considering "looking away"
        self.vertical_threshold = 0.4  # Threshold for vertical gaze (looking up/down)
        self.focus_history = deque(maxlen=300)  # Store last 30 seconds at 10 FPS
        self.unfocused_start_time = None
        self.unfocused_duration_threshold = 300  # 5 minutes in seconds
        
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
        self.blink_history = deque(maxlen=10)  # Track recent blinks
        self.eye_closure_threshold = 0.2  # EAR threshold for eye closure
        self.max_blink_duration = 0.3  # Maximum duration for a blink (seconds)
        self.last_blink_time = time.time()
        
        # Calibration data
        self.calibration_samples = []
        self.is_calibrated = False
        self.calibration_focus_threshold = 0.35
        self.calibration_ear_baseline = 0.25
        
        # Attention logging (every 10 minutes)
        self.attention_log = []
        self.last_log_time = datetime.now()
        self.log_interval = timedelta(minutes=10)
        
        # Statistics
        self.total_focused_time = 0
        self.total_unfocused_time = 0
        self.session_start_time = datetime.now()
        
        # Camera
        self.cap = cv2.VideoCapture(0)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        # Running flag
        self.running = True
        
    def detect_glasses(self, landmarks, frame_shape):
        """Detect if user is wearing glasses by analyzing reflections and landmarks"""
        try:
            h, w = frame_shape[:2]
            
            # Get nose bridge landmarks
            nose_bridge_points = [landmarks[i] for i in self.NOSE_BRIDGE]
            
            # Calculate variance in landmark visibility (glasses cause more stable but offset landmarks)
            # Check for typical glasses characteristics:
            # 1. Consistent landmark detection even at distance
            # 2. Slightly offset iris detection
            # 3. More reflective regions around eyes
            
            # Simple heuristic: if eye landmarks are very stable and consistent,
            # likely wearing glasses (they help with detection)
            left_eye_points = [landmarks[i] for i in self.LEFT_EYE]
            right_eye_points = [landmarks[i] for i in self.RIGHT_EYE]
            
            # Calculate eye region clarity (z-coordinate variance)
            left_z_variance = np.var([p.z for p in left_eye_points])
            right_z_variance = np.var([p.z for p in right_eye_points])
            avg_z_variance = (left_z_variance + right_z_variance) / 2
            
            # Glasses typically reduce z-variance (flatter appearance)
            # and improve landmark stability
            glasses_detected = avg_z_variance < 0.01  # Lower variance suggests glasses
            
            return glasses_detected
        except Exception as e:
            return self.wearing_glasses  # Return previous state on error
    
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
            
            # Normalize based on typical eye distance at optimal distance (~60-65 pixels at 30-40cm)
            # Smaller pixel distance = farther away
            # Adjusted: 80+ pixels = very close, 60 = optimal, 40 = far
            optimal_eye_distance = 70.0  # Adjusted baseline
            distance_ratio = optimal_eye_distance / max(eye_distance_pixels, 1)
            
            # Clamp to reasonable range (0.4 = very close, 2.5 = very far)
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
            
            # Optimal lighting: mean around 100-150, std around 40-80
            # Poor lighting: very low mean (<50) or very high mean (>200), low std (<20)
            
            brightness_score = 1.0
            if mean_brightness < 60:
                brightness_score = mean_brightness / 60.0  # Too dark
            elif mean_brightness > 200:
                brightness_score = (255 - mean_brightness) / 55.0  # Too bright
            
            contrast_score = min(std_brightness / 50.0, 1.0)  # Low contrast is bad
            
            # Combined lighting quality score
            quality = (brightness_score * 0.6 + contrast_score * 0.4)
            quality = np.clip(quality, 0.3, 1.0)  # Never go below 0.3
            
            return quality
        except Exception as e:
            return 1.0
    
    def adapt_thresholds(self):
        """Adapt detection thresholds based on conditions"""
        # Base thresholds
        base_focus = 0.35
        base_vertical = 0.4
        base_ear = 0.2
        
        # Adjust for distance - make MORE lenient both when close AND far
        # Close distance (< 1.0): More lenient because face is larger and gaze angles appear exaggerated
        # Far distance (> 1.0): More lenient because detection is less precise
        if self.face_distance < 1.0:
            # Very close - be more lenient (1.2 to 1.5x more lenient)
            distance_factor = 1.0 + (1.0 - self.face_distance) * 0.5
        else:
            # Far away - be more lenient (1.0 to 1.3x more lenient)
            distance_factor = 1.0 + (self.face_distance - 1.0) * 0.3
        
        # Adjust for glasses (glasses wearers may have slightly different gaze patterns)
        glasses_factor = 1.15 if self.wearing_glasses else 1.0
        
        # Adjust for lighting (poor lighting = more lenient)
        lighting_factor = 1.0 + (1.0 - self.lighting_quality) * 0.2
        
        # Apply adjustments
        self.adaptive_focus_threshold = base_focus * distance_factor * glasses_factor
        self.adaptive_vertical_threshold = base_vertical * distance_factor
        self.adaptive_ear_threshold = base_ear * lighting_factor * (0.9 if self.wearing_glasses else 1.0)
        
        # Clamp to reasonable ranges
        self.adaptive_focus_threshold = np.clip(self.adaptive_focus_threshold, 0.30, 0.65)
        self.adaptive_vertical_threshold = np.clip(self.adaptive_vertical_threshold, 0.35, 0.7)
        self.adaptive_ear_threshold = np.clip(self.adaptive_ear_threshold, 0.15, 0.28)
    
    def enhance_frame_quality(self, frame):
        """Enhance frame for better landmark detection in poor conditions"""
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) for better contrast
        if self.lighting_quality < 0.7:
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            
            enhanced = cv2.merge([l, a, b])
            frame = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        return frame
        
    def calculate_eye_aspect_ratio(self, eye_points):
        """Calculate Eye Aspect Ratio (EAR) to detect eye closure"""
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
    
    def is_blinking(self, left_ear, right_ear):
        """Determine if current eye closure is a blink or prolonged closure"""
        current_time = time.time()
        avg_ear = (left_ear + right_ear) / 2
        
        # Use adaptive threshold
        threshold = self.adaptive_ear_threshold
        
        # Check if eyes are closed
        if avg_ear < threshold:
            # Record blink start
            if len(self.blink_history) == 0 or self.blink_history[-1]['state'] != 'closed':
                self.blink_history.append({
                    'state': 'closed',
                    'start_time': current_time
                })
            
            # Check duration of closure
            closure_duration = current_time - self.blink_history[-1]['start_time']
            
            # If closed for less than max_blink_duration, it's a blink
            # If longer, it's intentional eye closure (unfocused)
            return closure_duration < self.max_blink_duration
        else:
            # Eyes are open
            if len(self.blink_history) > 0 and self.blink_history[-1]['state'] == 'closed':
                self.blink_history.append({
                    'state': 'open',
                    'start_time': current_time
                })
            return False
    
    def calculate_gaze_ratio(self, eye_points, iris_points, frame_shape):
        """Calculate gaze ratio to determine if user is looking at screen"""
        # Get eye region
        eye_region = np.array([(point.x * frame_shape[1], point.y * frame_shape[0]) 
                               for point in eye_points], dtype=np.int32)
        
        # Get iris center
        iris_center = np.mean([(point.x * frame_shape[1], point.y * frame_shape[0]) 
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
        
        return horizontal_ratio, vertical_ratio
    
    def calculate_head_pose(self, landmarks, frame_shape):
        """Estimate head pose using facial landmarks"""
        # Key facial landmarks for pose estimation
        nose_tip = landmarks[1]
        chin = landmarks[152]
        left_eye = landmarks[33]
        right_eye = landmarks[263]
        left_mouth = landmarks[61]
        right_mouth = landmarks[291]
        
        # Convert to pixel coordinates
        h, w = frame_shape[:2]
        nose = np.array([nose_tip.x * w, nose_tip.y * h])
        
        # Calculate face center
        face_center = np.array([
            (left_eye.x + right_eye.x) * w / 2,
            (left_eye.y + right_eye.y) * h / 2
        ])
        
        # Head tilt estimation
        eye_distance = np.linalg.norm([
            (right_eye.x - left_eye.x) * w,
            (right_eye.y - left_eye.y) * h
        ])
        
        # Normalized deviation from center
        horizontal_deviation = abs(nose[0] - face_center[0]) / (w / 2)
        vertical_deviation = abs(nose[1] - face_center[1]) / (h / 2)
        
        return horizontal_deviation, vertical_deviation
    
    def is_focused(self, left_gaze, right_gaze, head_pose, left_ear, right_ear):
        """Determine if user is focused on screen"""
        left_h, left_v = left_gaze
        right_h, right_v = right_gaze
        head_h, head_v = head_pose
        
        # Check for eye closure (not blinking)
        is_blink = self.is_blinking(left_ear, right_ear)
        avg_ear = (left_ear + right_ear) / 2
        
        # Use adaptive thresholds
        ear_threshold = self.adaptive_ear_threshold
        focus_threshold = self.adaptive_focus_threshold
        vertical_threshold = self.adaptive_vertical_threshold
        
        # If eyes are closed and it's not a blink, user is unfocused
        if avg_ear < ear_threshold and not is_blink:
            return False
        
        # Ignore if currently blinking
        if is_blink:
            return True  # Don't penalize for blinking
        
        # Check for vertical gaze (looking up or down significantly)
        looking_up_down = (abs(left_v) > vertical_threshold or 
                          abs(right_v) > vertical_threshold)
        
        if looking_up_down:
            return False
        
        # Check if horizontal gaze is roughly centered (with adaptive threshold)
        gaze_centered = (abs(left_h) < focus_threshold and \
                        abs(right_h) < focus_threshold)
        
        # Check if head is facing forward (more lenient based on distance)
        # When very close, head position matters less due to perspective
        if self.face_distance < 1.0:
            # Very close - very lenient on head position
            head_threshold = 0.4 + (1.0 - self.face_distance) * 0.3
        else:
            # Normal/far distance
            head_threshold = 0.3 * (1.0 + (self.face_distance - 1.0) * 0.2)
        
        head_forward = (head_h < head_threshold and head_v < head_threshold)
        
        return gaze_centered and head_forward
    
    def show_notification(self, message):
        """Show desktop notification using tkinter"""
        def show_popup():
            root = tk.Tk()
            root.withdraw()
            root.attributes('-topmost', True)
            messagebox.showwarning("Focus Alert", message)
            root.destroy()
        
        # Run in separate thread to avoid blocking
        thread = threading.Thread(target=show_popup, daemon=True)
        thread.start()
    
    def log_attention(self, is_focused):
        """Log attention status every 10 minutes"""
        current_time = datetime.now()
        if current_time - self.last_log_time >= self.log_interval:
            # Calculate focus percentage in last interval
            recent_history = list(self.focus_history)[-600:]  # Last 10 minutes
            if recent_history:
                focus_percentage = (sum(recent_history) / len(recent_history)) * 100
            else:
                focus_percentage = 0
            
            log_entry = {
                'timestamp': current_time.strftime('%Y-%m-%d %H:%M:%S'),
                'focus_percentage': focus_percentage,
                'status': 'Focused' if focus_percentage > 70 else 'Distracted'
            }
            self.attention_log.append(log_entry)
            print(f"\n[ATTENTION LOG] {log_entry['timestamp']} - Focus: {focus_percentage:.1f}% - {log_entry['status']}")
            
            self.last_log_time = current_time
    
    def draw_info(self, frame, is_focused, focus_time_lost, left_ear, right_ear, left_gaze, right_gaze):
        """Draw information overlay on frame"""
        h, w = frame.shape[:2]
        
        # Background for text (extended for new info)
        overlay = frame.copy()
        cv2.rectangle(overlay, (10, 10), (w - 10, 230), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
        
        # Status
        status_text = "FOCUSED" if is_focused else "UNFOCUSED"
        status_color = (0, 255, 0) if is_focused else (0, 0, 255)
        cv2.putText(frame, status_text, (20, 40), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, status_color, 2)
        
        # Eye metrics
        avg_ear = (left_ear + right_ear) / 2
        is_blink = self.is_blinking(left_ear, right_ear)
        
        eye_status = "BLINK" if is_blink else ("CLOSED" if avg_ear < self.adaptive_ear_threshold else "OPEN")
        eye_color = (255, 255, 0) if is_blink else ((0, 0, 255) if avg_ear < self.adaptive_ear_threshold else (0, 255, 0))
        cv2.putText(frame, f"Eyes: {eye_status} (EAR: {avg_ear:.2f})", (20, 70), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, eye_color, 2)
        
        # Gaze direction
        left_h, left_v = left_gaze
        right_h, right_v = right_gaze
        avg_v = (left_v + right_v) / 2
        
        if abs(avg_v) > self.adaptive_vertical_threshold:
            gaze_dir = "UP" if avg_v < -self.adaptive_vertical_threshold else "DOWN"
            cv2.putText(frame, f"Gaze: Looking {gaze_dir}", (20, 95), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 2)
        
        # Time unfocused
        if focus_time_lost > 0:
            minutes, seconds = divmod(int(focus_time_lost), 60)
            time_text = f"Unfocused: {minutes}m {seconds}s"
            cv2.putText(frame, time_text, (20, 120), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)
        
        # Session statistics
        session_duration = (datetime.now() - self.session_start_time).total_seconds()
        session_minutes = int(session_duration / 60)
        
        # Calculate focus percentage
        if self.focus_history:
            focus_percentage = (sum(self.focus_history) / len(self.focus_history)) * 100
        else:
            focus_percentage = 100
        
        stats_text = f"Session: {session_minutes}m | Focus: {focus_percentage:.1f}%"
        cv2.putText(frame, stats_text, (20, 145), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Adaptive conditions info
        glasses_text = "Glasses: YES" if self.wearing_glasses else "Glasses: NO"
        glasses_color = (100, 200, 255) if self.wearing_glasses else (150, 150, 150)
        cv2.putText(frame, glasses_text, (20, 170), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.45, glasses_color, 1)
        
        distance_cm = int(30 / max(self.face_distance, 0.5))  # Rough estimation
        distance_text = f"Distance: ~{distance_cm}cm"
        distance_color = (0, 255, 0) if 20 < distance_cm < 60 else ((255, 200, 0) if distance_cm < 80 else (255, 100, 0))
        cv2.putText(frame, distance_text, (220, 170),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.45, distance_color, 1)
        
        lighting_text = f"Light: {int(self.lighting_quality * 100)}%"
        lighting_color = (0, 255, 0) if self.lighting_quality > 0.7 else ((255, 200, 0) if self.lighting_quality > 0.5 else (255, 100, 0))
        cv2.putText(frame, lighting_text, (420, 170),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.45, lighting_color, 1)
        
        # Instructions
        cv2.putText(frame, "Press 'q' to quit | Press 's' for stats | Press 'c' to calibrate", (20, 200), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)
        
        # Adaptive thresholds info (small text)
        cv2.putText(frame, f"Adaptive: Focus={self.adaptive_focus_threshold:.2f} EAR={self.adaptive_ear_threshold:.2f}", 
                   (20, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (150, 150, 150), 1)
        
    def print_statistics(self):
        """Print detailed session statistics"""
        session_duration = (datetime.now() - self.session_start_time).total_seconds()
        
        print("\n" + "="*50)
        print("SESSION STATISTICS")
        print("="*50)
        print(f"Session Duration: {int(session_duration/60)} minutes")
        
        if self.focus_history:
            focus_percentage = (sum(self.focus_history) / len(self.focus_history)) * 100
            unfocus_percentage = 100 - focus_percentage
            print(f"Overall Focus: {focus_percentage:.1f}%")
            print(f"Overall Unfocused: {unfocus_percentage:.1f}%")
        
        print(f"\nTotal Attention Logs: {len(self.attention_log)}")
        if self.attention_log:
            print("\nRecent Logs:")
            for log in self.attention_log[-3:]:
                print(f"  {log['timestamp']} - {log['status']} ({log['focus_percentage']:.1f}%)")
        
        print("="*50 + "\n")
    
    def run(self):
        """Main application loop"""
        print("Eye Tracking Focus Monitor Started")
        print("Enhanced with: Glasses Detection | Distance Adaptation | Lighting Compensation")
        print("Position yourself in front of the camera")
        print("Look at the screen normally - system will auto-adapt\n")
        
        frame_count = 0
        focus_time_lost = 0
        
        while self.running and self.cap.isOpened():
            success, frame = self.cap.read()
            if not success:
                print("Failed to capture frame")
                continue
            
            frame = cv2.flip(frame, 1)
            
            # Assess lighting quality
            self.lighting_quality = self.assess_lighting_quality(frame)
            self.lighting_history.append(self.lighting_quality)
            
            # Enhance frame if needed
            enhanced_frame = self.enhance_frame_quality(frame.copy())
            
            rgb_frame = cv2.cvtColor(enhanced_frame, cv2.COLOR_BGR2RGB)
            results = self.face_mesh.process(rgb_frame)
            
            is_focused = False
            left_ear = 0
            right_ear = 0
            left_gaze = (0, 0)
            right_gaze = (0, 0)
            
            if results.multi_face_landmarks:
                face_landmarks = results.multi_face_landmarks[0]
                landmarks = face_landmarks.landmark
                
                # Detect glasses
                self.wearing_glasses = self.detect_glasses(landmarks, frame.shape)
                
                # Estimate distance from camera
                self.face_distance = self.estimate_face_distance(landmarks, frame.shape)
                self.distance_history.append(self.face_distance)
                
                # Smooth distance using moving average
                if len(self.distance_history) > 0:
                    self.face_distance = np.mean(list(self.distance_history))
                
                # Adapt thresholds based on current conditions
                self.adapt_thresholds()
                
                # Get eye and iris landmarks
                left_eye_points = [landmarks[i] for i in self.LEFT_EYE]
                right_eye_points = [landmarks[i] for i in self.RIGHT_EYE]
                left_iris_points = [landmarks[i] for i in self.LEFT_IRIS]
                right_iris_points = [landmarks[i] for i in self.RIGHT_IRIS]
                
                # Calculate Eye Aspect Ratio for both eyes
                left_ear = self.calculate_eye_aspect_ratio(left_eye_points)
                right_ear = self.calculate_eye_aspect_ratio(right_eye_points)
                
                # Calculate gaze ratios
                left_gaze = self.calculate_gaze_ratio(left_eye_points, left_iris_points, frame.shape)
                right_gaze = self.calculate_gaze_ratio(right_eye_points, right_iris_points, frame.shape)
                
                # Calculate head pose
                head_pose = self.calculate_head_pose(landmarks, frame.shape)
                
                # Determine focus (with eye closure and blink detection)
                is_focused = self.is_focused(left_gaze, right_gaze, head_pose, left_ear, right_ear)
                
                # Draw eye regions for visualization
                h, w = frame.shape[:2]
                for point in left_iris_points + right_iris_points:
                    x, y = int(point.x * w), int(point.y * h)
                    cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)
            
            # Update focus history
            self.focus_history.append(1 if is_focused else 0)
            
            # Track unfocused duration
            if not is_focused:
                if self.unfocused_start_time is None:
                    self.unfocused_start_time = time.time()
                focus_time_lost = time.time() - self.unfocused_start_time
                
                # Alert if unfocused for too long
                if focus_time_lost >= self.unfocused_duration_threshold:
                    self.show_notification(
                        f"You've been unfocused for {int(focus_time_lost/60)} minutes!\n"
                        "Time to refocus on your learning."
                    )
                    self.unfocused_start_time = time.time()  # Reset timer
            else:
                self.unfocused_start_time = None
                focus_time_lost = 0
            
            # Log attention periodically
            self.log_attention(is_focused)
            
            # Draw information overlay
            self.draw_info(frame, is_focused, focus_time_lost, left_ear, right_ear, left_gaze, right_gaze)
            
            # Display frame
            cv2.imshow('Eye Tracking Focus Monitor', frame)
            
            # Handle key presses
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('s'):
                self.print_statistics()
            elif key == ord('c'):
                print("\n[CALIBRATION] Current adaptive settings:")
                print(f"  Glasses detected: {self.wearing_glasses}")
                print(f"  Distance ratio: {self.face_distance:.2f}")
                print(f"  Lighting quality: {self.lighting_quality:.2f}")
                print(f"  Focus threshold: {self.adaptive_focus_threshold:.3f}")
                print(f"  EAR threshold: {self.adaptive_ear_threshold:.3f}")
                print("System is auto-calibrating continuously.\n")
            
            frame_count += 1
        
        self.cleanup()
    
    def cleanup(self):
        """Clean up resources"""
        self.running = False
        self.cap.release()
        cv2.destroyAllWindows()
        self.print_statistics()
        print("Eye Tracking Monitor Stopped")

def main():
    try:
        monitor = EyeTrackingMonitor()
        monitor.run()
    except KeyboardInterrupt:
        print("\nStopping monitor...")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()