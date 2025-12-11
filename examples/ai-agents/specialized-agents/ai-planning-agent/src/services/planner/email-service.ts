/**
 * Resend Email Service
 * 
 * Integrates with Resend API for sending real emails
 * from the planning system.
 */

const RESEND_API_URL = 'https://api.resend.com/emails'

interface EmailPayload {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  cc?: string[]
  bcc?: string[]
  replyTo?: string
  tags?: Array<{ name: string; value: string }>
}

interface ResendResponse {
  id: string
}

interface ResendError {
  statusCode: number
  message: string
  name: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
  recipients: string[]
  sentAt: string
}

/**
 * Send email using Resend API
 * 
 * NOTE: Resend test API only allows sending to the account owner's email.
 * In production with a verified domain, this restriction is removed.
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev'

  if (!apiKey) {
    console.warn('RESEND_API_KEY not set - emails will not be sent')
    return {
      success: false,
      error: 'RESEND_API_KEY not configured',
      recipients: Array.isArray(payload.to) ? payload.to : [payload.to],
      sentAt: new Date().toISOString(),
    }
  }

  // Resend test API restriction: can only send to the account owner's email
  // Use only the FIRST recipient from ALERT_RECIPIENTS (should be the verified email)
  const allRecipients = Array.isArray(payload.to) ? payload.to : [payload.to]
  // For test API, only send to single verified email (first one)
  const recipients = [allRecipients[0]].filter(Boolean)

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        cc: payload.cc,
        bcc: payload.bcc,
        reply_to: payload.replyTo,
        tags: payload.tags,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json() as ResendError
      return {
        success: false,
        error: `Resend API error: ${errorData.message || response.statusText}`,
        recipients,
        sentAt: new Date().toISOString(),
      }
    }

    const data = await response.json() as ResendResponse

    return {
      success: true,
      messageId: data.id,
      recipients,
      sentAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      recipients,
      sentAt: new Date().toISOString(),
    }
  }
}

/**
 * Send alert email to configured recipients
 */
export async function sendAlertEmail(
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<EmailResult> {
  const alertRecipients = process.env.ALERT_RECIPIENTS?.split(',').map(e => e.trim()) || []

  if (alertRecipients.length === 0) {
    return {
      success: false,
      error: 'ALERT_RECIPIENTS not configured',
      recipients: [],
      sentAt: new Date().toISOString(),
    }
  }

  return sendEmail({
    to: alertRecipients,
    subject,
    html: htmlContent,
    text: textContent,
  })
}

/**
 * Generate HTML email template for plan notifications
 */
export function generatePlanEmailHtml(params: {
  title: string
  planId: string
  objective: string
  status: string
  details: string
  actionUrl?: string
  actionText?: string
}): string {
  const { title, planId, objective, status, details, actionUrl, actionText } = params

  const statusColors: Record<string, string> = {
    completed: '#22c55e',
    failed: '#ef4444',
    blocked: '#f59e0b',
    executing: '#3b82f6',
    planning: '#8b5cf6',
    pending: '#6b7280',
  }

  const statusColor = statusColors[status.toLowerCase()] || '#6b7280'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 24px; color: #18181b;">${title}</h1>
            </td>
          </tr>
          
          <!-- Status Badge -->
          <tr>
            <td style="padding: 24px 40px 0;">
              <span style="display: inline-block; padding: 6px 16px; background-color: ${statusColor}; color: white; border-radius: 9999px; font-size: 14px; font-weight: 600; text-transform: uppercase;">
                ${status}
              </span>
            </td>
          </tr>
          
          <!-- Plan Info -->
          <tr>
            <td style="padding: 24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <strong style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Plan ID</strong>
                    <p style="margin: 4px 0 0; color: #18181b; font-size: 14px; font-family: monospace;">${planId}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <strong style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Objective</strong>
                    <p style="margin: 4px 0 0; color: #18181b; font-size: 14px;">${objective}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Details -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px;">
                <pre style="margin: 0; white-space: pre-wrap; word-wrap: break-word; font-size: 13px; color: #3f3f46; font-family: 'SF Mono', Monaco, 'Courier New', monospace;">${details}</pre>
              </div>
            </td>
          </tr>
          
          ${actionUrl ? `
          <!-- Action Button -->
          <tr>
            <td style="padding: 0 40px 32px;" align="center">
              <a href="${actionUrl}" style="display: inline-block; padding: 12px 32px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                ${actionText || 'View Details'}
              </a>
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 12px; color: #71717a; text-align: center;">
                Sent by Motia Planning System • ${new Date().toISOString()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

