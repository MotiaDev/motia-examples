import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { cursorPositionSchema } from './cursor-positions.stream'

const bodySchema = z.object({
  roomName: z.string().min(1),
  userId: z.string().min(1),
  username: z.string().min(1),
  color: z.string().optional(),
})

export const config: ApiRouteConfig = {
  name: 'JoinRoom',
  type: 'api',
  path: '/cursor/join',
  method: 'POST',
  description: 'Join a room and get existing cursors',
  emits: ['cursor-joined'],
  flows: ['realtime-cursor'],
  bodySchema,
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      cursor: cursorPositionSchema,
      existingCursors: z.array(cursorPositionSchema),
    }),
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

export const handler: Handlers['JoinRoom'] = async (req, { streams, emit, logger }) => {
  try {
    const { roomName, userId, username, color } = bodySchema.parse(req.body)
    const cursorColor = color || generateColor(userId)

    const existingCursors = await streams.cursorPosition.getGroup(roomName)

    const cursor = await streams.cursorPosition.set(roomName, userId, {
      id: userId,
      x: 0,
      y: 0,
      username,
      color: cursorColor,
      lastUpdated: new Date().toISOString(),
    })

    await streams.cursorPosition.send(
      { groupId: roomName },
      { type: 'user-joined', data: { userId, username, color: cursorColor } }
    )

    await emit({
      topic: 'cursor-joined',
      data: { roomName, userId, username, color: cursorColor },
    })

    logger.info('User joined room', { roomName, userId, username })

    return {
      status: 200,
      body: {
        success: true,
        cursor,
        existingCursors: existingCursors.filter(c => c.id !== userId),
      },
    }
  } catch (error) {
    logger.error('Failed to join room', { error: String(error) })
    return { status: 400, body: { error: 'Failed to join room' } }
  }
}
