import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { EventConfig, FlowContext, StepHandler } from 'motia';
import { InternalServerError } from '../errors/InternalServerError';

const TranscriptionFileWriterInputSchema = z.object({
  transcriptionCount: z.number(),
  folderPath: z.string(),
  stateKey: z.string(),
});

type TranscriptionData = {
  transcriptions: Array<{
    imageName: string;
    transcription: string;
    error?: string;
  }>;
  folderPath: string;
};

export const config: EventConfig<typeof TranscriptionFileWriterInputSchema> = {
  type: 'event',
  name: 'Transcription File Writer',
  description: 'Stores transcriptions as Markdown files alongside the original images',
  subscribes: ['conversation-transcription-complete'],
  emits: ['transcription-files-written'],
  input: TranscriptionFileWriterInputSchema,
  flows: ['default'],
};

export const handler: StepHandler<typeof config> = async (
  input,
  { logger, emit, state, traceId }: FlowContext
) => {
  const { stateKey, folderPath } = input;
  logger.info(`Writing transcriptions to files for ${input.transcriptionCount} images`);

  // Get the transcriptions from state
  const transcriptionData = await state.get<TranscriptionData>(traceId, stateKey);
  if (!transcriptionData) {
    throw new InternalServerError(`No transcription data found in state for key: ${stateKey}`);
  }

  // Ensure the folder exists
  const fullPath = path.resolve(process.cwd(), folderPath);
  if (!fs.existsSync(fullPath)) {
    throw new InternalServerError(`Folder ${folderPath} does not exist`);
  }

  // Create a transcriptions subfolder if it doesn't exist
  const transcriptionsPath = path.join(fullPath, 'transcriptions');
  if (!fs.existsSync(transcriptionsPath)) {
    fs.mkdirSync(transcriptionsPath, { recursive: true });
  }

  // Write each transcription to a file
  const writtenFiles = await Promise.all(
    transcriptionData.transcriptions.map(async (item) => {
      try {
        // Generate the markdown filename based on the image name
        const imageBaseName = path.basename(item.imageName, path.extname(item.imageName));
        const markdownFilePath = path.join(transcriptionsPath, `${imageBaseName}.md`);

        // If there was an error during transcription, write that to the file
        if (item.error) {
          await fs.promises.writeFile(
            markdownFilePath,
            `# Transcription Error\n\nError: ${item.error}\n\nImage: ${item.imageName}`
          );
          return { imageName: item.imageName, markdownPath: markdownFilePath, success: false };
        }

        // Add a header with the image name and use the markdown content directly
        const finalContent = `# Transcription of ${item.imageName}\n\n${item.transcription}`;

        // Write the markdown file
        await fs.promises.writeFile(markdownFilePath, finalContent);

        return {
          imageName: item.imageName,
          markdownPath: markdownFilePath,
          success: true,
        };
      } catch (error) {
        logger.error(`Error writing transcription file for ${item.imageName}`, error);
        return {
          imageName: item.imageName,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        };
      }
    })
  );

  // Store the file paths in state
  await state.set(traceId, 'transcription_files', {
    files: writtenFiles,
    folderPath: transcriptionData.folderPath,
    transcriptionsPath,
  });

  // Emit completion event
  await emit({
    topic: 'transcription-files-written',
    data: {
      fileCount: writtenFiles.length,
      folderPath: transcriptionData.folderPath,
      transcriptionsPath,
      stateKey: 'transcription_files',
    },
  });

  logger.info(
    `Successfully wrote ${writtenFiles.length} transcription files to ${transcriptionsPath}`
  );
};
