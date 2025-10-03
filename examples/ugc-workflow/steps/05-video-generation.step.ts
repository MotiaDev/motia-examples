// import { z } from "zod";
// import { EventConfig, Handlers } from "motia";
// import axios from "axios";

// const VideoGenerationInputSchema = z.object({
//   requestId: z.string(),
//   variantId: z.number(),
//   originalImageUrl: z.string(),
//   generatedImageUrl: z.string(),
//   variant: z.object({
//     variant_id: z.number(),
//     camera_angle: z.string(),
//     lighting: z.string(),
//     headline_seed: z.string(),
//     product_info: z.object({
//       brand_name: z.string(),
//       product: z.string(),
//       watermark: z.string(),
//     }),
//   }),
//   timestamp: z.string(),
// });

// export const config: EventConfig = {
//   type: "event",
//   name: "VideoGenerationStep",
//   description: "Generate UGC videos using Veo 3 and poll for completion",
//   subscribes: ["image.generated"],
//   emits: ["video.generated"],
//   input: VideoGenerationInputSchema,
//   flows: ["ugc-generation"],
// };

// export const handler: Handlers["VideoGenerationStep"] = async (
//   input,
//   { logger, emit, state }
// ) => {
//   const { requestId, variantId, generatedImageUrl, variant } = input;

//   try {
//     logger.info(`Starting video generation`, {
//       requestId,
//       variantId,
//       imageUrl: generatedImageUrl,
//     });

//     // Create video prompt based on product and style
//     // const videoPrompt = `A person casually presenting the ${variant.product_info.brand_name} ${variant.product_info.product} in a natural, authentic UGC style. The person speaks naturally about the product while showing it in a ${variant.camera_angle} composition with ${variant.lighting}. The scene feels genuine and unscripted, like real user-generated content for social media.`;
//     const videoPrompt = `A confident person in a casual kitchen setting presenting the ${variant.product_info.brand_name} ${variant.product_info.product} package prominently toward the camera. They smile naturally while presenting the product with enthusiasm, making direct eye contact with the camera. The person gestures with the product, showing it clearly with the branding visible. Natural kitchen lighting, authentic UGC style presentation, like a friend recommending a product on social media. The person speaks passionately about why they love this product.`;

//     // Submit video generation request to Veo 3
//     const videoRequest = await axios.post(
//       "https://queue.fal.run/fal-ai/veo3/fast/image-to-video",
//       {
//         prompt: videoPrompt,
//         image_url: generatedImageUrl,
//         aspect_ratio: "9:16",
//         resolution: "1080p",
//       },
//       {
//         headers: {
//           Authorization: `Key ${process.env.FAL_API_KEY}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const { request_id, status } = videoRequest.data;

//     logger.info(`Video generation queued`, {
//       requestId,
//       variantId,
//       videoRequestId: request_id,
//       status,
//     });

//     // Store request info for polling
//     await state.set(
//       `video_request_${requestId}_${variantId}`,
//       "video_requests",
//       {
//         requestId,
//         variantId,
//         videoRequestId: request_id,
//         generatedImageUrl,
//         variant,
//         submittedAt: new Date().toISOString(),
//         status: "queued",
//       }
//     );

//     // Wait and then poll for completion
//     await pollVideoStatus(
//       requestId,
//       variantId,
//       request_id,
//       generatedImageUrl,
//       variant,
//       logger,
//       emit,
//       state
//     );
//   } catch (error: any) {
//     logger.error(`Video generation failed`, {
//       requestId,
//       variantId,
//       error: error.message,
//     });

//     if (error.response) {
//       logger.error(`Video API Error Details`, {
//         requestId,
//         variantId,
//         status: error.response.status,
//         data: error.response.data,
//       });
//     }

//     throw error;
//   }
// };

// async function pollVideoStatus(
//   requestId: string,
//   variantId: number,
//   videoRequestId: string,
//   generatedImageUrl: string,
//   variant: any,
//   logger: any,
//   emit: any,
//   state: any
// ) {
//   const maxAttempts = 20; // 10 minutes max (30s intervals)
//   let attempts = 0;

//   while (attempts < maxAttempts) {
//     try {
//       // Wait before checking (first check after 30 seconds)
//       await new Promise((resolve) => setTimeout(resolve, 30000));
//       attempts++;

//       logger.info(`Polling video status (attempt ${attempts})`, {
//         requestId,
//         variantId,
//         videoRequestId,
//       });

