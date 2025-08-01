import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import sharp from 'sharp'
import { pipeline } from 'stream/promises'
import type { ImageMetadata, ResizeCompletionData } from '../shared/interfaces'
import {
  generateStorageKeys,
  getImageStream,
  saveImageStream,
  getImageUrl,
  getResizeConfig,
  getContentTypeFromFilename,
  createSafeErrorMessage,
  buildLogContext
} from '../shared/storage-utils'

export const config: EventConfig = {
  type: 'event',
  name: 'DesktopResize',
  description: 'Resize uploaded image for desktop viewing (1920px width)',

  subscribes: ['image-saved'],
  emits: ['desktop-resize-complete'],

  input: z.object({
    originalFilename: z.string(),
    uniqueFilename: z.string(),
    format: z.enum(['jpeg', 'png', 'webp']),
    originalStorageKey: z.string(),
    originalUrl: z.string(),
    traceId: z.string(),
    uploadedAt: z.string().or(z.date())
  }),

  flows: ['image-processing'],
}

export const handler: Handlers['DesktopResize'] = async (imageMetadata, { logger, emit, traceId }) => {
  const startTime = Date.now()

  try {
    const logContext = buildLogContext({ 
      step: 'DesktopResize',
      originalFilename: imageMetadata.originalFilename,
      uniqueFilename: imageMetadata.uniqueFilename,
      originalStorageKey: imageMetadata.originalStorageKey,
      traceId 
    })

    logger.info('Desktop Resize Step – Starting desktop resize operation', logContext)

    // Get storage keys and resize config
    const storageKeys = generateStorageKeys(imageMetadata.uniqueFilename)
    const resizeConfig = getResizeConfig('desktop')

    // Get original image stream from storage
    const originalStream = await getImageStream(imageMetadata.originalStorageKey)
    
    logger.info('Desktop Resize Step – Retrieved original image stream from storage', logContext)

    // Create Sharp transform stream
    const sharpTransform = sharp()
      .resize(resizeConfig.width, null, { 
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality: resizeConfig.quality || 90 })

    // Process and save using streams
    const contentType = getContentTypeFromFilename(imageMetadata.uniqueFilename)
    
    // Pipe original stream through Sharp transform
    const resizedStream = originalStream.pipe(sharpTransform)
    
    const outputStorageKey = await saveImageStream(
      resizedStream,
      storageKeys.desktop,
      contentType
    )
    const outputUrl = await getImageUrl(outputStorageKey)

    logger.info('Desktop Resize Step – Resize operation completed', {
      ...logContext,
      targetWidth: resizeConfig.width,
      outputStorageKey
    })

    // Create completion data
    const completionData: ResizeCompletionData = {
      ...imageMetadata,
      resizeType: 'desktop',
      outputStorageKey,
      outputUrl,
      completedAt: new Date()
    }

    // Emit completion event
    await emit({
      topic: 'desktop-resize-complete',
      data: {
        ...completionData,
        uploadedAt: typeof completionData.uploadedAt === 'string' 
          ? completionData.uploadedAt 
          : completionData.uploadedAt.toISOString(),
        completedAt: completionData.completedAt.toISOString()
      },
    })

    const totalTime = Date.now() - startTime
    logger.info('Desktop Resize Step – Desktop resize completed successfully', {
      ...logContext,
      outputStorageKey,
      outputUrl,
      processingTimeMs: totalTime
    })

  } catch (error) {
    const totalTime = Date.now() - startTime
    const safeError = createSafeErrorMessage(error, 'Desktop resize failed')
    
    logger.error('Desktop Resize Step – Desktop resize operation failed', {
      ...buildLogContext({
        step: 'DesktopResize',
        originalFilename: imageMetadata.originalFilename,
        traceId,
        processingTimeMs: totalTime,
        error: safeError.message
      })
    })

    throw new Error(`Desktop resize failed: ${safeError.message}`)
  }
}