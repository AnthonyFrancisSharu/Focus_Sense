from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime, timedelta
from typing import List, Dict, Any

from models import UserInDB
from auth import get_current_user, get_current_teacher, get_current_student
from database import get_database

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def normalize_engagement(value: Any) -> str:
    """Normalize engagement values to active/passive/distracted."""
    if value is None:
        return "passive"

    text = str(value).strip().lower().replace("_", " ").replace("-", " ")
    text = " ".join(text.split())

    if text in {"active", "passive", "distracted"}:
        return text

    aliases = {
        "engaged": "active",
        "focused": "active",
        "attentive": "active",
        "not engaged": "passive",
        "inactive": "passive",
        "idle": "passive",
        "unfocused": "distracted",
        "away": "distracted",
        "off screen": "distracted",
    }
    return aliases.get(text, "passive")


def normalize_emotion(value: Any) -> str:
    """Normalize emotion labels to a stable lowercase set."""
    if value is None:
        return "neutral"

    emotion = str(value).strip().lower()
    aliases = {
        "happiness": "happy",
        "sadness": "sad",
        "anger": "angry",
        "fearful": "fear",
        "surprised": "surprise",
        "disgusted": "disgust",
        "neutrality": "neutral",
    }
    return aliases.get(emotion, emotion or "neutral")


def normalize_focus_level(value: Any, default: float = 0.0) -> float:
    """Normalize focus level to a bounded percentage value."""
    if value is None:
        return default
    try:
        focus = float(value)
    except (TypeError, ValueError):
        return default
    return max(0.0, min(100.0, focus))


def parse_datetime(value: Any) -> datetime | None:
    """Parse datetime values from datetime objects or ISO strings."""
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value.strip():
        candidate = value.strip().replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(candidate)
        except ValueError:
            return None
    return None


def serialize_datetime(value: Any) -> str | None:
    """Serialize datetime-like values to ISO strings."""
    parsed = parse_datetime(value)
    if parsed:
        return parsed.isoformat()
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None

# Helper function to calculate statistics
def calculate_engagement_stats(students_data: List[Dict]) -> Dict:
    """Calculate engagement statistics from student data"""
    if not students_data:
        return {
            "total_students": 0,
            "avg_focus": 0,
            "avg_engagement": 0,
            "emotions": {},
            "engagement_distribution": {"active": 0, "passive": 0, "distracted": 0},
            "focus_distribution": {"high": 0, "medium": 0, "low": 0}
        }
    
    total_focus = 0
    emotion_counts = {}
    engagement_counts = {"active": 0, "passive": 0, "distracted": 0}
    focus_distribution = {"high": 0, "medium": 0, "low": 0}
    
    for student in students_data:
        # Focus level - handle None values
        focus = normalize_focus_level(student.get("focus_level"), 0.0)
        total_focus += focus
        
        if focus >= 70:
            focus_distribution["high"] += 1
        elif focus >= 40:
            focus_distribution["medium"] += 1
        else:
            focus_distribution["low"] += 1
        
        # Emotion - handle None values
        emotion = normalize_emotion(student.get("emotion"))
        emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        
        # Engagement - handle None values
        engagement = normalize_engagement(student.get("engagement"))
        if engagement in engagement_counts:
            engagement_counts[engagement] += 1
    
    avg_focus = total_focus / len(students_data) if students_data else 0
    active_percentage = (engagement_counts["active"] / len(students_data) * 100) if students_data else 0
    
    return {
        "total_students": len(students_data),
        "avg_focus": round(avg_focus, 1),
        "avg_engagement": round(active_percentage, 1),
        "emotions": emotion_counts,
        "engagement_distribution": engagement_counts,
        "focus_distribution": focus_distribution
    }

