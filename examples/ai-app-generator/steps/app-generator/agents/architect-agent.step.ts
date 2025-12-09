/**
 * Architect Agent Event Step
 * 
 * The Product Owner / Architect agent that:
 * - Analyzes the app specification
 * - Designs system architecture
 * - Creates file layout and component structure
 * - Defines data models and integration points
 * 
 * Uses Gemini for UI architecture and Claude for technical architecture.
 */

import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { 
  AppSpecSchema, 
  DesignDocumentSchema,
  ComponentSpecSchema,
  type DesignDocument,
  type ComponentSpec,
} from '../../../src/types/app-generator.types';
import { generateForAgent } from '../../../src/services/llm';
import { createProgressEvent } from '../../../src/services/progress.service';

const inputSchema = z.object({
  flowId: z.string(),
  appSpec: AppSpecSchema,
});

export const config: EventConfig = {
  type: 'event',
  name: 'ArchitectAgent',
  description: 'AI Architect agent that designs system architecture, file layout, and component structure',
  subscribes: ['app_generation.requested'],
  emits: [
    { topic: 'app_design.completed', label: 'Design ready, triggers Engineer' },
    { topic: 'design.review_requested', label: 'Triggers Designer review' },
    { topic: 'app_generation.failed', label: 'Design failed', conditional: true },
  ],
  flows: ['app-generator'],
  input: inputSchema,
};

