// src/ad-generator/generate-video-prompt.step.ts

import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { VideoPromptGeneratorService } from "../services/videoPromptGenerator.service";

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
  name: "GenerateVideoPrompt",
  description:
    "Generates ultra-intelligent cinematic prompt for video generation (Kling/Veo)",
  subscribes: ["ad.video.prompt.ready"],
  emits: [
    { topic: "ad.video.prompt.generated", label: "Video Prompt Generated" },
  ],
  flows: ["ad-generator"],
  input: inputSchema,
};

export const handler: Handlers["GenerateVideoPrompt"] = async (
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

  logger.info("Generating ultra-intelligent video prompt", {
    jobId,
    brandName: brandAnalysis.brandName,
    videoProvider,
  });

  try {
    // Determine ad type (TikTok gets priority if both platforms)
    const adType = type.includes("tiktok") ? "tiktok" : "instagram";

    // Generate ultra-intelligent video prompt
    const videoPromptResult =
      await VideoPromptGeneratorService.generateVideoPrompt(
        {
          brandAnalysis,
          productImages: filteredImages,
          screenshot,
          adType: adType as "instagram" | "tiktok",
        },
        logger
      );

    // Get current job state
    const jobState = await state.get("ad-generator", `job_${jobId}`);

    // Update state with generated prompt and reasoning
    await state.set("ad-generator", `job_${jobId}`, {
      ...(jobState as any),
      videoPrompt: videoPromptResult.prompt,
      videoPromptReasoning: videoPromptResult.reasoning,
      status: "video_prompt_generated",
      videoPromptGeneratedAt: new Date().toISOString(),
    });

    logger.info("Video prompt generated successfully", {
      jobId,
      promptLength: videoPromptResult.prompt.length,
      reasoning: videoPromptResult.reasoning,
    });

    // Emit to video generation step
    await emit({
      topic: "ad.video.prompt.generated",
      data: {
        jobId,
        url,
        type,
        videoPrompt: videoPromptResult.prompt,
        videoPromptReasoning: videoPromptResult.reasoning,
        brandAnalysis,
        filteredImages,
        screenshot,
        videoProvider,
        adType,
      },
    });
  } catch (error) {
    logger.error("Video prompt generation failed", {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });

    await state.set("ad-generator", `job_${jobId}`, {
      jobId,
      url,
      type,
      status: "video_prompt_failed",
      error: error instanceof Error ? error.message : "Unknown error",
      failedAt: new Date().toISOString(),
    });

    throw error;
  }
};
