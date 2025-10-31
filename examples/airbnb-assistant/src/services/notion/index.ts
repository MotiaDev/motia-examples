import { saveConversation } from './save-conversation'
import { getConversationHistory } from './get-conversation-history'

export const notionService = {
  saveConversation,
  getConversationHistory
}

export type { ConversationEntry } from './save-conversation'
