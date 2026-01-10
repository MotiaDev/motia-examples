// src/services/videoPromptGenerator.service.ts

import { Logger } from "motia";

export interface BrandAnalysis {
  brandName: string;
  tagline: string;
  usps: string[];
  colors: {
    primary: string;
    accent: string;
    background: string;
  };
  fonts: string[];
  tone: string;
  visualStyle: string;
}

export interface VideoPromptConfig {
  brandAnalysis: BrandAnalysis;
  productImages: string[]; // URLs of filtered product images
  screenshot?: string;
  adType: "instagram" | "tiktok";
}

export interface VideoPromptResult {
  prompt: string;
  reasoning: {
    productCategory: string;
    humanCount: number;
    genders: string[];
    setting: string;
    timeOfDay: string;
    cameraStyle: string;
  };
}

// ============================================================================
// PRODUCT CATEGORY DETECTION
// ============================================================================

interface ProductCategory {
  category: string;
  subcategory?: string;
  confidence: number;
}

function detectProductCategory(
  brandAnalysis: BrandAnalysis,
  productImages: string[],
  logger?: Logger
): ProductCategory {
  const brandName = brandAnalysis.brandName.toLowerCase();
  const tagline = brandAnalysis.tagline.toLowerCase();
  const usps = brandAnalysis.usps.join(" ").toLowerCase();
  const combinedText = `${brandName} ${tagline} ${usps}`;

  // Food & Beverage
  if (
    /\b(bar|snack|food|protein|nutrition|organic|superfood|energy|meal|bite|granola|cereal)\b/i.test(
      combinedText
    )
  ) {
    if (
      /\b(protein|fitness|energy|performance|workout)\b/i.test(combinedText)
    ) {
      return {
        category: "food",
        subcategory: "fitness_nutrition",
        confidence: 0.95,
      };
    }
    if (/\b(organic|natural|healthy|superfood|clean)\b/i.test(combinedText)) {
      return {
        category: "food",
        subcategory: "healthy_snack",
        confidence: 0.9,
      };
    }
    return { category: "food", subcategory: "general", confidence: 0.85 };
  }

  // Beverage
  if (
    /\b(drink|beverage|water|juice|coffee|tea|soda|energy drink)\b/i.test(
      combinedText
    )
  ) {
    if (/\b(energy|performance|workout|sports)\b/i.test(combinedText)) {
      return { category: "beverage", subcategory: "sports", confidence: 0.9 };
    }
    return { category: "beverage", subcategory: "lifestyle", confidence: 0.85 };
  }

  // Fashion & Apparel
  if (
    /\b(fashion|clothing|apparel|wear|shirt|dress|pants|jacket|coat|jeans|sweater)\b/i.test(
      combinedText
    )
  ) {
    if (/\b(luxury|designer|premium|haute|couture)\b/i.test(combinedText)) {
      return { category: "fashion", subcategory: "luxury", confidence: 0.95 };
    }
    if (/\b(athletic|sport|active|fitness|gym|workout)\b/i.test(combinedText)) {
      return {
        category: "fashion",
        subcategory: "activewear",
        confidence: 0.9,
      };
    }
    if (/\b(street|urban|casual|streetwear)\b/i.test(combinedText)) {
      return {
        category: "fashion",
        subcategory: "streetwear",
        confidence: 0.9,
      };
    }
    return { category: "fashion", subcategory: "general", confidence: 0.85 };
  }

  // Footwear
  if (/\b(shoe|sneaker|boot|sandal|footwear|kicks)\b/i.test(combinedText)) {
    if (/\b(athletic|running|sport|performance)\b/i.test(combinedText)) {
      return {
        category: "footwear",
        subcategory: "athletic",
        confidence: 0.95,
      };
    }
    if (/\b(luxury|designer|premium)\b/i.test(combinedText)) {
      return { category: "footwear", subcategory: "luxury", confidence: 0.9 };
    }
    return { category: "footwear", subcategory: "casual", confidence: 0.85 };
  }

  // Cosmetics & Beauty
  if (
    /\b(cosmetic|makeup|beauty|lipstick|foundation|mascara|eyeshadow|blush)\b/i.test(
      combinedText
    )
  ) {
    if (/\b(luxury|premium|haute|high-end)\b/i.test(combinedText)) {
      return { category: "cosmetics", subcategory: "luxury", confidence: 0.95 };
    }
    return { category: "cosmetics", subcategory: "general", confidence: 0.9 };
  }

  // Skincare
  if (
    /\b(skincare|skin care|moisturizer|serum|cream|lotion|cleanser|toner|anti-aging)\b/i.test(
      combinedText
    )
  ) {
    return { category: "skincare", subcategory: "general", confidence: 0.95 };
  }

  // Fragrance
  if (/\b(perfume|cologne|fragrance|scent|eau de)\b/i.test(combinedText)) {
    if (/\b(men|masculine|homme)\b/i.test(combinedText)) {
      return { category: "fragrance", subcategory: "mens", confidence: 0.95 };
    }
    if (/\b(women|feminine|femme)\b/i.test(combinedText)) {
      return { category: "fragrance", subcategory: "womens", confidence: 0.95 };
    }
    return { category: "fragrance", subcategory: "unisex", confidence: 0.85 };
  }

  // Accessories
  if (
    /\b(bag|handbag|purse|backpack|wallet|belt|hat|cap|scarf|gloves|accessory|accessories)\b/i.test(
      combinedText
    )
  ) {
    return {
      category: "accessories",
      subcategory: "general",
      confidence: 0.85,
    };
  }

  // Jewelry & Watches
  if (
    /\b(jewelry|jewellery|necklace|bracelet|ring|earring|watch)\b/i.test(
      combinedText
    )
  ) {
    if (/\b(luxury|premium|designer|fine)\b/i.test(combinedText)) {
      return { category: "jewelry", subcategory: "luxury", confidence: 0.95 };
    }
    return { category: "jewelry", subcategory: "general", confidence: 0.9 };
  }

  // Fitness & Wellness
  if (
    /\b(fitness|gym|workout|exercise|training|supplement|vitamin|wellness|health)\b/i.test(
      combinedText
    )
  ) {
    return { category: "fitness", subcategory: "general", confidence: 0.9 };
  }

  // Tech & Electronics
  if (
    /\b(tech|technology|electronic|phone|smartphone|tablet|laptop|headphone|earbud|speaker|gadget)\b/i.test(
      combinedText
    )
  ) {
    if (/\b(lifestyle|personal|portable|wearable)\b/i.test(combinedText)) {
      return { category: "tech", subcategory: "lifestyle", confidence: 0.9 };
    }
    return { category: "tech", subcategory: "general", confidence: 0.85 };
  }

  // Home & Lifestyle
  if (
    /\b(home|furniture|decor|interior|kitchen|appliance)\b/i.test(combinedText)
  ) {
    return { category: "home", subcategory: "general", confidence: 0.8 };
  }

  // Default fallback
  logger?.warn(
    "Could not confidently detect product category, using lifestyle default"
  );
  return { category: "lifestyle", subcategory: "general", confidence: 0.6 };
}

