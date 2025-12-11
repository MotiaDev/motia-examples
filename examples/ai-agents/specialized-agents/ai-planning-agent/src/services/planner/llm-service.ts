import { SubTask, ToolType, Plan, SynthesisReport, PlanExecutionState } from './types'

/**
 * LLM Service for interacting with Gemini 3 Pro
 * 
 * This service handles all LLM calls for:
 * - Plan generation (decomposing objectives into sub-tasks)
 * - Re-planning when environment changes
 * - Synthesis report generation
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
  }>
}

/**
 * Generate a structured prompt for plan generation
 */
function buildPlanningPrompt(objective: string, context?: Record<string, any>): string {
  const toolDescriptions = Object.entries(ToolType).map(([key, value]) => {
    const descriptions: Record<string, string> = {
      web_search: 'Search the web for information',
      slack_notification: 'Send notifications to Slack channels',
      database_query: 'Execute database queries',
      jira_ticket: 'Create or update Jira tickets',
      approval_gate: 'Wait for human approval before proceeding',
      github_check: 'Check GitHub repository status (PRs, tests, etc.)',
      cicd_webhook: 'Trigger CI/CD pipelines via webhooks',
      email_send: 'Send email notifications',
      http_request: 'Make HTTP requests to external APIs',
      data_transform: 'Transform data between steps',
      delay: 'Wait for a specified duration',
    }
    return `- ${value}: ${descriptions[value] || key}`
  }).join('\n')

  return `You are an enterprise workflow planning agent. Your task is to decompose a high-level objective into a structured, executable plan.

OBJECTIVE: ${objective}

${context ? `CONTEXT:
- Stakeholders: ${context.stakeholders?.join(', ') || 'Not specified'}
- Constraints: ${context.constraints?.join(', ') || 'None'}
- Deadlines: ${JSON.stringify(context.deadlines) || 'Not specified'}
- Resources: ${context.resources?.join(', ') || 'Standard'}
- Domain: ${context.domain || 'General'}
- Priority: ${context.priority || 'medium'}` : ''}

AVAILABLE TOOLS:
${toolDescriptions}

Generate a detailed plan as a JSON array of tasks. Each task must have:
- id: Unique string identifier (e.g., "task_1", "task_2")
- name: Short, descriptive name
- description: Detailed explanation of the task
- toolType: One of the available tool types
- inputs: Object with required input parameters
- outputs: Array of output names this task produces
- dependsOn: Array of task IDs this depends on (empty for first tasks)
- requiresApproval: Boolean - true for critical/risky operations
- retryCount: Number of retries (1-5)
- timeoutMs: Timeout in milliseconds (5000-300000)

RULES:
1. Tasks should be atomic and focused
2. Create proper dependencies to ensure correct execution order
3. Include approval gates for high-risk operations
4. Add notification steps at key milestones
5. Plan for failure scenarios where appropriate
6. Keep the plan practical and achievable

Respond ONLY with a valid JSON array of tasks, no additional text.`
}

/**
 * Generate a synthesis prompt
 */
function buildSynthesisPrompt(
  plan: Plan,
  executionState: PlanExecutionState
): string {
  return `You are an enterprise workflow synthesis agent. Analyze the execution results and generate a comprehensive report.

ORIGINAL OBJECTIVE: ${plan.objective}

PLAN TASKS:
${plan.tasks.map(t => `- ${t.id}: ${t.name} (${t.toolType})`).join('\n')}

EXECUTION RESULTS:
${Object.entries(executionState.results).map(([id, result]) => 
  `- ${id}: ${result.status}${result.error ? ` (Error: ${result.error})` : ''} - Duration: ${result.durationMs}ms`
).join('\n')}

COMPLETED TASKS: ${executionState.completedTasks.length}
FAILED TASKS: ${executionState.failedTasks.length}
BLOCKERS: ${executionState.blockers.map(b => `${b.taskId}: ${b.reason}`).join('; ') || 'None'}

INTERMEDIATE OUTPUTS:
${JSON.stringify(executionState.intermediateOutputs, null, 2)}

Generate a synthesis report as JSON with:
- summary: 2-3 sentence executive summary
- accomplishments: Array of key accomplishments
- issues: Array of issues encountered (taskId, taskName, error, resolution)
- recommendations: Array of recommendations for future runs
- metrics: Object with relevant metrics

Respond ONLY with valid JSON, no additional text.`
}

/**
 * Call Gemini API
 */
async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
  }

  const data = await response.json() as GeminiResponse
  
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Invalid Gemini response structure')
  }

  return data.candidates[0].content.parts[0].text
}

/**
 * Parse JSON from LLM response (handles markdown code blocks)
 */
function parseJsonResponse<T>(text: string): T {
  // Remove markdown code blocks if present
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  cleaned = cleaned.trim()

  return JSON.parse(cleaned) as T
}

/**
 * LLM Service class
 */
export class LLMService {
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || ''
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY not set - LLM calls will fail')
    }
  }

  /**
   * Generate a plan from an objective
   */
  async generatePlan(
    objective: string,
    context?: Record<string, any>
  ): Promise<SubTask[]> {
    const prompt = buildPlanningPrompt(objective, context)
    const response = await callGemini(prompt, this.apiKey)
    
    const tasks = parseJsonResponse<SubTask[]>(response)
    
    // Validate and ensure proper structure
    return tasks.map((task, index) => ({
      id: task.id || `task_${index + 1}`,
      name: task.name,
      description: task.description,
      toolType: task.toolType,
      inputs: task.inputs || {},
      outputs: task.outputs || [],
      dependsOn: task.dependsOn || [],
      requiresApproval: task.requiresApproval || false,
      retryCount: task.retryCount || 3,
      timeoutMs: task.timeoutMs || 30000,
    }))
  }

  /**
   * Re-plan based on new information or failure
   */
  async replan(
    originalPlan: Plan,
    failedTaskId: string,
    errorReason: string,
    newContext?: Record<string, any>
  ): Promise<SubTask[]> {
    const prompt = `You are an enterprise workflow re-planning agent. A task has failed and you need to adjust the plan.

ORIGINAL OBJECTIVE: ${originalPlan.objective}

ORIGINAL PLAN:
${originalPlan.tasks.map(t => `- ${t.id}: ${t.name} (${t.toolType})`).join('\n')}

FAILED TASK: ${failedTaskId}
ERROR: ${errorReason}

${newContext ? `NEW CONTEXT: ${JSON.stringify(newContext)}` : ''}

Generate an updated plan that:
1. Handles the failure appropriately
2. Provides alternative approaches if possible
3. Maintains the overall objective
4. Updates dependencies accordingly

Respond ONLY with a valid JSON array of tasks with the same structure as before.`

    const response = await callGemini(prompt, this.apiKey)
    return parseJsonResponse<SubTask[]>(response)
  }

  /**
   * Generate synthesis report
   */
  async generateSynthesisReport(
    plan: Plan,
    executionState: PlanExecutionState
  ): Promise<Omit<SynthesisReport, 'planId' | 'objective' | 'tasksCompleted' | 'tasksFailed' | 'totalDurationMs' | 'generatedAt'>> {
    const prompt = buildSynthesisPrompt(plan, executionState)
    const response = await callGemini(prompt, this.apiKey)
    return parseJsonResponse(response)
  }
}

export const llmService = new LLMService()

