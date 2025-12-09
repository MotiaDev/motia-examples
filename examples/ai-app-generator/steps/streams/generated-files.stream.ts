/**
 * Generated Files Stream
 * 
 * Real-time streaming of generated code files to connected clients.
 * Allows users to preview files as they are generated.
 */

import type { StreamConfig } from 'motia';
import { z } from 'zod';

export const generatedFileStreamSchema = z.object({
  id: z.string(),
  flowId: z.string(),
  path: z.string(),
  content: z.string(),
  language: z.enum(['typescript', 'javascript', 'json', 'css', 'html', 'markdown', 'yaml']),
  moduleType: z.enum(['component', 'utility', 'hook', 'service', 'type', 'config', 'test', 'style']),
  status: z.enum(['generating', 'completed', 'failed']),
  generatedAt: z.string(),
  linesOfCode: z.number(),
});

export type GeneratedFileStream = z.infer<typeof generatedFileStreamSchema>;

export const config: StreamConfig = {
  name: 'generatedFiles',
  schema: generatedFileStreamSchema,
  baseConfig: { storageType: 'default' },
};