export const handler: Handlers['ArchitectAgent'] = async (input, { emit, logger, state, streams }) => {
  const { flowId, appSpec } = input;
  
  logger.info('Architect Agent started', { flowId, appTitle: appSpec.title });

  // Update progress
  await streams.appGenerationProgress.set(flowId, `${flowId}-architect-start`, createProgressEvent({
    flowId,
    phase: 'designing',
    agent: 'architect',
    message: 'Architect agent analyzing requirements and designing system architecture...',
    progress: 10,
  }));

  try {
    // Generate architecture design using LLM
    const architecturePrompt = buildArchitecturePrompt(appSpec);
    
    const response = await generateForAgent('architect', [
      { role: 'system', content: ARCHITECT_SYSTEM_PROMPT },
      { role: 'user', content: architecturePrompt },
    ]);

    logger.info('Architect LLM response received', {
      flowId,
      tokens: response.usage.totalTokens,
      cost: response.estimatedCost,
    });

    // Parse the design document from LLM response
    const designDocument = parseDesignDocument(response.content, flowId, appSpec);

    // Update progress
    await streams.appGenerationProgress.set(flowId, `${flowId}-architect-complete`, createProgressEvent({
      flowId,
      phase: 'designing',
      agent: 'architect',
      message: `Architecture design completed. ${designDocument.components.length} components identified.`,
      progress: 20,
      details: {
        totalModules: designDocument.components.length,
        tokensUsed: response.usage.totalTokens,
        estimatedCost: response.estimatedCost,
      },
    }));

    // Update workflow state
    const workflowState = await state.get<any>('workflows', flowId);
    if (workflowState) {
      workflowState.status = 'design_completed';
      workflowState.designDocument = designDocument;
      workflowState.metrics.totalTokens += response.usage.totalTokens;
      workflowState.metrics.estimatedCost += response.estimatedCost;
      workflowState.updatedAt = new Date().toISOString();
      await state.set('workflows', flowId, workflowState);
    }

    // Store design document separately for easy access
    await state.set('designs', flowId, designDocument);

    // Emit design completed event to trigger engineer
    await emit({
      topic: 'app_design.completed',
      data: {
        flowId,
        designDocument,
      },
    });

    // Also trigger designer review in parallel
    await emit({
      topic: 'design.review_requested',
      data: {
        flowId,
        designDocument,
      },
    });

    logger.info('Architect Agent completed', { 
      flowId, 
      components: designDocument.components.length,
      dataModels: designDocument.dataModels.length,
    });

  } catch (error: any) {
    logger.error('Architect Agent failed', { flowId, error: error.message });

    await streams.appGenerationProgress.set(flowId, `${flowId}-architect-failed`, createProgressEvent({
      flowId,
      phase: 'failed',
      agent: 'architect',
      message: `Architecture design failed: ${error.message}`,
      progress: 0,
    }));

    // Update workflow state
    const workflowState = await state.get<any>('workflows', flowId);
    if (workflowState) {
      workflowState.status = 'failed';
      workflowState.errors.push({
        phase: 'design',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
      await state.set('workflows', flowId, workflowState);
    }

    await emit({
      topic: 'app_generation.failed',
      data: { flowId, phase: 'design', error: error.message },
    });
  }
};

const ARCHITECT_SYSTEM_PROMPT = `You are an expert software architect and product owner for a development team. Your role is to analyze app requirements and produce comprehensive architecture designs.

You must output a valid JSON design document with the following structure:
{
  "systemArchitecture": {
    "overview": "High-level description of the architecture",
    "patterns": ["list of design patterns used"],
    "decisions": [{"decision": "what", "rationale": "why"}]
  },
  "fileLayout": [
    {"path": "src/", "type": "directory", "description": "Source code"},
    {"path": "src/components/", "type": "directory", "description": "React components"}
  ],
  "components": [
    {
      "name": "ComponentName",
      "description": "What the component does",
      "props": [{"name": "propName", "type": "string", "required": true, "description": "desc"}],
      "dependencies": ["other-component"],
      "priority": "critical|high|medium|low"
    }
  ],
  "dataModels": [
    {
      "name": "ModelName",
      "fields": [{"name": "fieldName", "type": "string", "required": true}],
      "relationships": ["related-model"]
    }
  ],
  "integrationPoints": [
    {"name": "API", "type": "api|storage|auth|external", "description": "desc"}
  ],
  "uiGuidelines": {
    "colorScheme": ["#primary", "#secondary"],
    "typography": {"headingFont": "font-name", "bodyFont": "font-name"},
    "spacing": "4px base unit",
    "componentLibrary": "shadcn/ui"
  }
}

Focus on:
1. Clean, maintainable architecture
2. Proper separation of concerns
3. Reusable components
4. Type safety with TypeScript
5. Modern React patterns (hooks, context)
6. Responsive, accessible UI design

Output ONLY valid JSON, no markdown formatting or explanations.`;

function buildArchitecturePrompt(appSpec: z.infer<typeof AppSpecSchema>): string {
  return `Design the architecture for the following application:

**App Title:** ${appSpec.title}
**Genre:** ${appSpec.genre}
**Description:** ${appSpec.description}

**Key Features:**
${appSpec.features.map((f, i) => `${i + 1}. ${f}`).join('\n')}

**Target Audience:** ${appSpec.targetAudience || 'General users'}

**Tech Preferences:**
- Frontend: ${appSpec.techPreferences?.frontend || 'React'}
- Styling: ${appSpec.techPreferences?.styling || 'Tailwind CSS'}
- State Management: ${appSpec.techPreferences?.stateManagement || 'Zustand'}
- Testing: ${appSpec.techPreferences?.testing || 'Vitest'}
- Build Tool: ${appSpec.techPreferences?.buildTool || 'Vite'}

**Additional Context:** ${appSpec.additionalContext || 'None'}

Please design a comprehensive architecture that includes:
1. System architecture overview with design patterns
2. Complete file/folder structure
3. All necessary React components with their props
4. Data models if applicable
5. Integration points (APIs, storage, auth)
6. UI/UX guidelines including color scheme and typography

Prioritize components as critical/high/medium/low based on their importance to core functionality.`;
}

function parseDesignDocument(
  llmResponse: string, 
  flowId: string, 
  appSpec: z.infer<typeof AppSpecSchema>
): DesignDocument {
  try {
    // Extract JSON from response (handle potential markdown wrapping)
    let jsonStr = llmResponse;
    const jsonMatch = llmResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const parsed = JSON.parse(jsonStr.trim());
    
    // Construct and validate design document
    const designDocument: DesignDocument = {
      flowId,
      appSpec,
      systemArchitecture: parsed.systemArchitecture || {
        overview: 'Modern React application',
        patterns: ['Component-based', 'Hooks'],
        decisions: [],
      },
      fileLayout: parsed.fileLayout || [],
      components: (parsed.components || []).map((c: any) => ({
        name: c.name,
        description: c.description || '',
        props: c.props || [],
        dependencies: c.dependencies || [],
        priority: c.priority || 'medium',
      })),
      dataModels: parsed.dataModels || [],
      integrationPoints: parsed.integrationPoints || [],
      uiGuidelines: parsed.uiGuidelines,
      createdAt: new Date().toISOString(),
      createdBy: 'architect',
    };

    return designDocument;
  } catch (error: any) {
    throw new Error(`Failed to parse design document: ${error.message}`);
  }
}

