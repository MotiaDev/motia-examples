import { CouchbaseSearchConfig, VectorSearchResult } from './types'

// Disable SSL verification for Couchbase Capella in development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function queryVectorSearch(
  queryVector: number[],
  config: CouchbaseSearchConfig,
  topK: number = 5
): Promise<VectorSearchResult[]> {
  console.log('[Couchbase FTS] Starting vector search...', {
    indexName: config.indexName,
    vectorDimensions: queryVector.length,
    topK
  })
  
  // Extract hostname from connection string and create auth header once
  const hostname = config.connectionString
    .replace('couchbases://', '')
    .replace('couchbase://', '')
  
  const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64')
  
  // Use Couchbase Search API (FTS) - port 18094
  const searchUrl = `https://${hostname}:18094/api/bucket/${config.bucketName}/scope/${config.scopeName}/index/${config.indexName}/query`
  
  // Construct vector search query using FTS API
  const searchQuery = {
    query: {
      match_none: {}  // We only want vector results
    },
    knn: [
      {
        field: 'embedding',
        vector: queryVector,
        k: topK
      }
    ],
    size: topK,
    fields: ['*']
  }
  
  console.log(`[Couchbase FTS] Querying: ${searchUrl}`)
  
  try {
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(searchQuery)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Vector search failed: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    const data = await response.json() as {
      hits?: Array<{
        id: string
        score: number
      }>
    }
    
    console.log(`[Couchbase FTS] Vector search found ${data.hits?.length || 0} documents`)
    
    // FTS doesn't return document content, so fetch documents by ID using N1QL
    const docIds = (data.hits || []).map(hit => hit.id)
    
    if (docIds.length === 0) {
      console.log('[Couchbase FTS] No results found')
      return []
    }
    
    // Fetch actual documents using N1QL Query API
    const queryUrl = `https://${hostname}:18093/query/service`
    
    // Build N1QL SELECT query with parameterized document IDs
    const statement = `SELECT META().id, text, metadata FROM \`${config.bucketName}\`.\`${config.scopeName}\`.\`_default\` WHERE META().id IN $1`
    
    console.log(`[Couchbase N1QL] Fetching ${docIds.length} documents...`)
    
    const queryResponse = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        statement,
        args: [docIds]
      })
    })
    
    if (!queryResponse.ok) {
      const errorText = await queryResponse.text()
      throw new Error(`Failed to fetch documents: ${queryResponse.status} ${queryResponse.statusText} - ${errorText}`)
    }
    
    const queryData = await queryResponse.json() as {
      status: string
      results?: Array<{
        id: string
        text: string
        metadata: {
          dataId: string
          chunkIndex: number
          timestamp: string
        }
      }>
    }
    
    if (!queryData.results || queryData.results.length === 0) {
      console.log('[Couchbase N1QL] No documents retrieved')
      return []
    }
    
    console.log(`[Couchbase N1QL] Retrieved ${queryData.results.length} documents with text`)
    
    // Combine search scores with document content
    const scoreMap = new Map((data.hits || []).map(hit => [hit.id, hit.score]))
    
    const hits: VectorSearchResult[] = queryData.results.map(doc => ({
      id: doc.id,
      score: scoreMap.get(doc.id) ?? 0,
      text: doc.text,
      metadata: doc.metadata
    }))
    
    // Sort by timestamp (most recent first) to prioritize latest data
    // This ensures users see the newest mortgage rates
    hits.sort((a, b) => {
      const timeA = new Date(a.metadata.timestamp).getTime()
      const timeB = new Date(b.metadata.timestamp).getTime()
      return timeB - timeA // Descending order (newest first)
    })
    
    console.log(`[Couchbase] Final results (sorted by recency):`, hits.map(h => ({ 
      id: h.id, 
      score: h.score, 
      timestamp: h.metadata.timestamp,
      hasText: !!h.text, 
      textPreview: h.text.substring(0, 50) 
    })))
    
    return hits
  } catch (error) {
    console.error('[Couchbase Capella] Error:', error)
    throw error
  }
}

