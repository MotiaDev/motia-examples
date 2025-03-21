import { z } from 'zod';
import { EventConfig, StepHandler } from 'motia';
import * as fs from 'fs';
import * as path from 'path';

// Define schema for report output
const reportOutputSchema = z.object({
  filepath: z.string(),
  content: z.string()
});

// Define schema for report input
const markdownReportInputSchema = z.object({
  selectedNodeId: z.string(),
  state: z.string(),
  reasoning: z.string(),
  stats: z.object({
    visits: z.number(),
    value: z.number(),
    totalVisits: z.number(),
    childrenCount: z.number()
  }),
  allNodes: z.record(z.string(), z.any()),
  outputPath: z.string().optional(),
  
  // Additional fields for enhanced reporting
  requirements: z.string().optional(),
  repository: z.string().optional(),
  branch: z.string().optional(),
  totalCommits: z.number().optional(),
  commitsAnalyzed: z.number().optional(),
  analyzedCommits: z.array(z.string()).optional()
});

export type MarkdownReportInput = z.infer<typeof markdownReportInputSchema>;

export const config: EventConfig = {
  type: 'event',
  name: 'MarkdownReport',
  description: 'Generates a markdown report of the code review results',
  subscribes: ['code-review.reasoning.completed'],
  emits: ['code-review.report.generated'],
  flows: ['code-review-flow'],
  input: markdownReportInputSchema
};

export const handler: StepHandler<typeof config> = async (input: MarkdownReportInput, { emit, logger, state, traceId }) => {
  try {
    const { selectedNodeId, state: reasoningState, reasoning, stats, allNodes, outputPath } = input;
    
    // Check for mocks or authentication failure indicators
    let isMock = false;
    if (reasoningState && reasoningState.includes('MOCK RESPONSE')) {
      isMock = true;
      logger.warn('Detected mock response in reasoning state - Claude authentication may have failed');
    }
    
    // Generate markdown report
    const markdown = generateMarkdownReport(input, isMock);
    
    // Determine output path
    const filePath = outputPath || path.join(process.cwd(), 'code-review-report.md');
    
    // Write to file
    fs.writeFileSync(filePath, markdown);
    
    logger.info('Generated markdown report', { filePath });
    
    // Emit completion event
    await emit({
      topic: 'code-review.report.generated',
      data: {
        filepath: filePath,
        content: markdown
      }
    });
  } catch (error) {
    // Create a safe error object without circular references
    const safeError = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown Error',
      stack: error instanceof Error ? error.stack : undefined
    };
    
    logger.error('Error generating markdown report', safeError);
    
    // Try to create a minimal report when errors occur
    try {
      const filePath = input.outputPath || path.join(process.cwd(), 'code-review-report.md');
      const timestamp = new Date().toISOString();
      
      const fallbackMarkdown = `# Code Review Analysis - ${timestamp}

## ⚠️ Error Report ⚠️

An error occurred during the code review process. This may be due to:
- Authentication issues with Claude API
- Problems accessing the repository
- Other system errors

### Error Details
${safeError.message}

### Requirements
${state && await state.get(traceId, 'requirements') || 'No requirements available'}
`;
      
      fs.writeFileSync(filePath, fallbackMarkdown);
      logger.info('Generated fallback markdown report due to error', { filePath });
      
      await emit({
        topic: 'code-review.report.generated',
        data: {
          filepath: filePath,
          content: fallbackMarkdown
        }
      });
    } catch (reportError) {
      logger.error('Failed to create even a fallback report', reportError);
    }
  }
};

/**
 * Generate a markdown report from the review results
 */