@router.get("/session/{session_id}")
async def get_session_report(
    session_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get detailed report for a specific session"""
    db = await get_database()
    
    # Get session
    session = await db.sessions.find_one({"_id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check authorization
    if current_user.role == "teacher" and session["teacher_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this session report"
        )
    
    if current_user.role == "student":
        student_in_session = any(s.get("id") == current_user.id for s in session.get("students", []))
        student_has_history = await db.engagement_data.count_documents({
            "session_id": session_id,
            "student_id": current_user.id
        }) > 0

        if not student_in_session and not student_has_history:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this session report"
            )
    
    # Build roster from current session students and historical engagement records
    all_engagement_records = await db.engagement_data.find({
        "session_id": session_id
    }).to_list(None)

    records_by_student: Dict[str, List[Dict[str, Any]]] = {}
    for record in all_engagement_records:
        student_id = record.get("student_id")
        if not student_id:
            continue
        records_by_student.setdefault(student_id, []).append(record)

    student_roster: Dict[str, Dict[str, Any]] = {}

    # Historical participant roster (persists after students leave active list).
    for participant in session.get("participants", []):
        student_id = participant.get("id")
        if not student_id:
            continue
        student_roster[student_id] = {
            "id": student_id,
            "name": participant.get("name"),
            "email": participant.get("email"),
            "joined_at": participant.get("first_joined_at") or participant.get("last_joined_at"),
            "emotion": normalize_emotion(participant.get("emotion")),
            "engagement": normalize_engagement(participant.get("engagement")),
            "focus_level": normalize_focus_level(participant.get("focus_level"), 0.0),
        }

    for student in session.get("students", []):
        student_id = student.get("id")
        if not student_id:
            continue
        existing = student_roster.get(student_id, {})
        student_roster[student_id] = {
            "id": student_id,
            "name": student.get("name") or existing.get("name"),
            "email": student.get("email") or existing.get("email"),
            "joined_at": student.get("joined_at") or existing.get("joined_at"),
            "emotion": normalize_emotion(student.get("emotion") or existing.get("emotion")),
            "engagement": normalize_engagement(student.get("engagement") or existing.get("engagement")),
            "focus_level": normalize_focus_level(student.get("focus_level"), existing.get("focus_level", 0.0)),
        }

    for student_id in records_by_student.keys():
        student_roster.setdefault(student_id, {
            "id": student_id,
            "name": None,
            "email": None,
            "joined_at": None,
            "emotion": "neutral",
            "engagement": "passive",
            "focus_level": 0.0,
        })

    missing_meta_ids = [
        sid for sid, student in student_roster.items()
        if not student.get("name") or not student.get("email")
    ]
    if missing_meta_ids:
        users = await db.users.find(
            {"_id": {"$in": missing_meta_ids}},
            {"_id": 1, "name": 1, "email": 1}
        ).to_list(None)
        for user in users:
            sid = user.get("_id")
            if sid not in student_roster:
                continue
            if not student_roster[sid].get("name"):
                student_roster[sid]["name"] = user.get("name")
            if not student_roster[sid].get("email"):
                student_roster[sid]["email"] = user.get("email")

    # Aggregate analytics for each rostered student
    students_with_analytics = []
    for student_id, student in student_roster.items():
        engagement_records = records_by_student.get(student_id, [])

        if engagement_records:
            total_focus = 0
            emotion_counts = {}
            engagement_counts = {"active": 0, "passive": 0, "distracted": 0}
            valid_focus_count = 0
            first_seen_ts: datetime | None = None
            
            for record in engagement_records:
                # Focus level
                raw_focus = record.get("focus_level")
                if raw_focus is not None:
                    focus = normalize_focus_level(raw_focus, 0.0)
                    total_focus += focus
                    valid_focus_count += 1
                
                # Emotion counts
                emotion = normalize_emotion(record.get("emotion"))
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
                
                # Engagement counts
                engagement = normalize_engagement(record.get("engagement"))
                if engagement in engagement_counts:
                    engagement_counts[engagement] += 1

                timestamp = parse_datetime(record.get("timestamp"))
                if timestamp and (first_seen_ts is None or timestamp < first_seen_ts):
                    first_seen_ts = timestamp
            
            # Calculate averages
            avg_focus = round(total_focus / valid_focus_count, 1) if valid_focus_count > 0 else 0
            
            # Find dominant emotion
            dominant_emotion = max(emotion_counts, key=emotion_counts.get) if emotion_counts else student["emotion"]
            
            # Find dominant engagement
            dominant_engagement = max(engagement_counts, key=engagement_counts.get) if any(engagement_counts.values()) else student["engagement"]

            joined_at = serialize_datetime(student.get("joined_at")) or serialize_datetime(first_seen_ts) or "N/A"
            
            students_with_analytics.append({
                "id": student_id,
                "name": student.get("name") or f"Student {student_id[:8]}",
                "email": student.get("email"),
                "joined_at": joined_at,
                "emotion": normalize_emotion(dominant_emotion),
                "engagement": normalize_engagement(dominant_engagement),
                "focus_level": avg_focus,
                "data_points": len(engagement_records),
                "emotion_distribution": emotion_counts,
                "engagement_distribution": engagement_counts
            })
        else:
            # No historical engagement data - use last known values from roster
            joined_at = serialize_datetime(student.get("joined_at")) or "N/A"
            students_with_analytics.append({
                "id": student_id,
                "name": student.get("name") or f"Student {student_id[:8]}",
                "email": student.get("email"),
                "joined_at": joined_at,
                "emotion": normalize_emotion(student.get("emotion")),
                "engagement": normalize_engagement(student.get("engagement")),
                "focus_level": round(normalize_focus_level(student.get("focus_level"), 0.0), 1),
                "data_points": 0,
                "emotion_distribution": {},
                "engagement_distribution": {}
            })

    students_with_analytics.sort(
        key=lambda student: (
            student.get("joined_at") == "N/A",
            student.get("joined_at") or "",
            student.get("name") or ""
        )
    )
    
    # Calculate overall statistics from aggregated data
    stats = calculate_engagement_stats(students_with_analytics)
    
    # Calculate session duration
    duration_minutes = 0
    if session.get("started_at") and session.get("ended_at"):
        duration = session["ended_at"] - session["started_at"]
        duration_minutes = int(duration.total_seconds() / 60)
    elif session.get("started_at"):
        duration = datetime.utcnow() - session["started_at"]
        duration_minutes = int(duration.total_seconds() / 60)
    
    report = {
        "session_id": session_id,
        "session_code": session["session_code"],
        "subject": session["subject"],
        "teacher_name": session["teacher_name"],
        "start_time": session.get("started_at", session["created_at"]).isoformat(),
        "end_time": session.get("ended_at").isoformat() if session.get("ended_at") else None,
        "duration_minutes": duration_minutes,
        "is_active": session["is_active"],
        "statistics": stats,
        "students": students_with_analytics
    }
    
    return report

@router.get("/teacher/summary")
async def get_teacher_summary(
    days: int = 30,
    current_user: UserInDB = Depends(get_current_teacher)
):
    """Get summary report for teacher across all sessions"""
    db = await get_database()
    
    # Get all teacher's sessions within date range
    start_date = datetime.utcnow() - timedelta(days=days)
    sessions = await db.sessions.find({
        "teacher_id": current_user.id,
        "created_at": {"$gte": start_date}
    }).to_list(None)
    
    if not sessions:
        return {
            "teacher_id": current_user.id,
            "teacher_name": current_user.name,
            "period_days": days,
            "total_sessions": 0,
            "total_students": 0,
            "total_duration_minutes": 0,
            "avg_session_duration": 0,
            "avg_focus_level": 0,
            "avg_engagement": 0,
            "sessions_by_subject": {},
            "emotion_trends": {},
            "focus_trends": []
        }
    
    # Calculate aggregate statistics
    total_students = 0
    total_duration = 0
    all_students_data = []
    sessions_by_subject = {}
    
    for session in sessions:
        # Count unique students
        total_students += len(session.get("students", []))
        
        # Calculate duration
        if session.get("started_at") and session.get("ended_at"):
            duration = session["ended_at"] - session["started_at"]
            total_duration += duration.total_seconds() / 60
        
        # Group by subject
        subject = session["subject"]
        if subject not in sessions_by_subject:
            sessions_by_subject[subject] = {"count": 0, "students": 0}
        sessions_by_subject[subject]["count"] += 1
        sessions_by_subject[subject]["students"] += len(session.get("students", []))
        
        # Collect all student data
        all_students_data.extend(session.get("students", []))
    
    # Calculate overall statistics
    overall_stats = calculate_engagement_stats(all_students_data)
    avg_duration = total_duration / len(sessions) if sessions else 0
    
    return {
        "teacher_id": current_user.id,
        "teacher_name": current_user.name,
        "period_days": days,
        "total_sessions": len(sessions),
        "total_students": total_students,
        "total_duration_minutes": round(total_duration, 1),
        "avg_session_duration": round(avg_duration, 1),
        "avg_focus_level": overall_stats["avg_focus"],
        "avg_engagement": overall_stats["avg_engagement"],
        "sessions_by_subject": sessions_by_subject,
        "emotion_distribution": overall_stats["emotions"],
        "engagement_distribution": overall_stats["engagement_distribution"],
        "focus_distribution": overall_stats["focus_distribution"]
    }

@router.get("/student/summary")
async def get_student_summary(
    days: int = 30,
    current_user: UserInDB = Depends(get_current_student)
):
    """Get summary report for student across all attended sessions"""
    db = await get_database()
    
    # Get all sessions the student attended within date range
    start_date = datetime.utcnow() - timedelta(days=days)
    sessions = await db.sessions.find({
        "students.id": current_user.id,
        "created_at": {"$gte": start_date}
    }).to_list(None)
    
    if not sessions:
        return {
            "student_id": current_user.id,
            "student_name": current_user.name,
            "period_days": days,
            "total_sessions": 0,
            "total_duration_minutes": 0,
            "avg_focus_level": 0,
            "avg_engagement": 0,
            "subjects_attended": {},
            "performance_trend": [],
            "emotion_distribution": {},
            "recommendations": []
        }
    
    # Calculate statistics for this student
    total_duration = 0
    student_performance = []
    subjects = {}
    
    for session in sessions:
        # Find student data in this session
        student_data = next((s for s in session.get("students", []) if s["id"] == current_user.id), None)
        if not student_data:
            continue
        
        # Calculate duration
        duration = 0
        if session.get("started_at") and session.get("ended_at"):
            duration_delta = session["ended_at"] - session["started_at"]
            duration = duration_delta.total_seconds() / 60
            total_duration += duration
        
        # Track performance - handle None values
        focus_level = student_data.get("focus_level") or 0
        engagement = student_data.get("engagement") or "passive"
        emotion = student_data.get("emotion") or "neutral"
        
        student_performance.append({
            "session_id": session["_id"],
            "session_code": session["session_code"],
            "subject": session["subject"],
            "date": session.get("started_at", session["created_at"]).isoformat(),
            "duration_minutes": round(duration, 1),
            "focus_level": focus_level,
            "engagement": engagement,
            "emotion": emotion
        })
        
        # Group by subject
        subject = session["subject"]
        if subject not in subjects:
            subjects[subject] = {
                "count": 0,
                "total_focus": 0,
                "emotions": {}
            }
        subjects[subject]["count"] += 1
        subjects[subject]["total_focus"] += focus_level
        
        subjects[subject]["emotions"][emotion] = subjects[subject]["emotions"].get(emotion, 0) + 1
    
    # Calculate averages
    total_focus = sum(p["focus_level"] for p in student_performance)
    avg_focus = total_focus / len(student_performance) if student_performance else 0
    
    active_count = sum(1 for p in student_performance if p["engagement"] == "active")
    avg_engagement = (active_count / len(student_performance) * 100) if student_performance else 0
    
    # Calculate emotion distribution
    emotion_counts = {}
    for perf in student_performance:
        emotion = perf["emotion"]
        emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
    
    # Generate recommendations
    recommendations = []
    if avg_focus < 50:
        recommendations.append("Try to minimize distractions during sessions")
        recommendations.append("Consider taking short breaks to maintain focus")
    if avg_engagement < 50:
        recommendations.append("Engage more actively with the learning material")
        recommendations.append("Ask questions when concepts are unclear")
    
    positive_emotions = emotion_counts.get("happiness", 0) + emotion_counts.get("neutral", 0)
    negative_emotions = emotion_counts.get("sadness", 0) + emotion_counts.get("fear", 0) + emotion_counts.get("anger", 0)
    if negative_emotions > positive_emotions:
        recommendations.append("Consider discussing any learning challenges with your teacher")
        recommendations.append("Ensure you're getting adequate rest before sessions")
    
    # Calculate subject averages
    subjects_summary = {}
    for subject, data in subjects.items():
        subjects_summary[subject] = {
            "sessions_attended": data["count"],
            "avg_focus": round(data["total_focus"] / data["count"], 1),
            "top_emotion": max(data["emotions"].items(), key=lambda x: x[1])[0] if data["emotions"] else "neutral"
        }
    
    return {
        "student_id": current_user.id,
        "student_name": current_user.name,
        "period_days": days,
        "total_sessions": len(sessions),
        "total_duration_minutes": round(total_duration, 1),
        "avg_focus_level": round(avg_focus, 1),
        "avg_engagement": round(avg_engagement, 1),
        "subjects_attended": subjects_summary,
        "performance_history": sorted(student_performance, key=lambda x: x["date"], reverse=True),
        "emotion_distribution": emotion_counts,
        "recommendations": recommendations
    }

@router.get("/session/{session_id}/export")
async def export_session_report(
    session_id: str,
    format: str = "json",
    current_user: UserInDB = Depends(get_current_user)
):
    """Export session report in various formats (json, csv, pdf)"""
    # Get the report data
    report = await get_session_report(session_id, current_user)
    
    if format == "pdf":
        # Generate PDF
        from pdf_generator import create_session_pdf_report
        
        pdf_buffer = create_session_pdf_report(report)
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=session_{session_id}_report.pdf"
            }
        )
    
    elif format == "csv":
        # Generate CSV
        from io import StringIO
        import csv
        
        output = StringIO()
        
        # Write session info
        output.write(f"Session Report\n")
        output.write(f"Session Code,{report['session_code']}\n")
        output.write(f"Subject,{report['subject']}\n")
        output.write(f"Teacher,{report['teacher_name']}\n")
        output.write(f"Date,{report['start_time']}\n")
        output.write(f"Duration (minutes),{report['duration_minutes']}\n")
        output.write(f"\n")
        
        # Write statistics
        output.write(f"Statistics\n")
        output.write(f"Total Students,{report['statistics']['total_students']}\n")
        output.write(f"Average Focus,{report['statistics']['avg_focus']}%\n")
        output.write(f"Average Engagement,{report['statistics']['avg_engagement']}%\n")
        output.write(f"\n")
        
        # Write student details
        output.write(f"Student Details\n")
        writer = csv.DictWriter(output, fieldnames=["Name", "Email", "Joined At", "Emotion", "Engagement", "Focus Level"])
        writer.writeheader()
        
        for student in report['students']:
            writer.writerow({
                "Name": student["name"],
                "Email": student.get("email", "N/A"),
                "Joined At": student["joined_at"],
                "Emotion": student["emotion"],
                "Engagement": student["engagement"],
                "Focus Level": f"{student['focus_level']}%"
            })
        
        csv_content = output.getvalue()
        
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=session_{session_id}_report.csv"
            }
        )
    
    # Default: JSON format
    return report

@router.get("/teacher/summary/export")
async def export_teacher_summary(
    days: int = 30,
    format: str = "pdf",
    current_user: UserInDB = Depends(get_current_teacher)
):
    """Export teacher summary report as PDF or JSON"""
    summary = await get_teacher_summary(days, current_user)
    
    if format == "pdf":
        from pdf_generator import create_summary_pdf_report
        
        pdf_buffer = create_summary_pdf_report(summary, "teacher")
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=teacher_summary_{days}days.pdf"
            }
        )
    
    return summary

@router.get("/student/summary/export")
async def export_student_summary(
    days: int = 30,
    format: str = "pdf",
    current_user: UserInDB = Depends(get_current_student)
):
    """Export student summary report as PDF or JSON"""
    summary = await get_student_summary(days, current_user)
    
    if format == "pdf":
        from pdf_generator import create_summary_pdf_report
        
        pdf_buffer = create_summary_pdf_report(summary, "student")
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=student_summary_{days}days.pdf"
            }
        )
    
    return summary

@router.get("/admin/overview")
async def get_admin_overview(
    days: int = 30,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get system-wide overview for administrators"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    db = await get_database()
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get all sessions
    sessions = await db.sessions.find({
        "created_at": {"$gte": start_date}
    }).to_list(None)
    
    # Get all users
    teachers = await db.users.count_documents({"role": "teacher"})
    students = await db.users.count_documents({"role": "student"})
    
    # Calculate system-wide statistics
    total_duration = 0
    all_students_data = []
    active_sessions = 0
    
    for session in sessions:
        if session["is_active"]:
            active_sessions += 1
        
        if session.get("started_at") and session.get("ended_at"):
            duration = session["ended_at"] - session["started_at"]
            total_duration += duration.total_seconds() / 60
        
        all_students_data.extend(session.get("students", []))
    
    overall_stats = calculate_engagement_stats(all_students_data)
    
    return {
        "period_days": days,
        "system_stats": {
            "total_teachers": teachers,
            "total_students": students,
            "total_sessions": len(sessions),
            "active_sessions": active_sessions,
            "completed_sessions": len(sessions) - active_sessions
        },
        "usage_stats": {
            "total_duration_minutes": round(total_duration, 1),
            "avg_session_duration": round(total_duration / len(sessions), 1) if sessions else 0,
            "total_participants": overall_stats["total_students"]
        },
        "engagement_stats": {
            "avg_focus_level": overall_stats["avg_focus"],
            "avg_engagement": overall_stats["avg_engagement"],
            "emotion_distribution": overall_stats["emotions"],
            "focus_distribution": overall_stats["focus_distribution"]
        }
    }
