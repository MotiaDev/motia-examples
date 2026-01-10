// src/services/firecrawl.service.ts

import axios from "axios";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v2/scrape";

interface FirecrawlResponse {
  success: boolean;
  data: {
    markdown?: string;
    screenshot?: string;
    branding?: {
      colors?: {
        primary?: string;
        accent?: string;
        background?: string;
      };
      fonts?: Array<{ family: string; count: number }>;
      images?: {
        logo?: string;
      };
    };
    images?: string[];
    summary?: string;
    metadata?: {
      title?: string;
      description?: string;
    };
  };
  error?: string;
}

export async function scrapeLandingPage(
  url: string
): Promise<FirecrawlResponse> {
  if (!FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY not set in environment variables");
  }

  const response = await axios.post<FirecrawlResponse>(
    FIRECRAWL_API_URL,
    {
      url,
      formats: ["markdown", "screenshot", "branding", "images", "summary"],
      onlyMainContent: true,
      blockAds: true,
      removeBase64Images: true,
    },
    {
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.data.success) {
    throw new Error(
      `Firecrawl scraping failed: ${response.data.error || "Unknown error"}`
    );
  }

  // Filter out base64 images that slipped through
  if (response.data.data.images) {
    response.data.data.images = response.data.data.images.filter(
      (img) => !img.startsWith("data:image/")
    );
  }

  return response.data;
}

export const FirecrawlService = {
  scrapeLandingPage,
};

export default FirecrawlService;
