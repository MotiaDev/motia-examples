import { z } from "zod";
import { EventConfig, Handlers } from "motia";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import FormData from "form-data";

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
  description: "Generate UGC-style images using Google Gemini",
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

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image-preview",
    });

    // Fetch and convert image to base64
    const imgResponse = await axios.get(originalImageUrl, {
      responseType: "arraybuffer",
    });
    const base64Image = Buffer.from(imgResponse.data).toString("base64");

    // Generate image with Gemini
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg",
        },
      },
      variant.image_prompt,
    ]);

    // Extract generated image
    const candidates = result.response.candidates || [];
    let imageData: string | null = null;
    for (const candidate of candidates) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData) {
          imageData = part.inlineData.data;
          break;
        }
      }
      if (imageData) break;
    }

    if (!imageData) {
      throw new Error("No image generated");
    }

    // Upload to ImageKit
    const imageBuffer = Buffer.from(imageData, "base64");
    const filename =
      `${variant.product_info.brand_name}_v${variant.variant_id}.jpg`.replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );

    const form = new FormData();
    form.append("file", imageBuffer, filename);
    form.append("fileName", filename);

    const uploadResponse = await axios.post(
      "https://upload.imagekit.io/api/v1/files/upload",
      form,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            process.env.IMAGEKIT_PRIVATE_KEY +
              ":" +
              process.env.IMAGEKIT_PASSWORD
          ).toString("base64")}`,
          ...form.getHeaders(),
        },
      }
    );

    const generatedImageUrl = uploadResponse.data.url;

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
    console.log("error", error.response);
    logger.error(`Image generation failed`, {
      requestId,
      variantId: variant.variant_id,
      error: error.message,
    });

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
