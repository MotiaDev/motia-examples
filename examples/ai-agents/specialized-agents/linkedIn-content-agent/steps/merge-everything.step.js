const { z } = require('zod');

exports.config = {
  type: 'event',
  name: 'assembleFinalLinkedInPost',
  description: 'Combines post, image, and keywords into a final LinkedIn post',
  subscribes: ['image-generated-for-post', 'seo-keywords-generated'],
  emits: ['final-linkedin-post-ready'],
  input: z.object({
    generated_for: z.string(),
  }),
  flows: ['LinkedIn-content-agent'],
};

exports.handler = async (input, { state, emit, logger }) => {
  const userId = input.generated_for;
  logger.info(`🧩 Assembling final LinkedIn post for: ${userId}...`);

  try {
    // Load all three parts from state
    const { post } = await state.get(userId, 'post') || {};
    const { imageUrl } = await state.get(userId, 'imgURL') || {};
    const { keywords } = await state.get(userId, 'keywords') || {};

    // Not all pieces are available yet
    if (!post || !imageUrl || !keywords) {
      logger.info(`⏳ Waiting for all images, keywords and post to be ready:`);
      return;
    }

    // Convert comma-separated keywords to hashtags
    const hashtags = keywords
      .split(',')
      .map(kw => kw.trim().replace(/\s+/g, ''))
      .filter(Boolean)
      .map(kw => `#${kw}`)
      .join(' ');

    const finalPost = [post, hashtags].map(str => str.trim()).join('\n\n');

    logger.info('✅ Final LinkedIn post ready to publish');

    await emit({
      topic: 'final-linkedin-post-ready',
      data: {
        finalPost,
        generated_for: userId,
      },
    });

  } catch (err) {
    logger.error('❌ Failed to assemble final post:', err.message);
  }
};
