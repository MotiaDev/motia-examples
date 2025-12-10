import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, END, START, Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { Lead, LeadWithScore } from './lead-service';

// Define state annotation for the scoring graph
const LeadScoringState = Annotation.Root({
  lead: Annotation<Lead>,
  enrichedData: Annotation<Record<string, unknown> | null>,
  score: Annotation<number>,
  scoreBreakdown: Annotation<{
    industryFit: number;
    companySize: number;
    roleRelevance: number;
    engagementSignals: number;
  } | null>,
  tier: Annotation<'hot' | 'warm' | 'cold'>,
  analysisNotes: Annotation<string>,
});

type LeadScoringStateType = typeof LeadScoringState.State;

// Industry fit scoring based on target industries
const HIGH_VALUE_INDUSTRIES = ['SaaS', 'AI/ML', 'Fintech', 'DevTools', 'Cybersecurity'];
const MEDIUM_VALUE_INDUSTRIES = ['Healthtech', 'Edtech', 'E-commerce'];

// Role relevance mapping
const HIGH_VALUE_ROLES = ['CTO', 'VP Engineering', 'Head of Product', 'Founder', 'CEO'];
const MEDIUM_VALUE_ROLES = ['Head of Sales', 'VP Marketing', 'Growth Lead', 'COO', 'CIO'];

// Company size scoring
const COMPANY_SIZE_SCORES: Record<string, number> = {
  '1000+': 25,
  '501-1000': 22,
  '201-500': 20,
  '51-200': 18,
  '11-50': 12,
  '1-10': 8,
};

// Engagement signal keywords
const HOT_SIGNALS = ['Requested pricing info', 'Inbound from referral'];
const WARM_SIGNALS = ['Interested in AI automation demos', 'Met at conference'];
const COLD_SIGNALS = ['Using competitor tool', 'Signed up for newsletter'];

function scoreIndustryFit(industry: string): number {
  if (HIGH_VALUE_INDUSTRIES.includes(industry)) return 25;
  if (MEDIUM_VALUE_INDUSTRIES.includes(industry)) return 18;
  return 10;
}

function scoreCompanySize(employeeRange: string): number {
  return COMPANY_SIZE_SCORES[employeeRange] || 10;
}

function scoreRoleRelevance(role: string): number {
  if (HIGH_VALUE_ROLES.includes(role)) return 25;
  if (MEDIUM_VALUE_ROLES.includes(role)) return 18;
  return 10;
}

function scoreEngagementSignals(notes: string): number {
  for (const signal of HOT_SIGNALS) {
    if (notes.includes(signal)) return 25;
  }
  for (const signal of WARM_SIGNALS) {
    if (notes.includes(signal)) return 18;
  }
  for (const signal of COLD_SIGNALS) {
    if (notes.includes(signal)) return 12;
  }
  return 10;
}

function determineTier(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 80) return 'hot';
  if (score >= 60) return 'warm';
  return 'cold';
}

// LangGraph nodes
async function enrichLeadNode(state: LeadScoringStateType): Promise<Partial<LeadScoringStateType>> {
  const { lead } = state;
  
  // Simulated enrichment - in production, this would call external APIs
  const enrichedData = {
    companyInfo: {
      name: lead.company,
      website: lead.website,
      estimatedRevenue: lead.employeeRange === '1000+' ? '$100M+' : 
                        lead.employeeRange === '501-1000' ? '$50-100M' : '$10-50M',
    },
    contactInfo: {
      fullName: lead.name,
      title: lead.role,
      email: lead.email,
    },
    signals: {
      recentFunding: Math.random() > 0.7,
      hiringEngineers: Math.random() > 0.6,
      techStackMatch: Math.random() > 0.5,
    },
  };

  return { enrichedData };
}

