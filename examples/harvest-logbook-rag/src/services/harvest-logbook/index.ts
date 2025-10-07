/**
 * Harvest Logbook Service
 * Main orchestration service for the harvest logbook RAG system
 */

export * from './types';
export * from './text-splitter';
export * from './openai-service';
export * from './pinecone-service';
export * from './sheets-service';
export * from './csv-logger';

// Export specific items from chat services to avoid conflicts
export { OpenAIChatService, getOpenAIChatService } from './openai-chat-service';
export { HuggingFaceService, getHuggingFaceService } from './huggingface-service';

import { getOpenAIService } from './openai-service';
import { getOpenAIChatService } from './openai-chat-service';
import { getPineconeService } from './pinecone-service';
import { getHuggingFaceService } from './huggingface-service';
import { getGoogleSheetsService } from './sheets-service';
import { getCSVLogger } from './csv-logger';
import { splitText } from './text-splitter';
import { HarvestLogEntry, AgentQuery, AgentResponse } from './types';

export class HarvestLogbookService {
  /**
   * Process and store harvest log entry
   */
  static async storeEntry(entry: HarvestLogEntry): Promise<string[]> {
    const openai = getOpenAIService();
    const pinecone = getPineconeService();

    // Split the content into chunks
    const chunks = splitText(entry.content, {
      chunkSize: 400,
      chunkOverlap: 40
    });

    // Generate embeddings for all chunks
    const embeddedChunks = await openai.embedChunks(
      chunks.map(chunk => ({
        text: chunk.text,
        metadata: {
          ...entry.metadata,
          chunkIndex: chunk.index,
          originalId: entry.id || `entry-${Date.now()}`
        }
      }))
    );

    // Store in Pinecone
    const vectors = embeddedChunks.map((chunk, index) => ({
      id: `${entry.id || Date.now()}-chunk-${index}`,
      values: chunk.embedding!,
      metadata: {
        text: chunk.text,
        timestamp: entry.timestamp || new Date().toISOString(),
        ...chunk.metadata
      }
    }));

    await pinecone.upsert(vectors);

    return vectors.map(v => v.id);
  }

  /**
   * Query the harvest logbook with an AI agent
   */
  static async queryWithAgent(query: AgentQuery): Promise<AgentResponse> {
    const openai = getOpenAIService();
    const pinecone = getPineconeService();
    
    // Determine which LLM to use (OpenAI or HuggingFace)
    const useOpenAIChat = process.env.USE_OPENAI_CHAT === 'true' || !process.env.HUGGINGFACE_API_KEY;
    
    // Create embedding for the query
    const queryEmbedding = await openai.createEmbedding(query.query);

    // Search for similar content in Pinecone
    const results = await pinecone.query(queryEmbedding, 5);

    // Extract context from results
    const context = results.map(r => r.metadata.text as string);
    const sources = results.map(r => ({
      id: r.id,
      score: r.score,
      text: (r.metadata.text as string).substring(0, 100) + '...'
    }));

    // Generate response using preferred LLM
    let response: string;
    
    if (useOpenAIChat) {
      const openaiChat = getOpenAIChatService();
      response = await openaiChat.generateWithContext(
        query.query,
        context,
        query.conversationHistory
      );
    } else {
      const huggingface = getHuggingFaceService();
      response = await huggingface.generateWithContext(
        query.query,
        context,
        query.conversationHistory
      );
    }

    return {
      response,
      sources: sources.map(s => `[${s.score.toFixed(2)}] ${s.text}`),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log interaction to CSV or Google Sheets
   */
  static async logToSheets(
    query: string,
    response: string,
    sources?: string[]
  ): Promise<void> {
    const entry = {
      timestamp: new Date().toISOString(),
      query,
      response,
      sources: sources?.join('; ')
    };

    // Use CSV logger for local testing, Google Sheets for production
    const useCSV = process.env.USE_CSV_LOGGER === 'true' || !process.env.GOOGLE_SHEETS_ID;
    
    if (useCSV) {
      const csvLogger = getCSVLogger();
      await csvLogger.logEntry(entry);
    } else {
      const sheets = getGoogleSheetsService();
      await sheets.logEntry(entry);
    }
  }
}
