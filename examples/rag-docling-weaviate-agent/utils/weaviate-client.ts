import weaviate from 'weaviate-client';

/**
 * Creates a Weaviate client connection, automatically detecting whether to use
 * local or cloud connection based on the URL pattern
 */
export async function createWeaviateClient() {
  const weaviateUrl = process.env.WEAVIATE_URL!;
  const apiKey = process.env.WEAVIATE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY!;

  // Check if this is a cloud URL (contains weaviate.cloud or similar cloud patterns)
  const isCloudUrl = weaviateUrl.includes('weaviate.cloud') || 
                     weaviateUrl.includes('weaviate.io') ||
                     weaviateUrl.includes('wcs.api.weaviate.io');

  const headers = {
    'X-OpenAI-Api-Key': openaiKey,
    // Uncomment if you have an OpenAI organization
    // 'X-OpenAI-Organization': process.env.OPENAI_ORGANIZATION!,
  };

  if (isCloudUrl) {
    // Use cloud connection for Weaviate Cloud instances
    if (!apiKey) {
      throw new Error('WEAVIATE_API_KEY is required for cloud instances');
    }
    
    return await weaviate.connectToWeaviateCloud(weaviateUrl, {
      authCredentials: new weaviate.ApiKey(apiKey),
      headers,
    });
  } else {
    // Use local connection for Docker/local instances
    const url = new URL(weaviateUrl);
    
    return await weaviate.connectToLocal({
      host: url.hostname,
      port: parseInt(url.port),
      grpc: false,
      headers,
    });
  }
}
