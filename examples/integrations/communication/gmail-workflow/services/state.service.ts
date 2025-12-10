import { FlowContext } from "@motiadev/core";
import { Credentials } from "google-auth-library";

export class StateService {
  private state: FlowContext['state']

  constructor(state: FlowContext['state']) {
    this.state = state
  }

  async getState() {
    return this.state
  }

  async saveTokens(tokens: Credentials) {
    await this.state.set<Credentials>('gmail.auth', 'tokens', tokens)
  }

  async getTokens(): Promise<Credentials | null> {
    return this.state.get<Credentials>('gmail.auth', 'tokens')
  }
  
  async saveLastHistoryId(historyId: string) {
    await this.state.set<string>('gmail.auth', 'lastHistoryId', historyId)
  }

  async getLastHistoryId(): Promise<string | null> {
    return this.state.get<string>('gmail.auth', 'lastHistoryId')
  }
}