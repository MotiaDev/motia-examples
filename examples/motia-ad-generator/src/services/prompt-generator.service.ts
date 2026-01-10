// src/services/prompt-generator.service.ts

import { BrandAnalysis } from "./gemini.service";

export interface AdPromptConfig {
  brandAnalysis: BrandAnalysis;
  productImages: string[];
  adType: "instagram" | "tiktok";
  url: string;
}

const COMPOSITION_BY_TONE: Record<string, string> = {
  playful:
    "Dynamic composition with floating elements, vibrant energy, fun props arranged playfully",
  professional:
    "Clean centered composition, balanced framing, minimal distractions, corporate aesthetic",
  bold: "Dramatic low angle shot, strong contrast, commanding presence, powerful visual impact",
  friendly:
    "Warm inviting scene, lifestyle context, relatable environment, approachable feel",
  energetic:
    "Dynamic arrangement, movement implied, high-energy positioning, active composition",
  "health-conscious":
    "Fresh, clean arrangement, natural elements visible, wholesome presentation",
};

const LIGHTING_BY_STYLE: Record<string, string> = {
  minimalist:
    "Soft even lighting, clean highlights, pure white or neutral background, studio precision",
  vibrant:
    "Bright saturated lighting, colorful reflections, energetic atmosphere, bold shadows",
  organic:
    "Natural golden hour lighting, soft shadows, warm tones, authentic feel",
  modern:
    "Clean studio lighting with controlled shadows, crisp definition, contemporary aesthetic",
  luxury:
    "Dramatic lighting with deep shadows, premium atmosphere, elegant highlights",
  "ingredient-focused":
    "Natural lighting highlighting textures, fresh appearance, appetizing glow",
};

// NEW: Product category detection for human model usage
const HUMAN_MODEL_CATEGORIES = [
  "apparel",
  "clothing",
  "fashion",
  "shoes",
  "sneakers",
  "footwear",
  "accessories",
  "jewelry",
  "watches",
  "bags",
  "backpack",
  "cosmetics",
  "makeup",
  "skincare",
  "beauty",
  "perfume",
  "fitness",
  "sports",
  "athletic",
  "activewear",
  "yoga",
  "eyewear",
  "sunglasses",
  "glasses",
];

const LIFESTYLE_CATEGORIES = [
  "tech",
  "gadget",
  "headphones",
  "phone",
  "laptop",
  "food",
  "beverage",
  "drink",
  "snack",
  "nutrition",
  "outdoor",
  "camping",
  "travel",
  "adventure",
];

function detectProductCategory(
  brandAnalysis: BrandAnalysis,
  url: string
): {
  needsHuman: boolean;
  isLifestyle: boolean;
  category: string;
} {
  const text = `${brandAnalysis.brandName} ${
    brandAnalysis.tagline
  } ${brandAnalysis.usps.join(" ")} ${url}`.toLowerCase();

  // Check if human model is needed
  const needsHuman = HUMAN_MODEL_CATEGORIES.some((cat) => text.includes(cat));

  // Check if lifestyle shot is appropriate
  const isLifestyle = LIFESTYLE_CATEGORIES.some((cat) => text.includes(cat));

  // Determine primary category
  let category = "product";
  for (const cat of HUMAN_MODEL_CATEGORIES) {
    if (text.includes(cat)) {
      category = cat;
      break;
    }
  }

  return { needsHuman, isLifestyle, category };
}

function generateHumanModelInstructions(
  category: string,
  tone: string,
  visualStyle: string
): string {
  // Demographic based on brand tone
  const demographic = getDemographic(tone);

  // Setting based on visual style
  const setting = getSetting(visualStyle, category);

  // Action/pose based on category
  const action = getAction(category);

  return `
**Human Model Integration:**
Include a ${demographic} model in the scene ${action}.

Setting: ${setting}

Model Styling:
- Natural, authentic expression (${tone} mood)
- Clothing style that complements the product without overshadowing it
- ${visualStyle} aesthetic in overall presentation

Composition:
- Model positioned to showcase product naturally
- Eye contact with camera for engagement
- Lifestyle context that tells a story
- Product clearly visible and hero of the shot

Lighting:
- Flattering natural or studio lighting
- Highlights both model and product equally
- Maintains ${visualStyle} visual style`;
}

