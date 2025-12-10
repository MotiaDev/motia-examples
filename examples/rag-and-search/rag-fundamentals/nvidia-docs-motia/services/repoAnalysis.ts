import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import Mustache from 'mustache';
import { nim } from './nim';
import { getErrorMessage } from './utils';

// Constants
const LARGE_FILE_THRESHOLD = 1024 * 1024; // 1MB

// File extension to language mapping
const EXT_TO_LANG: Record<string, string> = {
  '.py': 'python',
  '.ts': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.tsx': 'typescript',
  '.java': 'java',
  '.go': 'go',
  '.rb': 'ruby',
  '.cpp': 'cpp',
  '.c': 'c',
  '.rs': 'rust',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.php': 'php',
  '.cs': 'csharp',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.md': 'markdown',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.sql': 'sql'
};

// Directories to skip during analysis
const SKIP_DIRS = new Set<string>([
  '.git', '.github', 'node_modules', '__pycache__', '.pytest_cache',
  'venv', '.venv', 'env', '.env', 'dist', 'build', '.DS_Store',
  'coverage', '.nyc_output', '.next', '.nuxt', 'vendor'
]);

export interface FileData {
  path: string;
  language: string;
  size: number;
}

export interface RepositoryStats {
  total_files: number;
  total_size_kb: number;
  language_breakdown: Record<string, number>;
  primary_language: string;
}

export interface RepositoryStructure {
  has_readme: boolean;
  has_license: boolean;
  has_tests: boolean;
  has_docs: boolean;
  has_package_json: boolean;
  has_dockerfile: boolean;
}

export interface AnalysisPayload {
  repo_url: string;
  timestamp: string;
  summary: string;
  statistics: RepositoryStats;
  files: FileData[];
  repository_structure: RepositoryStructure;
}

export interface LoggerLike {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

function guessLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return EXT_TO_LANG[ext] || 'unknown';
}

function cloneRepository(repoUrl: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-analysis-'));
  try {
    execSync(`git clone --depth 1 "${repoUrl}" "${tempDir}"`, {
      stdio: 'pipe',
      timeout: 60000
    });
    return tempDir;
  } catch (error) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    const errorMessage = getErrorMessage(error);
    throw new Error(`Failed to clone repository: ${errorMessage}`);
  }
}

function analyzeDirectory(dirPath: string): { files: FileData[]; languageCounts: Record<string, number> } {
  const files: FileData[] = [];
  const languageCounts: Record<string, number> = {};

  function walkDirectory(currentPath: string): void {
    try {
      const items = fs.readdirSync(currentPath);
      for (const item of items) {
        if (item.startsWith('.') && !item.match(/\.(env|gitignore|dockerignore)$/)) continue;
        if (SKIP_DIRS.has(item)) continue;

        const fullPath = path.join(currentPath, item);
        const relativePath = path.relative(dirPath, fullPath);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            walkDirectory(fullPath);
          } else if (stat.isFile() && stat.size <= LARGE_FILE_THRESHOLD) {
            const language = guessLanguage(fullPath);
            languageCounts[language] = (languageCounts[language] || 0) + 1;
            files.push({ path: relativePath, language, size: stat.size });
          }
        } catch (statError) {
          console.warn(`Warning: Could not access ${fullPath}:`, getErrorMessage(statError));
        }
      }
    } catch (readdirError) {
      console.warn(`Warning: Could not read directory ${currentPath}:`, getErrorMessage(readdirError));
    }
  }

  walkDirectory(dirPath);
  return { files, languageCounts };
}

function analyzeRepositoryStructure(files: FileData[]): RepositoryStructure {
  const filePaths = files.map(f => f.path.toLowerCase());
  return {
    has_readme: filePaths.some(p => p.startsWith('readme')),
    has_license: filePaths.some(p => p.includes('license')),
    has_tests: filePaths.some(p => p.includes('test') || p.includes('spec') || p.includes('__tests__')),
    has_docs: filePaths.some(p => p.includes('doc') || p.startsWith('docs/')),
    has_package_json: filePaths.includes('package.json'),
    has_dockerfile: filePaths.some(p => p.includes('dockerfile'))
  };
}

async function generateSummary(
  repoUrl: string,
  stats: RepositoryStats,
  structure: RepositoryStructure
): Promise<string> {
  const topLanguages = Object.entries(stats.language_breakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([lang, count]) => `${lang}: ${count} files`)
    .join(', ');

  let template: string;
  try {
    template = await fs.promises.readFile('prompts/analyze_repo/summary.mustache', 'utf-8');
  } catch (err) {
    throw new Error(`Failed to load prompt template: ${getErrorMessage(err)}`);
  }

  const templateData = {
    repoUrl,
    totalFiles: stats.total_files,
    primaryLanguage: stats.primary_language,
    topLanguages,
    totalSizeKb: stats.total_size_kb,
    hasReadme: structure.has_readme,
    hasLicense: structure.has_license,
    hasTests: structure.has_tests,
    hasDocs: structure.has_docs,
    hasPackageJson: structure.has_package_json,
    hasDockerfile: structure.has_dockerfile
  };

  const summaryPrompt = Mustache.render(template, templateData);
  try {
    return await nim.chat(summaryPrompt, 'meta/llama-3.3-70b-instruct');
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error('Error generating AI summary:', errorMessage);
    return `Unable to generate AI summary. Repository appears to be a ${stats.primary_language} project with ${stats.total_files} files across multiple languages including ${topLanguages.split(', ').slice(0, 3).join(', ')}.`;
  }
}

export async function analyzeRepository(repoUrl: string, logger?: LoggerLike): Promise<AnalysisPayload> {
  logger?.info?.('Analyzing repository', { repo_url: repoUrl });

  let tempDir = '';
  try {
    tempDir = cloneRepository(repoUrl);
    logger?.info?.(`Repository cloned to: ${tempDir}`);

    const { files, languageCounts } = analyzeDirectory(tempDir);
    logger?.info?.(`Found ${files.length} files across ${Object.keys(languageCounts).length} languages`);

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const primaryLanguage = Object.entries(languageCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown';

    const stats: RepositoryStats = {
      total_files: files.length,
      total_size_kb: Math.round((totalSize / 1024) * 100) / 100,
      language_breakdown: languageCounts,
      primary_language: primaryLanguage
    };

    const structure = analyzeRepositoryStructure(files);
    logger?.info?.('Generating AI summary using NVIDIA NIM...');
    const summary = await generateSummary(repoUrl, stats, structure);

    const analysisPayload: AnalysisPayload = {
      repo_url: repoUrl,
      timestamp: new Date().toISOString(),
      summary,
      statistics: stats,
      files: files.slice(0, 100),
      repository_structure: structure
    };

    logger?.info?.('Repository analysis completed successfully', {
      primary_language: stats.primary_language,
      total_files: stats.total_files,
      total_size_kb: stats.total_size_kb
    });

    return analysisPayload;
  } finally {
    if (tempDir) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        logger?.info?.('Temporary directory cleaned up');
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        logger?.warn?.(`Failed to cleanup temp directory: ${errorMessage}`);
      }
    }
  }
}
