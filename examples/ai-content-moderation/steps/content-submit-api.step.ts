import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";

export const config: ApiRouteConfig = {
  type: "api",
  name: "ContentSubmitAPI",
  description: "Accepts content for moderation",
  path: "/content/submit",
  method: "POST",
  emits: ["content.submitted"],
  bodySchema: z.object({
    text: z.string().optional(),
    imageUrl: z.string().url().optional(),
    userId: z.string(),
    platform: z.string(),
  }),
  responseSchema: {
    200: z.object({
      message: z.string(),
      submissionId: z.string(),
    }),
    400: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  flows: ["content-moderation"],
};

export const handler: Handlers["ContentSubmitAPI"] = async (
  req,
  { logger, emit }
) => {
  logger.info("Content submission received", {
    body: req.body,
    userId: req.body.userId,
    platform: req.body.platform,
  });

  // Validate that at least text or imageUrl is provided
  if (!req.body.text && !req.body.imageUrl) {
    logger.warn("Content submission rejected - missing content", {
      userId: req.body.userId,
      platform: req.body.platform,
    });
    return {
      status: 400,
      body: { error: "At least text or imageUrl must be provided" },
    };
  }

  try {
    const submissionId = `sub_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const submissionData = {
      submissionId,
      ...req.body,
      timestamp: new Date().toISOString(),
    };

    await emit({ topic: "content.submitted", data: submissionData });

    logger.info("Content submission processed", {
      submissionId,
      userId: req.body.userId,
    });

    return {
      status: 200,
      body: {
        message: "Content submitted successfully for moderation",
        submissionId,
      },
    };
  } catch (error: any) {
    logger.error("Content submission failed", {
      error: error.message,
      userId: req.body.userId,
      platform: req.body.platform,
    });
    return {
      status: 500,
      body: { error: "Failed to process content submission" },
    };
  }
};
