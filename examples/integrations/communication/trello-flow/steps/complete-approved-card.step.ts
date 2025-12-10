import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { TrelloService } from '../services/trello.service'

const inputSchema = z.object({
  card: z.object({
    id: z.string(),
    list: z.object({
      id: z.string(),
    }),
  }),
  comment: z.object({
    text: z.string(),
    idMember: z.string(),
  }),
})

export const config: EventConfig = {
  type: 'event',
  name: 'Complete Approved Card',
  description: 'Moves approved cards to the completed state',
  subscribes: ['card.commented', 'card.reviewCompleted'],
  emits: [],
  input: inputSchema,
  flows: ['trello'],
}

export const handler: Handlers['Complete Approved Card'] = async (payload, { logger }) => {
  const { appConfig } = await import('../config/default')
  const trelloService = new TrelloService(appConfig.trello, logger)
  const { card, comment } = payload

  logger.info('Processing completion request', {
    cardId: card.id,
    commentText: comment.text,
    listId: card.list.id,
  })

  if (comment.text.toLowerCase() === 'approved' && card.list.id === appConfig.trello.lists.needsReview) {

    logger.info('Moving card to Completed', { cardId: card.id })
    await trelloService.moveCard(card.id, appConfig.trello.lists.completed)

    await trelloService.addComment(card.id, `✅ Card has been approved by @${comment.idMember}. Moving to Completed!`)
  }
}