// ============================================================================
// HUMAN MODEL REQUIREMENTS
// ============================================================================

interface HumanRequirement {
  needed: boolean;
  count: number; // 0, 1, or 2
  reasoning: string;
}

function determineHumanRequirement(
  category: ProductCategory,
  brandAnalysis: BrandAnalysis
): HumanRequirement {
  const { category: cat, subcategory: subcat } = category;

  // ALWAYS need human
  const alwaysHumanCategories = [
    "fashion",
    "footwear",
    "cosmetics",
    "skincare",
    "fragrance",
    "accessories",
    "jewelry",
    "fitness",
  ];

  if (alwaysHumanCategories.includes(cat)) {
    // Determine if 2 humans would be better
    const tone = brandAnalysis.tone.toLowerCase();
    const visualStyle = brandAnalysis.visualStyle.toLowerCase();

    // Two humans for: romantic, social, lifestyle, couple-focused
    if (
      /\b(romantic|couple|together|social|shared|connection|lifestyle)\b/i.test(
        `${tone} ${visualStyle}`
      ) &&
      cat === "fragrance"
    ) {
      return {
        needed: true,
        count: 2,
        reasoning:
          "Fragrance with romantic/couple context benefits from two models",
      };
    }

    return {
      needed: true,
      count: 1,
      reasoning: `${cat} products require human model to showcase product in use`,
    };
  }

  // CONDITIONAL for food/beverage
  if (cat === "food" || cat === "beverage") {
    if (subcat === "fitness_nutrition" || subcat === "sports") {
      return {
        needed: true,
        count: 1,
        reasoning:
          "Fitness/sports nutrition benefits from athletic human model",
      };
    }

    // Lifestyle angle for premium/healthy
    const tone = brandAnalysis.tone.toLowerCase();
    if (/\b(lifestyle|premium|authentic|real|genuine)\b/i.test(tone)) {
      return {
        needed: true,
        count: 1,
        reasoning:
          "Lifestyle-focused food/beverage benefits from relatable human context",
      };
    }

    // Default to product-only for food
    return {
      needed: false,
      count: 0,
      reasoning: "Food product showcases better with product-only focus",
    };
  }

  // CONDITIONAL for tech
  if (cat === "tech") {
    if (subcat === "lifestyle") {
      return {
        needed: true,
        count: 1,
        reasoning: "Lifestyle tech products benefit from human demonstration",
      };
    }

    return {
      needed: false,
      count: 0,
      reasoning:
        "Tech product showcases better with clean product-focused aesthetic",
    };
  }

  // Default: no human
  return {
    needed: false,
    count: 0,
    reasoning: "Product category works best with product-only showcase",
  };
}

