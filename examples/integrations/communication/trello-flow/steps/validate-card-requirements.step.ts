import { EventConfig, FlowContext } from 'motia'
import { z } from 'zod'
import { TrelloService } from '../services/trello.service'

const inputSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1, { message: 'Title is required' }),
    desc: z.string().min(1, { message: 'Description is required' }),
    members: z.array(z.object({})).min(1, { message: 'At least one assigned user is required' }),
  })
  .strict()

export const config: EventConfig = {
  type: 'event',
  name: 'Card Requirements Validator',
  description: 'Ensures new cards have required title, description and assignee',
  subscribes: ['card.created'],
  emits: [],
  virtualEmits: [
    {
      topic: 'card.validated',
      label: 'Card Validated',
    },
  ],
  input: inputSchema,
  flows: ['trello'],
}

export const handler = async (card: any, { logger }: any) => {
  logger.info('New task validator', { card })
  const { appConfig } = await import('../config/default')
  const trello = new TrelloService(appConfig.trello, logger)

  try {
    inputSchema.parse(card)
    logger.info('Card validation successful', { cardId: card.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.errors
        .map((err) => {
          const fieldMap: Record<string, string> = {
            name: 'title',
            desc: 'description',
            members: 'assigned user',
          }

          const path = err.path[0] as string
          return fieldMap[path] || path
        })
        .filter(Boolean)

      logger.info('Adding comment for missing fields', { cardId: card.id, missingFields })
      await Promise.all([
        trello.addComment(card.id, `🚨 Card is incomplete! Please add: \n* ${missingFields.join('\n* ')}`),
        trello.moveCard(card.id, appConfig.trello.lists.newTasks),
      ])
    }
  }
}