function generateMarkdownReport(input: MarkdownReportInput, isMock: boolean = false): string {
  const { selectedNodeId, state: reasoningState, reasoning, stats, allNodes } = input;
  
  const timestamp = new Date().toISOString();
  let markdown = `# Code Review Analysis - ${timestamp}\n\n`;
  
  // Add warning if mock data was used
  if (isMock) {
    markdown += `## ⚠️ Warning\n\nThis report was generated with mock data because Claude AI authentication failed.\n\n`;
  }
  
  // Add requirements section if available
  if (input.requirements) {
    markdown += `## Requirements\n${input.requirements}\n\n`;
  }
  
  // Add repository information if available
  if (input.repository) {
    markdown += `## Repository Information\n`;
    markdown += `- Repository: ${input.repository}\n`;
    if (input.branch) markdown += `- Branch: ${input.branch}\n`;
    if (input.commitsAnalyzed) markdown += `- Total Commits: ${input.totalCommits || 'Unknown'}\n`;
    if (input.commitsAnalyzed) markdown += `- Commits Analyzed: ${input.commitsAnalyzed}\n`;
    markdown += `\n`;
  }
  
  // Add analyzed commits if available
  if (input.analyzedCommits && input.analyzedCommits.length > 0) {
    markdown += `## Analyzed Commits\n`;
    input.analyzedCommits.forEach(commit => {
      markdown += `- ${commit}\n`;
    });
    markdown += `\n`;
  }
  
  // Add summary
  markdown += `## Summary\n\n${reasoning || 'No summary available'}\n\n`;
  
  // Add statistics
  markdown += `## Statistics\n\n`;
  markdown += `- Visits: ${stats?.visits || 'N/A'}\n`;
  markdown += `- Value: ${stats?.value || 'N/A'}\n`;
  markdown += `- Total visits in analysis: ${stats?.totalVisits || 'N/A'}\n`;
  markdown += `- Child paths analyzed: ${stats?.childrenCount || 'N/A'}\n\n`;
  
  // Add selected reasoning path
  markdown += `## Selected Reasoning Path\n\n\`\`\`\n${reasoningState || 'No reasoning path available'}\n\`\`\`\n\n`;
  
  // Add MCTS tree visualization
  if (!isMock) {
    markdown += generateTreeVisualization(selectedNodeId, allNodes);
  }
  
  // Add overall workflow visualization
  markdown += `## Workflow Visualization\n\n`;
  markdown += `\`\`\`mermaid
flowchart TD
    A[Code Analysis] --> B[Selection Phase]
    B --> C[Expansion Phase]
    C --> D[Simulation Phase]
    D --> E[Backpropagation Phase]
    E --> F[Best Path Selection]
    F --> G[Markdown Report]
\`\`\`\n\n`;
  
  return markdown;
}

/**
 * Generate a mermaid visualization of the MCTS tree
 */
function generateTreeVisualization(selectedNodeId: string, allNodes: Record<string, any>): string {
  let visualization = `## MCTS Tree Visualization\n\n`;
  visualization += `\`\`\`mermaid
flowchart TD
`;
  
  // Generate node definitions
  const processedNodes = new Set<string>();
  
  // Process nodes by starting with the selected node and going up to root
  const nodesToProcess: string[] = [selectedNodeId];
  
  while (nodesToProcess.length > 0) {
    const nodeId = nodesToProcess.pop()!;
    
    if (processedNodes.has(nodeId) || !allNodes[nodeId]) {
      continue;
    }
    
    const node = allNodes[nodeId];
    const isSelected = nodeId === selectedNodeId;
    
    // Add node definition
    const nodeLabel = `${nodeId}[${isSelected ? '💡 ' : ''}Node ${nodeId.substring(0, 4)}... (v:${node.visits}, val:${node.value.toFixed(2)})]`;
    visualization += `    ${nodeLabel}\n`;
    
    // Process parent relationship
    if (node.parent && allNodes[node.parent]) {
      visualization += `    ${node.parent} --> ${nodeId}\n`;
      // Add parent to nodes to process
      nodesToProcess.push(node.parent);
    }
    
    // Process children
    if (node.children && node.children.length > 0) {
      for (const childId of node.children) {
        if (allNodes[childId]) {
          visualization += `    ${nodeId} --> ${childId}\n`;
          nodesToProcess.push(childId);
        }
      }
    }
    
    processedNodes.add(nodeId);
    
    // Limit visualization to avoid excessive size
    if (processedNodes.size > 15) {
      visualization += `    more[...more nodes...]\n`;
      break;
    }
  }
  
  visualization += '```\n\n';
  return visualization;
} 