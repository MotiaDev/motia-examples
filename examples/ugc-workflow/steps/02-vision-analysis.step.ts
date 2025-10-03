import { z } from "zod";
import { EventConfig, Handlers } from "motia";
import axios from "axios";

const VisionAnalysisInputSchema = z.object({
  requestId: z.string(),
  imageUrl: z.string().url(),
  numVariations: z.number(),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "VisionAnalysisStep",
  description: "Analyze image with OpenAI Vision",
  subscribes: ["image.uploaded"],
  emits: ["vision.analyzed"],
  input: VisionAnalysisInputSchema,
  flows: ["ugc-generation"],
};

export const handler: Handlers["VisionAnalysisStep"] = async (
  input,
  { logger, emit }
) => {
  const { requestId, imageUrl, numVariations } = input;

  try {
    logger.info(`Starting vision analysis`, { requestId, imageUrl });

    const visionPrompt = `Analyze the given image and return ONLY a compact JSON object (no markdown code fences, no explanations). Use this exact schema and keys:

{
  "brand_name": string,                 // Visible on packaging, or infer
  "product": string,                    // Name/type of product; infer if unclear
  "character": string,                  // If absent, default to "Minimalist beauty muse"
  "ad_copy": string,                    // Short slogan, 20–35 characters
  "visual_guide": string,               // 1–2 sentences on camera angle, lighting, style
  "text_watermark": string,             // Default to brand_name
  "palette": [                          // 3–4 prominent colors
    { "hex": string, "name": string }
  ],
  "font_style": string,                 // e.g., "Bold sans-serif"
  "reference_image_summary": string     // Objective description of what is seen, ignoring background
}

RULES:
- brand_name: Output exactly as printed (case-sensitive) if visible; otherwise infer.
- product: Be specific (e.g., "Miracle Balm" not just "cosmetic").
- character: If not depicted, return "Minimalist beauty muse".
- ad_copy: Must be original, concise, brand-aligned (20–35 characters).
- visual_guide: Describe camera angle, lighting, and style clearly, avoid fluff.
- text_watermark: Use brand_name unless an alternate watermark is explicitly visible.
- palette: Pick 3–4 dominant colors; always use valid 6-digit hex (e.g. "#e6a5a1").
- font_style: Infer from logo text (e.g., serif/sans-serif, bold/thin, modern/classic).
- reference_image_summary: Single objective sentence about the product image.

Return only the JSON. Do not include markdown, YAML, comments, or extra text.`;

    const visionResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: visionPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const analysisText = visionResponse.data.choices[0].message.content;

    // Parse and normalize the JSON response
    const cleanedAnalysis = analysisText
      .replace(/^```(?:json)?/i, "")
      .replace(/```?$/i, "")
      .trim();

    let visionAnalysis;
    try {
      visionAnalysis = JSON.parse(cleanedAnalysis);
    } catch (e) {
      logger.error(`Failed to parse vision analysis JSON`, {
        requestId,
        rawResponse: analysisText,
      });
      throw new Error("Invalid JSON response from vision analysis");
    }

    // Normalize and add defaults
    const normalizedData = {
      brand_name: visionAnalysis.brand_name || "Unknown Brand",
      product: visionAnalysis.product || "Unknown Product",
      character: visionAnalysis.character || "Minimalist beauty muse",
      ad_copy: visionAnalysis.ad_copy || "Glow your own way",
      visual_guide:
        visionAnalysis.visual_guide ||
        "Top-down, soft daylight, neutral backdrop, minimal editorial styling.",
      text_watermark:
        visionAnalysis.text_watermark || visionAnalysis.brand_name || "Brand",
      font_style: visionAnalysis.font_style || "Bold sans-serif",
      reference_image_summary:
        visionAnalysis.reference_image_summary ||
        "Product image on neutral background.",
      palette: visionAnalysis.palette || [
        { hex: "#d89c94", name: "Rosewood" },
        { hex: "#f2e9e1", name: "Pale Ivory" },
        { hex: "#ffffff", name: "White" },
      ],
      primary_color: visionAnalysis.palette?.[0]?.hex || "#d89c94",
      secondary_color: visionAnalysis.palette?.[1]?.hex || "#f2e9e1",
      tertiary_color: visionAnalysis.palette?.[2]?.hex || "#ffffff",
    };

    logger.info(`Vision analysis completed`, {
      requestId,
      brand: normalizedData.brand_name,
      product: normalizedData.product,
    });

    await emit({
      topic: "vision.analyzed",
      data: {
        requestId,
        imageUrl,
        originalImagePath: imageUrl,
        numVariations,
        visionAnalysis: normalizedData,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error(`Vision analysis failed`, { requestId, error: error.message });
    throw error;
  }
};
