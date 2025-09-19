import { readdir } from 'fs/promises';
import { join, resolve, isAbsolute } from 'path';
import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const InputSchema = z.object({
  folderPath: z.string(),
});

// Supported file extensions
const SUPPORTED_EXTENSIONS = ['.pdf', '.md', '.html', '.htm', '.txt'];

export const config: EventConfig = {
  type: 'event',
  name: 'read-documents-chromadb',
  flows: ['rag-workflow'],
  subscribes: ['rag.read.documents.chromadb'],
  emits: [{ topic: 'rag.process.documents.chromadb', label: 'Start processing documents for ChromaDB' }],
  input: InputSchema,
};

export const handler: Handlers['read-documents-chromadb'] = async (
  input,
  { emit, logger }
) => {
  const { folderPath } = input;
  const cwd = process.cwd();
  const currentDirName = resolve(cwd).split('/').pop() ?? '';
  
  // Normalize common cases where users paste repo-relative paths like
  // "examples/rag-docling-weaviate-agent/docs/pdfs" while already in that example dir
  let normalizedPath = folderPath;
  if (!isAbsolute(folderPath) && folderPath.includes(`${currentDirName}/`)) {
    const parts = folderPath.split(`${currentDirName}/`);
    normalizedPath = parts[parts.length - 1]; // e.g., "docs/pdfs"
  }
  const absoluteFolderPath = isAbsolute(normalizedPath)
    ? normalizedPath
    : resolve(cwd, normalizedPath);
  
  logger.info(`Reading documents from folder for ChromaDB: ${folderPath}`, { absoluteFolderPath });

  // Read all files in the directory
  const files = await readdir(absoluteFolderPath);
  const supportedFiles = files.filter((file) => {
    const ext = file.toLowerCase().substring(file.lastIndexOf('.'));
    return SUPPORTED_EXTENSIONS.includes(ext);
  });

  logger.info(`Found ${supportedFiles.length} supported document files for ChromaDB processing`, {
    supportedExtensions: SUPPORTED_EXTENSIONS,
    foundFiles: supportedFiles
  });

  const filesInfo = await Promise.all(
    supportedFiles.map(async (file) => {
      const filePath = join(absoluteFolderPath, file);
      const ext = file.toLowerCase().substring(file.lastIndexOf('.'));
      return {
        filePath,
        fileName: file,
        fileType: ext,
      };
    })
  );

  // Process documents sequentially for ChromaDB
  await emit({
    topic: 'rag.process.documents.chromadb',
    data: { files: filesInfo },
  });
};
