import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { LeadWithScore } from './lead-service';

export interface EmailDraft {
  leadId: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  generatedAt: string;
  approved: boolean;
  approvedAt?: string;
  approvedBy?: string;
}

export interface EmailRecord {
  id: string;
  flowId: string;
  leadId: string;
  leadEmail: string;
  subject: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked';
  resendId?: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

const EMAIL_TEMPLATES = {
  hot: {
    tone: 'confident and direct',
    urgency: 'high',
    cta: 'schedule a quick call this week',
  },
  warm: {
    tone: 'friendly and informative',
    urgency: 'medium',
    cta: 'learn more about how we can help',
  },
  cold: {
    tone: 'professional and educational',
    urgency: 'low',
    cta: 'share some resources that might be helpful',
  },
};

export async function generateEmailDraft(lead: LeadWithScore): Promise<EmailDraft> {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.7,
  });

  const template = EMAIL_TEMPLATES[lead.tier];

  const systemPrompt = `You are an expert B2B sales copywriter. Generate a personalized cold outreach email.
Requirements:
- Tone: ${template.tone}
- Keep it concise (under 150 words)
- Personalize based on their role, company, and industry
- Reference their recent activity/interest if mentioned in notes
- Include a clear, low-friction CTA to ${template.cta}
- Do NOT include placeholder text like [Your Name] - leave those blank
- Do NOT include fake company names - the email should be from a generic "our team"

Return ONLY valid JSON with this exact structure:
{
  "subject": "Email subject line",
  "textContent": "Plain text version of the email",
  "htmlContent": "HTML version with basic formatting using <p>, <strong>, <br> tags"
}`;

  const humanPrompt = `Generate an email for:
Name: ${lead.name}
Company: ${lead.company}
Role: ${lead.role}
Industry: ${lead.industry}
Company Size: ${lead.employeeRange}
Country: ${lead.country}
Notes: ${lead.notes}
Lead Score: ${lead.score}/100 (${lead.tier.toUpperCase()})`;

  try {
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(humanPrompt),
    ]);

    const content = response.content as string;
    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      leadId: lead.id,
      subject: parsed.subject,
      htmlContent: parsed.htmlContent,
      textContent: parsed.textContent,
      generatedAt: new Date().toISOString(),
      approved: false,
    };
  } catch (error) {
    // Fallback template
    const fallbackSubject = `Quick question about ${lead.company}'s ${lead.industry} strategy`;
    const fallbackText = `Hi ${lead.name},

I noticed ${lead.company} is in the ${lead.industry} space, and with your role as ${lead.role}, you're likely thinking about ways to streamline operations and drive growth.

We've been helping similar ${lead.employeeRange} employee companies in ${lead.industry} achieve better results through AI-powered automation.

Would you be open to a brief conversation about how we might help ${lead.company}?

Best regards`;

    const fallbackHtml = `<p>Hi ${lead.name},</p>
<p>I noticed <strong>${lead.company}</strong> is in the ${lead.industry} space, and with your role as ${lead.role}, you're likely thinking about ways to streamline operations and drive growth.</p>
<p>We've been helping similar ${lead.employeeRange} employee companies in ${lead.industry} achieve better results through AI-powered automation.</p>
<p>Would you be open to a brief conversation about how we might help ${lead.company}?</p>
<p>Best regards</p>`;

    return {
      leadId: lead.id,
      subject: fallbackSubject,
      htmlContent: fallbackHtml,
      textContent: fallbackText,
      generatedAt: new Date().toISOString(),
      approved: false,
    };
  }
}

/**
 * Process leads in batches with parallel execution
 * @param leads - Array of leads to process
 * @param concurrency - Number of parallel requests (default: 10)
 * @param onProgress - Optional callback for progress updates
 */
export async function generateEmailDrafts(
  leads: LeadWithScore[],
  concurrency: number = 10,
  onProgress?: (completed: number, total: number) => void
): Promise<EmailDraft[]> {
  const drafts: EmailDraft[] = [];
  const total = leads.length;
  let completed = 0;

  // Process in chunks for parallel execution
  for (let i = 0; i < leads.length; i += concurrency) {
    const chunk = leads.slice(i, i + concurrency);
    
    // Process chunk in parallel
    const chunkResults = await Promise.all(
      chunk.map(async (lead) => {
        try {
          return await generateEmailDraft(lead);
        } catch (error) {
          // Return fallback on error
          console.error(`Failed to generate draft for ${lead.id}:`, error);
          return createFallbackDraft(lead);
        }
      })
    );
    
    drafts.push(...chunkResults);
    completed += chunk.length;
    
    // Report progress
    if (onProgress) {
      onProgress(completed, total);
    }
    
    // Small delay between batches to avoid rate limiting
    if (i + concurrency < leads.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return drafts;
}

/**
 * Create a fallback draft when GPT fails
 */
function createFallbackDraft(lead: LeadWithScore): EmailDraft {
  const fallbackSubject = `Quick question about ${lead.company}'s ${lead.industry} strategy`;
  const fallbackText = `Hi ${lead.name},

I noticed ${lead.company} is in the ${lead.industry} space, and with your role as ${lead.role}, you're likely thinking about ways to streamline operations and drive growth.

We've been helping similar ${lead.employeeRange} employee companies in ${lead.industry} achieve better results through AI-powered automation.

Would you be open to a brief conversation about how we might help ${lead.company}?

Best regards`;

  const fallbackHtml = `<p>Hi ${lead.name},</p>
<p>I noticed <strong>${lead.company}</strong> is in the ${lead.industry} space, and with your role as ${lead.role}, you're likely thinking about ways to streamline operations and drive growth.</p>
<p>We've been helping similar ${lead.employeeRange} employee companies in ${lead.industry} achieve better results through AI-powered automation.</p>
<p>Would you be open to a brief conversation about how we might help ${lead.company}?</p>
<p>Best regards</p>`;

  return {
    leadId: lead.id,
    subject: fallbackSubject,
    htmlContent: fallbackHtml,
    textContent: fallbackText,
    generatedAt: new Date().toISOString(),
    approved: false,
  };
}

export function createEmailRecord(
  flowId: string,
  leadId: string,
  leadEmail: string,
  subject: string
): EmailRecord {
  return {
    id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    flowId,
    leadId,
    leadEmail,
    subject,
    status: 'queued',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
