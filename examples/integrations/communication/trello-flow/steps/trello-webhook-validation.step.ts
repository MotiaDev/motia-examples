import { ApiRouteConfig, ApiRequest, FlowContext } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Trello Webhook Validation',
  description: 'Validates incoming Trello webhook connection',
  path: '/trello/webhook',
  method: 'HEAD',
  bodySchema: inputSchema,
  emits: [{ topic: 'api.trello.webhook', label: 'Trello Webhook Validation' }],
  virtualEmits: [{ topic: 'api.trello.webhook', label: 'Trello Webhook Validation' }],
  flows: ['trello'],
}

export const handler = async (request: ApiRequest, context: FlowContext) => {
  context.logger.info('Trello webhook validation request received')

  return {
    status: 200,
    body: { message: 'Webhook validation successful' },
  }
}
