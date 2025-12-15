import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  roomName: z.string(),
  userId: z.string(),
})

export const config: EventConfig = {
  name: 'OnCursorLeft',
  type: 'event',
  description: 'Handle cursor leave events',
  subscribes: ['cursor-left'],
  emits: [],
  flows: ['realtime-cursor'],
  input: inputSchema,
}

export const handler: Handlers['OnCursorLeft'] = async (input, { logger }) => {
  logger.info('User cursor left room', {
    roomName: input.roomName,
    userId: input.userId,
    timestamp: new Date().toISOString(),
  })
}
