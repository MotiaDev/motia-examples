/**
 * Meeting Transcription Processor Step
 * 
 * This step demonstrates how to create an event handler in Motia that:
 * 1. Subscribes to events from the API step
 * 2. Processes data asynchronously
 * 3. Updates real-time streams with progress
 * 4. Handles errors gracefully
 * 5. Emits completion events
 * 
 * In a real implementation, this would integrate with Whisper API
 * For this example, we simulate the transcription process
 */

import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: EventConfig = {
  type: 'event',
  name: 'MeetingTranscriptionProcessor',
  description: 'Processes meeting transcription requests with real-time streaming updates',

  /**
   * This step subscribes to events from the MeetingTranscriptionAPI
   * When the API receives a request, it emits a 'meeting-transcription' event
   * This step picks up that event and processes it asynchronously
   */
  subscribes: ['meeting-transcription'],

  /**
   * This step emits events when transcription is completed or fails
   * These events can be picked up by other steps for further processing
   */
  emits: ['transcription-completed', 'transcription-failed'],

  /**
   * Input schema defines the expected structure of incoming events
   */
  input: z.object({ 
    filename: z.string().describe('Name of the audio file to transcribe'),
    audioData: z.string().optional().describe('Base64 encoded audio data'),
    language: z.string().describe('Language code for transcription'),
    model: z.string().describe('Whisper model to use'),
    transcriptionId: z.string().describe('Unique ID for tracking this transcription'),
    apiRequest: z.boolean().optional().describe('Whether this came from an API request'),
    localWhisperPath: z.string().optional().describe('Path to local Whisper script')
  }),

  /**
   * The flows this step belongs to
   */
  flows: ['meeting-transcription'],
}

export const handler: Handlers['MeetingTranscriptionProcessor'] = async (context) => {
  const { filename, language = 'en', model = 'whisper-large-v3', localWhisperPath } = context.body
  const traceId = context.traceId
  
  try {
    // Stream initial status
    await context.streams.meetingTranscription.add({
      status: 'transcribing',
      progress: 0,
      filename,
      timestamp: new Date().toISOString(),
      localWhisperStatus: 'Starting Whisper processing...',
      whisperModel: model
    })

    // Simulate progress updates during transcription
    const progressUpdates = [10, 25, 40, 60, 80, 95]
    for (const progress of progressUpdates) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second intervals
      
      await context.streams.meetingTranscription.add({
        status: 'transcribing',
        progress,
        filename,
        timestamp: new Date().toISOString(),
        localWhisperStatus: `Processing audio... ${progress}% complete`,
        whisperModel: model
      })
    }

    /**
     * Simulate transcription results
     * In a real implementation, this would come from the Whisper API
     */
    const mockTranscript = `This is a simulated transcript for ${filename}. 
    In a real implementation, this would be the actual transcription from the Whisper API.
    The transcript would include all spoken content with proper punctuation and formatting.`

    const mockDuration = Math.floor(Math.random() * 3600) + 300 // 5-65 minutes
    const mockParticipants = ['John Doe', 'Jane Smith', 'Bob Johnson']
    const mockActionItems = [
      'Schedule follow-up meeting',
      'Review project timeline',
      'Update documentation'
    ]

    const startTime = Date.now()

    // Final completion status
    await context.streams.meetingTranscription.add({
      status: 'completed',
      progress: 100,
      filename,
      transcript: mockTranscript, // Your actual transcript
      timestamp: new Date().toISOString(),
      localWhisperStatus: 'Transcription completed!',
      whisperModel: model,
      duration: mockDuration,
      participants: mockParticipants,
      actionItems: mockActionItems,
      processingTime: Date.now() - startTime
    })

    logger.info('Meeting transcription completed successfully', { 
      filename: filename,
      transcriptionId: context.body.transcriptionId,
      duration: mockDuration,
      processingTime,
      whisperModel: model
    })

    /**
     * Emit completion event
     * This can be picked up by other steps for further processing
     * (e.g., analysis, storage, notification)
     */
    await context.emit({
      topic: 'transcription-completed',
      data: { 
        filename: filename,
        transcriptionId: context.body.transcriptionId,
        duration: mockDuration,
        transcript: mockTranscript,
        participants: mockParticipants,
        actionItems: mockActionItems,
        processingTime,
        whisperModel: model,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    await context.streams.meetingTranscription.add({
      status: 'failed',
      progress: 0,
      filename,
      error: error.message,
      timestamp: new Date().toISOString(),
      localWhisperStatus: 'Processing failed'
    })
    throw error
  }
} 