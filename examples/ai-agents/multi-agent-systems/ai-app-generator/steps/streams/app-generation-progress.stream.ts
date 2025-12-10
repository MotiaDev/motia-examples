/**
 * App Generation Progress Stream
 * 
 * Real-time streaming of app generation progress to connected clients.
 * Clients can subscribe to get live updates on workflow phases, agent activities,
 * code generation progress, and test results.
 */

import type { StreamConfig } from 'motia';
import { z } from 'zod';

export const progressEventSchema = z.object({
  id: z.string(),
  flowId: z.string(),
  timestamp: z.string(),
  phase: z.enum([
    'requested',
    'designing',
    'coding',
    'testing',
    'refining',
    'assembling',
    'completed',
    'failed'
  ]),
  agent: z.enum([
    'architect',
    'engineer',
    'test-designer',
    'test-executor',
    'project-manager',
    'designer',
    'assembly',
    'system'
  ]).optional(),
  message: z.string(),
  progress: z.number().min(0).max(100),
  details: z.object({
    currentModule: z.string().optional(),
    modulesCompleted: z.number().optional(),
    totalModules: z.number().optional(),
    testsRun: z.number().optional(),
    testsPassed: z.number().optional(),
    iteration: z.number().optional(),
    tokensUsed: z.number().optional(),
    estimatedCost: z.number().optional(),
  }).optional(),
});

export type ProgressEvent = z.infer<typeof progressEventSchema>;

export const config: StreamConfig = {
  name: 'appGenerationProgress',
  schema: progressEventSchema,
  baseConfig: { storageType: 'default' },
};

