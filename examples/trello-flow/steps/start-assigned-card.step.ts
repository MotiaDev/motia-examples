import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { TrelloService } from '../services/trello.service'

const inputSchema = z.object({
  id: z.string(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'Start Assigned Card',
  description: 'Moves newly assigned cards to the in-progress state',
  subscribes: ['member.assigned', 'card.readyForDevelopment'],
  virtualEmits: ['card.inProgress'],
  emits: [],
  input: inputSchema,
  flows: ['trello'],
}

export const handler: Handlers['Start Assigned Card'] = async (payload, { logger }) => {
  try {
    const { appConfig } = await import('../config/default')
    logger.info('Start Assigned Card Handler', { payload })
    const trelloService = new TrelloService(appConfig.trello, logger)
    const card = await trelloService.getCard(payload.id)

    if (card.idList === appConfig.trello.lists.newTasks && card.members.length > 0) {
      const [firstMember] = card.members

      logger.info('Moving card to In Progress', {
        cardId: card.id,
        member: firstMember.fullName,
      })

      await trelloService.moveCard(card.id, appConfig.trello.lists.inProgress)

      await trelloService.addComment(
        card.id,
        `🚀 Card has been assigned to **${firstMember.fullName}** and moved to In Progress!`,
      )
    }
  } catch (error) {
    logger.error('Error in Task Progress Handler', error)
  }
}
