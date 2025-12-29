/**
 * Analytics Cron Step
 * Calculates and updates ShopFlow metrics every 15 minutes
 */

import { CronConfig, Handlers } from 'motia';

export const config: CronConfig = {
  type: 'cron',
  name: 'AnalyticsCron',
  description: 'Updates ShopFlow analytics metrics every 15 minutes',
  cron: '*/15 * * * *', // Every 15 minutes
  emits: [],
  flows: ['shopflow'],
};

export const handler: Handlers['AnalyticsCron'] = async ({ logger, state, streams }) => {
  logger.info('Starting analytics cron job');

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get all conversations from today
    const conversations = await state.getGroup<{
      messages: Array<{ role: string; content: string; timestamp: string }>;
      customerId?: string;
      lastIntent?: string;
    }>('shopflow');

    // Get all escalations
    const escalations = await state.getGroup<{
      ticketId: string;
      status: string;
      priority: string;
      createdAt: string;
    }>('shopflow');

    // Calculate metrics
    const metrics = {
      totalConversations: 0,
      resolvedAutomatically: 0,
      escalated: 0,
      avgResponseTime: 0,
      intentBreakdown: {} as Record<string, number>,
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
    };

    // Count conversations and intents
    for (const item of conversations) {
      if ('messages' in item && item.messages) {
        metrics.totalConversations++;
        if (item.lastIntent) {
          metrics.intentBreakdown[item.lastIntent] = 
            (metrics.intentBreakdown[item.lastIntent] || 0) + 1;
        }
      }
    }

    // Count escalations
    for (const item of escalations) {
      if ('ticketId' in item) {
        metrics.escalated++;
      }
    }

    // Calculate auto-resolution rate
    metrics.resolvedAutomatically = metrics.totalConversations - metrics.escalated;
    const autoResolutionRate = metrics.totalConversations > 0
      ? (metrics.resolvedAutomatically / metrics.totalConversations) * 100
      : 0;

    // Update dashboard stream with metrics
    if (streams.supportDashboard) {
      const timestamp = now.toISOString();

      await streams.supportDashboard.set('analytics', 'total_conversations', {
        id: 'total_conversations',
        metric: 'Total Conversations Today',
        value: metrics.totalConversations,
        timestamp,
      });

      await streams.supportDashboard.set('analytics', 'auto_resolution_rate', {
        id: 'auto_resolution_rate',
        metric: 'Auto-Resolution Rate',
        value: Math.round(autoResolutionRate),
        timestamp,
      });

      await streams.supportDashboard.set('analytics', 'pending_escalations', {
        id: 'pending_escalations',
        metric: 'Pending Escalations',
        value: metrics.escalated,
        timestamp,
      });

      // Top intents
      const topIntents = Object.entries(metrics.intentBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      for (const [intent, count] of topIntents) {
        await streams.supportDashboard.set('analytics', `intent_${intent}`, {
          id: `intent_${intent}`,
          metric: `Intent: ${intent}`,
          value: count,
          timestamp,
        });
      }
    }

    logger.info('Analytics updated', {
      totalConversations: metrics.totalConversations,
      autoResolutionRate: `${Math.round(autoResolutionRate)}%`,
      escalated: metrics.escalated,
    });
  } catch (error) {
    logger.error('Error in analytics cron', { error: String(error) });
  }
};

