import { z } from 'zod'

/**
 * Centralized event schemas for the micro-actions-like-feed flow
 * Ensures consistent event naming with 'like:' prefix and standardized payloads
 */

// Base event data that all like-related events share
const BaseLikeEventData = z.object({
  postId: z.string().min(1, 'postId must not be empty'),
  userId: z.string().min(1, 'userId must not be empty'),
  timestamp: z.string().datetime('timestamp must be valid ISO datetime'),
  traceId: z.string().min(1, 'traceId must not be empty')
})

/**
 * Schema for like:post event
 * Emitted by: like-api step
 * Consumed by: enqueue-side-effects step
 */
export const LikePostEventSchema = BaseLikeEventData.extend({})

/**
 * Schema for like:notify-owner event
 * Emitted by: enqueue-side-effects step
 * Consumed by: notify-owner step
 */
export const NotifyOwnerEventSchema = BaseLikeEventData.extend({})

/**
 * Schema for like:update-feed event
 * Emitted by: enqueue-side-effects step
 * Consumed by: update-feed step
 */
export const UpdateFeedEventSchema = BaseLikeEventData.extend({})

/**
 * Type definitions for event payloads
 */
export type LikePostEvent = z.infer<typeof LikePostEventSchema>
export type NotifyOwnerEvent = z.infer<typeof NotifyOwnerEventSchema>
export type UpdateFeedEvent = z.infer<typeof UpdateFeedEventSchema>

/**
 * Event topic constants to ensure consistent naming
 */
export const EVENT_TOPICS = {
  LIKE_POST: 'like:post',
  LIKE_NOTIFY_OWNER: 'like:notify-owner',
  LIKE_UPDATE_FEED: 'like:update-feed'
} as const

/**
 * Flow name constant
 */
export const FLOW_NAME = 'micro-actions-like-feed'