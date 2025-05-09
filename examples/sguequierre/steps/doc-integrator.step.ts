import { promises as fs } from 'fs';
import path from 'path';

// Define types for the payload and context
interface DocumentationGap {
  lineNumber: number;
  type: string;
  name: string;
  generated_doc: string;
}

interface PayloadData {
  file: string;
  content: string;
  gaps: DocumentationGap[];
}

interface Context {
  emit: (event: { topic: string; data: any }) => void;
  logger: {
    info: (message: string) => void;
    error: (message: string) => void;
  };
}

// Export configuration
export const config = {
  type: 'event',
  name: 'doc-integrator',
  subscribes: ['documentation-approved'],
  emits: [],
  virtualEmits: ['documentation-integrated'],
  flows: ['documentation-guardian']
};

// Export handler function
export const handler = async (payload: PayloadData, context: Context): Promise<void> => {
  const { emit, logger } = context;
  logger.info(`Integrating documentation for ${payload.file}`);
  
  try {
    const { file, content, gaps } = payload;
    
    // Debug logging
    logger.info(`Payload file: ${file}`);
    logger.info(`Content length: ${content ? content.length : 'undefined'}`);
    logger.info(`Number of gaps: ${gaps ? gaps.length : 'undefined'}`);
    
    let updatedContent = content;
    
    // Sort gaps to process them in reverse order (from bottom to top)
    // This prevents line number changes from affecting other insertions
    const sortedGaps = [...gaps].sort((a, b) => {
      const lineA = a.lineNumber || 0;
      const lineB = b.lineNumber || 0;
      return lineB - lineA;
    });
    
    // Debug logging for sorted gaps
    logger.info(`Sorted gaps: ${JSON.stringify(sortedGaps.map(g => g.lineNumber))}`);
    
    // Apply each documentation change
    for (const gap of sortedGaps) {
      logger.info(`Processing gap at line ${gap.lineNumber}: ${gap.type} ${gap.name}`);
      updatedContent = insertDocumentation(
        updatedContent, 
        gap.lineNumber, 
        gap.generated_doc
      );
    }
    
    // Writes to a local file
    const localPath = path.join('output', file);
    
    // Get absolute path for better debugging
    const absolutePath = path.resolve(localPath);
    
    logger.info(`Writing documentation to local file:`);
    logger.info(`- Relative path: ${localPath}`);
    logger.info(`- Absolute path: ${absolutePath}`);
    logger.info(`- Directory: ${path.dirname(absolutePath)}`);
    
    // Log current working directory
    logger.info(`Current working directory: ${process.cwd()}`);
    
    // Check if directory exists
    try {
      const dirStat = await fs.stat(path.dirname(localPath)).catch(() => null);
      logger.info(`Output directory exists: ${!!dirStat}`);
    } catch (e) {
      logger.info(`Error checking directory: ${e instanceof Error ? e.message : String(e)}`);
    }
    
    // Create directory with verbose logging
    logger.info(`Creating directory: ${path.dirname(localPath)}`);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    logger.info(`Directory created successfully`);
    
    // Write file with verbose logging
    logger.info(`Writing file: ${localPath}`);
    await fs.writeFile(localPath, updatedContent);
    logger.info(`File written successfully, size: ${updatedContent.length} bytes`);
    
    // Verify file was written
    try {
      const stats = await fs.stat(localPath);
      logger.info(`File verification - exists: true, size: ${stats.size} bytes`);
    } catch (e) {
      logger.info(`File verification failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    
    // Emit the virtual event to connect to the next step
    emit({
      topic: "documentation-integrated",
      data: {
        file,
        updatedGapsCount: gaps.length,
        outputPath: absolutePath
      }
    });
    
    logger.info(`Documentation integration complete, emitted documentation-integrated event`);
  } catch (error) {
    logger.error(`Error integrating documentation: ${error instanceof Error ? error.message : String(error)}`);
    logger.error(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
  }
};

function insertDocumentation(content: string, lineNumber: number, docComment: string): string {
  const lines = content.split('\n');
  lines.splice(lineNumber, 0, docComment);
  return lines.join('\n');
}