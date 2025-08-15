/**
 * Meeting Summarizer Step
 * 
 * This step demonstrates Motia's event-driven architecture by:
 * 1. Listening for 'transcription-completed' events
 * 2. Processing the transcript to extract insights
 * 3. Generating summaries, action items, and key topics
 * 4. Streaming results in real-time
 * 5. Emitting follow-up events for further processing
 */

import { EventStepConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: EventStepConfig = {
  type: 'event',
  name: 'MeetingSummarizer',
  description: 'Intelligent meeting summarization with action items and insights extraction',

  /**
   * Subscribe to transcription completion events
   * This showcases Motia's event-driven architecture
   */
  subscribes: ['transcription-completed'],

  /**
   * Emit events for further processing
   */
  emits: ['summary-completed', 'action-items-extracted'],

  /**
   * Input schema - expects transcription completion data
   */
  inputSchema: z.object({
    filename: z.string(),
    transcriptionId: z.string(),
    transcript: z.string(),
    participants: z.array(z.string()).optional(),
    duration: z.number().optional(),
    whisperModel: z.string(),
    timestamp: z.string()
  })
}

export const handler: Handlers['MeetingSummarizer'] = async (context) => {
  const { filename, transcriptionId, transcript, participants, duration } = context.body
  
  try {
    context.logger.info('Starting intelligent summarization', { filename, transcriptionId })

    // Stream initial status
    await context.streams.meetingTranscription.add({
      status: 'processing',
      progress: 100, // Transcription done, now summarizing
      filename,
      timestamp: new Date().toISOString(),
      localWhisperStatus: 'Generating intelligent summary...',
      whisperModel: context.body.whisperModel
    })

    // 1. Extract Meeting Summary
    const summary = await generateMeetingSummary(transcript)
    
    // 2. Extract Action Items with AI-like processing
    const actionItems = await extractActionItems(transcript, participants)
    
    // 3. Identify Key Topics and Themes
    const keyTopics = await extractKeyTopics(transcript)
    
    // 4. Perform Sentiment Analysis
    const sentimentAnalysis = await analyzeSentiment(transcript)
    
    // 5. Extract Important Decisions
    const decisions = await extractDecisions(transcript)
    
    // 6. Generate Meeting Insights
    const insights = await generateInsights(transcript, participants, duration)

    // Stream final results with all the intelligence
    await context.streams.meetingTranscription.add({
      status: 'completed',
      progress: 100,
      filename,
      transcript,
      summary,
      actionItems,
      keyTopics,
      sentimentAnalysis,
      decisions,
      insights,
      participants,
      duration,
      timestamp: new Date().toISOString(),
      localWhisperStatus: 'Summary and analysis completed!',
      whisperModel: context.body.whisperModel,
      processingTime: Date.now() - new Date(context.body.timestamp).getTime()
    })

    // Emit summary completion event for further processing
    await context.emit({
      topic: 'summary-completed',
      data: {
        transcriptionId,
        filename,
        summary,
        actionItems,
        keyTopics,
        insights,
        timestamp: new Date().toISOString()
      }
    })

    // Emit action items for task management integration
    await context.emit({
      topic: 'action-items-extracted',
      data: {
        transcriptionId,
        filename,
        actionItems,
        participants,
        timestamp: new Date().toISOString()
      }
    })

    context.logger.info('Summarization completed successfully', { 
      filename, 
      transcriptionId,
      summaryLength: summary.length,
      actionItemCount: actionItems.length,
      topicCount: keyTopics.length
    })

  } catch (error) {
    context.logger.error('Summarization failed', { 
      error: error instanceof Error ? error.message : String(error),
      filename,
      transcriptionId
    })

    // Update stream with error
    await context.streams.meetingTranscription.add({
      status: 'failed',
      progress: 100,
      filename,
      error: `Summarization failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date().toISOString(),
      localWhisperStatus: 'Summary generation failed'
    })

    throw error
  }
}

/**
 * Generate intelligent meeting summary
 */
async function generateMeetingSummary(transcript: string): Promise<string> {
  // Simulate AI-powered summarization
  // In real implementation, this would use OpenAI, Claude, or local LLM
  
  const lines = transcript.split('\n').filter(line => line.trim())
  const wordCount = transcript.split(' ').length
  
  // Extract first few meaningful sentences
  const importantSentences = lines
    .filter(line => line.length > 50)
    .slice(0, 3)
    .map(line => line.trim())
  
  return `
📋 Meeting Summary:
This ${Math.ceil(wordCount / 150)}-minute meeting covered several key areas. ${importantSentences.join(' ')}

🎯 Key Outcomes:
• Main discussion topics were identified and addressed
• Team collaboration and coordination points were established
• Forward-looking action items were assigned to participants

💡 Overall Assessment:
The meeting was productive with clear outcomes and next steps defined.
  `.trim()
}

/**
 * Extract action items with assignees
 */
async function extractActionItems(transcript: string, participants?: string[]): Promise<string[]> {
  const actionWords = ['will', 'should', 'need to', 'must', 'action', 'todo', 'follow up', 'complete', 'deliver']
  const lines = transcript.toLowerCase().split('\n')
  
  const actionItems: string[] = []
  
  // Look for action-oriented sentences
  for (const line of lines) {
    if (actionWords.some(word => line.includes(word)) && line.length > 30) {
      // Try to identify assignee
      const assignee = participants?.find(p => 
        line.includes(p.toLowerCase().split(' ')[0])
      ) || 'Team member'
      
      actionItems.push(`${assignee}: ${line.trim()}`)
    }
  }
  
  // Add some intelligent defaults if no actions found
  if (actionItems.length === 0) {
    actionItems.push(
      'Team: Follow up on discussed topics from this meeting',
      'Organizer: Schedule next meeting to review progress',
      'Participants: Review meeting notes and prepare for next session'
    )
  }
  
  return actionItems.slice(0, 5) // Limit to top 5
}

/**
 * Extract key topics and themes
 */
async function extractKeyTopics(transcript: string): Promise<string[]> {
  const text = transcript.toLowerCase()
  
  // Common business/meeting topics
  const topicKeywords = {
    'Project Management': ['project', 'timeline', 'deadline', 'milestone', 'deliverable'],
    'Budget & Finance': ['budget', 'cost', 'expense', 'financial', 'revenue', 'profit'],
    'Team & Personnel': ['team', 'staff', 'hire', 'employee', 'resource', 'people'],
    'Strategy & Planning': ['strategy', 'plan', 'goal', 'objective', 'vision', 'future'],
    'Technology': ['system', 'software', 'platform', 'api', 'technical', 'development'],
    'Sales & Marketing': ['sales', 'marketing', 'customer', 'client', 'campaign', 'revenue'],
    'Operations': ['process', 'workflow', 'operation', 'efficiency', 'procedure'],
    'Quality & Performance': ['quality', 'performance', 'metrics', 'improvement', 'optimization']
  }
  
  const identifiedTopics: string[] = []
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    const matches = keywords.filter(keyword => text.includes(keyword))
    if (matches.length >= 2) {
      identifiedTopics.push(topic)
    }
  }
  
  return identifiedTopics.length > 0 ? identifiedTopics : ['General Discussion', 'Team Coordination']
}

/**
 * Analyze sentiment and engagement
 */
async function analyzeSentiment(transcript: string): Promise<any> {
  const text = transcript.toLowerCase()
  
  // Simple sentiment analysis
  const positiveWords = ['great', 'excellent', 'good', 'success', 'achieve', 'progress', 'positive', 'agree', 'yes']
  const negativeWords = ['problem', 'issue', 'concern', 'difficult', 'challenge', 'delay', 'failed', 'no', 'disagree']
  
  const positiveCount = positiveWords.filter(word => text.includes(word)).length
  const negativeCount = negativeWords.filter(word => text.includes(word)).length
  
  const overall = positiveCount > negativeCount ? 'positive' : 
                  negativeCount > positiveCount ? 'negative' : 'neutral'
  
  return {
    overall,
    confidence: Math.min(0.95, 0.6 + Math.abs(positiveCount - negativeCount) * 0.1),
    positiveIndicators: positiveCount,
    negativeIndicators: negativeCount,
    energyLevel: text.includes('excited') || text.includes('enthusiastic') ? 'high' : 'medium'
  }
}

/**
 * Extract key decisions made
 */
async function extractDecisions(transcript: string): Promise<string[]> {
  const text = transcript.toLowerCase()
  const decisionWords = ['decided', 'agreed', 'approved', 'concluded', 'determined', 'resolved']
  
  const lines = transcript.split('\n')
  const decisions: string[] = []
  
  for (const line of lines) {
    if (decisionWords.some(word => line.toLowerCase().includes(word)) && line.length > 40) {
      decisions.push(line.trim())
    }
  }
  
  return decisions.slice(0, 3) // Top 3 decisions
}

/**
 * Generate meeting insights
 */
async function generateInsights(transcript: string, participants?: string[], duration?: number): Promise<any> {
  const wordCount = transcript.split(' ').length
  const speakingRate = duration ? Math.round(wordCount / (duration / 60)) : 150 // words per minute
  
  return {
    participationScore: participants ? Math.min(10, participants.length * 2) : 8,
    engagementLevel: speakingRate > 160 ? 'high' : speakingRate > 120 ? 'medium' : 'low',
    meetingEfficiency: transcript.includes('action') || transcript.includes('next steps') ? 'high' : 'medium',
    followUpNeeded: transcript.includes('follow up') || transcript.includes('next meeting'),
    keyMetrics: {
      wordCount,
      estimatedSpeakingRate: speakingRate,
      participantCount: participants?.length || 2
    }
  }
} 