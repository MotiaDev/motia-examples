/**
 * Storage-aware utility functions for image processing
 */

import { randomUUID } from 'crypto'
import { extname } from 'path'
import { Readable } from 'stream'
import type { SupportedImageFormat, ResizeType, ImageMetadata } from './interfaces'
import { getStorageAdapter } from './storage'

/**
 * Generate a unique filename with UUID for cloud storage
 */
export function generateUniqueFilename(originalFilename: string): string {
  const extension = extname(originalFilename)
  const uuid = randomUUID()
  const sanitized = sanitizeFilename(originalFilename.replace(extension, ''))
  return `${sanitized}_${uuid}${extension}`
}

/**
 * Generate storage keys for different image variants
 */
export function generateStorageKeys(uniqueFilename: string): {
  original: string
  desktop: string
  mobile: string
  lowquality: string
} {
  const extension = extname(uniqueFilename)
  const nameWithoutExt = uniqueFilename.replace(extension, '')
  
  return {
    original: `originals/${uniqueFilename}`,
    desktop: `desktop/${nameWithoutExt}-desktop${extension}`,
    mobile: `mobile/${nameWithoutExt}-mobile${extension}`,
    lowquality: `lowquality/${nameWithoutExt}-lowquality${extension}`
  }
}

/**
 * Save image stream to storage and return the storage key
 */
export async function saveImageStream(
  stream: Readable, 
  storageKey: string,
  contentType?: string
): Promise<string> {
  const storage = getStorageAdapter()
  return await storage.saveStream(stream, storageKey, contentType)
}

/**
 * Save image buffer to storage (for upload scenarios)
 */
export async function saveImageBuffer(
  buffer: Buffer,
  storageKey: string,
  contentType?: string
): Promise<string> {
  const storage = getStorageAdapter()
  
  // Add a special property to indicate this is a buffer-based stream
  const stream = bufferToStream(buffer)
  ;(stream as any)._isBufferStream = true
  ;(stream as any)._bufferLength = buffer.length
  
  return await storage.saveStream(stream, storageKey, contentType)
}

/**
 * Get image stream from storage
 */
export async function getImageStream(storageKey: string): Promise<Readable> {
  const storage = getStorageAdapter()
  return await storage.getStream(storageKey)
}

/**
 * Check if image exists in storage
 */
export async function imageExistsInStorage(storageKey: string): Promise<boolean> {
  const storage = getStorageAdapter()
  return await storage.exists(storageKey)
}

/**
 * Get public URL for image
 */
export async function getImageUrl(storageKey: string): Promise<string> {
  const storage = getStorageAdapter()
  return await storage.getPublicUrl(storageKey)
}

/**
 * Convert buffer to readable stream
 */
export function bufferToStream(buffer: Buffer): Readable {
  return Readable.from(buffer)
}

/**
 * Convert stream to buffer (for backwards compatibility)
 */
export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

/**
 * Validate if the file format is supported
 */
export function isValidImageFormat(filename: string): boolean {
  const extension = extname(filename).toLowerCase()
  const supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp']
  return supportedExtensions.includes(extension)
}

/**
 * Get the image format from filename
 */
export function getImageFormat(filename: string): SupportedImageFormat {
  const extension = extname(filename).toLowerCase()
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'jpeg'
    case '.png':
      return 'png'
    case '.webp':
      return 'webp'
    default:
      throw new Error(`Unsupported image format: ${extension}`)
  }
}

/**
 * Get resize configuration based on type
 */
export function getResizeConfig(resizeType: ResizeType): { width: number; quality?: number } {
  switch (resizeType) {
    case 'desktop':
      return { width: 1920, quality: 90 }
    case 'mobile':
      return { width: 720, quality: 85 }
    case 'lowquality':
      return { width: 480, quality: 60 }
    default:
      throw new Error(`Unknown resize type: ${resizeType}`)
  }
}

/**
 * Validate base64 image data
 */
