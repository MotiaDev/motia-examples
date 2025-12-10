import { NoopConfig } from 'motia'

export const config: NoopConfig = {
  type: 'noop',
  name: 'Card Validation Completed',
  description: 'Card has been validated and is ready for development',
  virtualEmits: [
    {
      topic: 'card.readyForDevelopment',
      label: 'Card Ready for Development',
    },
  ],
  virtualSubscribes: ['card.validated'],
  flows: ['trello'],
}
