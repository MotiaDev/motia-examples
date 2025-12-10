/**
 * Cron trigger step for Motia Uptime Monitor
 * Periodically triggers website checks based on configured schedule
 */

import { config as envConfig } from '../lib/env.js';

export const config = {
  type: 'cron',
  name: 'UptimeCronTrigger',
  cron: envConfig.cron,
  emits: ['check.requested'],
  flows: ['uptime-monitoring']
};

/**
 * Cron handler that emits check requests for all configured sites
 * @param {Object} context - Motia execution context
 */
export async function handler(context) {
  context.logger.info(`Starting uptime checks for ${envConfig.sites.length} sites`);
  context.logger.info(`Sites configured: ${JSON.stringify(envConfig.sites)}`);

  try {
    // Emit one check.requested event per configured site URL
    for (const url of envConfig.sites) {
      context.logger.info(`Scheduling check for: ${url}`);
      context.logger.info(`About to emit 'check.requested' with url: ${url}`);

      // Simple, direct emit call
      await context.emit({ topic: 'check.requested', data: { url: url } });
      context.logger.info(`Successfully emitted for: ${url}`);
    }

    context.logger.info(`Successfully scheduled checks for all ${envConfig.sites.length} sites`);
  } catch (error) {
    context.logger.error('Error during cron execution:', error);
    throw error;
  }
}