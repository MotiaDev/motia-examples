import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'planner-api',
  path: '/plan',
  method: 'POST',
  emits: ['planner-request'],
  bodySchema: z.object({
    user: z.string(),
    type: z.enum(['meal', 'workout']),
    prompt: z.string()
  }),
  description: 'Get a personalized meal or workout plan based on prompt'
}

export const handler: Handlers['planner-api'] = async (req, { emit, logger }) => {
  const { user, type, prompt } = req.body

  logger.info(`Planner request from ${user} for ${type} plan`)
  logger.info(`Prompt: ${prompt}`)

  await emit({
    topic: 'planner-request',
    data: {
      user,
      type,
      prompt
    }
  })

  return {
    status: 200,
    body: { message: 'Planner invoked successfully!' }
  }
}
