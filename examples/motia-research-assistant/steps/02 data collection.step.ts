import { z } from "zod";
import { EventConfig, Handlers } from "motia";
import { TavilyClient } from "tavily";

const DataCollectionInputSchema = z.object({
  researchId: z.string(),
  query: z.string(),
  depth: z.enum(["basic", "detailed", "comprehensive"]),
  status: z.string(),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "DataCollectionStep",
  description: "Collect web search data using Tavily API",
  subscribes: ["query.received"],
  emits: ["data.collected"],
  input: DataCollectionInputSchema,
  flows: ["motia-research-assistant"],
};

export const handler: Handlers["DataCollectionStep"] = async (
  input,
  { logger, emit }
) => {
  const { researchId, query, depth } = input;

  logger.info(`DataCollectionStep – Starting data collection`, {
    researchId,
    query,
    depth,
  });

  try {
    const tavily = new TavilyClient({
      apiKey: process.env.TAVILY_API_KEY!,
    });

    // Search parameters based on depth
    const searchConfig = {
      basic: { maxResults: 10, queries: [query] },
      detailed: {
        maxResults: 15,
        queries: [query, `${query} analysis`, `${query} overview`],
      },
      comprehensive: {
        maxResults: 20,
        queries: [
          query,
          `${query} analysis`,
          `${query} overview`,
          `${query} trends`,
          `${query} report`,
        ],
      },
    };

    const config = searchConfig[depth];
    const allResults = [];

    logger.info(`Executing ${config.queries.length} search queries`, {
      researchId,
      queries: config.queries,
    });

    for (const searchQuery of config.queries) {
      logger.info(`Searching: ${searchQuery}`, { researchId });

      const searchResults = await tavily.search({
        query: searchQuery,
        max_results: config.maxResults,
        search_depth: "advanced",
        include_raw_content: true,
      });

      const formattedResults = searchResults.results.map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content,
        source: new URL(result.url).hostname.replace("www.", ""),
        score: parseFloat(result.score) || 0.5,
      }));

      allResults.push(...formattedResults);

      logger.info(`Found ${formattedResults.length} results`, {
        researchId,
        query: searchQuery,
      });

      // Rate limit
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logger.info(`Data collection completed`, {
      researchId,
      totalResults: allResults.length,
    });

    await emit({
      topic: "data.collected",
      data: {
        researchId,
        query,
        depth,
        searchResults: allResults,
        totalResults: allResults.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error(`Data collection failed`, {
      researchId,
      error: error.message,
    });
    throw error;
  }
};
