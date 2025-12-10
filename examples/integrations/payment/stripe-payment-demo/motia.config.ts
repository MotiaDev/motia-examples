import path from 'node:path'
import { config, type MotiaPlugin, type MotiaPluginContext } from '@motiadev/core'

const statesPlugin = require('@motiadev/plugin-states/plugin')
const endpointPlugin = require('@motiadev/plugin-endpoint/plugin')
const logsPlugin = require('@motiadev/plugin-logs/plugin')
const observabilityPlugin = require('@motiadev/plugin-observability/plugin')

function paymentDashboardPlugin(motia: MotiaPluginContext): MotiaPlugin {
  motia.registerApi(
    {
      method: 'GET',
      path: '/__motia/payment-stats',
    },
    async (req, ctx) => {
      try {
        const payments = await ctx.state.getGroup('payments') || [];
        
        const totalPayments = payments.length;
        const successfulPayments = payments.filter((p: any) => p.status === 'succeeded').length;
        const failedPayments = payments.filter((p: any) => p.status === 'failed').length;
        const pendingPayments = payments.filter((p: any) => p.status === 'pending' || p.status === 'requires_payment_method').length;
        
        const totalRevenue = payments
          .filter((p: any) => p.status === 'succeeded')
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        
        const recentPayments = payments
          .sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt || a.succeededAt || 0).getTime();
            const dateB = new Date(b.createdAt || b.succeededAt || 0).getTime();
            return dateB - dateA;
          })
          .slice(0, 10)
          .map((p: any) => ({
            id: p.id,
            amount: p.amount,
            currency: p.currency,
            status: p.status,
            createdAt: p.createdAt || p.succeededAt || new Date().toISOString(),
            customerId: p.customerId,
          }));

        return {
          status: 200,
          body: {
            totalPayments,
            successfulPayments,
            failedPayments,
            pendingPayments,
            totalRevenue,
            recentPayments,
          },
        };
      } catch (error) {
        ctx.logger.error('Failed to fetch stats', { error });
        return {
          status: 500,
          body: { error: 'Failed to fetch payment statistics' },
        };
      }
    }
  );

  return {
    dirname: path.join(__dirname, 'plugins/payment-dashboard'),
    workbench: [
      {
        packageName: '~/plugins/payment-dashboard',
        componentName: 'PaymentDashboard',
        label: 'Payments',
        labelIcon: 'credit-card',
        position: 'top',
      },
    ],
  }
}

export default config({
  plugins: [
    observabilityPlugin,
    statesPlugin,
    endpointPlugin,
    logsPlugin,
    paymentDashboardPlugin,
  ],
})