// ============================================================================
// GENDER DETECTION
// ============================================================================

type Gender = "male" | "female" | "diverse";

interface GenderSelection {
  primary: Gender;
  secondary?: Gender; // For 2-person scenes
  reasoning: string;
}

function detectGender(
  category: ProductCategory,
  brandAnalysis: BrandAnalysis,
  humanCount: number
): GenderSelection {
  const brandText = `${brandAnalysis.brandName} ${
    brandAnalysis.tagline
  } ${brandAnalysis.usps.join(" ")}`.toLowerCase();
  const tone = brandAnalysis.tone.toLowerCase();

  // Explicit gender signals
  const maleSignals = /\b(men|mens|man|masculine|homme|male|guy|beard|mr)\b/i;
  const femaleSignals =
    /\b(women|womens|woman|feminine|femme|female|lady|her|miss|mrs)\b/i;

  const hasMaleSignal = maleSignals.test(brandText);
  const hasFemaleSignal = femaleSignals.test(brandText);

  // Two humans needed
  if (humanCount === 2) {
    if (category.category === "fragrance") {
      return {
        primary: "male",
        secondary: "female",
        reasoning: "Romantic fragrance ad with couple dynamic",
      };
    }

    return {
      primary: "diverse",
      secondary: "diverse",
      reasoning: "Inclusive representation with diverse cast",
    };
  }

  // Single human
  // Check explicit signals first
  if (hasMaleSignal && !hasFemaleSignal) {
    return {
      primary: "male",
      reasoning: "Brand explicitly targets male audience",
    };
  }

  if (hasFemaleSignal && !hasMaleSignal) {
    return {
      primary: "female",
      reasoning: "Brand explicitly targets female audience",
    };
  }

  // Category defaults
  const { category: cat, subcategory: subcat } = category;

  if (cat === "cosmetics" || cat === "skincare") {
    if (/\b(men|masculine)\b/i.test(brandText)) {
      return { primary: "male", reasoning: "Men's skincare/cosmetics product" };
    }
    return {
      primary: "female",
      reasoning: "Skincare/cosmetics traditionally female-focused",
    };
  }

  if (cat === "fragrance") {
    if (subcat === "mens") {
      return { primary: "male", reasoning: "Men's fragrance" };
    }
    if (subcat === "womens") {
      return { primary: "female", reasoning: "Women's fragrance" };
    }
    return {
      primary: "diverse",
      reasoning: "Unisex fragrance with inclusive representation",
    };
  }

  if (cat === "fitness") {
    if (hasMaleSignal)
      return { primary: "male", reasoning: "Male-focused fitness product" };
    if (hasFemaleSignal)
      return { primary: "female", reasoning: "Female-focused fitness product" };
    // Check for body building vs general fitness
    if (/\b(muscle|bulk|mass|strength|bodybuilding)\b/i.test(brandText)) {
      return {
        primary: "male",
        reasoning: "Muscle-building product traditionally male-focused",
      };
    }
    if (/\b(tone|sculpt|lean|wellness|yoga|pilates)\b/i.test(brandText)) {
      return {
        primary: "female",
        reasoning: "Toning/wellness product traditionally female-focused",
      };
    }
  }

  if (cat === "fashion") {
    if (subcat === "streetwear") {
      return {
        primary: "male",
        reasoning: "Streetwear traditionally male-dominated",
      };
    }
    if (subcat === "luxury") {
      return {
        primary: "female",
        reasoning: "Luxury fashion traditionally female-focused",
      };
    }
  }

  // Default: use diverse/inclusive
  return {
    primary: "diverse",
    reasoning: "Gender-neutral product with inclusive representation",
  };
}

// ============================================================================
// MODEL DESCRIPTION BUILDER
// ============================================================================

interface ModelDescription {
  age: string;
  gender: string;
  ethnicity: string;
  bodyType: string;
  hair: string;
  styling: string;
  expression: string;
  clothing: string;
}

