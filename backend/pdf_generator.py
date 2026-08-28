"""
PDF Report Generator for Learning System
Generates professional PDF reports with proper formatting and alignment
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from datetime import datetime
from typing import Dict, List, Any


def _safe_iso_to_datetime(value: Any) -> datetime | None:
    """Parse datetime values from ISO strings or datetime objects."""
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value.strip():
        candidate = value.strip().replace('Z', '+00:00')
        try:
            return datetime.fromisoformat(candidate)
        except ValueError:
            return None
    return None


def _format_datetime(value: Any, fallback: str = "N/A") -> str:
    """Format datetime-like values for consistent PDF display."""
    parsed = _safe_iso_to_datetime(value)
    if parsed:
        return parsed.strftime('%b %d, %Y %I:%M %p')
    if isinstance(value, str) and value.strip():
        return value.strip()
    return fallback


def _safe_focus(value: Any) -> float:
    """Normalize focus level for rendering."""
    try:
        focus = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(100.0, focus))

def create_session_pdf_report(report_data: Dict[str, Any]) -> BytesIO:
    """
    Generate a professional PDF report for a session
    
    Args:
        report_data: Dictionary containing session report data
        
    Returns:
        BytesIO: PDF file as bytes
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                           rightMargin=72, leftMargin=72,
                           topMargin=72, bottomMargin=72)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define custom styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=12,
        spaceBefore=20,
        fontName='Helvetica-Bold'
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubHeading',
        parent=styles['Heading3'],
        fontSize=13,
        textColor=colors.HexColor('#374151'),
        spaceAfter=10,
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=10
    )
    
    # Title
    title = Paragraph("📊 Learning Session Report", title_style)
    elements.append(title)
    elements.append(Spacer(1, 0.2*inch))
    
    # Horizontal line
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#1e40af')))
    elements.append(Spacer(1, 0.3*inch))
    
    # Session Information Section
    elements.append(Paragraph("Session Information", heading_style))
    
    session_start = _format_datetime(report_data.get('start_time'))
    session_info_data = [
        ['Session Code:', report_data['session_code']],
        ['Subject:', report_data['subject']],
        ['Teacher:', report_data['teacher_name']],
        ['Date:', session_start],
        ['Duration:', f"{report_data['duration_minutes']} minutes"],
        ['Status:', 'Active' if report_data['is_active'] else 'Completed']
    ]
    
    session_table = Table(session_info_data, colWidths=[2*inch, 4*inch])
    session_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e0e7ff')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#1e40af')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('PADDING', (0, 0), (-1, -1), 12),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(session_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Statistics Section
    elements.append(Paragraph("Session Statistics", heading_style))
    
    stats = report_data['statistics']
    stats_data = [
        ['Metric', 'Value'],
        ['Total Students', str(stats['total_students'])],
        ['Average Focus Level', f"{stats['avg_focus']}%"],
        ['Active Engagement Rate', f"{stats['avg_engagement']}%"],
    ]
    
    stats_table = Table(stats_data, colWidths=[3*inch, 3*inch])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('PADDING', (0, 0), (-1, -1), 12),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f3f4f6')),
    ]))
    elements.append(stats_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # Focus Distribution
    elements.append(Paragraph("Focus Distribution", subheading_style))
    focus_dist = stats['focus_distribution']
    focus_data = [
        ['Category', 'Count'],
        ['High Focus (70%+)', str(focus_dist['high'])],
        ['Medium Focus (40-70%)', str(focus_dist['medium'])],
        ['Low Focus (<40%)', str(focus_dist['low'])],
    ]
    
    focus_table = Table(focus_data, colWidths=[3*inch, 3*inch])
    focus_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('PADDING', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#ecfdf5')),
    ]))
    elements.append(focus_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # Emotion Distribution
    elements.append(Paragraph("Emotion Distribution", subheading_style))
    emotion_data = [['Emotion', 'Count']]
    emotion_icons = {
        'happy': '😊',
        'happiness': '😊',
        'sad': '😢',
        'sadness': '😢',
        'angry': '😠',
        'anger': '😠',
        'fear': '😨',
        'fearful': '😨',
        'surprise': '😲',
        'surprised': '😲',
        'disgust': '🤢',
        'disgusted': '🤢',
        'neutral': '😐'
    }
    for emotion, count in stats['emotions'].items():
        icon = emotion_icons.get(emotion, '😐')
        emotion_data.append([f"{icon} {emotion.capitalize()}", str(count)])
    
    emotion_table = Table(emotion_data, colWidths=[3*inch, 3*inch])
    emotion_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8b5cf6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('PADDING', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f5f3ff')),
    ]))
    elements.append(emotion_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Student Performance Section
    if report_data['students']:
        elements.append(PageBreak())
        elements.append(Paragraph("Individual Student Performance", heading_style))
        elements.append(Spacer(1, 0.2*inch))
        
        # Student table header
        student_data = [['Name', 'Emotion', 'Engagement', 'Focus Level', 'Joined At', 'Data Points']]
        
        # Add student rows
        for student in report_data['students']:
            emotion_icon = emotion_icons.get(student['emotion'], '😐')
            
            # Color code focus level
            focus = _safe_focus(student.get('focus_level'))
            joined_at = _format_datetime(student.get('joined_at'))
            data_points = int(student.get('data_points') or 0)
            
            student_data.append([
                (student.get('name') or 'Unknown')[:20],
                f"{emotion_icon} {student['emotion']}",
                student['engagement'].capitalize(),
                f"{focus:.1f}%",
                joined_at,
                str(data_points)
            ])
        
        student_table = Table(student_data, colWidths=[1.25*inch, 1.0*inch, 1.0*inch, 0.7*inch, 2.0*inch, 0.55*inch])
        
        # Apply styling
        table_style = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (3, -1), 'CENTER'),
            ('ALIGN', (4, 0), (4, -1), 'LEFT'),
            ('ALIGN', (5, 0), (5, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]
        
        # Alternating row colors
        for i in range(1, len(student_data)):
            if i % 2 == 0:
                table_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#f9fafb')))
            else:
                table_style.append(('BACKGROUND', (0, i), (-1, i), colors.white))
        
        # Color code focus levels
        for i, student in enumerate(report_data['students'], 1):
            focus = _safe_focus(student.get('focus_level'))
            if focus >= 70:
                table_style.append(('TEXTCOLOR', (3, i), (3, i), colors.HexColor('#10b981')))
                table_style.append(('FONTNAME', (3, i), (3, i), 'Helvetica-Bold'))
            elif focus >= 40:
                table_style.append(('TEXTCOLOR', (3, i), (3, i), colors.HexColor('#f59e0b')))
            else:
                table_style.append(('TEXTCOLOR', (3, i), (3, i), colors.HexColor('#ef4444')))
        
        student_table.setStyle(TableStyle(table_style))
        elements.append(student_table)
        elements.append(Spacer(1, 0.2*inch))

        # Additional attendance/contact details for complete teacher visibility
        attendance_data = [['Name', 'Email', 'Joined At']]
        for student in report_data['students']:
            attendance_data.append([
                (student.get('name') or 'Unknown')[:25],
                (student.get('email') or 'N/A')[:35],
                _format_datetime(student.get('joined_at'))
            ])

        attendance_table = Table(attendance_data, colWidths=[1.8*inch, 2.4*inch, 1.8*inch])
        attendance_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#374151')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (2, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f9fafb')),
        ]))
        elements.append(Paragraph("Attendance Details", subheading_style))
        elements.append(attendance_table)
    
    # Footer
    elements.append(Spacer(1, 0.5*inch))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1')))
    elements.append(Spacer(1, 0.1*inch))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#6b7280'),
        alignment=TA_CENTER
    )
    
    footer_text = f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br/>Learning Analytics System"
    elements.append(Paragraph(footer_text, footer_style))
    
    # Build PDF
    doc.build(elements)
    
    # Get the value of the BytesIO buffer
    buffer.seek(0)
    return buffer


