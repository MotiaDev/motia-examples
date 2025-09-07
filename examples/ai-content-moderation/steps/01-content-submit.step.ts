import { z } from "zod";
import { ApiRouteConfig, Handlers } from "motia";

const ContentSubmitInputSchema = z.object({
  text: z.string().optional(),
  imageUrl: z.string().optional(),
  userId: z.string(),
  platform: z.string(),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "ContentSubmitAPI",
  description: "Receives user-generated content for moderation",
  path: "/content/submit",
  method: "POST",
  bodySchema: ContentSubmitInputSchema,
  emits: ["content.submitted"],
  flows: ["content-moderation"],
};

export const handler: Handlers["ContentSubmitAPI"] = async (
  req,
  { logger, emit }
) => {
  const { text, imageUrl, userId, platform } = req.body;
  const submissionId = `sub_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 11)}`;

  logger.info(`Content submitted for moderation`, {
    submissionId,
    hasText: !!text,
    hasImage: !!imageUrl,
    userId,
    platform,
  });

  await emit({
    topic: "content.submitted",
    data: {
      submissionId,
      text,
      imageUrl,
      userId,
      platform,
      timestamp: new Date().toISOString(),
    },
  });

  return {
    status: 200,
    body: {
      message: "Content submitted for moderation",
      submissionId,
    },
  };
};
