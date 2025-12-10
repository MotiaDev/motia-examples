import { FlowContext, Logger } from "@motiadev/core";
import { Credentials, OAuth2Client } from 'google-auth-library';

import { google } from "googleapis";
import { appConfig } from "../config/default";
import { StateService } from "./state.service";

export abstract class GoogleBaseService {
  protected logger: Logger
  protected stateService: StateService;
  protected readonly SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly', 
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/gmail.send'
  ];

  constructor(logger: Logger, state: FlowContext['state']) {
    this.logger = logger
    this.stateService = new StateService(state)
  }

  protected async saveTokens(tokens: Credentials) {
    this.logger.info(`Saving tokens ${JSON.stringify(tokens)}`)
    await this.stateService.saveTokens(tokens)
  }

  async getTokens(): Promise<Credentials | null> {
    return this.stateService.getTokens()
  }

  protected async getAuth(): Promise<OAuth2Client> {
    const tokens = await this.getTokens()

    const client = new google.auth.OAuth2(
      appConfig.google.clientId,
      appConfig.google.clientSecret,
      appConfig.google.redirectUri
    );
    
    if (!tokens) {
      return client
    }

    client.setCredentials(tokens)

    return client
  }

  async fetchTokens(code: string): Promise<Credentials> {
    this.logger.info(`Getting tokens for code ${code}`)

    if (!code) {
      throw new Error('No code found')
    }

    const authClient = await this.getAuth()
    
    const { tokens } = await authClient.getToken(code);
    
    await this.saveTokens(tokens)

    return tokens
  }

  async watchEmail(): Promise<void> {
    const authClient = await this.getAuth()

    const gmail = google.gmail({ version: 'v1', auth: authClient });

    const requestBody = {
      topicName: appConfig.google.topicName,
      labelIds: ['INBOX'],
    };

    const response = await gmail.users.watch({ userId: 'me', requestBody });

    if(response.data?.historyId) {
      this.logger.info(`Watching email with historyId ${response.data.historyId}`)
      await this.stateService.saveLastHistoryId(response.data.historyId);
    }
  }

  async getAuthUrl(): Promise<string> {
    const authClient = await this.getAuth()
    
    return authClient.generateAuthUrl({
      scope: this.SCOPES,
      access_type: 'offline',
      include_granted_scopes: true
    })
  }
}
