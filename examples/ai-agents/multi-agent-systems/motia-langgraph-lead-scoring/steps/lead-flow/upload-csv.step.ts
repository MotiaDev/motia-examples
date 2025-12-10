import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { parseCSV, validateLead, createFlowId, type Lead, type LeadFlow } from '../../src/services/lead-service';

const bodySchema = z.object({
  csvContent: z.string().min(1, 'CSV content is required'),
  flowName: z.string().optional(),
  autoApproveThreshold: z.number().min(0).max(100).optional(),
});

export const config: ApiRouteConfig = {
  name: 'UploadLeadsCSV',
  type: 'api',
  description: 'Upload a CSV file with leads data to start the scoring flow',
  path: '/lead-flows/upload',
  method: 'POST',
  emits: [{ topic: 'leads.csv.uploaded', label: 'CSV Uploaded' }],
  flows: ['lead-score-flow'],
  bodySchema,
  responseSchema: {
    201: z.object({
      flowId: z.string(),
      status: z.string(),
      totalLeads: z.number(),
      validLeads: z.number(),
      invalidLeads: z.number(),
      message: z.string(),
    }),
    400: z.object({ error: z.string(), details: z.array(z.string()).optional() }),
  },
};

export const handler: Handlers['UploadLeadsCSV'] = async (req, { emit, logger, state }) => {
  try {
    const { csvContent, flowName, autoApproveThreshold } = bodySchema.parse(req.body);
    
    logger.info('Parsing CSV content', { contentLength: csvContent.length });
    
    // Parse CSV
    const leads = parseCSV(csvContent);
    
    if (leads.length === 0) {
      return {
        status: 400,
        body: { error: 'No leads found in CSV' },
      };
    }

    // Validate leads
    const validLeads: Lead[] = [];
    const invalidLeads: { lead: Lead; errors: string[] }[] = [];

    for (const lead of leads) {
      const validation = validateLead(lead);
      if (validation.valid) {
        validLeads.push(lead);
      } else {
        invalidLeads.push({ lead, errors: validation.errors });
      }
    }

    if (validLeads.length === 0) {
      return {
        status: 400,
        body: {
          error: 'No valid leads found in CSV',
          details: invalidLeads.slice(0, 10).map(i => `Row ${i.lead.id}: ${i.errors.join(', ')}`),
        },
      };
    }

    // Create flow
    const flowId = createFlowId();
    const flow: LeadFlow = {
      flowId,
      status: 'uploading',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalLeads: leads.length,
      processedLeads: 0,
      scoredLeads: 0,
      draftedLeads: 0,
      approvedLeads: 0,
      sentLeads: 0,
      failedLeads: 0,
    };

    // Store flow state
    await state.set('flows', flowId, flow);
    
    // Store valid leads
    await state.set('leads', flowId, validLeads);
    
    // Store flow settings
    await state.set('flow-settings', flowId, {
      flowName: flowName || `Lead Flow ${new Date().toISOString()}`,
      autoApproveThreshold: autoApproveThreshold || null,
    });

    logger.info('Flow created, emitting processing event', { 
      flowId, 
      validLeads: validLeads.length,
      invalidLeads: invalidLeads.length 
    });

    // Emit event to start processing
    await emit({
      topic: 'leads.csv.uploaded',
      data: {
        flowId,
        leadsCount: validLeads.length,
      },
    });

    return {
      status: 201,
      body: {
        flowId,
        status: 'processing',
        totalLeads: leads.length,
        validLeads: validLeads.length,
        invalidLeads: invalidLeads.length,
        message: `Flow created. Processing ${validLeads.length} leads.`,
      },
    };
  } catch (error) {
    logger.error('Failed to upload CSV', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    if (error instanceof z.ZodError) {
      return {
        status: 400,
        body: { error: 'Validation failed', details: error.errors.map(e => e.message) },
      };
    }

    return {
      status: 400,
      body: { error: error instanceof Error ? error.message : 'Failed to process CSV' },
    };
  }
};