function getDemographic(tone: string): string {
  const demographics: Record<string, string> = {
    playful: "young, energetic",
    professional: "sophisticated, confident",
    bold: "strong, athletic",
    friendly: "approachable, diverse",
    energetic: "active, fit",
    "health-conscious": "wellness-focused, glowing",
  };

  return demographics[tone.toLowerCase()] || "natural, relatable";
}

function getSetting(visualStyle: string, category: string): string {
  if (category.includes("fashion") || category.includes("clothing")) {
    return visualStyle.includes("minimalist")
      ? "Clean studio backdrop with minimal props"
      : visualStyle.includes("urban")
      ? "Urban street setting with natural lighting"
      : "Contemporary indoor space with soft natural light";
  }

  if (category.includes("fitness") || category.includes("sports")) {
    return "Active fitness environment (gym, outdoor track, or yoga studio)";
  }

  if (category.includes("beauty") || category.includes("cosmetics")) {
    return "Clean, bright beauty setting with natural morning light";
  }

  return "Lifestyle environment that naturally incorporates the product";
}

function getAction(category: string): string {
  const actions: Record<string, string> = {
    shoes: "wearing the shoes in a walking or standing pose",
    sneakers: "wearing the sneakers in an active or casual pose",
    clothing: "wearing the clothing item naturally",
    apparel: "styled in the apparel with confident posture",
    accessories: "wearing or holding the accessory",
    jewelry: "wearing the jewelry piece elegantly",
    watch: "wearing the watch with wrist prominently visible",
    bag: "carrying or holding the bag naturally",
    backpack: "wearing the backpack in lifestyle context",
    cosmetics: "applying or showcasing the cosmetic product",
    skincare: "using the skincare product on face",
    perfume: "holding or applying the perfume",
    sunglasses: "wearing the sunglasses with stylish pose",
    fitness: "using the fitness product in workout context",
  };

  for (const [key, value] of Object.entries(actions)) {
    if (category.includes(key)) {
      return value;
    }
  }

  return "naturally interacting with the product";
}

function generateLifestyleInstructions(
  category: string,
  brandAnalysis: BrandAnalysis
): string {
  return `
**Lifestyle Context:**
Create a lifestyle scene showing the product in real-world use.

Scene Elements:
- Natural environment where product would be used
- Props and styling that complement ${brandAnalysis.brandName}'s aesthetic
- Authentic, relatable context (not overly staged)
- Product prominently featured but naturally integrated

Mood:
- ${brandAnalysis.tone} atmosphere
- Aspirational yet attainable
- Tells a story about product usage`;
}

function getComposition(tone: string): string {
  const lowerTone = tone.toLowerCase();

  if (COMPOSITION_BY_TONE[lowerTone]) {
    return COMPOSITION_BY_TONE[lowerTone];
  }

  for (const [key, value] of Object.entries(COMPOSITION_BY_TONE)) {
    if (lowerTone.includes(key) || key.includes(lowerTone)) {
      return value;
    }
  }

  return COMPOSITION_BY_TONE["professional"];
}

function getLighting(visualStyle: string): string {
  const lowerStyle = visualStyle.toLowerCase();

  if (LIGHTING_BY_STYLE[lowerStyle]) {
    return LIGHTING_BY_STYLE[lowerStyle];
  }

  for (const [key, value] of Object.entries(LIGHTING_BY_STYLE)) {
    if (lowerStyle.includes(key) || key.includes(lowerStyle)) {
      return value;
    }
  }

  return LIGHTING_BY_STYLE["modern"];
}

