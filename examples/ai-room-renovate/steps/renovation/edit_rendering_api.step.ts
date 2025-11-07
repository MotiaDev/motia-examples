/**
 * Edit Rendering API - Trigger rendering edits
 * Allows users to refine generated renderings with natural language instructions
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

const bodySchema = z.object({
  editPrompt: z.string().min(1, "Edit prompt cannot be empty"),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'EditRendering',
  description: 'Edits existing renovation rendering based on user feedback',
  path: '/renovation/:sessionId/edit',
  method: 'POST',
  bodySchema,
  emits: ['renovation.edit'],
  virtualSubscribes: ['renovation.render'],
  flows: ['home-renovation'],
  responseSchema: {
    200: z.object({
      sessionId: z.string(),
      message: z.string(),
    }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['EditRendering'] = async (req, { emit, logger, state }) => {
  try {
    const { sessionId } = req.pathParams;
    const { editPrompt } = bodySchema.parse(req.body);

    logger.info('Edit rendering request', { sessionId, editPrompt });

    // Check if there's an existing rendering
    const rendering = await state.get<any>(sessionId, 'rendering');
    if (!rendering) {
      logger.error('No rendering found to edit', { sessionId });
      return {
        status: 404,
        body: {
          error: 'No rendering found for this session. Generate a rendering first.',
        },
      };
    }

    // Trigger edit event
    await emit({
      topic: 'renovation.edit',
      data: {
        session_id: sessionId,
        edit_prompt: editPrompt,
      },
    });

    logger.info('Edit rendering triggered', { sessionId });

    return {
      status: 200,
      body: {
        sessionId,
        message: 'Rendering edit in progress. Check back shortly for the updated image.',
      },
    };
  } catch (error) {
    logger.error('Failed to process edit request', { error: String(error) });
    return {
      status: 400,
      body: { error: 'Invalid request data' },
    };
  }
};

