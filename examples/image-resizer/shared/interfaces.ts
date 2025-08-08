/**
 * Shared TypeScript interfaces for the image processing pipeline
 */

/**
 * Metadata for an uploaded image
 */
export interface ImageMetadata {
  originalFilename: string;
  uniqueFilename: string;
  format: 'jpeg' | 'png' | 'webp';
  originalStorageKey: string;
  originalUrl: string;
  traceId: string;
  uploadedAt: Date;
}

/**
 * Configuration for a resize task
 */
export interface ResizeTask {
  imageMetadata: ImageMetadata;
  targetWidth: number;
  quality?: number;
  resizeType: ResizeType;
  outputStorageKey: string;
}

/**
 * Status tracking for the complete processing workflow
 */
export interface ProcessingStatus {
  traceId: string;
  originalStorageKey: string;
  desktopComplete: boolean;
  mobileComplete: boolean;
  lowqualityComplete: boolean;
  completedAt?: Date;
}

/**
 * Resize completion data
 */
export interface ResizeCompletionData extends ImageMetadata {
  resizeType: ResizeType;
  outputStorageKey: string;
  outputUrl: string;
  completedAt: Date;
}

/**
 * Supported image formats
 */
export type SupportedImageFormat = 'jpeg' | 'png' | 'webp';

/**
 * Resize operation types
 */
export type ResizeType = 'desktop' | 'mobile' | 'lowquality';