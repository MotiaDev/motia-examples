// src/ad-generator/analyze-brand.step.ts

import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { GeminiService } from "../services/gemini.service";

// Input schema - must match data from filter-images.step.ts
const inputSchema = z.object({
  jobId: z.string(),
  url: z.string().url(),
  type: z
    .array(z.enum(["instagram", "tiktok"]))
    .min(1)
    .max(2),
  output: z.enum(["image", "video", "both"]),
  videoProvider: z.enum(["kling", "veo", "auto"]),
  filteredImages: z.array(z.string().url()),
  screenshot: z.string().url().optional(),
});

export const config: EventConfig = {
  type: "event",
  name: "AnalyzeBrand",
  description:
    "Analyzes brand identity for advertisement creation using Gemini 3 Flash",
  subscribes: ["ad.brand.analysis.ready"],
  emits: [
    { topic: "ad.image.generation.ready", label: "Image Generation Ready" },
    { topic: "ad.video.prompt.ready", label: "Video Prompt Ready" },
  ],
  flows: ["ad-generator"],
  input: inputSchema,
};

export const handler: Handlers["AnalyzeBrand"] = async (
  input,
  { emit, logger, state }
) => {
  const {
    jobId,
    url,
    type,
    output,
    videoProvider,
    filteredImages,
    screenshot,
  } = input;

  logger.info("Starting brand analysis", { jobId, url, output });

  try {
    // Get scraped data from state
    const jobState = await state.get<{
      scraped?: {
        screenshot?: string;
        markdown?: string;
        branding?: Record<string, unknown>;
      };
    }>("ad-generator", `job_${jobId}`);

    if (!jobState || !jobState.scraped) {
      throw new Error("Scraped data not found in state");
    }

    // Call Gemini service for brand analysis
    const brandAnalysis = await GeminiService.analyzeBrand(
      url,
      screenshot || jobState.scraped.screenshot || "",
      jobState.scraped.markdown || "",
      jobState.scraped.branding || {},
      filteredImages,
      logger
    );

    // Update state with brand analysis
    await state.set("ad-generator", `job_${jobId}`, {
      ...jobState,
      brandAnalysis,
      status: "brand_analyzed",
      analyzedAt: new Date().toISOString(),
    });

    logger.info("Brand analysis completed", {
      jobId,
      brandAnalysis,
    });

    // Prepare common data
    const commonData = {
      jobId,
      url,
      type,
      brandAnalysis,
      filteredImages,
      screenshot: screenshot || jobState.scraped.screenshot,
      videoProvider,
    };

    // Branch based on output type
    if (output === "image" || output === "both") {
      logger.info("Emitting to image generation branch", { jobId });
      await emit({
        topic: "ad.image.generation.ready",
        data: commonData,
      });
    }

    if (output === "video" || output === "both") {
      logger.info("Emitting to video generation branch", { jobId });
      await emit({
        topic: "ad.video.prompt.ready",
        data: commonData,
      });
    }
  } catch (error) {
    logger.error("Brand analysis failed", {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Update state with error
    await state.set("ad-generator", `job_${jobId}`, {
      jobId,
      url,
      type,
      output,
      videoProvider,
      status: "analysis_failed",
      error: error instanceof Error ? error.message : "Unknown error",
      failedAt: new Date().toISOString(),
    });

    throw error;
  }
};
