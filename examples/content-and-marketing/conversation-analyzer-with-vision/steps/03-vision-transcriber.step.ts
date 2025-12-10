import { z } from 'zod';
import OpenAI from 'openai';
import { EventConfig, Handlers } from 'motia';
import { withMiddleware } from '../middlewares/withMiddleware';
import { InternalServerError } from '../errors/InternalServerError';

const inputSchema = z.object({
  imageCount: z.number(),
  folderPath: z.string(),
  stateKey: z.string(),
});

type ImageData = {
  images: Array<{
    name: string;
    path: string;
    content: string;
    contentType: string;
  }>;
  folderPath: string;
};

export const config: EventConfig = {
  type: 'event',
  name: 'Conversation Screenshot Transcriber',
  description: 'Transcribes conversation screenshots using OpenAI Vision',
  subscribes: ['conversation-reader-complete'],
  emits: ['conversation-transcription-complete'],
  input: inputSchema,
  flows: ['default'],
};

export const handler: Handlers['Conversation Screenshot Transcriber'] = async (
  input,
  { logger, emit, state, traceId }
) => {
  const { stateKey } = input;
  logger.info(`Processing vision transcription for ${input.imageCount} images`);

  // Get the images from state
  const imageData = await state.get<ImageData>(traceId, stateKey);
  if (!imageData) {
    throw new InternalServerError(`No image data found in state for key: ${stateKey}`);
  }

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Process each image with OpenAI Vision
  const transcriptions = await Promise.all(
    imageData.images.map(async (image) => {
      try {
        logger.info(`Transcribing image: ${image.name}`);

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 4096,
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that transcribes conversation screenshots. ' +
                'Extract the conversation in a clean, readable markdown format. ' +
                'Include sender names, timestamps, and message content. ' +
                'Try to distinguish between the different participants, if you don\'t know the sender\'s name, use "Unknown". ' +
                'Preserve emojis and formatting where possible. ' +
                'Translate the conversation to English if it is not in English. ' +
                'Format each message as:\n\n' +
                '**Person Name** (Time of message):\n' +
                'Message content\n\n' +
                'Make sure to separate each message with a blank line for readability.',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please transcribe this conversation screenshot into a readable markdown format.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${image.contentType};base64,${image.content}`,
                  },
                },
              ],
            },
          ],
          response_format: { type: 'text' },
        });

        const transcription = response.choices[0]?.message?.content || 'No transcription available';

        return {
          imageName: image.name,
          transcription,
        };
      } catch (error) {
        logger.error(`Error transcribing image ${image.name}`, error);
        return {
          imageName: image.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  // Store the transcriptions in state
  await state.set(traceId, 'conversation_transcriptions', {
    transcriptions,
    folderPath: imageData.folderPath,
  });

  // Emit completion event
  await emit({
    topic: 'conversation-transcription-complete',
    data: {
      transcriptionCount: transcriptions.length,
      folderPath: imageData.folderPath,
      stateKey: 'conversation_transcriptions',
    },
  });

  logger.info(`Successfully transcribed ${transcriptions.length} conversation screenshots`);
};
