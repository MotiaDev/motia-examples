/**
 * Hello World API Step - Meeting Transcription Example
 * 
 * Enhanced to show live system status and recent transcription activity
 * Showcases Motia's API capabilities and real-time data access
 */

exports.config = {
  type: 'api',
  path: '/hello-world',
  method: 'GET',
  name: 'HelloWorld',
  description: 'Live system status dashboard with recent transcription activity',
  emits: [],
  flows: ['meeting-transcription'],
}

exports.handler = async (context) => {
  // Get recent transcription activity from the stream
  const recentActivity = await context.streams.meetingTranscription.list({ limit: 5 })
  
  // Calculate system stats
  const now = new Date()
  const stats = {
    totalTranscriptions: recentActivity.length,
    activeTranscriptions: recentActivity.filter(item => 
      item.status === 'transcribing' || item.status === 'processing'
    ).length,
    completedToday: recentActivity.filter(item => 
      item.status === 'completed' && 
      new Date(item.timestamp).toDateString() === now.toDateString()
    ).length,
    systemUptime: process.uptime(),
    lastActivity: recentActivity[0]?.timestamp || 'No recent activity'
  }

  return {
    status: 200,
    body: { 
      message: '🎤 Motia Meeting Transcription System - Live Dashboard',
      timestamp: now.toISOString(),
      systemStatus: 'healthy',
      stats,
      recentActivity: recentActivity.map(item => ({
        filename: item.filename,
        status: item.status,
        progress: item.progress,
        timestamp: item.timestamp,
        whisperModel: item.whisperModel
      })),
      endpoints: {
        'GET /hello-world': 'Live system dashboard (you are here)',
        'POST /transcribe-meeting': 'Start a meeting transcription with real-time updates',
        'WS /streams/meetingTranscription': 'Real-time transcription progress stream'
      },
      features: {
        'Real-time Streaming': '✅ Live progress updates via Motia streams',
        'Event-driven Processing': '✅ Asynchronous transcription pipeline',
        'API Integration': '✅ RESTful endpoints with validation',
        'Local Whisper': '✅ Privacy-focused local processing'
      },
      quickStart: 'Visit http://localhost:8502 for the Streamlit UI, or POST to /transcribe-meeting'
    },
  }
}