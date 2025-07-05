import { EventConfig, StepHandler } from 'motia'
import { z } from 'zod'

type Input = typeof inputSchema

const inputSchema = z.object({})

export const config: EventConfig<Input> = {
  type: 'event',
  name: 'Set state change',
  description: 'set a state change for evaluation',
  subscribes: ['test-state'],
  emits: ['check-state-change'],
  input: inputSchema,
  flows: ['default'],
}

export const handler: StepHandler<typeof config> = async (input, { traceId, logger, state, emit }) => {
  logger.info('step one, set a value in state')

  const message = 'welcome to motia!';
  await state.set<any>(traceId, 'test', message)

  await emit({
    topic: 'check-state-change',
    data: {key: 'test', expected: message}
  })
}
