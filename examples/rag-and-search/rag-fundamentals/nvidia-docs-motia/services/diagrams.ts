import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import Mustache from 'mustache';
import { nim } from './nim';
import { getErrorMessage } from './utils';

export const diagramInputSchema = z.object({
  repo_url: z.string().url(),
  documentation: z.object({
    original: z.any(),
    enhanced: z.object({
      complete_markdown: z.string(),
      sections: z.any(),
      executive_summary: z.string(),
      file_path: z.string(),
      filename: z.string()
    })
  }),
  quality_metrics: z.any(),
  review_timestamp: z.string(),
  improvements_applied: z.boolean(),
  source_analysis: z.object({
    repo_url: z.string(),
    statistics: z.object({
      primary_language: z.string(),
      total_files: z.number(),
      language_breakdown: z.record(z.number())
    }).optional(),
    files: z.array(z.object({
      path: z.string(),
      language: z.string(),
      size: z.number()
    })).optional(),
    repository_structure: z.object({
      has_tests: z.boolean(),
      has_package_json: z.boolean(),
      has_dockerfile: z.boolean(),
      has_docs: z.boolean()
    }).optional()
  })
});

export type DiagramInput = z.infer<typeof diagramInputSchema>;

export interface DiagramData {
  type: string;
  title: string;
  content: string;
  filename: string;
  description: string;
}

export interface DiagramPayload {
  repo_url: string;
  diagrams: Array<{
    type: string;
    title: string;
    filename: string;
    description: string;
    mermaid_code: string;
  }>;
  files_saved: string[];
  diagrams_index: {
    content: string;
    path: string;
  };
  generated_at: string;
  source_documentation: DiagramInput['documentation']['enhanced'];
  source_analysis: DiagramInput['source_analysis'];
}

// Shape expected by the 'diagrams.generated' event per types.d.ts
export type EmittedDiagramsData = {
  repo_url: string;
  diagrams?: unknown[];
  source_documentation?: unknown;
  source_analysis: {
    statistics: { primary_language: string; language_breakdown: unknown };
    files: { path: string; language: string; size: number }[];
    repository_structure?: { has_package_json: boolean; has_tests: boolean; has_docs: boolean };
  };
  generated_at: string;
};

// Convert internal DiagramPayload to the stricter emitted shape
export function toEmittedDiagramsData(payload: DiagramPayload): EmittedDiagramsData {
  return {
    repo_url: payload.repo_url,
    diagrams: (payload.diagrams as unknown[]),
    source_documentation: (payload.source_documentation as unknown),
    source_analysis: {
      statistics: {
        primary_language: payload.source_analysis.statistics?.primary_language ?? 'unknown',
        language_breakdown: payload.source_analysis.statistics?.language_breakdown ?? {}
      },
      files: payload.source_analysis.files ?? [],
      repository_structure: payload.source_analysis.repository_structure
        ? {
            has_package_json: !!payload.source_analysis.repository_structure.has_package_json,
            has_tests: !!payload.source_analysis.repository_structure.has_tests,
            has_docs: !!payload.source_analysis.repository_structure.has_docs
          }
        : undefined
    },
    generated_at: payload.generated_at
  };
}

async function generateArchitectureDiagram(analysis: DiagramInput['source_analysis'], repoUrl: string): Promise<string> {
  const template = await fs.promises.readFile('prompts/render_mermaid/architecture_diagram.mustache', 'utf-8');
  const templateData = {
    repoUrl,
    primaryLanguage: analysis.statistics?.primary_language || 'unknown',
    fileTypes: Object.keys(analysis.statistics?.language_breakdown || {}).join(', '),
    hasTests: analysis.repository_structure?.has_tests || false,
    hasPackageJson: analysis.repository_structure?.has_package_json || false,
    hasDockerfile: analysis.repository_structure?.has_dockerfile || false
  };
  const prompt = Mustache.render(template, templateData);
  const response = await nim.chat(prompt, 'meta/llama-3.1-8b-instruct');
  return response.trim();
}

