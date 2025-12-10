import { NoopConfig } from 'motia';

export const config: NoopConfig = {
  type: 'noop',
  name: 'Research Monitor',
  description: 'Monitors research paper analysis progress',
  virtualSubscribes: [
    'paper-analyzed', 
    'summary-generated', 
    'research-gaps-analyzed'
  ],
  virtualEmits: [
    'monitor-checkpoint',
    'monitor-alert'
  ],
  flows: ['research-assistant']
}; 