export function validateBase64ImageData(data: string): void {
  if (!data || typeof data !== 'string') {
    throw new Error('Image data must be a non-empty string')
  }

  // Remove data URL prefix if present
  const base64Data = data.replace(/^data:image\/[a-z]+;base64,/, '')
  
  if (base64Data.length === 0) {
    throw new Error('Base64 data is empty after removing data URL prefix')
  }

  // Validate base64 format
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
  if (!base64Regex.test(base64Data)) {
    throw new Error('Invalid base64 format')
  }

  // Check if base64 data can be decoded
  try {
    const buffer = Buffer.from(base64Data, 'base64')
    if (buffer.length === 0) {
      throw new Error('Decoded base64 data is empty')
    }
    
    // Basic check for image file signatures
    const signature = buffer.subarray(0, 4)
    const isValidImageSignature = 
      // JPEG signatures
      (signature[0] === 0xFF && signature[1] === 0xD8) ||
      // PNG signature
      (signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4E && signature[3] === 0x47) ||
      // WebP signature (RIFF)
      (signature[0] === 0x52 && signature[1] === 0x49 && signature[2] === 0x46 && signature[3] === 0x46)
    
    if (!isValidImageSignature) {
      throw new Error('Base64 data does not appear to be a valid image file')
    }
  } catch (decodeError) {
    if (decodeError instanceof Error && decodeError.message.includes('does not appear to be a valid image')) {
      throw decodeError
    }
    throw new Error(`Failed to decode base64 data: ${decodeError instanceof Error ? decodeError.message : 'Unknown decode error'}`)
  }
}

/**
 * Create a safe error message for API responses
 */
export function createSafeErrorMessage(error: unknown, context: string): { message: string; details?: string } {
  if (error instanceof Error) {
    // Remove sensitive information from error messages
    const sanitizedMessage = error.message
      .replace(/\/[^\s]+/g, '[file-path]') // Replace file paths
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[uuid]') // Replace UUIDs
    
    return {
      message: `${context}: ${sanitizedMessage}`,
      details: error.name !== 'Error' ? error.name : undefined
    }
  }
  
  return {
    message: `${context}: An unexpected error occurred`,
    details: typeof error === 'string' ? error : 'Unknown error type'
  }
}

/**
 * Enhanced logging context builder
 */
export function buildLogContext(baseContext: Record<string, any>, additionalContext?: Record<string, any>): Record<string, any> {
  const context = { ...baseContext }
  
  // Add timestamp
  context.timestamp = new Date().toISOString()
  
  // Add additional context if provided
  if (additionalContext) {
    Object.assign(context, additionalContext)
  }
  
  // Sanitize sensitive information
  if (context.storageKey) {
    context.storageKey = context.storageKey.replace(/\/[^\/]+$/, '/[filename]')
  }
  
  return context
}

/**
 * Validate and sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename must be a non-empty string')
  }

  // Remove or replace dangerous characters
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace dangerous characters with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .toLowerCase() // Convert to lowercase for consistency
}

/**
 * Format file size for human-readable display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Type guards for input validation
 */
export function isImageMetadata(value: unknown): value is ImageMetadata {
  if (!value || typeof value !== 'object') {
    return false
  }

  const obj = value as Record<string, unknown>
  
  return (
    typeof obj.originalFilename === 'string' &&
    typeof obj.uniqueFilename === 'string' &&
    (obj.format === 'jpeg' || obj.format === 'png' || obj.format === 'webp') &&
    typeof obj.originalStorageKey === 'string' &&
    typeof obj.traceId === 'string' &&
    (obj.uploadedAt instanceof Date || typeof obj.uploadedAt === 'string')
  )
}

/**
 * Get content type from filename
 */
export function getContentTypeFromFilename(filename: string): string {
  const ext = extname(filename).toLowerCase()
  const contentTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  }
  return contentTypes[ext] || 'application/octet-stream'
}

/**
 * Type guard for upload request body validation
 */
export function isValidUploadRequest(value: unknown): value is { filename: string; data: string } {
  if (!value || typeof value !== 'object') {
    return false
  }

  const obj = value as Record<string, unknown>
  
  return (
    typeof obj.filename === 'string' &&
    obj.filename.trim().length > 0 &&
    typeof obj.data === 'string' &&
    obj.data.trim().length > 0
  )
}