/**
 * Start Renovation - Main API entry point
 * Receives renovation requests and routes them to appropriate event handlers
 */

import { api, Handlers, StepConfig } from 'motia';
import { z } from 'zod';

const bodySchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  budget: z.number().optional(),
  roomType: z.string().optional(),
  style: z.string().optional(),
  hasImages: z.boolean().optional(),
  imageUrls: z.array(z.string()).optional(),
});

export const config = {
  name: 'StartRenovation',
  description: 'Main entry point for renovation planning requests',
  triggers: [
    api('POST', '/renovation/start', {
      bodySchema,
      responseSchema: {
        200: z.object({
          sessionId: z.string(),
          message: z.string(),
          routedTo: z.string(),
        }),
        400: z.object({ error: z.string() }),
      },
    }),
  ],
  enqueues: [
    { topic: 'renovation.assess', label: 'Start Assessment' },
    { topic: 'renovation.info', label: 'General Info', conditional: true },
  ],
  flows: ['home-renovation'],
} as const satisfies StepConfig;

export const handler: Handlers<typeof config> = async (req, { enqueue, logger, state }) => {
  try {
    const { message, budget, roomType, style, hasImages, imageUrls } = bodySchema.parse(req.body);

    // Generate unique session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Starting renovation request', { sessionId, message });

    // Analyze the message to determine routing
    const messageLC = message.toLowerCase();

    // Strong indicators of a renovation request (not just general questions)
    const isRenovationRequest =
      messageLC.includes('renovate') ||
      messageLC.includes('remodel') ||
      messageLC.includes('transform') ||
      messageLC.includes('upgrade') ||
      messageLC.includes('redesign') ||
      roomType !== undefined ||  // If roomType is provided, it's clearly a renovation request
      budget !== undefined ||     // If budget is provided, it's clearly a renovation request
      style !== undefined ||      // If style is provided, it's clearly a renovation request
      (messageLC.includes('want') && (messageLC.includes('kitchen') || messageLC.includes('bathroom') || messageLC.includes('bedroom'))) ||
      messageLC.includes('plan my') ||
      messageLC.includes('design my');

    // Only route to info if it's CLEARLY just a general question
    const isGeneralQuestion =
      !isRenovationRequest && (
        messageLC === 'hi' ||
        messageLC === 'hello' ||
        messageLC.includes('what do you do') ||
        messageLC.includes('how does this work') ||
        (messageLC.includes('help') && messageLC.length < 20)  // Short "help" messages only
      );

    let routedTo: string;

    if (isGeneralQuestion) {
      // Route to info handler
      routedTo = 'info';
      
      await enqueue({
        topic: 'renovation.info',
        data: {
          sessionId,
          message,
        },
      });
    } else {
      // Route to assessment pipeline
      routedTo = 'assessment';

      // Store initial data in state
      await state.set(sessionId, 'message', message);
      await state.set(sessionId, 'budget', budget || null);
      await state.set(sessionId, 'roomType', roomType || null);
      await state.set(sessionId, 'style', style || null);
      await state.set(sessionId, 'hasImages', hasImages || false);
      await state.set(sessionId, 'imageUrls', imageUrls || []);
      await state.set(sessionId, 'startTime', new Date().toISOString());

      await enqueue({
        topic: 'renovation.assess',
        data: {
          sessionId,
          message,
          hasImages: hasImages || false,
        },
      });
    }

    logger.info('Request routed successfully', { sessionId, routedTo });

    return {
      status: 200,
      body: {
        sessionId,
        message: `Your renovation request has been received and routed to ${routedTo}. Processing...`,
        routedTo,
      },
    };
  } catch (error) {
    logger.error('Failed to process renovation request', { error: String(error) });
    return {
      status: 400,
      body: { error: 'Invalid request data' },
    };
  }
};

