import type { StreamConfig } from 'motia';
import { z } from 'zod';

export const chatResponseSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  status: z.enum(['processing', 'searching', 'analyzing', 'complete', 'error']),
  searchResults: z.array(z.object({
    title: z.string(),
    link: z.string(),
  })).optional(),
  timestamp: z.string(),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;

export const config: StreamConfig = {
  name: 'chatResponse',
  schema: chatResponseSchema,
  baseConfig: { storageType: 'default' },
};


