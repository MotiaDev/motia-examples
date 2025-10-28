import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

// Schema for the incoming form data
const bodySchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  metadata: z.record(z.any()).optional(),
  userInfo: z.object({
    email: z.string().email().optional(),
    name: z.string().optional(),
    id: z.string().optional()
  }).optional()
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'WebhookTrigger',
  description: 'Public form submission endpoint that triggers auto-triage workflow',
  path: '/public-form-auto-triage',
  method: 'POST',
  emits: ['form.submitted'],
  flows: ['public-form-triage'],
  bodySchema,
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      requestId: z.string()
    }),
    400: z.object({ 
      error: z.string() 
    }),
    500: z.object({ 
      error: z.string() 
    })
  }
};

export const handler: Handlers['WebhookTrigger'] = async (req, { emit, logger, state, trace_id }) => {
  try {
    const { content, metadata, userInfo } = bodySchema.parse(req.body);
    
    logger.info('Form submission received', { 
      contentLength: content.length,
      hasMetadata: !!metadata,
      traceId: trace_id
    });

    // Store the raw content in state for processing
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await state.set('form-submissions', requestId, {
      content,
      metadata,
      userInfo,
      submittedAt: new Date().toISOString(),
      traceId: trace_id
    });

    // Emit event to start processing pipeline
    await emit({
      topic: 'form.submitted',
      data: {
        requestId,
        contentPreview: content.substring(0, 100),
        metadata,
        userInfo
      }
    });

    logger.info('Form submission queued for processing', { requestId });

    return {
      status: 200,
      body: {
        success: true,
        message: 'Form submitted successfully and queued for processing',
        requestId
      }
    };

  } catch (error: any) {
    logger.error('Form submission failed', { 
      error: error.message,
      stack: error.stack 
    });

    if (error.name === 'ZodError') {
      return {
        status: 400,
        body: { 
          error: 'Invalid form data: ' + error.errors.map((e: any) => e.message).join(', ')
        }
      };
    }

    return {
      status: 500,
      body: { 
        error: 'Internal server error' 
      }
    };
  }
};

