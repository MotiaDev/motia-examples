const z = require('zod');
const { OpenAI } = require('openai');

exports.config = {
  type: 'event',
  name: 'getIdeaFromLLM',
  description: 'Generates a LinkedIn content idea using LLM',
  subscribes: ['get-topic-idea'],
  emits: ['idea-generated'],
  input: z.object({ name: z.string() }),
  flows: ['LinkedIn-content-agent']
};

exports.handler = async (input, { emit, logger }) => {
  logger.info(`📩 Generating content idea for user: ${input.name}`);

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1',
  });
  logger.info(`📩 after open ai`);
  const prompt = `
You are a content strategist for developers.

Generate one original and high-engagement idea for a LinkedIn post that a software engineer could write. Focus on insights, lessons, career growth, or thought-provoking takes on tech culture.

Only return the idea as plain text — no formatting or extra commentary.
  `.trim();

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const idea = response.choices[0]?.message?.content?.trim();

    if (!idea) {
      logger.error('❌ No content idea received from LLM.');
      return;
    }

    logger.info('✨ Content idea generated:', idea);

    await emit({
      topic: 'idea-generated',
      data: {
        message: idea,
        generated_for: input.name
      }
    });

  } catch (error) {
    logger.error('🛑 Failed to generate idea from LLM:', error.message);
  }
};