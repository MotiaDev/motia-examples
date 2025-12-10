import { z } from "zod";
import { EventConfig, Handlers } from "motia";

const VariantGenerationInputSchema = z.object({
  requestId: z.string(),
  imageUrl: z.string(),
  originalImagePath: z.string(),
  numVariations: z.number(),
  visionAnalysis: z.object({
    brand_name: z.string(),
    product: z.string(),
    character: z.string(),
    ad_copy: z.string(),
    visual_guide: z.string(),
    text_watermark: z.string(),
    font_style: z.string(),
    reference_image_summary: z.string(),
    palette: z.array(
      z.object({
        hex: z.string(),
        name: z.string(),
      })
    ),
    primary_color: z.string(),
    secondary_color: z.string(),
    tertiary_color: z.string(),
  }),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "VariantGenerationStep",
  description: "Generate variants and create image prompts for UGC content",
  subscribes: ["vision.analyzed"],
  emits: ["variants.generated"],
  input: VariantGenerationInputSchema,
  flows: ["ugc-generation"],
};

export const handler: Handlers["VariantGenerationStep"] = async (
  input,
  { logger, emit }
) => {
  const { requestId, imageUrl, numVariations, visionAnalysis } = input;

  try {
    logger.info(`Generating variants and prompts`, {
      requestId,
      numVariations,
      brand: visionAnalysis.brand_name,
      product: visionAnalysis.product,
    });

    // Camera angles and lighting options
    const cameraAngles = [
      "top-down flat lay",
      "three-quarter product angle (30°)",
      "angled overhead (15° tilt)",
      "eye-level hero shot",
    ];

    const lightingStyles = [
      "soft natural daylight",
      "bright, even daylight",
      "diffused window light",
      "soft studio light with diffuser",
    ];

    const headlineSeeds = [
      "instant radiance",
      "effortless glow",
      "fresh finish",
      "skin-first beauty",
      "everyday dewy",
      "soft-focus sheen",
      "natural luminosity",
      "quiet luxury glow",
      "no-makeup look",
      "your-skin boost",
    ];

    // Generate variants
    const variants = [];
    for (let i = 0; i < numVariations; i++) {
      const angle = cameraAngles[i % cameraAngles.length];
      const lighting = lightingStyles[i % lightingStyles.length];
      const seed = headlineSeeds[i % headlineSeeds.length];

      // Create image prompt for this variant
      const imagePrompt = `emotion: confident and natural
action: product naturally displayed in casual setting
character: ${visionAnalysis.character}
product: ${visionAnalysis.brand_name} ${visionAnalysis.product} with clear, legible branding
setting: casual, authentic UGC environment with natural lighting
camera: ${angle}, amateur phone snapshot style, slightly off-center framing
style: candid UGC aesthetic, unpolished and natural, editorial minimalism
composition: product as hero element, ${angle} perspective
lighting: ${lighting}, soft shadows, no harsh reflections
color_palette: primary ${visionAnalysis.primary_color}, secondary ${visionAnalysis.secondary_color}, background ${visionAnalysis.tertiary_color}
typography: ${visionAnalysis.font_style} for any visible text
text_accuracy: preserve all visible product text exactly, do not recolor the product or logo
notes: avoid brand-new showroom look, maintain authenticity and realness`;

      const variant = {
        variant_id: i + 1,
        image_prompt: imagePrompt,
        aspect_ratio: "2:3",
        camera_angle: angle,
        lighting: lighting,
        headline_seed: seed,
        render_preferences: {
          aspect_ratio: "2:3",
          lighting: lighting,
          camera: angle,
          depth_of_field: "deep, product fully sharp",
          output_style: "editorial minimalism",
        },
        brand_colors: {
          primary: visionAnalysis.primary_color,
          secondary: visionAnalysis.secondary_color,
          tertiary: visionAnalysis.tertiary_color,
        },
        product_info: {
          brand_name: visionAnalysis.brand_name,
          product: visionAnalysis.product,
          watermark: visionAnalysis.text_watermark,
        },
      };

      variants.push(variant);
    }

    logger.info(`Generated ${variants.length} variants`, {
      requestId,
      variants: variants.map((v) => ({
        id: v.variant_id,
        camera: v.camera_angle,
        lighting: v.lighting,
      })),
    });

    // Emit each variant separately for parallel processing
    for (const variant of variants) {
      await emit({
        topic: "variants.generated",
        data: {
          requestId,
          originalImageUrl: imageUrl,
          variant,
          visionAnalysis,
          timestamp: new Date().toISOString(),
        },
      });
    }

    logger.info(`All variants emitted for processing`, { requestId });
  } catch (error: any) {
    logger.error(`Variant generation failed`, {
      requestId,
      error: error.message,
    });
    throw error;
  }
};
