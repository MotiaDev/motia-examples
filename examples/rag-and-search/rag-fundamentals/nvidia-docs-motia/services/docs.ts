import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import Mustache from 'mustache';
import { markdownTable } from 'markdown-table';
import { nim } from './nim';
import { getErrorMessage } from './utils';

export const analysisSchema = z.object({
  repo_url: z.string().url(),
  timestamp: z.string(),
  summary: z.string(),
  statistics: z.object({
    total_files: z.number(),
    total_size_kb: z.number(),
    language_breakdown: z.record(z.number()),
    primary_language: z.string()
  }),
  files: z.array(z.object({
    path: z.string(),
    language: z.string(),
    size: z.number()
  })),
  repository_structure: z.object({
    has_readme: z.boolean(),
    has_license: z.boolean(),
    has_tests: z.boolean(),
    has_docs: z.boolean(),
    has_package_json: z.boolean(),
    has_dockerfile: z.boolean()
  })
});

export type RepositoryAnalysis = z.infer<typeof analysisSchema>;

export interface GeneratedDocs {
  overview: string;
  architecture: string;
  getting_started: string;
  api_reference: string;
  file_structure: string;
  metadata: {
    generated_at: string;
    source_repo: string;
    total_sections: number;
  };
}

export interface DocumentationPayload {
  repo_url: string;
  documentation: {
    complete_markdown: string;
    sections: GeneratedDocs;
    file_path: string;
    filename: string;
  };
  source_analysis: RepositoryAnalysis;
  generated_at: string;
}

