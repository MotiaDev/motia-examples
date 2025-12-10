/**
 * Info Handler - Handles general renovation questions
 * Provides system information and guidance
 */

import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  sessionId: z.string(),
  message: z.string(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'InfoHandler',
  description: 'Handles general questions and provides system information',
  subscribes: ['renovation.info'],
  emits: [],
  input: inputSchema,
  flows: ['home-renovation'],
};

export const handler: Handlers['InfoHandler'] = async (input, { logger, state }) => {
  const { sessionId, message } = input;

  logger.info('Handling info request', { sessionId });

  const messageLC = message.toLowerCase();
  let response = '';

  if (messageLC.includes('hi') || messageLC.includes('hello')) {
    response = `
🏚️ Hi! I'm your AI Home Renovation Planner. 

I can help you transform your space by:
- 📸 Analyzing photos of your current room
- 🎨 Creating personalized renovation plans
- 💰 Providing budget estimates and cost breakdowns
- ⏱️ Estimating project timelines
- 🏗️ Generating comprehensive renovation roadmaps
- ✨ Creating photorealistic renderings of your renovated space

**Which room are you thinking of renovating?** Feel free to share photos if you have them!

Popular projects: Kitchen, Bathroom, Bedroom, Living Room`;
  } else if (messageLC.includes('cost') || messageLC.includes('budget')) {
    response = `
💰 **Renovation Costs Guide**

Costs vary based on room type and scope:

**Kitchen:** $50-1200/sq ft
- Cosmetic: $50-100/sq ft
- Moderate: $150-250/sq ft
- Full: $300-500/sq ft
- Luxury: $600-1200/sq ft

**Bathroom:** $75-1500/sq ft
- Cosmetic: $75-125/sq ft
- Moderate: $200-350/sq ft
- Full: $400-600/sq ft
- Luxury: $800-1500/sq ft

**Bedroom/Living Room:** $30-1000/sq ft

To get a detailed estimate for your specific project, tell me:
1. What room are you renovating?
2. What's your desired budget?
3. What changes do you want to make?`;
  } else if (messageLC.includes('timeline') || messageLC.includes('how long')) {
    response = `
⏱️ **Renovation Timelines**

Typical project durations:

- **Cosmetic Refresh:** 1-2 weeks
  (Paint, fixtures, minor updates)

- **Moderate Renovation:** 3-6 weeks
  (Some structural work, new finishes)

- **Full Transformation:** 2-4 months
  (Complete remodel, major changes)

- **Luxury Custom:** 4-6 months
  (High-end finishes, custom work)

Ready to create a plan? Tell me about your project!`;
  } else {
    response = `
🤖 **AI Home Renovation Planner**

I'm a multi-agent system that helps you plan and visualize home renovations:

**My Capabilities:**
1. 🔍 **Smart Image Analysis** - Upload room photos and I'll analyze layout
2. 🎨 **Design Planning** - Get specific material recommendations
3. 💰 **Budget Planning** - Detailed cost breakdowns
4. 📊 **Project Roadmap** - Timeline, contractor list, action checklist
5. ✨ **Photorealistic Renderings** - See your renovated space before you start

**To get started, tell me:**
- Which room are you renovating?
- What's your budget?
- What style or changes do you envision?`;
  }

  // Store response in state
  await state.set(sessionId, 'infoResponse', response);
  await state.set(sessionId, 'completedAt', new Date().toISOString());

  logger.info('Info response generated', { sessionId });
};

