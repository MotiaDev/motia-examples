/**
 * ImageKit Service
 *
 * Handles file uploads to ImageKit CDN for permanent URL generation.
 * Used for screenshots and generated ad assets.
 */

import ImageKit from "@imagekit/nodejs";

// ============================================================================
// Types
// ============================================================================

export interface UploadResult {
  fileId: string;
  name: string;
  size: number;
  versionInfo: {
    id: string;
    name: string;
  };
  filePath: string;
  url: string;
  fileType: string;
  height: number;
  width: number;
  thumbnailUrl: string;
  AITags: string[] | null;
  description: string | null;
}

// ============================================================================
// Service
// ============================================================================

export class ImageKitService {
  private readonly client: ImageKit;

  constructor() {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error("IMAGEKIT_PRIVATE_KEY is required");
    }

    this.client = new ImageKit({
      privateKey,
    });
  }

  /**
   * Upload file from URL to ImageKit
   */
  async uploadFromUrl(
    url: string,
    fileName: string,
    folder?: string
  ): Promise<UploadResult> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const result = await this.client.files.upload({
        file: response,
        fileName,
        folder: folder || "/ad-generator",
        useUniqueFileName: true,
      });

      return result as UploadResult;
    } catch (error: any) {
      throw new Error(
        `Failed to upload from URL: ${error.message || "Unknown error"}`
      );
    }
  }

  /**
   * Upload base64 encoded file to ImageKit
   */
  async uploadBase64(
    base64Data: string,
    fileName: string,
    folder?: string
  ): Promise<UploadResult> {
    try {
      const result = await this.client.files.upload({
        file: base64Data,
        fileName,
        folder: folder || "/ad-generator",
        useUniqueFileName: true,
      });

      return result as UploadResult;
    } catch (error: any) {
      throw new Error(
        `Failed to upload base64: ${error.message || "Unknown error"}`
      );
    }
  }

  /**
   * Delete file from ImageKit
   */
}

// ============================================================================
// Factory & Convenience Exports
// ============================================================================

export function createImageKitService(): ImageKitService {
  return new ImageKitService();
}

export async function uploadFromUrl(
  url: string,
  fileName: string,
  folder?: string
): Promise<UploadResult> {
  const service = createImageKitService();
  return service.uploadFromUrl(url, fileName, folder);
}
