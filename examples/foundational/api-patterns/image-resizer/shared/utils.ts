/**
 * Utility functions for file path generation and validation
 */

import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { existsSync, mkdirSync, accessSync, constants } from 'fs';
import type { SupportedImageFormat, ResizeType } from './interfaces.js';

/**
 * Generate a unique filename with UUID
 */
export function generateUniqueFilename(originalFilename: string): string {
  const extension = extname(originalFilename);
  const uuid = randomUUID();
  return `${uuid}${extension}`;
}

/**
 * Validate if the file format is supported
 */
export function isValidImageFormat(filename: string): boolean {
  const extension = extname(filename).toLowerCase();
  const supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  return supportedExtensions.includes(extension);
}

/**
 * Get the image format from filename
 */
export function getImageFormat(filename: string): SupportedImageFormat {
  const extension = extname(filename).toLowerCase();
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'jpeg';
    case '.png':
      return 'png';
    case '.webp':
      return 'webp';
    default:
      throw new Error(`Unsupported image format: ${extension}`);
  }
}

/**
 * Generate file path for original image
 */
export function getOriginalImagePath(uniqueFilename: string): string {
  return join('output', 'originals', uniqueFilename);
}

/**
 * Generate file path for resized image
 */
export function getResizedImagePath(uniqueFilename: string, resizeType: ResizeType): string {
  const extension = extname(uniqueFilename);
  const nameWithoutExt = uniqueFilename.replace(extension, '');
  const resizedFilename = `${nameWithoutExt}-${resizeType}${extension}`;
  return join('output', resizeType, resizedFilename);
}

/**
 * Ensure directory exists, create if it doesn't
 * Enhanced with comprehensive error handling
 */
export function ensureDirectoryExists(dirPath: string): void {
  try {
    // Validate the directory path first
    if (!isValidFilePath(dirPath)) {
      throw new Error(`Invalid directory path: ${dirPath}`);
    }

    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
      
      // Verify the directory was created and is writable
      try {
        accessSync(dirPath, constants.W_OK);
      } catch (accessError) {
        throw new Error(`Directory created but not writable: ${dirPath}. Error: ${accessError instanceof Error ? accessError.message : 'Unknown access error'}`);
      }
    } else {
      // Directory exists, verify it's writable
      try {
        accessSync(dirPath, constants.W_OK);
      } catch (accessError) {
        throw new Error(`Directory exists but not writable: ${dirPath}. Error: ${accessError instanceof Error ? accessError.message : 'Unknown access error'}`);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid directory path')) {
      throw error; // Re-throw validation errors as-is
    }
    throw new Error(`Failed to ensure directory exists: ${dirPath}. Error: ${error instanceof Error ? error.message : 'Unknown filesystem error'}`);
  }
}

/**
 * Validate file path format
 */
export function isValidFilePath(filePath: string): boolean {
  // Basic validation - check if path is not empty and doesn't contain dangerous characters
  if (!filePath || filePath.trim() === '') {
    return false;
  }
  
  // Check for path traversal attempts
  if (filePath.includes('..') || filePath.includes('~')) {
    return false;
  }
  
  return true;
}

/**
 * Get resize configuration based on type
 */
export function getResizeConfig(resizeType: ResizeType): { width: number; quality?: number } {
  switch (resizeType) {
    case 'desktop':
      return { width: 1920 };
    case 'mobile':
      return { width: 720 };
    case 'lowquality':
      return { width: 480, quality: 60 };
    default:
      throw new Error(`Unknown resize type: ${resizeType}`);
  }
}

/**
 * Validate that a file exists and is readable
 */
export function validateFileExists(filePath: string): void {
  try {
    if (!isValidFilePath(filePath)) {
      throw new Error(`Invalid file path: ${filePath}`);
    }

    if (!existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    // Check if file is readable
    try {
      accessSync(filePath, constants.R_OK);
    } catch (accessError) {
      throw new Error(`File exists but is not readable: ${filePath}. Error: ${accessError instanceof Error ? accessError.message : 'Unknown access error'}`);
    }
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Invalid file path') || error.message.includes('File does not exist') || error.message.includes('not readable'))) {
      throw error; // Re-throw validation errors as-is
    }
    throw new Error(`Failed to validate file: ${filePath}. Error: ${error instanceof Error ? error.message : 'Unknown filesystem error'}`);
  }
}

/**
 * Validate base64 image data
 */
