import { NoopConfig } from 'motia'

export const config: NoopConfig = {
  type: 'noop',
  name: 'Flow Starter',
  description: 'Kickstart the flow',
  virtualSubscribes: ['kickstart-by-event'],
  // fetch mentions are still rederred in the UI, but not possible
  virtualEmits: ['/kickstart', 'fetch-mentions'],
  flows: ['keywords'],
} 

// This is a noop step, this is never called
export const handler = async (_input: any, { traceId, logger, emit }: any) => {
  logger.info('flow starter', _input)
  await emit({
    topic: 'fetch-mentions',
    data: {},
  })
}