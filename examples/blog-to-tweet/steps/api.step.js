import { z } from 'zod'
const { DevToService } = require('../services/dev-to-api-service.js')
const trace_id = process.env.TRACE_ID

exports.config = {
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
 
exports.handler = async (req, { emit, logger, state, traceId }) => {
  logger.info('Get last published article endpoint was called')

const devto = new DevToService();
  const latestArticle = await devto.getLastPublishedArticle();

  if (!latestArticle) {
    return {
      status: 500,
      body: { message: 'Failed to fetch article' },
    };
  }


const lastId = await state.get(trace_id,'lastPublishedArticle')
if (lastId === latestArticle.id) {
    logger.info('No new articles found, skipping emit');
    return {
      status: 200,
      body: { message: 'No new articles found' },
    };
  }

  await state.set(trace_id, 'lastPublishedArticle', latestArticle.id);

  await emit({
    topic: 'article.submitted',
    data: { body: latestArticle.body_markdown },
  });

  return {
    status: 200,
    body: { message: 'API step ran successfully', traceId },
  }
}