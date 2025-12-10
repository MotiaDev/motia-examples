import { Client } from '@notionhq/client'
import { ConversationEntry } from './save-conversation'

function getNotionClient() {
  return new Client({
    auth: process.env.NOTION_API_KEY
  })
}

export async function getConversationHistory(
  sessionId: string,
  limit: number = 10
): Promise<ConversationEntry[]> {
  const notion = getNotionClient()
  const databaseId = process.env.NOTION_DATABASE_ID!
  
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Session ID',
        title: {
          equals: sessionId
        }
      },
      sorts: [{
        property: 'Timestamp',
        direction: 'descending'
      }],
      page_size: limit
    })
    
    return response.results.map((page: any) => ({
      sessionId: page.properties['Session ID'].title[0]?.text.content || '',
      userId: page.properties['User ID'].rich_text[0]?.text.content,
      role: page.properties['Role'].select?.name as 'user' | 'assistant',
      content: page.properties['Content'].rich_text[0]?.text.content || '',
      timestamp: page.properties['Timestamp'].date?.start || ''
    })).reverse()
  } catch (error) {
    return []
  }
}
