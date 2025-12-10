import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import Mustache from 'mustache';
import { nim } from './nim';
import { getErrorMessage } from './utils';

export const testsInputSchema = z.object({
  repo_url: z.string().url(),
  diagrams: z.array(z.any()).optional(),
  source_documentation: z.any().optional(),
  source_analysis: z.object({
    statistics: z.object({
      primary_language: z.string(),
      language_breakdown: z.record(z.number())
    }),
    files: z.array(z.object({
      path: z.string(),
      language: z.string(),
      size: z.number()
    })),
    repository_structure: z.object({
      has_package_json: z.boolean(),
      has_tests: z.boolean(),
      has_docs: z.boolean()
    }).optional()
  }),
  generated_at: z.string()
});

export type TestsInput = z.infer<typeof testsInputSchema>;

export interface TestSuite {
  type: 'unit' | 'integration' | 'e2e';
  language: string;
  framework: string;
  filename: string;
  content: string;
  description: string;
  test_count: number;
}

export interface GeneratedTestsPayload {
  repo_url: string;
  test_suites: TestSuite[];
  summary: {
    total_test_files: number;
    total_test_cases: number;
    languages_covered: string[];
    frameworks_used: string[];
  };
  files_created: string[];
  generated_at: string;
}

function detectTestingFrameworks(analysis: TestsInput['source_analysis']): { [language: string]: string } {
  const frameworks: { [language: string]: string } = {};
  const hasPackageJson = analysis.repository_structure?.has_package_json;
  const primaryLang = analysis.statistics?.primary_language;

  if (primaryLang === 'python' || analysis.statistics?.language_breakdown?.python > 0) {
    frameworks.python = 'pytest';
  }
  if (primaryLang === 'typescript' || primaryLang === 'javascript' || hasPackageJson) {
    frameworks.typescript = 'jest';
    frameworks.javascript = 'jest';
  }
  if ((analysis.statistics?.language_breakdown as any)?.java > 0) {
    frameworks.java = 'junit';
  }
  if ((analysis.statistics?.language_breakdown as any)?.go > 0) {
    frameworks.go = 'testing';
  }
  return frameworks;
}

async function generateUnitTests(analysis: TestsInput['source_analysis'], repoUrl: string, language: string, framework: string): Promise<TestSuite> {
  const files = (analysis.files || [])
    .filter((f) => f.language === language)
    .slice(0, 10)
    .map((f) => f.path);
  const template = await fs.promises.readFile('prompts/generate_tests/unit_tests.mustache', 'utf-8');
  const templateData = { language, framework, repoUrl, keyFiles: files.join(', '), primaryLanguage: analysis.statistics?.primary_language };
  const prompt = Mustache.render(template, templateData);
  const testContent = await nim.chat(prompt, 'meta/llama-3.1-8b-instruct');
  return { type: 'unit', language, framework, filename: `unit-tests.${getFileExtension(language)}`, content: testContent.trim(), description: `Comprehensive unit tests for ${language} code`, test_count: countTestCases(testContent) };
}

async function generateIntegrationTests(analysis: TestsInput['source_analysis'], repoUrl: string, language: string, framework: string): Promise<TestSuite> {
  const hasApi = analysis.files?.some((f) => f.path.includes('api') || f.path.includes('server') || f.path.includes('controller'));
  const hasDatabase = analysis.files?.some((f) => f.path.includes('db') || f.path.includes('database') || f.path.includes('model'));
  const hasConfig = analysis.files?.some((f) => f.path.includes('config') || f.path.includes('settings'));
  const template = await fs.promises.readFile('prompts/generate_tests/integration_tests.mustache', 'utf-8');
  const templateData = { language, framework, repoUrl, hasApi, hasDatabase, hasConfig };
  const prompt = Mustache.render(template, templateData);
  const testContent = await nim.chat(prompt, 'meta/llama-3.1-8b-instruct');
  return { type: 'integration', language, framework, filename: `integration-tests.${getFileExtension(language)}`, content: testContent.trim(), description: 'Integration tests for module interactions and external services', test_count: countTestCases(testContent) };
}

async function generateE2ETests(analysis: TestsInput['source_analysis'], repoUrl: string): Promise<TestSuite> {
  const hasWeb = analysis.files?.some((f) => f.path.includes('.html') || f.path.includes('frontend') || f.path.includes('web'));
  const hasServer = analysis.files?.some((f) => f.path.includes('server') || f.path.includes('app') || f.path.includes('main'));
  const template = await fs.promises.readFile('prompts/generate_tests/e2e_tests.mustache', 'utf-8');
  const templateData = { repoUrl, hasWeb, hasServer, primaryLanguage: analysis.statistics?.primary_language };
  const prompt = Mustache.render(template, templateData);
  const testContent = await nim.chat(prompt, 'meta/llama-3.1-8b-instruct');
  return { type: 'e2e', language: 'typescript', framework: 'playwright', filename: 'e2e-tests.spec.ts', content: testContent.trim(), description: 'End-to-end tests for complete system workflows', test_count: countTestCases(testContent) };
}

function getFileExtension(language: string): string {
  const extensions: { [key: string]: string } = { python: 'py', typescript: 'ts', javascript: 'js', java: 'java', go: 'go' };
  return extensions[language] || 'test';
}

