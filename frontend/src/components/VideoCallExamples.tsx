/**
 * Example: Adding Agora Video Call to Teacher Dashboard
 */

import { useState } from 'react'
import AgoraVideoCall from '@/components/AgoraVideoCall'
import { Video, VideoOff } from 'lucide-react'

export default function TeacherDashboardWithVideo() {
  const [showVideoCall, setShowVideoCall] = useState(false)
  
  // Your existing state
  const sessionId = "current_session_id"
  const teacherId = "teacher_123"
  const teacherName = "Dr. Smith"
  const students: any[] = [] // Your students array

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
            <p className="text-gray-600">Session: Advanced Mathematics</p>
          </div>
          
          {/* Video Call Toggle */}
          <button
            onClick={() => setShowVideoCall(!showVideoCall)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
              showVideoCall
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {showVideoCall ? (
              <>
                <VideoOff className="w-5 h-5" />
                End Video Call
              </>
            ) : (
              <>
                <Video className="w-5 h-5" />
                Start Video Call
              </>
            )}
          </button>
        </div>

        {/* Video Call Section */}
        {showVideoCall && (
          <div className="mb-6">
            <AgoraVideoCall
              sessionId={sessionId}
              userId={teacherId}
              userName={teacherName}
              isTeacher={true}
              onCallEnd={() => setShowVideoCall(false)}
            />
          </div>
        )}

        {/* Students Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {students.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Example: Adding Agora Video Call to Student Dashboard
 */

export function StudentDashboardWithVideo() {
  const [isInCall, setIsInCall] = useState(false)
  
  const sessionId = "current_session_id"
  const studentId = "student_456"
  const studentName = "John Doe"

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Student Dashboard</h1>

        {/* Video Call Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Live Session</h2>
          
          {!isInCall ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Join the video call to participate in the live session</p>
              <button
                onClick={() => setIsInCall(true)}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Join Video Call
              </button>
            </div>
          ) : (
            <AgoraVideoCall
              sessionId={sessionId}
              userId={studentId}
              userName={studentName}
              isTeacher={false}
              onCallEnd={() => setIsInCall(false)}
            />
          )}
        </div>

        {/* Your existing emotion detection, notes, etc. */}
      </div>
    </div>
  )
}

/**
 * Example: Integrating with Existing Session Component
 */

export function SessionWithVideoCall({ session, user }) {
  const [videoCallActive, setVideoCallActive] = useState(false)

  return (
    <div className="space-y-6">
      {/* Session Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-2">{session.subject}</h2>
        <p className="text-gray-600">
          {session.is_active ? 'Session is live' : 'Session ended'}
        </p>
      </div>

      {/* Video Call - Only show when session is active */}
      {session.is_active && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Video Call</h3>
            <button
              onClick={() => setVideoCallActive(!videoCallActive)}
              className={`px-4 py-2 rounded-lg font-semibold ${
                videoCallActive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {videoCallActive ? 'Leave Call' : 'Join Call'}
            </button>
          </div>

          {videoCallActive && (
            <AgoraVideoCall
              sessionId={session._id}
              userId={user.id}
              userName={user.name}
              isTeacher={user.role === 'teacher'}
              onCallEnd={() => setVideoCallActive(false)}
            />
          )}
        </div>
      )}

      {/* Rest of your components */}
    </div>
  )
}

/**
 * Example: Auto-start Video Call When Session Starts
 */

export function AutoVideoCallSession({ session, user }) {
  const [callStarted, setCallStarted] = useState(false)

  // Auto-start video call when session becomes active
  useEffect(() => {
    if (session.is_active && !callStarted) {
      setCallStarted(true)
    }
  }, [session.is_active])

  return (
    <div>
      {session.is_active && callStarted && (
        <div className="mb-6">
          <AgoraVideoCall
            sessionId={session._id}
            userId={user.id}
            userName={user.name}
            isTeacher={user.role === 'teacher'}
            onCallEnd={() => setCallStarted(false)}
          />
        </div>
      )}
    </div>
  )
}
