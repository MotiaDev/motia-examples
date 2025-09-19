import { readdir } from 'fs/promises';
import { join, resolve, isAbsolute } from 'path';
import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const InputSchema = z.object({
  folderPath: z.string(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'read-pdfs-chromadb',
  flows: ['rag-workflow'],
  subscribes: ['rag.read.pdfs.chromadb'],
  emits: [{ topic: 'rag.process.pdfs.chromadb', label: 'Start processing PDFs for ChromaDB' }],
  input: InputSchema,
};

export const handler: Handlers['read-pdfs-chromadb'] = async (
  input,
  { emit, logger }
) => {
  const { folderPath } = input;
  const cwd = process.cwd();
  const currentDirName = resolve(cwd).split('/').pop() ?? '';
  // Normalize common cases where users paste repo-relative paths like
  // "examples/rag-docling-vector-agent/docs/pdfs" while already in that example dir
  let normalizedPath = folderPath;
  if (!isAbsolute(folderPath) && folderPath.includes(`${currentDirName}/`)) {
    const parts = folderPath.split(`${currentDirName}/`);
    normalizedPath = parts[parts.length - 1]; // e.g., "docs/pdfs"
  }
  const absoluteFolderPath = isAbsolute(normalizedPath)
    ? normalizedPath
    : resolve(cwd, normalizedPath);
  logger.info(`Reading PDFs from folder for ChromaDB: ${folderPath}`, { absoluteFolderPath });

  // Read all files in the directory
  const files = await readdir(absoluteFolderPath);
  const pdfFiles = files.filter((file) => file.endsWith('.pdf'));

  logger.info(`Found ${pdfFiles.length} PDF files for ChromaDB processing`);

  const filesInfo = await Promise.all(
    pdfFiles.map(async (pdfFile) => {
      const filePath = join(absoluteFolderPath, pdfFile);
      return {
        filePath,
        fileName: pdfFile,
      };
    })
  );

  // Process PDF files sequentially for ChromaDB
  await emit({
    topic: 'rag.process.pdfs.chromadb',
    data: { files: filesInfo },
  });
};