function countTestCases(testContent: string): number {
  const patterns = [/test\(/g, /it\(/g, /def test_/g, /@Test/g, /func Test/g];
  let totalCount = 0;
  patterns.forEach((pattern) => {
    const matches = testContent.match(pattern);
    if (matches) totalCount += matches.length;
  });
  return Math.max(totalCount, 1);
}

function saveTestSuites(testSuites: TestSuite[], repoUrl: string): string[] {
  const repoName = repoUrl.split('/').pop() || 'repository';
  const testsDir = path.join(process.cwd(), 'assets', 'generated_tests');
  const unitDir = path.join(testsDir, 'unit');
  const integrationDir = path.join(testsDir, 'integration');
  const e2eDir = path.join(testsDir, 'e2e');
  [testsDir, unitDir, integrationDir, e2eDir].forEach((dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });
  const savedFiles: string[] = [];
  testSuites.forEach((suite) => {
    const targetDir = suite.type === 'unit' ? unitDir : suite.type === 'integration' ? integrationDir : e2eDir;
    const fileName = `${repoName}_${suite.filename}`;
    const filePath = path.join(targetDir, fileName);
    const fileContent = `/**\n * ${suite.description}\n * Generated for: ${repoUrl}\n * Framework: ${suite.framework}\n * Language: ${suite.language}\n * Test Cases: ${suite.test_count}\n * Generated on: ${new Date().toISOString()}\n */\n\n${suite.content}`;
    fs.writeFileSync(filePath, fileContent);
    savedFiles.push(filePath);
  });
  return savedFiles;
}

async function generateTestsReadme(testSuites: TestSuite[], repoUrl: string): Promise<string> {
  const template = await fs.promises.readFile('prompts/generate_tests/readme.mustache', 'utf-8');
  const repoName = repoUrl.split('/').pop();
  const totalTests = testSuites.reduce((sum, suite) => sum + suite.test_count, 0);
  const languages = [...new Set(testSuites.map((s) => s.language))];
  const frameworks = [...new Set(testSuites.map((s) => s.framework))];
  const unitTests = testSuites.filter((s) => s.type === 'unit');
  const integrationTests = testSuites.filter((s) => s.type === 'integration');
  const e2eTests = testSuites.filter((s) => s.type === 'e2e');
  const templateData = {
    repoName,
    repoUrl,
    totalTests,
    totalTestSuites: testSuites.length,
    languagesList: languages.join(', '),
    frameworksList: frameworks.join(', '),
    generatedOn: new Date().toISOString(),
    hasUnitTests: unitTests.length > 0,
    unitTestsCount: unitTests.reduce((sum, s) => sum + s.test_count, 0),
    unitTests,
    hasIntegrationTests: integrationTests.length > 0,
    integrationTestsCount: integrationTests.reduce((sum, s) => sum + s.test_count, 0),
    integrationTests,
    hasE2eTests: e2eTests.length > 0,
    e2eTestsCount: e2eTests.reduce((sum, s) => sum + s.test_count, 0),
    e2eTests
  };
  return Mustache.render(template, templateData);
}

export async function generateTests(input: TestsInput, logger: { info: Function }): Promise<GeneratedTestsPayload> {
  const { repo_url, source_analysis } = input;
  if (!source_analysis) throw new Error('Invalid payload: source_analysis is required for test generation');
  logger.info(`Generating test cases for: ${repo_url}`);
  const frameworks = detectTestingFrameworks(source_analysis);
  logger.info(`Detected frameworks: ${JSON.stringify(frameworks)}`);
  const testSuites: TestSuite[] = [];
  for (const [language, framework] of Object.entries(frameworks)) {
    logger.info(`Generating unit tests for ${language}/${framework}...`);
    const unitTests = await generateUnitTests(source_analysis, repo_url, language, framework);
    testSuites.push(unitTests);
    logger.info(`Generating integration tests for ${language}/${framework}...`);
    const integrationTests = await generateIntegrationTests(source_analysis, repo_url, language, framework);
    testSuites.push(integrationTests);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  logger.info('Generating end-to-end tests...');
  const e2eTests = await generateE2ETests(source_analysis, repo_url);
  testSuites.push(e2eTests);
  logger.info('Saving generated test suites to files...');
  const savedFiles = saveTestSuites(testSuites, repo_url);
  const testsReadme = await generateTestsReadme(testSuites, repo_url);
  const readmePath = path.join(process.cwd(), 'assets', 'generated_tests', 'README.md');
  await fs.promises.mkdir(path.dirname(readmePath), { recursive: true });
  await fs.promises.writeFile(readmePath, testsReadme);
  const totalTestCases = testSuites.reduce((sum, suite) => sum + suite.test_count, 0);
  const languagesCovered = [...new Set(testSuites.map((s) => s.language))];
  const frameworksUsed = [...new Set(testSuites.map((s) => s.framework))];
  return {
    repo_url,
    test_suites: testSuites,
    summary: {
      total_test_files: testSuites.length,
      total_test_cases: totalTestCases,
      languages_covered: languagesCovered,
      frameworks_used: frameworksUsed
    },
    files_created: [...savedFiles, readmePath],
    generated_at: new Date().toISOString()
  };
}
