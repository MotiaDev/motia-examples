-- Supabase setup script for Competitor Price Scraper
-- Run this in your Supabase SQL editor

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the vector table for competitor price scraper
CREATE TABLE IF NOT EXISTS competitor_price_scraper (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embeddings dimension
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for similarity search (using IVFFlat for better performance)
CREATE INDEX IF NOT EXISTS competitor_price_scraper_embedding_idx 
ON competitor_price_scraper 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create RPC function for similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  table_name text
)
RETURNS TABLE (
  id text,
  content text,
  embedding vector(1536),
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  EXECUTE format('
    SELECT 
      id,
      content,
      embedding,
      metadata,
      1 - (embedding <=> %L) as similarity
    FROM %I
    WHERE 1 - (embedding <=> %L) > %L
    ORDER BY embedding <=> %L
    LIMIT %L
  ', query_embedding, table_name, query_embedding, match_threshold, query_embedding, match_count);
END;
$$;

-- Grant permissions (adjust based on your Supabase auth setup)
GRANT ALL ON competitor_price_scraper TO authenticated;
GRANT ALL ON competitor_price_scraper TO service_role;

-- Create a test query to verify setup
-- This will return 0 rows but verifies the table and function exist
SELECT COUNT(*) as table_exists FROM competitor_price_scraper;

-- Verify the RPC function works (will return 0 rows)
SELECT * FROM match_documents(
  array_fill(0, ARRAY[1536])::vector(1536),  -- Dummy embedding
  0.7,  -- Match threshold
  5,    -- Match count
  'competitor_price_scraper'  -- Table name
);

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Supabase setup completed successfully!';
  RAISE NOTICE 'Table: competitor_price_scraper created';
  RAISE NOTICE 'Index: competitor_price_scraper_embedding_idx created';
  RAISE NOTICE 'Function: match_documents created';
END $$;
