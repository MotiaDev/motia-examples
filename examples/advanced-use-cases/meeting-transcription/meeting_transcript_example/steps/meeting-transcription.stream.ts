/**
 * Meeting Transcription Stream Configuration
 * 
 * Enhanced stream that provides comprehensive meeting analysis including:
 * 1. Real-time transcription progress
 * 2. Intelligent summary generation
 * 3. Action items extraction
 * 4. Sentiment analysis and insights
 * 5. Key topics and decisions tracking
 */

import { StreamConfig } from 'motia'
import { z } from 'zod'

export const config: StreamConfig = {
  /**
   * Stream name - this will be available as context.streams.meetingTranscription
   */
  name: 'meetingTranscription',
  
  /**
   * Enhanced schema with comprehensive meeting analysis fields
   */
  schema: z.object({ 
    // Core transcription fields
    status: z.enum(['uploading', 'transcribing', 'processing', 'completed', 'failed']),
    progress: z.number().min(0).max(100),
    filename: z.string(),
    
    // Basic transcript data
    duration: z.number().optional().describe('Audio duration in seconds'),
    transcript: z.string().optional().describe('Generated transcript text'),
    participants: z.array(z.string()).optional().describe('Meeting participants'),
    error: z.string().optional().describe('Error message if failed'),
    
    // Enhanced summarization fields
    summary: z.string().optional().describe('Intelligent meeting summary'),
    actionItems: z.array(z.string()).optional().describe('Extracted action items with assignees'),
    keyTopics: z.array(z.string()).optional().describe('Key topics and themes discussed'),
    decisions: z.array(z.string()).optional().describe('Important decisions made during the meeting'),
    
    // Sentiment and engagement analysis
    sentimentAnalysis: z.object({
      overall: z.enum(['positive', 'negative', 'neutral']),
      confidence: z.number().min(0).max(1),
      positiveIndicators: z.number(),
      negativeIndicators: z.number(),
      energyLevel: z.enum(['high', 'medium', 'low'])
    }).optional().describe('Sentiment analysis of the meeting'),
    
    // Meeting insights and analytics
    insights: z.object({
      participationScore: z.number().min(0).max(10),
      engagementLevel: z.enum(['high', 'medium', 'low']),
      meetingEfficiency: z.enum(['high', 'medium', 'low']),
      followUpNeeded: z.boolean(),
      keyMetrics: z.object({
        wordCount: z.number(),
        estimatedSpeakingRate: z.number(),
        participantCount: z.number()
      })
    }).optional().describe('Meeting analytics and insights'),
    
    // Technical metadata
    timestamp: z.string().describe('ISO timestamp of this update'),
    localWhisperStatus: z.string().optional().describe('Status of Whisper processing'),
    whisperModel: z.string().optional().describe('Whisper model being used'),
    processingTime: z.number().optional().describe('Total processing time in milliseconds')
  }),

  /**
   * Base configuration for the stream
   */
  baseConfig: {
    /**
     * Use default storage to persist stream data
     * This allows clients to retrieve historical updates and full analysis
     */
    storageType: 'default',
  },
} 