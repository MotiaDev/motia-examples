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
  name: 'MobileResize',
  description: 'Resize uploaded image for mobile viewing (720px width)',

  subscribes: ['image-saved'],
  emits: ['mobile-resize-complete'],

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

export const handler: Handlers['MobileResize'] = async (imageMetadata, { logger, emit, traceId }) => {
  const startTime = Date.now()

  try {
    const logContext = buildLogContext({  
      originalFilename: imageMetadata.originalFilename,
      uniqueFilename: imageMetadata.uniqueFilename,
      originalStorageKey: imageMetadata.originalStorageKey,
      
    })

    logger.info('Mobile Resize Step – Starting mobile resize operation', logContext)

    // Get storage keys for all variants
    const storageKeys = generateStorageKeys(imageMetadata.uniqueFilename)
    const resizeConfig = getResizeConfig('mobile')

    // Get original image stream from storage
    const originalStream = await getImageStream(imageMetadata.originalStorageKey)
    
    logger.info('Mobile Resize Step – Retrieved original image stream from storage', logContext)

    // Create Sharp transform stream
    const sharpTransform = sharp()
      .resize(resizeConfig.width, null, { 
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality: resizeConfig.quality || 85 })

    // Process and save using streams
    const contentType = getContentTypeFromFilename(imageMetadata.uniqueFilename)
    const resizedStream = originalStream.pipe(sharpTransform)
    
    const outputStorageKey = await saveImageStream(
      resizedStream,
      storageKeys.mobile,
      contentType
    )
    const outputUrl = await getImageUrl(outputStorageKey)

    logger.info('Mobile Resize Step – Resize operation completed', {
      ...logContext,
      targetWidth: resizeConfig.width,
      outputStorageKey
    })

    // Create completion data
    const completionData: ResizeCompletionData = {
      ...imageMetadata,
      resizeType: 'mobile',
      outputStorageKey,
      outputUrl,
      completedAt: new Date()
    }

    // Emit completion event
    await emit({
      topic: 'mobile-resize-complete',
      data: {
        ...completionData,
        uploadedAt: typeof completionData.uploadedAt === 'string' 
          ? completionData.uploadedAt 
          : completionData.uploadedAt.toISOString(),
        completedAt: completionData.completedAt.toISOString()
      },
    })

    const totalTime = Date.now() - startTime
    logger.info('Mobile Resize Step – Mobile resize completed successfully', {
      ...logContext,
      outputStorageKey,
      outputUrl,
      processingTimeMs: totalTime
    })

  } catch (error) {
    const totalTime = Date.now() - startTime
    const safeError = createSafeErrorMessage(error, 'Mobile resize failed')
    
    logger.error('Mobile Resize Step – Mobile resize operation failed', {
      ...buildLogContext({ 
        originalFilename: imageMetadata.originalFilename, 
        processingTimeMs: totalTime,
        error: safeError.message
      })
    })

    throw new Error(`Mobile resize failed: ${safeError.message}`)
  }
}