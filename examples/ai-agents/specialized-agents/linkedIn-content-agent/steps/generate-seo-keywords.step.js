const z = require('zod');
const { OpenAI } = require('openai');

exports.config = {
  type: 'event',
  name: 'generateSeoKeywords',
  description: 'Generates SEO keywords for a LinkedIn post',
  subscribes: ['linkedin-post-generated'],
  emits: ['seo-keywords-generated'],
  input: z.object({
    post: z.string(),
    generated_for: z.string(),
  }),
  flows: ['LinkedIn-content-agent'],
};

exports.handler = async (input, { state, emit, logger }) => {
  logger.info(`🔍 Generating SEO keywords for post by: ${input.generated_for}`);

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1',
  });

  const prompt = `
Analyze the following LinkedIn post and extract 7–10 high-quality SEO keywords or phrases that can help increase discoverability.

Post:
"${input.post}"

Return keywords as a comma-separated plain text list.
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
      temperature: 0.5,
      max_tokens: 100,
    });

    const keywords = response.choices[0]?.message?.content?.trim();

    if (!keywords) {
      logger.error('❌ No keywords returned from LLM.');
      return;
    }

    await state.set(input.generated_for, 'keywords', {
      keywords: keywords
    });

    await emit({
      topic: 'seo-keywords-generated',
      data: {
        keywords,
        generated_for: input.generated_for,
      },
    });
  } catch (error) {
    logger.error('🛑 Failed to generate SEO keywords:', error.message);
  }
};