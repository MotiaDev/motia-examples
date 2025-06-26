const z = require('zod');
const { TweetGeneratorService } = require('../services/open-ai-service.js');
const config = {
  type: 'event',
  name: 'processArticle',
  description: 'processes an article and emits a processed event',
  subscribes: ['article.submitted'],
  emits: ['processedArticle'],
  input: z.object({body: z.string() }),
  flows: ['content-pipeline'],
};
 


const handler = async ({body}, { emit, logger, state, traceId }) => {

const tweetGenerator = new TweetGeneratorService()

const tweets = await tweetGenerator.generateTweetsFromArticle({markdown: body})

logger.info('Tweets generated:', tweets)

await state.set(traceId, 'tweets', tweets)

  return {
    status: 200,
    body: { message: 'processing step called' },
  }
};
 
exports.config = config;
exports.handler = handler;