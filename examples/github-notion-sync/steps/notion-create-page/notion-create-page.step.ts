import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { notionService } from '../../services/notion.service';

const inputSchema = z.object({
  issueId: z.number(),
  issueNumber: z.number(),
  title: z.string(),
  url: z.string(),
  repository: z.string().optional(),
});

export const config: EventConfig = {
  name: 'NotionCreatePage',
  type: 'event',
  description: 'Creates a new page in Notion database when a GitHub issue is opened',
  subscribes: ['notion-create-page'],
  emits: [],
  input: inputSchema,
  flows: ['github-notion-sync'],
};

export const handler: Handlers['NotionCreatePage'] = async (input, { logger, state }) => {
  try {
    logger.info('Creating Notion page', { issueId: input.issueId, title: input.title });

    const pageId = await notionService.createPage({
      issueId: input.issueId,
      issueNumber: input.issueNumber,
      title: input.title,
      url: input.url,
      repository: input.repository,
    });

    await state.set('notion-pages', input.issueId.toString(), {
      notionPageId: pageId,
      issueId: input.issueId,
      issueNumber: input.issueNumber,
      title: input.title,
      url: input.url,
      repository: input.repository,
      createdAt: new Date().toISOString(),
    });

    logger.info('Notion page created', { issueId: input.issueId, pageId });
  } catch (error) {
    logger.error('Failed to create Notion page', {
      error: error instanceof Error ? error.message : 'Unknown error',
      issueId: input.issueId,
    });
    throw error;
  }
};