async function generateWorkflowDiagram(analysis: DiagramInput['source_analysis'], repoUrl: string): Promise<string> {
  const template = await fs.promises.readFile('prompts/render_mermaid/workflow_diagram.mustache', 'utf-8');
  const templateData = {
    repoUrl,
    primaryLanguage: analysis.statistics?.primary_language,
    hasTests: analysis.repository_structure?.has_tests,
    hasPackageJson: analysis.repository_structure?.has_package_json
  };
  const prompt = Mustache.render(template, templateData);
  const response = await nim.chat(prompt, 'meta/llama-3.1-8b-instruct');
  return response.trim();
}

async function generateComponentDiagram(analysis: DiagramInput['source_analysis'], repoUrl: string): Promise<string> {
  const files = analysis.files || [];
  const topFiles = files
    .filter((f) => !f.path.includes('node_modules') && !f.path.includes('.git'))
    .slice(0, 10)
    .map((f) => f.path);
  const template = await fs.promises.readFile('prompts/render_mermaid/component_diagram.mustache', 'utf-8');
  const templateData = {
    repoUrl,
    keyFiles: topFiles.join(', '),
    languageBreakdown: JSON.stringify(analysis.statistics?.language_breakdown)
  };
  const prompt = Mustache.render(template, templateData);
  const response = await nim.chat(prompt, 'meta/llama-3.1-8b-instruct');
  return response.trim();
}

async function generateDataFlowDiagram(analysis: DiagramInput['source_analysis'], repoUrl: string): Promise<string> {
  const template = await fs.promises.readFile('prompts/render_mermaid/dataflow_diagram.mustache', 'utf-8');
  const templateData = {
    repoUrl,
    primaryLanguage: analysis.statistics?.primary_language,
    totalFiles: analysis.statistics?.total_files
  };
  const prompt = Mustache.render(template, templateData);
  const response = await nim.chat(prompt, 'meta/llama-3.1-8b-instruct');
  return response.trim();
}

function generateDirectoryStructureDiagram(analysis: DiagramInput['source_analysis']): string {
  const files = analysis.files || [];
  const directories = new Set<string>();
  files.forEach((file) => {
    const dir = path.dirname(file.path);
    if (dir !== '.') directories.add(dir);
  });
  let diagram = `graph TD\n  Root[📁 ${analysis.repo_url.split('/').pop()}]\n`;
  const dirArray = Array.from(directories).slice(0, 15);
  dirArray.forEach((dir, index) => {
    const nodeId = `Dir${index}`;
    const dirName = dir.split('/').pop() || dir;
    diagram += `  Root --> ${nodeId}[📁 ${dirName}]\n`;
  });
  const representativeFiles = files.filter((f) => f.path !== '.' && !f.path.includes('/')).slice(0, 5);
  representativeFiles.forEach((file, index: number) => {
    const fileId = `File${index}`;
    const fileName = path.basename(file.path);
    diagram += `  Root --> ${fileId}[📄 ${fileName}]\n`;
  });
  return diagram;
}

async function generateAllDiagrams(payload: DiagramInput): Promise<DiagramData[]> {
  const analysis = payload.source_analysis;
  const repoName = payload.repo_url.split('/').pop() || 'repository';
  const diagrams: DiagramData[] = [];
  const architectureDiagram = await generateArchitectureDiagram(analysis, payload.repo_url);
  diagrams.push({ type: 'architecture', title: `${repoName} Architecture`, content: architectureDiagram, filename: `${repoName}_architecture.mmd`, description: 'High-level system architecture showing main components and their relationships' });
  const workflowDiagram = await generateWorkflowDiagram(analysis, payload.repo_url);
  diagrams.push({ type: 'workflow', title: `${repoName} Workflow`, content: workflowDiagram, filename: `${repoName}_workflow.mmd`, description: 'Development and usage workflow for the repository' });
  const componentDiagram = await generateComponentDiagram(analysis, payload.repo_url);
  diagrams.push({ type: 'component', title: `${repoName} Components`, content: componentDiagram, filename: `${repoName}_components.mmd`, description: 'Component relationships and module dependencies' });
  const dataFlowDiagram = await generateDataFlowDiagram(analysis, payload.repo_url);
  diagrams.push({ type: 'dataflow', title: `${repoName} Data Flow`, content: dataFlowDiagram, filename: `${repoName}_dataflow.mmd`, description: 'Data processing and transformation flow' });
  const directoryDiagram = generateDirectoryStructureDiagram(analysis);
  diagrams.push({ type: 'directory', title: `${repoName} Directory Structure`, content: directoryDiagram, filename: `${repoName}_directory.mmd`, description: 'Visual representation of the repository folder structure' });
  return diagrams;
}

