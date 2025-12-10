import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { notionService } from '../../services/notion.service';

const inputSchema = z.object({
  issueId: z.number(),
  title: z.string().optional(),
  updateType: z.enum(['edit', 'close', 'reopen']),
});

export const config: EventConfig = {
  name: 'NotionUpdatePage',
  type: 'event',
  description: 'Updates a Notion page when a GitHub issue is edited, closed, or reopened',
  subscribes: ['notion-update-page'],
  emits: [],
  input: inputSchema,
  flows: ['github-notion-sync'],
};

export const handler: Handlers['NotionUpdatePage'] = async (input, { logger, state }) => {
  try {
    logger.info('Updating Notion page', { issueId: input.issueId, updateType: input.updateType });

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

    switch (input.updateType) {
      case 'edit':
        if (input.title) {
          await notionService.updatePageTitle(pageId, input.title);
        }
        break;
      case 'close':
        await notionService.closeIssuePage(pageId);
        break;
      case 'reopen':
        await notionService.reopenIssuePage(pageId);
        break;
    }

    logger.info('Notion page updated', { issueId: input.issueId });
  } catch (error) {
    logger.error('Failed to update Notion page', {
      error: error instanceof Error ? error.message : 'Unknown error',
      issueId: input.issueId,
    });
    throw error;
  }
};
