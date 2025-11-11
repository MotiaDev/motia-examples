export interface CouchbaseConfig {
  connectionString: string
  dataApiUrl: string
  username: string
  password: string
  bucketName: string
  scopeName: string
  collectionName: string
}

export interface CouchbaseSearchConfig extends Omit<CouchbaseConfig, 'collectionName'> {
  indexName: string
}

export interface MortgageDocument {
  type: string
  embedding: number[]
  text: string
  metadata: {
    dataId: string
    chunkIndex: number
    timestamp: string
  }
}

export interface VectorSearchResult {
  id: string
  score: number
  text: string
  metadata: {
    dataId: string
    chunkIndex: number
    timestamp: string
  }
}

