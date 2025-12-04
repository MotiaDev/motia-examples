import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import type { LeadWithScore } from '../../src/services/lead-service';
import type { EmailDraft, EmailRecord } from '../../src/services/email-draft-service';
import { sendEmail } from '../../src/services/resend-service';

const bodySchema = z.object({
  customSubject: z.string().optional(),
  customHtml: z.string().optional(),
  customText: z.string().optional(),
});

export const config: ApiRouteConfig = {
  name: 'SendIndividualEmail',
  type: 'api',
  description: 'Send email to a specific lead. Supports custom content override.',
  path: '/leads/:flowId/:leadId/send',
  method: 'POST',
  emits: [],
  flows: ['lead-score-flow'],
  bodySchema,
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      leadId: z.string(),
      email: z.string(),
      resendId: z.string().optional(),
      message: z.string(),
    }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['SendIndividualEmail'] = async (req, { logger, state }) => {
  const { flowId, leadId } = req.pathParams;

  try {
    const body = bodySchema.parse(req.body);
    const { customSubject, customHtml, customText } = body;

    logger.info('Sending individual email', { flowId, leadId });

    // Get lead data
    const scoredLeads = await state.get<LeadWithScore[]>('scored-leads', flowId) || [];
    const lead = scoredLeads.find(l => l.id === leadId);

    if (!lead) {
      return {
        status: 404,
        body: { error: `Lead ${leadId} not found in flow ${flowId}` },
      };
    }

    // Get draft
    const drafts = await state.get<EmailDraft[]>('email-drafts', flowId) || [];
    const draft = drafts.find(d => d.leadId === leadId);

    if (!draft && !customHtml) {
      return {
        status: 400,
        body: { error: 'No draft found for this lead. Provide customHtml to send without draft.' },
      };
    }

    // Send email to lead's actual email
    const result = await sendEmail({
      to: lead.email,
      subject: customSubject || draft?.subject || `Message for ${lead.name}`,
      html: customHtml || draft?.htmlContent || '',
      text: customText || draft?.textContent,
      tags: [
        { name: 'flow_id', value: flowId },
        { name: 'lead_id', value: leadId },
        { name: 'tier', value: lead.tier },
      ],
    });

    if (result.success) {
      // Track sent email
      const emailRecords = await state.get<EmailRecord[]>('email-records', flowId) || [];
      emailRecords.push({
        id: `email_${Date.now()}`,
        flowId,
        leadId,
        leadEmail: lead.email,
        subject: customSubject || draft?.subject || '',
        status: 'sent',
        resendId: result.resendId,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await state.set('email-records', flowId, emailRecords);

      logger.info('Email sent successfully', { leadId, email: lead.email, resendId: result.resendId });

      return {
        status: 200,
        body: {
          success: true,
          leadId,
          email: lead.email,
          resendId: result.resendId,
          message: 'Email sent successfully',
        },
      };
    } else {
      logger.error('Failed to send email', { leadId, email: lead.email, error: result.error });

      return {
        status: 400,
        body: { error: `Failed to send email: ${result.error}` },
      };
    }
  } catch (error) {
    logger.error('Error sending individual email', { error: error instanceof Error ? error.message : 'Unknown' });
    
    if (error instanceof z.ZodError) {
      return {
        status: 400,
        body: { error: error.errors.map(e => e.message).join(', ') },
      };
    }

    return {
      status: 400,
      body: { error: error instanceof Error ? error.message : 'Failed to send email' },
    };
  }
};
