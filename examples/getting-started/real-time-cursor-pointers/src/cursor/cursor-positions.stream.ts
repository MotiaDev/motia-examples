import { StreamConfig } from 'motia'
import { z } from 'zod'

export const cursorPositionSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  username: z.string(),
  color: z.string(),
  lastUpdated: z.string(),
})

export type CursorPosition = z.infer<typeof cursorPositionSchema>

export const config: StreamConfig = {
  name: 'cursorPosition',
  schema: cursorPositionSchema,
  baseConfig: { storageType: 'default' },
}
