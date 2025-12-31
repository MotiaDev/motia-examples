/**
 * Gemini Service
 *
 * Uses Gemini 2.5 Flash for intelligent brand analysis and detailed ad prompt generation.
 * Analyzes landing page content (text + screenshot) to generate high-quality prompts.
 */

import { GoogleGenAI } from "@google/genai";

// ============================================================================
// Types
// ============================================================================

export interface BrandAnalysisInput {
  markdown: string;
  screenshotUrl: string;
  brandInfo: {
    title: string;
    description: string;
  };
  metadata: {
    title?: string;
    description?: string;
    keywords?: string;
  };
}

export interface AnalysisResult {
  brandName: string;
  industry: string;
  tone: string;
  targetAudience: string;
  primaryColors: string[];
  aesthetic: string;
  valueProposition: string;
  adPrompt: string;
}

// ============================================================================
// Service
// ============================================================================

export class GeminiService {
  private readonly client: GoogleGenAI;
  private readonly model = "gemini-2.5-flash";

  constructor() {
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

    if (!apiKey) {
      throw new Error("GOOGLE_CLOUD_API_KEY is required");
    }

    this.client = new GoogleGenAI({
      apiKey,
    });
  }

  /**
   * Analyze brand and generate detailed ad prompt
   */
  async analyzeBrandAndGeneratePrompt(
    input: BrandAnalysisInput
  ): Promise<AnalysisResult> {
    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(input);

      const image = {
        fileData: {
          mimeType: "image/png",
          fileUri: input.screenshotUrl,
        },
      };

      const generationConfig = {
        maxOutputTokens: 65535,
        temperature: 1,
        topP: 0.95,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            brandName: { type: "string" },
            industry: { type: "string" },
            tone: { type: "string" },
            targetAudience: { type: "string" },
            primaryColors: {
              type: "array",
              items: { type: "string" },
            },
            aesthetic: { type: "string" },
            valueProposition: { type: "string" },
            adPrompt: { type: "string" },
          },
          required: [
            "brandName",
            "industry",
            "tone",
            "targetAudience",
            "primaryColors",
            "aesthetic",
            "valueProposition",
            "adPrompt",
          ],
        },
      };

      const req = {
        model: this.model,
        contents: [{ role: "user", parts: [image, { text: userPrompt }] }],
        config: generationConfig,
        systemInstruction: systemPrompt,
      };

      const response = await this.client.models.generateContent(req);

      if (!response.text) {
        throw new Error("No text response from Gemini");
      }

      const result = JSON.parse(response.text);

      return result as AnalysisResult;
    } catch (error: any) {
      throw new Error(
        `Failed to analyze brand: ${error.message || "Unknown error"}`
      );
    }
  }

  /**
   * Build system prompt for analysis
   */
  private buildSystemPrompt(): string {
    return `You are an expert brand analyst and creative director specializing in Instagram advertising.

Your task is to:
1. Analyze the landing page (text + screenshot) to deeply understand the brand
2. Extract: brand identity, visual style, target audience, messaging
3. Generate an ULTRA-DETAILED ad prompt for Nano Banana Pro image generation

The ad prompt MUST be:
- Extremely specific (like a professional photography brief)
- Include every detail: subject, pose, expression, setting, lighting, colors, text overlay
- Match the brand's aesthetic and tone perfectly
- Be Instagram-optimized for maximum engagement
- Create scroll-stopping, authentic, high-converting ads

Output ONE complete prompt as a single detailed string that captures everything needed.`;
  }

  /**
   * Build user prompt with landing page data
   */
  private buildUserPrompt(input: BrandAnalysisInput): string {
    return `Analyze this brand's landing page and generate a detailed Instagram ad prompt.

BRAND INFORMATION:
Title: ${input.brandInfo.title}
Description: ${input.brandInfo.description}

PAGE CONTENT (First 8000 chars):
${input.markdown.slice(0, 8000)}

INSTRUCTIONS:

1. BRAND ANALYSIS:
   - Identify: industry, tone, personality, target audience
   - Extract: primary colors (hex codes if visible), aesthetic style
   - Understand: core value proposition, emotional hook

2. AD PROMPT GENERATION:
   Create ONE complete, ultra-detailed prompt (as a single string) that includes:
   
   - Image specifications: aspect ratio 1:1, ultra-realistic style, high detail
   - Scene: specific location, setting, time of day, atmosphere
   - Lighting: type, source, effect (natural/studio/ambient)
   - Subject: detailed description (age, appearance, pose, expression, what they're doing)
   - Outfit/styling: specific clothing, colors, accessories
   - Environment: background details, props, mood
   - Text overlay: headline, subtext, CTA (matching brand voice)
   - Colors: brand colors integrated naturally
   
   Make it extremely detailed - every visual element described.
   
OUTPUT: Return a flat JSON object with all analysis fields and ONE comprehensive adPrompt string.`;
  }
}

// ============================================================================
// Factory & Convenience Exports
// ============================================================================

export function createGeminiService(): GeminiService {
  return new GeminiService();
}

export async function analyzeBrandAndGeneratePrompt(
  input: BrandAnalysisInput
): Promise<AnalysisResult> {
  const service = createGeminiService();
  return service.analyzeBrandAndGeneratePrompt(input);
}
