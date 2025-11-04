import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'AdminFriendsDelete',
  description: 'Delete a friend from admin panel',
  method: 'DELETE',
  path: '/api/admin/friends/:friendId',
  responseSchema: {
    200: z.object({
      message: z.string()
    }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() })
  },
  emits: [],
  flows: ['wake-surf-club']
}

export const handler: Handlers['AdminFriendsDelete'] = async (req, { logger, state, traceId }) => {
  try {
    const friendId = req.params.friendId
    
    if (!friendId) {
      return {
        status: 400,
        body: { error: 'Friend ID is required' }
      }
    }

    // Check if friend exists
    const friend = await state.get('friends', friendId)
    if (!friend) {
      return {
        status: 404,
        body: { error: 'Friend not found' }
      }
    }

    // Delete the friend
    await state.delete('friends', friendId)
    
    // Also delete from phone lookup
    if (friend.phoneE164) {
      await state.delete('friendsByPhone', friend.phoneE164)
    }

    logger.info('Friend deleted by admin', { 
      friendId, 
      friendName: friend.name,
      traceId 
    })

    return {
      status: 200,
      body: { message: 'Friend deleted successfully' }
    }
  } catch (error: any) {
    logger.error('Failed to delete friend', { 
      error: error.message, 
      friendId: req.params.friendId,
      traceId 
    })
    
    return {
      status: 500,
      body: { error: 'Failed to delete friend' }
    }
  }
}
