/**
 * Nano Banana Pro Service
 *
 * Uses Gemini 3 Pro Image (Nano Banana Pro) for high-quality ad image generation.
 * Generates ultra-realistic, professionally styled Instagram ad images from detailed prompts.
 */

import { GoogleGenAI } from "@google/genai";

// ============================================================================
// Types
// ============================================================================

export interface ImageGenerationInput {
  prompt: string;
  aspectRatio?: "1:1" | "9:16" | "16:9" | "4:3" | "3:4";
  imageSize?: "1K" | "2K" | "4K";
}

export interface GeneratedImage {
  base64Data: string;
  mimeType: string;
  size: string;
}

// ============================================================================
// Service
// ============================================================================

export class NanoBananaService {
  private readonly client: GoogleGenAI;
  private readonly model = "gemini-3-pro-image-preview";

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required");
    }

    this.client = new GoogleGenAI({
      apiKey,
    });
  }

  /**
   * Generate high-quality ad image from prompt
   */
  async generateImage(input: ImageGenerationInput): Promise<GeneratedImage> {
    try {
      const config = {
        responseModalities: ["IMAGE"],
        imageConfig: {
          imageSize: input.imageSize || "1K",
          aspectRatio: input.aspectRatio || "1:1",
        },
      };

      const contents = [
        {
          role: "user",
          parts: [
            {
              text: input.prompt,
            },
          ],
        },
      ];

      const response = await this.client.models.generateContentStream({
        model: this.model,
        config,
        contents,
      });

      let imageData: GeneratedImage | null = null;

      for await (const chunk of response) {
        if (!chunk.candidates?.[0]?.content?.parts) {
          continue;
        }

        const inlineData = chunk.candidates[0].content.parts[0]?.inlineData;

        if (inlineData?.data && inlineData?.mimeType) {
          imageData = {
            base64Data: inlineData.data,
            mimeType: inlineData.mimeType,
            size: input.imageSize || "1K",
          };
          break;
        }
      }

      if (!imageData) {
        throw new Error("No image data received from Nano Banana Pro");
      }

      return imageData;
    } catch (error: any) {
      throw new Error(
        `Failed to generate image: ${error.message || "Unknown error"}`
      );
    }
  }

  /**
   * Generate multiple images with same prompt
   */
  async generateMultipleImages(
    input: ImageGenerationInput,
    count: number
  ): Promise<GeneratedImage[]> {
    const images: GeneratedImage[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const image = await this.generateImage(input);
        images.push(image);
      } catch (error: any) {
        console.error(
          `Failed to generate image ${i + 1}/${count}:`,
          error.message
        );
        // Continue with other images even if one fails
      }
    }

    return images;
  }

  /**
   * Convert base64 to Buffer for upload
   */
  toBuffer(base64Data: string): Buffer {
    return Buffer.from(base64Data, "base64");
  }
}

// ============================================================================
// Factory & Convenience Exports
// ============================================================================

export function createNanoBananaService(): NanoBananaService {
  return new NanoBananaService();
}

export async function generateImage(
  input: ImageGenerationInput
): Promise<GeneratedImage> {
  const service = createNanoBananaService();
  return service.generateImage(input);
}

export async function generateMultipleImages(
  input: ImageGenerationInput,
  count: number
): Promise<GeneratedImage[]> {
  const service = createNanoBananaService();
  return service.generateMultipleImages(input, count);
}
