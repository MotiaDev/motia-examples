import { z } from 'zod';
import { EventConfig, StepHandler } from 'motia';
import * as fs from 'fs';
import * as path from 'path';

// Define schema for report output
const reportOutputSchema = z.object({
  output_url: z.string(),
  content: z.string()
});

// Define schema for report input
const markdownReportInputSchema = z.object({
  selected_node_id: z.string(),
  state: z.string(),
  reasoning: z.string(),
  stats: z.object({
    visits: z.number(),
    value: z.number(),
    total_visits: z.number(),
    children_count: z.number()
  }),
  all_nodes: z.record(z.string(), z.any()),
  output_url: z.string().optional().default('file://Review.md'),

  // Additional fields for enhanced reporting
  requirements: z.string().optional(),
  repository: z.string().optional(),
  branch: z.string().optional(),
  total_commits: z.number().optional(),
  commits_analyzed: z.number().optional(),
  analyzed_commits: z.array(z.string()).optional()
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
    const parsedUrl = new URL(input.output_url || 'file://Review.md');

    // Generate markdown report
    const markdown = generateMarkdownReport(input);

    if (parsedUrl.protocol === 'file:') {
      let filePath = parsedUrl.pathname || 'Review.md';
      if (!path.isAbsolute(filePath)) {
        filePath = path.join(process.cwd(), filePath);
      }

      // Ensure the directory exists
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Write to file
      fs.writeFileSync(filePath, markdown);

      logger.info('Generated markdown report', { filePath });
    }
    else {
      logger.error(`Protocol ${parsedUrl.protocol} not supported for output URL yet`);
    }
    // Emit completion event
    await emit({
      topic: 'code-review.report.generated',
      data: {
        output_url: input.output_url || 'file://Review.md',
        content: markdown
      }
    });
  } catch (error) {
    logger.error('Error generating markdown report', { error });
    throw error;
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
    if (input.commits_analyzed) markdown += `- Total Commits: ${input.total_commits || 'Unknown'}\n`;
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

  // Add MCTS tree visualization
  if (!isMock) {
    markdown += generateTreeVisualization(selected_node_id, all_nodes);
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