// src/ad-generator/aggregate-results.step.ts

import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import axios from "axios";
import FormData from "form-data";
import * as fs from "fs";
import * as path from "path";

const inputSchema = z.object({
  jobId: z.string(),
  url: z.string().url(),
  type: z
    .array(z.enum(["instagram", "tiktok"]))
    .min(1)
    .max(2),
  // Image completion data
  imagePath: z.string().optional(),
  adFormat: z.string().optional(),
  // Video completion data
  videoPath: z.string().optional(),
  provider: z.enum(["kling", "veo"]).optional(),
  duration: z.number().optional(),
  adType: z.enum(["instagram", "tiktok"]).optional(),
  // Common
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
});

export const config: EventConfig = {
  type: "event",
  name: "AggregateResults",
  description:
    "Aggregates completed outputs, uploads to ImageKit, and tracks final completion",
  subscribes: ["ad.image.completed", "ad.video.completed"],
  emits: [
    { topic: "ad.generation.fully.completed", label: "All Outputs Completed" },
  ],
  flows: ["ad-generator"],
  input: inputSchema,
};

// Helper function to upload file to ImageKit using Basic Auth (private_key:password)
async function uploadToImageKit(
  filePath: string,
  fileName: string,
  folder: string,
  logger: any
): Promise<{ url: string; fileId: string; thumbnailUrl?: string }> {
  const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
  const IMAGEKIT_PASSWORD = process.env.IMAGEKIT_PASSWORD;

  if (!IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_PASSWORD) {
    throw new Error("IMAGEKIT_PRIVATE_KEY and IMAGEKIT_PASSWORD must be set");
  }

  try {
    logger.info("Uploading to ImageKit", { filePath, fileName, folder });

    const fileBuffer = fs.readFileSync(filePath);

    // Create form data
    const form = new FormData();
    form.append("file", fileBuffer, fileName);
    form.append("fileName", fileName);
    form.append("folder", folder);
    form.append("useUniqueFileName", "true");
    form.append("tags", "ad-generator,motia");

    // Upload using Basic Auth (private_key:password)
    const uploadResponse = await axios.post(
      "https://upload.imagekit.io/api/v1/files/upload",
      form,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${IMAGEKIT_PRIVATE_KEY}:${IMAGEKIT_PASSWORD}`
          ).toString("base64")}`,
          ...form.getHeaders(),
        },
      }
    );

    logger.info("ImageKit upload successful", {
      fileName,
      url: uploadResponse.data.url,
      fileId: uploadResponse.data.fileId,
    });

    return {
      url: uploadResponse.data.url,
      fileId: uploadResponse.data.fileId,
      thumbnailUrl: uploadResponse.data.thumbnailUrl,
    };
  } catch (error: any) {
    logger.error("ImageKit upload failed", {
      fileName,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

export const handler: Handlers["AggregateResults"] = async (
  input,
  { emit, logger, state }
) => {
  const {
    jobId,
    url,
    type,
    imagePath,
    adFormat,
    videoPath,
    provider,
    duration,
    adType,
    brandAnalysis,
  } = input;

  logger.info("Aggregating results", {
    jobId,
    hasImage: !!imagePath,
    hasVideo: !!videoPath,
  });

  try {
    // Get current job state to determine what was requested
    const jobState = await state.get<any>("ad-generator", `job_${jobId}`);

    if (!jobState) {
      throw new Error("Job state not found");
    }

    const requestedOutput = jobState.output; // 'image' | 'video' | 'both'

    // Initialize outputs tracking
    if (!jobState.completedOutputs) {
      jobState.completedOutputs = {
        image: { completed: false },
        video: { completed: false },
      };
    }

    // Process image completion
    if (
      imagePath &&
      (requestedOutput === "image" || requestedOutput === "both")
    ) {
      logger.info("Processing image completion", { jobId, imagePath });

      // Upload to ImageKit
      const fileName = path.basename(imagePath);
      const folder = `/ad-generator/${brandAnalysis.brandName.replace(
        /[^a-zA-Z0-9-]/g,
        "_"
      )}`;

      const imageKitResult = await uploadToImageKit(
        imagePath,
        fileName,
        folder,
        logger
      );

      // Update state with ImageKit URL
      jobState.completedOutputs.image = {
        completed: true,
        localPath: imagePath,
        imageKitUrl: imageKitResult.url,
        imageKitFileId: imageKitResult.fileId,
        thumbnailUrl: imageKitResult.thumbnailUrl,
        adFormat,
        completedAt: new Date().toISOString(),
      };

      logger.info("Image output completed and uploaded", {
        jobId,
        imageKitUrl: imageKitResult.url,
      });
    }

    // Process video completion
    if (
      videoPath &&
      (requestedOutput === "video" || requestedOutput === "both")
    ) {
      logger.info("Processing video completion", { jobId, videoPath });

      // Upload to ImageKit
      const fileName = path.basename(videoPath);
      const folder = `/ad-generator/${brandAnalysis.brandName.replace(
        /[^a-zA-Z0-9-]/g,
        "_"
      )}`;

      const imageKitResult = await uploadToImageKit(
        videoPath,
        fileName,
        folder,
        logger
      );

      // Update state with ImageKit URL
      jobState.completedOutputs.video = {
        completed: true,
        localPath: videoPath,
        imageKitUrl: imageKitResult.url,
        imageKitFileId: imageKitResult.fileId,
        thumbnailUrl: imageKitResult.thumbnailUrl,
        provider,
        duration,
        adType,
        completedAt: new Date().toISOString(),
      };

      logger.info("Video output completed and uploaded", {
        jobId,
        imageKitUrl: imageKitResult.url,
        provider,
      });
    }

    // Update state
    await state.set("ad-generator", `job_${jobId}`, {
      ...jobState,
      status: "processing",
      lastUpdated: new Date().toISOString(),
    });

    // Check if all requested outputs are complete
    const allCompleted =
      (requestedOutput === "image" &&
        jobState.completedOutputs.image.completed) ||
      (requestedOutput === "video" &&
        jobState.completedOutputs.video.completed) ||
      (requestedOutput === "both" &&
        jobState.completedOutputs.image.completed &&
        jobState.completedOutputs.video.completed);

    if (allCompleted) {
      logger.info("All requested outputs completed", {
        jobId,
        requestedOutput,
        completedOutputs: jobState.completedOutputs,
      });

      // Update final state
      await state.set("ad-generator", `job_${jobId}`, {
        ...jobState,
        status: "fully_completed",
        fullyCompletedAt: new Date().toISOString(),
      });

      // Prepare final response
      const finalOutputs: any = {};

      if (jobState.completedOutputs.image.completed) {
        finalOutputs.image = {
          imageKitUrl: jobState.completedOutputs.image.imageKitUrl,
          fileId: jobState.completedOutputs.image.imageKitFileId,
          thumbnailUrl: jobState.completedOutputs.image.thumbnailUrl,
          adFormat: jobState.completedOutputs.image.adFormat,
        };
      }

      if (jobState.completedOutputs.video.completed) {
        finalOutputs.video = {
          imageKitUrl: jobState.completedOutputs.video.imageKitUrl,
          fileId: jobState.completedOutputs.video.imageKitFileId,
          thumbnailUrl: jobState.completedOutputs.video.thumbnailUrl,
          provider: jobState.completedOutputs.video.provider,
          duration: jobState.completedOutputs.video.duration,
          adType: jobState.completedOutputs.video.adType,
        };
      }

      // Emit final completion event emit as any
      await (emit as any)({
        topic: "ad.generation.fully.completed",
        data: {
          jobId,
          url,
          brandName: brandAnalysis.brandName,
          requestedOutput,
          outputs: finalOutputs,
          brandAnalysis,
          completedAt: new Date().toISOString(),
        },
      });

      logger.info("Final completion event emitted", {
        jobId,
        outputs: Object.keys(finalOutputs),
      });
    } else {
      logger.info("Waiting for remaining outputs", {
        jobId,
        requestedOutput,
        imageCompleted: jobState.completedOutputs.image.completed,
        videoCompleted: jobState.completedOutputs.video.completed,
      });
    }
  } catch (error) {
    logger.error("Aggregation failed", {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });

    await state.set("ad-generator", `job_${jobId}`, {
      jobId,
      url,
      type,
      status: "aggregation_failed",
      error: error instanceof Error ? error.message : "Unknown error",
      failedAt: new Date().toISOString(),
    });

    throw error;
  }
};
