import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { EventConfig, FlowContext, StepHandler } from 'motia';
import { InternalServerError } from '../errors/InternalServerError';

const ConversationSummarizerInputSchema = z.object({
  fileCount: z.number(),
  folderPath: z.string(),
  transcriptionsPath: z.string(),
  stateKey: z.string(),
});

type TranscriptionFileData = {
  files: Array<{
    imageName: string;
    markdownPath: string;
    success: boolean;
    error?: string;
  }>;
  folderPath: string;
  transcriptionsPath: string;
};

export const config: EventConfig<typeof ConversationSummarizerInputSchema> = {
  type: 'event',
  name: 'Conversation Summarizer',
  description: 'Summarizes transcriptions, extracts next steps, and performs sentiment analysis',
  subscribes: ['transcription-files-written'],
  emits: ['conversation-summary-complete'],
  input: ConversationSummarizerInputSchema,
  flows: ['default'],
};

export const handler: StepHandler<typeof config> = async (
  input,
  { logger, emit, state, traceId }: FlowContext
) => {
  const { stateKey, transcriptionsPath } = input;
  logger.info(`Summarizing transcriptions from ${transcriptionsPath}`);

  // Get the transcription files data from state
  const transcriptionFileData = await state.get<TranscriptionFileData>(traceId, stateKey);
  if (!transcriptionFileData) {
    throw new InternalServerError(`No transcription file data found in state for key: ${stateKey}`);
  }

  // Read all the markdown files
  const transcriptionContents = await Promise.all(
    transcriptionFileData.files
      .filter((file) => file.success)
      .map(async (file) => {
        try {
          const content = await fs.promises.readFile(file.markdownPath, 'utf-8');
          return {
            imageName: file.imageName,
            content,
          };
        } catch (error) {
          logger.error(`Error reading transcription file ${file.markdownPath}`, error);
          return {
            imageName: file.imageName,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
  );

  // Combine all transcriptions into a single text
  const combinedTranscription = transcriptionContents
    .filter((item) => !item.error)
    .map((item) => item.content)
    .join('\n\n---\n\n');

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Generate the summary, next steps, and sentiment analysis
  try {
    logger.info('Generating conversation summary and analysis');

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert conversation analyst. Your task is to analyze a conversation transcript and provide a well-formatted Markdown document with the following sections:\n\n' +
            '# Conversation Summary\n\n' +
            '## Summary\n' +
            'A comprehensive summary that preserves important dates, timeline information, and key points.\n\n' +
            '## Next Steps\n' +
            'A numbered list of explicit or implied next steps or action items from the conversation.\n\n' +
            '## Sentiment Analysis\n\n' +
            '### Overall\n' +
            'Description of the overall sentiment of the conversation.\n\n' +
            '### By Participant\n' +
            'Individual sentiment analysis for each participant in the conversation.\n\n' +
            'Make sure to maintain proper Markdown formatting throughout your response.',
        },
        {
          role: 'user',
          content: `Please analyze the following conversation transcripts:\n\n${combinedTranscription}`,
        },
      ],
    });

    const summaryContent =
      response.choices[0]?.message?.content ||
      '# Conversation Summary\n\n## Error\n\nFailed to generate summary.';

    // Create a summary markdown file
    const summaryFilePath = path.join(transcriptionFileData.transcriptionsPath, 'summary.md');

    // Write the summary file directly (no need for conversion)
    await fs.promises.writeFile(summaryFilePath, summaryContent);

    // Store the raw summary in state
    await state.set(traceId, 'conversation_analysis', {
      summaryContent,
      summaryFilePath,
      folderPath: transcriptionFileData.folderPath,
    });

    // Emit completion event
    await emit({
      topic: 'conversation-summary-complete',
      data: {
        folderPath: transcriptionFileData.folderPath,
        transcriptionsPath: transcriptionFileData.transcriptionsPath,
        summaryFilePath,
        stateKey: 'conversation_analysis',
      },
    });

    logger.info(`Successfully generated conversation summary and saved to ${summaryFilePath}`);
  } catch (error) {
    logger.error('Error generating conversation summary', error);
    throw new InternalServerError(
      `Failed to generate conversation summary: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
