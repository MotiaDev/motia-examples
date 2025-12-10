import { StreamConfig } from 'motia'
import { z } from 'zod'

export const config: StreamConfig = {
  name: 'processingProgress',
  schema: z.object({
    status: z.enum(['started', 'processing', 'completed', 'error']),
    progress: z.number().min(0).max(100),
    results: z.object({
      wordCount: z.number().optional(),
      sentiment: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      summary: z.string().optional()
    })
  }),
  baseConfig: {
    storageType: 'default',
  },
}
