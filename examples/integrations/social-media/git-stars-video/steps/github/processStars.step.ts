import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { Octokit } from '@octokit/rest';

const inputSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  jobId: z.string(),
  theme: z.enum(['dark', 'light']).optional().default('dark'),
});

export const config: EventConfig = {
  type: 'event',
  name: 'ProcessGitHubStars',
  description: 'Processes GitHub star history and generates video data',
  subscribes: ['process-github-stars'],
  emits: ['render-video'],
  input: inputSchema,
  flows: ['github-stars-video'],
};

interface StargazerData {
  user: string;
  avatar_url: string;
  starred_at: string;
}

export const handler: Handlers['ProcessGitHubStars'] = async (input, { logger, state, emit }) => {
  const { owner, repo, jobId, theme } = input;

  try {
    logger.info('Processing GitHub stars', { owner, repo, jobId, theme });

    // Update job status to processing
    await state.set('job', jobId, {
      status: 'processing',
      owner,
      repo,
      updatedAt: new Date().toISOString(),
    });

    // Initialize Octokit with GitHub token
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Fetch repository information
    const { data: repoData } = await octokit.repos.get({
      owner,
      repo,
    });

    logger.info('Repository data fetched', {
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
    });

    // Fetch stargazers with timestamps
    const stargazers: StargazerData[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore && stargazers.length < 1000) {
      try {
        const { data } = await octokit.activity.listStargazersForRepo({
          owner,
          repo,
          per_page: perPage,
          page,
          headers: {
            accept: 'application/vnd.github.v3.star+json',
          },
        });

        if (data.length === 0) {
          hasMore = false;
          break;
        }

        const formattedData = data.map((item: any) => ({
          user: item.user.login,
          avatar_url: item.user.avatar_url,
          starred_at: item.starred_at,
        }));

        stargazers.push(...formattedData);
        page++;

        logger.info('Fetched stargazers page', { page, count: data.length, total: stargazers.length });

        // Rate limiting: Wait a bit between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: any) {
        logger.error('Error fetching stargazers page', { page, error: error.message });
        hasMore = false;
      }
    }

    // Process and aggregate data for visualization
    const starsByDate = stargazers.reduce((acc: Record<string, number>, star) => {
      const date = star.starred_at.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Create cumulative data
    const sortedDates = Object.keys(starsByDate).sort();
    let cumulative = 0;
    const cumulativeData = sortedDates.map((date) => {
      cumulative += starsByDate[date];
      return {
        date,
        count: starsByDate[date],
        cumulative,
      };
    });

    // Sample stargazers for avatar display (up to 50 for the animation)
    const selectedStargazers = stargazers.slice(-50).reverse();

    // Format data for Remotion composition (matching the example schema)
    const videoData = {
      user: repoData.owner.login,
      userAvatarUrl: repoData.owner.avatar_url,
      repository: repoData.name,
      stars: repoData.stargazers_count,
      stargazers: selectedStargazers.map((sg) => sg.avatar_url),
    };

    // Store the processed data
    await state.set('stars', `${owner}:${repo}`, videoData);

    logger.info('GitHub stars processing completed', {
      jobId,
      totalStargazers: stargazers.length,
      totalStars: repoData.stargazers_count,
      avatarsForVideo: videoData.stargazers.length,
    });

    // Emit event to render video
    await emit({
      topic: 'render-video',
      data: {
        owner,
        repo,
        jobId,
        starData: videoData,
        theme,
      },
    });

    logger.info('Video render job initiated', { jobId });
  } catch (error: any) {
    logger.error('Failed to process GitHub stars', {
      error: error.message,
      stack: error.stack,
    });

    // Update job status to failed
    await state.set('job', jobId, {
      status: 'failed',
      owner,
      repo,
      error: error.message,
      failedAt: new Date().toISOString(),
    });
  }
};

