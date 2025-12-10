import { NoopConfig } from 'motia';

export const config: NoopConfig = {
  type: 'noop',
  name: 'Paper Upload Webhook',
  description: 'Simulates incoming webhook events for paper uploads',
  virtualEmits: ['paper-uploaded'],
  virtualSubscribes: [],
  flows: ['research-assistant'],
}; 