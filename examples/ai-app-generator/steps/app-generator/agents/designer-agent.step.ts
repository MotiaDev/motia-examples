/**
 * Designer Agent Event Step
 * 
 * The Designer agent that:
 * - Enhances UI/UX suggestions
 * - Provides color scheme recommendations
 * - Suggests component layouts
 * - Works alongside the Architect for visual design
 * 
 * This agent listens to design completion and enhances with UI recommendations.
 */

import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { DesignDocumentSchema } from '../../../src/types/app-generator.types';
import { generateForAgent } from '../../../src/services/llm';
import { createProgressEvent } from '../../../src/services/progress.service';

const inputSchema = z.object({
  flowId: z.string(),
  designDocument: DesignDocumentSchema,
});

export const config: EventConfig = {
  type: 'event',
  name: 'DesignerAgent',
  description: 'AI Designer agent that enhances UI/UX and visual design recommendations',
  subscribes: ['design.review_requested'],
  emits: [
    { topic: 'design.enhanced', label: 'UI design enhanced' },
  ],
  flows: ['app-generator'],
  input: inputSchema,
};

export const handler: Handlers['DesignerAgent'] = async (input, { emit, logger, state, streams }) => {
  const { flowId, designDocument } = input;
  const appSpec = designDocument.appSpec;
  
  logger.info('Designer Agent started', { 
    flowId, 
    appTitle: appSpec.title,
    genre: appSpec.genre,
  });

  // Update progress
  await streams.appGenerationProgress.set(flowId, `${flowId}-designer-start`, createProgressEvent({
    flowId,
    phase: 'designing',
    agent: 'designer',
    message: 'Designer agent enhancing UI/UX recommendations...',
    progress: 18,
  }));

  try {
    // Generate enhanced UI recommendations
    const designPrompt = buildDesignPrompt(appSpec, designDocument);
    
    const response = await generateForAgent('designer', [
      { role: 'system', content: DESIGNER_SYSTEM_PROMPT },
      { role: 'user', content: designPrompt },
    ]);

    logger.info('Designer LLM response received', {
      flowId,
      tokens: response.usage.totalTokens,
    });

    // Parse UI recommendations
    const uiEnhancements = parseUIEnhancements(response.content);

    // Update design document with enhanced UI guidelines
    const enhancedDesign = {
      ...designDocument,
      uiGuidelines: {
        ...designDocument.uiGuidelines,
        ...uiEnhancements,
      },
    };

    // Update workflow state
    const workflowState = await state.get<any>('workflows', flowId);
    if (workflowState) {
      workflowState.designDocument = enhancedDesign;
      workflowState.metrics.totalTokens += response.usage.totalTokens;
      workflowState.metrics.estimatedCost += response.estimatedCost;
      workflowState.updatedAt = new Date().toISOString();
      await state.set('workflows', flowId, workflowState);
    }

    // Store enhanced design
    await state.set('designs', flowId, enhancedDesign);

    // Update progress
    await streams.appGenerationProgress.set(flowId, `${flowId}-designer-complete`, createProgressEvent({
      flowId,
      phase: 'designing',
      agent: 'designer',
      message: 'UI/UX design enhancements applied',
      progress: 19,
      details: {
        tokensUsed: response.usage.totalTokens,
        estimatedCost: response.estimatedCost,
      },
    }));

    // Emit design enhanced event
    await emit({
      topic: 'design.enhanced',
      data: {
        flowId,
        uiEnhancements,
      },
    });

    logger.info('Designer Agent completed', { 
      flowId,
      hasColorScheme: !!uiEnhancements.colorScheme,
      hasTypography: !!uiEnhancements.typography,
    });

  } catch (error: any) {
    // Designer failures are non-blocking - just log and continue
    logger.warn('Designer Agent encountered error (non-blocking)', { 
      flowId, 
      error: error.message 
    });
  }
};

const DESIGNER_SYSTEM_PROMPT = `You are an expert UI/UX designer specializing in modern web application design.

Your task is to provide design recommendations in JSON format:

{
  "colorScheme": ["#primary", "#secondary", "#accent", "#background", "#text"],
  "typography": {
    "headingFont": "font-name",
    "bodyFont": "font-name",
    "scale": "description of type scale"
  },
  "spacing": "base unit description",
  "componentLibrary": "recommended library",
  "layoutSuggestions": [
    {
      "component": "component name",
      "suggestion": "layout recommendation"
    }
  ],
  "accessibilityNotes": ["accessibility recommendations"],
  "animationGuidelines": "motion design notes"
}

Focus on:
1. Modern, beautiful aesthetics
2. Excellent user experience
3. Accessibility (WCAG 2.1 AA)
4. Responsive design principles
5. Consistent visual language
6. Genre-appropriate design choices

Output ONLY valid JSON, no markdown or explanations.`;

function buildDesignPrompt(appSpec: any, designDocument: any): string {
  const components = designDocument.components || [];
  
  return `Provide UI/UX design recommendations for:

**App:** ${appSpec.title}
**Genre:** ${appSpec.genre}
**Description:** ${appSpec.description}
**Target Audience:** ${appSpec.targetAudience || 'General users'}

**Key Features:**
${appSpec.features.map((f: string) => `- ${f}`).join('\n')}

**Components to Style:**
${components.map((c: any) => `- ${c.name}: ${c.description}`).join('\n')}

**Current UI Guidelines:**
${JSON.stringify(designDocument.uiGuidelines || {}, null, 2)}

Provide enhanced design recommendations including:
1. A cohesive color scheme (5 colors: primary, secondary, accent, background, text)
2. Typography choices (heading and body fonts from Google Fonts)
3. Spacing system
4. Layout suggestions for key components
5. Accessibility notes
6. Animation/motion guidelines

Consider the ${appSpec.genre} genre and target audience when making recommendations.`;
}

function parseUIEnhancements(llmResponse: string): any {
  try {
    // Extract JSON from response
    let jsonStr = llmResponse;
    const jsonMatch = llmResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const parsed = JSON.parse(jsonStr.trim());
    
    return {
      colorScheme: parsed.colorScheme || ['#6366f1', '#8b5cf6', '#a855f7', '#0f172a', '#e2e8f0'],
      typography: parsed.typography || {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        scale: '1.25 major third scale',
      },
      spacing: parsed.spacing || '4px base unit',
      componentLibrary: parsed.componentLibrary,
      layoutSuggestions: parsed.layoutSuggestions || [],
      accessibilityNotes: parsed.accessibilityNotes || [],
      animationGuidelines: parsed.animationGuidelines,
    };
  } catch (error) {
    // Return defaults if parsing fails
    return {
      colorScheme: ['#6366f1', '#8b5cf6', '#a855f7', '#0f172a', '#e2e8f0'],
      typography: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
      },
      spacing: '4px base unit',
    };
  }
}

