import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { notionService } from '../../services/notion.service';

const inputSchema = z.object({
  issueId: z.number(),
  comment: z.object({
    id: z.number(),
    body: z.string(),
    user: z.string(),
    createdAt: z.string(),
    url: z.string(),
  }),
});

export const config: EventConfig = {
  name: 'NotionAddComment',
  type: 'event',
  description: 'Adds a comment to the Notion page when a GitHub issue comment is created',
  subscribes: ['notion-add-comment'],
  emits: [],
  input: inputSchema,
  flows: ['github-notion-sync'],
};

export const handler: Handlers['NotionAddComment'] = async (input, { logger, state }) => {
  try {
    logger.info('Adding comment to Notion page', {
      issueId: input.issueId,
      commentId: input.comment.id,
    });

    const pageData = await state.get<{ notionPageId: string }>(
      'notion-pages',
      input.issueId.toString()
    );

    let pageId: string;

    if (!pageData) {
      const notionPageId = await notionService.findPageByIssueId(input.issueId);
      
      if (!notionPageId) {
        logger.warn('Notion page not found', { issueId: input.issueId });
        return;
      }

      await state.set('notion-pages', input.issueId.toString(), {
        notionPageId,
        issueId: input.issueId,
      });

      pageId = notionPageId;
    } else {
      pageId = pageData.notionPageId;
    }

    await notionService.addComment(pageId, {
      body: input.comment.body,
      user: input.comment.user,
      createdAt: input.comment.createdAt,
      url: input.comment.url,
    });

    logger.info('Comment added to Notion page', { issueId: input.issueId });
  } catch (error) {
    logger.error('Failed to add comment to Notion page', {
      error: error instanceof Error ? error.message : 'Unknown error',
      issueId: input.issueId,
    });
    throw error;
  }
};
