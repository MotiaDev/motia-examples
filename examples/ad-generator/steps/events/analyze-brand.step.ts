import { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { analyzeBrandAndGeneratePrompt } from "../services/gemini.service";

export const config: EventConfig = {
  type: "event",
  name: "AnalyzeBrand",
  description:
    "Analyze brand from scraped content and generate detailed ad prompts",
  subscribes: ["landing.page.scraped"],
  emits: ["brand.analyzed", "brand.analysis.failed"],
  input: z.object({
    jobId: z.string().uuid(),
    url: z.string().url(),
    markdown: z.string(),
    screenshot: z.string().url(),
    brandInfo: z.object({
      title: z.string(),
      description: z.string(),
    }),
    metadata: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      keywords: z.string().optional(),
    }),
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
    scrapedAt: z.string().datetime(),
  }),
  flows: ["ad-generation"],
};

export const handler: Handlers["AnalyzeBrand"] = async (
  input,
  { state, emit, logger }
) => {
  const { jobId, url, markdown, screenshot, brandInfo, metadata, options } =
    input;

  logger.info("Starting brand analysis", { jobId, brand: brandInfo.title });

  try {
    const analysisResult = await analyzeBrandAndGeneratePrompt({
      markdown,
      screenshotUrl: screenshot,
      brandInfo,
      metadata,
    });

    const result = {
      jobId,
      url,
      analysis: {
        brand: {
          name: analysisResult.brandName,
          industry: analysisResult.industry,
          tone: analysisResult.tone,
          personality: analysisResult.tone, // Using tone as personality fallback
          targetAudience: analysisResult.targetAudience,
        },
        visual: {
          primaryColors: analysisResult.primaryColors,
          colorMood: analysisResult.aesthetic, // Using aesthetic as colorMood fallback
          aesthetic: analysisResult.aesthetic,
        },
        messaging: {
          mainValueProp: analysisResult.valueProposition,
          emotionalHook: analysisResult.valueProposition, // Using valueProposition as emotionalHook fallback
          keyBenefits: [analysisResult.valueProposition], // Converting to array
        },
      },
      prompt: analysisResult.adPrompt,
      rawPromptText: analysisResult.adPrompt,
      options,
      analyzedAt: new Date().toISOString(),
    };

    await state.set("analyzed-brands", jobId, result);

    await emit({
      topic: "brand.analyzed",
      data: result,
    });

    logger.info("Brand analysis completed", {
      jobId,
      brandName: analysisResult.brandName,
      industry: analysisResult.industry,
      promptLength: analysisResult.adPrompt.length,
    });
  } catch (error: any) {
    logger.error("Brand analysis failed", {
      error: error.message,
      stack: error.stack,
      jobId,
      url,
    });

    const errorResult = {
      jobId,
      url,
      error: error.message,
      failedAt: new Date().toISOString(),
    };

    await state.set("analyzed-brands", jobId, errorResult);

    // await emit({
    //   topic: "brand.analysis.failed",
    //   data: errorResult,
    // });

    throw error;
  }
};
