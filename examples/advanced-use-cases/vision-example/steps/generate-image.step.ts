import { queue, Handlers, StepConfig } from 'motia'
import { z } from 'zod'
import dotenv from 'dotenv'
import {fal} from '@fal-ai/client'
import path from 'path'

dotenv.config()

fal.config({
  credentials: process.env.FAL_API_KEY,
})

const FAL_MODEL = 'fal-ai/flux/schnell';

const inputSchema = z.object({
  prompt: z.string(),
  original_prompt: z.string()
})

export const config = {
    name: 'generate image',
    description: 'generate an ai image given a prompt',
    triggers: [queue('generate-image', { input: inputSchema })],
    enqueues: ['eval-image-result'],
    flows: ['generate-image'],
} as const satisfies StepConfig

const getRequestStatus = async (requestId: string) => {
  const status = await fal.queue.status(FAL_MODEL, {
    requestId: requestId,
    logs: true,
  });

  if (status.status !== 'COMPLETED') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return getRequestStatus(requestId);
  }

  return status.status;
}

async function saveBase64Image(base64String: string, filePath: string): Promise<void> {
  try {
      // Create the directory if it doesn't exist
      const directory = path.dirname(filePath);
      await require('fs').promises.mkdir(directory, { recursive: true });

      // Remove the base64 image header if present
      if (base64String.includes(',')) {
          base64String = base64String.split(',')[1];
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(base64String, 'base64');

      // Write buffer to file using Node.js fs promises
      await require('fs').promises.writeFile(filePath, buffer);
  } catch (error: unknown) {
      throw new Error(`Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const handler: Handlers<typeof config> = async (input, { traceId, enqueue, logger }) => {
  logger.info('generate an image using flux')

  try {
    const { request_id: requestId } = await fal.queue.submit(FAL_MODEL, {
      input: {
        prompt: input.prompt,
        image_size: 'square_hd',
        sync_mode: true,  
      },
    })
    
    if (!requestId) {
      console.error('failed to generate image')
      return;
    }

    await getRequestStatus(requestId);

    const result = await fal.queue.result(FAL_MODEL, {
      requestId
    });

    if (!result.data.images.length) {
      console.error('no image generated')
      return;
    }
    
    const imagePath = path.join(process.cwd(), 'tmp', `${traceId}.png`);

    await saveBase64Image(result.data.images[0].url, imagePath);
    

    logger.info("Image saved to " + imagePath);

    await enqueue({
      topic: 'eval-image-result',
      data: {
        image: imagePath, 
        prompt: input.prompt, 
        original_prompt: input.original_prompt
      },
    })
  } catch (error) {
    console.error('failed to generate image', error)
    return;
  }
      
}