function getAspectRatio(adType: "instagram" | "tiktok"): string {
  return adType === "instagram" ? "1:1" : "9:16";
}

function getAdContext(adType: "instagram" | "tiktok"): string {
  if (adType === "instagram") {
    return "square Instagram feed post, designed for static viewing, high visual impact for scrolling users";
  }
  return "vertical TikTok/Reels format, optimized for mobile viewing, dynamic and eye-catching for short-form video platform";
}

export function generateAdPrompt(config: AdPromptConfig): string {
  const { brandAnalysis, productImages, adType, url } = config;

  // Detect if human model should be included
  const { needsHuman, isLifestyle, category } = detectProductCategory(
    brandAnalysis,
    url
  );

  const composition = getComposition(brandAnalysis.tone);
  const lighting = getLighting(brandAnalysis.visualStyle);
  const aspectRatio = getAspectRatio(adType);
  const adContext = getAdContext(adType);

  let prompt = `Create a professional ${adContext} advertisement for ${
    brandAnalysis.brandName
  }.

**Product Details:**
- Brand: ${brandAnalysis.brandName}
- Tagline: "${brandAnalysis.tagline}"
- Key Unique Selling Points:
  ${brandAnalysis.usps.map((usp, i) => `${i + 1}. ${usp}`).join("\n  ")}

**Visual Identity:**
- Brand Tone: ${brandAnalysis.tone}
- Visual Style: ${brandAnalysis.visualStyle}
- Primary Brand Color: ${brandAnalysis.colors.primary}
- Accent Color: ${brandAnalysis.colors.accent}
- Background Color: ${brandAnalysis.colors.background}
- Typography: ${brandAnalysis.fonts.join(", ")}`;

  // Add human model instructions if needed
  if (needsHuman) {
    prompt += `\n${generateHumanModelInstructions(
      category,
      brandAnalysis.tone,
      brandAnalysis.visualStyle
    )}`;
  } else if (isLifestyle) {
    prompt += `\n${generateLifestyleInstructions(category, brandAnalysis)}`;
  } else {
    // Pure product shot
    prompt += `\n
**Composition Direction:**
${composition}
Pure product photography - no human models.
Focus entirely on product presentation and brand aesthetic.`;
  }

  prompt += `

**Lighting & Atmosphere:**
${lighting}

**Product Integration:**
Use the ${
    productImages.length
  } uploaded product images as reference to maintain:
- Exact product appearance and packaging design
- Accurate brand colors and logo placement
- Proper product proportions and scale
- Consistent packaging details and textures
- Authentic product presentation

**Text Rendering:**
Include the tagline "${brandAnalysis.tagline}" prominently in the design.
Use ${brandAnalysis.fonts[0] || "clean sans-serif"} font family.
Ensure text is legible, well-positioned, and complements the overall composition.

**Technical Specifications:**
- Aspect Ratio: ${aspectRatio} (${
    adType === "instagram" ? "Instagram square" : "TikTok/Reels vertical"
  })
- Resolution: 4K (ultra-high quality)
- Style: Professional commercial ${brandAnalysis.visualStyle.toLowerCase()} photography
- Quality: Publication-ready, ad-campaign grade
- Mood: ${brandAnalysis.tone}, ${brandAnalysis.visualStyle}

**Final Output Requirements:**
- Photorealistic ${needsHuman ? "lifestyle" : "product"} representation
- Brand-consistent color palette
- Clear, professional composition
- High visual impact for ${
    adType === "instagram" ? "social media feed" : "short-form video platform"
  }
- Ready for immediate use in advertising campaigns

Maintain the authentic look and feel of ${
    brandAnalysis.brandName
  } while creating a compelling, 
scroll-stopping advertisement that highlights the product's unique qualities.`;

  return prompt;
}

export const PromptGeneratorService = {
  generateImagePrompt: generateAdPrompt,
};

export default PromptGeneratorService;
