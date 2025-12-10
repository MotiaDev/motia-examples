import { NoopConfig } from 'motia';

export const config: NoopConfig = {
  type: 'noop',
  name: 'Human Review',
  description: 'Human researcher reviews and validates AI analysis',
  // Subscribe to the complete knowledge graph
  virtualSubscribes: ['knowledge-graph-updated'],
  // When human approves, emit these events
  virtualEmits: ['human-review-approved', 'human-review-rejected', 'human-review-feedback'],
  flows: ['research-assistant']
}; 