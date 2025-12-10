const { z } = require('zod')

exports.config = {
  type: 'api',
  name: 'LinkedIn Post Agent',
  path: '/linkedin-post-agent',
  method: 'GET',
  emits: ['get-topic-idea'],
  description: 'Generates and posts on your behalf on LinkedIn.',
  responseSchema: {
    200: z.object({
      message: z.string(),
    }),
  },
  flows: ['LinkedIn-content-agent']
}

exports.handler = async (req, { logger, emit }) => {
  logger.info('Endpoint called: /linkedin-post-agent')

  await emit({
    topic: 'get-topic-idea',
    data: {
      name: 'motia'
    }
  })
  logger.info('after emit')
  return {
    status: 200,
    body: { message: 'Endpoint called: /post-on-linkedin' },
  }
}