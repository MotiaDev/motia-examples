// steps/file-content-fetcher.step.ts
import axios from 'axios';

interface FileChangePayload {
  repository: string;
  file: string;
  commitSha: string;
}

// Configuration section
export const config = {
  type: 'event',
  name: 'file-content-fetcher',
  subscribes: ['code-file-changed'],
  emits: ['file-content-fetched'],
  flows: ['documentation-guardian']
};

// Handler function
export const handler = async (payload: FileChangePayload, context: any) => {
  const { emit, logger } = context;
  logger.info(`Fetching content for ${payload.file}`);
  
  try {
    // Log the GitHub API URL we're about to request
    const apiUrl = `https://api.github.com/repos/${payload.repository}/contents/${payload.file}`;
    logger.info(`Making GitHub API request to: ${apiUrl}`);
    
    // Set a timeout for the axios request
    const response = await axios.get(
      apiUrl,
      { 
        headers: { 'Accept': 'application/vnd.github.v3.raw' },
        timeout: 10000 // 10 second timeout
      }
    );
    
    logger.info(`Received response with status: ${response.status}`);
    
    let fileContent;
    
    // Check response type
    logger.info(`Response data type: ${typeof response.data}`);
    
    // Check if the response is already the raw file content
    if (typeof response.data === 'string') {
      // The Accept header worked, and we got raw content
      logger.info('Received raw string content');
      fileContent = response.data;
    } else if (response.data && typeof response.data === 'object') {
      logger.info(`Received JSON object with keys: ${Object.keys(response.data).join(', ')}`);
      
      if (response.data.content && response.data.encoding === 'base64') {
        // We got a JSON response with base64 encoded content
        logger.info('Decoding base64 content');
        try {
          fileContent = Buffer.from(response.data.content, 'base64').toString('utf-8');
          logger.info('Decoded base64 content successfully');
        } catch (decodeError) {
          logger.error(`Error decoding base64: ${decodeError instanceof Error ? decodeError.message : 'Unknown error'}`);
          throw new Error('Failed to decode base64 content');
        }
      } else if (response.data.download_url) {
        // Try to use the download_url directly
        logger.info(`Fetching from download_url: ${response.data.download_url}`);
        try {
          const rawResponse = await axios.get(response.data.download_url, { timeout: 10000 });
          logger.info(`Download URL request completed with status: ${rawResponse.status}`);
          fileContent = rawResponse.data;
        } catch (downloadError) {
          logger.error(`Error fetching from download_url: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`);
          throw new Error('Failed to fetch from download_url');
        }
      } else {
        throw new Error('Unable to extract file content from GitHub API response');
      }
    } else {
      throw new Error(`Unexpected response format: ${typeof response.data}`);
    }
    
    logger.info('Successfully processed file content, emitting event');
    
    // Emit the event with the actual file content
    emit({
      topic: "file-content-fetched",
      data: {
        ...payload,
        content: fileContent
      }
    });
    
    logger.info('Event emitted successfully');
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error fetching file content: ${error.message}`);
      if (error.stack) {
        logger.error(`Stack trace: ${error.stack}`);
      }
      
      // If it's an axios error, log more details
      if (axios.isAxiosError(error) && error.response) {
        logger.error(`API response status: ${error.response.status}`);
        logger.error(`API response data: ${JSON.stringify(error.response.data)}`);
      }
    } else {
      logger.error('Error fetching file content: An unknown error occurred.');
    }
    
    // Emit an error event
    emit({
      topic: "file-content-fetched",
      data: {
        ...payload,
        content: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    
    logger.info('Error event emitted successfully');
  }
};