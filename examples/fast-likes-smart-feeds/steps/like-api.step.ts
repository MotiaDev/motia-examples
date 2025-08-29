import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { EVENT_TOPICS, FLOW_NAME, LikePostEvent } from './schemas'

// In-memory storage for like records
const likesStore = new Map<string, Array<{ userId: string, timestamp: string, traceId: string }>>()

// Supabase client
let supabaseClient: any = null

async function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseKey) {
      try {
        // Dynamic import to make Supabase optional
        const supabaseModule = await import('@supabase/supabase-js')
        supabaseClient = supabaseModule.createClient(supabaseUrl, supabaseKey)
      } catch (error) {
        console.warn('Supabase package not installed - using in-memory storage only')
        return null
      }
    }
  }
  return supabaseClient
}

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'LikeApi',
  description: 'Fast-response API endpoint for liking posts',

  method: 'POST',
  path: '/like/:postId',

  /**
   * This API Step emits events to topic `like:post`
   */
  emits: [EVENT_TOPICS.LIKE_POST],



  /** 
   * Expected response body for type checking and documentation
   */
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      postId: z.string(),
      traceId: z.string(),
      alreadyLiked: z.boolean().optional(),
    }),
    400: z.object({
      error: z.string(),
      message: z.string(),
    }),
    500: z.object({
      error: z.string(),
      message: z.string(),
    })
  },

  /**
   * The flows this step belongs to, will be available in Workbench
   */
  flows: [FLOW_NAME],
}

