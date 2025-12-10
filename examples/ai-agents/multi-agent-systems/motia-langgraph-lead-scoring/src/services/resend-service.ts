import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface SendEmailResult {
  success: boolean;
  resendId?: string;
  error?: string;
}

export interface BatchSendResult {
  totalSent: number;
  totalFailed: number;
  results: {
    email: string;
    success: boolean;
    resendId?: string;
    error?: string;
  }[];
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
      tags: params.tags,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      resendId: data?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function sendBatchEmails(
  emails: SendEmailParams[],
  onProgress?: (sent: number, total: number) => void
): Promise<BatchSendResult> {
  const results: BatchSendResult['results'] = [];
  let totalSent = 0;
  let totalFailed = 0;

  // Process in batches to respect rate limits
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(async (email) => {
      const result = await sendEmail(email);
      return {
        email: email.to,
        ...result,
      };
    });

    const batchResults = await Promise.all(batchPromises);
    
    for (const result of batchResults) {
      results.push(result);
      if (result.success) {
        totalSent++;
      } else {
        totalFailed++;
      }
    }

    if (onProgress) {
      onProgress(results.length, emails.length);
    }

    // Delay between batches to respect rate limits
    if (i + BATCH_SIZE < emails.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return {
    totalSent,
    totalFailed,
    results,
  };
}

export async function resendFailedEmail(
  resendId: string,
  newParams?: Partial<SendEmailParams>
): Promise<SendEmailResult> {
  // Resend doesn't support direct resend by ID, so we need the original params
  // This would typically fetch from our database and retry
  return {
    success: false,
    error: 'Resend by ID requires original email data. Use sendEmail with updated params.',
  };
}

export async function getEmailStatus(resendId: string): Promise<{
  status: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
} | null> {
  try {
    const { data, error } = await resend.emails.get(resendId);
    
    if (error || !data) {
      return null;
    }

    return {
      status: data.last_event || 'unknown',
      deliveredAt: data.last_event === 'delivered' ? new Date().toISOString() : undefined,
    };
  } catch {
    return null;
  }
}

export function validateEmailRecipients(emails: string[]): {
  valid: string[];
  invalid: string[];
} {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const email of emails) {
    if (emailRegex.test(email)) {
      valid.push(email);
    } else {
      invalid.push(email);
    }
  }

  return { valid, invalid };
}

