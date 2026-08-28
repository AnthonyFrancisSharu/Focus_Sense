import random
import string

def generate_session_code(length: int = 6) -> str:
    """Generate a random session code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def format_duration(seconds: int) -> str:
    """Format duration in seconds to human readable format"""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    
    if hours > 0:
        return f"{hours}h {minutes}m {secs}s"
    elif minutes > 0:
        return f"{minutes}m {secs}s"
    else:
        return f"{secs}s"
