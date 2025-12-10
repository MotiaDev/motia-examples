import { StreamConfig } from 'motia'
import { z } from 'zod'

export const chatMessagesSchema = z.object({
  roomId: z.string(),
  messages: z.array(z.object({
    messageId: z.string(),
    message: z.string(),
    username: z.string(),
    timestamp: z.string(),
    sentiment: z.string().optional(),
    isModerated: z.boolean().optional(),
    flags: z.array(z.string()).optional()
  })),
  totalMessages: z.number(),
  lastActivity: z.string()
})

export const config: StreamConfig = {
  name: 'chatMessages',
  schema: chatMessagesSchema,
  baseConfig: {
    storageType: 'default',
  },
}
