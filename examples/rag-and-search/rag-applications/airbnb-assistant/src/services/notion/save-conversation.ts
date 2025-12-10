import { Client } from '@notionhq/client'

function getNotionClient() {
  return new Client({
    auth: process.env.NOTION_API_KEY
  })
}

export interface ConversationEntry {
  sessionId: string
  userId?: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export async function saveConversation(entry: ConversationEntry): Promise<void> {
  const notion = getNotionClient()
  const databaseId = process.env.NOTION_DATABASE_ID!
  
  await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      'Session ID': {
        title: [{
          text: { content: entry.sessionId }
        }]
      },
      'User ID': {
        rich_text: [{
          text: { content: entry.userId || 'anonymous' }
        }]
      },
      'Role': {
        select: { name: entry.role }
      },
      'Content': {
        rich_text: [{
          text: { content: entry.content.substring(0, 2000) } // Notion has 2000 char limit
        }]
      },
      'Timestamp': {
        date: { start: entry.timestamp }
      }
    }
  })
}
