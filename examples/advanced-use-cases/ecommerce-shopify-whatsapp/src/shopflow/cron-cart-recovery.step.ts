/**
 * Cart Recovery Cron Step
 * Scheduled task to send abandoned cart recovery messages
 */

import { CronConfig, Handlers } from 'motia';

export const config: CronConfig = {
  type: 'cron',
  name: 'CartRecoveryCron',
  description: 'Sends abandoned cart recovery messages every 2 hours',
  cron: '0 */2 * * *', // Every 2 hours
  emits: [
    { topic: 'shopflow.cart.recovery.batch', label: 'Cart Recovery Batch' },
  ],
  flows: ['shopflow'],
};

export const handler: Handlers['CartRecoveryCron'] = async ({ emit, logger, state }) => {
  logger.info('Starting cart recovery cron job');

  try {
    // Get all cart keys from state
    const allCarts = await state.getGroup<{
      items: Array<{ variantId: string; title: string; quantity: number; price: string }>;
      total: string;
      waId: string;
      customerName: string;
      customerPhone: string;
      createdAt: string;
      lastReminderSent?: string;
      reminderCount?: number;
    }>('shopflow_carts');

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Filter carts that need recovery messages
    const cartsToRecover = allCarts.filter(cart => {
      const createdAt = new Date(cart.createdAt);
      const lastReminder = cart.lastReminderSent ? new Date(cart.lastReminderSent) : null;
      const reminderCount = cart.reminderCount || 0;

      // Skip if cart is too new (less than 1 hour old)
      if (createdAt > new Date(now.getTime() - 60 * 60 * 1000)) {
        return false;
      }

      // Skip if already sent 3 reminders
      if (reminderCount >= 3) {
        return false;
      }

      // Skip if reminder was sent less than 2 hours ago
      if (lastReminder && lastReminder > twoHoursAgo) {
        return false;
      }

      // Skip if cart is more than 7 days old
      if (createdAt < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) {
        return false;
      }

      return true;
    });

    if (cartsToRecover.length === 0) {
      logger.info('No carts need recovery messages');
      return;
    }

    logger.info('Found carts for recovery', { count: cartsToRecover.length });

    // Emit batch recovery event
    await emit({
      topic: 'shopflow.cart.recovery.batch',
      data: {
        carts: cartsToRecover.map(cart => ({
          waId: cart.waId,
          customerName: cart.customerName,
          customerPhone: cart.customerPhone,
          items: cart.items,
          total: cart.total,
          reminderCount: (cart.reminderCount || 0) + 1,
        })),
        triggeredAt: now.toISOString(),
      },
    });

    logger.info('Cart recovery batch emitted', { cartCount: cartsToRecover.length });
  } catch (error) {
    logger.error('Error in cart recovery cron', { error: String(error) });
  }
};

