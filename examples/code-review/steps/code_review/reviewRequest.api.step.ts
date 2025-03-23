import { ApiRouteConfig, StepHandler } from 'motia';
import { z } from 'zod';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const bodySchema = z.object({
  repository: z.string().min(1).describe('The repository to review. Should be a valid git repository of format: [<protocol>://][<host>/][<owner>]/[<repo>], e.g. https://github.com/buger/probe.git or a local repository path, e.g. /Users/username/projects/my-repo'),
  branch: z.string().optional().default('main').describe('The branch to review. Defaults to main.'),
  depth: z.number().nonnegative().optional().default(2).describe('The depth of the review to perform, defaults to 2. Depth is the number of abstraction layers the AI will reason about during the review.'),
  reviewStartCommit: z.string().optional().default('').describe('The commit hash to start the review from. Defaults to the oldest commit. Defaults to the oldest commit of the branch if not provided.'),
  reviewMaxCommits: z.number().nonnegative().optional().default(100).describe('The maximum number of commits to review. Defaults to 100.'),
  reviewEndCommit: z.string().optional().default('HEAD').describe('The commit hash to end the review at. Defaults to the latest commit.'),
  requirements: z.string().min(1).optional().default('').describe('The requirements for the code review. Defaults to an empty string.'),
  outputUrl: z.string().optional().default('file://../..').describe('The URL to save the review file. Defaults to the current directory.'),
  maxIterations: z.number().nonnegative().optional().describe('The maximum number of iterations for the code review. This is deprecated and will be removed in future versions. Use max_iterations instead.')
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ReviewRequest',
  description: 'Initiate a code review process',
  path: '/api/review',
  method: 'POST',
  emits: ['review.requested'],
  flows: ['code-review-flow'],
  bodySchema
};

export const handler: StepHandler<typeof config> = async (req, { emit, logger }) => {
  logger.info('Review requested via API', { body: req.body });
  const { repository, requirements, branch } = req.body;

  let output_url;
  try {
    output_url = await validateOutputUrl(req.body.outputUrl);
  } catch (error: any) {
    return {
      status: 400,
      body: {
        message: `Invalid output URL: ${req.body.outputUrl}.`
      }
    };
  }

  let repo_dir;
  try {
    repo_dir = fetchRepository(repository, branch);
  } catch (error: any) {
    return {
      status: 400,
      body: {
        message: `Failed to fetch repository: ${error.message}.`
      }
    };
  }

  const review_start_commit = req.body.reviewStartCommit || 'HEAD~10';
  const review_end_commit = req.body.reviewEndCommit || 'HEAD';
  const max_iterations = req.body.maxIterations || 100;
  const exploration_constant = 1.414;
  const max_depth = req.body.depth || 2;
  const timestamp = new Date().toISOString();

  await emit({
    topic: 'review.requested',
    data: {
      repo_dir,
      branch,
      review_start_commit,
      review_end_commit,
      requirements,
      timestamp,
      max_iterations,
      exploration_constant,
      max_depth,
      output_url
    },
  });

  return {
    status: 200,
    body: {
      message: 'Code review process initiated'
    }
  };
};

export const validateOutputUrl = async (outputUrl: string | undefined) => {
  if (!outputUrl) {
    return 'file://Review.md';
  }

  const parsedOutputUrl = new URL(outputUrl);
  switch (parsedOutputUrl.protocol) {
    case 'file:':
      // Extract the path properly - for file:// URLs
      let filePath = parsedOutputUrl.pathname;

      // On Windows, the pathname starts with /, so for absolute paths, we should remove the leading /
      if (process.platform === 'win32' && filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }

      // Don't try to check existence of '/' directory
      if (filePath === '/') {
        // If path is just '/', use default file path instead
        filePath = path.join(process.cwd(), 'Review.md');
      } else if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        // Only throw an error if it's a file that exists
        if (stats.isFile()) {
          throw new Error(`Output file ${filePath} already exists`);
        }
      }
      break;
    case 'http:':
    case 'https:':
      const response = await fetch(outputUrl, { method: 'OPTIONS' });
      if (!response.ok || !response.headers.get('allow')?.includes('POST')) {
        throw new Error(`Output URL ${outputUrl} does not allow POST requests in its OPTIONS response`);
      }
      break;
    default:
      throw new Error(`Invalid output URL: ${outputUrl}`);
  }
}

export const fetchRepository = (repository: string, branch: string) => {
  // If repository is a local path and exists, use it directly
  if (!URL.canParse(repository)) {
    if (fs.existsSync(repository) && fs.statSync(repository).isDirectory()) {
      try {
        // Verify it's a git repository
        execSync('git rev-parse --is-inside-work-tree', {
          cwd: repository,
          stdio: 'pipe'
        });

        // Check if branch exists and switch to it
        const currentBranch = execSync('git branch --show-current', {
          cwd: repository,
          stdio: 'pipe'
        }).toString().trim();

        if (currentBranch !== branch) {
          try {
            // Try to switch to the branch
            execSync(`git checkout ${branch}`, {
              cwd: repository,
              stdio: 'pipe'
            });
          } catch (error) {
            console.error(`Already on '${currentBranch}'`);
            // Continue with current branch if switch fails
          }
        }

        return repository;
      } catch (error) {
        // Not a git repository or other git error
        throw new Error(`${repository} is not a valid git repository: ${error}`);
      }
    }
    else {
      throw new Error(`Repository "${repository}" is not a valid local path or URL`);
    }
  }

  const repoUrl = new URL(repository);
  const repoPath = repoUrl.pathname;
  const repoName = repoPath.split('/').pop()?.replace('.git', '') || 'repo';
  const clonePath = path.join(process.cwd(), '.motia', 'git', repoName);


  // Create directory if it doesn't exist
  if (!fs.existsSync(path.dirname(clonePath))) {
    fs.mkdirSync(path.dirname(clonePath), { recursive: true });
  }

  try {
    // Check if repository already exists at clone path
    if (fs.existsSync(clonePath)) {
      // Pull latest changes
      execSync(`git -C ${clonePath} fetch --all`, { stdio: 'pipe' });
      execSync(`git -C ${clonePath} checkout ${branch}`, { stdio: 'pipe' });
      execSync(`git -C ${clonePath} pull origin ${branch}`, { stdio: 'pipe' });
    } else {
      // Clone repository
      if (repoUrl.protocol === 'file:' && !path.isAbsolute(repository)) {
        execSync(`git clone --branch ${branch} ${path.join(process.cwd(), repository, '.git')} ${clonePath}`, { stdio: 'pipe' });
      } else {
        execSync(`git clone --branch ${branch} ${repository} ${clonePath}`, { stdio: 'pipe' });
      }
    }
    return clonePath;
  } catch (error) {
    throw new Error(`Failed to fetch repository ${repository}: ${error}`);
  }
}
