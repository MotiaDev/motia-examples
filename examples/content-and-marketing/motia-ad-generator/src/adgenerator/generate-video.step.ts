// src/ad-generator/generate-video.step.ts

import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { VideoGeneratorService } from "../services/videoGenerator.service";

const inputSchema = z.object({
  jobId: z.string(),
  url: z.string().url(),
  type: z
    .array(z.enum(["instagram", "tiktok"]))
    .min(1)
    .max(2),
  videoPrompt: z.string(),
  videoPromptReasoning: z.object({
    productCategory: z.string(),
    humanCount: z.number(),
    genders: z.array(z.string()),
    setting: z.string(),
    timeOfDay: z.string(),
    cameraStyle: z.string(),
  }),
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
  adType: z.enum(["instagram", "tiktok"]),
});

export const config: EventConfig = {
  type: "event",
  name: "GenerateVideo",
  description:
    "Generates cinematic video using Kling AI or Veo 3.1 with multiple reference images",
  subscribes: ["ad.video.prompt.generated"],
  emits: [{ topic: "ad.video.completed", label: "Video Generation Completed" }],
  flows: ["ad-generator"],
  input: inputSchema,
};

export const handler: Handlers["GenerateVideo"] = async (
  input,
  { emit, logger, state }
) => {
  const {
    jobId,
    url,
    type,
    videoPrompt,
    videoPromptReasoning,
    brandAnalysis,
    filteredImages,
    screenshot,
    videoProvider,
    adType,
  } = input;

  logger.info("Starting video generation with multiple reference images", {
    jobId,
    brandName: brandAnalysis.brandName,
    videoProvider,
    adType,
    productImageCount: filteredImages.length,
    hasScreenshot: !!screenshot,
    reasoning: videoPromptReasoning,
  });

  try {
    // Prepare reference images: 5 products + hero screenshot (6 total)
    // filteredImages already contains 5 products + screenshot from filter step
    const referenceImages = filteredImages.filter(Boolean);

    logger.info("Using reference images for video generation", {
      jobId,
      referenceImageCount: referenceImages.length,
      images: referenceImages,
    });

    if (referenceImages.length === 0) {
      throw new Error("No reference images available for video generation");
    }

    // Generate video with multiple reference images
    const result = await VideoGeneratorService.generateVideo(
      {
        referenceImages, // Pass all 6 images (5 products + screenshot)
        prompt: videoPrompt,
        provider: videoProvider,
        brandAnalysis, // For smart provider selection
      },
      logger
    );

    logger.info("Video generation completed successfully", {
      jobId,
      videoPath: result.videoPath,
      provider: result.provider,
      duration: result.duration,
    });

    // Get current job state
    const jobStateProxy = await state.get<any>("ad-generator", `job_${jobId}`);

    // IMPORTANT: Create clean copy to avoid circular references from proxy
    const currentState = {
      jobId: jobStateProxy?.jobId || jobId,
      url: jobStateProxy?.url || url,
      type: jobStateProxy?.type || type,
      output: jobStateProxy?.output,
      status: jobStateProxy?.status,
      brandAnalysis: jobStateProxy?.brandAnalysis,
      generatedImage: jobStateProxy?.generatedImage, // Preserve image if already generated
      completedOutputs: jobStateProxy?.completedOutputs,
      scrapedAt: jobStateProxy?.scrapedAt,
      filteredAt: jobStateProxy?.filteredAt,
      analyzedAt: jobStateProxy?.analyzedAt,
      imageCompletedAt: jobStateProxy?.imageCompletedAt,
    };

    // Update state with video result (clean object, no proxy spreading)
    await state.set("ad-generator", `job_${jobId}`, {
      ...currentState,
      generatedVideo: {
        videoPath: result.videoPath,
        provider: result.provider,
        duration: result.duration,
        adType,
        referenceImageCount: referenceImages.length,
      },
      status: "video_completed",
      videoCompletedAt: new Date().toISOString(),
    });

    // Emit completion event
    await emit({
      topic: "ad.video.completed",
      data: {
        jobId,
        url,
        type,
        videoPath: result.videoPath,
        provider: result.provider,
        duration: result.duration,
        adType,
        brandAnalysis,
      },
    });
  } catch (error) {
    logger.error("Video generation failed", {
      jobId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Update state with error
    await state.set("ad-generator", `job_${jobId}`, {
      jobId,
      url,
      type,
      status: "video_generation_failed",
      error: error instanceof Error ? error.message : "Unknown error",
      failedAt: new Date().toISOString(),
    });

    throw error;
  }
};
