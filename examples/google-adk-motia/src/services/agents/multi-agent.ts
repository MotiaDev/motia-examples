import type { SubAgent, AgentConfig } from '../../types/agent.types';
import { GeminiAgentService } from './gemini-agent';

export interface MultiAgentExecutionResult {
  workflow_type: 'sequential' | 'parallel' | 'loop';
  results: Array<{
    agent_id: string;
    agent_name: string;
    response: string;
    execution_time_ms: number;
  }>;
  final_output: string;
  total_execution_time_ms: number;
}

/**
 * Multi-Agent Orchestration Service
 * 
 * Coordinates multiple specialized agents to work together on complex tasks.
 * Supports different workflow patterns:
 * - Sequential: Agents run one after another, building on previous outputs
 * - Parallel: Agents run simultaneously, results are merged
 * - Loop: Agents iterate until a condition is met or max iterations reached
 */
export class MultiAgentService {
  /**
   * Execute a sequential workflow
   * Each agent processes the output of the previous agent
   */
  async executeSequential(
    query: string,
    subAgents: SubAgent[],
    config?: AgentConfig
  ): Promise<MultiAgentExecutionResult> {
    const startTime = Date.now();
    const results: MultiAgentExecutionResult['results'] = [];
    
    let currentInput = query;

    for (const subAgent of subAgents) {
      const agentStartTime = Date.now();
      
      const agent = new GeminiAgentService({
        config: subAgent.config || config || { model: 'gemini-2.5-flash', temperature: 0.7 },
        systemPrompt: subAgent.system_prompt,
      });

      const result = await agent.execute(currentInput, []);
      
      results.push({
        agent_id: subAgent.id,
        agent_name: subAgent.name,
        response: result.response,
        execution_time_ms: Date.now() - agentStartTime,
      });

      // Pass output to next agent
      currentInput = `Previous agent (${subAgent.name}) response:\n${result.response}\n\nOriginal query: ${query}`;
    }

    const totalTime = Date.now() - startTime;

    return {
      workflow_type: 'sequential',
      results,
      final_output: this.synthesizeFinalOutput(results, 'sequential'),
      total_execution_time_ms: totalTime,
    };
  }

  /**
   * Execute a parallel workflow
   * All agents run simultaneously with the same input
   */
  async executeParallel(
    query: string,
    subAgents: SubAgent[],
    config?: AgentConfig
  ): Promise<MultiAgentExecutionResult> {
    const startTime = Date.now();

    const agentPromises = subAgents.map(async (subAgent) => {
      const agentStartTime = Date.now();
      
      const agent = new GeminiAgentService({
        config: subAgent.config || config || { model: 'gemini-2.5-flash', temperature: 0.7 },
        systemPrompt: subAgent.system_prompt,
      });

      const result = await agent.execute(query, []);
      
      return {
        agent_id: subAgent.id,
        agent_name: subAgent.name,
        response: result.response,
        execution_time_ms: Date.now() - agentStartTime,
      };
    });

    const results = await Promise.all(agentPromises);
    const totalTime = Date.now() - startTime;

    return {
      workflow_type: 'parallel',
      results,
      final_output: this.synthesizeFinalOutput(results, 'parallel'),
      total_execution_time_ms: totalTime,
    };
  }

  /**
   * Execute a loop workflow
   * Agents iterate until max iterations or exit condition is met
   */
  async executeLoop(
    query: string,
    subAgents: SubAgent[],
    maxIterations: number = 3,
    config?: AgentConfig
  ): Promise<MultiAgentExecutionResult> {
    const startTime = Date.now();
    const results: MultiAgentExecutionResult['results'] = [];
    
    let currentInput = query;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      let shouldExit = false;

      for (const subAgent of subAgents) {
        const agentStartTime = Date.now();
        
        const agent = new GeminiAgentService({
          config: subAgent.config || config || { model: 'gemini-2.5-flash', temperature: 0.7 },
          systemPrompt: `${subAgent.system_prompt}\n\nIteration: ${iteration}/${maxIterations}`,
        });

        const result = await agent.execute(currentInput, []);
        
        results.push({
          agent_id: `${subAgent.id}-iter${iteration}`,
          agent_name: `${subAgent.name} (Iteration ${iteration})`,
          response: result.response,
          execution_time_ms: Date.now() - agentStartTime,
        });

        // Check for exit conditions
        if (result.response.toLowerCase().includes('exit') || 
            result.response.toLowerCase().includes('complete')) {
          shouldExit = true;
          break;
        }

        currentInput = result.response;
      }

      if (shouldExit) break;
    }

