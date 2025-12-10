import React, { useState } from 'react'

// Note: In a real implementation, you would import from @motiadev/stream-client-react
// import { useStreamItem } from '@motiadev/stream-client-react'

// Mock hook for demonstration purposes
const useStreamItem = ({ streamName, groupId, id }: any) => {
  const [data, setData] = useState<any>(null)
  
  // In real implementation, this would connect to the WebSocket
  React.useEffect(() => {
    // Simulate stream updates
    const interval = setInterval(() => {
      setData({
        status: 'processing',
        progress: Math.floor(Math.random() * 100),
        message: 'Processing...',
        timestamp: new Date().toISOString()
      })
    }, 2000)
    
    return () => clearInterval(interval)
  }, [])
  
  return { data }
}

interface DataProcessingStatusProps {
  requestId: string
}

export const DataProcessingStatus: React.FC<DataProcessingStatusProps> = ({ requestId }) => {
  const { data } = useStreamItem({ 
    streamName: 'dataProcessing',
    groupId: requestId,
    id: requestId
  })

  if (!data) {
    return <div>Loading...</div>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return 'text-blue-600'
      case 'completed': return 'text-green-600'
      case 'failed': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-2">Data Processing Status</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Status:</span>
          <span className={`font-medium ${getStatusColor(data.status)}`}>
            {data.status}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Progress:</span>
          <span>{data.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${data.progress}%` }}
          ></div>
        </div>
        <div className="text-sm text-gray-600">
          {data.message}
        </div>
        {data.error && (
          <div className="text-sm text-red-600">
            Error: {data.error}
          </div>
        )}
        <div className="text-xs text-gray-500">
          Last updated: {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

interface MeetingTranscriptionStatusProps {
  transcriptionId: string
}

export const MeetingTranscriptionStatus: React.FC<MeetingTranscriptionStatusProps> = ({ transcriptionId }) => {
  const { data } = useStreamItem({ 
    streamName: 'meetingTranscription',
    groupId: transcriptionId,
    id: transcriptionId
  })

  if (!data) {
    return <div>Loading transcription status...</div>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading': return 'text-blue-600'
      case 'transcribing': return 'text-yellow-600'
      case 'processing': return 'text-purple-600'
      case 'completed': return 'text-green-600'
      case 'failed': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-2">Meeting Transcription</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>File:</span>
          <span className="font-medium">{data.filename}</span>
        </div>
        <div className="flex justify-between">
          <span>Status:</span>
          <span className={`font-medium ${getStatusColor(data.status)}`}>
            {data.status}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Progress:</span>
          <span>{data.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${data.progress}%` }}
          ></div>
        </div>
        <div className="text-sm text-gray-600">
          {data.message}
        </div>
        {data.duration && (
          <div className="text-sm">
            Duration: {Math.floor(data.duration / 60)}m {data.duration % 60}s
          </div>
        )}
        {data.participants && data.participants.length > 0 && (
          <div className="text-sm">
            Participants: {data.participants.join(', ')}
          </div>
        )}
        {data.actionItems && data.actionItems.length > 0 && (
          <div className="text-sm">
            Action Items: {data.actionItems.length} found
          </div>
        )}
        {data.error && (
          <div className="text-sm text-red-600">
            Error: {data.error}
          </div>
        )}
        <div className="text-xs text-gray-500">
          Last updated: {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

interface SystemMonitoringStatusProps {
  monitoringId?: string
}

export const SystemMonitoringStatus: React.FC<SystemMonitoringStatusProps> = ({ monitoringId = 'system' }) => {
  const { data } = useStreamItem({ 
    streamName: 'systemMonitoring',
    groupId: monitoringId,
    id: monitoringId
  })

  if (!data) {
    return <div>Loading system status...</div>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'info': return 'text-blue-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      case 'success': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-2">System Monitoring</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Type:</span>
          <span className="font-medium capitalize">{data.type}</span>
        </div>
        <div className="flex justify-between">
          <span>Status:</span>
          <span className={`font-medium ${getStatusColor(data.status)}`}>
            {data.status}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          {data.message}
        </div>
        {data.errorCount && (
          <div className="text-sm">
            Total Errors: {data.errorCount}
          </div>
        )}
        {data.cleanupResults && (
          <div className="text-sm space-y-1">
            <div>Cleanup Results:</div>
            <div className="ml-2">
              <div>Processed: {data.cleanupResults.processed}</div>
              <div>Deleted: {data.cleanupResults.deleted}</div>
              <div>Errors: {data.cleanupResults.errors}</div>
              <div>Remaining: {data.cleanupResults.remainingEntries}</div>
            </div>
          </div>
        )}
        {data.systemHealth && (
          <div className="text-sm space-y-1">
            <div>System Health:</div>
            <div className="ml-2">
              <div>Active Flows: {data.systemHealth.activeFlows}</div>
              <div>Total Errors: {data.systemHealth.totalErrors}</div>
              <div>Storage Usage: {data.systemHealth.storageUsage}%</div>
              <div>Uptime: {Math.floor(data.systemHealth.uptime / 3600)}h</div>
            </div>
          </div>
        )}
        <div className="text-xs text-gray-500">
          Last updated: {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

interface StreamDashboardProps {
  dataProcessingId?: string
  transcriptionId?: string
}

export const StreamDashboard: React.FC<StreamDashboardProps> = ({ 
  dataProcessingId, 
  transcriptionId 
}) => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Motia Streams Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dataProcessingId && (
          <DataProcessingStatus requestId={dataProcessingId} />
        )}
        {transcriptionId && (
          <MeetingTranscriptionStatus transcriptionId={transcriptionId} />
        )}
        <SystemMonitoringStatus />
      </div>
    </div>
  )
}

export default StreamDashboard 