const z = require('zod');
const { OpenAI } = require('openai');

exports.config = {
  type: 'event',
  name: 'generateLinkedInPost',
  description: 'Turns a content idea into a full LinkedIn post using LLM',
  subscribes: ['idea-generated'],
  emits: ['linkedin-post-generated'],
  input: z.object({
    message: z.string(),
    generated_for: z.string(),
  }),
  flows: ['LinkedIn-content-agent'],
};

exports.handler = async (input, { emit, state, logger }) => {

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1',
  });

  const prompt = `
You are a professional LinkedIn content writer.

Using the idea below, write a LinkedIn post that:
- Grabs attention in the first line
- Is about software engineering or tech culture
- Shares an insight or story
- Ends with a takeaway or question
- Is 5–10 lines long
- Is relatable to software engineers
- Has a slightly casual, thoughtful tone

Content Idea: "${input.message}"

Only return the post — no commentary, no markdown, no hashtags.
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
      temperature: 0.75,
      max_tokens: 300,
    });

    const post = response.choices[0]?.message?.content?.trim();

    if (!post) {
      logger.error('❌ No post content returned from LLM.');
      return;
    }

    await state.set(input.generated_for, 'post', {
      post: post
    });

    await emit({
      topic: 'linkedin-post-generated',
      data: {
        post,
        generated_for: input.generated_for,
      },
    });
  } catch (error) {
    logger.error('🛑 Failed to generate LinkedIn post:', error.message);
  }
};
