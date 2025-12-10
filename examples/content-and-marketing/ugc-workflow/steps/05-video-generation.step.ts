import { z } from "zod";
import { EventConfig, Handlers } from "motia";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { GoogleAuth } from "google-auth-library";

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

// Generate dynamic dialogue using AI
async function generateDialogue(
  brandName: string,
  productName: string
): Promise<string> {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Generate a short, authentic, enthusiastic UGC-style product testimonial (2-3 sentences max, 8 seconds spoken). Sound like a friend recommending a product on Instagram. Return only the quoted dialogue.",
          },
          {
            role: "user",
            content: `Create dialogue for ${brandName} ${productName}`,
          },
        ],
        temperature: 0.8,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    // Fallback
    return `"Oh my god, you HAVE to try this! The ${brandName} ${productName} has been a total game changer. Trust me on this!"`;
  }
}

export const config: EventConfig = {
  type: "event",
  name: "VideoGenerationStep",
  description:
    "Generate UGC videos using Google Vertex AI Veo 3.1 with native audio",
  subscribes: ["image.generated"],
  emits: ["video.generated"],
  input: VideoGenerationInputSchema,
  flows: ["ugc-generation"],
};

// Configuration for Vertex AI
const PROJECT_ID = process.env.VERTEX_PROJECT_ID;
const MODEL_ID = "veo-3.1-generate-preview"; // Updated to Veo 3.1
const LOCATION = "us-central1";

// Helper function to get fresh access token using Application Default Credentials
async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();

  const accessToken = await client.getAccessToken();

  if (!accessToken.token) {
    throw new Error(
      "Failed to get access token. Make sure you've run: gcloud auth application-default login"
    );
  }

  return accessToken.token;
}

// Helper function to convert image URL to Base64
async function imageUrlToBase64(imageUrl: string): Promise<string> {
  const response = await axios.get(imageUrl, {
    responseType: "arraybuffer",
  });
  return Buffer.from(response.data).toString("base64");
}

