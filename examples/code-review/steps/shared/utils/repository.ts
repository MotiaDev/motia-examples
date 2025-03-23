import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { MCTSControllerInput } from '../../code-review/controller.step';
import { InternalStateManager } from '@motiadev/core';

interface Remote {
  clone(path: string): Promise<void>;
  fetch(): Promise<void>;
  checkout(branch: string): Promise<void>;
}

class OctokitRemote implements Remote {
  constructor(public hostname: string, public repo: string) { }
  clone(path: string): Promise<void> { return Promise.resolve(); }
  fetch(): Promise<void> { return Promise.resolve(); }
  checkout(branch: string): Promise<void> { return Promise.resolve(); }
}

class GitRemote implements Remote {
  constructor(public hostname: string, public repo: string, public user: string | undefined) { }
  clone(path: string): Promise<void> { return Promise.resolve(); }
  fetch(): Promise<void> { return Promise.resolve(); }
  checkout(branch: string): Promise<void> { return Promise.resolve(); }
}

export class GitInterface {
  public url: URL | null = null;
  private remote: Remote | undefined;
  public fileSystemPath: string;

  // Constants for limiting output sizes
  static readonly MAX_DIFF_LINES = 200; // 2000;
  static readonly MAX_DIFF_SIZE = 20 * 1024; // 500 * 1024; // 500KB
  static readonly MAX_FILES_TO_SHOW = 100;
  static readonly MAX_COMMITS_TO_SHOW = 100;

