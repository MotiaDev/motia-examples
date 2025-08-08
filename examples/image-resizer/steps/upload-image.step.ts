import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { ImageMetadata } from '../shared/interfaces'
import {
  generateUniqueFilename,
  isValidImageFormat,
  getImageFormat,
  generateStorageKeys,
  saveImageBuffer,
  getImageUrl,
  validateBase64ImageData,
  getContentTypeFromFilename,
  createSafeErrorMessage,
  buildLogContext
} from '../shared/storage-utils'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'UploadImage',
  description: 'Upload and save image, then trigger parallel resize operations',

  method: 'POST',
  path: '/upload-image',

  /**
   * This API Step emits events to topic `image-saved` to trigger resize operations
   * Accepts multipart/form-data with file upload
   */
  emits: ['image-saved'],

  /** 
   * For file uploads, we'll handle multipart data in the handler
   * No bodySchema needed for file uploads
   */

  /** 
   * Expected response schemas for different scenarios
   */
  responseSchema: {
    200: z.object({
      message: z.string(),
      traceId: z.string(),
      imageMetadata: z.object({
        originalFilename: z.string(),
        uniqueFilename: z.string(),
        format: z.enum(['jpeg', 'png', 'webp']),
        originalStorageKey: z.string(),
        originalUrl: z.string(),
        traceId: z.string(),
        uploadedAt: z.string()
      })
    }),
    400: z.object({
      error: z.string(),
      details: z.string().optional()
    }),
    500: z.object({
      error: z.string(),
      details: z.string().optional()
    })
  },

  /**
   * The flows this step belongs to, will be available in Workbench
   */
  flows: ['image-processing'],
}