function buildModelDescription(
  gender: Gender,
  category: ProductCategory,
  brandAnalysis: BrandAnalysis
): ModelDescription {
  const tone = brandAnalysis.tone.toLowerCase();
  const visualStyle = brandAnalysis.visualStyle.toLowerCase();

  // AGE SELECTION
  let age = "late 20s";
  if (/\b(young|gen z|youth|teen|college)\b/i.test(tone)) {
    age = "early 20s";
  } else if (/\b(mature|sophisticated|executive|professional)\b/i.test(tone)) {
    age = "mid 30s to early 40s";
  } else if (/\b(luxury|premium|high-end)\b/i.test(visualStyle)) {
    age = "early 30s";
  }

  // ETHNICITY (Inclusive by default, category-specific)
  let ethnicity = "diverse ethnicity";
  // Can be more specific if brand signals indicate

  // BODY TYPE
  let bodyType = "fit athletic build";
  if (category.category === "fitness") {
    if (category.subcategory === "fitness_nutrition") {
      bodyType =
        gender === "male"
          ? "muscular athletic physique"
          : "toned athletic figure";
    }
  } else if (category.category === "fashion") {
    if (category.subcategory === "luxury") {
      bodyType = "model physique";
    } else if (category.subcategory === "activewear") {
      bodyType = "athletic toned build";
    } else {
      bodyType = "contemporary fit build";
    }
  } else if (
    category.category === "cosmetics" ||
    category.category === "skincare"
  ) {
    bodyType = "natural proportions";
  }

  // Inclusive body positivity signals
  if (/\b(inclusive|real|authentic|body positive|all bodies)\b/i.test(tone)) {
    bodyType = "authentic everyday build";
  }

  // HAIR
  let hair = "";
  if (gender === "female") {
    if (/\b(natural|organic|authentic)\b/i.test(visualStyle)) {
      hair = "natural flowing hair";
    } else if (/\b(sleek|modern|professional)\b/i.test(visualStyle)) {
      hair = "sleek styled hair";
    } else if (/\b(bold|edgy|vibrant)\b/i.test(tone)) {
      hair = "bold styled hair";
    } else {
      hair = "soft wavy hair";
    }
  } else if (gender === "male") {
    if (/\b(professional|executive|premium)\b/i.test(tone)) {
      hair = "well-groomed short hair";
    } else if (/\b(casual|authentic|natural)\b/i.test(tone)) {
      hair = "natural textured hair";
    } else {
      hair = "modern styled hair";
    }
  }

  // STYLING (Makeup/Grooming)
  let styling = "";
  if (gender === "female") {
    if (category.category === "cosmetics") {
      styling = "bold editorial makeup highlighting product";
    } else if (category.category === "skincare") {
      styling = "minimal natural makeup showcasing glowing skin";
    } else if (/\b(natural|organic|authentic)\b/i.test(tone)) {
      styling = "minimal natural makeup";
    } else if (/\b(luxury|premium|high-end)\b/i.test(visualStyle)) {
      styling = "polished sophisticated makeup";
    } else {
      styling = "fresh natural makeup";
    }
  } else if (gender === "male") {
    if (/\b(masculine|rugged)\b/i.test(tone)) {
      styling = "subtle facial hair, rugged grooming";
    } else if (/\b(professional|executive)\b/i.test(tone)) {
      styling = "clean-shaven professional grooming";
    } else {
      styling = "well-groomed natural look";
    }
  }

  // EXPRESSION
  let expression = "confident genuine smile";
  if (/\b(serious|dramatic|powerful|bold)\b/i.test(tone)) {
    expression = "confident intense gaze";
  } else if (/\b(playful|fun|energetic)\b/i.test(tone)) {
    expression = "joyful energetic expression";
  } else if (/\b(serene|calm|peaceful)\b/i.test(tone)) {
    expression = "serene peaceful expression";
  } else if (/\b(luxury|premium|sophisticated)\b/i.test(visualStyle)) {
    expression = "sophisticated composed demeanor";
  }

  // CLOTHING
  let clothing = "";
  if (category.category === "fashion" || category.category === "footwear") {
    // Wearing the product
    clothing = "wearing the featured product from collection";
  } else if (category.category === "fitness") {
    clothing = "athletic activewear";
  } else if (
    category.category === "cosmetics" ||
    category.category === "skincare"
  ) {
    clothing = "simple elegant top, focus on face";
  } else if (/\b(luxury|premium|sophisticated)\b/i.test(visualStyle)) {
    clothing = "elegant modern attire";
  } else if (/\b(casual|authentic|lifestyle)\b/i.test(tone)) {
    clothing = "casual contemporary clothing";
  } else {
    clothing = "stylish modern outfit";
  }

  return {
    age,
    gender: gender === "diverse" ? "diverse" : gender,
    ethnicity,
    bodyType,
    hair,
    styling,
    expression,
    clothing,
  };
}

function formatModelDescription(
  model: ModelDescription,
  gender: Gender
): string {
  const genderPrefix =
    gender === "male" ? "man" : gender === "female" ? "woman" : "person";

  return `${
    model.gender !== "diverse" ? model.gender : ""
  } ${genderPrefix} in ${model.age}, ${model.ethnicity}, ${model.bodyType}, ${
    model.hair
  }, ${model.styling}, ${model.expression}, ${model.clothing}`.trim();
}

// ============================================================================
// SETTING DETERMINATION (INDOOR/OUTDOOR)
// ============================================================================

interface Setting {
  type: "indoor" | "outdoor";
  description: string;
  timeOfDay?: string;
  lighting: string;
}