function generateLanguageBreakdownTable(languageBreakdown: Record<string, number>): string {
  const sortedLanguages = Object.entries(languageBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  const totalFiles = Object.values(languageBreakdown).reduce((sum, count) => sum + count, 0);
  const tableData = [
    ['Language', 'Files', 'Percentage'],
    ...sortedLanguages.map(([language, count]) => [
      language,
      count.toString(),
      `${((count / totalFiles) * 100).toFixed(1)}%`
    ])
  ];
  return markdownTable(tableData);
}

function generateFileStructureTree(files: Array<{ path: string; language: string; size: number }>): string {
  // Placeholder tree output; rendering is out-of-scope here
  return '``````';
}

function getTopLanguagesString(languageBreakdown: Record<string, number>): string {
  return Object.entries(languageBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([lang, count]) => `${lang}: ${count} files`)
    .join(', ');
}

async function generateOverview(analysis: RepositoryAnalysis): Promise<string> {
  try {
    const template = await fs.promises.readFile('prompts/write_docs/overview.mustache', 'utf-8');
    const templateData = {
      repoUrl: analysis.repo_url,
      summary: analysis.summary,
      primaryLanguage: analysis.statistics.primary_language,
      totalFiles: analysis.statistics.total_files,
      totalSizeKb: analysis.statistics.total_size_kb,
      hasReadme: analysis.repository_structure.has_readme,
      hasTests: analysis.repository_structure.has_tests,
      hasDocs: analysis.repository_structure.has_docs,
      hasPackageJson: analysis.repository_structure.has_package_json,
      hasDockerfile: analysis.repository_structure.has_dockerfile
    };
    const prompt = Mustache.render(template, templateData);
    return await nim.chat(prompt, 'meta/llama-3.1-8b-instruct');
  } catch (error) {
    console.warn('Failed to generate overview, using fallback:', getErrorMessage(error));
    return `# ${analysis.repo_url.split('/').pop()} Overview\n\n${analysis.summary}`;
  }
}

async function generateArchitecture(analysis: RepositoryAnalysis): Promise<string> {
  const relevantCodeFiles = analysis.files
    .filter((f) => !f.path.includes('node_modules') && !f.path.includes('.git'))
    .slice(0, 20)
    .map((f) => `${f.path} (${f.language})`);
  try {
    const template = await fs.promises.readFile('prompts/write_docs/architecture.mustache', 'utf-8');
    const templateData = {
      repoUrl: analysis.repo_url,
      primaryLanguage: analysis.statistics.primary_language,
      topFiles: relevantCodeFiles,
      languageDistribution: getTopLanguagesString(analysis.statistics.language_breakdown)
    };
    const prompt = Mustache.render(template, templateData);
    return await nim.chat(prompt, 'meta/llama-3.1-8b-instruct');
  } catch (error) {
    console.warn('Failed to generate architecture, using fallback:', getErrorMessage(error));
    return `## Architecture\n\nThis is a ${analysis.statistics.primary_language} project with ${analysis.statistics.total_files} files.`;
  }
}

async function generateGettingStarted(analysis: RepositoryAnalysis): Promise<string> {
  const hasPackageJson = analysis.repository_structure.has_package_json;
  const hasRequirements = analysis.files.some((f) => f.path.includes('requirements.txt'));
  try {
    const template = await fs.promises.readFile('prompts/write_docs/getting_started.mustache', 'utf-8');
    const templateData = {
      repoUrl: analysis.repo_url,
      primaryLanguage: analysis.statistics.primary_language,
      hasPackageJson,
      hasRequirements,
      hasTests: analysis.repository_structure.has_tests
    };
    const prompt = Mustache.render(template, templateData);
    return await nim.chat(prompt, 'meta/llama-3.1-8b-instruct');
  } catch (error) {
    console.warn('Failed to generate getting started, using fallback:', getErrorMessage(error));
    return `## Getting Started\n\n1. Clone the repository\n2. Install dependencies\n3. Run the application`;
  }
}

async function generateApiReference(analysis: RepositoryAnalysis): Promise<string> {
  const codeFiles = analysis.files
    .filter((f) => ['python', 'typescript', 'javascript', 'java', 'go'].includes(f.language))
    .slice(0, 15)
    .map((f) => f.path);
  try {
    const template = await fs.promises.readFile('prompts/write_docs/api_reference.mustache', 'utf-8');
    const templateData = {
      repoUrl: analysis.repo_url,
      primaryLanguage: analysis.statistics.primary_language,
      codeFiles
    };
    const prompt = Mustache.render(template, templateData);
    return await nim.chat(prompt, 'meta/llama-3.1-8b-instruct');
  } catch (error) {
    console.warn('Failed to generate API reference, using fallback:', getErrorMessage(error));
    return `## API Reference\n\nAPI documentation for ${analysis.statistics.primary_language} modules.`;
  }
}

async function generateCompleteDocumentation(
  analysis: RepositoryAnalysis,
  generatedDocs: GeneratedDocs,
  languageTable: string,
  fileStructure: string
): Promise<string> {
  try {
    const template = await fs.promises.readFile('prompts/write_docs/complete_documentation.mustache', 'utf-8');
    const templateData = {
      repoName: analysis.repo_url.split('/').pop(),
      currentDate: new Date().toLocaleDateString(),
      overview: generatedDocs.overview,
      languageTable,
      architecture: generatedDocs.architecture,
      gettingStarted: generatedDocs.getting_started,
      apiReference: generatedDocs.api_reference,
      fileStructure,
      lastUpdated: new Date().toISOString()
    };
    return Mustache.render(template, templateData);
  } catch (error) {
    console.warn('Failed to generate complete documentation template, using fallback:', getErrorMessage(error));
    return `# ${analysis.repo_url.split('/').pop()} Documentation\n\n${generatedDocs.overview}\n\n## Language Breakdown\n${languageTable}\n\n${generatedDocs.architecture}\n\n${generatedDocs.getting_started}\n\n${generatedDocs.api_reference}\n\n## File Structure\n${fileStructure}\n\n---\n*Generated on: ${new Date().toISOString()}*\n`;
  }
}

export async function generateDocumentation(analysis: RepositoryAnalysis, logger: { info: Function }): Promise<DocumentationPayload> {
  logger.info(`Generating documentation for: ${analysis.repo_url}`);
  const [overview, architecture, gettingStarted, apiReference] = await Promise.all([
    generateOverview(analysis),
    generateArchitecture(analysis),
    generateGettingStarted(analysis),
    generateApiReference(analysis)
  ]);
  const languageTable = generateLanguageBreakdownTable(analysis.statistics.language_breakdown);
  const fileStructure = generateFileStructureTree(analysis.files);
  const generatedDocs: GeneratedDocs = {
    overview,
    architecture,
    getting_started: gettingStarted,
    api_reference: apiReference,
    file_structure: fileStructure,
    metadata: {
      generated_at: new Date().toISOString(),
      source_repo: analysis.repo_url,
      total_sections: 5
    }
  };
  const completeDocumentation = await generateCompleteDocumentation(
    analysis,
    generatedDocs,
    languageTable,
    fileStructure
  );
  const assetsDir = path.join(process.cwd(), 'assets', 'docs');
  await fs.promises.mkdir(assetsDir, { recursive: true });
  const docFilename = `${analysis.repo_url.split('/').pop()}_documentation.md`;
  const docPath = path.join(assetsDir, docFilename);
  await fs.promises.writeFile(docPath, completeDocumentation);
  logger.info(`Documentation saved to: ${docPath}`);
  return {
    repo_url: analysis.repo_url,
    documentation: {
      complete_markdown: completeDocumentation,
      sections: generatedDocs,
      file_path: docPath,
      filename: docFilename
    },
    source_analysis: analysis,
    generated_at: new Date().toISOString()
  };
}
