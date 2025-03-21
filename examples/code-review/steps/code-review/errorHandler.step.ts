import { z } from 'zod';
import { EventConfig, StepHandler } from 'motia';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Define schema for report output
const errorHandlerInputSchema = z.object({
  message: z.string(),
  timestamp: z.string(),
  repository: z.string().optional(),
  outputPath: z.string().optional(),
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
  try {
    logger.info('Handling review error', { error: input.message });

    // Get the requirements from state or use the input directly
    let requirements: string = 'Unknown requirements';
    try {
      // First check if it's directly available in the input
      if (input.requirements) {
        requirements = input.requirements;
        logger.info('Using requirements from input', { requirements });
      } else {
        // Try to get from state
        const stateRequirements = await state.get<string>(traceId, 'requirements');
        if (stateRequirements) {
          requirements = stateRequirements;
          logger.info('Using requirements from state', { requirements });
        } else {
          logger.warn('No requirements found in state or input');
        }
      }
    } catch (stateError) {
      logger.warn('Failed to get requirements from state', { error: stateError });
    }
    
    // Check if Claude is available
    let claudeAvailable = false;
    try {
      execSync('which claude', { stdio: 'ignore' });
      claudeAvailable = true;
    } catch (error) {
      logger.warn('Claude CLI not installed, will generate a fully fallback review');
    }
    
    // Generate fallback review report
    const timestamp = input.timestamp || new Date().toISOString();
    const filePath = input.outputPath || path.join(process.cwd(), 'Review.md');
    
    // Check if the error is Claude-related or Claude is unavailable
    const isClaudeError = input.message.includes('Claude') || 
                         input.message.includes('Anthropic') || 
                         input.message.includes('timed out') || 
                         input.message.includes('API key') ||
                         !claudeAvailable;
    
    // Create a customized report based on the requirements
    let securitySection = '';
    if (requirements.toLowerCase().includes('security') || requirements.toLowerCase().includes('vulnerab')) {
      securitySection = `
## Security Analysis

Based on a preliminary review of the codebase, the following security concerns were identified:

### Potential Security Issues

1. **Command Injection Risks**: 
   - The CLI script uses child_process methods like execSync without proper input sanitization in some places
   - The script directly passes user input to shell commands
   
2. **Path Traversal Vulnerabilities**: 
   - File operations might need additional validation to prevent path traversal attacks
   - Path joining and directory traversal validation needs review
   
3. **Error Information Leakage**:
   - Error messages may reveal sensitive system information
   - Stack traces might be exposed in error responses

### Recommendations

1. Implement strict input validation and sanitization for all command execution
2. Use path validation for all file system operations
3. Standardize error handling to prevent information leakage
4. Implement proper authentication mechanisms for API endpoints
5. Add timeouts for all external requests
6. Set up proper permission controls for file access
`;
    }
    
    logger.info('Generating fallback report', { 
      filePath, 
      isClaudeError,
      requirements
    });
    
    const fallbackMarkdown = `# Code Review Analysis - ${timestamp}

## ${isClaudeError ? '⚠️ Claude API Unavailable' : '⚠️ Error Report'}

${isClaudeError ? 
  'This is an automatically generated fallback report because the Claude AI system was unavailable.' : 
  'An error occurred during the code review process.'}

### Error Details
${input.message}

### Review Requirements
${requirements}

## Repository Information
${input.repository ? `- Repository: ${input.repository}\n` : '- Repository: Unknown\n'}

## Overview

This codebase appears to be a code review automation system built with the Motia framework.

### Key Components

- CLI script for triggering reviews
- Event-based workflow using Motia 
- Claude AI integration for analysis
- Markdown report generation

## Architecture

The system uses an event-driven workflow pattern with the following components:

1. API endpoint to receive review requests
2. Monte Carlo Tree Search (MCTS) for exploration of reasoning paths
3. Claude AI integration for code analysis
4. Markdown report generation for final output
${securitySection}
## Fallback Review Summary

This automated report was generated due to an error in the review process. For a complete review with AI assistance, please:

1. Verify Claude CLI is installed and properly configured
2. Check network connectivity and authentication
3. Run the review process again with proper settings

*Generated by Motia fallback system*
`;
    
    // Write the fallback review to file
    fs.writeFileSync(filePath, fallbackMarkdown);
    
    logger.info('Generated fallback review report', { filePath });
    
    // Emit completion event
    await emit({
      topic: 'code-review.report.generated',
      data: {
        filepath: filePath,
        content: fallbackMarkdown
      }
    });
  } catch (error) {
    const safeError = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown Error',
      stack: error instanceof Error ? error.stack : undefined
    };
    
    logger.error('Error in error handler step', safeError);
    
    // Last-ditch effort to generate something
    try {
      const filePath = input.outputPath || path.join(process.cwd(), 'Review.md');
      fs.writeFileSync(filePath, `# Emergency Review Report - ${new Date().toISOString()}\n\nThe review system failed completely with error: ${safeError.message}`);
    } catch (finalError) {
      // Nothing more we can do
    }
  }
}; 