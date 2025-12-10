import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import Mustache from 'mustache';
import { nim } from './nim';
import { getErrorMessage } from './utils';

export const reviewInputSchema = z.object({
  repo_url: z.string().url(),
  documentation: z.object({
    complete_markdown: z.string(),
    sections: z.object({
      overview: z.string(),
      architecture: z.string(),
      getting_started: z.string(),
      api_reference: z.string(),
      file_structure: z.string(),
      metadata: z.object({
        generated_at: z.string(),
        source_repo: z.string(),
        total_sections: z.number()
      })
    }),
    file_path: z.string(),
    filename: z.string()
  }),
  source_analysis: z.object({
    repo_url: z.string(),
    statistics: z.object({
      primary_language: z.string(),
      total_files: z.number(),
      language_breakdown: z.record(z.number())
    }).optional(),
    repository_structure: z.object({
      has_tests: z.boolean(),
      has_package_json: z.boolean(),
      has_dockerfile: z.boolean(),
      has_docs: z.boolean()
    }).optional()
  }),
  generated_at: z.string()
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;

export interface QualityMetrics {
  completeness_score: number;
  clarity_score: number;
  accuracy_score: number;
  issues_found: string[];
  improvements_made: string[];
}

export interface EnhancedSections {
  overview: string;
  architecture: string;
  getting_started: string;
  api_reference: string;
  file_structure: string;
}

export interface ReviewedPayload {
  repo_url: string;
  documentation: {
    original: ReviewInput['documentation'];
    enhanced: {
      complete_markdown: string;
      sections: EnhancedSections;
      executive_summary: string;
      file_path: string;
      filename: string;
    };
  };
  quality_metrics: QualityMetrics;
  review_timestamp: string;
  improvements_applied: boolean;
  source_analysis: ReviewInput['source_analysis'];
}

async function analyzeDocumentationQuality(documentation: string, repoUrl: string): Promise<QualityMetrics> {
  try {
    const template = await fs.promises.readFile('prompts/qa_review/quality_analysis.mustache', 'utf-8');
    const templateData = { repoUrl, documentationPreview: documentation.substring(0, 2000) };
    const prompt = Mustache.render(template, templateData);
    const response = await nim.chat(prompt, 'meta/llama-3.1-8b-instruct');
    return JSON.parse(response);
  } catch (error) {
    console.warn('Failed to parse QA metrics, using defaults:', getErrorMessage(error));
    return {
      completeness_score: 70,
      clarity_score: 75,
      accuracy_score: 70,
      issues_found: ['Unable to analyze quality automatically'],
      improvements_made: ['Manual review recommended']
    };
  }
}

async function enhanceSection(sectionName: keyof EnhancedSections, originalContent: string, input: ReviewInput): Promise<string> {
  const MIN_SECTION_LENGTH = 300;
  if (originalContent.length >= MIN_SECTION_LENGTH) return originalContent;
  const templates: Record<string, string> = {
    overview: 'prompts/qa_review/overview_enhancement.mustache',
    architecture: 'prompts/qa_review/architecture_enhancement.mustache',
    getting_started: 'prompts/qa_review/getting_started_enhancement.mustache',
    api_reference: 'prompts/qa_review/api_reference_enhancement.mustache'
  };
  const templateFile = templates[sectionName];
  if (!templateFile) return originalContent;
  const templateData = {
    repoUrl: input.repo_url,
    primaryLanguage: input.source_analysis.statistics?.primary_language || 'unknown',
    totalFiles: input.source_analysis.statistics?.total_files || 0,
    hasTests: input.source_analysis.repository_structure?.has_tests || false,
    hasPackageJson: input.source_analysis.repository_structure?.has_package_json || false,
    originalContent
  };
  try {
    const template = await fs.promises.readFile(templateFile, 'utf-8');
    const prompt = Mustache.render(template, templateData);
    const enhancedContent = await nim.chat(prompt, 'meta/llama-3.1-8b-instruct');
    return enhancedContent.trim();
  } catch (error) {
    console.warn(`Failed to enhance ${sectionName}, keeping original:`, getErrorMessage(error));
    return originalContent;
  }
}

async function generateExecutiveSummary(documentation: string, repoUrl: string): Promise<string> {
  try {
    const template = await fs.promises.readFile('prompts/qa_review/executive_summary.mustache', 'utf-8');
    const templateData = { repoUrl, documentationPreview: documentation.substring(0, 1500) };
    const prompt = Mustache.render(template, templateData);
    return await nim.chat(prompt, 'meta/llama-3.1-8b-instruct');
  } catch (error) {
    console.warn('Failed to generate executive summary, using fallback:', getErrorMessage(error));
    return `This repository provides a comprehensive solution for ${repoUrl.split('/').pop()}.`;
  }
}

export async function reviewDocumentation(input: ReviewInput, logger: { info: Function }): Promise<ReviewedPayload> {
  logger.info('Analyzing documentation quality...');
  const qualityMetrics = await analyzeDocumentationQuality(input.documentation.complete_markdown, input.repo_url);
  const enhancedSections: EnhancedSections = {
    overview: await enhanceSection('overview', input.documentation.sections.overview, input),
    architecture: await enhanceSection('architecture', input.documentation.sections.architecture, input),
    getting_started: await enhanceSection('getting_started', input.documentation.sections.getting_started, input),
    api_reference: await enhanceSection('api_reference', input.documentation.sections.api_reference, input),
    file_structure: input.documentation.sections.file_structure
  };
  const executiveSummary = await generateExecutiveSummary(input.documentation.complete_markdown, input.repo_url);
  const repoName = input.repo_url.split('/').pop();
  const enhancedDocTemplate = await fs.promises.readFile('prompts/qa_review/enhanced_documentation.mustache', 'utf-8');
  const enhancedDocData = {
    repoName,
    executiveSummary,
    currentDate: new Date().toLocaleDateString(),
    completenessScore: qualityMetrics.completeness_score,
    clarityScore: qualityMetrics.clarity_score,
    accuracyScore: qualityMetrics.accuracy_score,
    enhancedOverview: enhancedSections.overview,
    languageBreakdown: input.documentation.complete_markdown.split('## Language Breakdown')[1]?.split('## Architecture & Design')[0] || 'Language data not available',
    enhancedArchitecture: enhancedSections.architecture,
    enhancedGettingStarted: enhancedSections.getting_started,
    enhancedApiReference: enhancedSections.api_reference,
    fileStructure: enhancedSections.file_structure,
    issuesFound: qualityMetrics.issues_found,
    improvementsMade: qualityMetrics.improvements_made,
    reviewTimestamp: new Date().toISOString(),
    overallScore: Math.round((qualityMetrics.completeness_score + qualityMetrics.clarity_score + qualityMetrics.accuracy_score) / 3)
  };
  const enhancedDocumentation = Mustache.render(enhancedDocTemplate, enhancedDocData);
  const assetsDir = path.join(process.cwd(), 'assets', 'docs');
  const reviewedFilename = `${repoName}_documentation_reviewed.md`;
  const reviewedPath = path.join(assetsDir, reviewedFilename);
  await fs.promises.mkdir(assetsDir, { recursive: true });
  await fs.promises.writeFile(reviewedPath, enhancedDocumentation);
  logger.info(`Enhanced documentation saved to: ${reviewedPath}`);
  return {
    repo_url: input.repo_url,
    documentation: {
      original: input.documentation,
      enhanced: {
        complete_markdown: enhancedDocumentation,
        sections: enhancedSections,
        executive_summary: executiveSummary,
        file_path: reviewedPath,
        filename: reviewedFilename
      }
    },
    quality_metrics: qualityMetrics,
    review_timestamp: new Date().toISOString(),
    improvements_applied: true,
    source_analysis: input.source_analysis
  };
}
