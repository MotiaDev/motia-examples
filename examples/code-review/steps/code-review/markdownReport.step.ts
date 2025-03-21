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
  outputPath: z.string().optional()
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
    
    // Generate markdown report
    const markdown = generateMarkdownReport(input);
    
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
    logger.error('Error generating markdown report', error);
  }
};

/**
 * Generate a markdown report from the review results
 */
function generateMarkdownReport(input: MarkdownReportInput): string {
  const { selectedNodeId, state: reasoningState, reasoning, stats, allNodes } = input;
  
  let markdown = `# Code Review Analysis\n\n`;
  
  // Add summary
  markdown += `## Summary\n\n${reasoning}\n\n`;
  
  // Add statistics
  markdown += `## Statistics\n\n`;
  markdown += `- Visits: ${stats.visits}\n`;
  markdown += `- Value: ${stats.value}\n`;
  markdown += `- Total visits in analysis: ${stats.totalVisits}\n`;
  markdown += `- Child paths analyzed: ${stats.childrenCount}\n\n`;
  
  // Add selected reasoning path
  markdown += `## Selected Reasoning Path\n\n\`\`\`\n${reasoningState}\n\`\`\`\n\n`;
  
  // Add MCTS tree visualization
  markdown += generateTreeVisualization(selectedNodeId, allNodes);
  
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