export const handler: Handlers['UploadImage'] = async (req, { logger, emit, traceId }) => {
  const startTime = Date.now()

  try {
    // Detect if this is a file upload or JSON request
    let filename: string
    let imageBuffer: Buffer
    let isFileUpload = false

    // Check if this is a multipart file upload
    if ((req as any).file || (req as any).files) {
      isFileUpload = true
      
      // Handle file upload
      let uploadedFile: any
      if ((req as any).file) {
        uploadedFile = (req as any).file
        filename = uploadedFile.originalname
        imageBuffer = uploadedFile.buffer || require('fs').readFileSync(uploadedFile.path)
      } else if ((req as any).files && (req as any).files.image) {
        uploadedFile = (req as any).files.image
        filename = uploadedFile.name || uploadedFile.originalname
        imageBuffer = uploadedFile.data || uploadedFile.buffer
      } else {
        return {
          status: 400,
          body: {
            error: 'No file uploaded',
            details: 'Please upload an image file using multipart/form-data with field name "image"'
          }
        }
      }
    } else if (req.body && req.body.filename && req.body.data) {
      // Handle JSON base64 upload (existing functionality)
      filename = req.body.filename
      const base64Data = req.body.data.replace(/^data:image\/[a-z]+;base64,/, '')
      imageBuffer = Buffer.from(base64Data, 'base64')
    } else {
      return {
        status: 400,
        body: {
          error: 'Invalid request',
          details: 'Please provide either a file upload (multipart/form-data) or JSON with filename and base64 data'
        }
      }
    }

    const logContext = buildLogContext({ 
      filename, 
      uploadType: isFileUpload ? 'file' : 'base64',
      fileSize: imageBuffer.length
    })

    logger.info('Upload Image Step – Starting image upload process', logContext)

    // Enhanced validation for image format
    try {
      if (!isValidImageFormat(filename)) {
        const errorContext = buildLogContext(logContext, {
          validationError: 'Invalid image format',
          supportedFormats: ['JPEG', 'PNG', 'WebP']
        })

        logger.warn('Upload Image Step – Invalid image format validation failed', errorContext)

        return {
          status: 400,
          body: {
            error: 'Invalid image format',
            details: 'Only JPEG, PNG, and WebP formats are supported'
          }
        }
      }
    } catch (formatError) {
      const safeError = createSafeErrorMessage(formatError, 'Format validation failed')
      const errorContext = buildLogContext(logContext, {
        validationError: safeError.message,
        errorType: 'format_validation'
      })

      logger.error('Upload Image Step – Format validation error', errorContext)

      return {
        status: 400,
        body: {
          error: 'Format validation failed',
          details: safeError.details || 'Could not validate image format'
        }
      }
    }

    // Validate file size (50MB limit)
    if (imageBuffer.length > 50 * 1024 * 1024) {
      const errorContext = buildLogContext(logContext, {
        validationError: 'File too large',
        fileSize: imageBuffer.length,
        maxSize: 50 * 1024 * 1024
      })

      logger.warn('Upload Image Step – File size validation failed', errorContext)

      return {
        status: 400,
        body: {
          error: 'File too large',
          details: 'Maximum file size is 50MB'
        }
      }
    }

    // Additional validation for base64 data (only if not file upload)
    if (!isFileUpload && req.body.data) {
      try {
        validateBase64ImageData(req.body.data)

        const validationContext = buildLogContext(logContext, {
          dataValidation: 'passed',
          dataLength: req.body.data.length
        })
        logger.info('Upload Image Step – Base64 data validation passed', validationContext)

      } catch (dataError) {
        const safeError = createSafeErrorMessage(dataError, 'Base64 validation failed')
        const errorContext = buildLogContext(logContext, {
          validationError: safeError.message,
          errorType: 'base64_validation',
          dataLength: req.body.data?.length || 0
        })

        logger.error('Upload Image Step – Base64 data validation failed', errorContext)

        return {
          status: 400,
          body: {
            error: 'Invalid image data',
            details: safeError.message
          }
        }
      }
    }

    // Generate unique filename and storage keys
    let uniqueFilename: string
    let storageKeys: { original: string; desktop: string; mobile: string; lowquality: string }
    let format: 'jpeg' | 'png' | 'webp'

    try {
      uniqueFilename = generateUniqueFilename(filename)
      storageKeys = generateStorageKeys(uniqueFilename)
      format = getImageFormat(filename)

      const keyContext = buildLogContext(logContext, {
        uniqueFilename,
        originalStorageKey: storageKeys.original,
        format,
        keyGeneration: 'success'
      })
      logger.info('Upload Image Step – Generated unique filename and storage keys', keyContext)

    } catch (keyError) {
      const safeError = createSafeErrorMessage(keyError, 'Storage key generation failed')
      const errorContext = buildLogContext(logContext, {
        keyError: safeError.message,
        errorType: 'key_generation'
      })

      logger.error('Upload Image Step – Failed to generate storage keys', errorContext)

      return {
        status: 500,
        body: {
          error: 'Storage key generation failed',
          details: safeError.details || 'Could not generate storage keys'
        }
      }
    }

    // Save image to storage using stream
    let originalStorageKey: string
    let originalUrl: string

    try {
      const contentType = getContentTypeFromFilename(filename)
      
      originalStorageKey = await saveImageBuffer(imageBuffer, storageKeys.original, contentType)
      originalUrl = await getImageUrl(originalStorageKey)

      const saveContext = buildLogContext(logContext, {
        originalStorageKey,
        originalUrl,
        fileSize: imageBuffer.length,
        storageSave: 'success'
      })
      logger.info('Upload Image Step – Successfully saved image to storage', saveContext)

    } catch (saveError) {
      const safeError = createSafeErrorMessage(saveError, 'Storage save failed')
      const errorContext = buildLogContext(logContext, {
        saveError: safeError.message,
        errorType: 'storage_save',
        targetKey: storageKeys.original,
        bufferSize: imageBuffer?.length || 0
      })

      logger.error('Upload Image Step – Failed to save image to storage', errorContext)

      return {
        status: 500,
        body: {
          error: 'Failed to save image',
          details: safeError.message
        }
      }
    }

    // Validate image buffer
    if (imageBuffer.length === 0) {
      const errorContext = buildLogContext(logContext, {
        bufferError: 'Empty image buffer',
        errorType: 'buffer_validation'
      })

      logger.error('Upload Image Step – Empty image buffer detected', errorContext)

      return {
        status: 400,
        body: {
          error: 'Invalid image data',
          details: 'Image buffer is empty'
        }
      }
    }

    const bufferContext = buildLogContext(logContext, {
      bufferSize: imageBuffer.length,
      bufferValidation: 'success'
    })
    logger.info('Upload Image Step – Image buffer validation passed', bufferContext)



    // Create image metadata with enhanced logging
    const imageMetadata: ImageMetadata = {
      originalFilename: filename,
      uniqueFilename,
      format,
      originalStorageKey,
      originalUrl,
      traceId,
      uploadedAt: new Date()
    }

    const metadataContext = buildLogContext(logContext, {
      imageMetadata: {
        ...imageMetadata,
        uploadedAt: imageMetadata.uploadedAt.toISOString()
      },
      metadataCreation: 'success'
    })
    logger.info('Upload Image Step – Created image metadata', metadataContext)

    // Emit image-saved event to trigger parallel resize operations with enhanced error handling
    try {
      await emit({
        topic: 'image-saved',
        data: {
          ...imageMetadata,
          uploadedAt: imageMetadata.uploadedAt.toISOString()
        },
      })

      const emitContext = buildLogContext(logContext, {
        eventTopic: 'image-saved',
        eventEmission: 'success',
        processingTriggered: true
      })
      logger.info('Upload Image Step – Successfully emitted image-saved event', emitContext)

    } catch (emitError) {
      const safeError = createSafeErrorMessage(emitError, 'Event emission failed')
      const errorContext = buildLogContext(logContext, {
        emitError: safeError.message,
        errorType: 'event_emission',
        eventTopic: 'image-saved'
      })

      logger.error('Upload Image Step – Failed to emit image-saved event', errorContext)

      return {
        status: 500,
        body: {
          error: 'Failed to trigger processing',
          details: safeError.message
        }
      }
    }

    // Calculate processing time and return success response
    const processingTime = Date.now() - startTime
    const successContext = buildLogContext(logContext, {
      processingTimeMs: processingTime,
      uploadSuccess: true,
      fileSize: imageBuffer.length
    })

    logger.info('Upload Image Step – Upload completed successfully', successContext)

    return {
      status: 200,
      body: {
        message: 'Image uploaded successfully and processing started',
        traceId,
        imageMetadata: {
          ...imageMetadata,
          uploadedAt: imageMetadata.uploadedAt.toISOString()
        }
      },
    }

  } catch (error) {
    const processingTime = Date.now() - startTime
    const safeError = createSafeErrorMessage(error, 'Unexpected upload error')
    const errorContext = buildLogContext({
      step: 'UploadImage',
      traceId,
      processingTimeMs: processingTime,
      unexpectedError: safeError.message,
      errorType: 'unexpected_error'
    })

    logger.error('Upload Image Step – Unexpected error during image upload', errorContext)

    return {
      status: 500,
      body: {
        error: 'Internal server error',
        details: safeError.details || 'An unexpected error occurred during image upload'
      }
    }
  }
}