import { z } from 'zod';
import { EventConfig, StepHandler } from 'motia';
import * as fs from 'fs';
import * as path from 'path';

// Define schema for report output
const errorHandlerInputSchema = z.object({
  message: z.string(),
  timestamp: z.string(),
  repository: z.string().optional(),
  output_url: z.string().optional(),
  requirements: z.string().optional()
});

export type ErrorHandlerInput = z.infer<typeof errorHandlerInputSchema>;

export const config: EventConfig = {
  type: 'event',
  name: 'ErrorHandler',
  description: 'Handles errors in the code review process and creates fallback reports',
  subscribes: ['review.error'],
  emits: ['code-review.report.generated'],
  flows: ['code-review-flow'],
  input: errorHandlerInputSchema
};

export const handler: StepHandler<typeof config> = async (input: ErrorHandlerInput, { emit, logger, state, traceId }) => {
  logger.info('Handling review error', { error: input.message });

  try {
    // Generate fallback review report
    const timestamp = input.timestamp || new Date().toISOString();
    
    // Use output path from input or default to Review.md in the current directory
    let filePath = 'Review.md';
    
    try {
      if (input.output_url) {
        const parsedUrl = new URL(input.output_url);
        if (parsedUrl.protocol === 'file:') {
          filePath = parsedUrl.pathname;
        } else {
          filePath = input.output_url.replace('file://', '');
        }
      }
    } catch (urlError) {
      // If URL parsing fails, try to use the output_url directly or fall back to default
      filePath = input.output_url || 'Review.md';
      logger.warn('Failed to parse output URL', { url: input.output_url, error: String(urlError) });
    }
    
    // If filePath is not absolute, make it relative to current working directory
    if (!path.isAbsolute(filePath)) {
      filePath = path.join(process.cwd(), filePath);
    }
    
    // Ensure the directory exists
    const dirPath = path.dirname(filePath);
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (dirError) {
      logger.warn('Failed to create directory', { dir: dirPath, error: String(dirError) });
      // Fall back to current directory
      filePath = path.join(process.cwd(), 'ERROR-REPORT.md');
    }
    
    // Create more detailed error report
    const fallbackMarkdown = `# Review Error Report - ${timestamp}

## Error Details
The code review system encountered an error: ${input.message}

## Request Information
${input.repository ? `- Repository: ${input.repository}\n` : ''}
${input.requirements ? `- Requirements: ${input.requirements}\n` : ''}
- Timestamp: ${timestamp}
`;

    // Write the report
    try {
      fs.writeFileSync(filePath, fallbackMarkdown);
      logger.info('Generated fallback review report', { filePath });
    } catch (writeError) {
      logger.error('Failed to write to file', { path: filePath, error: String(writeError) });
      // Try one more time with a simple fallback path
      filePath = path.join(process.cwd(), 'ERROR-REPORT.md');
      fs.writeFileSync(filePath, fallbackMarkdown);
    }

    // Emit completion event
    await emit({
      topic: 'code-review.report.generated',
      data: {
        filepath: filePath,
        content: fallbackMarkdown
      }
    });
  } catch (error) {
    // Handle errors that might occur during report generation
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to generate error report', { error: errorMessage });
    
    // Try to write to a failsafe location
    try {
      const failsafeReport = `# Critical Error Report

Failed to generate error report due to: ${errorMessage}
Original error: ${input.message}
`;
      
      // Write directly to current directory with a simple filename
      const errorFilePath = 'ERROR-REPORT.md';
      fs.writeFileSync(errorFilePath, failsafeReport);
      logger.info('Generated critical error report', { filePath: errorFilePath });
    } catch (criticalError) {
      // At this point, we can only log the critical failure
      logger.error('Critical failure in error handler', { 
        originalError: input.message,
        handlerError: errorMessage,
        criticalError: String(criticalError)
      });
    }
  }
};
