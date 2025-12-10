const { OpenAI } = require('openai')
const { z } = require('zod')

exports.config = {
  type: 'event',
  name: 'generateImageForLinkedInPost',
  description: 'Generates a relevant image for a LinkedIn post using Dall·E',
  subscribes: ['linkedin-post-generated'],
  emits: ['image-generated-for-post'],
  input: z.object({
    post: z.string(),
    generated_for: z.string(),
  }),
  flows: ['LinkedIn-content-agent'],
}

exports.handler = async (input, { emit, state, logger }) => {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1',
  })

  try {
    const existingPost = await state.get(input.generated_for, 'post');
    const existingImage = await state.get(input.generated_for, 'imgURL');

    if (existingPost && existingImage) {
      logger.info('🛑 Post and image already exist, skipping generation');
      return;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: `Turn this LinkedIn post into an image prompt:\n\n"${input.post}"` },
      ],
      temperature: 0.7,
      max_tokens: 100,
    })

    const imagePrompt = completion.choices[0]?.message?.content?.trim()

    if (!imagePrompt) {
      logger.error('❌ Failed to create image prompt.')
      return
    }

    // Use DALL·E to generate image
    const imageRes = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    })

    const imageUrl = imageRes.data?.[0]?.url

    if (!imageUrl) {
      logger.error('❌ No image URL returned from OpenAI.')
      return
    }

    logger.info(`🖼️ Image generated: ${imageUrl}`)

    await state.set(input.generated_for, 'imgURL', {
      imageUrl: imageUrl
    });

    await emit({
      topic: 'image-generated-for-post',
      data: {
        imageUrl,
        post: input.post,
        generated_for: input.generated_for,
      },
    })


  } catch (error) {
    logger.error('🛑 Failed to generate image:')
  }
}
