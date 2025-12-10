/**
 * Harvest Logbook Types
 * Types for the RAG-based harvest logbook system
 */

export interface HarvestLogEntry {
  id?: string;
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface EmbeddingChunk {
  text: string;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface VectorStoreEntry {
  id: string;
  values: number[];
  metadata: {
    text: string;
    timestamp: string;
    [key: string]: any;
  };
}

export interface AgentQuery {
  query: string;
  context?: string[];
  conversationHistory?: ConversationMessage[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AgentResponse {
  response: string;
  sources?: string[];
  timestamp: string;
}

export interface SheetLogEntry {
  timestamp: string;
  query: string;
  response: string;
  sources?: string;
}
