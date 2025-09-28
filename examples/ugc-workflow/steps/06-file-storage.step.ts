import { z } from "zod";
import { EventConfig, Handlers } from "motia";
import axios from "axios";
import FormData from "form-data";

const FileStorageInputSchema = z.object({
  requestId: z.string(),
  variantId: z.number(),
  videoUrl: z.string(),
  generatedImageUrl: z.string(),
  variant: z.object({
    variant_id: z.number(),
    camera_angle: z.string(),
    lighting: z.string(),
    product_info: z.object({
      brand_name: z.string(),
      product: z.string(),
      watermark: z.string(),
    }),
  }),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "FileStorageStep",
  description: "Store generated videos and images to Box storage",
  subscribes: ["video.generated"],
  emits: ["workflow.completed"],
  input: FileStorageInputSchema,
  flows: ["ugc-generation"],
};

export const handler: Handlers["FileStorageStep"] = async (
  input,
  { logger, emit, state }
) => {
  const { requestId, variantId, videoUrl, generatedImageUrl, variant } = input;
  logger.info(`File storage input`, {
    requestId,
    variantId,
    videoUrl,
    generatedImageUrl,
    variant,
  });
  const accessToken = process.env.BOX_ACCESS_TOKEN;
  const folderId = process.env.BOX_ROOT_FOLDER_ID || "0";

  if (!accessToken) {
    throw new Error("Missing BOX_ACCESS_TOKEN");
  }

  try {
    logger.info(`Starting Box storage for variant ${variantId}`, {
      requestId,
      variantId,
      videoUrl,
      imageUrl: generatedImageUrl,
    });

    const uploadedFiles = [];

    // 1. Download and upload the video
    if (videoUrl) {
      try {
        // Download video from URL
        const videoResponse = await axios.get(videoUrl, {
          responseType: "arraybuffer",
        });
        const videoBuffer = Buffer.from(videoResponse.data);

        const videoFilename =
          `${variant.product_info.brand_name}_${variant.product_info.product}_video_v${variantId}.mp4`.replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
          ); // Sanitize filename

        // Create form data for video upload
        const videoForm = new FormData();
        const videoAttributes = JSON.stringify({
          name: videoFilename,
          parent: { id: folderId },
        });

        videoForm.append("attributes", videoAttributes);
        videoForm.append("file", videoBuffer, {
          filename: videoFilename,
          contentType: "video/mp4",
        });

        // Upload video to Box
        const videoUploadResponse = await axios.post(
          "https://upload.box.com/api/2.0/files/content",
          videoForm,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              ...videoForm.getHeaders(),
            },
          }
        );

        const videoFileInfo = videoUploadResponse.data.entries[0];
        uploadedFiles.push({
          type: "video",
          boxFileId: videoFileInfo.id,
          filename: videoFilename,
          boxUrl: `https://app.box.com/file/${videoFileInfo.id}`,
          originalUrl: videoUrl,
        });

        logger.info(`Video uploaded to Box`, {
          requestId,
          variantId,
          filename: videoFilename,
          boxFileId: videoFileInfo.id,
        });
      } catch (videoError: any) {
        logger.error(`Failed to upload video`, {
          requestId,
          variantId,
          error: videoError.message,
        });
      }
    }

    // 2. Download and upload the generated image
    if (generatedImageUrl) {
      try {
        // Download image from URL
        const imageResponse = await axios.get(generatedImageUrl, {
          responseType: "arraybuffer",
        });
        const imageBuffer = Buffer.from(imageResponse.data);

        const imageFilename =
          `${variant.product_info.brand_name}_${variant.product_info.product}_image_v${variantId}.jpg`.replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
          ); // Sanitize filename

        // Create form data for image upload
        const imageForm = new FormData();
        const imageAttributes = JSON.stringify({
          name: imageFilename,
          parent: { id: folderId },
        });

        imageForm.append("attributes", imageAttributes);
        imageForm.append("file", imageBuffer, {
          filename: imageFilename,
          contentType: "image/jpeg",
        });

        // Upload image to Box
        const imageUploadResponse = await axios.post(
          "https://upload.box.com/api/2.0/files/content",
          imageForm,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              ...imageForm.getHeaders(),
            },
          }
        );

        const imageFileInfo = imageUploadResponse.data.entries[0];
        uploadedFiles.push({
          type: "image",
          boxFileId: imageFileInfo.id,
          filename: imageFilename,
          boxUrl: `https://app.box.com/file/${imageFileInfo.id}`,
          originalUrl: generatedImageUrl,
        });

        logger.info(`Image uploaded to Box`, {
          requestId,
          variantId,
          filename: imageFilename,
          boxFileId: imageFileInfo.id,
        });
      } catch (imageError: any) {
        logger.error(`Failed to upload image`, {
          requestId,
          variantId,
          error: imageError.message,
        });
      }
    }

    // 3. Update workflow state
    await state.set(
      `workflow_${requestId}_${variantId}`,
      "completed_workflows",
      {
        requestId,
        variantId,
        status: "completed",
        uploadedFiles,
        variant: variant,
        completedAt: new Date().toISOString(),
      }
    );

    // 4. Emit completion event
    await (emit as any)({
      topic: "workflow.completed",
      data: {
        requestId,
        variantId,
        status: "completed",
        uploadedFiles,
        variant,
        summary: {
          brand: variant.product_info.brand_name,
          product: variant.product_info.product,
          camera: variant.camera_angle,
          lighting: variant.lighting,
          filesStored: uploadedFiles.length,
        },
        timestamp: new Date().toISOString(),
      },
    });

    logger.info(`Workflow completed for variant ${variantId}`, {
      requestId,
      variantId,
      filesUploaded: uploadedFiles.length,
    });
  } catch (error: any) {
    logger.error(`File storage failed`, {
      requestId,
      variantId,
      error: error.message,
    });
    throw error;
  }
};
