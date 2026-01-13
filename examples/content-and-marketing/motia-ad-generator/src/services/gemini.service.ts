// src/services/gemini.service.ts
import { GoogleGenAI } from "@google/genai";
import { Logger } from "motia";

const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY;

export interface BrandAnalysis {
  brandName: string;
  tagline: string;
  usps: string[];
  colors: { primary: string; accent: string; background: string };
  fonts: string[];
  tone: string;
  visualStyle: string;
}

export async function filterProductImages(
  url: string,
  imageUrls: string[],
  logger?: Logger
): Promise<string[]> {
  if (!GOOGLE_CLOUD_API_KEY) {
    throw new Error("GOOGLE_CLOUD_API_KEY not set in environment variables");
  }

  logger?.info("Filtering product images", {
    url,
    imageUrls,
    imageUrlsLength: imageUrls.length,
  });

  const ai = new GoogleGenAI({
    apiKey: GOOGLE_CLOUD_API_KEY,
  });

  const model = "gemini-2.0-flash-001";

  const prompt = `You are an expert advertising creative director evaluating product images for premium ad campaigns.

Analyze these ${imageUrls.length} image URLs from ${url}:

${JSON.stringify(imageUrls, null, 2)}

TASK: Select the TOP 5 most advertisement-worthy product images based on professional advertising standards.

EVALUATION CRITERIA (in order of importance):

1. VISUAL QUALITY:
   - High resolution, sharp focus
   - Professional photography
   - Clean, uncluttered composition
   - Proper lighting and exposure

2. PRODUCT PRESENTATION:
   - Product is the clear hero/focal point
   - Shows key product features and details
   - Multiple angles showing different perspectives
   - Clean backgrounds (white, neutral, or minimal context)

3. ADVERTISING APPEAL:
   - Aspirational and compelling
   - Suitable for social media ads (Instagram/TikTok)
   - Product packaging clearly visible with branding
   - Commercial-quality that builds desire

4. DIVERSITY OF ANGLES:
   - Select images showing different product views
   - Front, side, detail shots, packaging variants
   - Avoid duplicate/similar angles

EXPLICITLY FILTER OUT:
- Blog/article images with text overlays
- Lifestyle editorial photos (people in non-product-focused shots)
- Low-resolution or blurry images
- Icons, logos, graphics, illustrations
- Images with heavy UI elements or text
- Group shots where product isn't the focus
- Behind-the-scenes or manufacturing photos

KEEP ONLY:
- Professional product shots on clean backgrounds
- Product packaging with clear branding
- Detail shots highlighting product features
- High-quality e-commerce style photography
- Carousel/gallery product images

Return ONLY a valid JSON array of exactly 5 URLs representing the absolute best images for creating scroll-stopping advertisements:

["url1", "url2", "url3", "url4", "url5"]`;

  const req = {
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      maxOutputTokens: 2048,
      temperature: 0.1, // Low temperature for consistent, focused selection
    },
  };

  const response = await ai.models.generateContent(req);
  //   logger?.info("Gemini API response", { response });
  const text = response.text ?? "";

  logger?.info("Gemini API response received", {
    responseLength: text.length,
    // text,
  });

  // Parse JSON response (handle potential markdown wrapping)
  let cleanText = text.trim();
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText
      .replace(/```json\n?/, "")
      .replace(/```$/, "")
      .trim();
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText
      .replace(/```\n?/, "")
      .replace(/```$/, "")
      .trim();
  }
  //   logger?.info("Raw Gemini response", { cleanText });
  const filtered = JSON.parse(cleanText);

  // Ensure we return exactly 5 (or fewer if less available)
  const top5 = Array.isArray(filtered) ? filtered.slice(0, 5) : [];

  logger?.info("Top 5 advertisement-worthy images selected", {
    selectedCount: top5.length,
  });

  return top5;
}

// src/services/gemini.service.ts (analyzeBrand function)

