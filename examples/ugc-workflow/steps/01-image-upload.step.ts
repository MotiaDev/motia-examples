import { z } from "zod";
import { ApiRouteConfig, Handlers } from "motia";

const ImageUploadInputSchema = z.object({
  numVariations: z.number().default(1),
  // .describe("Number of image variations to generate"),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "ImageUploadAPI",
  description: "Upload image and trigger UGC video generation workflow",
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
  const { numVariations } = req.body;
  const variations = numVariations ?? 1;

  // Use predefined image from assets folder
  const imagePath = "./assets/caoatiso.jpg";
  logger.info(`Image path: ${imagePath}`);

  const requestId = `ugc_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 11)}`;

  logger.info(`UGC workflow initiated with predefined image`, {
    requestId,
    imagePath,
    numVariations,
  });

  await emit({
    topic: "image.uploaded",
    data: {
      requestId,
      imagePath,
      numVariations: variations,
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
};
