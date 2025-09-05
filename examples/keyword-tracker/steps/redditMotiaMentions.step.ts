import { fetchRedditMentions } from "../services/reddit.service"

exports.config = {
  // 
  type: 'event', // would be probably "cron" in the real world
  name: 'Fetch Reddit Mentions',
  description: 'Fetch motia mentions from Reddit',
  subscribes: ['fetch-mentions'],
  emits: ['mentions-fetched'],
  flows: ['keywords'],
}

exports.handler = async (_input: { mentions: any[]; }, { traceId, logger, state, emit }: any) => {
  logger.info('fetch mentions from reddit')
  const mentions = await fetchRedditMentions("motia")
  logger.info('fetched mentions from reddit', mentions.length)
  if (mentions.length > 0) {

    await state.set(traceId, 'mentions', mentions)

    await emit({
      topic: 'mentions-fetched',
      data: { key: 'reddit', mentions }
    })
  }
}



