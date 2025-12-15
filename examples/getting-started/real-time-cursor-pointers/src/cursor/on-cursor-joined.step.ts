import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  roomName: z.string(),
  userId: z.string(),
  username: z.string(),
  color: z.string(),
})

export const config: EventConfig = {
  name: 'OnCursorJoined',
  type: 'event',
  description: 'Handle cursor join events',
  subscribes: ['cursor-joined'],
  emits: [],
  flows: ['realtime-cursor'],
  input: inputSchema,
}

export const handler: Handlers['OnCursorJoined'] = async (input, { logger }) => {
  logger.info('User cursor joined room', {
    roomName: input.roomName,
    userId: input.userId,
    username: input.username,
    timestamp: new Date().toISOString(),
  })
}
