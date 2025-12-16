/**
 * Send Outreach API Step
 * Send drafted outreach emails via Resend
 */
import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { ApiMiddleware } from 'motia'
import { ZodError } from 'zod'

const coreMiddleware: ApiMiddleware = async (req, ctx, next) => {
  try {
    return await next()
  } catch (error: any) {
    if (error instanceof ZodError) {
      return { status: 400, body: { error: 'Validation failed' } }
    }
    ctx.logger.error('Request failed', { error: error.message })
    return { status: 500, body: { error: 'Internal Server Error' } }
  }
}

const bodySchema = z.object({
  prospect_id: z.string(),
  use_generated_email: z.boolean().default(true),
  custom_subject: z.string().optional(),
  custom_body: z.string().optional(),
})

export const config: ApiRouteConfig = {
  name: 'SendOutreach',
  type: 'api',
  path: '/api/outreach/send',
  method: 'POST',
  description: 'Send outreach email to a prospect',
  emits: ['email.sent', 'email.failed'],
  flows: ['prospect-research', 'outreach'],
  middleware: [coreMiddleware],
  bodySchema,
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message_id: z.string().optional(),
      prospect: z.object({ company_name: z.string(), contact_name: z.string(), email: z.string() }),
    }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
  },
}

// Inline email sending via Resend
async function sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; messageId?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured')
    return { success: false }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px;">${body.split('\n').map(l => `<p>${l}</p>`).join('')}</div>`,
        text: body,
      }),
    })

    const data = await response.json()
    if (response.ok) {
      return { success: true, messageId: data.id }
    }
    console.error('Resend error:', data)
    return { success: false }
  } catch (error) {
    console.error('Email send failed:', error)
    return { success: false }
  }
}

export const handler: Handlers['SendOutreach'] = async (req, { emit, logger, state }) => {
  const { prospect_id, use_generated_email, custom_subject, custom_body } = bodySchema.parse(req.body)

  logger.info('Sending outreach email', { prospect_id, use_generated_email })

  const research = await state.get<any>('research_results', prospect_id)

  if (!research) {
    return { status: 404, body: { error: 'Prospect not found. Ensure research has been completed.' } }
  }

  if (!research.email_draft && use_generated_email) {
    return { status: 400, body: { error: 'No generated email available. Complete research first or provide custom email.' } }
  }

  const email = research.prospect?.email
  if (!email) {
    return { status: 400, body: { error: 'No email address found for prospect.' } }
  }

  const subject = custom_subject || research.email_subject || 'Quick question'
  const body = custom_body || research.email_draft || ''
  const contactName = research.prospect ? `${research.prospect.first_name} ${research.prospect.last_name}` : 'Prospect'
  const companyName = research.prospect?.company_name || 'Company'

  const result = await sendEmail(email, subject, body)

  if (result.success) {
    await emit({
      topic: 'email.sent',
      data: { prospect_id, email, subject, message_id: result.messageId, sent_at: new Date().toISOString() },
    })

    logger.info('Email sent successfully', { prospect_id, email, messageId: result.messageId })

    return {
      status: 200,
      body: { success: true, message_id: result.messageId, prospect: { company_name: companyName, contact_name: contactName, email } },
    }
  } else {
    await emit({
      topic: 'email.failed',
      data: { prospect_id, email, subject, error: 'Email delivery failed', failed_at: new Date().toISOString() },
    })

    logger.error('Email send failed', { prospect_id, email })

    return { status: 400, body: { error: 'Failed to send email. Check Resend configuration.' } }
  }
}
