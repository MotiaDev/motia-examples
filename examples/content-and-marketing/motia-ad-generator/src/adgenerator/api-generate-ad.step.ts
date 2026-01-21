import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";

const bodySchema = z.object({
  url: z.string().url("Must be a valid URL"),
  type: z
    .array(z.enum(["instagram", "tiktok"]))
    .min(1)
    .max(2),
  videoProvider: z.enum(["kling", "veo", "auto"]).default("auto"),
});

const responseSchema = z.object({
  success: z.boolean(),
  jobId: z.string(),
  message: z.string(),
  type: z.array(z.enum(["instagram", "tiktok"])),
  output: z.enum(["image", "video", "both"]),
  videoProvider: z.enum(["kling", "veo", "auto"]),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "GenerateAd",
  description:
    "Generate AI-powered ad images and cinematic videos from landing page URLs",
  path: "/api/generate-ad",
  method: "POST",
  emits: [{ topic: "ad.scrape.requested", label: "Scrape Requested" }],
  flows: ["ad-generator"],
  bodySchema,
  responseSchema: {
    200: responseSchema,
    400: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
};

export const handler: Handlers["GenerateAd"] = async (
  req,
  { emit, logger }
) => {
  const { url, type, videoProvider } = bodySchema.parse(req.body);
  logger.info("Ad generation requested", {
    url,
    type,
    videoProvider,
  });

  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  let output: "image" | "video" | "both";

  if (type.length === 2) {
    output = "both";
  } else if (type.includes("instagram")) {
    output = "image";
  } else {
    output = "video";
  }

  logger.info("Ad generation requested", {
    jobId,
    url,
    type,
    output,
    videoProvider,
  });

  await emit({
    topic: "ad.scrape.requested",
    data: {
      jobId,
      url,
      type,
      output,
      videoProvider,
      requestedAt: new Date().toISOString(),
    },
  });

  return {
    status: 200,
    body: {
      success: true,
      jobId,
      message: "Ad generation started. Use jobId to track progress.",
      type,
      output,
      videoProvider,
    },
  };
};