export function validateBase64ImageData(data: string): void {
  if (!data || typeof data !== 'string') {
    throw new Error('Image data must be a non-empty string');
  }

  // Remove data URL prefix if present
  const base64Data = data.replace(/^data:image\/[a-z]+;base64,/, '');
  
  if (base64Data.length === 0) {
    throw new Error('Base64 data is empty after removing data URL prefix');
  }

  // Validate base64 format
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(base64Data)) {
    throw new Error('Invalid base64 format');
  }

  // Check if base64 data can be decoded
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
      throw new Error('Decoded base64 data is empty');
    }
    
    // Basic check for image file signatures
    const signature = buffer.subarray(0, 4);
    const isValidImageSignature = 
      // JPEG signatures
      (signature[0] === 0xFF && signature[1] === 0xD8) ||
      // PNG signature
      (signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4E && signature[3] === 0x47) ||
      // WebP signature (RIFF)
      (signature[0] === 0x52 && signature[1] === 0x49 && signature[2] === 0x46 && signature[3] === 0x46);
    
    if (!isValidImageSignature) {
      throw new Error('Base64 data does not appear to be a valid image file');
    }
  } catch (decodeError) {
    if (decodeError instanceof Error && decodeError.message.includes('does not appear to be a valid image')) {
      throw decodeError;
    }
    throw new Error(`Failed to decode base64 data: ${decodeError instanceof Error ? decodeError.message : 'Unknown decode error'}`);
  }
}

/**
 * Create a safe error message for API responses
 * Removes sensitive information while preserving useful debugging info
 */
export function createSafeErrorMessage(error: unknown, context: string): { message: string; details?: string } {
  if (error instanceof Error) {
    // Remove file paths and other sensitive information from error messages
    const sanitizedMessage = error.message
      .replace(/\/[^\s]+/g, '[file-path]') // Replace file paths
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[uuid]'); // Replace UUIDs
    
    return {
      message: `${context}: ${sanitizedMessage}`,
      details: error.name !== 'Error' ? error.name : undefined
    };
  }
  
  return {
    message: `${context}: An unexpected error occurred`,
    details: typeof error === 'string' ? error : 'Unknown error type'
  };
}

/**
 * Enhanced logging context builder
 */
export function buildLogContext(baseContext: Record<string, any>, additionalContext?: Record<string, any>): Record<string, any> {
  const context = { ...baseContext };
  
  // Add timestamp
  context.timestamp = new Date().toISOString();
  
  // Add additional context if provided
  if (additionalContext) {
    Object.assign(context, additionalContext);
  }
  
  // Sanitize sensitive information
  if (context.originalPath) {
    context.originalPath = context.originalPath.replace(/\/[^\/]+$/, '/[filename]');
  }
  
  return context;
}

/**
 * File cleanup utilities for error scenarios
 */

/**
 * Safely delete a file if it exists
 */
