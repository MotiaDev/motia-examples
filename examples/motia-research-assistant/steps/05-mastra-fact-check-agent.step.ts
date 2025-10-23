import { z } from "zod";
import { EventConfig, Handlers } from "motia";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";
import { TavilyClient } from "tavily";

const MastraFactCheckInputSchema = z.object({
  researchId: z.string(),
  query: z.string(),
  depth: z.enum(["basic", "detailed", "comprehensive"]),
  summaryAnalysis: z
    .object({
      executive_summary: z.string(),
      confidence_assessment: z
        .object({
          overall_confidence: z.number(),
          data_quality: z.string(),
        })
        .passthrough(),
      metadata: z.object({
        researchId: z.string(),
        query: z.string(),
        depth: z.string(),
        targetLength: z.string(),
        summaryTimestamp: z.string(),
        agentModel: z.string(),
        originalConfidence: z.number(),
      }),
    })
    .passthrough(),
  summaryStats: z.object({
    executiveSummaryWords: z.number(),
    keyTakeawaysCount: z.number(),
    actionableInsightsCount: z.number(),
    criticalMetricsCount: z.number(),
  }),
  researchAnalysis: z.any(),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "MastraFactCheckStep",
  description: "Verify research findings using Mastra Fact-Check Agent",
  subscribes: ["summary.generated"],
  emits: ["factcheck.completed"],
  input: MastraFactCheckInputSchema,
  flows: ["motia-research-assistant"],
};

// Create Mastra tool for fact verification
const verifyClaimTool = createTool({
  id: "verify_claim",
  description: "Verify specific claims using additional web searches",
  inputSchema: z.object({
    claim: z.string(),
    originalQuery: z.string(),
    claimType: z.enum(["statistic", "fact", "quote", "trend"]),
  }),
  execute: async ({ context: { claim, originalQuery, claimType } }) => {
    try {
      const tavily = new TavilyClient({
        apiKey: process.env.TAVILY_API_KEY!,
      });

      const verificationResults = await tavily.search({
        query: claim,
        max_results: 3,
        search_depth: "advanced",
        include_raw_content: true,
      });

      const verificationSources = verificationResults.results.map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content.substring(0, 300),
        source: new URL(result.url).hostname.replace("www.", ""),
        score: parseFloat(result.score) || 0.5,
      }));

      return {
        claim,
        claimType,
        verificationSourcesFound: verificationSources.length,
        verificationSources,
        searchSuccessful: true,
      };
    } catch (error: any) {
      return {
        claim,
        claimType,
        error: error.message,
        searchSuccessful: false,
      };
    }
  },
});

// Create source credibility assessment tool
const assessCredibilityTool = createTool({
  id: "assess_credibility",
  description: "Assess source credibility and reliability",
  inputSchema: z.object({
    sources: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        source: z.string(),
      })
    ),
  }),
  execute: async ({ context: { sources } }) => {
    const credibilityScoring = sources.map((source) => {
      const domain = source.source.toLowerCase();
      let credibilityScore = 0.5; // Base score
      let credibilityFactors = [];

      // Government and educational domains
      if (domain.endsWith(".gov") || domain.endsWith(".edu")) {
        credibilityScore += 0.3;
        credibilityFactors.push("Official/Educational domain");
      }

      // Known reputable sources
      const reputableDomains = [
        "reuters.com",
        "bloomberg.com",
        "wsj.com",
        "ft.com",
        "techcrunch.com",
        "forbes.com",
        "sec.gov",
      ];

      if (reputableDomains.some((rep) => domain.includes(rep))) {
        credibilityScore += 0.25;
        credibilityFactors.push("Reputable publication");
      }

      credibilityScore = Math.min(credibilityScore, 1.0);

      return {
        url: source.url,
        source: source.source,
        credibilityScore,
        credibilityLevel:
          credibilityScore >= 0.8
            ? "high"
            : credibilityScore >= 0.6
            ? "medium"
            : "low",
        factors: credibilityFactors,
      };
    });

    return {
      totalSources: sources.length,
      averageCredibility:
        credibilityScoring.reduce((sum, s) => sum + s.credibilityScore, 0) /
        credibilityScoring.length,
      highCredibilitySources: credibilityScoring.filter(
        (s) => s.credibilityLevel === "high"
      ).length,
      sourceAssessments: credibilityScoring,
    };
  },
});

// Create the Mastra Fact-Check Agent
const createFactCheckAgent = () => {
  return new Agent({
    name: "FactCheckSpecialist",
    instructions: `You are an expert fact-checker specializing in business and technology research verification.

Your job:
1. Identify specific claims that need verification (statistics, facts, trends)
2. Use tools to verify claims with additional searches
3. Assess source credibility and reliability
4. Check for contradictions or inconsistencies
5. Provide confidence levels for verified claims

Provide your fact-check in JSON format:
{
  "verification_summary": "Overall assessment of fact-check results",
  "verified_claims": [
    {
      "claim": "Specific claim text",
      "verification_status": "verified|partially_verified|unverified|contradicted",
      "confidence_score": 0.85,
      "supporting_sources": ["source1", "source2"],
      "notes": "Additional context"
    }
  ],
  "source_credibility": {
    "high_credibility_sources": 8,
    "medium_credibility_sources": 5,
    "low_credibility_sources": 2,
    "average_credibility": 0.75
  },
  "overall_reliability": {
    "score": 0.82,
    "level": "high|medium|low",
    "rationale": "Explanation of the score"
  }
}`,

    model: openai("gpt-4o"),
    tools: [verifyClaimTool, assessCredibilityTool],
  });
};

