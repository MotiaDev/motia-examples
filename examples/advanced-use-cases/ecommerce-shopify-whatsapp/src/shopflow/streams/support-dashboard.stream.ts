/**
 * Support Dashboard Stream
 * Real-time streaming for the ShopFlow support dashboard
 */

import { StreamConfig } from 'motia';
import { z } from 'zod';

// Conversation schema for tracking active customer conversations
const conversationSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  phone: z.string(),
  lastMessage: z.string(),
  lastIntent: z.string(),
  status: z.enum(['active', 'resolved', 'escalated', 'pending']),
  ticketId: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  customerId: z.string().optional(),
  updatedAt: z.string(),
});

// Escalation schema for tracking issues requiring human attention
const escalationSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  waId: z.string(),
  message: z.string(),
  reason: z.string(),
  sentiment: z.string(),
  intent: z.string().optional(),
  orderId: z.string().optional(),
  orderName: z.string().optional(),
  orderTotal: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'resolved', 'closed']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  assignedTo: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Refund request schema
const refundRequestSchema = z.object({
  id: z.string(),
  orderName: z.string(),
  customerName: z.string(),
  phone: z.string(),
  amount: z.string(),
  reason: z.string(),
  status: z.enum(['pending', 'approved', 'rejected', 'processed']),
  aiDecision: z.string(),
  createdAt: z.string(),
});

// Analytics schema for real-time metrics
const analyticsSchema = z.object({
  id: z.string(),
  metric: z.string(),
  value: z.number(),
  change: z.number().optional(),
  timestamp: z.string(),
});

// Combined dashboard data schema
const dashboardDataSchema = z.union([
  conversationSchema,
  escalationSchema,
  refundRequestSchema,
  analyticsSchema,
]);

export const config: StreamConfig = {
  name: 'supportDashboard',
  schema: dashboardDataSchema,
  baseConfig: { storageType: 'default' },
  canAccess: async (subscription, authContext) => {
    // In production, verify agent has support dashboard access
    // For now, allow all authenticated requests
    return true;
  },
};

export type ConversationData = z.infer<typeof conversationSchema>;
export type EscalationData = z.infer<typeof escalationSchema>;
export type RefundRequestData = z.infer<typeof refundRequestSchema>;
export type AnalyticsData = z.infer<typeof analyticsSchema>;