// Types for Vertex AI Veo 3.1
interface VideoGenerationPayload {
  instances: Array<{
    prompt: string;
    image: {
      bytesBase64Encoded: string;
      mimeType: string;
    };
    negativePrompt?: string;
  }>;
  parameters: {
    sampleCount: number;
    aspectRatio: string;
    resolution: string;
    durationSeconds: number;
    personGeneration: string;
    seed?: number;
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
    logger.info(`Starting Veo 3.1 video generation with native audio`, {
      requestId,
      variantId,
      imageUrl: generatedImageUrl,
    });

    const dialogue = await generateDialogue(
      variant.product_info.brand_name,
      variant.product_info.product
    );

    logger.info(`Generated dialogue: ${dialogue}`);

    // Create UGC marketing video prompt following official Veo 3.1 prompt guide
    const videoPrompt = `SUBJECT: A confident woman in her late twenties in a casual modern kitchen, holding ${variant.product_info.brand_name} ${variant.product_info.product} package at eye level.

ACTION: She presents the product enthusiastically to camera, smiling warmly while speaking. She brings the product closer (0-3s), rotates it to show branding (3-5s), then gestures naturally with excitement while holding it at chest level (5-8s).

STYLE: Authentic UGC aesthetic, natural and unpolished, like a friend's Instagram story recommendation.

CAMERA POSITIONING AND MOTION: Eye-level handheld phone shot, 9:16 vertical format, subtle natural shake throughout. Slow push-in from medium shot to medium-close-up over first 5 seconds. Shallow focus with soft background blur.

COMPOSITION: Wide shot framing with person positioned slightly off-center following rule of thirds. Product remains hero element, always sharp and in frame. Kitchen background visible but softly blurred.

FOCUS AND LENS EFFECTS: Shallow focus on subject and product creating cinematic depth of field, soft focus on background, natural bokeh effect.

AMBIANCE: Warm tones with blue tones for depth, cozy morning light creating inviting atmosphere, natural home environment.

DIALOGUE: ${dialogue}

SOUND EFFECTS (SFX): Soft product handling sounds, gentle package rustling when rotating product.

AMBIENT NOISE: Quiet kitchen sounds, faint refrigerator hum, peaceful home atmosphere, soft morning ambiance.

BRANDING: ${variant.product_info.brand_name} ${variant.product_info.product} packaging clearly visible and legible throughout entire 8 seconds, brand colors accurate, logo sharp and readable, never obscured.`;

    // Negative prompt to avoid unwanted elements
    const negativePrompt = `cartoon style, animated, drawing, artificial staging, commercial studio look, harsh lighting, multiple products, cluttered background, professional actor appearance, scripted performance, logo text alterations, brand color changes, overly polished production, no people off-camera, no children, no background music`;

    // Convert image URL to Base64
    logger.info(`Converting image to Base64`, { requestId, variantId });
    const base64Image = await imageUrlToBase64(generatedImageUrl);

    // Get access token
    const accessToken = await getAccessToken();

    // Submit video generation request to Vertex AI Veo 3.1
    const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predictLongRunning`;

    const payload: VideoGenerationPayload = {
      instances: [
        {
          prompt: videoPrompt,
          image: {
            bytesBase64Encoded: base64Image,
            mimeType: "image/jpeg",
          },
          negativePrompt: negativePrompt,
        },
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: "9:16", // Vertical TikTok/Reels format
        resolution: "1080p", // High quality output
        durationSeconds: 8, // Veo 3.1 supports 4, 6, or 8 seconds (use 8 when using referenceImages)
        personGeneration: "allow_adult", // Only allow adult generation for UGC creators
        // seed: 12345, // Optional: Uncomment for deterministic outputs
      },
    };

    logger.info(`Submitting Veo 3.1 request with cinema-quality prompt`, {
      requestId,
      variantId,
      promptLength: videoPrompt.length,
      aspectRatio: "9:16",
      resolution: "1080p",
      duration: "8s",
    });

    const videoRequest = await axios.post<GenerateVideoResponse>(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const operationName = videoRequest.data.name;

    logger.info(`Veo 3.1 video generation queued with native audio`, {
      requestId,
      variantId,
      operationName,
      features: [
        "native_audio",
        "synchronized_dialogue",
        "ambient_sounds",
        "sfx",
      ],
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
        model: "veo-3.1-generate-preview",
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
    logger.error(`Veo 3.1 video generation failed`, {
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
  const maxAttempts = 30; // Increased for longer videos with audio generation
  let attempts = 0;

  const pollUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:fetchPredictOperation`;

  while (attempts < maxAttempts) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 20000)); // 20 seconds between polls
      attempts++;

      logger.info(
        `Polling Veo 3.1 status (attempt ${attempts}/${maxAttempts})`,
        {
          requestId,
          variantId,
        }
      );

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
        logger.error(`Veo 3.1 video generation failed`, {
          requestId,
          variantId,
          error: error.message,
        });
        throw new Error(`Video generation failed: ${error.message}`);
      }

      if (done && response?.videos?.[0]?.bytesBase64Encoded) {
        const videoBase64 = response.videos[0].bytesBase64Encoded;

        logger.info(`Veo 3.1 video generation completed with audio`, {
          requestId,
          variantId,
          videoSizeKB: Math.round(videoBase64.length / 1024),
          features: "native_audio_included",
        });

        // Convert Base64 to MP4 file
        const videoBuffer = Buffer.from(videoBase64, "base64");
        const videoFilename = `${variant.product_info.brand_name}_${
          variant.product_info.product
        }_v${variantId}_veo31_${Date.now()}.mp4`.replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );
        const videoPath = path.join(process.cwd(), videoFilename);

        fs.writeFileSync(videoPath, videoBuffer);

        logger.info(`Video with native audio saved to file`, {
          requestId,
          variantId,
          videoPath,
          videoSizeMB: (videoBuffer.length / 1024 / 1024).toFixed(2),
          model: "veo-3.1-generate-preview",
        });

        await state.set(
          `video_request_${requestId}_${variantId}`,
          "video_requests",
          {
            status: "completed",
            videoPath,
            completedAt: new Date().toISOString(),
            model: "veo-3.1-generate-preview",
            features: ["native_audio", "1080p", "9:16_vertical"],
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
            model: "veo-3.1-generate-preview",
          },
        });

        return;
      }

      logger.info(
        `Veo 3.1 video still processing (audio generation takes longer)`,
        {
          requestId,
          variantId,
          attempt: attempts,
          estimatedTimeRemaining: `${(maxAttempts - attempts) * 20}s`,
        }
      );
    } catch (pollError: any) {
      logger.error(`Error polling Veo 3.1 status`, {
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
    `Veo 3.1 video generation timed out after ${maxAttempts} attempts (${
      maxAttempts * 20
    } seconds)`
  );
}
