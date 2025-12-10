/**
 * Get Renovation Result - Retrieve completed renovation plan
 * API endpoint to fetch renovation planning results
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetRenovationResult',
  description: 'Retrieves the completed renovation plan for a session',
  path: '/renovation/:sessionId/result',
  method: 'GET',
  emits: [],
  virtualSubscribes: ['renovation.coordinate'],
  flows: ['home-renovation'],
  responseSchema: {
    200: z.object({
      sessionId: z.string(),
      completed: z.boolean(),
      roadmap: z.any().optional(),
      assessmentSummary: z.any().optional(),
      infoResponse: z.string().optional(),
      message: z.string(),
    }),
    404: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['GetRenovationResult'] = async (req, { logger, state }) => {
  const { sessionId } = req.pathParams;

  logger.info('Fetching renovation result', { sessionId });

  // Check if this was an info request
  const infoResponse = await state.get<string>(sessionId, 'infoResponse');
  if (infoResponse) {
    logger.info('Returning info response', { sessionId });
    return {
      status: 200,
      body: {
        sessionId,
        completed: true,
        infoResponse,
        message: 'Info request completed',
      },
    };
  }

  // Check if renovation is completed
  const completed = await state.get<boolean>(sessionId, 'completed');
  const roadmap = await state.get<any>(sessionId, 'roadmap');
  const assessmentSummary = await state.get<any>(sessionId, 'assessmentSummary');

  if (!completed) {
    logger.info('Renovation not yet completed', { sessionId });
    return {
      status: 200,
      body: {
        sessionId,
        completed: false,
        assessmentSummary,
        message: 'Renovation planning is still in progress. Please check back shortly.',
      },
    };
  }

  if (!roadmap) {
    logger.error('No roadmap found for completed session', { sessionId });
    return {
      status: 404,
      body: {
        error: 'Renovation plan not found',
      },
    };
  }

  logger.info('Returning completed renovation plan', { sessionId });

  return {
    status: 200,
    body: {
      sessionId,
      completed: true,
      roadmap,
      assessmentSummary,
      message: 'Renovation planning completed successfully',
    },
  };
};