export function cleanupFile(filePath: string): void {
  try {
    if (!isValidFilePath(filePath)) {
      throw new Error(`Invalid file path for cleanup: ${filePath}`);
    }

    if (existsSync(filePath)) {
      const { unlinkSync } = require('fs');
      unlinkSync(filePath);
    }
  } catch (error) {
    // Log error but don't throw - cleanup should be non-blocking
    console.warn(`Failed to cleanup file ${filePath}:`, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Cleanup multiple files in a batch operation
 */
export function cleanupFiles(filePaths: string[]): { cleaned: string[]; failed: string[] } {
  const cleaned: string[] = [];
  const failed: string[] = [];

  for (const filePath of filePaths) {
    try {
      if (!isValidFilePath(filePath)) {
        failed.push(filePath);
        continue;
      }

      if (existsSync(filePath)) {
        const { unlinkSync } = require('fs');
        unlinkSync(filePath);
        cleaned.push(filePath);
      }
    } catch (error) {
      failed.push(filePath);
      console.warn(`Failed to cleanup file ${filePath}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  return { cleaned, failed };
}

/**
 * Cleanup directory if it's empty
 */
export function cleanupEmptyDirectory(dirPath: string): void {
  try {
    if (!isValidFilePath(dirPath)) {
      throw new Error(`Invalid directory path for cleanup: ${dirPath}`);
    }

    if (existsSync(dirPath)) {
      const { readdirSync, rmdirSync } = require('fs');
      const files = readdirSync(dirPath);
      
      if (files.length === 0) {
        rmdirSync(dirPath);
      }
    }
  } catch (error) {
    // Log error but don't throw - cleanup should be non-blocking
    console.warn(`Failed to cleanup directory ${dirPath}:`, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Type guards for input validation
 */

/**
 * Type guard to check if value is a valid ImageMetadata object
 */
export function isImageMetadata(value: unknown): value is import('./interfaces.js').ImageMetadata {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.originalFilename === 'string' &&
    typeof obj.uniqueFilename === 'string' &&
    (obj.format === 'jpeg' || obj.format === 'png' || obj.format === 'webp') &&
    typeof obj.originalPath === 'string' &&
    typeof obj.traceId === 'string' &&
    (obj.uploadedAt instanceof Date || typeof obj.uploadedAt === 'string')
  );
}

/**
 * Type guard to check if value is a valid ResizeTask object
 */
export function isResizeTask(value: unknown): value is import('./interfaces.js').ResizeTask {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;
  
  return (
    isImageMetadata(obj.imageMetadata) &&
    typeof obj.targetWidth === 'number' &&
    obj.targetWidth > 0 &&
    (obj.quality === undefined || (typeof obj.quality === 'number' && obj.quality > 0 && obj.quality <= 100)) &&
    typeof obj.suffix === 'string' &&
    typeof obj.outputPath === 'string'
  );
}

/**
 * Type guard to check if value is a valid ProcessingStatus object
 */
export function isProcessingStatus(value: unknown): value is import('./interfaces.js').ProcessingStatus {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.traceId === 'string' &&
    typeof obj.originalImage === 'string' &&
    typeof obj.desktopComplete === 'boolean' &&
    typeof obj.mobileComplete === 'boolean' &&
    typeof obj.lowqualityComplete === 'boolean' &&
    (obj.completedAt === undefined || obj.completedAt instanceof Date || typeof obj.completedAt === 'string')
  );
}

/**
 * Type guard to check if value is a valid SupportedImageFormat
 */
export function isSupportedImageFormat(value: unknown): value is import('./interfaces.js').SupportedImageFormat {
  return value === 'jpeg' || value === 'png' || value === 'webp';
}

/**
 * Type guard to check if value is a valid ResizeType
 */
export function isResizeType(value: unknown): value is import('./interfaces.js').ResizeType {
  return value === 'desktop' || value === 'mobile' || value === 'lowquality';
}

/**
 * Type guard for upload request body validation
 */
export function isValidUploadRequest(value: unknown): value is { filename: string; data: string } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.filename === 'string' &&
    obj.filename.trim().length > 0 &&
    typeof obj.data === 'string' &&
    obj.data.trim().length > 0
  );
}

/**
 * Advanced file path utilities
 */

/**
 * Generate all possible output paths for an image
 */
export function generateAllOutputPaths(uniqueFilename: string): {
  original: string;
  desktop: string;
  mobile: string;
  lowquality: string;
} {
  return {
    original: getOriginalImagePath(uniqueFilename),
    desktop: getResizedImagePath(uniqueFilename, 'desktop'),
    mobile: getResizedImagePath(uniqueFilename, 'mobile'),
    lowquality: getResizedImagePath(uniqueFilename, 'lowquality')
  };
}

/**
 * Ensure all output directories exist for the image processing pipeline
 */
export function ensureAllOutputDirectories(): void {
  const outputDirs = [
    'output/originals',
    'output/desktop', 
    'output/mobile',
    'output/lowquality'
  ];

  for (const dir of outputDirs) {
    ensureDirectoryExists(dir);
  }
}

/**
 * Get file size in bytes
 */
export function getFileSize(filePath: string): number {
  try {
    if (!isValidFilePath(filePath)) {
      throw new Error(`Invalid file path: ${filePath}`);
    }

    if (!existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const { statSync } = require('fs');
    const stats = statSync(filePath);
    return stats.size;
  } catch (error) {
    throw new Error(`Failed to get file size for ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Format file size for human-readable display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate and sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename must be a non-empty string');
  }

  // Remove or replace dangerous characters
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace dangerous characters with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .toLowerCase(); // Convert to lowercase for consistency
}

/**
 * Extract file extension without the dot
 */
export function getFileExtension(filename: string): string {
  const ext = extname(filename);
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

/**
 * Check if file has a valid image extension
 */
export function hasValidImageExtension(filename: string): boolean {
  const ext = getFileExtension(filename).toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
}