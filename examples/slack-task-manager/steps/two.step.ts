import { EventConfig, StepHandler } from 'motia'
import { z } from 'zod'

type Input = typeof inputSchema

const inputSchema = z.object({
  key: z.string(),
  expected: z.optional(z.unknown()),
})

export const config: EventConfig<Input> = {
  type: 'event',
  name: 'Check state change',
  description: 'check state change',
  subscribes: ['check-state-change'],
  emits: [],
  input: inputSchema,
  flows: ['default'],
}

export const handler: StepHandler<typeof config> = async (input, { traceId, logger, state }) => {
  logger.info('received check-state-change event', input)

  const value = await state.get<any>(traceId, input.key)

  if (value !== input.expected) {
    logger.error(`🔴 the provided  value for the state key ${input.key} does not match`, { value, expected: input.expected })
  } else {
    logger.info(`🟢 the provided value matches the state value for key ${input.key} 🏁`)
  }
}