export const handler: Handlers['LikeApi'] = async (req, { logger, emit, traceId }) => {
  try {
    /** 
     * Extract postId from path parameters
     * Based on the logs, the request object has pathParams property
     */
    let postId = ''

    // The correct way for current Motia version - use pathParams
    if ((req as any).pathParams && (req as any).pathParams.postId) {
      postId = (req as any).pathParams.postId
      logger.info('Extracted postId from pathParams', { postId, traceId })
    }
    // Fallback methods for other versions
    else if ((req as any).params && (req as any).params.postId) {
      postId = (req as any).params.postId
      logger.info('Extracted postId from params', { postId, traceId })
    }
    else {
      // Log the actual pathParams content to debug further
      logger.info('Debug pathParams content', {
        pathParams: (req as any).pathParams,
        pathParamsKeys: (req as any).pathParams ? Object.keys((req as any).pathParams) : 'undefined',
        traceId
      })

      logger.error('Could not extract postId from request', { traceId })
      return {
        status: 400,
        body: {
          error: 'Bad Request',
          message: 'Invalid request format - could not extract postId',
        },
      }
    }

    // Validate postId using Zod schema with more comprehensive validation
    const postIdSchema = z.string()
      .min(1, 'postId must not be empty')
      .max(100, 'postId too long')
      .regex(/^[a-zA-Z0-9\-_]+$/, 'postId contains invalid characters')

    const validationResult = postIdSchema.safeParse(postId)

    if (!validationResult.success) {
      logger.error('Invalid postId parameter', {
        postId,
        error: validationResult.error.issues.map(i => i.message).join(', '),
        traceId
      })
      return {
        status: 400,
        body: {
          error: 'Bad Request',
          message: `Invalid postId parameter: ${validationResult.error.issues.map(i => i.message).join(', ')}`,
        },
      }
    }

    const validPostId = validationResult.data
    logger.info('Processing like request', { postId: validPostId, traceId })

    const likeTimestamp = new Date().toISOString()
    const userId = 'user-demo' // Mock user ID for demo

    // Check if already liked in memory
    let alreadyLiked = false
    if (likesStore.has(validPostId)) {
      const postLikes = likesStore.get(validPostId)!
      alreadyLiked = postLikes.some(like => like.userId === userId)
    }

    if (alreadyLiked) {
      logger.info('👍 Post already liked by user - returning existing like status', {
        postId: validPostId,
        userId,
        traceId,
        action: 'duplicate-like'
      })

      return {
        status: 200,
        body: {
          success: true,
          message: 'Post already liked',
          postId: validPostId,
          traceId,
          alreadyLiked: true
        },
      }
    }

    try {
      /**
       * Store like data in memory immediately
       */
      const likeRecord = {
        userId,
        timestamp: likeTimestamp,
        traceId
      }

      if (!likesStore.has(validPostId)) {
        likesStore.set(validPostId, [])
      }

      const postLikes = likesStore.get(validPostId)!
      postLikes.push(likeRecord)

      logger.info('💾 Like stored in memory', { postId: validPostId, userId, traceId })

    } catch (storageError) {
      logger.error('Failed to store like data in memory', {
        error: storageError instanceof Error ? storageError.message : 'Unknown storage error',
        postId: validPostId,
        traceId
      })
      return {
        status: 500,
        body: {
          error: 'Internal Server Error',
          message: 'Failed to store like data',
        },
      }
    }

    try {
      /**
       * Store like data in Supabase database immediately
       */
      const supabase = await getSupabaseClient()

      if (supabase) {
        const likeData = {
          post_id: validPostId,
          user_id: userId,
          liked_at: likeTimestamp,
          trace_id: traceId,
          created_at: likeTimestamp
        }

        const { data, error } = await supabase
          .from('likes')
          .insert(likeData)
          .select()

        if (error) {
          // Check if it's a duplicate key error (unique constraint violation)
          if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
            logger.info('👍 Post already liked in Supabase - user tried to like again', {
              postId: validPostId,
              userId,
              traceId,
              action: 'duplicate-like-supabase'
            })
            
            // Return early - don't trigger side effects for duplicate likes
            return {
              status: 200,
              body: {
                success: true,
                message: 'Post already liked',
                postId: validPostId,
                traceId,
                alreadyLiked: true
              },
            }
          } else {
            logger.error('Failed to store like in Supabase', {
              error: error.message,
              errorCode: error.code,
              postId: validPostId,
              userId,
              traceId
            })
            // Don't fail the API call for database errors - continue with in-memory storage
          }
        } else {
          logger.info('✅ Like successfully stored in Supabase', {
            postId: validPostId,
            userId,
            supabaseId: data?.[0]?.id,
            traceId,
            action: 'supabase-write'
          })

          // Update like count
          try {
            await supabase.rpc('increment_like_count', { post_id: validPostId })
            logger.info('📊 Post like count updated in Supabase', {
              postId: validPostId,
              traceId
            })
          } catch (countError) {
            logger.error('Failed to update like count', {
              error: countError instanceof Error ? countError.message : 'Unknown error',
              postId: validPostId,
              traceId
            })
          }
        }
      } else {
        logger.info('⚠️ Supabase not configured - using in-memory storage only', {
          postId: validPostId,
          traceId
        })
      }

    } catch (supabaseError) {
      logger.error('Supabase operation failed', {
        error: supabaseError instanceof Error ? supabaseError.message : 'Unknown error',
        postId: validPostId,
        userId,
        traceId
      })
      // Don't fail the API call for database errors
    }

    try {
      /**
       * Emit like:post event with postId and user information
       */
      const eventData: LikePostEvent = {
        postId: validPostId,
        userId,
        timestamp: likeTimestamp,
        traceId
      }

      // Debug: Log what we're about to emit
      logger.info('About to emit event', {
        topic: EVENT_TOPICS.LIKE_POST,
        eventData: eventData,
        traceId
      })

      await (emit as any)({
        topic: EVENT_TOPICS.LIKE_POST,
        data: eventData,
      })

      logger.info(`${EVENT_TOPICS.LIKE_POST} event emitted successfully`, {
        postId: validPostId,
        eventData: eventData,
        traceId
      })

    } catch (emitError) {
      logger.error(`Failed to emit ${EVENT_TOPICS.LIKE_POST} event`, {
        error: emitError instanceof Error ? emitError.message : 'Unknown emit error',
        postId: validPostId,
        traceId
      })
      // Continue and return success since the like was stored successfully
      // The event emission failure shouldn't block the user response
      logger.info('Continuing with success response despite event emission failure', {
        postId: validPostId,
        traceId
      })
    }

    /**
     * Return immediate success response with like confirmation
     */
    return {
      status: 200,
      body: {
        success: true,
        message: 'Post liked successfully',
        postId: validPostId,
        traceId,
        alreadyLiked: false
      },
    }

  } catch (error) {
    logger.error('Unexpected error processing like request', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      traceId
    })

    return {
      status: 500,
      body: {
        error: 'Internal Server Error',
        message: 'Failed to process like request',
      },
    }
  }
}