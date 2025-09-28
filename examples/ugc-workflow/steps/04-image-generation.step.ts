import { z } from "zod";
import { EventConfig, Handlers } from "motia";
import axios from "axios";

const ImageGenerationInputSchema = z.object({
  requestId: z.string(),
  originalImageUrl: z.string(),
  variant: z.object({
    variant_id: z.number(),
    image_prompt: z.string(),
    aspect_ratio: z.string(),
    camera_angle: z.string(),
    lighting: z.string(),
    headline_seed: z.string(),
    render_preferences: z.object({
      aspect_ratio: z.string(),
      lighting: z.string(),
      camera: z.string(),
      depth_of_field: z.string(),
      output_style: z.string(),
    }),
    brand_colors: z.object({
      primary: z.string(),
      secondary: z.string(),
      tertiary: z.string(),
    }),
    product_info: z.object({
      brand_name: z.string(),
      product: z.string(),
      watermark: z.string(),
    }),
  }),
  visionAnalysis: z.any(),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "ImageGenerationStep",
  description: "Generate UGC-style images using Nano Banana API",
  subscribes: ["variants.generated"],
  emits: ["image.generated"],
  input: ImageGenerationInputSchema,
  flows: ["ugc-generation"],
};

export const handler: Handlers["ImageGenerationStep"] = async (
  input,
  { logger, emit }
) => {
  const { requestId, originalImageUrl, variant } = input;

  try {
    logger.info(`Starting image generation`, {
      requestId,
      variantId: variant.variant_id,
      camera: variant.camera_angle,
      lighting: variant.lighting,
    });

    // Call Nano Banana API for image generation
    const imageResponse = await axios.post(
      "https://fal.run/fal-ai/nano-banana/edit",
      {
        prompt: variant.image_prompt,
        image_urls: [originalImageUrl],
        aspect_ratio: variant.aspect_ratio,
      },
      {
        headers: {
          Authorization: `Key ${process.env.FAL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const generatedImageUrl = imageResponse.data.images[0].url;

    logger.info(`Image generated successfully`, {
      requestId,
      variantId: variant.variant_id,
      generatedImageUrl,
    });

    await emit({
      topic: "image.generated",
      data: {
        requestId,
        variantId: variant.variant_id,
        originalImageUrl,
        generatedImageUrl,
        variant,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error(`Image generation failed`, {
      requestId,
      variantId: variant.variant_id,
      error: error.message,
    });

    // Check if it's a rate limit or API error
    if (error.response) {
      logger.error(`API Error Details`, {
        requestId,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    }

    throw error;
  }
};
