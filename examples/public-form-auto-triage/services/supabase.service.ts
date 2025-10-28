import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

let supabase: SupabaseClient;

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_KEY in your .env file');
    }
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

export interface VectorDocument {
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface QueryResult {
  content: string;
  similarity: number;
  metadata?: Record<string, any>;
}

/**
 * Insert vector embeddings into Supabase
 */
export async function insertVectors(
  documents: VectorDocument[],
  indexName: string = 'public_form_auto_triage'
): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from(indexName)
    .insert(documents.map((doc, idx) => ({
      content: doc.content,
      embedding: doc.embedding,
      metadata: doc.metadata || {},
      created_at: new Date().toISOString()
    })));

  if (error) {
    throw new Error(`Failed to insert vectors: ${error.message}`);
  }
}

/**
 * Query similar vectors from Supabase using cosine similarity
 */
export async function queryVectors(
  queryEmbedding: number[],
  limit: number = 5,
  indexName: string = 'public_form_auto_triage'
): Promise<QueryResult[]> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: limit,
    index_name: indexName
  });

  if (error) {
    throw new Error(`Failed to query vectors: ${error.message}`);
  }

  return data || [];
}

/**
 * Create the necessary database functions and tables
 * This should be run once during setup
 */
export async function setupVectorStore(indexName: string = 'public_form_auto_triage'): Promise<void> {
  // Note: This SQL should be run manually in Supabase dashboard:
  /*
  CREATE TABLE IF NOT EXISTS public_form_auto_triage (
    id BIGSERIAL PRIMARY KEY,
    content TEXT,
    embedding VECTOR(1024),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE OR REPLACE FUNCTION match_documents (
    query_embedding VECTOR(1024),
    match_threshold FLOAT,
    match_count INT,
    index_name TEXT DEFAULT 'public_form_auto_triage'
  )
  RETURNS TABLE (
    content TEXT,
    similarity FLOAT,
    metadata JSONB
  )
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RETURN QUERY
    EXECUTE format(
      'SELECT content, 1 - (embedding <=> $1) AS similarity, metadata
       FROM %I
       WHERE 1 - (embedding <=> $1) > $2
       ORDER BY embedding <=> $1
       LIMIT $3',
      index_name
    )
    USING query_embedding, match_threshold, match_count;
  END;
  $$;

  CREATE INDEX ON public_form_auto_triage USING ivfflat (embedding vector_cosine_ops);
  */
  
  console.log(`Please run the SQL setup for table: ${indexName}`);
}

export { getSupabaseClient as supabase };

