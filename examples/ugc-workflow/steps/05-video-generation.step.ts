import { z } from "zod";
import { EventConfig, Handlers } from "motia";
import axios from "axios";

const VideoGenerationInputSchema = z.object({
  requestId: z.string(),
  variantId: z.number(),
  originalImageUrl: z.string(),
  generatedImageUrl: z.string(),
  variant: z.object({
    variant_id: z.number(),
    camera_angle: z.string(),
    lighting: z.string(),
    headline_seed: z.string(),
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
  name: "VideoGenerationStep",
  description: "Generate UGC videos using Veo 3 and poll for completion",
  subscribes: ["image.generated"],
  emits: ["video.generated"],
  input: VideoGenerationInputSchema,
  flows: ["ugc-generation"],
};

export const handler: Handlers["VideoGenerationStep"] = async (
  input,
  { logger, emit, state }
) => {
  const { requestId, variantId, generatedImageUrl, variant } = input;

  try {
    logger.info(`Starting video generation`, {
      requestId,
      variantId,
      imageUrl: generatedImageUrl,
    });

    // Create video prompt based on product and style
    // const videoPrompt = `A person casually presenting the ${variant.product_info.brand_name} ${variant.product_info.product} in a natural, authentic UGC style. The person speaks naturally about the product while showing it in a ${variant.camera_angle} composition with ${variant.lighting}. The scene feels genuine and unscripted, like real user-generated content for social media.`;
    const videoPrompt = `A confident person in a casual kitchen setting presenting the ${variant.product_info.brand_name} ${variant.product_info.product} package prominently toward the camera. They smile naturally while presenting the product with enthusiasm, making direct eye contact with the camera. The person gestures with the product, showing it clearly with the branding visible. Natural kitchen lighting, authentic UGC style presentation, like a friend recommending a product on social media. The person speaks passionately about why they love this product.`;

    // Submit video generation request to Veo 3
    const videoRequest = await axios.post(
      "https://queue.fal.run/fal-ai/veo3/fast/image-to-video",
      {
        prompt: videoPrompt,
        image_url: generatedImageUrl,
        aspect_ratio: "9:16",
        resolution: "1080p",
      },
      {
        headers: {
          Authorization: `Key ${process.env.FAL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { request_id, status } = videoRequest.data;

    logger.info(`Video generation queued`, {
      requestId,
      variantId,
      videoRequestId: request_id,
      status,
    });

    // Store request info for polling
    await state.set(
      `video_request_${requestId}_${variantId}`,
      "video_requests",
      {
        requestId,
        variantId,
        videoRequestId: request_id,
        generatedImageUrl,
        variant,
        submittedAt: new Date().toISOString(),
        status: "queued",
      }
    );

    // Wait and then poll for completion
    await pollVideoStatus(
      requestId,
      variantId,
      request_id,
      generatedImageUrl,
      variant,
      logger,
      emit,
      state
    );
  } catch (error: any) {
    logger.error(`Video generation failed`, {
      requestId,
      variantId,
      error: error.message,
    });

    if (error.response) {
      logger.error(`Video API Error Details`, {
        requestId,
        variantId,
        status: error.response.status,
        data: error.response.data,
      });
    }

    throw error;
  }
};

async function pollVideoStatus(
  requestId: string,
  variantId: number,
  videoRequestId: string,
  generatedImageUrl: string,
  variant: any,
  logger: any,
  emit: any,
  state: any
) {
  const maxAttempts = 20; // 10 minutes max (30s intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      // Wait before checking (first check after 30 seconds)
      await new Promise((resolve) => setTimeout(resolve, 30000));
      attempts++;

      logger.info(`Polling video status (attempt ${attempts})`, {
        requestId,
        variantId,
        videoRequestId,
      });

      // Check video status
      const statusResponse = await axios.get(
        `https://queue.fal.run/fal-ai/veo3/requests/${videoRequestId}/status`,
        {
          headers: {
            Authorization: `Key ${process.env.FAL_API_KEY}`,
          },
        }
      );

      const { status } = statusResponse.data;

      if (status === "COMPLETED") {
        // Get the completed video
        const videoResponse = await axios.get(
          `https://queue.fal.run/fal-ai/veo3/requests/${videoRequestId}`,
          {
            headers: {
              Authorization: `Key ${process.env.FAL_API_KEY}`,
            },
          }
        );

        const videoUrl = videoResponse.data.video?.url;

        if (videoUrl) {
          logger.info(`Video generation completed`, {
            requestId,
            variantId,
            videoUrl,
          });

          // Update state
          await state.set(
            `video_request_${requestId}_${variantId}`,
            "video_requests",
            {
              status: "completed",
              videoUrl,
              completedAt: new Date().toISOString(),
            }
          );

          // Emit completion event
          await emit({
            topic: "video.generated",
            data: {
              requestId,
              variantId,
              videoUrl,
              generatedImageUrl,
              variant,
              timestamp: new Date().toISOString(),
            },
          });

          return; // Success - exit polling loop
        }
      } else if (status === "FAILED") {
        logger.error(`Video generation failed`, {
          requestId,
          variantId,
          videoRequestId,
        });
        throw new Error(
          `Video generation failed for request ${videoRequestId}`
        );
      }

      // Still processing, continue polling
      logger.info(`Video still processing`, {
        requestId,
        variantId,
        status,
        attempt: attempts,
      });
    } catch (pollError: any) {
      logger.error(`Error polling video status`, {
        requestId,
        variantId,
        attempt: attempts,
        error: pollError.message,
      });

      // If it's the final attempt, throw the error
      if (attempts >= maxAttempts) {
        throw pollError;
      }

      // Otherwise continue polling
    }
  }

  // If we get here, we've exceeded max attempts
  throw new Error(`Video generation timed out after ${maxAttempts} attempts`);
}
