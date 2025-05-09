// human-transfer.step.ts
import { NoopConfig } from 'motia'

export const config: NoopConfig = {
    type: 'noop',
    name: 'human-transfer',
    virtualEmits: ['docs-transferred'],
    virtualSubscribes: ['documentation-integrated'],
    flows: ['documentation-guardian'],
}