def create_summary_pdf_report(report_data: Dict[str, Any], user_role: str) -> BytesIO:
    """
    Generate a professional PDF summary report for teacher or student
    
    Args:
        report_data: Dictionary containing summary report data
        user_role: 'teacher' or 'student'
        
    Returns:
        BytesIO: PDF file as bytes
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                           rightMargin=72, leftMargin=72,
                           topMargin=72, bottomMargin=72)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=12,
        spaceBefore=20,
        fontName='Helvetica-Bold'
    )
    
    # Title
    title_text = "📚 Teaching Performance Report" if user_role == 'teacher' else "🎓 Learning Progress Report"
    elements.append(Paragraph(title_text, title_style))
    elements.append(Spacer(1, 0.2*inch))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#1e40af')))
    elements.append(Spacer(1, 0.3*inch))
    
    # User info
    user_name = report_data.get('teacher_name') if user_role == 'teacher' else report_data.get('student_name')
    period = report_data.get('period_days', 30)
    
    info_data = [
        ['Name:', user_name],
        ['Report Period:', f'Last {period} days'],
        ['Generated:', datetime.now().strftime('%B %d, %Y')]
    ]
    
    info_table = Table(info_data, colWidths=[2*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e0e7ff')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#1e40af')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('PADDING', (0, 0), (-1, -1), 12),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Key Metrics
    elements.append(Paragraph("Key Metrics", heading_style))
    
    metrics_data = [['Metric', 'Value']]
    if user_role == 'teacher':
        metrics_data.extend([
            ['Total Sessions', str(report_data.get('total_sessions', 0))],
            ['Total Students', str(report_data.get('total_students', 0))],
            ['Avg Focus Level', f"{report_data.get('avg_focus_level', 0)}%"],
            ['Total Duration', f"{int(report_data.get('total_duration_minutes', 0))} min"]
        ])
    else:
        metrics_data.extend([
            ['Sessions Attended', str(report_data.get('total_sessions', 0))],
            ['Avg Focus Level', f"{report_data.get('avg_focus_level', 0)}%"],
            ['Avg Engagement', f"{report_data.get('avg_engagement', 0)}%"],
            ['Total Duration', f"{int(report_data.get('total_duration_minutes', 0))} min"]
        ])
    
    metrics_table = Table(metrics_data, colWidths=[3*inch, 3*inch])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('PADDING', (0, 0), (-1, -1), 12),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f3f4f6')),
    ]))
    elements.append(metrics_table)
    
    # Footer
    elements.append(Spacer(1, 1*inch))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1')))
    elements.append(Spacer(1, 0.1*inch))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#6b7280'),
        alignment=TA_CENTER
    )
    
    footer_text = f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br/>Learning Analytics System"
    elements.append(Paragraph(footer_text, footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer
