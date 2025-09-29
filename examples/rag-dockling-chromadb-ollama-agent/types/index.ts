import { z } from 'zod';

// Input schema for processing PDFs
export const ProcessPDFsInput = z.object({
  folder_path: z.string(),
});

// Input schema for querying the RAG system
export const QueryRAGInput = z.object({
  query: z.string(),
  limit: z.number().optional().default(3),
});

// Schema for document chunks
export const DocumentChunk = z.object({
  text: z.string(),
  title: z.string(),
  metadata: z.object({
    source: z.string(),
    page: z.number(),
  }),
});

// Schema for RAG response
export const RAGResponse = z.object({
  query: z.string(),
  answer: z.string(),
  chunks: z.array(DocumentChunk),
});

export type ProcessPDFsInputType = z.infer<typeof ProcessPDFsInput>;
export type QueryRAGInputType = z.infer<typeof QueryRAGInput>;
export type DocumentChunkType = z.infer<typeof DocumentChunk>;
export type RAGResponseType = z.infer<typeof RAGResponse>;
