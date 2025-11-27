import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

const githubPingSchema = z.object({
  zen: z.string(),
  hook_id: z.number(),
  hook: z.object({
    type: z.string(),
    id: z.number(),
    active: z.boolean(),
  }),
});

const githubIssueCommentSchema = z.object({
  action: z.enum(['created', 'edited', 'deleted']),
  issue: z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
  }),
  comment: z.object({
    id: z.number(),
    body: z.string(),
    user: z.object({
      login: z.string(),
    }),
    created_at: z.string(),
    html_url: z.string(),
  }),
  repository: z.object({
    name: z.string(),
    full_name: z.string(),
  }),
});

const githubIssueSchema = z.object({
  action: z.enum(['opened', 'edited', 'deleted', 'closed', 'reopened']),
  issue: z.object({
    id: z.number(),
    title: z.string(),
    number: z.number(),
    html_url: z.string(),
    state: z.enum(['open', 'closed']),
    body: z.string().nullable(),
    user: z.object({
      login: z.string(),
      id: z.number(),
    }),
  }),
  repository: z.object({
    name: z.string(),
    full_name: z.string(),
  }),
});

export const config: ApiRouteConfig = {
  name: 'GitHubWebhook',
  type: 'api',
  description: 'Receives GitHub issue and comment webhooks, routes to appropriate Notion handlers',
  path: '/webhooks/github/issues',
  method: 'POST',
  emits: [
    { topic: 'notion-create-page', label: 'Create Notion Page', conditional: true },
    { topic: 'notion-update-page', label: 'Update Notion Page', conditional: true },
    { topic: 'notion-archive-page', label: 'Archive Notion Page', conditional: true },
    { topic: 'notion-add-comment', label: 'Add Comment to Notion Page', conditional: true },
  ],
  flows: ['github-notion-sync'],
};

export const handler: Handlers['GitHubWebhook'] = async (req, { emit, logger, state }) => {
  try {
    const pingResult = githubPingSchema.safeParse(req.body);
    if (pingResult.success) {
      logger.info('GitHub webhook ping received', {
        zen: pingResult.data.zen,
        hookId: pingResult.data.hook_id,
      });
      
      return {
        status: 200,
        body: { message: 'Webhook ping received successfully' },
      };
    }

    const commentResult = githubIssueCommentSchema.safeParse(req.body);
    if (commentResult.success) {
      const { action, issue, comment, repository } = commentResult.data;

      logger.info('GitHub comment webhook received', {
        action,
        issueId: issue.id,
        commentId: comment.id,
        repository: repository.full_name,
      });

      if (action === 'created') {
        await emit({
          topic: 'notion-add-comment',
          data: {
            issueId: issue.id,
            comment: {
              id: comment.id,
              body: comment.body,
              user: comment.user.login,
              createdAt: comment.created_at,
              url: comment.html_url,
            },
          },
        });

        logger.info('GitHub comment processed', { issueId: issue.id });

        return {
          status: 200,
          body: { message: 'Comment webhook processed successfully', action, issueId: issue.id },
        };
      }

      return { status: 200, body: { message: 'Comment action acknowledged', action } };
    }

    const issueResult = githubIssueSchema.safeParse(req.body);
    if (!issueResult.success) {
      logger.error('Invalid webhook payload', { errors: issueResult.error.errors });
      
      return {
        status: 400,
        body: { error: 'Invalid webhook payload' },
      };
    }

    const { action, issue, repository } = issueResult.data;

    logger.info('GitHub issue webhook received', {
      action,
      issueId: issue.id,
      issueNumber: issue.number,
      repository: repository.full_name,
    });

    await state.set('github-issues', issue.id.toString(), {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      url: issue.html_url,
      state: issue.state,
      body: issue.body,
      author: issue.user.login,
      repository: repository.full_name,
      lastUpdated: new Date().toISOString(),
    });

    switch (action) {
      case 'opened':
        await emit({
          topic: 'notion-create-page',
          data: {
            issueId: issue.id,
            issueNumber: issue.number,
            title: issue.title,
            url: issue.html_url,
            repository: repository.full_name,
          },
        });
        break;

      case 'edited':
        await emit({
          topic: 'notion-update-page',
          data: {
            issueId: issue.id,
            title: issue.title,
            updateType: 'edit',
          },
        });
        break;

      case 'deleted':
        await emit({
          topic: 'notion-archive-page',
          data: { issueId: issue.id },
        });
        break;

      case 'closed':
        await emit({
          topic: 'notion-update-page',
          data: {
            issueId: issue.id,
            title: issue.title,
            updateType: 'close',
          },
        });
        break;

      case 'reopened':
        await emit({
          topic: 'notion-update-page',
          data: {
            issueId: issue.id,
            title: issue.title,
            updateType: 'reopen',
          },
        });
        break;
    }

    logger.info('GitHub issue processed', { action, issueId: issue.id });

    return {
      status: 200,
      body: { message: 'Webhook processed successfully', action, issueId: issue.id },
    };
  } catch (error) {
    logger.error('GitHub webhook processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      status: 400,
      body: { error: 'Webhook processing failed' },
    };
  }
};
