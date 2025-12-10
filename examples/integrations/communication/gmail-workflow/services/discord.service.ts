import { FlowContext, Logger } from "@motiadev/core";
import axios, { AxiosInstance } from "axios";
import { appConfig } from "../config/default";

export interface EmailSummary {
  totalEmails: number;
  categoryCounts: Record<string, number>;
  urgencyCounts: Record<string, number>;
  autoRespondedCount: number;
}

interface ProcessedEmail {
  messageId: string;
  threadId: string;
  category: string;
  urgency: string;
  importance: string;
  processingTime: string;
}

export class DiscordService {
  private axios: AxiosInstance;

  constructor(private readonly logger: Logger, private readonly state: FlowContext['state']) {
    this.axios = axios.create({
      baseURL: appConfig.discord.webhookUrl
    });
  }

  private async buildSummary() {
    const summary: EmailSummary = {
      totalEmails: 0,
      categoryCounts: {},
      urgencyCounts: {},
      autoRespondedCount: 0
    };

    const processedEmailsRaw = await this.state.get<ProcessedEmail[]>('email_analysis', 'processed_emails') || [];
    const processedEmails: ProcessedEmail[] = Array.isArray(processedEmailsRaw) ? processedEmailsRaw : [];
    const autoResponses = await this.state.get<string[]>('email_analysis', 'auto_responded_emails') || [];

    this.logger.info(`Auto-responses: ${JSON.stringify(autoResponses)}`);
    this.logger.info(`Processed emails: ${JSON.stringify(processedEmails)}`);

    summary.totalEmails = processedEmails.length;

    processedEmails.forEach(email => {
      if (email.category) {
        summary.categoryCounts[email.category] = (summary.categoryCounts[email.category] || 0) + 1;
      }

      if (email.urgency) {
        summary.urgencyCounts[email.urgency] = (summary.urgencyCounts[email.urgency] || 0) + 1;
      }
    });

    summary.autoRespondedCount = autoResponses.filter((messageId: string) => {
      const email = processedEmails.find(e => e.messageId === messageId);
      return email != null;
    }).length;

    this.logger.info(`Summary: ${JSON.stringify(summary)}`);

    if (summary.totalEmails === 0) {
      throw new Error('No emails to send');
    }

    return summary;
  }

  async send(): Promise<EmailSummary> {
    const summary = await this.buildSummary();
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error('Discord webhook URL not configured');
    }

    const embed = {
      title: '📧 Daily Email Summary',
      color: 0x4285F4, // Gmail blue color
      description: `Summary of emails processed on ${new Date().toISOString().split('T')[0]}`,
      fields: [
        {
          name: '📊 Total Emails',
          value: `${summary.totalEmails} emails processed`,
          inline: false
        },
        {
          name: '🏷️ Categories',
          value: Object.entries(summary.categoryCounts)
            .map(([category, count]) => `${category}: ${count}`)
            .join('\n') || 'None',
          inline: true
        },
        {
          name: '🚨 Urgency',
          value: Object.entries(summary.urgencyCounts)
            .map(([urgency, count]) => `${urgency}: ${count}`)
            .join('\n') || 'None',
          inline: true
        },
        {
          name: '🤖 Auto-responded',
          value: `${summary.autoRespondedCount} emails`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Gmail Account Manager by Motia'
      }
    };

    try {
      await this.axios.post('', {
        embeds: [embed]
      });

      this.logger.info('Successfully sent daily summary to Discord');
      return summary;
    } catch (error) {
      this.logger.error(`Failed to send summary to Discord: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };
}

