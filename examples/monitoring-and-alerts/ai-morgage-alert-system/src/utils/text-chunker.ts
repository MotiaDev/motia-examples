export interface ChunkOptions {
  chunkSize: number
  overlap: number
}

export function chunkText(
  text: string, 
  options: ChunkOptions = { chunkSize: 400, overlap: 40 }
): string[] {
  const { chunkSize, overlap } = options
  const chunks: string[] = []
  let position = 0
  
  while (position < text.length) {
    const end = Math.min(position + chunkSize, text.length)
    chunks.push(text.substring(position, end))
    position += chunkSize - overlap
  }
  
  return chunks
}

