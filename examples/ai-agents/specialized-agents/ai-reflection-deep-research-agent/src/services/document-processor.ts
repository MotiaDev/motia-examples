/**
 * Document Processing Service
 * 
 * Handles extraction of text from various document formats
 * including PDF, Word documents, and plain text.
 */

import pdf from 'pdf-parse'
import mammoth from 'mammoth'

export interface DocumentExtractionResult {
  text: string
  pageCount?: number
  metadata?: Record<string, unknown>
}

export interface ProcessingOptions {
  preserveFormatting?: boolean
  extractMetadata?: boolean
}

/**
 * Extract text from a base64 encoded document
 */
export async function extractText(
  base64Content: string,
  documentType: 'pdf' | 'docx' | 'text',
  options: ProcessingOptions = {}
): Promise<DocumentExtractionResult> {
  const buffer = Buffer.from(base64Content, 'base64')

  switch (documentType) {
    case 'pdf':
      return extractFromPdf(buffer, options)
    case 'docx':
      return extractFromWord(buffer, options)
    case 'text':
      return {
        text: buffer.toString('utf-8'),
      }
    default:
      throw new Error(`Unsupported document type: ${documentType}`)
  }
}

/**
 * Extract text from PDF document
 */
async function extractFromPdf(
  buffer: Buffer,
  options: ProcessingOptions
): Promise<DocumentExtractionResult> {
  try {
    const data = await pdf(buffer)

    return {
      text: data.text,
      pageCount: data.numpages,
      metadata: options.extractMetadata ? {
        info: data.info,
        version: data.version,
      } : undefined,
    }
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${(error as Error).message}`)
  }
}

/**
 * Extract text from Word document (.docx)
 */
async function extractFromWord(
  buffer: Buffer,
  options: ProcessingOptions
): Promise<DocumentExtractionResult> {
  try {
    const result = options.preserveFormatting
      ? await mammoth.convertToHtml({ buffer })
      : await mammoth.extractRawText({ buffer })

    return {
      text: result.value,
      metadata: options.extractMetadata && result.messages.length > 0 ? {
        warnings: result.messages,
      } : undefined,
    }
  } catch (error) {
    throw new Error(`Failed to extract text from Word document: ${(error as Error).message}`)
  }
}

/**
 * Detect document type from file extension or content
 */
export function detectDocumentType(
  fileName?: string,
  mimeType?: string
): 'pdf' | 'docx' | 'text' {
  if (fileName) {
    const extension = fileName.toLowerCase().split('.').pop()
    if (extension === 'pdf') return 'pdf'
    if (extension === 'docx' || extension === 'doc') return 'docx'
    if (['txt', 'md', 'text'].includes(extension || '')) return 'text'
  }

  if (mimeType) {
    if (mimeType === 'application/pdf') return 'pdf'
    if (mimeType.includes('word') || mimeType.includes('openxmlformats')) return 'docx'
    if (mimeType.startsWith('text/')) return 'text'
  }

  // Default to text
  return 'text'
}

/**
 * Clean and normalize extracted text for LLM processing
 */
export function normalizeText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove multiple consecutive line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Trim
    .trim()
}

/**
 * Split text into chunks for processing (useful for very long documents)
 */
export function splitIntoChunks(
  text: string,
  maxChunkSize: number = 30000,
  overlap: number = 500
): string[] {
  if (text.length <= maxChunkSize) {
    return [text]
  }

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = start + maxChunkSize

    // Try to break at a paragraph or sentence boundary
    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf('\n\n', end)
      if (paragraphBreak > start + maxChunkSize / 2) {
        end = paragraphBreak
      } else {
        const sentenceBreak = text.lastIndexOf('. ', end)
        if (sentenceBreak > start + maxChunkSize / 2) {
          end = sentenceBreak + 1
        }
      }
    }

    chunks.push(text.slice(start, end).trim())
    start = end - overlap
  }

  return chunks
}

/**
 * Estimate token count for text (rough approximation)
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4)
}


