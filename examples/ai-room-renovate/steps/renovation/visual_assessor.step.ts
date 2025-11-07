/**
 * Visual Assessor - Analyzes room and extracts renovation details
 * First step in the renovation planning pipeline
 */

import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { extractRoomDetails, estimateRenovationCost } from '../../utils/renovation-tools';

const inputSchema = z.object({
  sessionId: z.string(),
  message: z.string(),
  hasImages: z.boolean().optional(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'VisualAssessor',
  description: 'Analyzes room photos and extracts renovation requirements',
  subscribes: ['renovation.assess'],
  emits: ['renovation.design'],
  input: inputSchema,
  flows: ['home-renovation'],
};

export const handler: Handlers['VisualAssessor'] = async (input, { emit, logger, state }) => {
  const { sessionId, message, hasImages } = input;

  logger.info('Starting visual assessment', { sessionId });

  // Get stored data from state
  const storedMessage = await state.get<string>(sessionId, 'message');
  const fullMessage = storedMessage || message;
  
  // Get budget from state (user-provided value)
  let storedBudget = await state.get<any>(sessionId, 'budget');
  let storedRoomType = await state.get<any>(sessionId, 'roomType');
  let storedStyle = await state.get<any>(sessionId, 'style');
  
  // Unwrap Motia state data if needed
  if (storedBudget && typeof storedBudget === 'object' && 'data' in storedBudget) {
    storedBudget = storedBudget.data;
  }
  if (storedRoomType && typeof storedRoomType === 'object' && 'data' in storedRoomType) {
    storedRoomType = storedRoomType.data;
  }
  if (storedStyle && typeof storedStyle === 'object' && 'data' in storedStyle) {
    storedStyle = storedStyle.data;
  }

  // Extract room details from message
  const roomDetails = extractRoomDetails(fullMessage);

  logger.info('Extracted room details', { sessionId, roomDetails });
  logger.info('Stored form values', { 
    sessionId, 
    storedBudget, 
    storedRoomType, 
    storedStyle 
  });

  // Build assessment - prioritize stored values from form over extracted values
  const assessment = {
    roomType: storedRoomType || roomDetails.roomType || 'living_room',
    budget: storedBudget || roomDetails.budget || null,
    squareFootage: roomDetails.squareFootage || 120,
    style: storedStyle || roomDetails.style || 'modern',
    hasCurrentRoomPhoto: hasImages || false,
    keyIssues: [] as string[],
    opportunities: [] as string[],
  };

  // Analyze message for condition indicators
  const messageLC = fullMessage.toLowerCase();

  if (messageLC.includes('old') || messageLC.includes('dated') || messageLC.includes('90s')) {
    assessment.keyIssues.push('Outdated fixtures and finishes');
    assessment.opportunities.push('Modernize with contemporary materials');
  }

  if (messageLC.includes('small') || messageLC.includes('tiny') || messageLC.includes('cramped')) {
    assessment.keyIssues.push('Limited space');
    assessment.opportunities.push('Optimize layout for better flow');
    assessment.opportunities.push('Use light colors to create illusion of space');
  }

  if (messageLC.includes('dark') || messageLC.includes('dim')) {
    assessment.keyIssues.push('Poor lighting');
    assessment.opportunities.push('Add recessed lighting and task lighting');
  }

  if (messageLC.includes('storage')) {
    assessment.keyIssues.push('Insufficient storage');
    assessment.opportunities.push('Add built-in storage solutions');
  }

  // Estimate cost if we have budget
  let costEstimate = null;
  if (assessment.budget) {
    const avgCost = assessment.budget / assessment.squareFootage;
    let scope = 'moderate';
    if (avgCost < 100) scope = 'cosmetic';
    else if (avgCost > 300) scope = 'full';
    else if (avgCost > 600) scope = 'luxury';

    costEstimate = estimateRenovationCost(assessment.roomType, scope, assessment.squareFootage);
  }

  // Build assessment summary
  const summary = {
    roomType: assessment.roomType,
    estimatedSize: `${assessment.squareFootage} sq ft`,
    budget: assessment.budget,
    style: assessment.style,
    keyIssues: assessment.keyIssues,
    opportunities: assessment.opportunities,
    costEstimate: costEstimate?.description || null,
  };

  logger.info('Assessment complete', { sessionId, summary });

  // Store assessment in state
  await state.set(sessionId, 'assessment', assessment);
  await state.set(sessionId, 'costEstimate', costEstimate);
  await state.set(sessionId, 'assessmentSummary', summary);

  // Emit to design planner
  await emit({
    topic: 'renovation.design',
    data: {
      sessionId,
    },
  });

  logger.info('Triggered design planner', { sessionId });
};

