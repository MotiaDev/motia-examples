/**
 * Dashboard API Step
 * Provides REST API for the ShopFlow support dashboard
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { errorHandlerMiddleware } from '../middlewares/error-handler.middleware';

const dashboardStatsSchema = z.object({
  totalConversations: z.number(),
  autoResolutionRate: z.number(),
  pendingEscalations: z.number(),
  topIntents: z.array(z.object({
    intent: z.string(),
    count: z.number(),
  })),
  recentActivity: z.array(z.object({
    type: z.string(),
    description: z.string(),
    timestamp: z.string(),
  })),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'DashboardStats',
  description: 'Returns ShopFlow dashboard statistics',
  path: '/dashboard/stats',
  method: 'GET',
  emits: [],
  flows: ['shopflow'],
  middleware: [errorHandlerMiddleware],
  responseSchema: {
    200: dashboardStatsSchema,
  },
};

export const handler: Handlers['DashboardStats'] = async (req, { logger, state }) => {
  logger.info('Fetching dashboard stats');

  try {
    // Get conversation data
    const conversations = await state.getGroup<{
      messages: Array<{ role: string; content: string; timestamp: string }>;
      lastIntent?: string;
    }>('shopflow');

    // Get pending escalations
    const pendingEscalations = await state.get<string[]>('shopflow', 'pending_escalations') || [];

    // Calculate intent breakdown
    const intentCounts: Record<string, number> = {};
    let totalConversations = 0;

    for (const item of conversations) {
      if ('messages' in item && item.messages) {
        totalConversations++;
        if (item.lastIntent) {
          intentCounts[item.lastIntent] = (intentCounts[item.lastIntent] || 0) + 1;
        }
      }
    }

    const topIntents = Object.entries(intentCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([intent, count]) => ({ intent, count }));

    // Calculate auto-resolution rate
    const escalatedCount = pendingEscalations.length;
    const autoResolutionRate = totalConversations > 0
      ? Math.round(((totalConversations - escalatedCount) / totalConversations) * 100)
      : 0;

    // Get recent activity (last 10 events)
    const recentActivity: Array<{ type: string; description: string; timestamp: string }> = [];

    return {
      status: 200,
      body: {
        totalConversations,
        autoResolutionRate,
        pendingEscalations: escalatedCount,
        topIntents,
        recentActivity,
      },
    };
  } catch (error) {
    logger.error('Error fetching dashboard stats', { error: String(error) });
    throw error;
  }
};