//       // Check video status
//       const statusResponse = await axios.get(
//         `https://queue.fal.run/fal-ai/veo3/requests/${videoRequestId}/status`,
//         {
//           headers: {
//             Authorization: `Key ${process.env.FAL_API_KEY}`,
//           },
//         }
//       );

//       const { status } = statusResponse.data;

//       if (status === "COMPLETED") {
//         // Get the completed video
//         const videoResponse = await axios.get(
//           `https://queue.fal.run/fal-ai/veo3/requests/${videoRequestId}`,
//           {
//             headers: {
//               Authorization: `Key ${process.env.FAL_API_KEY}`,
//             },
//           }
//         );

//         const videoUrl = videoResponse.data.video?.url;

//         if (videoUrl) {
//           logger.info(`Video generation completed`, {
//             requestId,
//             variantId,
//             videoUrl,
//           });

//           // Update state
//           await state.set(
//             `video_request_${requestId}_${variantId}`,
//             "video_requests",
//             {
//               status: "completed",
//               videoUrl,
//               completedAt: new Date().toISOString(),
//             }
//           );

//           // Emit completion event
//           await emit({
//             topic: "video.generated",
//             data: {
//               requestId,
//               variantId,
//               videoUrl,
//               generatedImageUrl,
//               variant,
//               timestamp: new Date().toISOString(),
//             },
//           });

//           return; // Success - exit polling loop
//         }
//       } else if (status === "FAILED") {
//         logger.error(`Video generation failed`, {
//           requestId,
//           variantId,
//           videoRequestId,
//         });
//         throw new Error(
//           `Video generation failed for request ${videoRequestId}`
//         );
//       }

//       // Still processing, continue polling
//       logger.info(`Video still processing`, {
//         requestId,
//         variantId,
//         status,
//         attempt: attempts,
//       });
//     } catch (pollError: any) {
//       logger.error(`Error polling video status`, {
//         requestId,
//         variantId,
//         attempt: attempts,
//         error: pollError.message,
//       });

//       // If it's the final attempt, throw the error
//       if (attempts >= maxAttempts) {
//         throw pollError;
//       }

//       // Otherwise continue polling
//     }
//   }

//   // If we get here, we've exceeded max attempts
//   throw new Error(`Video generation timed out after ${maxAttempts} attempts`);
// }

import { z } from "zod";
import { EventConfig, Handlers } from "motia";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

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
  description: "Generate UGC videos using Google Vertex AI Veo 3",
  subscribes: ["image.generated"],
  emits: ["video.generated"],
  input: VideoGenerationInputSchema,
  flows: ["ugc-generation"],
};

// Configuration for Vertex AI
const PROJECT_ID = process.env.VERTEX_PROJECT_ID || "taofiq-veo3-test";
const MODEL_ID = "veo-3.0-generate-001";
const LOCATION = "us-central1";

// Helper function to get fresh access token
async function getAccessToken(): Promise<string> {
  if (process.env.VERTEX_ACCESS_TOKEN) {
    return process.env.VERTEX_ACCESS_TOKEN;
  }
  throw new Error(
    "VERTEX_ACCESS_TOKEN environment variable not set. Get token with: gcloud auth print-access-token"
  );
}

// Helper function to convert image URL to Base64
async function imageUrlToBase64(imageUrl: string): Promise<string> {
  const response = await axios.get(imageUrl, {
    responseType: "arraybuffer",
  });
  return Buffer.from(response.data).toString("base64");
}

// Types for Vertex AI
interface VideoGenerationPayload {
  instances: Array<{
    prompt: string;
    image: {
      bytesBase64Encoded: string;
      mimeType: string;
    };
  }>;
  parameters: {
    sampleCount: number;
    aspectRatio: string;
    resolution: string;
  };
}

interface GenerateVideoResponse {
  name: string;
}

interface Video {
  bytesBase64Encoded: string;
  gcsUri?: string;
  mimeType: string;
}

interface OperationResponse {
  name: string;
  done: boolean;
  response?: {
    "@type": string;
    raiMediaFilteredCount: number;
    videos: Video[];
  };
  error?: {
    code: number;
    message: string;
    details?: any[];
  };
}

