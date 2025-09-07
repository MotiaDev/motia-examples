import { z } from "zod";
import OpenAI from "openai";
import { EventConfig, Handlers } from "motia";

const ContentAnalyzerInputSchema = z.object({
  submissionId: z.string(),
  text: z.string().optional(),
  imageUrl: z.string().optional(),
  userId: z.string(),
  platform: z.string(),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "ContentAnalyzer",
  description: "Analyzes content using AI for toxicity and safety",
  subscribes: ["content.submitted"],
  emits: ["content.analyzed"],
  input: ContentAnalyzerInputSchema,
  flows: ["content-moderation"],
};

export const handler: Handlers["ContentAnalyzer"] = async (
  input,
  { logger, emit, state }
) => {
  const { submissionId, text, imageUrl, userId, platform, timestamp } = input;

  logger.info(`Analyzing content`, {
    submissionId,
    hasText: !!text,
    hasImage: !!imageUrl,
  });

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  let textAnalysis;
  let imageAnalysis;
  let error;

  try {
    // Analyze text content
    if (text) {
      logger.info(`Analyzing text content`, { submissionId });

      const moderationResponse = await openai.moderations.create({
        input: text,
      });

      const result = moderationResponse.results[0];
      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category, _]) => category);

      const maxScore = Math.max(...Object.values(result.category_scores));

      // ORIGINAL TEXT ANALYSIS
      textAnalysis = {
        hasToxicity: result.flagged,
        toxicityScore: maxScore,
        categories: flaggedCategories,
        confidence: maxScore,
      };
      // MODERATE TEXT SCORE TO TRIGGER HUMAN REVIEW

      //   textAnalysis = {
      //     hasToxicity: false,
      //     toxicityScore: 0.4, // Moderate score to trigger human review
      //     categories: ["mild-language"],
      //     confidence: 0.6,
      //   };
    }

    // Analyze image content
    if (imageUrl) {
      logger.info(`Analyzing image content`, { submissionId });

      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: `You are a content moderation AI. Analyze this image for inappropriate content including:
- Violence, gore, or weapons
- Sexual or suggestive content
- Hate symbols or offensive imagery
- Harassment or bullying content
- Illegal activities

Respond with JSON: {"isUnsafe": boolean, "safetyScore": number (0-1), "categories": ["category1", "category2"], "confidence": number (0-1)}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image for content moderation.",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      });

      const analysis = JSON.parse(
        visionResponse.choices[0]?.message?.content || "{}"
      );

      // ORIGINAL IMAGE ANALYSIS
      imageAnalysis = {
        isUnsafe: analysis.isUnsafe || false,
        safetyScore: analysis.safetyScore || 0,
        categories: analysis.categories || [],
        confidence: analysis.confidence || 0,
      };

      // MODERATE IMAGE SCORE TO TRIGGER HUMAN REVIEW
      //   imageAnalysis = {
      //     isUnsafe: false,
      //     safetyScore: 0.3, // Moderate score to trigger human review
      //     categories: ["potentially-inappropriate"],
      //     confidence: 0.5,
      //   };
    }

    // Calculate overall score and recommendation
    const textScore = textAnalysis?.toxicityScore || 0;
    const imageScore = imageAnalysis?.safetyScore || 0;
    const overallScore = Math.max(textScore, imageScore);

    let recommendation: "approve" | "review" | "reject";
    if (overallScore >= 0.85) {
      recommendation = "reject";
    } else if (overallScore >= 0.3) {
      recommendation = "review";
    } else {
      recommendation = "approve";
    }

    await state.set("moderation", `submission:${submissionId}`, {
      submissionId,
      text,
      imageUrl,
      userId,
      platform,
      timestamp,
      originalTimestamp: timestamp,
    });

    await emit({
      topic: "content.analyzed",
      data: {
        submissionId,
        textAnalysis,
        imageAnalysis,
        overallScore,
        recommendation,
        timestamp: new Date().toISOString(),
      },
    });

    logger.info(`Content analysis complete`, {
      submissionId,
      recommendation,
      overallScore,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
    logger.error(`Content analysis failed`, { submissionId, error });

    await emit({
      topic: "content.analyzed",
      data: {
        submissionId,
        textAnalysis,
        imageAnalysis,
        overallScore: 0,
        recommendation: "review",
        timestamp: new Date().toISOString(),
        error,
      },
    });
  }
};
