import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { scrapeUrl } from "../services/firecrawl.service";
import { uploadFromUrl } from "../services/imagekit.service";

export const config: EventConfig = {
  type: "event",
  name: "ScrapeLandingPage",
  description: "Scrape landing page and extract content for ad generation",
  subscribes: ["ad.generation.started"],
  emits: ["landing.page.scraped", "landing.page.scrape.failed"],
  input: z.object({
    jobId: z.uuid().describe("Unique job identifier"),
    url: z.url().describe("Landing page URL to scrape"),
    options: z.object({
      instagram: z
        .object({
          enabled: z.boolean(),
          count: z.number().min(1).max(10),
        })
        .optional(),
      tiktok: z
        .object({
          enabled: z.boolean(),
          count: z.number().min(1).max(5),
          mode: z.enum([
            "text-to-video",
            "reference-images",
            "interpolation",
            "extension",
          ]),
        })
        .optional(),
    }),
    requestedAt: z.string().datetime(),
  }),
  flows: ["ad-generation"],
};

export const handler: Handlers["ScrapeLandingPage"] = async (
  input,
  { state, emit, logger }
) => {
  const { jobId, url, options, requestedAt } = input;

  logger.info("Starting landing page scrape", { jobId, url });

  try {
    const scrapedContent = await scrapeUrl(url, {
      waitFor: 3000,
      timeout: 60000,
    });

    const imagekitResult = await uploadFromUrl(
      scrapedContent.screenshot,
      `screenshot-${jobId}.png`,
      "/ad-screenshots"
    );

    const result = {
      jobId,
      url,
      markdown: scrapedContent.markdown,
      screenshot: imagekitResult.url,
      brandInfo: scrapedContent.brandInfo,
      metadata: scrapedContent.metadata,
      options,
      requestedAt,
      scrapedAt: new Date().toISOString(),
    };

    logger.info("Landing page scraped successfully", imagekitResult);
    await state.set("scraped-pages", jobId, result);

    await emit({
      topic: "landing.page.scraped",
      data: result,
    });

    logger.info("Landing page scraped successfully", {
      jobId,
      markdownLength: scrapedContent.markdown.length,
      hasScreenshot: !!scrapedContent.screenshot,
    });
  } catch (error: any) {
    logger.error("Landing page scrape failed", {
      error: error.message,
      stack: error.stack,
      jobId,
      url,
    });

    const errorResult = {
      jobId,
      url,
      error: error.message,
      requestedAt,
      failedAt: new Date().toISOString(),
    };

    await state.set("scraped-pages", jobId, errorResult);

    await emit({
      topic: "landing.page.scrape.failed",
      data: errorResult,
    });

    throw error;
  }
};
