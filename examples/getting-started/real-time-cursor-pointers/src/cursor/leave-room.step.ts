import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

const bodySchema = z.object({
  roomName: z.string().min(1),
  userId: z.string().min(1),
})

export const config: ApiRouteConfig = {
  name: 'LeaveRoom',
  type: 'api',
  path: '/cursor/leave',
  method: 'POST',
  description: 'Leave a room and remove cursor',
  emits: ['cursor-left'],
  flows: ['realtime-cursor'],
  bodySchema,
  responseSchema: {
    200: z.object({ success: z.boolean() }),
    400: z.object({ error: z.string() }),
  },
}

export const handler: Handlers['LeaveRoom'] = async (req, { streams, emit, logger }) => {
  try {
    const { roomName, userId } = bodySchema.parse(req.body)

    const removed = await streams.cursorPosition.delete(roomName, userId)

    if (removed) {
      await streams.cursorPosition.send(
        { groupId: roomName },
        { type: 'user-left', data: { userId } }
      )

      await emit({
        topic: 'cursor-left',
        data: { roomName, userId },
      })

      logger.info('User left room', { roomName, userId })
    }

    return { status: 200, body: { success: true } }
  } catch (error) {
    logger.error('Failed to leave room', { error: String(error) })
    return { status: 400, body: { error: 'Failed to leave room' } }
  }
}
