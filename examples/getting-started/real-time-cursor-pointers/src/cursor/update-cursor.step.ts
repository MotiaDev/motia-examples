import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { cursorPositionSchema } from './cursor-positions.stream'

const bodySchema = z.object({
  roomName: z.string().min(1),
  userId: z.string().min(1),
  x: z.number(),
  y: z.number(),
  username: z.string().min(1),
  color: z.string().optional(),
})

export const config: ApiRouteConfig = {
  name: 'UpdateCursor',
  type: 'api',
  path: '/cursor/update',
  method: 'POST',
  description: 'Update cursor position',
  emits: [],
  flows: ['realtime-cursor'],
  bodySchema,
  responseSchema: {
    200: cursorPositionSchema,
    400: z.object({ error: z.string() }),
  },
}

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#06b6d4',
]

function generateColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

export const handler: Handlers['UpdateCursor'] = async (req, { streams, logger }) => {
  try {
    const { roomName, userId, x, y, username, color } = bodySchema.parse(req.body)

    const cursor = await streams.cursorPosition.set(roomName, userId, {
      id: userId,
      x,
      y,
      username,
      color: color || generateColor(userId),
      lastUpdated: new Date().toISOString(),
    })

    logger.debug('Cursor updated', { roomName, userId, x, y })

    return { status: 200, body: cursor }
  } catch (error) {
    logger.error('Failed to update cursor', { error: String(error) })
    return { status: 400, body: { error: 'Failed to update cursor' } }
  }
}
