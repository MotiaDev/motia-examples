import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { notionService } from '../../services/notion.service';

const inputSchema = z.object({
  issueId: z.number(),
});

export const config: EventConfig = {
  name: 'NotionArchivePage',
  type: 'event',
  description: 'Archives a Notion page when a GitHub issue is deleted',
  subscribes: ['notion-archive-page'],
  emits: [],
  input: inputSchema,
  flows: ['github-notion-sync'],
};

export const handler: Handlers['NotionArchivePage'] = async (input, { logger, state }) => {
  try {
    logger.info('Archiving Notion page', { issueId: input.issueId });

    const pageData = await state.get<{ notionPageId: string }>(
      'notion-pages',
      input.issueId.toString()
    );

    if (!pageData) {
      const notionPageId = await notionService.findPageByIssueId(input.issueId);
      
      if (!notionPageId) {
        logger.warn('Notion page not found', { issueId: input.issueId });
        return;
      }

      await notionService.archivePage(notionPageId);
    } else {
      await notionService.archivePage(pageData.notionPageId);
    }

    await state.delete('notion-pages', input.issueId.toString());

    logger.info('Notion page archived', { issueId: input.issueId });
  } catch (error) {
    logger.error('Failed to archive Notion page', {
      error: error instanceof Error ? error.message : 'Unknown error',
      issueId: input.issueId,
    });
    throw error;
  }
};
