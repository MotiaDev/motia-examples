import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";

const responseSchema = z.object({
  jobId: z.string(),
  url: z.string().optional(),
  type: z.array(z.string()).optional(),
  output: z.string().optional(),
  status: z.string().optional(),
  brandAnalysis: z
    .object({
      brandName: z.string(),
      tagline: z.string(),
      tone: z.string(),
      visualStyle: z.string(),
    })
    .optional(),
  generatedImage: z
    .object({
      imagePath: z.string(),
      adFormat: z.string(),
    })
    .optional(),
  generatedVideo: z
    .object({
      videoPath: z.string(),
      provider: z.string(),
      duration: z.number(),
    })
    .optional(),
  error: z.string().optional(),
  scrapedAt: z.string().optional(),
  filteredAt: z.string().optional(),
  analyzedAt: z.string().optional(),
  imageCompletedAt: z.string().optional(),
  videoCompletedAt: z.string().optional(),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "GetJobStatus",
  description: "Get the current status of an ad generation job",
  path: "/api/job-status/:jobId",
  method: "GET",
  emits: [],
  flows: ["ad-generator"],
  responseSchema: {
    200: responseSchema,
    404: z.object({ error: z.string() }),
  },
};

export const handler: Handlers["GetJobStatus"] = async (
  req,
  { logger, state }
) => {
  const { jobId } = req.pathParams;

  logger.info("Fetching job status", { jobId });

  try {
    const jobState = await state.get<Record<string, unknown>>(
      "ad-generator",
      `job_${jobId}`
    );

    if (!jobState) {
      return {
        status: 404,
        body: { error: "Job not found" },
      };
    }

    return {
      status: 200,
      body: {
        jobId,
        url: jobState.url as string,
        type: jobState.type as string[],
        output: jobState.output as string,
        status: jobState.status as string,
        brandAnalysis: jobState.brandAnalysis as any,
        generatedImage: jobState.generatedImage as any,
        generatedVideo: jobState.generatedVideo as any,
        error: jobState.error as string,
        scrapedAt: jobState.scrapedAt as string,
        filteredAt: jobState.filteredAt as string,
        analyzedAt: jobState.analyzedAt as string,
        imageCompletedAt: jobState.imageCompletedAt as string,
        videoCompletedAt: jobState.videoCompletedAt as string,
      },
    };
  } catch (error) {
    logger.error("Error fetching job status", {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      status: 404,
      body: { error: "Failed to fetch job status" },
    };
  }
};
