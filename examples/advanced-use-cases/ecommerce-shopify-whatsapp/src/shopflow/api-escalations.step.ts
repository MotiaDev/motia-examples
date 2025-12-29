/**
 * Escalations API Step
 * Manages support escalation tickets
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { errorHandlerMiddleware } from '../middlewares/error-handler.middleware';

const escalationSchema = z.object({
  ticketId: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  message: z.string(),
  reason: z.string(),
  sentiment: z.string(),
  intent: z.string().optional(),
  orderId: z.string().optional(),
  orderName: z.string().optional(),
  status: z.string(),
  priority: z.string(),
  assignedTo: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ListEscalations',
  description: 'Lists pending escalation tickets',
  path: '/dashboard/escalations',
  method: 'GET',
  emits: [],
  flows: ['shopflow'],
  middleware: [errorHandlerMiddleware],
  queryParams: [
    { name: 'status', description: 'Filter by status (pending, in_progress, resolved)' },
    { name: 'priority', description: 'Filter by priority (low, normal, high, urgent)' },
  ],
  responseSchema: {
    200: z.object({
      escalations: z.array(escalationSchema),
      total: z.number(),
    }),
  },
};

export const handler: Handlers['ListEscalations'] = async (req, { logger, state }) => {
  const statusFilter = req.queryParams.status as string | undefined;
  const priorityFilter = req.queryParams.priority as string | undefined;

  logger.info('Listing escalations', { statusFilter, priorityFilter });

  try {
    // Get pending escalation IDs
    const pendingIds = await state.get<string[]>('shopflow', 'pending_escalations') || [];

    // Fetch all escalation details
    const escalations: z.infer<typeof escalationSchema>[] = [];

    for (const ticketId of pendingIds) {
      const escalation = await state.get<z.infer<typeof escalationSchema>>(
        'shopflow',
        `escalation_${ticketId}`
      );

      if (escalation) {
        // Apply filters
        if (statusFilter && escalation.status !== statusFilter) continue;
        if (priorityFilter && escalation.priority !== priorityFilter) continue;

        escalations.push(escalation);
      }
    }

    // Sort by priority and creation date
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    escalations.sort((a, b) => {
      const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) -
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return {
      status: 200,
      body: {
        escalations,
        total: escalations.length,
      },
    };
  } catch (error) {
    logger.error('Error listing escalations', { error: String(error) });
    throw error;
  }
};