function determineOptimalSetting(
  category: ProductCategory,
  brandAnalysis: BrandAnalysis
): Setting {
  const { category: cat, subcategory: subcat } = category;
  const tone = brandAnalysis.tone.toLowerCase();
  const visualStyle = brandAnalysis.visualStyle.toLowerCase();

  // FOOD & BEVERAGE
  if (cat === "food") {
    if (subcat === "fitness_nutrition") {
      return {
        type: "outdoor",
        description:
          "outdoor athletic setting, running track or gym exterior with natural light",
        timeOfDay: "early morning",
        lighting: "golden hour natural sunlight",
      };
    }
    if (subcat === "healthy_snack") {
      if (/\b(natural|organic|outdoor)\b/i.test(visualStyle)) {
        return {
          type: "outdoor",
          description: "sunny outdoor park setting with farmer's market vibe",
          timeOfDay: "mid-morning",
          lighting: "bright natural sunlight with soft shadows",
        };
      }
    }
    // Default indoor for food
    return {
      type: "indoor",
      description:
        "bright modern kitchen with marble countertops and large windows",
      timeOfDay: "morning",
      lighting: "natural window light streaming in, warm and inviting",
    };
  }

  if (cat === "beverage") {
    if (subcat === "sports") {
      return {
        type: "outdoor",
        description:
          "outdoor fitness environment, basketball court or athletic field",
        timeOfDay: "afternoon",
        lighting: "dynamic natural lighting with energy",
      };
    }
    // Lifestyle beverages
    return {
      type: "outdoor",
      description: "urban outdoor cafe setting or rooftop terrace",
      timeOfDay: "afternoon",
      lighting: "natural daylight with urban atmosphere",
    };
  }

  // FASHION & FOOTWEAR
  if (cat === "fashion") {
    if (subcat === "streetwear") {
      return {
        type: "outdoor",
        description:
          "urban city street with graffiti walls and modern architecture",
        timeOfDay: "late afternoon",
        lighting: "natural daylight with urban edge",
      };
    }
    if (subcat === "activewear") {
      return {
        type: "outdoor",
        description:
          "outdoor athletic environment, park or modern gym exterior",
        timeOfDay: "golden hour",
        lighting: "warm golden sunlight highlighting movement",
      };
    }
    if (subcat === "luxury") {
      return {
        type: "indoor",
        description:
          "elegant boutique interior with marble floors and soft architectural lighting",
        lighting: "sophisticated soft spotlight with dramatic shadows",
      };
    }
    // Default fashion
    return {
      type: "outdoor",
      description: "contemporary urban environment with clean modern backdrop",
      timeOfDay: "afternoon",
      lighting: "natural even daylight",
    };
  }

  if (cat === "footwear") {
    if (subcat === "athletic") {
      return {
        type: "outdoor",
        description:
          "urban outdoor athletic setting, concrete plaza or running track",
        timeOfDay: "early morning",
        lighting: "crisp morning light emphasizing movement",
      };
    }
    if (subcat === "luxury") {
      return {
        type: "indoor",
        description: "minimalist high-end interior with polished surfaces",
        lighting: "dramatic directional lighting with strong shadows",
      };
    }
    return {
      type: "outdoor",
      description: "urban outdoor setting with modern architecture",
      timeOfDay: "afternoon",
      lighting: "natural balanced lighting",
    };
  }

  // COSMETICS & SKINCARE
  if (cat === "cosmetics") {
    if (/\b(bold|vibrant|editorial)\b/i.test(tone)) {
      return {
        type: "indoor",
        description:
          "fashion editorial studio with dramatic backdrop and professional lighting",
        lighting: "dramatic beauty lighting with strong key light",
      };
    }
    return {
      type: "indoor",
      description:
        "bright vanity area with Hollywood mirror lights and clean aesthetic",
      lighting: "even soft lighting highlighting makeup details",
    };
  }

  if (cat === "skincare") {
    return {
      type: "indoor",
      description:
        "spa-like bathroom with white marble surfaces and large mirror",
      timeOfDay: "morning",
      lighting: "soft natural window light creating serene glow",
    };
  }

  // FRAGRANCE
  if (cat === "fragrance") {
    if (subcat === "mens") {
      return {
        type: "indoor",
        description:
          "sophisticated modern interior, executive office or upscale lounge",
        timeOfDay: "evening",
        lighting: "dramatic moody lighting with warm amber tones",
      };
    }
    if (subcat === "womens") {
      if (/\b(romantic|elegant|luxury)\b/i.test(tone)) {
        return {
          type: "indoor",
          description:
            "elegant romantic interior with soft drapery and refined ambiance",
          timeOfDay: "evening",
          lighting: "soft romantic lighting with gentle warmth",
        };
      }
      return {
        type: "outdoor",
        description: "beautiful outdoor garden or terrace at sunset",
        timeOfDay: "golden hour",
        lighting: "warm golden sunset light creating romantic mood",
      };
    }
    // Unisex
    return {
      type: "outdoor",
      description: "modern urban rooftop or contemporary outdoor space",
      timeOfDay: "twilight",
      lighting: "soft twilight with city lights beginning to glow",
    };
  }

  // ACCESSORIES & JEWELRY
  if (cat === "accessories" || cat === "jewelry") {
    if (/\b(luxury|premium|high-end)\b/i.test(visualStyle)) {
      return {
        type: "indoor",
        description:
          "luxurious interior with velvet textures and elegant surfaces",
        lighting: "dramatic lighting highlighting metallic details and jewels",
      };
    }
    return {
      type: "outdoor",
      description: "stylish urban environment with modern aesthetic",
      timeOfDay: "afternoon",
      lighting: "natural light accentuating product details",
    };
  }

  // FITNESS
  if (cat === "fitness") {
    return {
      type: "outdoor",
      description:
        "dynamic outdoor fitness environment, park or athletic field",
      timeOfDay: "early morning",
      lighting: "energizing morning light emphasizing athleticism",
    };
  }

  // TECH
  if (cat === "tech") {
    if (subcat === "lifestyle") {
      return {
        type: "outdoor",
        description:
          "modern urban lifestyle setting, coffee shop exterior or commute scene",
        timeOfDay: "morning",
        lighting: "natural daylight with contemporary feel",
      };
    }
    return {
      type: "indoor",
      description: "minimalist modern interior with clean white backdrop",
      lighting: "clean even studio lighting highlighting product details",
    };
  }

  // DEFAULT
  return {
    type: "indoor",
    description: "contemporary modern interior with natural elements",
    timeOfDay: "day",
    lighting: "balanced natural and artificial lighting",
  };
}

