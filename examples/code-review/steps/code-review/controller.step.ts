import { z } from 'zod';
import { EventConfig, StepHandler } from 'motia';
import { Commits } from '../shared/utils/repository';
import { evaluateCommits } from '../shared/agents/claude';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const mctsControllerInputSchema = z.object({
  prompt: z.string(),
  repoUrl: z.string(),
  branch: z.string(),
  maxIterations: z.number().default(100),
  explorationConstant: z.number().default(1.414),
  maxDepth: z.number().default(10),
  reviewStartCommit: z.string().optional(),
  reviewEndCommit: z.string().optional(),
  requirements: z.string(),
  outputPath: z.string().optional()
});
export type MCTSControllerInput = z.infer<typeof mctsControllerInputSchema>;

export const config: EventConfig = {
  type: 'event',
  name: 'MCTSController',
  description: 'Controls the MCTS process for code review reasoning',
  subscribes: ['review.requested', 'mcts.backpropagation.completed'],
  emits: ['mcts.iteration.started', 'mcts.iterations.completed', 'review.error'],
  flows: ['code-review-flow'],
  input: mctsControllerInputSchema
};

export const handler: StepHandler<typeof config> = async (input: MCTSControllerInput, { emit, logger, state, traceId }) => {
  console.log('Controller received event with input:', JSON.stringify({
    ...input,
    requirements: input.requirements ? 
      (input.requirements.length > 20 ? `${input.requirements.slice(0, 20)}...` : input.requirements) : undefined,
    repoUrl: input.repoUrl
  }, null, 2));
  
  logger.info('Analyzing review context', {
    ...input,
    requirements: input.requirements && input.requirements.length > 20
      ? `${input.requirements.slice(0, 20)}...`
      : input.requirements,
    repoUrl: input.repoUrl
  });

  // Store requirements in state for error handling
  await state.set(traceId, 'requirements', input.requirements);
 
  try {
    // Check if Claude CLI is installed before proceeding
    let claudeInstalled = false;
    try {
      execSync('which claude', { stdio: 'ignore' });
      claudeInstalled = true;
    } catch (error) {
      console.warn('Claude CLI not found. Creating fallback review report directly from controller.');
      
      // Create fallback review file
      const outputPath = input.outputPath || path.join(process.cwd(), 'Review.md');
      
      // Create a reasonable fallback review based on the requirements
      let securityContent = '';
      if (input.requirements.toLowerCase().includes('security') || input.requirements.toLowerCase().includes('vulnerab')) {
        securityContent = `
## Security Analysis

This is a fallback security review generated without Claude's analysis:

### Potential Security Issues

1. **Command Injection Risk**: The CLI script uses child_process methods like execSync without proper input sanitization in some places.
   
2. **Path Traversal Concerns**: File operations might need additional validation to prevent path traversal attacks.
   
3. **Environment Variable Handling**: Review environment variable usage to ensure sensitive data is properly handled.

### Recommendations

1. Implement proper input sanitization for all command execution
2. Add path validation to file operations
3. Review error handling to prevent information leakage
`;
      }
      
      // General fallback review
      const fallbackReview = `# Code Review Report (Fallback) - ${new Date().toISOString()}

## ⚠️ FALLBACK REPORT ⚠️

This is an automatically generated fallback report because Claude CLI was not available.

### Review Requirements
${input.requirements}

## Overview

This codebase appears to be a code review automation system built with the Motia framework.

### Key Components

- CLI script for triggering reviews
- Event-based workflow using Motia
- Claude AI integration for analysis${securityContent}

## Process Flow

1. User triggers review via CLI
2. System extracts code context from git
3. Claude analyzes the codebase
4. Results are formatted and saved to a markdown file

## Recommendations

1. Improve error handling and reporting
2. Add better fallback mechanisms for when Claude is unavailable
3. Consider adding unit tests for core functionality

*Note: This is a fallback review generated directly by the controller step without Claude's analysis. For a complete review, please install Claude CLI and run the process again.*
`;
      
      // Write the fallback review
      fs.writeFileSync(outputPath, fallbackReview);
      console.log(`Created fallback review at: ${outputPath}`);
      
      // Skip the rest of the flow
      await emit({
        topic: 'mcts.iterations.completed',
        data: {
          nodes: { 
            'fallback-root': {
              id: 'fallback-root',
              parent: null,
              children: [],
              visits: 1,
              value: 0.5,
              state: 'Fallback review due to Claude unavailability',
              isTerminal: true
            }
          },
          rootId: 'fallback-root',
          currentIteration: 0,
          maxIterations: 0,
          explorationConstant: input.explorationConstant,
          maxDepth: input.maxDepth,
          outputPath: outputPath,
          fallbackReport: true
        }
      });
      
      return;
    }
    
    logger.info('Creating commits object for repository', { 
      repoUrl: input.repoUrl, 
      branch: input.branch,
      reviewStartCommit: input.reviewStartCommit,
      reviewEndCommit: input.reviewEndCommit
    });
    
    const commits = await Commits.create(traceId, state, input);
    
    logger.info('Successfully accessed repository and loaded commits', {
      filesChanged: commits.files.split('\n').length,
      commitMessages: commits.messages.split('\n').length
    });
    
    const evaluation = await evaluateCommits(commits, input.prompt);

    // Define a unique root node ID
    const rootId = `root-${Date.now()}`;

    // For the first iteration, initialize the MCTS tree structure
    const nodes: Record<string, any> = {
      [rootId]: {
        id: rootId,
        parent: null,
        children: [],
        visits: 1,
        value: 0,
        state: evaluation.summary,
        isTerminal: false
      }
    };
  
    if (evaluation.score > 0.9 || input.maxIterations === 0) {
      // If the score is already high or no iterations requested, complete immediately
      await emit({
        topic: 'mcts.iterations.completed',
        data: {
          nodes,
          rootId,
          currentIteration: 0,
          maxIterations: input.maxIterations,
          explorationConstant: input.explorationConstant,
          maxDepth: input.maxDepth,
          outputPath: input.outputPath
        }
      });
      logger.info('Context analysis completed without iterations');
    } else {
      // Start the MCTS process
      await emit({
        topic: 'mcts.iteration.started',
        data: {
          nodes,
          rootId,
          currentNodeId: rootId,
          currentIteration: 0,
          maxIterations: input.maxIterations,
          explorationConstant: input.explorationConstant,
          maxDepth: input.maxDepth,
          outputPath: input.outputPath
        }
      });
      logger.info('MCTS process started');
    }
  } catch (error) {
    // Create a safe error object without circular references
    const safeError = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown Error',
      stack: error instanceof Error ? error.stack : undefined
    };
    
    logger.error('Error in controller step', safeError);
    await emit({
      topic: 'review.error',
      data: {
        message: safeError.message,
        timestamp: new Date().toISOString(),
        repository: input.repoUrl,
        outputPath: input.outputPath,
        requirements: input.requirements
      }
    });
  }
};
