import {NoopConfig} from 'motia'

export const config: NoopConfig = {
  type: 'noop',
  name: 'Human Email Review',
  description: 'Manual review of emails flagged as suspicious or requiring human attention',
  virtualSubscribes: ['gmail.email.analyzed'],
  virtualEmits: ['gmail.email.reviewed'],
  flows: ['gmail-flow'],
} 