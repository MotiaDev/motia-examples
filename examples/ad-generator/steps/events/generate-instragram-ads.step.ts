import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { generateMultipleImages } from "../services/nanobanana.service";
import { uploadFromUrl } from "../services/imagekit.service";

export const config: EventConfig = {
  type: "event",
  name: "GenerateInstagramAds",
  description: "Generate Instagram ad images using Nano Banana Pro",
  subscribes: ["brand.analyzed"],
  emits: ["instagram.ads.generated", "instagram.ads.generation.failed"],
  input: z.object({
    jobId: z.string().uuid(),
    url: z.string().url(),
    brandName: z.string(),
    industry: z.string(),
    tone: z.string(),
    targetAudience: z.string(),
    primaryColors: z.array(z.string()),
    aesthetic: z.string(),
    valueProposition: z.string(),
    adPrompt: z.string(),
    options: z.object({
      instagram: z
        .object({
          enabled: z.boolean(),
          count: z.number().min(1).max(10),
        })
        .optional(),
      tiktok: z
        .object({
          enabled: z.boolean(),
          count: z.number().min(1).max(5),
          mode: z.enum([
            "text-to-video",
            "reference-images",
            "interpolation",
            "extension",
          ]),
        })
        .optional(),
    }),
    analyzedAt: z.string().datetime(),
  }),
  flows: ["ad-generation"],
};

export const handler: Handlers["GenerateInstagramAds"] = async (
  input,
  { state, emit, logger }
) => {
  const { jobId, url, brandName, adPrompt, options } = input;

  if (!options.instagram?.enabled) {
    logger.info("Instagram ad generation skipped", { jobId });
    return;
  }

  const count = options.instagram.count;

  logger.info("Starting Instagram ad generation", {
    jobId,
    brand: brandName,
    count,
  });

  try {
    // Generate images with Nano Banana Pro
    const generatedImages = await generateMultipleImages(
      {
        prompt: adPrompt,
        aspectRatio: "1:1", // Instagram optimized
        imageSize: "1K",
      },
      count
    );

    if (generatedImages.length === 0) {
      throw new Error("No images generated");
    }

    logger.info("Images generated, uploading to ImageKit", {
      jobId,
      generatedCount: generatedImages.length,
    });

    // Upload all images to ImageKit
    const uploadedImages = [];

    for (let i = 0; i < generatedImages.length; i++) {
      const image = generatedImages[i];

      try {
        const uploadResult = await uploadFromUrl(
          image.base64Data,
          `instagram-ad-${jobId}-${i + 1}.png`,
          "/generated-ads/instagram"
        );

        uploadedImages.push({
          index: i + 1,
          url: uploadResult.url,
          thumbnailUrl: uploadResult.thumbnailUrl,
          fileId: uploadResult.fileId,
          width: uploadResult.width,
          height: uploadResult.height,
          size: uploadResult.size,
        });

        logger.info(`Image ${i + 1}/${generatedImages.length} uploaded`, {
          jobId,
          url: uploadResult.url,
        });
      } catch (uploadError: any) {
        logger.error(`Failed to upload image ${i + 1}`, {
          jobId,
          error: uploadError.message,
        });
      }
    }

    if (uploadedImages.length === 0) {
      throw new Error("Failed to upload any images");
    }

    const result = {
      jobId,
      url,
      platform: "instagram",
      brand: brandName,
      images: uploadedImages,
      prompt: adPrompt,
      generatedAt: new Date().toISOString(),
      count: uploadedImages.length,
    };

    await state.set("generated-ads", `${jobId}-instagram`, result);

    await emit({
      topic: "instagram.ads.generated",
      data: result,
    });

    logger.info("Instagram ads generated successfully", {
      jobId,
      brand: brandName,
      imagesGenerated: uploadedImages.length,
    });
  } catch (error: any) {
    logger.error("Instagram ad generation failed", {
      error: error.message,
      stack: error.stack,
      jobId,
      url,
    });

    const errorResult = {
      jobId,
      url,
      platform: "instagram",
      error: error.message,
      failedAt: new Date().toISOString(),
    };

    await state.set("generated-ads", `${jobId}-instagram`, errorResult);

    await emit({
      topic: "instagram.ads.generation.failed",
      data: errorResult,
    });

    throw error;
  }
};
