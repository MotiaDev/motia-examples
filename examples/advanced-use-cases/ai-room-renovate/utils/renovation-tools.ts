/**
 * Renovation Tools - Utility functions for cost estimation, timeline calculation
 * Ported from the Python AI Home Renovation Agent
 */

export interface CostEstimate {
  totalLow: number;
  totalHigh: number;
  roomType: string;
  scope: string;
  squareFootage: number;
  description: string;
}

export interface TimelineEstimate {
  duration: string;
  scope: string;
  roomType: string;
  description: string;
}

/**
 * Estimate renovation costs based on room type and scope
 */
export function estimateRenovationCost(
  roomType: string,
  scope: string,
  squareFootage: number
): CostEstimate {
  // Cost per sq ft estimates (2024 ranges)
  const rates: Record<string, Record<string, [number, number]>> = {
    kitchen: {
      cosmetic: [50, 100],
      moderate: [150, 250],
      full: [300, 500],
      luxury: [600, 1200],
    },
    bathroom: {
      cosmetic: [75, 125],
      moderate: [200, 350],
      full: [400, 600],
      luxury: [800, 1500],
    },
    bedroom: {
      cosmetic: [30, 60],
      moderate: [75, 150],
      full: [150, 300],
      luxury: [400, 800],
    },
    living_room: {
      cosmetic: [40, 80],
      moderate: [100, 200],
      full: [200, 400],
      luxury: [500, 1000],
    },
  };

  const normalizedRoom = roomType.toLowerCase().replace(/\s+/g, "_");
  const normalizedScope = scope.toLowerCase();

  const roomRates = rates[normalizedRoom] || rates.living_room;
  const [low, high] = roomRates[normalizedScope] || roomRates.moderate;

  const totalLow = low * squareFootage;
  const totalHigh = high * squareFootage;

  const description = `💰 Estimated Cost: $${totalLow.toLocaleString()} - $${totalHigh.toLocaleString()} (${normalizedScope} ${roomType} renovation, ~${squareFootage} sq ft)`;

  return {
    totalLow,
    totalHigh,
    roomType,
    scope: normalizedScope,
    squareFootage,
    description,
  };
}

/**
 * Estimate renovation timeline based on scope and room type
 */
export function calculateTimeline(
  scope: string,
  roomType: string
): TimelineEstimate {
  const timelines: Record<string, string> = {
    cosmetic: "1-2 weeks (quick refresh)",
    moderate: "3-6 weeks (includes some structural work)",
    full: "2-4 months (complete transformation)",
    luxury: "4-6 months (custom work, high-end finishes)",
  };

  const normalizedScope = scope.toLowerCase();
  const duration = timelines[normalizedScope] || timelines.moderate;
  const description = `⏱️ Estimated Timeline: ${duration}`;

  return {
    duration,
    scope: normalizedScope,
    roomType,
    description,
  };
}

/**
 * Budget breakdown calculator
 */
export function calculateBudgetBreakdown(totalBudget: number) {
  const materialsPercent = 0.45;
  const laborPercent = 0.40;
  const permitsPercent = 0.05;
  const contingencyPercent = 0.10;

  return {
    materials: Math.round(totalBudget * materialsPercent),
    labor: Math.round(totalBudget * laborPercent),
    permits: Math.round(totalBudget * permitsPercent),
    contingency: Math.round(totalBudget * contingencyPercent),
    total: totalBudget,
  };
}

/**
 * Generate a structured renovation plan
 */
export interface RenovationPlan {
  budget: {
    materials: number;
    labor: number;
    permits: number;
    contingency: number;
    total: number;
  };
  timeline: TimelineEstimate;
  contractors: string[];
  designSummary: string;
  actionChecklist: string[];
}

export function generateRenovationPlan(
  budget: number,
  timeline: TimelineEstimate,
  roomType: string,
  designPlan: string
): RenovationPlan {
  const budgetBreakdown = calculateBudgetBreakdown(budget);

  // Determine contractors needed based on room type
  const contractorMap: Record<string, string[]> = {
    kitchen: [
      "General Contractor",
      "Electrician",
      "Plumber",
      "Cabinet Installer",
      "Tile/Flooring Specialist",
      "Countertop Installer",
    ],
    bathroom: [
      "General Contractor",
      "Plumber",
      "Electrician",
      "Tile Specialist",
      "Fixture Installer",
    ],
    bedroom: [
      "General Contractor",
      "Painter",
      "Flooring Specialist",
      "Electrician (if needed)",
    ],
    living_room: [
      "General Contractor",
      "Painter",
      "Flooring Specialist",
      "Electrician (for lighting)",
    ],
  };

  const normalizedRoom = roomType.toLowerCase().replace(/\s+/g, "_");
  const contractors = contractorMap[normalizedRoom] || contractorMap.living_room;

  const actionChecklist = [
    "Get 3-5 contractor quotes",
    "Apply for necessary permits",
    "Order materials and finishes",
    "Schedule contractors in proper sequence",
    "Set up temporary accommodations if needed",
    "Final walkthrough and punch list",
  ];

  return {
    budget: budgetBreakdown,
    timeline,
    contractors,
    designSummary: designPlan,
    actionChecklist,
  };
}

/**
 * Extract room details from user message
 */
export function extractRoomDetails(message: string): {
  roomType?: string;
  budget?: number;
  squareFootage?: number;
  style?: string;
} {
  const details: any = {};

  // Extract room type - check longest/most specific matches first to avoid substring issues
  const messageLC = message.toLowerCase();
  const roomTypes = [
    "master bedroom",
    "master bathroom", 
    "master bath",
    "living room",
    "dining room",
    "bedroom",  // Check before "bed" substring matches
    "bathroom", // Check after "bedroom" to avoid false matches
    "kitchen",
    "office",
    "basement",
    "bath",  // Short form, check last
  ];
  for (const room of roomTypes) {
    if (messageLC.includes(room)) {
      // Normalize to standard names
      if (room.includes("bed")) {
        details.roomType = "bedroom";
      } else if (room.includes("bath")) {
        details.roomType = "bathroom";
      } else {
        details.roomType = room;
      }
      break;
    }
  }

  // Extract budget
  const budgetMatch = message.match(/\$(\d+[,\d]*k?)/i);
  if (budgetMatch) {
    let budgetStr = budgetMatch[1].replace(/,/g, "");
    if (budgetStr.toLowerCase().endsWith("k")) {
      details.budget = parseInt(budgetStr) * 1000;
    } else {
      details.budget = parseInt(budgetStr);
    }
  }

  // Extract square footage
  const sqFtMatch = message.match(/(\d+)\s*x\s*(\d+)/i);
  if (sqFtMatch) {
    details.squareFootage = parseInt(sqFtMatch[1]) * parseInt(sqFtMatch[2]);
  }

  // Extract style
  const styles = [
    "modern",
    "farmhouse",
    "industrial",
    "minimalist",
    "contemporary",
    "traditional",
    "rustic",
    "coastal",
    "scandinavian",
  ];
  for (const style of styles) {
    if (message.toLowerCase().includes(style)) {
      details.style = style;
      break;
    }
  }

  return details;
}