// ============================================================================
// CAMERA MOVEMENT SELECTION
// ============================================================================

function selectCameraMovement(
  tone: string,
  settingType: "indoor" | "outdoor"
): string {
  const lowerTone = tone.toLowerCase();

  // Energetic/Dynamic
  if (/\b(energetic|dynamic|bold|powerful|vibrant)\b/i.test(lowerTone)) {
    return "Dynamic camera movement with quick zoom in on product interaction, smooth tracking shot following subject movement, rapid but controlled pacing";
  }

  // Playful/Fun
  if (/\b(playful|fun|cheerful|joyful)\b/i.test(lowerTone)) {
    return "Playful camera movements with gentle bounces, following subject in upbeat rhythm, smooth handheld style for authentic feel";
  }

  // Professional/Sophisticated
  if (/\b(professional|sophisticated|premium|executive)\b/i.test(lowerTone)) {
    return "Slow smooth dolly forward creating elegant approach, gentle 360-degree rotation around subject, refined cinematic movements";
  }

  // Luxury/High-end
  if (/\b(luxury|luxurious|high-end|exclusive)\b/i.test(lowerTone)) {
    return "Ultra-slow dramatic dolly in from low angle, smooth 180-degree arc around subject, cinematic prestige movements";
  }

  // Calm/Serene
  if (/\b(calm|serene|peaceful|gentle|tranquil)\b/i.test(lowerTone)) {
    return "Gentle floating camera movements, slow steady push in, smooth and peaceful pacing";
  }

  // Authentic/Natural
  if (/\b(authentic|natural|genuine|real)\b/i.test(lowerTone)) {
    return "Handheld-style tracking shot for authenticity, smooth following movements, documentary-style approach";
  }

  // Default
  if (settingType === "outdoor") {
    return "Smooth tracking shot following subject naturally, gentle dolly forward for intimacy, steady cam style movements";
  } else {
    return "Smooth dolly forward into scene, gentle rotation around product focus, professional steady movements";
  }
}

// ============================================================================
// LIGHTING SELECTION
// ============================================================================

