import { z } from "zod";
import { ApiRouteConfig, Handlers } from "motia";
import axios from "axios";

const ImageUploadInputSchema = z.object({
  numVariations: z.number().default(1),
  imageUrl: z.string().url(),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "ImageUploadAPI",
  description: "Upload image URL and trigger UGC video generation workflow",
  path: "/ugc/upload",
  method: "POST",
  bodySchema: ImageUploadInputSchema,
  emits: ["image.uploaded"],
  flows: ["ugc-generation"],
};

export const handler: Handlers["ImageUploadAPI"] = async (
  req,
  { logger, emit }
) => {
  const requestId = `ugc_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 11)}`;

  logger.info(`ImageUploadAPI Step – Starting image upload process`, {
    requestId,
    body: req.body,
  });

  try {
    const { imageUrl } = req.body;
    const numVariations = req.body.numVariations ?? 1;

    logger.info(`Validating image URL`, { requestId, imageUrl });

    // Validate URL is accessible
    await axios.head(imageUrl, { timeout: 5000 });

    logger.info(`Starting UGC workflow`, { requestId, numVariations });

    await emit({
      topic: "image.uploaded",
      data: {
        requestId,
        imageUrl,
        numVariations,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      status: 200,
      body: {
        message: "UGC workflow started",
        requestId,
        status: "processing",
      },
    };
  } catch (error: any) {
    logger.error(`Failed to process image URL`, {
      requestId,
      error: error.message,
    });

    return {
      status: 400,
      body: {
        error: error.message || "Failed to validate image URL",
        requestId,
      },
    };
  }
};
