import { ApiRouteConfig, StepHandler } from 'motia';
import { z } from 'zod';
import axios from 'axios';

// Define team mappings for different file patterns
const TEAM_MAPPINGS = {
  frontend: {
    patterns: ['src/frontend/**', '*.tsx', '*.jsx', '*.css', '*.scss'],
    reviewers: ['frontend-team-member1', 'frontend-team-member2']
  },
  backend: {
    patterns: ['src/backend/**', '*.py', '*.go', '*.java'],
    reviewers: ['backend-team-member1', 'backend-team-member2']
  },
  infrastructure: {
    patterns: ['Dockerfile', 'docker-compose.yml', '*.yaml', '*.yml', 'terraform/**'],
    reviewers: ['devops-team-member1', 'devops-team-member2']
  }
};

interface GitHubFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
}

const inputSchema = z.object({
  number: z.number(),
  repo: z.string().optional(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Auto Assign Reviewers',
  description: 'Automatically assigns reviewers based on file changes in a PR',
  path: '/auto-assign-reviewers',
  method: 'POST',
  bodySchema: inputSchema,
  flows: ['default'],
  emits: [],
  virtualSubscribes: ['/auto-assign-reviewers'],
};

export const handler: StepHandler<typeof config> = async (input, { logger }) => {
  try {
    const repo = (input as any).repo || process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    let prNumber: number | undefined;

    if (typeof input === 'object' && input !== null) {
      if (typeof (input as any).number === 'number') {
        prNumber = (input as any).number;
      } else if (input.body && typeof input.body.number === 'number') {
        prNumber = input.body.number;
      }
    }

    if (!repo || !token) {
      throw new Error('GITHUB_REPO or GITHUB_TOKEN not set in environment');
    }
    if (!prNumber) {
      throw new Error('PR number is required');
    }

    // Get PR details including changed files
    const prUrl = `https://api.github.com/repos/${repo}/pulls/${prNumber}`;
    const prResponse = await axios.get(prUrl, {
      headers: { Authorization: `token ${token}` },
    });

    const filesUrl = `https://api.github.com/repos/${repo}/pulls/${prNumber}/files`;
    const filesResponse = await axios.get(filesUrl, {
      headers: { Authorization: `token ${token}` },
    });

    const changedFiles = filesResponse.data.map((file: GitHubFile) => file.filename);
    logger.info(`Changed files in PR #${prNumber}: ${changedFiles.join(', ')}`);

    // Determine which teams need to review based on file changes
    const requiredTeams = new Set<string>();
    const requiredReviewers = new Set<string>();

    // Always add @mfpiccolo as a reviewer
    requiredReviewers.add('mfpiccolo');

    for (const [team, mapping] of Object.entries(TEAM_MAPPINGS)) {
      const hasRelevantChanges = mapping.patterns.some(pattern => {
        const regex = new RegExp(pattern.replace('**', '.*').replace('*', '[^/]*'));
        return changedFiles.some((file: string) => regex.test(file));
      });

      if (hasRelevantChanges) {
        requiredTeams.add(team);
        mapping.reviewers.forEach(reviewer => requiredReviewers.add(reviewer));
      }
    }

    if (requiredReviewers.size === 0) {
      logger.info(`No specific reviewers needed for PR #${prNumber}`);
      return {
        status: 200,
        body: { message: 'No specific reviewers needed' },
      };
    }

    // Request reviews from the identified reviewers
    const reviewersUrl = `https://api.github.com/repos/${repo}/pulls/${prNumber}/requested_reviewers`;
    const response = await axios.post(
      reviewersUrl,
      { reviewers: Array.from(requiredReviewers) },
      {
        headers: { Authorization: `token ${token}` },
      }
    );

    logger.info(`Requested reviews from teams: ${Array.from(requiredTeams).join(', ')}`);
    logger.info(`Requested reviews from: ${Array.from(requiredReviewers).join(', ')}`);

    return {
      status: 200,
      body: {
        message: 'Reviewers assigned successfully',
        teams: Array.from(requiredTeams),
        reviewers: Array.from(requiredReviewers),
      },
    };
  } catch (error: any) {
    logger.error('Error assigning reviewers:', error?.response?.data || error.message || error);
    return {
      status: 500,
      body: { error: error?.response?.data || error.message || 'Internal server error' },
    };
  }
}; 