export async function analyzeBrand(
  url: string,
  screenshot: string,
  markdown: string,
  branding: any,
  productImages: string[],
  logger?: Logger
): Promise<BrandAnalysis> {
  if (!GOOGLE_CLOUD_API_KEY) {
    throw new Error("GOOGLE_CLOUD_API_KEY not set in environment variables");
  }

  const ai = new GoogleGenAI({
    apiKey: GOOGLE_CLOUD_API_KEY,
  });

  const model = "gemini-3-flash-preview";

  const generationConfig = {
    maxOutputTokens: 65535,
    temperature: 1,
    topP: 0.95,
    safetySettings: [
      {
        category: "HARM_CATEGORY_HATE_SPEECH" as const,
        threshold: "OFF" as const,
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT" as const,
        threshold: "OFF" as const,
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as const,
        threshold: "OFF" as const,
      },
      {
        category: "HARM_CATEGORY_HARASSMENT" as const,
        threshold: "OFF" as const,
      },
    ],
  };

  const prompt = `You are an expert advertising creative director analyzing a brand for a high-impact advertising campaign.
  
  Analyze this brand from ${url} for creating scroll-stopping Instagram and TikTok advertisements.
  
  Website Content (First 5000 chars):
  ${markdown.substring(0, 5000)}
  
  Branding Metadata:
  ${JSON.stringify(branding, null, 2)}
  
  TASK: Study the hero screenshot and product images to extract brand elements essential for creating cinematic, professional advertisements.
  
  EXTRACT THE FOLLOWING (with advertising focus):
  
  1. BRAND NAME:
     - The exact brand name as it should appear in ads
  
  2. TAGLINE/SLOGAN:
     - The main tagline or slogan that should be featured in video voiceovers or image text
     - If no explicit tagline, create a compelling 5-7 word tagline that captures the brand essence
  
  3. UNIQUE SELLING POINTS (Top 3 USPs):
     - The most compelling reasons someone would buy this product
     - Focus on emotional benefits and transformation, not just features
     - These will be used in ad copy and video narratives
  
  4. COLOR PALETTE (for visual consistency):
     - Primary color: The dominant brand color (hex code)
     - Accent color: Secondary color for emphasis (hex code)
     - Background color: Typical background/base color (hex code)
     - These must match the brand's visual identity for authentic ads
  
  5. TYPOGRAPHY:
     - Primary font(s) used in branding
     - Font style that matches brand personality (e.g., "modern sans-serif", "elegant serif")
  
  6. BRAND TONE (for copywriting & voiceover):
     - Choose ONE that best describes how the brand communicates:
     - Options: playful, professional, bold, friendly, luxury, energetic, calm, authentic, inspiring, edgy
     - This dictates the style of ad copy and video narration
  
  7. VISUAL STYLE (for cinematic direction):
     - Choose ONE that best describes the brand's aesthetic:
     - Options: minimalist, vibrant, organic, modern, vintage, industrial, elegant, rustic, futuristic
     - This guides lighting, composition, and overall ad production style
  
  CRITICAL: Analyze the images deeply. Look at:
  - How products are photographed (lighting, angles, styling)
  - The mood and atmosphere conveyed
  - Color grading and visual treatment
  - Typography in product packaging and website
  - Overall aesthetic and brand personality
  
  Return ONLY valid JSON in this exact format (no explanations, no markdown):
  
  {
    "brandName": "Exact Brand Name",
    "tagline": "Compelling tagline (5-7 words)",
    "usps": [
      "Benefit-focused USP 1",
      "Benefit-focused USP 2", 
      "Benefit-focused USP 3"
    ],
    "colors": {
      "primary": "#HEXCODE",
      "accent": "#HEXCODE",
      "background": "#HEXCODE"
    },
    "fonts": ["Primary Font", "Secondary Font or Style"],
    "tone": "single tone descriptor",
    "visualStyle": "single style descriptor"
  }`;

  // Prepare screenshot image (hero section)
  const screenshotImage = {
    fileData: {
      mimeType: "image/png" as const,
      fileUri: screenshot,
    },
  };

  // Prepare product images (top 5 product shots)
  const productImageParts = productImages.slice(0, 5).map((imgUrl) => ({
    fileData: {
      mimeType:
        imgUrl.toLowerCase().endsWith(".jpg") ||
        imgUrl.toLowerCase().endsWith(".jpeg")
          ? ("image/jpeg" as const)
          : ("image/png" as const),
      fileUri: imgUrl,
    },
  }));

  const req = {
    model,
    contents: [
      {
        role: "user" as const,
        parts: [screenshotImage, ...productImageParts, { text: prompt }],
      },
    ],
    generationConfig,
    systemInstruction:
      "You are an expert advertising creative director. Your analysis will be used to generate professional, scroll-stopping advertisements for Instagram and TikTok.",
  };

  logger?.info("Starting cinematic brand analysis", {
    url,
    totalImages: productImages.length + 1, // +1 for screenshot
  });

  const streamingResp = await ai.models.generateContentStream(req);

  let fullText = "";
  for await (const chunk of streamingResp) {
    if (chunk.text) {
      fullText += chunk.text;
    }
  }

  logger?.info("Brand analysis response received", {
    responseLength: fullText.length,
  });

  // Parse JSON response
  let cleanText = fullText.trim();
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText
      .replace(/```json\n?/, "")
      .replace(/```$/, "")
      .trim();
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText
      .replace(/```\n?/, "")
      .replace(/```$/, "")
      .trim();
  }

  logger?.info("Parsing brand analysis JSON", { cleanText });

  const brandAnalysis: BrandAnalysis = JSON.parse(cleanText);

  logger?.info("Brand analysis parsed successfully", {
    brandName: brandAnalysis.brandName,
    tone: brandAnalysis.tone,
    visualStyle: brandAnalysis.visualStyle,
  });

  return brandAnalysis;
}

export const GeminiService = {
  filterProductImages,
  analyzeBrand,
};

export default GeminiService;
