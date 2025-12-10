import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_KEY || '';
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

export interface VectorDocument {
  commit_id: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface MatchedDocument {
  id: number;
  commit_id: string;
  content: string;
  similarity: number;
}

/**
 * Store embeddings in Supabase vector store
 * @param commitId - The commit ID
 * @param chunks - Array of text chunks
 * @param embeddings - Array of embedding vectors
 */
export async function storeEmbeddings(
  commitId: string,
  chunks: string[],
  embeddings: number[][]
): Promise<void> {
  const client = getSupabaseClient();
  try {
    const documents: VectorDocument[] = chunks.map((chunk, index) => ({
      commit_id: commitId,
      content: chunk,
      embedding: embeddings[index],
    }));

    const { error } = await client
      .from('github_commit_jenkins')
      .insert(documents);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error storing embeddings:', error);
    throw new Error('Failed to store embeddings in Supabase');
  }
}

/**
 * Query vector store for similar documents
 * @param queryEmbedding - The query embedding vector
 * @param matchThreshold - Similarity threshold (0-1)
 * @param matchCount - Number of results to return
 * @returns Array of matched documents
 */
export async function queryVectorStore(
  queryEmbedding: number[],
  matchThreshold: number = 0.78,
  matchCount: number = 5
): Promise<MatchedDocument[]> {
  const client = getSupabaseClient();
  try {
    const { data, error } = await client.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      throw error;
    }

    return data as MatchedDocument[];
  } catch (error) {
    console.error('Error querying vector store:', error);
    throw new Error('Failed to query vector store');
  }
}

/**
 * Get documents by commit ID
 * @param commitId - The commit ID to search for
 * @returns Array of documents for the commit
 */
export async function getDocumentsByCommitId(commitId: string): Promise<VectorDocument[]> {
  const client = getSupabaseClient();
  try {
    const { data, error } = await client
      .from('github_commit_jenkins')
      .select('*')
      .eq('commit_id', commitId);

    if (error) {
      throw error;
    }

    return data as VectorDocument[];
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw new Error('Failed to fetch documents');
  }
}

/**
 * Delete documents by commit ID
 * @param commitId - The commit ID to delete
 */
export async function deleteDocumentsByCommitId(commitId: string): Promise<void> {
  const client = getSupabaseClient();
  try {
    const { error } = await client
      .from('github_commit_jenkins')
      .delete()
      .eq('commit_id', commitId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting documents:', error);
    throw new Error('Failed to delete documents');
  }
}

