import { EventConfig, Handlers } from 'motia';
import OpenAI from 'openai';
import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';
import Mustache from 'mustache';
import fs from 'fs/promises';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const Activity = z.object({
  weight: z.string().optional(),
  meal: z.string().optional(),
  workout: z.string().optional(),
});

const ActivitiesPayload = z.object({
  activities: z.array(Activity).nonempty(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'user-activity-extract',
  description: 'Extract structured activity from free-form message',
  subscribes: ['user-activity-extract'],
  emits: ['user-activity-log'],
  input: z.object({ user: z.string(), message: z.string() }),
  flows: ['health-companion'],
};
export const handler: Handlers['user-activity-extract'] = async (
  input,
  { emit, logger }
) => {
  const { user, message } = input;

  let template: string;
  try {
    template = await fs.readFile('prompts/user-activity-extract.mustache', 'utf-8');
  } catch (err) {
    logger.error('Failed to load prompt template file', { error: err });
    return;
  }

  const prompt = Mustache.render(template, { message });

  try {
    const schema = zodToJsonSchema(ActivitiesPayload);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'activities_payload',
          schema,
        },
      },
    });

    const raw = completion.choices[0].message.content!;
    const parsed = ActivitiesPayload.parse(JSON.parse(raw));

    for (const activity of parsed.activities) {
      await emit({
        topic: 'user-activity-log',
        data: { user, ...activity },
      });
    }

    logger.info(`Emitted ${parsed.activities.length} activity log(s)`);
  } catch (err) {
    logger.error('Activity extraction failed:', err);
  }
};
