import { z } from 'zod'
import axios from 'axios'
import 'dotenv/config'

const devToApiKey = process.env.DEVTO_API_KEY
const trace_id = process.env.TRACE_ID

export const config = {
  type: 'api',
  name: 'fetch devto articles',
  emits: ['article.submitted'],
  flows: ['content-pipeline'],
  path: '/get-last-published-article',
  method: 'GET',
  description: 'Returns the last published article from DevTo',
  responseSchema: {
    200: z.object({
      message: z.string(),
    }),
  },
}

export const handler = async (req, { emit, logger, state, traceId }) => {
  logger.info('Get last published article endpoint was called')

  const list = await axios.get('https://dev.to/api/articles/me/published?page=1&per_page=1', {
    headers: {
      "api-key": devToApiKey,
    }
  });

  const lastId = await state.get(trace_id, 'lastPublishedArticle')

  if (lastId === list.data[0].id) {
    logger.info('No new articles found, skipping emit')
    return {
      status: 200,
      body: { message: 'No new articles found' },
    }
  } else {
    logger.info('New article found, proceeding with emit')
    await state.clear(trace_id, 'lastPublishedArticle')
    await state.set(trace_id, 'lastPublishedArticle', list.data[0].id)

    await emit({
      topic: 'article.submitted',
      data: {
        body: list.data[0].body_markdown
      }
    })
  }

  return {
    status: 200,
    body: { message: 'API step ran successfully', traceId },
  }
}
