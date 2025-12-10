import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { ProcessingStatus, ResizeCompletionData } from '../shared/interfaces'
import { 
  createSafeErrorMessage,
  buildLogContext
} from '../shared/storage-utils'

export const config: EventConfig = {
  type: 'event',
  name: 'CompletionTracker',
  description: 'Track completion of all resize operations and emit final processing-complete event',

  subscribes: ['desktop-resize-complete', 'mobile-resize-complete', 'lowquality-resize-complete'],
  emits: ['processing-complete'],

  input: z.object({
    originalFilename: z.string(),
    uniqueFilename: z.string(),
    format: z.enum(['jpeg', 'png', 'webp']),
    originalStorageKey: z.string(),
    originalUrl: z.string(),
    traceId: z.string(),
    uploadedAt: z.string().or(z.date()),
    resizeType: z.enum(['desktop', 'mobile', 'lowquality']),
    outputStorageKey: z.string(),
    outputUrl: z.string(),
    completedAt: z.string().or(z.date())
  }),

  flows: ['image-processing'],
}

export const handler: Handlers['CompletionTracker'] = async (completionData, { logger, emit, traceId, state }) => {
  const startTime = Date.now()
  
  try {
    const logContext = buildLogContext({
      step: 'CompletionTracker',
      traceId,
      resizeType: completionData.resizeType,
      originalFilename: completionData.originalFilename
    })

    logger.info('Completion Tracker Step – Processing resize completion', logContext)

    // Get or initialize processing status
    const statusKey = `processing_${traceId}`
    let status: ProcessingStatus = state.get(statusKey) || {
      traceId,
      originalStorageKey: completionData.originalStorageKey,
      desktopComplete: false,
      mobileComplete: false,
      lowqualityComplete: false
    }

    // Update completion status based on resize type
    switch (completionData.resizeType) {
      case 'desktop':
        status.desktopComplete = true
        break
      case 'mobile':
        status.mobileComplete = true
        break
      case 'lowquality':
        status.lowqualityComplete = true
        break
    }

    // Save updated status
    state.set(statusKey, status)

    logger.info('Completion Tracker Step – Updated processing status', {
      ...logContext,
      status
    })

    // Check if all resize operations are complete
    const allComplete = status.desktopComplete && status.mobileComplete && status.lowqualityComplete

    if (allComplete) {
      status.completedAt = new Date()
      state.set(statusKey, status)

      // Emit final completion event
      await emit({
        topic: 'processing-complete',
        data: {
          ...status,
          completedAt: status.completedAt.toISOString()
        }
      })

      const totalTime = Date.now() - startTime
      logger.info('Completion Tracker Step – All processing completed successfully', {
        ...logContext,
        processingTimeMs: totalTime,
        finalStatus: status
      })
    } else {
      logger.info('Completion Tracker Step – Waiting for remaining operations', {
        ...logContext,
        pendingOperations: {
          desktop: !status.desktopComplete,
          mobile: !status.mobileComplete,
          lowquality: !status.lowqualityComplete
        }
      })
    }

  } catch (error) {
    const totalTime = Date.now() - startTime
    const safeError = createSafeErrorMessage(error, 'Completion tracking failed')
    
    logger.error('Completion Tracker Step – Completion tracking failed', {
      ...buildLogContext({
        step: 'CompletionTracker',
        traceId,
        processingTimeMs: totalTime,
        error: safeError.message
      })
    })

    throw new Error(`Completion tracking failed: ${safeError.message}`)
  }
}