import { readdir } from 'fs/promises';
import { join, resolve, isAbsolute } from 'path';
import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const InputSchema = z.object({
  folderPath: z.string(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'read-pdfs',
  flows: ['rag-workflow'],
  subscribes: ['rag.read.pdfs'],
  emits: [{ topic: 'rag.process.pdfs', label: 'Start processing PDFs' }],
  input: InputSchema,
};

export const handler: Handlers['read-pdfs'] = async (
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
  logger.info(`Reading PDFs from folder: ${folderPath}`, { absoluteFolderPath });

  // Read all files in the directory
  const files = await readdir(absoluteFolderPath);
  const pdfFiles = files.filter((file) => file.endsWith('.pdf'));

  logger.info(`Found ${pdfFiles.length} PDF files`);

  const filesInfo = await Promise.all(
    pdfFiles.map(async (pdfFile) => {
      const filePath = join(absoluteFolderPath, pdfFile);
      return {
        filePath,
        fileName: pdfFile,
      };
    })
  );

  // Process PDF files in parallel
  /*await Promise.all(
    filesInfo.map(async (file) => {
      await emit({
        topic: 'rag.process.pdf',
        data: { files: [file] },
      });
    })
  );*/

  // Process PDF files sequentially
  await emit({
    topic: 'rag.process.pdfs',
    data: { files: filesInfo },
  });
};
