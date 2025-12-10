import { CronConfig, FlowContext } from 'motia'
import { TrelloService } from '../services/trello.service'

export const config: CronConfig = {
  type: 'cron',
  name: 'Check Overdue Cards',
  description: 'Identifies and flags cards that have passed their due date',
  cron: '0 * * * *',
  emits: [],
  flows: ['trello'],
}

export const handler = async ({ logger }: FlowContext) => {
  const { appConfig } = await import('../config/default')
  const trello = new TrelloService(appConfig.trello, logger)
  logger.info('Starting overdue task check')

  try {
    const listsToCheck = [
      appConfig.trello.lists.newTasks,
      appConfig.trello.lists.inProgress,
      appConfig.trello.lists.needsReview,
    ]

    for (const listId of listsToCheck) {
      const cards = await trello.getCardsInList(listId)

      for (const card of cards) {
        if (card.due && new Date(card.due) < new Date()) {
          logger.info('Found overdue card', { cardId: card.id, name: card.name })
          await trello.addComment(card.id, '⚠️ OVERDUE: This card has passed its due date!')
        }
      }
    }

    logger.info('Completed overdue task check')
  } catch (error) {
    logger.error('Error checking overdue tasks', error)
  }
}