    const totalTime = Date.now() - startTime;

    return {
      workflow_type: 'loop',
      results,
      final_output: this.synthesizeFinalOutput(results, 'loop'),
      total_execution_time_ms: totalTime,
    };
  }

  /**
   * Synthesize final output from all agent results
   */
  private synthesizeFinalOutput(
    results: MultiAgentExecutionResult['results'],
    workflowType: string
  ): string {
    const sections: string[] = [];

    sections.push(`# Multi-Agent ${workflowType.charAt(0).toUpperCase() + workflowType.slice(1)} Workflow Results\n`);
    
    sections.push(`**Total Agents**: ${results.length}`);
    sections.push(`**Total Execution Time**: ${results.reduce((sum, r) => sum + r.execution_time_ms, 0)}ms\n`);

    results.forEach((result, index) => {
      sections.push(`## ${index + 1}. ${result.agent_name}`);
      sections.push(`**Execution Time**: ${result.execution_time_ms}ms\n`);
      sections.push(result.response);
      sections.push('---\n');
    });

    // Add final synthesis
    sections.push('## Final Synthesis\n');
    
    if (workflowType === 'sequential') {
      sections.push('The agents worked sequentially, with each building upon the previous output.');
      sections.push('The final result incorporates all stages of the workflow.\n');
    } else if (workflowType === 'parallel') {
      sections.push('The agents worked in parallel, each providing independent perspectives.');
      sections.push('The combined results offer comprehensive coverage of the query.\n');
    } else {
      sections.push('The agents iterated through multiple cycles to refine the output.');
      sections.push('The iterative process improved the quality with each pass.\n');
    }

    sections.push(`**Key Takeaway**: ${results[results.length - 1].response.substring(0, 200)}...`);

    return sections.join('\n');
  }
}

/**
 * Create a multi-agent orchestrator
 */
export function createMultiAgent(): MultiAgentService {
  return new MultiAgentService();
}

/**
 * Pre-configured multi-agent workflows
 */
export const AGENT_WORKFLOWS = {
  /**
   * Research workflow: Research → Summarize → Critique
   */
  RESEARCH: (query: string): SubAgent[] => [
    {
      id: 'researcher',
      name: 'Research Agent',
      role: 'researcher',
      system_prompt: `You are a comprehensive research agent. Your role is to:
1. Conduct thorough research on the given topic
2. Gather current information and trends
3. Identify key facts, statistics, and developments
4. Provide structured findings with sources

Be detailed and comprehensive in your research.`,
      tools: ['google_search', 'web_scrape'],
    },
    {
      id: 'summarizer',
      name: 'Summarizer Agent',
      role: 'summarizer',
      system_prompt: `You are a synthesis agent. Your role is to:
1. Analyze the research findings provided
2. Extract key insights and patterns
3. Create clear, actionable summaries
4. Highlight the most important points

Focus on clarity and actionability.`,
    },
    {
      id: 'critic',
      name: 'Critic Agent',
      role: 'critic',
      system_prompt: `You are a critical analysis agent. Your role is to:
1. Evaluate the research and summary quality
2. Identify gaps or missing information
3. Assess risks and opportunities
4. Provide recommendations for improvement

Be constructive and thorough in your critique.`,
    },
  ],

  /**
   * Analysis workflow: Analyze → Compare → Recommend
   */
  ANALYSIS: (query: string): SubAgent[] => [
    {
      id: 'analyst',
      name: 'Analysis Agent',
      role: 'analyst',
      system_prompt: `You are a data analysis agent. Analyze the given information thoroughly.`,
    },
    {
      id: 'comparator',
      name: 'Comparison Agent',
      role: 'analyst',
      system_prompt: `You are a comparison agent. Compare different aspects and identify patterns.`,
    },
    {
      id: 'recommender',
      name: 'Recommendation Agent',
      role: 'analyst',
      system_prompt: `You are a recommendation agent. Provide actionable recommendations based on the analysis.`,
    },
  ],
};

