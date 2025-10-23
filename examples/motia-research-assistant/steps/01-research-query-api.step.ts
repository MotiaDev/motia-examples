import { z } from "zod";
import { ApiRouteConfig, Handlers } from "motia";
import { v4 as uuidv4 } from "uuid";

const ResearchQueryInputSchema = z.object({
  query: z.string(),
  depth: z.enum(["basic", "detailed", "comprehensive"], {
    errorMap: () => ({
      message: "Depth must be one of: basic, detailed, comprehensive",
    }),
  }),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "ResearchQueryAPI",
  description:
    "Accept research queries and initiate multi-agent research workflow",
  path: "/research/query",
  method: "POST",
  bodySchema: ResearchQueryInputSchema,
  emits: ["query.received"],
  flows: ["motia-research-assistant"],
};

export const handler: Handlers["ResearchQueryAPI"] = async (
  req,
  { logger, emit }
) => {
  const researchId = `research_${uuidv4()}`;

  logger.info(`ResearchQueryAPI Step – Starting research process`, {
    researchId,
    body: req.body,
  });

  try {
    const { query, depth } = req.body;

    logger.info(`Initiating research workflow`, { researchId, query, depth });

    await emit({
      topic: "query.received",
      data: {
        researchId,
        query,
        depth,
        status: "initiated",
        timestamp: new Date().toISOString(),
      },
    });

    return {
      status: 200,
      body: {
        success: true,
        researchId,
        message: "Research query initiated successfully",
        status: "processing",
      },
    };
  } catch (error: any) {
    logger.error(`Failed to process research query`, {
      researchId,
      error: error.message,
    });

    return {
      status: 400,
      body: {
        error: error.message || "Failed to process research query",
        researchId,
      },
    };
  }
};