  private constructor(repoUrl: string, dummy: boolean = false) {
    // Check if it's a local path
    if (fs.existsSync(repoUrl) && fs.statSync(repoUrl).isDirectory()) {
      // It's a local directory
      this.fileSystemPath = repoUrl;
      console.log(`Using local repository at: ${this.fileSystemPath}`);
      
      // Set URL to null for local repositories
      this.url = null;
      return;
    }
    
    // Try to parse as a URL for remote repositories
    try {
      this.url = new URL(repoUrl);
      
      // Handle remote repositories
      if (this.url.protocol !== 'file:') {
        if (!this.url.pathname) {
          throw new Error('A remote repository must have a repo name');
        }
        
        this.fileSystemPath = path.join(process.cwd(), this.url.pathname.replace(/\.git$/, ''));
        
        if (this.url.protocol === 'gh:') {
          const host = this.url.hostname || 'github.com';
          if (!dummy) {
            this.remote = new OctokitRemote(host, this.url.pathname);
          }
        } else {
          const hostname = this.url.hostname || 'localhost';
          const repoPath = this.url.pathname.replace(/\/$/, '');
          if (!dummy) {
            this.remote = new GitRemote(hostname, repoPath, this.url.username);
          }
        }
      } else {
        // file:// URL
        if (process.platform === 'win32' && this.url.pathname.startsWith('/')) {
          this.fileSystemPath = this.url.pathname.substring(1);
        } else {
          this.fileSystemPath = this.url.pathname;
        }
      }
    } catch (error) {
      // If URL parsing fails, assume it's a relative local path
      const resolvedPath = path.resolve(repoUrl);
      if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
        this.fileSystemPath = resolvedPath;
        this.url = null;
        console.log(`Using resolved local repository at: ${this.fileSystemPath}`);
      } else {
        throw new Error(`Invalid repository path or URL: ${repoUrl}`);
      }
    }
  }

  static parseRepoUrl(repoUrl: string) {
    try {
      const git = new GitInterface(repoUrl, true);
      return git.url || new URL(`file://${path.resolve(repoUrl)}`);
    } catch (error) {
      throw new Error(`Invalid repository URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async create(repoUrl: string, branch: string) {
    try {
      const git = new GitInterface(repoUrl);
      
      // For local repositories, just verify path exists
      if (!git.url) {
        if (!fs.existsSync(git.fileSystemPath)) {
          throw new Error(`Repository path does not exist: ${git.fileSystemPath}`);
        }
        console.log(`Using local repository at ${git.fileSystemPath}`);
        return git;
      }
      
      // Handle remote repositories
      if (git.remote) {
        if (!fs.existsSync(git.fileSystemPath)) {
          await git.remote.clone(git.fileSystemPath);
        }
        await git.remote.fetch();
        await git.remote.checkout(branch);
      }
      
      if (!fs.existsSync(git.fileSystemPath)) {
        throw new Error('Repository does not exist');
      }
      
      return git;
    } catch (error) {
      console.error('Error creating GitInterface:', error);
      throw error;
    }
  }

  /**
   * Get diff between two commits with size limits
   * @param base Base branch or commit
   * @param head Head branch or commit
   * @returns Git diff output with a limit on the number of changed lines
   */
  public getDiff(base: string, head: string): string {
    try {
      console.log(`Getting diff between ${base} and ${head} in ${this.fileSystemPath}`);
      
      // Ensure commit references don't contain spaces or special characters
      const safeBase = base.trim();
      const safeHead = head.trim();
      
      // First get the stats to check the size of the diff
      const statOutput = execSync(`git diff --stat "${safeBase}" "${safeHead}"`, {
        cwd: this.fileSystemPath,
        maxBuffer: 1024 * 1024 // 1MB buffer
      }).toString();
      
      const filesChanged = statOutput.split('\n').length - 2; // Subtract header and summary lines
      console.log(`Diff affects ${filesChanged} files`);
      
      if (filesChanged > GitInterface.MAX_FILES_TO_SHOW) {
        console.warn(`Diff is too large (${filesChanged} files). Limiting output.`);
        
        // Use a more efficient approach for very large diffs
        return `Diff too large to display in full (${filesChanged} files changed).\n\n` +
               `Stats:\n${statOutput}\n\n` +
               `Limited view of changes (${GitInterface.MAX_DIFF_LINES} lines max):\n` +
               execSync(`git diff --unified=3 "${safeBase}" "${safeHead}" | head -n ${GitInterface.MAX_DIFF_LINES}`, {
                 cwd: this.fileSystemPath,
                 maxBuffer: GitInterface.MAX_DIFF_SIZE
               }).toString();
      }
      
      // For smaller diffs, get full diff with line limit
      const diffOutput = execSync(`git diff --unified=3 "${safeBase}" "${safeHead}" | head -n ${GitInterface.MAX_DIFF_LINES}`, {
        cwd: this.fileSystemPath,
        maxBuffer: GitInterface.MAX_DIFF_SIZE
      }).toString();
      
      // Check if the diff was truncated
      if (diffOutput.split('\n').length >= GitInterface.MAX_DIFF_LINES) {
        return diffOutput + `\n\n[Diff truncated: showing first ${GitInterface.MAX_DIFF_LINES} lines only]`;
      }
      
      return diffOutput;
    } catch (error) {
      console.error('Error getting diff:', error);
      return `Error getting diff: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Get commit messages between two commits with size limits
   * @param base Base branch or commit
   * @param head Head branch or commit
   * @returns Git log output with a limit on the number of commits
   */
  public getMessages(base: string, head: string): string {
    try {
      console.log(`Getting commit messages between ${base} and ${head} in ${this.fileSystemPath}`);
      
      // Ensure commit references don't contain spaces or special characters
      const safeBase = base.trim();
      const safeHead = head.trim();
      
      // Use a safe approach to construct the revision range
      const revisionRange = `${safeBase}..${safeHead}`;
      
      // Get commit count first
      const commitCount = parseInt(
        execSync(`git rev-list --count "${revisionRange}"`, {
          cwd: this.fileSystemPath,
          maxBuffer: 1024 * 1024 // 1MB buffer
        }).toString().trim(),
        10
      );
      
      console.log(`Found ${commitCount} commits in range`);
      
      // Limit to a reasonable number of commits
      const commitLimit = Math.min(commitCount, GitInterface.MAX_COMMITS_TO_SHOW);
      
      const output = execSync(`git log "${revisionRange}" --pretty=format:"%h %s" --max-count=${commitLimit}`, {
        cwd: this.fileSystemPath,
        maxBuffer: 1024 * 1024 // 1MB buffer
      }).toString();
      
      if (commitCount > GitInterface.MAX_COMMITS_TO_SHOW) {
        return output + `\n\n[Showing ${commitLimit} of ${commitCount} commits]`;
      }
      
      return output;
    } catch (error) {
      console.error('Error getting commit messages:', error);
      return `Error getting commit messages: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Get the list of files changed between commits with size limits
   * @param base Base branch or commit
   * @param head Head branch or commit
   * @returns List of changed files, truncated if too many
   */
  public getFiles(base: string, head: string): string {
    try {
      console.log(`Getting changed files between ${base} and ${head} in ${this.fileSystemPath}`);
      
      // Ensure commit references don't contain spaces or special characters
      const safeBase = base.trim();
      const safeHead = head.trim();
      
      // Use a safe approach to construct the revision range
      const revisionRange = `${safeBase}..${safeHead}`;
      
      // Get total file count first
      const fileCount = parseInt(
        execSync(`git diff --name-only "${revisionRange}" | wc -l`, {
          cwd: this.fileSystemPath,
          maxBuffer: 1024 * 1024 // 1MB buffer
        }).toString().trim(),
        10
      );
      
      console.log(`Found ${fileCount} changed files`);
      
      // Limit to a reasonable number of files
      const fileLimit = Math.min(fileCount, GitInterface.MAX_FILES_TO_SHOW);
      
      const output = execSync(`git diff --name-only "${revisionRange}" | head -n ${fileLimit}`, {
        cwd: this.fileSystemPath,
        maxBuffer: 1024 * 1024 // 1MB buffer
      }).toString();
      
      if (fileCount > GitInterface.MAX_FILES_TO_SHOW) {
        return output + `\n\n[Showing ${fileLimit} of ${fileCount} files]`;
      }
      
      return output;
    } catch (error) {
      console.error('Error getting changed files:', error);
      return `Error getting changed files: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  public resolveCommit(commit: string | undefined): string {
    try {
      if (!commit || commit.trim() === '') {
        // If no commit is provided, get the first commit on this branch
        const firstCommit = execSync(`git rev-list --max-parents=0 HEAD`, { 
          cwd: this.fileSystemPath,
          maxBuffer: 1024 * 1024 // 1MB buffer
        }).toString().trim();
        console.log(`Resolved first commit: ${firstCommit}`);
        return firstCommit;
      }
      
      // Trim and quote the commit reference to prevent shell interpretation issues
      const safeCommit = commit.trim();
      const resolved = execSync(`git rev-parse "${safeCommit}"`, { 
        cwd: this.fileSystemPath,
        maxBuffer: 1024 * 1024 // 1MB buffer
      }).toString().trim();
      console.log(`Resolved commit ${safeCommit} to ${resolved}`);
      return resolved;
    } catch (error) {
      console.error('Error resolving commit:', error);
      throw new Error(`Failed to resolve commit: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export class Commits {
  public diff: string;
  public messages: string;
  public files: string;
  public history: {
    diff: string;
    messages: string;
    files: string;
  };

  private constructor(
    public repoUrl: string, 
    public branch: string, 
    public reviewStartCommit: string, 
    public reviewEndCommit: string, 
    public git: GitInterface
  ) {
    this.diff = this.git.getDiff(this.reviewStartCommit, this.reviewEndCommit);
    this.messages = this.git.getMessages(this.reviewStartCommit, this.reviewEndCommit);
    this.files = this.git.getFiles(this.reviewStartCommit, this.reviewEndCommit);
    this.history = {
      diff: this.diff,
      messages: this.messages,
      files: this.files,
    };
  }

  static async create(traceId: string, state: InternalStateManager, input: MCTSControllerInput) {
    // Validate input
    if (!input.repoUrl) {
      throw new Error('Repository URL is required');
    }
    
    const git = await GitInterface.create(input.repoUrl, input.branch || 'main');
    const reviewStartCommit = git.resolveCommit(input.reviewStartCommit);
    const reviewEndCommit = git.resolveCommit(input.reviewEndCommit);
    if (!reviewStartCommit || !reviewEndCommit) {
      throw new Error('Invalid review start or end commit');
    }
    return new Commits(input.repoUrl, input.branch || 'main', reviewStartCommit, reviewEndCommit, git);
  }
}