async function saveDiagramsToFiles(diagrams: DiagramData[]): Promise<string[]> {
  const diagramsDir = path.join(process.cwd(), 'assets', 'diagrams');
  await fs.promises.mkdir(diagramsDir, { recursive: true });
  const savedFiles: string[] = [];
  for (const diagram of diagrams) {
    try {
      const filePath = path.join(diagramsDir, diagram.filename);
      const fileContent = `%% ${diagram.title}\n%% ${diagram.description}\n%% Generated on: ${new Date().toISOString()}\n\n${diagram.content}`;
      await fs.promises.writeFile(filePath, fileContent);
      savedFiles.push(filePath);
    } catch (error) {
      console.warn(`Failed to save diagram ${diagram.filename}:`, getErrorMessage(error));
    }
  }
  return savedFiles;
}

async function generateDiagramsIndexMarkdown(diagrams: DiagramData[], repoUrl: string): Promise<string> {
  try {
    const template = await fs.promises.readFile('prompts/render_mermaid/diagrams_index.mustache', 'utf-8');
    const repoName = repoUrl.split('/').pop();
    const templateData = {
      repoName,
      repoUrl,
      generatedAt: new Date().toISOString(),
      diagrams: diagrams.map((diagram, index) => ({
        index: index + 1,
        title: diagram.title,
        type: diagram.type,
        typeCapitalized: diagram.type.charAt(0).toUpperCase() + diagram.type.slice(1),
        description: diagram.description,
        filename: diagram.filename,
        content: diagram.content
      }))
    };
    return Mustache.render(template, templateData);
  } catch (error) {
    console.warn('Failed to generate diagrams index, using fallback:', getErrorMessage(error));
    return `# ${repoUrl.split('/').pop()} Diagrams\n\nGenerated on: ${new Date().toISOString()}\n\nThis directory contains Mermaid diagrams for the repository.\n\n${diagrams.map(d => `- **${d.title}** (${d.filename}): ${d.description}`).join('\n')}\n`;
  }
}

export async function generateDiagrams(input: DiagramInput, logger: { info: Function }): Promise<DiagramPayload> {
  logger.info('Generating multiple Mermaid diagrams using NVIDIA NIM...');
  const { repo_url, source_analysis, documentation } = input;
  if (!source_analysis) throw new Error('Invalid documentation payload: source_analysis is required for diagram generation');
  const diagrams = await generateAllDiagrams(input);
  const savedFiles = await saveDiagramsToFiles(diagrams);
  const diagramsIndex = await generateDiagramsIndexMarkdown(diagrams, repo_url);
  const indexPath = path.join(process.cwd(), 'assets', 'diagrams', 'README.md');
  await fs.promises.writeFile(indexPath, diagramsIndex);
  return {
    repo_url,
    diagrams: diagrams.map(d => ({ type: d.type, title: d.title, filename: d.filename, description: d.description, mermaid_code: d.content })),
    files_saved: savedFiles,
    diagrams_index: { content: diagramsIndex, path: indexPath },
    generated_at: new Date().toISOString(),
    source_documentation: documentation.enhanced,
    source_analysis
  };
}
