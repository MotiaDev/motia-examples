import { FlowContext, Logger } from "@motiadev/core";
import { IEmail, ParseGmailApi } from 'gmail-api-parse-message-ts';

import { google } from "googleapis";
import { GoogleBaseService } from "./google-base.service";
import { appConfig } from "../config/default";

export type EmailResponse = {
  subject: string;
  from: string;
  messageId: string;
  threadId: string;
  snippet: string;
  labelIds: string[];
  category?: {
    category: string;
    confidence: number;
    alternative?: string | null;
    promotion_score?: number | null;
  };
  urgency?: {
    urgency: string;
    score: number;
    factors?: Record<string, number>;
  };
  importance?: {
    importance: string;
    score: number;
    factors?: Record<string, number>;
  };
  shouldArchive?: boolean;
}

type Category = 'work' | 'personal' | 'spam' | 'promotional' | 'social' | 'other' | 'unknown';
type Urgency = 'high' | 'medium' | 'low';

export class GoogleService extends GoogleBaseService {
  private readonly autoResponderName = appConfig.autoResponder.name;
  private readonly autoResponderEmail = appConfig.autoResponder.email;
  private readonly  labelMappings: Record<Category, string> = {
    work: 'Work',
    personal: 'Personal',
    spam: 'Spam',
    unknown: 'Unknown',
    promotional: 'Promotional',
    social: 'Social',
    other: 'Other'
  }

  private readonly  urgencyLabels: Record<Urgency, string> = {
    high: 'Urgent',
    medium: 'Normal',
    low: 'Low-Priority'
  }

  private labelsToApply: string[] = [];
  private labelIds: string[] = [];

  constructor(logger: Logger, state: FlowContext['state']) {
    super(logger, state)
  }

  async processLabel(labelName: string): Promise<void> {
    const label = await this.findOrCreateLabel(labelName);

    this.logger.info(`Label ${labelName} created: ${label.id}`);

    if (label.id) {
      this.labelIds.push(label.id);
      if (!this.labelsToApply.includes(labelName)) {
        this.labelsToApply.push(labelName);
      }
    }
  }

  // Helper function to determine category from EmailResponse
  private determineCategory(email: EmailResponse): Category {
    if (email.labelIds) {
      if (email.labelIds.some(id => id.toLowerCase().includes('work'))) return 'work';
      if (email.labelIds.some(id => id.toLowerCase().includes('personal'))) return 'personal';
      if (email.labelIds.some(id => id.toLowerCase().includes('social'))) return 'social';
      if (email.labelIds.some(id => id.toLowerCase().includes('promotions'))) return 'promotional';
      if (email.labelIds.some(id => id.toLowerCase().includes('spam'))) return 'spam';
    }
    
    const contentToCheck = `${email.subject} ${email.snippet}`.toLowerCase();
    
    if (/work|task|project|deadline|meeting|presentation/i.test(contentToCheck)) return 'work';
    if (/personal|family|friend|vacation|holiday/i.test(contentToCheck)) return 'personal';
    if (/social|event|party|gathering|meetup/i.test(contentToCheck)) return 'social';
    if (/deal|discount|offer|subscription|newsletter|unsubscribe/i.test(contentToCheck)) return 'promotional';
    
    return 'unknown';
  }

  private determineUrgency(email: EmailResponse): Urgency {
    const contentToCheck = `${email.subject} ${email.snippet}`.toLowerCase();
    
    if (/urgent|asap|emergency|immediately|deadline|today/i.test(contentToCheck)) return 'high';
    if (/important|priority|attention|soon/i.test(contentToCheck)) return 'medium';
    
    return 'low';
  }

  async updateLabels(input: EmailResponse) {
    this.labelsToApply = [];
    this.labelIds = [];

    let category: Category;
    if (input.category && input.category.category) {
      const categoryParts = input.category.category.split('.');
      const mainCategory = categoryParts[0];
      
      if (mainCategory === 'work') category = 'work';
      else if (mainCategory === 'personal') category = 'personal';
      else if (mainCategory === 'social') category = 'social';
      else if (mainCategory === 'promotion') category = 'promotional';
      else if (mainCategory === 'spam') category = 'spam';
      else if (mainCategory === 'update') category = 'other';
      else category = 'unknown';
      
      if (categoryParts.length > 1 && categoryParts[1]) {
        await this.processLabel(this.labelMappings[category]);
      }
    } else {
      category = this.determineCategory(input);
    }

    // Apply the main category label
    const categoryLabel = this.labelMappings[category];
    if (categoryLabel) {
      await this.processLabel(categoryLabel);
    }

    // Apply urgency label if available
    let urgency: Urgency = 'medium';
    if (input.urgency && input.urgency.urgency) {
      if (input.urgency.urgency === 'high') urgency = 'high';
      else if (input.urgency.urgency === 'medium') urgency = 'medium';
      else urgency = 'low';
    } else {
      urgency = this.determineUrgency(input);
    }
    
    const urgencyLabel = this.urgencyLabels[urgency];
    if (urgencyLabel) {
      await this.processLabel(urgencyLabel);
    }

    return {
      labelsToApply: this.labelsToApply,
      labelIds: this.labelIds
    }
  }

