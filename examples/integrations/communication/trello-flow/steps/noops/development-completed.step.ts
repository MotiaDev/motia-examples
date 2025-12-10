import { NoopConfig } from 'motia'

export const config: NoopConfig = {
  type: 'noop',
  name: 'Card Development Completed',
  description: 'Development is completed and card is ready for review',
  virtualEmits: ['card.developmentCompleted'],
  virtualSubscribes: ['card.inProgress'],
  flows: ['trello'],
}
