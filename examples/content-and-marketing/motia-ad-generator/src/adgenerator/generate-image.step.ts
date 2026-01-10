// src/ad-generator/generate-image.step.ts

import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { NanoBananaProService } from "../services/nanoBananaPro.service";

const inputSchema = z.object({
  jobId: z.string(),
  url: z.string().url(),
  type: z
    .array(z.enum(["instagram", "tiktok"]))
    .min(1)
    .max(2),
  imagePrompt: z.string(),
  brandAnalysis: z.object({
    brandName: z.string(),
    tagline: z.string(),
    usps: z.array(z.string()),
    colors: z.object({
      primary: z.string(),
      accent: z.string(),
      background: z.string(),
    }),
    fonts: z.array(z.string()),
    tone: z.string(),
    visualStyle: z.string(),
  }),
  filteredImages: z.array(z.string().url()),
  screenshot: z.string().url().optional(),
  videoProvider: z.enum(["kling", "veo", "auto"]),
  adFormat: z.enum(["1:1", "9:16"]),
});

export const config: EventConfig = {
  type: "event",
  name: "GenerateImage",
  description: "Generates ad image using Nano Banana Pro (Gemini 3 Pro Image)",
  subscribes: ["ad.image.prompt.generated"],
  emits: [{ topic: "ad.image.completed", label: "Image Generation Completed" }],
  flows: ["ad-generator"],
  input: inputSchema,
};

export const handler: Handlers["GenerateImage"] = async (
  input,
  { emit, logger, state }
) => {
  const {
    jobId,
    url,
    type,
    imagePrompt,
    brandAnalysis,
    filteredImages,
    screenshot,
    adFormat,
  } = input;

  logger.info("Starting image generation with Nano Banana Pro", {
    jobId,
    brandName: brandAnalysis.brandName,
    adFormat,
    productImageCount: filteredImages.length,
  });

  try {
    // Generate ad image with Nano Banana Pro
    const result = await NanoBananaProService.generateAdImage(
      {
        prompt: imagePrompt,
        productImages: filteredImages,
        screenshot,
        aspectRatio: adFormat,
      },
      logger
    );

    // Get current job state
    const jobState = await state.get("ad-generator", `job_${jobId}`);

    // Update state with generated image
    await state.set("ad-generator", `job_${jobId}`, {
      ...(jobState as any),
      generatedImage: {
        imagePath: result.imagePath,
        adFormat,
        aspectRatio: adFormat,
      },
      status: "image_completed",
      imageCompletedAt: new Date().toISOString(),
    });

    logger.info("Image generation completed successfully", {
      jobId,
      imagePath: result.imagePath,
      adFormat,
    });

    // Emit completion event
    await emit({
      topic: "ad.image.completed",
      data: {
        jobId,
        url,
        type,
        imagePath: result.imagePath,
        adFormat,
        brandAnalysis,
      },
    });
  } catch (error) {
    logger.error("Image generation failed", {
      jobId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Update state with error
    await state.set("ad-generator", `job_${jobId}`, {
      jobId,
      url,
      type,
      status: "image_generation_failed",
      error: error instanceof Error ? error.message : "Unknown error",
      failedAt: new Date().toISOString(),
    });

    throw error;
  }
};