  private generateResponse(email: EmailResponse) {
    const category = this.determineCategory(email);
    const urgency = this.determineUrgency(email);
    
    const [mainCategory] = category.split('.');
    // const isUrgent = urgency === 'high';

    this.logger.info(`Generating response for email from ${email.from} with category ${category} and urgency ${urgency}`);

    // if(!isUrgent) {
      // throw new Error(`Skipping response for non-urgent email from ${email.from}`);
    // }

    switch (mainCategory) {
      case 'work':
        return `Hi,\n\nI'll review it and get back to you soon.\n\nRegards, ${this.autoResponderName}`;
      case 'personal':
        return `Hi,\n\n I appreciate you reaching out and will read it carefully when I'm able to give it my full attention. I'll get back to you as soon as I can.\n\nBest wishes,\n${this.autoResponderName}`;
      default:
        return null;
    }
  };


  async getEmail(historyId: string): Promise<EmailResponse> {
    const tokens = await this.getTokens()

    if (!tokens) {
      throw new Error('No tokens found')  
    }

    const auth = await this.getAuth()

    const gmail = google.gmail({version: 'v1', auth});

    const startHistoryId = await this.stateService.getLastHistoryId()
    await this.stateService.saveLastHistoryId(historyId.toString())

    if (!startHistoryId) {
      throw new Error('No start history id found')
    }

    const history = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded']
    });

    const historyRecord = history.data.history?.[0]?.messagesAdded?.[0];
    const messageId = historyRecord?.message?.id;

    if (!messageId) {
      throw new Error('No new messages found.');
    }

    const {data} = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const parse = new ParseGmailApi();
    const email : IEmail = parse.parseMessage(data);

    if(!email.subject) {
      throw new Error(`No subject found for email ${messageId}`);
    }

    if(email.from.email === this.autoResponderEmail) {
      throw new Error(`Ignoring email from ${email.from.email}`);
    }

    this.logger.info(`Email: ${JSON.stringify(email, null, 2)}`);
    return {
      subject: email.subject,
      from: email.from.email,
      messageId,
      threadId: email.threadId,
      snippet: email.snippet,
      labelIds: email.labelIds,
    };
  }

  async sendEmail(emailResponse: EmailResponse) {
    const message = this.generateResponse(emailResponse);

    if (!message) {
      throw new Error(`No auto-response generated for this email category ${emailResponse.category?.category}`);
    }

    const {
      messageId,
      from,
      threadId,
      subject
    } = emailResponse

    const auth = await this.getAuth()

    const gmail = google.gmail({version: 'v1', auth});

    const emailLines = [
      `From: ${this.autoResponderEmail}`,
      `To: ${from}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `References: ${messageId}`,
      `In-Reply-To: ${messageId}`,
      `Subject: Re: ${subject}`,
      '',
      message,
    ];
    const email = emailLines.join('\n');
    this.logger.info(`Sending email ${JSON.stringify({
      messageId,
      from,
      threadId,
      subject,
      message
    }, null, 2)}`);
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        threadId: threadId,
        raw: encodedEmail
      }
    })

    this.logger.info(`Email sent ${messageId} to ${from} and threadId ${threadId} and responseText ${message}`)
  }

  async modifyMessage(messageId: string, labelIds: string[]) {

    const auth = await this.getAuth()

    const gmail = google.gmail({version: 'v1', auth});

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: labelIds
      }
    });
  }


  async archiveMessage(messageId: string, archiveLabelId: string) {
    this.logger.info(`Archiving message ${messageId} with archive label ${archiveLabelId}`);
    
    const auth = await this.getAuth()

    const gmail = google.gmail({version: 'v1', auth});

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['INBOX'],
        addLabelIds: [archiveLabelId]
      }
    });

    return {
      messageId,
      archived: true,
      archiveLabelId
    };
  }

  async findOrCreateLabel(labelName: string) {
    const auth = await this.getAuth()

    const gmail = google.gmail({version: 'v1', auth});

    const labelList = await gmail.users.labels.list({userId: 'me'});

    const label = labelList.data.labels?.find(l => l.name === labelName);

    if (label) {
      return label;
    }

    const newLabel = await gmail.users.labels.create({userId: 'me', requestBody: {name: labelName}});

    return {
      id: newLabel.data.id,
      name: newLabel.data.name
    }
  }
}