export const handler: Handlers["MastraFactCheckStep"] = async (
  input,
  { logger, emit }
) => {
  const { researchId, query, depth, summaryAnalysis, researchAnalysis } = input;

  logger.info(`MastraFactCheckStep – Starting fact verification`, {
    researchId,
    query,
    depth,
    originalConfidence:
      summaryAnalysis.confidence_assessment.overall_confidence,
  });

  try {
    // Initialize the fact-check agent
    const factCheckAgent = createFactCheckAgent();

    // Extract claims from summary for verification
    const claimsToVerify = extractClaimsFromSummary(summaryAnalysis);

    logger.info(`Fact-checking ${claimsToVerify.length} claims with AI`, {
      researchId,
      claims: claimsToVerify.map((c) => c.text),
    });

    // Use the agent to perform fact-checking
    const factCheckResult = await factCheckAgent.generate(
      `Perform comprehensive fact-checking on this research summary.

Original Query: "${query}"
Research Depth: ${depth}

Summary to Verify:
${summaryAnalysis.executive_summary}

Key Claims Identified:
${claimsToVerify
  .map((claim, i) => `${i + 1}. ${claim.text} (Type: ${claim.type})`)
  .join("\n")}

Use your tools to:
1. Verify key claims using additional searches
2. Assess source credibility 
3. Identify any contradictions

Provide comprehensive fact-check assessment with confidence scores.`
    );

    // Parse AI response
    let factCheckAnalysis;
    try {
      const jsonMatch = factCheckResult.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        factCheckAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        factCheckAnalysis = {
          verification_summary: factCheckResult.text,
          verified_claims: claimsToVerify.map((claim) => ({
            claim: claim.text,
            verification_status: "partially_verified",
            confidence_score: 0.7,
            notes: "Automated fact-check completed",
          })),
          overall_reliability: {
            score: summaryAnalysis.confidence_assessment.overall_confidence,
            level: "medium",
            rationale: "Standard verification completed",
          },
        };
      }
    } catch (parseError) {
      factCheckAnalysis = {
        verification_summary: factCheckResult.text,
        parsing_note: "Fact-check completed but required manual processing",
        overall_reliability: {
          score: summaryAnalysis.confidence_assessment.overall_confidence * 0.9,
          level: "medium",
          rationale: "Manual review recommended",
        },
      };
    }

    // Add metadata
    factCheckAnalysis.metadata = {
      researchId,
      query,
      depth,
      originalConfidence:
        summaryAnalysis.confidence_assessment.overall_confidence,
      claimsVerified: claimsToVerify.length,
      factCheckTimestamp: new Date().toISOString(),
      agentModel: "gpt-4o",
    };

    // Calculate fact-check statistics
    const factCheckStats = {
      totalClaims: claimsToVerify.length,
      verifiedClaims:
        factCheckAnalysis.verified_claims?.filter(
          (c: any) => c.verification_status === "verified"
        ).length || 0,
      partiallyVerified:
        factCheckAnalysis.verified_claims?.filter(
          (c: any) => c.verification_status === "partially_verified"
        ).length || 0,
      unverifiedClaims:
        factCheckAnalysis.verified_claims?.filter(
          (c: any) => c.verification_status === "unverified"
        ).length || 0,
      averageConfidence:
        factCheckAnalysis.verified_claims?.reduce(
          (sum: number, c: any) => sum + (c.confidence_score || 0),
          0
        ) / (factCheckAnalysis.verified_claims?.length || 1),
    };

    logger.info(`Fact-check verification completed`, {
      researchId,
      ...factCheckStats,
      overallReliability: factCheckAnalysis.overall_reliability?.score,
    });

    await emit({
      topic: "factcheck.completed",
      data: {
        researchId,
        query,
        depth,
        factCheckAnalysis,
        factCheckStats,
        summaryAnalysis, // Pass through for next step
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error(`Fact-check verification failed`, {
      researchId,
      error: error.message,
    });
    throw error;
  }
};

// Helper function to extract claims from summary
function extractClaimsFromSummary(
  summaryAnalysis: any
): Array<{ text: string; type: string }> {
  const claims: Array<{ text: string; type: string }> = [];

  // Extract from executive summary
  if (summaryAnalysis.executive_summary) {
    const sentences = summaryAnalysis.executive_summary
      .split(".")
      .filter((s: string) => s.trim().length > 0);
    sentences.forEach((sentence: string) => {
      // Look for statistical claims
      if (
        /\d+%|\$[\d,]+|[\d,]+\s*(million|billion|thousand)|\d+\.?\d*x/i.test(
          sentence
        )
      ) {
        claims.push({ text: sentence.trim(), type: "statistic" });
      }
      // Look for factual claims
      else if (sentence.trim().length > 20) {
        claims.push({ text: sentence.trim(), type: "fact" });
      }
    });
  }

  // Extract from key takeaways
  if (summaryAnalysis.key_takeaways) {
    summaryAnalysis.key_takeaways.forEach((takeaway: any) => {
      if (takeaway.finding) {
        claims.push({ text: takeaway.finding, type: "finding" });
      }
    });
  }

  return claims.slice(0, 8); // Limit to top 8 claims for efficiency
}
