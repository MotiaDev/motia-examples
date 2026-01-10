import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { FirecrawlService } from "../services/firecrawl.service";

const inputSchema = z.object({
  jobId: z.string(),
  url: z.string().url(),
  type: z
    .array(z.enum(["instagram", "tiktok"]))
    .min(1)
    .max(2),
  output: z.enum(["image", "video", "both"]),
  videoProvider: z.enum(["kling", "veo", "auto"]),
  requestedAt: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "ScrapeLandingPage",
  description: "Scrapes landing page using Firecrawl API",
  subscribes: ["ad.scrape.requested"],
  emits: [
    { topic: "ad.images.filter.ready", label: "Images Ready for Filtering" },
  ],
  flows: ["ad-generator"],
  input: inputSchema,
};

export const handler: Handlers["ScrapeLandingPage"] = async (
  input,
  { emit, logger, state }
) => {
  const { jobId, url, type, output, videoProvider } = input;

  logger.info("Starting scrape", { jobId, url, type, output, videoProvider });

  try {
    const scraped = await FirecrawlService.scrapeLandingPage(url);

    await state.set("ad-generator", `job_${jobId}`, {
      jobId,
      url,
      type,
      output,
      videoProvider,
      scraped: {
        markdown: scraped.data.markdown,
        screenshot: scraped.data.screenshot,
        branding: scraped.data.branding,
        images: scraped.data.images || [],
        summary: scraped.data.summary,
        metadata: scraped.data.metadata,
      },
      status: "scraped",
      scrapedAt: new Date().toISOString(),
    });

    logger.info("Scrape completed", {
      jobId,
      imageCount: scraped.data.images?.length || 0,
      hasSummary: !!scraped.data.summary,
    });

    await emit({
      topic: "ad.images.filter.ready",
      data: {
        jobId,
        url,
        type,
        output,
        videoProvider,
        images: scraped.data.images || [],
        screenshot: scraped.data.screenshot,
      },
    });
  } catch (error) {
    logger.error("Scraping failed", {
      jobId,
      url,
      error: error instanceof Error ? error.message : String(error),
    });

    await state.set("ad-generator", `job_${jobId}`, {
      jobId,
      url,
      type,
      output,
      videoProvider,
      status: "scrape_failed",
      error: error instanceof Error ? error.message : "Unknown error",
      failedAt: new Date().toISOString(),
    });

    throw error;
  }
};