export const handler: Handlers["VideoGenerationStep"] = async (
  input,
  { logger, emit, state }
) => {
  const { requestId, variantId, generatedImageUrl, variant } = input;

  try {
    logger.info(`Starting Veo 3 video generation`, {
      requestId,
      variantId,
      imageUrl: generatedImageUrl,
    });

    // Create video prompt
    const videoPrompt = `A confident person in a casual kitchen setting presenting the ${variant.product_info.brand_name} ${variant.product_info.product} package prominently toward the camera. They smile naturally while presenting the product with enthusiasm, making direct eye contact with the camera. The person gestures with the product, showing it clearly with the branding visible. Natural kitchen lighting, authentic UGC style presentation, like a friend recommending a product on social media. The person speaks passionately about why they love this product.`;

    // Convert image URL to Base64
    logger.info(`Converting image to Base64`, { requestId, variantId });
    const base64Image = await imageUrlToBase64(generatedImageUrl);

    // Get access token
    const accessToken = await getAccessToken();

    // Submit video generation request to Vertex AI Veo 3
    const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predictLongRunning`;

    const payload: VideoGenerationPayload = {
      instances: [
        {
          prompt: videoPrompt,
          image: {
            bytesBase64Encoded: base64Image,
            mimeType: "image/jpeg",
          },
        },
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: "9:16",
        resolution: "1080p",
      },
    };

    const videoRequest = await axios.post<GenerateVideoResponse>(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const operationName = videoRequest.data.name;

    logger.info(`Veo 3 video generation queued`, {
      requestId,
      variantId,
      operationName,
    });

    // Store request info
    await state.set(
      `video_request_${requestId}_${variantId}`,
      "video_requests",
      {
        requestId,
        variantId,
        operationName,
        generatedImageUrl,
        variant,
        submittedAt: new Date().toISOString(),
        status: "queued",
      }
    );

    // Poll for completion
    await pollVeo3Status(
      requestId,
      variantId,
      operationName,
      generatedImageUrl,
      variant,
      logger,
      emit,
      state
    );
  } catch (error: any) {
    logger.error(`Veo 3 video generation failed`, {
      requestId,
      variantId,
      error: error.message,
    });

    if (error.response) {
      logger.error(`Vertex AI Error Details`, {
        requestId,
        variantId,
        status: error.response.status,
        data: error.response.data,
      });
    }

    throw error;
  }
};

async function pollVeo3Status(
  requestId: string,
  variantId: number,
  operationName: string,
  generatedImageUrl: string,
  variant: any,
  logger: any,
  emit: any,
  state: any
) {
  const maxAttempts = 20;
  let attempts = 0;

  const pollUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:fetchPredictOperation`;

  while (attempts < maxAttempts) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 15000));
      attempts++;

      logger.info(`Polling Veo 3 status (attempt ${attempts})`, {
        requestId,
        variantId,
      });

      const accessToken = await getAccessToken();

      const statusResponse = await axios.post<OperationResponse>(
        pollUrl,
        {
          operationName: operationName,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const { done, response, error } = statusResponse.data;

      if (error) {
        logger.error(`Veo 3 video generation failed`, {
          requestId,
          variantId,
          error: error.message,
        });
        throw new Error(`Video generation failed: ${error.message}`);
      }

      if (done && response?.videos?.[0]?.bytesBase64Encoded) {
        const videoBase64 = response.videos[0].bytesBase64Encoded;

        logger.info(`Veo 3 video generation completed`, {
          requestId,
          variantId,
          videoSizeKB: Math.round(videoBase64.length / 1024),
        });

        // Convert Base64 to MP4 file
        const videoBuffer = Buffer.from(videoBase64, "base64");
        const videoFilename = `${variant.product_info.brand_name}_${
          variant.product_info.product
        }_v${variantId}_${Date.now()}.mp4`.replace(/[^a-zA-Z0-9_-]/g, "_");
        const videoPath = path.join(process.cwd(), videoFilename);

        fs.writeFileSync(videoPath, videoBuffer);

        logger.info(`Video saved to file`, {
          requestId,
          variantId,
          videoPath,
          videoSizeMB: (videoBuffer.length / 1024 / 1024).toFixed(2),
        });

        await state.set(
          `video_request_${requestId}_${variantId}`,
          "video_requests",
          {
            status: "completed",
            videoPath,
            completedAt: new Date().toISOString(),
          }
        );

        await emit({
          topic: "video.generated",
          data: {
            requestId,
            variantId,
            videoPath,
            generatedImageUrl,
            variant,
            timestamp: new Date().toISOString(),
          },
        });

        return;
      }

      logger.info(`Veo 3 video still processing`, {
        requestId,
        variantId,
        attempt: attempts,
      });
    } catch (pollError: any) {
      logger.error(`Error polling Veo 3 status`, {
        requestId,
        variantId,
        attempt: attempts,
        error: pollError.message,
      });

      if (attempts >= maxAttempts) {
        throw pollError;
      }
    }
  }

  throw new Error(
    `Veo 3 video generation timed out after ${maxAttempts} attempts`
  );
}
