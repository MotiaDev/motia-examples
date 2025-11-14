import { StreamConfig } from 'motia'
import { z } from 'zod'

export const agentResponseSchema = z.object({
  request_id: z.string(),
  session_id: z.string(),
  status: z.enum(['processing', 'completed', 'error']),
  response: z.string().optional(),
  error: z.string().optional(),
  metadata: z.object({
    model_used: z.string(),
    tokens_used: z.number().optional(),
    execution_time_ms: z.number().optional(),
    agent_type: z.string(),
  }).optional(),
  progress: z.object({
    current_step: z.string().optional(),
    total_steps: z.number().optional(),
  }).optional(),
  timestamp: z.string(),
})

export type AgentResponse = z.infer<typeof agentResponseSchema>

export const config: StreamConfig = {
  name: 'agentResponse',
  schema: agentResponseSchema,
  baseConfig: { storageType: 'default' },
}

