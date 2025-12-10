/**
 * Design Planner - Creates detailed renovation design plans
 * Second step in the renovation planning pipeline
 */

import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { calculateTimeline } from '../../utils/renovation-tools';

const inputSchema = z.object({
  sessionId: z.string(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'DesignPlanner',
  description: 'Creates detailed design plans with materials and specifications',
  subscribes: ['renovation.design'],
  emits: ['renovation.coordinate'],
  input: inputSchema,
  flows: ['home-renovation'],
};

export const handler: Handlers['DesignPlanner'] = async (input, { emit, logger, state }) => {
  const { sessionId } = input;

  logger.info('Starting design planning', { sessionId });

  // Get assessment from state
  const assessment = await state.get<any>(sessionId, 'assessment');
  const costEstimate = await state.get<any>(sessionId, 'costEstimate');
  const message = await state.get<string>(sessionId, 'message');

  if (!assessment) {
    logger.error('No assessment found', { sessionId });
    return;
  }

  // Determine scope
  let scope = 'moderate';
  if (costEstimate) {
    const avgCost = costEstimate.totalLow / assessment.squareFootage;
    if (avgCost < 100) scope = 'cosmetic';
    else if (avgCost > 300) scope = 'full';
    else if (avgCost > 600) scope = 'luxury';
  }

  // Create design plan
  const designPlan = createDesignPlan(
    assessment.roomType,
    assessment.style || 'modern',
    scope,
    message || ''
  );

  // Calculate timeline
  const timeline = calculateTimeline(scope, assessment.roomType);

  logger.info('Design plan created', { sessionId, scope });

  // Store design plan in state
  await state.set(sessionId, 'designPlan', designPlan);
  await state.set(sessionId, 'timeline', timeline);
  await state.set(sessionId, 'scope', scope);

  // Emit to project coordinator
  await emit({
    topic: 'renovation.coordinate',
    data: {
      sessionId,
    },
  });

  logger.info('Triggered project coordinator', { sessionId });
};

/**
 * Create design plan based on room type and style
 */
function createDesignPlan(roomType: string, style: string, scope: string, message: string) {
  const normalizedRoom = roomType.toLowerCase().replace(/\s+/g, '_');

  if (normalizedRoom === 'kitchen') {
    return createKitchenDesign(style, scope, message);
  } else if (normalizedRoom === 'bathroom') {
    return createBathroomDesign(style, scope, message);
  } else if (normalizedRoom === 'bedroom') {
    return createBedroomDesign(style, scope, message);
  } else {
    return createLivingRoomDesign(style, scope, message);
  }
}

function createKitchenDesign(style: string, scope: string, message: string) {
  const styleName = style.toLowerCase();

  let cabinetColor = 'white';
  let cabinetStyle = 'shaker';
  let countertop = 'quartz';
  let backsplash = 'subway tile';
  let hardware = 'brushed nickel';

  if (styleName.includes('farmhouse')) {
    cabinetColor = 'cream white';
    cabinetStyle = 'shaker with beadboard';
    countertop = 'butcher block';
    backsplash = 'white subway tile';
    hardware = 'oil-rubbed bronze';
  } else if (styleName.includes('modern')) {
    cabinetColor = 'glossy white';
    cabinetStyle = 'flat-panel slab';
    countertop = 'white quartz';
    backsplash = 'large format tile';
    hardware = 'brushed stainless';
  } else if (styleName.includes('industrial')) {
    cabinetColor = 'dark gray';
    cabinetStyle = 'flat-panel with metal accents';
    countertop = 'concrete-look quartz';
    backsplash = 'metal tiles';
    hardware = 'black iron';
  }

  const materials = [
    `${cabinetStyle} style cabinets in ${cabinetColor}`,
    `${countertop} countertops`,
    `${backsplash} backsplash`,
    'Luxury vinyl plank flooring in natural oak',
    `${hardware} hardware and fixtures`,
    'Stainless steel appliances',
    'Recessed LED lighting with pendant lights',
  ];

  return {
    approach: scope === 'full' ? 'reconfigure_layout' : 'preserve_layout',
    materials,
    colors: {
      cabinets: cabinetColor,
      walls: 'Soft white',
      accents: 'Natural wood tones',
    },
    features: [
      `New ${cabinetStyle} cabinets with soft-close hardware`,
      `${countertop} countertops with waterfall edge`,
      `Full-height ${backsplash}`,
      'Integrated sink with pull-down faucet',
      'Smart lighting with dimmer controls',
    ],
    style: styleName,
  };
}

function createBathroomDesign(style: string, scope: string, message: string) {
  const styleName = style.toLowerCase();

  const materials = [
    'Floating white vanity with quartz countertop',
    'Large format porcelain tile',
    'Glass shower enclosure with chrome fixtures',
    'LED mirror with integrated lighting',
    'Heated floor system',
  ];

  return {
    approach: message.includes('walk-in') ? 'reconfigure_layout' : 'preserve_layout',
    materials,
    colors: {
      vanity: 'white',
      walls: 'Soft white or spa colors',
      tiles: 'White with gray accents',
    },
    features: [
      'Walk-in shower with rainfall showerhead',
      'Glass enclosure with frameless doors',
      'Floating vanity with undermount sink',
      'LED mirror with defogging',
      'Heated tile flooring',
    ],
    style: styleName,
  };
}

function createBedroomDesign(style: string, scope: string, message: string) {
  const materials = [
    'Luxury vinyl or hardwood flooring',
    'Textured accent wall paint',
    'Crown molding and baseboards',
    'Recessed lighting with bedside sconces',
    'Ceiling fan with integrated lighting',
  ];

  return {
    approach: 'preserve_layout',
    materials,
    colors: {
      walls: 'Soft neutral',
      accent: 'Bold color or texture',
      trim: 'Bright white',
    },
    features: [
      'Textured accent wall behind bed',
      'New flooring throughout',
      'Upgraded lighting with dimmer controls',
      'Crown molding and modern baseboards',
      'Built-in closet organization',
    ],
    style,
  };
}

function createLivingRoomDesign(style: string, scope: string, message: string) {
  const materials = [
    'Hardwood or luxury vinyl flooring',
    'Warm neutral paint',
    'Layered lighting system',
    'Built-in shelving or entertainment center',
    'Crown molding and baseboards',
  ];

  return {
    approach: message.includes('open concept') ? 'reconfigure_layout' : 'preserve_layout',
    materials,
    colors: {
      walls: 'Warm neutral',
      trim: 'White or matching',
      accents: 'Per preference',
    },
    features: [
      'New flooring throughout',
      'Built-in shelving or media center',
      'Layered lighting (recessed, floor, table)',
      'Crown molding and modern trim',
      'Smart home integration ready',
    ],
    style,
  };
}