function selectLightingStyle(
  settingType: "indoor" | "outdoor",
  visualStyle: string,
  timeOfDay?: string
): string {
  const lowerStyle = visualStyle.toLowerCase();

  if (settingType === "outdoor") {
    if (timeOfDay === "golden hour" || timeOfDay === "early morning") {
      return "Warm golden hour sunlight creating soft shadows and warm glow, natural directional lighting emphasizing depth";
    }
    if (timeOfDay === "morning" || timeOfDay === "mid-morning") {
      return "Bright natural morning sunlight with crisp clarity, soft shadows, energizing light quality";
    }
    if (timeOfDay === "afternoon") {
      return "Natural balanced daylight with even illumination, subtle shadows adding dimension";
    }
    if (timeOfDay === "twilight" || timeOfDay === "evening") {
      return "Soft twilight with ambient city lights beginning to glow, romantic dusky atmosphere";
    }
    return "Natural outdoor lighting with balanced exposure, soft organic shadows";
  }

  // Indoor lighting
  if (/\b(minimalist|clean|modern)\b/i.test(lowerStyle)) {
    return "Clean even studio lighting creating bright clarity, minimal shadows, professional commercial quality";
  }

  if (/\b(luxury|premium|sophisticated|elegant)\b/i.test(lowerStyle)) {
    return "Dramatic directional lighting with strong shadows creating depth, warm accent lights highlighting key elements, cinematic quality";
  }

  if (/\b(natural|organic|authentic)\b/i.test(lowerStyle)) {
    return "Soft natural window light streaming in, warm inviting glow, authentic domestic lighting feel";
  }

  if (/\b(vibrant|colorful|energetic)\b/i.test(lowerStyle)) {
    return "Bright saturated lighting with vibrant color temperature, energetic illumination emphasizing boldness";
  }

  if (/\b(moody|dramatic|dark)\b/i.test(lowerStyle)) {
    return "Moody dramatic lighting with strong contrasts, selective illumination creating mystery, cinematic shadows";
  }

  // Default indoor
  return "Balanced professional lighting with soft key light, subtle fill creating natural depth, commercial quality illumination";
}

// ============================================================================
// AUDIO/SOUND DESIGN
// ============================================================================

function generateAudioDescription(
  category: ProductCategory,
  tone: string,
  humanPresent: boolean
): string {
  const lowerTone = tone.toLowerCase();
  const { category: cat } = category;

  let ambientSound = "";
  let music = "";

  // Ambient sounds
  if (humanPresent) {
    if (cat === "food" || cat === "beverage") {
      ambientSound =
        "Subtle product interaction sounds (unwrapping, pouring, satisfying crunch)";
    } else if (cat === "cosmetics" || cat === "skincare") {
      ambientSound = "Soft product application sounds, gentle textures";
    } else if (cat === "fitness") {
      ambientSound = "Subtle athletic movement sounds, fabric rustling";
    } else {
      ambientSound = "Natural ambient environmental sounds";
    }
  } else {
    ambientSound = "Clean minimal ambient soundscape";
  }

  // Music style
  if (/\b(energetic|dynamic|bold|powerful)\b/i.test(lowerTone)) {
    music = "upbeat energetic music with driving rhythm building excitement";
  } else if (/\b(playful|fun|cheerful)\b/i.test(lowerTone)) {
    music = "cheerful upbeat acoustic music creating joyful mood";
  } else if (/\b(luxury|premium|sophisticated)\b/i.test(lowerTone)) {
    music =
      "sophisticated orchestral strings or elegant piano creating prestige";
  } else if (/\b(calm|serene|peaceful)\b/i.test(lowerTone)) {
    music = "soft ambient music with gentle spa-like tones";
  } else if (/\b(authentic|natural|genuine)\b/i.test(lowerTone)) {
    music =
      "warm acoustic guitar or natural instrumental creating authentic feel";
  } else {
    music =
      "modern subtle background music enhancing mood without overpowering";
  }

  return `${ambientSound}, ${music}`;
}

// ============================================================================
// FINAL PROMPT ASSEMBLY
// ============================================================================

