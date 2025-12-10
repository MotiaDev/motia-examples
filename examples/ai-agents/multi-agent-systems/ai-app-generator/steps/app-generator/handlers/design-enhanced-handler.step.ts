/**
 * Design Enhanced Handler Event Step
 * 
 * Handles UI/UX enhancement notifications from the Designer agent.
 * Logs design improvements and can notify other agents.
 */

import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  flowId: z.string(),
  uiEnhancements: z.object({
    colorScheme: z.array(z.string()).optional(),
    typography: z.object({
      headingFont: z.string(),
      bodyFont: z.string(),
    }).optional(),
    spacing: z.string().optional(),
    componentLibrary: z.string().optional(),
    layoutSuggestions: z.array(z.object({
      component: z.string(),
      suggestion: z.string(),
    })).optional(),
    accessibilityNotes: z.array(z.string()).optional(),
    animationGuidelines: z.string().optional(),
  }),
});

export const config: EventConfig = {
  type: 'event',
  name: 'DesignEnhancedHandler',
  description: 'Handles UI/UX enhancement notifications from the Designer agent',
  subscribes: ['design.enhanced'],
  emits: [],
  flows: ['app-generator'],
  input: inputSchema,
};

export const handler: Handlers['DesignEnhancedHandler'] = async (input, { logger, state, streams }) => {
  const { flowId, uiEnhancements } = input;
  
  logger.info('Design enhancements received', {
    flowId,
    hasColorScheme: !!uiEnhancements.colorScheme,
    hasTypography: !!uiEnhancements.typography,
    layoutSuggestions: uiEnhancements.layoutSuggestions?.length || 0,
  });

  // Update workflow state with design enhancements
  const workflowState = await state.get<any>('workflows', flowId);
  if (workflowState) {
    workflowState.designEnhancements = uiEnhancements;
    workflowState.updatedAt = new Date().toISOString();
    await state.set('workflows', flowId, workflowState);
  }

  // Stream progress update about design enhancements
  await streams.appGenerationProgress.set(flowId, `${flowId}-design-enhanced`, {
    id: `${flowId}-design-enhanced`,
    flowId,
    phase: 'designing',
    agent: 'designer',
    message: '🎨 UI/UX enhancements applied to design',
    progress: 19,
    timestamp: new Date().toISOString(),
    details: {
      colorScheme: uiEnhancements.colorScheme?.join(', ') || 'Default',
      fonts: uiEnhancements.typography 
        ? `${uiEnhancements.typography.headingFont} / ${uiEnhancements.typography.bodyFont}`
        : 'System fonts',
      layoutSuggestions: uiEnhancements.layoutSuggestions?.length || 0,
    },
  });

  logger.info('Design enhancements recorded', { flowId });
};

