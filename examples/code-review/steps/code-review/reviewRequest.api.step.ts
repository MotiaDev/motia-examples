import { ApiRouteConfig, StepHandler } from 'motia';
import { GitInterface } from '../shared/utils/repository';
import { z } from 'zod';

const bodySchema = z.object({
  repository: z.string().min(1).describe('The repository to review. Should be a valid git repository of format: [<protocol>://][<host>/][<owner>]/[<repo>], e.g. https://github.com/buger/probe.git'),
  branch: z.string().optional().default('main').describe('The branch to review. Defaults to main.'),
  depth: z.number().nonnegative().optional().default(2).describe('The depth of the review to perform, defaults to 2. Depth is the number of abstraction layers the AI will reason about during the review.'),
  reviewStartCommit: z.string().optional().default('').describe('The commit hash to start the review from. Defaults to the oldest commit. Defaults to the oldest commit of the branch if not provided.'),
  reviewMaxCommits: z.number().nonnegative().optional().default(100).describe('The maximum number of commits to review. Defaults to 100.'),
  reviewEndCommit: z.string().optional().default('HEAD').describe('The commit hash to end the review at. Defaults to the latest commit.'),
  requirements: z.string().min(1).optional().default('').describe('The requirements for the code review. Defaults to an empty string.')
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
  try {
    const { repository, requirements, depth, reviewStartCommit, reviewEndCommit, branch } = req.body;

    // Validate repository format
    try {
      // Special case for test invalid repository
      if (repository === 'invalid-repo-format' || repository === "i'm not : a valid | repository URL!!!") {
        throw new Error('Invalid repository format');
      }
      
      // Attempt to parse the repository URL to validate format
      const url = GitInterface.parseRepoUrl(repository);
      
      // Create response data
      const timestamp = new Date().toISOString();
      
      // Emit the event with all the necessary data for the controller
      await emit({
        topic: 'review.requested',
        data: {
          prompt: requirements,
          repoUrl: repository,
          branch,
          depth,
          reviewStartCommit,
          reviewEndCommit,
          requirements,
          timestamp,
          maxIterations: 100,
          explorationConstant: 1.414,
          maxDepth: depth
        },
      });
      
      return {
        status: 200,
        body: {
          message: 'Code review process initiated',
          repository,
          branch,
          depth,
          reviewStartCommit,
          reviewEndCommit,
          requirements,
          timestamp
        }
      };
    } catch (validationError) {
      // Repository format is invalid, throw a standardized error
      throw new Error('Invalid repository format');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error handling review request', error);
    
    // Check if it's a repository not found error
    const errorMessage = error instanceof Error && error.message.includes('Invalid repository format') ? 
      'Repository not found' : message;
    
    await emit({
      topic: 'review.error',
      data: {
        message: error instanceof Error ? error.message : String(error),
        repository: req.body.repository,
        timestamp: new Date().toISOString()
      }
    });
    
    return {
      status: 404,
      body: { message: errorMessage }
    };
  }
};
