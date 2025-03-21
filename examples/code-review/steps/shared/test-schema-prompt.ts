import { z } from 'zod';
import { coerce, zodSchemaToTypeString } from './agents/claude';

// Define a simple test schema
const testSchema = z.object({
  name: z.string().describe('the name of the entity'),
  age: z.number().describe('the age of the entity'),
  isActive: z.boolean().describe('whether the entity is active'),
  tags: z.array(z.string()).describe('tags associated with the entity'),
  details: z.object({
    address: z.string().optional().describe('the address of the entity'),
    phone: z.string().nullable().describe('the phone number of the entity')
  }).describe('additional details about the entity')
});

// Show how the schema would appear in the prompt
console.log('Schema type string that will be included in the prompt:');
console.log(zodSchemaToTypeString(testSchema));

// For demonstration, we're not actually calling Claude here
// but we're showing what the prompt would look like
async function testPrompt() {
  const prompt = `
    You are an AI assistant helping with data entry.
    Please generate a fictional person with the following structure.

    # Output Format (IMPORTANT)
    Output JSON in the shape: ${zodSchemaToTypeString(testSchema)}
    Output only the JSON, do not include any other text.
  `;

  console.log('\nFull prompt that would be sent to Claude:');
  console.log(prompt);

  // In a real scenario, we'd call coerce like this:
  // const result = await coerce(prompt, testSchema);
  // console.log('Result:', result);
}

// Run the test
testPrompt().catch(console.error); 