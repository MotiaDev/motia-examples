import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import sharp from 'sharp'
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
  name: 'LowQualityResize',
  description: 'Resize uploaded image for low-quality/compressed viewing (480px width, 60% quality)',

  subscribes: ['image-saved'],
  emits: ['lowquality-resize-complete'],

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

export const handler: Handlers['LowQualityResize'] = async (imageMetadata, { logger, emit, traceId }) => {
  const startTime = Date.now()

  try {
    const logContext = buildLogContext({ 
      step: 'LowQualityResize',
      originalFilename: imageMetadata.originalFilename,
      uniqueFilename: imageMetadata.uniqueFilename,
      originalStorageKey: imageMetadata.originalStorageKey,
      traceId 
    })

    logger.info('Low-Quality Resize Step – Starting low-quality resize operation', logContext)

    // Get storage keys and resize config
    const storageKeys = generateStorageKeys(imageMetadata.uniqueFilename)
    const resizeConfig = getResizeConfig('lowquality')

    // Get original image stream from storage
    const originalStream = await getImageStream(imageMetadata.originalStorageKey)
    
    logger.info('Low-Quality Resize Step – Retrieved original image stream from storage', logContext)

    // Create Sharp transform stream with compression
    const sharpTransform = sharp()
      .resize(resizeConfig.width, null, { 
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality: resizeConfig.quality || 60 })

    // Process and save using streams
    const contentType = getContentTypeFromFilename(imageMetadata.uniqueFilename)
    const resizedStream = originalStream.pipe(sharpTransform)
    
    const outputStorageKey = await saveImageStream(
      resizedStream,
      storageKeys.lowquality,
      contentType
    )
    const outputUrl = await getImageUrl(outputStorageKey)

    logger.info('Low-Quality Resize Step – Resize operation completed', {
      ...logContext,
      targetWidth: resizeConfig.width,
      quality: resizeConfig.quality,
      outputStorageKey
    })

    // Create completion data
    const completionData: ResizeCompletionData = {
      ...imageMetadata,
      resizeType: 'lowquality',
      outputStorageKey,
      outputUrl,
      completedAt: new Date()
    }

    // Emit completion event
    await emit({
      topic: 'lowquality-resize-complete',
      data: {
        ...completionData,
        uploadedAt: typeof completionData.uploadedAt === 'string' 
          ? completionData.uploadedAt 
          : completionData.uploadedAt.toISOString(),
        completedAt: completionData.completedAt.toISOString()
      },
    })

    const totalTime = Date.now() - startTime
    logger.info('Low-Quality Resize Step – Low-quality resize completed successfully', {
      ...logContext,
      outputStorageKey,
      outputUrl,
      processingTimeMs: totalTime
    })

  } catch (error) {
    const totalTime = Date.now() - startTime
    const safeError = createSafeErrorMessage(error, 'Low-quality resize failed')
    
    logger.error('Low-Quality Resize Step – Low-quality resize operation failed', {
      ...buildLogContext({
        step: 'LowQualityResize',
        originalFilename: imageMetadata.originalFilename,
        traceId,
        processingTimeMs: totalTime,
        error: safeError.message
      })
    })

    throw new Error(`Low-quality resize failed: ${safeError.message}`)
  }
}