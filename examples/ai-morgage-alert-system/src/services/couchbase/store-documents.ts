import { CouchbaseConfig, MortgageDocument } from './types'

// Disable SSL verification for Couchbase Capella in development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function storeDocuments(
  documents: MortgageDocument[],
  config: CouchbaseConfig
): Promise<void> {
  console.log('[Couchbase N1QL] Starting document storage...', {
    dataApiUrl: config.dataApiUrl,
    username: config.username,
    bucket: config.bucketName,
    documentCount: documents.length
  })
  
  // Extract hostname from connection string
  const hostname = config.connectionString
    .replace('couchbases://', '')
    .replace('couchbase://', '')
  
  // Use N1QL Query API (port 18093)
  const queryUrl = `https://${hostname}:18093/query/service`
  const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64')
  
  console.log(`[Couchbase N1QL] Using endpoint: ${queryUrl}`)
  
  try {
    // Store each document using N1QL UPSERT
    for (const doc of documents) {
      const docId = `${doc.metadata.dataId}-chunk-${doc.metadata.chunkIndex}`
      
      console.log(`[Couchbase N1QL] Storing document: ${docId}`)
      
      // Use N1QL UPSERT statement
      const statement = `UPSERT INTO \`${config.bucketName}\`.\`${config.scopeName}\`.\`${config.collectionName}\` (KEY, VALUE) VALUES ($1, $2)`
      
      const response = await fetch(queryUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          statement,
          args: [docId, doc]
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to store document ${docId}: ${response.status} ${response.statusText} - ${errorText}`)
      }
      
      const result = await response.json() as {
        status: string
        errors?: Array<{ msg: string; code: number }>
      }
      
      if (result.status !== 'success' && result.errors && result.errors.length > 0) {
        throw new Error(`N1QL Error: ${result.errors.map(e => e.msg).join(', ')}`)
      }
      
      console.log(`[Couchbase N1QL] ✓ Stored: ${docId}`)
    }
    
    console.log('[Couchbase N1QL] All documents stored successfully!')
  } catch (error) {
    console.error('[Couchbase N1QL] Error:', error)
    throw error
  }
}