async function calculateScoreNode(state: LeadScoringStateType): Promise<Partial<LeadScoringStateType>> {
  const { lead, enrichedData } = state;
  
  const industryFit = scoreIndustryFit(lead.industry);
  const companySize = scoreCompanySize(lead.employeeRange);
  const roleRelevance = scoreRoleRelevance(lead.role);
  const engagementSignals = scoreEngagementSignals(lead.notes);
  
  // Bonus points from enriched data
  let bonus = 0;
  if (enrichedData?.signals) {
    const signals = enrichedData.signals as Record<string, boolean>;
    if (signals.recentFunding) bonus += 5;
    if (signals.hiringEngineers) bonus += 3;
    if (signals.techStackMatch) bonus += 5;
  }
  
  const totalScore = Math.min(100, industryFit + companySize + roleRelevance + engagementSignals + bonus);
  const tier = determineTier(totalScore);

  return {
    score: totalScore,
    scoreBreakdown: {
      industryFit,
      companySize,
      roleRelevance,
      engagementSignals,
    },
    tier,
  };
}

async function analyzeLeadNode(state: LeadScoringStateType): Promise<Partial<LeadScoringStateType>> {
  const { lead, score, tier, scoreBreakdown, enrichedData } = state;
  
  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.3,
  });

  const systemPrompt = `You are a sales intelligence analyst. Provide a brief, actionable analysis of this lead in 2-3 sentences. Focus on:
1. Why they might be a good fit
2. Potential pain points to address
3. Recommended approach for outreach`;

  const humanPrompt = `Lead: ${lead.name} at ${lead.company}
Role: ${lead.role}
Industry: ${lead.industry}
Company Size: ${lead.employeeRange}
Country: ${lead.country}
Notes: ${lead.notes}
Score: ${score}/100 (${tier.toUpperCase()})
Score Breakdown: Industry=${scoreBreakdown?.industryFit}, Size=${scoreBreakdown?.companySize}, Role=${scoreBreakdown?.roleRelevance}, Engagement=${scoreBreakdown?.engagementSignals}`;

  try {
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(humanPrompt),
    ]);
    
    return { analysisNotes: response.content as string };
  } catch (error) {
    return { analysisNotes: `${tier.toUpperCase()} lead based on ${lead.industry} industry and ${lead.role} role.` };
  }
}

// Create the scoring graph
function createScoringGraph() {
  const workflow = new StateGraph(LeadScoringState)
    .addNode('enrich', enrichLeadNode)
    .addNode('score', calculateScoreNode)
    .addNode('analyze', analyzeLeadNode)
    .addEdge(START, 'enrich')
    .addEdge('enrich', 'score')
    .addEdge('score', 'analyze')
    .addEdge('analyze', END);

  return workflow.compile();
}

export async function scoreLead(lead: Lead): Promise<LeadWithScore> {
  const graph = createScoringGraph();
  
  const initialState = {
    lead,
    enrichedData: null,
    score: 0,
    scoreBreakdown: null,
    tier: 'cold' as const,
    analysisNotes: '',
  };

  const result = await graph.invoke(initialState);

  return {
    ...lead,
    score: result.score,
    scoreBreakdown: result.scoreBreakdown!,
    tier: result.tier,
    scoredAt: new Date().toISOString(),
  };
}

export async function scoreLeads(leads: Lead[]): Promise<LeadWithScore[]> {
  const scoredLeads: LeadWithScore[] = [];
  
  for (const lead of leads) {
    try {
      const scored = await scoreLead(lead);
      scoredLeads.push(scored);
    } catch (error) {
      // Fallback scoring without LLM
      const industryFit = scoreIndustryFit(lead.industry);
      const companySize = scoreCompanySize(lead.employeeRange);
      const roleRelevance = scoreRoleRelevance(lead.role);
      const engagementSignals = scoreEngagementSignals(lead.notes);
      const totalScore = industryFit + companySize + roleRelevance + engagementSignals;
      
      scoredLeads.push({
        ...lead,
        score: totalScore,
        scoreBreakdown: {
          industryFit,
          companySize,
          roleRelevance,
          engagementSignals,
        },
        tier: determineTier(totalScore),
        scoredAt: new Date().toISOString(),
      });
    }
  }
  
  return scoredLeads.sort((a, b) => b.score - a.score);
}

