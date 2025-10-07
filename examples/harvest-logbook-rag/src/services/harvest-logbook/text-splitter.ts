/**
 * Text Splitter Utility
 * Splits text into chunks with overlap for embedding generation
 */

export interface TextSplitterConfig {
  chunkSize: number;
  chunkOverlap: number;
}

export interface TextChunk {
  text: string;
  index: number;
  startChar: number;
  endChar: number;
}

/**
 * Split text into overlapping chunks
 */
export function splitText(
  text: string,
  config: TextSplitterConfig = { chunkSize: 400, chunkOverlap: 40 }
): TextChunk[] {
  const { chunkSize, chunkOverlap } = config;
  const chunks: TextChunk[] = [];
  
  if (!text || text.length === 0) {
    return chunks;
  }

  let startChar = 0;
  let index = 0;

  while (startChar < text.length) {
    const endChar = Math.min(startChar + chunkSize, text.length);
    const chunkText = text.slice(startChar, endChar);

    chunks.push({
      text: chunkText,
      index,
      startChar,
      endChar
    });

    // Move to next chunk with overlap
    startChar += chunkSize - chunkOverlap;
    index++;
  }

  return chunks;
}

/**
 * Split text by sentences for better semantic chunking
 */
export function splitTextBySentences(
  text: string,
  config: TextSplitterConfig = { chunkSize: 400, chunkOverlap: 40 }
): TextChunk[] {
  const { chunkSize, chunkOverlap } = config;
  
  // Split by sentence endings
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: TextChunk[] = [];
  
  let currentChunk = '';
  let startChar = 0;
  let index = 0;

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= chunkSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk) {
        chunks.push({
          text: currentChunk.trim(),
          index,
          startChar,
          endChar: startChar + currentChunk.length
        });
        index++;
      }
      
      // Handle overlap
      const overlapText = currentChunk.slice(-chunkOverlap);
      currentChunk = overlapText + sentence;
      startChar = startChar + currentChunk.length - overlapText.length - sentence.length;
    }
  }

  // Add the last chunk
  if (currentChunk) {
    chunks.push({
      text: currentChunk.trim(),
      index,
      startChar,
      endChar: startChar + currentChunk.length
    });
  }

  return chunks;
}
