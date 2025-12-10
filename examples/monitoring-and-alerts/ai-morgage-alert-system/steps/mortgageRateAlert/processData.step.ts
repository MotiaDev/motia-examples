import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { chunkText } from '../../src/utils/text-chunker';

const inputSchema = z.object({
  dataId: z.string(),
  content: z.string(),
  query: z.string(),
  hasQuery: z.boolean()
});

export const config: EventConfig = {
  name: 'ProcessMortgageData',
  type: 'event',
  description: 'Process mortgage data by chunking text and generating embeddings',
  subscribes: ['process-mortgage-data'],
  emits: ['store-embeddings'],
  input: inputSchema,
  flows: ['mortgage-rate-alert']
};

export const handler: Handlers['ProcessMortgageData'] = async (input, { emit, logger, state }) => {
  const { dataId, content, query } = input;
  
  logger.info('Processing mortgage data', { dataId, contentLength: content.length });
  
  const chunks = chunkText(content, { chunkSize: 400, overlap: 40 });
  
  logger.info('Text split into chunks', { 
    dataId, 
    chunkCount: chunks.length 
  });
  
  await state.set('mortgage-chunks', dataId, {
    chunks,
    query,
    timestamp: new Date().toISOString()
  });
  
  await emit({
    topic: 'store-embeddings',
    data: {
      dataId,
      chunks,
      query
    }
  });
  
  logger.info('Chunks prepared for embedding', { dataId, chunkCount: chunks.length });
};

