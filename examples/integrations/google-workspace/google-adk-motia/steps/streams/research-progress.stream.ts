import { StreamConfig } from 'motia'
import { z } from 'zod'

export const researchProgressSchema = z.object({
  request_id: z.string(),
  session_id: z.string(),
  status: z.enum(['queued', 'researching', 'summarizing', 'critiquing', 'completed', 'error']),
  current_agent: z.string().optional(),
  agent_output: z.string().optional(),
  final_output: z.string().optional(),
  error: z.string().optional(),
  metadata: z.object({
    workflow_type: z.string(),
    total_agents: z.number(),
    completed_agents: z.number(),
    execution_time_ms: z.number().optional(),
  }).optional(),
  timestamp: z.string(),
})

export type ResearchProgress = z.infer<typeof researchProgressSchema>

export const config: StreamConfig = {
  name: 'researchProgress',
  schema: researchProgressSchema,
  baseConfig: { storageType: 'default' },
}

