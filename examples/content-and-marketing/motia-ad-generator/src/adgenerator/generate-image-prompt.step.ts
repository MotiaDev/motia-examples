// src/ad-generator/generate-image-prompt.step.ts

import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { PromptGeneratorService } from "../services/prompt-generator.service";

const inputSchema = z.object({
  jobId: z.string(),
  url: z.string().url(),
  type: z
    .array(z.enum(["instagram", "tiktok"]))
    .min(1)
    .max(2),
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
});

export const config: EventConfig = {
  type: "event",
  name: "GenerateImagePrompt",
  description:
    "Generates optimized prompt for Nano Banana Pro image generation",
  subscribes: ["ad.image.generation.ready"],
  emits: [
    { topic: "ad.image.prompt.generated", label: "Image Prompt Generated" },
  ],
  flows: ["ad-generator"],
  input: inputSchema,
};

export const handler: Handlers["GenerateImagePrompt"] = async (
  input,
  { emit, logger, state }
) => {
  const {
    jobId,
    url,
    type,
    brandAnalysis,
    filteredImages,
    screenshot,
    videoProvider,
  } = input;

  logger.info("Generating image prompt", {
    jobId,
    brandName: brandAnalysis.brandName,
  });

  try {
    // Determine ad type and format based on platform
    const adType = type.includes("instagram") ? "instagram" : "tiktok";
    const adFormat = adType === "instagram" ? "1:1" : "9:16";

    // Generate prompt using service
    const imagePrompt = PromptGeneratorService.generateImagePrompt({
      brandAnalysis,
      productImages: filteredImages,
      adType,
      url,
    });

    // Get current job state
    const jobState = await state.get("ad-generator", `job_${jobId}`);

    // Update state with generated prompt
    await state.set("ad-generator", `job_${jobId}`, {
      ...(jobState as any),
      imagePrompt,
      status: "image_prompt_generated",
      imagePromptGeneratedAt: new Date().toISOString(),
    });

    logger.info("Image prompt generated successfully", {
      jobId,
      promptLength: imagePrompt.length,
    });

    // Emit to image generation step
    await emit({
      topic: "ad.image.prompt.generated",
      data: {
        jobId,
        url,
        type,
        imagePrompt,
        brandAnalysis,
        filteredImages,
        screenshot,
        videoProvider,
        adFormat,
      },
    });
  } catch (error) {
    logger.error("Image prompt generation failed", {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });

    await state.set("ad-generator", `job_${jobId}`, {
      jobId,
      url,
      type,
      status: "image_prompt_failed",
      error: error instanceof Error ? error.message : "Unknown error",
      failedAt: new Date().toISOString(),
    });

    throw error;
  }
};
