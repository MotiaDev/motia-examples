// src/ad-generator/filter-images.step.ts

import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { GeminiService } from "../services/gemini.service";

// Input schema - must match data from scrape-landing-page.step.ts
const inputSchema = z.object({
  jobId: z.string(),
  url: z.string().url(),
  type: z
    .array(z.enum(["instagram", "tiktok"]))
    .min(1)
    .max(2),
  output: z.enum(["image", "video", "both"]),
  videoProvider: z.enum(["kling", "veo", "auto"]),
  images: z.array(z.string().url()),
  screenshot: z.string().url().optional(),
});

export const config: EventConfig = {
  type: "event",
  name: "FilterImages",
  description:
    "Filters scraped images to identify top 5 advertisement-worthy product shots using Gemini Flash, then adds hero screenshot",
  subscribes: ["ad.images.filter.ready"],
  emits: [{ topic: "ad.brand.analysis.ready", label: "Brand Analysis Ready" }],
  flows: ["ad-generator"],
  input: inputSchema,
};

export const handler: Handlers["FilterImages"] = async (
  input,
  { emit, logger, state }
) => {
  const { jobId, url, type, output, videoProvider, images, screenshot } = input;

  logger.info("Starting image filtering", {
    jobId,
    totalImages: images.length,
    output,
    videoProvider,
  });

  try {
    // Step 1: Quick URL pattern filter (removes ~80% junk)
    const quickFiltered = images.filter((img) => {
      const lower = img.toLowerCase();

      // Remove obvious non-product images
      if (
        lower.includes("articles") ||
        lower.includes("blog") ||
        lower.includes(".svg") ||
        lower.includes("icon") ||
        lower.includes("logo")
      ) {
        return false;
      }

      // Keep likely product images
      if (
        lower.includes("carousel") ||
        lower.includes("product") ||
        lower.includes("_640x640") ||
        (lower.includes(".png") && !lower.includes("article"))
      ) {
        return true;
      }

      return true; // Keep uncertain ones for AI filtering
    });

    logger.info("Quick filter completed", {
      before: images.length,
      after: quickFiltered.length,
    });

    // Step 2: AI filtering with Gemini Flash - Get TOP 5 best product images
    let productImages: string[] = [];

    if (quickFiltered.length > 0) {
      productImages = await GeminiService.filterProductImages(
        url,
        quickFiltered,
        logger
      );

      logger.info("AI filtering completed - Top 5 selected", {
        inputCount: quickFiltered.length,
        outputCount: productImages.length,
      });
    }

    // Step 3: Add hero screenshot as 6th image (if available)
    const finalImages = screenshot
      ? [...productImages, screenshot]
      : productImages;

    logger.info("Final image set prepared", {
      productImages: productImages.length,
      heroScreenshot: !!screenshot,
      totalImages: finalImages.length,
    });

    // Get current job state
    const jobState = await state.get<Record<string, unknown>>(
      "ad-generator",
      `job_${jobId}`
    );

    // Update state with filtered images
    await state.set("ad-generator", `job_${jobId}`, {
      ...(jobState ?? {}),
      filteredImages: finalImages,
      productImages,
      heroScreenshot: screenshot,
      status: "images_filtered",
      filteredAt: new Date().toISOString(),
    });

    logger.info("Image filtering completed", {
      jobId,
      finalCount: finalImages.length,
      filteredImages: finalImages,
    });

    // Emit event to trigger brand analysis
    await emit({
      topic: "ad.brand.analysis.ready",
      data: {
        jobId,
        url,
        type,
        output,
        videoProvider,
        filteredImages: finalImages,
        screenshot,
      },
    });
  } catch (error) {
    logger.error("Image filtering failed", {
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
      status: "filter_failed",
      error: error instanceof Error ? error.message : "Unknown error",
      failedAt: new Date().toISOString(),
    });

    throw error;
  }
};
