// src/services/videoGenerator.service.ts

import { fal } from "@fal-ai/client";
import { Logger } from "motia";
import * as fs from "fs";
import * as path from "path";

const FAL_API_KEY = process.env.FAL_API_KEY;

export type VideoProvider = "kling" | "veo" | "auto";

export interface GenerateVideoConfig {
  referenceImages: string[]; // Array of image URLs (5 products + 1 screenshot)
  prompt: string;
  provider: VideoProvider;
  brandAnalysis?: any; // For smart selection
}

export interface GeneratedVideoResult {
  videoPath: string;
  provider: "kling" | "veo";
  duration: number;
}

// Configure FAL client
if (FAL_API_KEY) {
  fal.config({
    credentials: FAL_API_KEY,
  });
}

// Smart provider selection
function selectProvider(
  requestedProvider: VideoProvider,
  brandAnalysis?: any,
  logger?: Logger
): "kling" | "veo" {
  if (requestedProvider === "kling" || requestedProvider === "veo") {
    logger?.info("Using user-specified provider", {
      provider: requestedProvider,
    });
    return requestedProvider;
  }

  if (requestedProvider === "auto" && brandAnalysis) {
    const visualStyle = brandAnalysis.visualStyle?.toLowerCase() || "";
    const tone = brandAnalysis.tone?.toLowerCase() || "";

    if (
      /\b(luxury|premium|high-end|sophisticated|exclusive|elegant)\b/i.test(
        `${visualStyle} ${tone}`
      )
    ) {
      logger?.info("Auto-selected Veo 3.1 for premium brand", {
        visualStyle: brandAnalysis.visualStyle,
        tone: brandAnalysis.tone,
      });
      return "veo";
    }
  }

  logger?.info("Auto-selected Kling for optimal speed/cost balance");
  return "kling";
}

// Helper function to download image and convert to Blob for FAL
async function downloadImageAsBlob(
  imageUrl: string,
  logger?: Logger
): Promise<Blob> {
  logger?.info("Downloading image from URL", { url: imageUrl });

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download image from ${imageUrl}: ${response.statusText}`
    );
  }

  // Determine mime type from URL or response
  const contentType = response.headers.get("content-type");
  const mimeType =
    contentType ||
    (imageUrl.toLowerCase().match(/\.(jpg|jpeg)$/)
      ? "image/jpeg"
      : "image/png");

  const arrayBuffer = await response.arrayBuffer();
  // Create Blob with Uint8Array to ensure compatibility
  return new Blob([new Uint8Array(arrayBuffer)], { type: mimeType });
}

// Generate with Kling AI - Text-to-Video (simplified, no image uploads)
async function generateWithKling(
  config: GenerateVideoConfig,
  logger?: Logger
): Promise<GeneratedVideoResult> {
  if (!FAL_API_KEY) {
    throw new Error("FAL_API_KEY not set in environment variables");
  }

  logger?.info("Generating video with Kling AI (text-to-video) via FAL", {
    promptLength: config.prompt.length,
  });

  // TEMPORARILY DISABLED: Image upload/download
  // const primaryImageUrl = config.referenceImages[0];
  // const imageBlob = await downloadImageAsBlob(primaryImageUrl, logger);
  // const imageUrl = await fal.storage.upload(imageBlob);

  // Call Kling Text-to-Video API via FAL (simple prompt only)
  const result = await fal.subscribe(
    "fal-ai/kling-video/v2.6/pro/text-to-video",
    {
      input: {
        prompt: config.prompt,
        duration: "10",
        aspect_ratio: "9:16", // TikTok vertical format
        negative_prompt: "blur, distort, and low quality",
        generate_audio: true,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          logger?.info("Kling generation in progress", {
            logs: update.logs?.map((log) => log.message),
          });
        }
      },
    }
  );

  logger?.info("Kling generation completed", {
    requestId: result.requestId,
  });

  // Download video
  const videoUrl = result.data.video.url;
  const videoResponse = await fetch(videoUrl);
  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

  // Save video
  const outputDir = path.join(process.cwd(), "outputs");
  fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = Date.now();
  const filename = `video_kling_${timestamp}.mp4`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, videoBuffer);

  logger?.info("Kling video saved", {
    filepath,
    fileSize: videoBuffer.length,
  });

  return {
    videoPath: filepath,
    provider: "kling",
    duration: 10,
  };
}

// Generate with Veo 3.1 - Text-to-Video (simplified, no image uploads)
async function generateWithVeo(
  config: GenerateVideoConfig,
  logger?: Logger
): Promise<GeneratedVideoResult> {
  if (!FAL_API_KEY) {
    throw new Error("FAL_API_KEY not set in environment variables");
  }

  logger?.info("Generating video with Veo 3.1 (text-to-video) via FAL", {
    promptLength: config.prompt.length,
  });

  // TEMPORARILY DISABLED: Image upload/download for reference images
  // const MAX_VEO_IMAGES = 3;
  // const imagesToUse = config.referenceImages.slice(0, MAX_VEO_IMAGES);
  // const uploadedImageUrls: string[] = [];
  // for (let i = 0; i < imagesToUse.length; i++) {
  //   const imageUrl = imagesToUse[i];
  //   const imageBlob = await downloadImageAsBlob(imageUrl, logger);
  //   const falImageUrl = await fal.storage.upload(imageBlob);
  //   uploadedImageUrls.push(falImageUrl);
  // }

  // Call Veo 3.1 Text-to-Video API via FAL (simple prompt only)
  const result = await fal.subscribe("fal-ai/veo3.1", {
    input: {
      prompt: config.prompt,
      aspect_ratio: "9:16", // TikTok vertical format
      generate_audio: true,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        logger?.info("Veo generation in progress", {
          logs: update.logs?.map((log) => log.message),
        });
      }
    },
  });

  logger?.info("Veo generation completed", {
    requestId: result.requestId,
  });

  // Download video
  const videoUrl = result.data.video.url;
  const videoResponse = await fetch(videoUrl);
  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

  // Save video
  const outputDir = path.join(process.cwd(), "outputs");
  fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = Date.now();
  const filename = `video_veo_${timestamp}.mp4`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, videoBuffer);

  logger?.info("Veo video saved", {
    filepath,
    fileSize: videoBuffer.length,
  });

  return {
    videoPath: filepath,
    provider: "veo",
    duration: 8,
  };
}

// Main function with smart provider selection
export async function generateVideo(
  config: GenerateVideoConfig,
  logger?: Logger
): Promise<GeneratedVideoResult> {
  const selectedProvider = selectProvider(
    config.provider,
    config.brandAnalysis,
    logger
  );

  logger?.info("Starting video generation", {
    requestedProvider: config.provider,
    selectedProvider,
    referenceImageCount: config.referenceImages.length,
  });

  if (selectedProvider === "kling") {
    return await generateWithKling(config, logger);
  } else {
    return await generateWithVeo(config, logger);
  }
}

export const VideoGeneratorService = {
  generateVideo,
};

export default VideoGeneratorService;
