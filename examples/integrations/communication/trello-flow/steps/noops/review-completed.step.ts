import { NoopConfig } from 'motia'

export const config: NoopConfig = {
  type: 'noop',
  name: 'Card Review Completed',
  description: 'Card has been reviewed and approved',
  virtualEmits: ['card.reviewCompleted'],
  virtualSubscribes: ['card.needsReview'],
  flows: ['trello'],
}
