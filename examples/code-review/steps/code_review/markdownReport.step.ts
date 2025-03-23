import { z } from 'zod';
import { EventConfig, StepHandler } from 'motia';
import * as fs from 'fs';
import * as path from 'path';

// Define schema for report output
const reportOutputSchema = z.object({
  output_url: z.string(),
  content: z.string()
});

// Define schema for report input with more flexibility
const markdownReportInputSchema = z.object({
  selected_node_id: z.string().optional().default('root-default'),
  state: z.string().optional().default('No state information available'),
  reasoning: z.string().optional().default('No reasoning information available'),
  stats: z.object({
    visits: z.number().optional().default(0),
    value: z.number().optional().default(0),
    total_visits: z.number().optional().default(0),
    children_count: z.number().optional().default(0)
  }).optional().default({
    visits: 0,
    value: 0,
    total_visits: 0,
    children_count: 0
  }),
  all_nodes: z.record(z.string(), z.any()).optional().default({}),
  output_url: z.string().optional().default('file://Review.md'),

  // Additional fields for enhanced reporting
  requirements: z.string().optional().default('No requirements specified'),
  repository: z.string().optional().default('Unknown repository'),
  branch: z.string().optional().default('Unknown branch'),
  total_commits: z.number().optional().default(0),
  commits_analyzed: z.number().optional().default(0),
  analyzed_commits: z.array(z.string()).optional().default([])
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
    // Ensure we have an input object with defaults for missing fields
    const safeInput: MarkdownReportInput = {
      selected_node_id: input.selected_node_id || 'root-default',
      state: input.state || 'No state information available',
      reasoning: input.reasoning || 'No reasoning information available',
      stats: input.stats || {
        visits: 0,
        value: 0,
        total_visits: 0,
        children_count: 0
      },
      all_nodes: input.all_nodes || {},
      output_url: input.output_url || 'file://Review.md',
      requirements: input.requirements || 'No requirements specified',
      repository: input.repository || 'Unknown repository',
      branch: input.branch || 'Unknown branch',
      total_commits: input.total_commits || 0,
      commits_analyzed: input.commits_analyzed || 0,
      analyzed_commits: input.analyzed_commits || []
    };
    
    const parsedUrl = new URL(safeInput.output_url);

    // Generate markdown report
    const markdown = generateMarkdownReport(safeInput);

    if (parsedUrl.protocol === 'file:') {
      let filePath = parsedUrl.pathname || 'Review.md';
      
      // Ensure filePath is not a directory
      if (filePath === '/') {
        filePath = 'Review.md';
      }
      
      if (!path.isAbsolute(filePath)) {
        filePath = path.join(process.cwd(), filePath);
      }

      // Ensure the directory exists
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Write to file
      try {
        fs.writeFileSync(filePath, markdown);
        logger.info('Generated markdown report', { filePath });
      } catch (writeError) {
        logger.error('Error writing file', { 
          error: writeError instanceof Error ? writeError.message : String(writeError),
          filePath 
        });
        // Don't rethrow, continue with emitting the event
      }
    }
    else {
      logger.error(`Protocol ${parsedUrl.protocol} not supported for output URL yet`);
    }
    
    // Emit completion event
    await emit({
      topic: 'code-review.report.generated',
      data: {
        output_url: safeInput.output_url,
        content: markdown
      }
    });
  } catch (error) {
    logger.error('Error generating markdown report', { error: error instanceof Error ? error.message : String(error) });
    
    // Generate a basic error report even when things go wrong
    try {
      const timestamp = new Date().toISOString();
      const errorMarkdown = `# Code Review Error Report - ${timestamp}\n\n` +
                           `An error occurred while generating the code review report: ${error instanceof Error ? error.message : String(error)}\n\n` +
                           `Please check the system logs for more information.`;
      
      // Write to a default location
      const errorFilePath = path.join(process.cwd(), 'ERROR-Review.md');
      fs.writeFileSync(errorFilePath, errorMarkdown);
      
      logger.info('Generated error report', { filePath: errorFilePath });
      
      // Emit completion with error information
      await emit({
        topic: 'code-review.report.generated',
        data: {
          output_url: 'file://ERROR-Review.md',
          content: errorMarkdown
        }
      });
    } catch (writeError) {
      logger.error('Critical error while writing error report', { 
        originalError: error instanceof Error ? error.message : String(error),
        writeError: writeError instanceof Error ? writeError.message : String(writeError)
      });
    }
  }
};

/**
 * Generate a markdown report from the review results
 */
function generateMarkdownReport(input: MarkdownReportInput, isMock: boolean = false): string {
  const { selected_node_id, state: reasoning_state, reasoning, stats, all_nodes } = input;

  const timestamp = new Date().toISOString();
  let markdown = `# Code Review Analysis - ${timestamp}\n\n`;

  // Add warning if mock data was used
  if (isMock) {
    markdown += `## ⚠️ Warning\n\nThis report was generated with mock data.\n\n`;
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
    if (input.total_commits) markdown += `- Total Commits: ${input.total_commits || 'Unknown'}\n`;
    if (input.commits_analyzed) markdown += `- Commits Analyzed: ${input.commits_analyzed}\n`;
    markdown += `\n`;
  }

  // Add analyzed commits if available
  if (input.analyzed_commits && input.analyzed_commits.length > 0) {
    markdown += `## Analyzed Commits\n`;
    input.analyzed_commits.forEach(commit => {
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
  markdown += `- Total visits in analysis: ${stats?.total_visits || 'N/A'}\n`;
  markdown += `- Child paths analyzed: ${stats?.children_count || 'N/A'}\n\n`;

  // Add selected reasoning path
  markdown += `## Selected Reasoning Path\n\n\`\`\`\n${reasoning_state || 'No reasoning path available'}\n\`\`\`\n\n`;

  // Add MCTS tree visualization if there's node data
  if (!isMock && all_nodes && Object.keys(all_nodes).length > 0) {
    markdown += generateTreeVisualization(selected_node_id, all_nodes);
  } else {
    markdown += `## MCTS Tree Visualization\n\nNo tree data available for visualization.\n\n`;
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
  
  // Check for empty or undefined inputs
  if (!selectedNodeId || !allNodes || Object.keys(allNodes).length === 0) {
    return visualization + "No tree data available for visualization.\n\n";
  }
  
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

    // Add node definition - handle potential missing fields
    const nodeVisits = node.visits !== undefined ? node.visits : 0;
    const nodeValue = node.value !== undefined ? node.value.toFixed(2) : "0.00";
    const nodeLabel = `${nodeId}[${isSelected ? '💡 ' : ''}Node ${nodeId.substring(0, 4)}... v:${nodeVisits}, val:${nodeValue}]`;
    visualization += `    ${nodeLabel}\n`;

    // Process parent relationship
    if (node.parent && allNodes[node.parent]) {
      visualization += `    ${node.parent} --> ${nodeId}\n`;
      // Add parent to nodes to process
      nodesToProcess.push(node.parent);
    }

    // Process children
    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      for (const childId of node.children) {
        if (childId && allNodes[childId]) {
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