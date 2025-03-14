import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { EventConfig, FlowContext, StepHandler } from 'motia';

const ConversationReaderInputSchema = z.object({
  folderPath: z.string(),
  traceId: z.string(),
});

export const config: EventConfig<typeof ConversationReaderInputSchema> = {
  type: 'event',
  name: 'Conversation Screenshot Reader',
  description: 'Processes conversation screenshots from a folder as a background job',
  subscribes: ['conversation-reader-start'],
  emits: ['conversation-reader-complete'],
  input: ConversationReaderInputSchema,
  flows: ['default'],
};

export const handler: StepHandler<typeof config> = async (
  input,
  { logger, emit, state, traceId }: FlowContext
) => {
  const { folderPath } = input;
  logger.info(`Processing conversation screenshots from ${folderPath}`);

  // Full path was already validated in the API step
  const fullPath = path.resolve(process.cwd(), folderPath);

  // Read all files from the folder
  const files = fs.readdirSync(fullPath);

  // Filter for image files
  const imageFiles = files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return ['.png', '.jpg', '.jpeg'].includes(ext);
  });

  // Create file objects with path and base64 content
  const images = await Promise.all(
    imageFiles.map(async (file) => {
      const filePath = path.join(fullPath, file);
      const fileContent = await fs.promises.readFile(filePath);
      return {
        name: file,
        path: filePath,
        content: fileContent.toString('base64'),
        contentType: `image/${path.extname(file).substring(1).toLowerCase()}`,
      };
    })
  );

  // Store the full images in state
  await state.set(traceId, 'conversation_screenshots', {
    images,
    folderPath,
  });

  // Emit a notification with references but not the full content
  await emit({
    topic: 'conversation-reader-complete',
    data: {
      imageCount: images.length,
      folderPath,
      stateKey: 'conversation_screenshots',
    },
  });

  logger.info(`Successfully processed ${images.length}  screenshots`);
};