export async function generateVideoPrompt(
  config: VideoPromptConfig,
  logger?: Logger
): Promise<VideoPromptResult> {
  const { brandAnalysis, productImages, adType } = config;

  logger?.info("Starting ultra-intelligent video prompt generation", {
    brandName: brandAnalysis.brandName,
    adType,
  });

  // 1. Detect product category
  const category = detectProductCategory(brandAnalysis, productImages, logger);
  logger?.info("Detected product category", {
    category: category.category,
    subcategory: category.subcategory,
    confidence: category.confidence,
  });

  // 2. Determine human requirement
  const humanReq = determineHumanRequirement(category, brandAnalysis);
  logger?.info("Determined human requirement", {
    needed: humanReq.needed,
    count: humanReq.count,
    reasoning: humanReq.reasoning,
  });

  // 3. Determine gender(s) if human needed
  let genderSelection: GenderSelection | null = null;
  let model1Desc: ModelDescription | null = null;
  let model2Desc: ModelDescription | null = null;

  if (humanReq.needed) {
    genderSelection = detectGender(category, brandAnalysis, humanReq.count);
    logger?.info("Detected gender selection", genderSelection);

    // Build model description(s)
    model1Desc = buildModelDescription(
      genderSelection.primary,
      category,
      brandAnalysis
    );

    if (humanReq.count === 2 && genderSelection.secondary) {
      model2Desc = buildModelDescription(
        genderSelection.secondary,
        category,
        brandAnalysis
      );
    }
  }

  // 4. Determine setting
  const setting = determineOptimalSetting(category, brandAnalysis);
  logger?.info("Determined optimal setting", {
    type: setting.type,
    description: setting.description,
  });

  // 5. Select camera movement
  const cameraMovement = selectCameraMovement(brandAnalysis.tone, setting.type);

  // 6. Select lighting
  const lightingStyle = selectLightingStyle(
    setting.type,
    brandAnalysis.visualStyle,
    setting.timeOfDay
  );

  // 7. Generate audio description
  const audioDesc = generateAudioDescription(
    category,
    brandAnalysis.tone,
    humanReq.needed
  );

  // 8. Build scene description
  let sceneDescription = "";

  if (humanReq.needed && model1Desc && genderSelection) {
    const model1 = formatModelDescription(model1Desc, genderSelection.primary);

    if (humanReq.count === 2 && model2Desc && genderSelection.secondary) {
      const model2 = formatModelDescription(
        model2Desc,
        genderSelection.secondary
      );
      sceneDescription = `Scene: ${model1} and ${model2} interact naturally with ${brandAnalysis.brandName} in ${setting.description}. `;
    } else {
      sceneDescription = `Scene: ${model1} interacts naturally with ${brandAnalysis.brandName} in ${setting.description}. `;
    }

    // Add product context
    sceneDescription += `Product prominently featured with ${brandAnalysis.brandName} branding clearly visible. `;

    // Add action based on category
    if (category.category === "food" || category.category === "beverage") {
      sceneDescription += `Subject takes ${brandAnalysis.brandName}, genuine satisfaction and enjoyment visible on face. `;
    } else if (
      category.category === "cosmetics" ||
      category.category === "skincare"
    ) {
      sceneDescription += `Subject applies product with care, showing visible results and satisfaction. `;
    } else if (
      category.category === "fashion" ||
      category.category === "footwear"
    ) {
      sceneDescription += `Subject showcases product naturally through movement and confident posture. `;
    } else if (category.category === "fragrance") {
      sceneDescription += `Subject applies fragrance with elegant gesture, expressing confidence and allure. `;
    } else if (category.category === "fitness") {
      sceneDescription += `Subject demonstrates product in dynamic athletic motion, showing strength and energy. `;
    } else {
      sceneDescription += `Subject demonstrates product with genuine authentic interaction. `;
    }
  } else {
    // Product-only scene
    sceneDescription = `Scene: ${brandAnalysis.brandName} featured prominently in ${setting.description}. `;
    sceneDescription += `Product displayed elegantly with branding clearly visible, hero shot emphasizing key features. `;

    // Add motion for product
    if (category.category === "food") {
      sceneDescription += `Product components artfully arranged, showing textures and ingredients beautifully. `;
    } else {
      sceneDescription += `Product positioned for maximum visual impact and brand recognition. `;
    }
  }

  // Add setting time context
  if (setting.timeOfDay) {
    sceneDescription += `${setting.timeOfDay} setting creating perfect atmosphere. `;
  }

  // 9. Build style description
  const styleDescription = `Style: ${brandAnalysis.visualStyle} aesthetic with ${brandAnalysis.tone} mood, ${lightingStyle}. Commercial-quality cinematic production value.`;

  // 10. Build motion description
  const motionDescription = `Motion: ${cameraMovement}`;

  // 11. Build camera description
  const cameraDescription = `Camera: Professional ${
    adType === "instagram" ? "1:1 square format" : "9:16 vertical format"
  } optimized for social media, maintaining sharp focus on product and ${
    humanReq.needed ? "subject interaction" : "product details"
  }`;

  // 12. Build audio description
  const audioDescription = `Audio: ${audioDesc}`;

  // 13. Add technical specs
  const technicalSpecs = `Duration: ${
    adType === "tiktok" ? "10" : "8"
  } seconds, high-quality ${
    adType === "instagram" ? "1:1" : "9:16"
  } format, professional commercial production quality`;

  // 14. Assemble final prompt
  const finalPrompt = `${sceneDescription}

${styleDescription}

${motionDescription}

${cameraDescription}

${audioDescription}

${technicalSpecs}`;

  logger?.info("Generated ultra-intelligent video prompt", {
    promptLength: finalPrompt.length,
    hasHuman: humanReq.needed,
    humanCount: humanReq.count,
  });

  return {
    prompt: finalPrompt,
    reasoning: {
      productCategory: `${category.category}${
        category.subcategory ? ` - ${category.subcategory}` : ""
      }`,
      humanCount: humanReq.count,
      genders: genderSelection
        ? ([genderSelection.primary, genderSelection.secondary].filter(
            Boolean
          ) as string[])
        : [],
      setting: `${setting.type} - ${setting.description}`,
      timeOfDay: setting.timeOfDay || "unspecified",
      cameraStyle: cameraMovement.split(",")[0],
    },
  };
}

export const VideoPromptGeneratorService = {
  generateVideoPrompt,
};

export default VideoPromptGeneratorService;
