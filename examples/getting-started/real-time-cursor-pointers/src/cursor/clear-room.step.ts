import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

const bodySchema = z.object({
  roomName: z.string().min(1),
})

export const config: ApiRouteConfig = {
  name: 'ClearRoom',
  type: 'api',
  path: '/cursor/clear',
  method: 'POST',
  description: 'Clear all cursors in a room',
  emits: [],
  flows: ['realtime-cursor'],
  bodySchema,
  responseSchema: {
    200: z.object({ success: z.boolean(), cleared: z.number() }),
    400: z.object({ error: z.string() }),
  },
}

export const handler: Handlers['ClearRoom'] = async (req, { streams, logger }) => {
  try {
    const { roomName } = bodySchema.parse(req.body)

    const cursors = await streams.cursorPosition.getGroup(roomName)

    for (const cursor of cursors) {
      await streams.cursorPosition.delete(roomName, cursor.id)
    }

    logger.info('Cleared room', { roomName, cleared: cursors.length })

    return { status: 200, body: { success: true, cleared: cursors.length } }
  } catch (error) {
    logger.error('Failed to clear room', { error: String(error) })
    return { status: 400, body: { error: 'Failed to clear room' } }
  }
}
