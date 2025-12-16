/**
 * Firecrawl Service
 * 
 * Handles web scraping operations using the Firecrawl API.
 * Extracts clean markdown content and screenshots from landing pages.
 */

import { z } from 'zod';

// ============================================================================
// Types & Schemas
// ============================================================================

const FirecrawlMetadataSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional(),
    keywords: z.string().optional(),
    favicon: z.string().optional(),
});

const FirecrawlDataSchema = z.object({
    markdown: z.string(),
    screenshot: z.string().url(),
    metadata: FirecrawlMetadataSchema,
});

const FirecrawlResponseSchema = z.object({
    success: z.boolean(),
    data: FirecrawlDataSchema,
});

export type FirecrawlMetadata = z.infer<typeof FirecrawlMetadataSchema>;
export type FirecrawlData = z.infer<typeof FirecrawlDataSchema>;
export type FirecrawlResponse = z.infer<typeof FirecrawlResponseSchema>;

export interface ScrapeOptions {
    url: string;
    waitFor?: number;
    mobile?: boolean;
    timeout?: number;
}

export interface ScrapedContent {
    markdown: string;
    screenshot: string;
    metadata: FirecrawlMetadata;
    brandInfo: {
        title: string;
        description: string;
    };
}

// ============================================================================
// Service
// ============================================================================

export class FirecrawlService {
    private readonly apiKey: string;
    private readonly baseUrl = 'https://api.firecrawl.dev/v2';

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.FIRECRAWL_API_KEY || '';

        if (!this.apiKey) {
            throw new Error('FIRECRAWL_API_KEY is required');
        }
    }

    /**
     * Scrape a URL and extract content
     */
    async scrape(options: ScrapeOptions): Promise<ScrapedContent> {
        const { url, waitFor = 3000, mobile = false, timeout = 60000 } = options;

        console.log(`[Firecrawl] Scraping: ${url}`);

        try {
            const response = await fetch(`${this.baseUrl}/scrape`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url,
                    formats: ['markdown', 'screenshot'],
                    onlyMainContent: true,
                    excludeTags: [
                        'nav',
                        'footer',
                        '.cookie-banner',
                        '#onetrust-banner-sdk',
                        'header',
                        '.navigation',
                    ],
                    removeBase64Images: true,
                    blockAds: true,
                    waitFor,
                    mobile,
                    timeout,
                    proxy: 'auto',
                    storeInCache: true,
                    skipTlsVerification: true,
                    actions: [
                        { type: 'wait', milliseconds: waitFor },
                        { type: 'screenshot', fullPage: true },
                    ],
                    location: {
                        country: 'US',
                        languages: ['en-US'],
                    },
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Firecrawl API error (${response.status}): ${errorText}`
                );
            }

            const rawData = await response.json();
            const validated = FirecrawlResponseSchema.parse(rawData);

            if (!validated.success) {
                throw new Error('Firecrawl scraping failed');
            }

            console.log(`[Firecrawl] Successfully scraped ${url}`);
            console.log(`[Firecrawl] Markdown length: ${validated.data.markdown.length} chars`);
            console.log(`[Firecrawl] Screenshot: ${validated.data.screenshot}`);

            return this.extractContent(validated.data);
        } catch (error) {
            console.error(`[Firecrawl] Error scraping ${url}:`, error);
            throw new Error(
                `Failed to scrape URL: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Extract and clean content from Firecrawl response
     */
    private extractContent(data: FirecrawlData): ScrapedContent {
        const { markdown, screenshot, metadata } = data;

        // Extract brand info from metadata (prioritize OG tags)
        const title = metadata.ogTitle || metadata.title || 'Untitled';
        const description =
            metadata.ogDescription ||
            metadata.description ||
            'No description available';

        return {
            markdown: this.cleanMarkdown(markdown),
            screenshot,
            metadata,
            brandInfo: {
                title,
                description,
            },
        };
    }

    /**
     * Clean markdown content
     * Remove excessive whitespace, navigation elements, etc.
     */
    private cleanMarkdown(markdown: string): string {
        return markdown
            // Remove multiple consecutive newlines
            .replace(/\n{3,}/g, '\n\n')
            // Remove excessive spaces
            .replace(/ {2,}/g, ' ')
            // Trim lines
            .split('\n')
            .map(line => line.trim())
            .join('\n')
            // Remove empty lines at start/end
            .trim();
    }

    /**
     * Validate URL before scraping
     */
    static isValidUrl(url: string): boolean {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new Firecrawl service instance
 */
export function createFirecrawlService(apiKey?: string): FirecrawlService {
    return new FirecrawlService(apiKey);
}

// ============================================================================
// Convenience Export
// ============================================================================

/**
 * Quick scrape function for one-off usage
 */
export async function scrapeUrl(
    url: string,
    options?: Omit<ScrapeOptions, 'url'>
): Promise<ScrapedContent> {
    const service = createFirecrawlService();
    return service.scrape({ url, ...options });
}