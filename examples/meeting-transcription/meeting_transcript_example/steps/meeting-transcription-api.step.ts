/**
 * Meeting Transcription API Step
 * 
 * This step demonstrates how to create an API endpoint in Motia that:
 * 1. Accepts HTTP requests for meeting transcription
 * 2. Validates input using Zod schemas
 * 3. Emits events for asynchronous processing
 * 4. Creates real-time streaming updates
 * 5. Returns structured responses
 */

import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'MeetingTranscriptionAPI',
  description: 'API endpoint for meeting transcription requests with real-time streaming',

  method: 'POST',
  path: '/transcribe-meeting',

  /**
   * This API Step emits events to topic `meeting-transcription`
   * The event will be processed asynchronously by the MeetingTranscriptionProcessor
   */
  emits: ['meeting-transcription'],

  /** 
   * Input validation using Zod schemas
   * This ensures type safety and provides automatic documentation
   */
  bodySchema: z.object({ 
    filename: z.string().describe('Name of the audio file to transcribe'),
    audioData: z.string().optional().describe('Base64 encoded audio data (optional)'),
    language: z.string().default('en').describe('Language code for transcription'),
    model: z.enum(['whisper-1', 'whisper-large-v3']).default('whisper-large-v3').describe('Whisper model to use'),
    localWhisperPath: z.string().optional().describe('Path to local Whisper script (optional)')
  }),

  /** 
   * Response schema defines the structure of successful and error responses
   */
  responseSchema: {
    200: z.object({ 
      message: z.string(),
      traceId: z.string(),
      transcriptionId: z.string(),
      status: z.string(),
      streamId: z.string(),
      localWhisperPath: z.string().optional()
    }),
    400: z.object({
      error: z.string(),
      details: z.string().optional()
    })
  },

  /**
   * The flows this step belongs to
   */
  flows: ['meeting-transcription'],
}

export const handler: Handlers['MeetingTranscriptionAPI'] = async (req, { logger, emit, traceId, streams }) => {
  logger.info('Processing meeting transcription request', { body: req.body })

  try {
    // Input validation
    if (!req.body.filename) {
      return {
        status: 400,
        body: {
          error: 'Missing required field: filename',
          details: 'The filename field is required for transcription'
        }
      }
    }

    // Generate unique transcription ID for tracking
    const transcriptionId = `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Determine local Whisper path (defaults to the included script)
    const localWhisperPath = req.body.localWhisperPath || './scripts/transcribe_whisper.py'

    /**
     * Create a stream record for real-time updates
     * This allows clients to receive live updates during transcription
     */
    const streamResult = await streams.meetingTranscription.set(traceId, transcriptionId, {
      status: 'uploading',
      progress: 0,
      filename: req.body.filename,
      localWhisperStatus: 'pending',
      whisperModel: req.body.model,
      timestamp: new Date().toISOString()
    })

    /**
     * Emit event for asynchronous processing
     * This decouples the API response from the actual transcription work
     */
    await emit({
      topic: 'meeting-transcription',
      data: { 
        filename: req.body.filename,
        audioData: req.body.audioData,
        language: req.body.language || 'en',
        model: req.body.model || 'whisper-large-v3',
        transcriptionId,
        apiRequest: true,
        localWhisperPath
      },
    })

    /**
     * Return immediate response with stream information
     * The client can use the streamId to receive real-time updates
     */
    return {
      status: 200,
      body: {
        message: 'Meeting transcription request submitted successfully',
        traceId,
        transcriptionId,
        streamId: transcriptionId,
        localWhisperPath,
        ...streamResult
      },
    }

  } catch (error) {
    logger.error('Failed to process transcription request', { 
      error: error instanceof Error ? error.message : String(error),
      body: req.body
    })

    return {
      status: 400,
      body: {
        error: 'Failed to process transcription request',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }
} 