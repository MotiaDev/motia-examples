/**
 * Project Coordinator - Creates comprehensive renovation roadmap
 * Final step in the renovation planning pipeline
 */

import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { calculateBudgetBreakdown, generateRenovationPlan } from '../../utils/renovation-tools';

const inputSchema = z.object({
  sessionId: z.string(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'ProjectCoordinator',
  description: 'Generates comprehensive renovation roadmap with budget, timeline, and rendering instructions',
  subscribes: ['renovation.coordinate'],
  emits: ['renovation.render'],
  input: inputSchema,
  flows: ['home-renovation'],
};

export const handler: Handlers['ProjectCoordinator'] = async (input, { emit, logger, state }) => {
  const { sessionId } = input;

  logger.info('Starting project coordination', { sessionId });

  // Get all data from state
  const assessment = await state.get<any>(sessionId, 'assessment');
  const designPlan = await state.get<any>(sessionId, 'designPlan');
  const timeline = await state.get<any>(sessionId, 'timeline');
  const scope = await state.get<string>(sessionId, 'scope');
  const costEstimate = await state.get<any>(sessionId, 'costEstimate');

  if (!assessment || !designPlan) {
    logger.error('Missing required data', { sessionId });
    return;
  }

  // Calculate budget breakdown
  const budget = assessment.budget || costEstimate?.totalLow || 25000;
  const budgetBreakdown = calculateBudgetBreakdown(budget);

  // Generate renovation plan
  const renovationPlan = generateRenovationPlan(
    budget,
    timeline,
    assessment.roomType,
    JSON.stringify(designPlan)
  );

  // Build comprehensive roadmap
  const roadmap = {
    projectSummary: {
      roomType: assessment.roomType,
      style: assessment.style,
      scope: scope || 'moderate',
      squareFootage: assessment.squareFootage,
    },
    budget: budgetBreakdown,
    timeline: timeline,
    designPlan: designPlan,
    contractors: renovationPlan.contractors,
    actionChecklist: renovationPlan.actionChecklist,
    renderingPrompt: generateRenderingPrompt(assessment, designPlan),
  };

  logger.info('Renovation roadmap created', { sessionId });

  // Store final roadmap in state
  await state.set(sessionId, 'roadmap', roadmap);
  await state.set(sessionId, 'completed', true);
  await state.set(sessionId, 'completedAt', new Date().toISOString());

  // Trigger rendering generation with Gemini 2.5 Flash (Nano Banana)
  logger.info('Triggering rendering generation', { sessionId });
  
  await emit({
    topic: 'renovation.render',
    data: {
      session_id: sessionId,
    },
  });

  // Log completion
  logger.info('Renovation planning completed, rendering generation triggered', {
    sessionId,
    roomType: assessment.roomType,
    budget: budget,
    scope: scope,
  });
};

/**
 * Generate a detailed rendering prompt for image generation
 */
function generateRenderingPrompt(assessment: any, designPlan: any): string {
  const roomType = assessment.roomType;
  const style = assessment.style;
  const materials = designPlan.materials || [];
  const colors = designPlan.colors || {};
  const features = designPlan.features || [];
  
  // Add unique timestamp-based variation
  const timestamp = Date.now();
  const variation = timestamp % 4; // 0-3 for different angles/times
  
  const angles = ['eye-level straight-on', 'slight diagonal angle', 'from kitchen entrance', 'showing full room depth'];
  const times = ['mid-morning golden light', 'bright afternoon light', 'soft morning light', 'warm natural daylight'];
  const uniqueElements = [
    'fresh flowers in a vase',
    'coffee maker with steam',
    'fruit bowl with colorful produce',
    'cookbook stand open',
    'modern bar stools',
    'potted herb plants',
    'pendant lights at varied heights',
    'decorative bowls'
  ];

  let prompt = `Professional 8K interior photograph of a completely renovated ${roomType}.\n\n`;
  prompt += `**STYLE**: ${style} design with unique character\n\n`;
  
  prompt += `**CAMERA SETUP**:\n`;
  prompt += `- Angle: ${angles[variation]}\n`;
  prompt += `- Lens: 24mm wide-angle\n`;
  prompt += `- Time: ${times[variation]}\n\n`;
  
  prompt += `**EXACT SPECIFICATIONS**:\n`;
  if (colors.cabinets) prompt += `- Cabinetry finish: ${colors.cabinets}\n`;
  if (colors.walls) prompt += `- Wall color: ${colors.walls}\n`;
  if (colors.countertops) prompt += `- Counter material: ${colors.countertops}\n`;
  if (colors.flooring) prompt += `- Floor type: ${colors.flooring}\n`;
  if (colors.tiles) prompt += `- Backsplash: ${colors.tiles}\n`;
  
  prompt += `\n**MATERIALS (highly detailed)**:\n`;
  materials.slice(0, 7).forEach((material: string, idx: number) => {
    prompt += `${idx + 1}. ${material} with visible texture\n`;
  });
  
  prompt += `\n**DESIGN FEATURES (must include)**:\n`;
  features.slice(0, 6).forEach((feature: string) => {
    prompt += `- ${feature}\n`;
  });
  
  // Add unique element for this render
  const uniqueIdx = timestamp % uniqueElements.length;
  prompt += `- ${uniqueElements[uniqueIdx]}\n`;
  
  prompt += `\n**VISUAL REQUIREMENTS**:\n`;
  prompt += `- Photorealistic rendering, NOT a rendering style\n`;
  prompt += `- Real photography look with natural imperfections\n`;
  prompt += `- Visible window with outdoor view\n`;
  prompt += `- Shadows and highlights from natural light\n`;
  prompt += `- Texture visible on all surfaces\n`;
  prompt += `- Professional staging, lived-in feel\n`;
  prompt += `- Unique composition ID: ${timestamp}\n`;

  return prompt;
}

