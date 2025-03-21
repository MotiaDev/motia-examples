import { z } from 'zod';
import { coerce, zodSchemaToTypeString } from './agents/claude';

// Define a simple review schema for testing
const reviewSchema = z.object({
  title: z.string().describe('title of the review'),
  score: z.number().describe('score from 0 to 10'),
  strengths: z.array(z.string()).describe('list of strengths'),
  weaknesses: z.array(z.string()).describe('list of weaknesses'),
  summary: z.string().describe('brief summary of the review')
});

// Test the coerce function with our improved extraction
async function testExtraction() {
  console.log('Testing improved JSON extraction from Claude responses');
  console.log('Schema to request:', zodSchemaToTypeString(reviewSchema));
  
  try {
    const result = await coerce(`
      You are a code review assistant.
      Please provide a brief review of a fictional code change implementing a new feature.
      The code change adds a new feature to display user notifications in a web application.
    `, reviewSchema);
    
    console.log('\nSuccessfully extracted and parsed result:');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error in extraction test:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Run the test
testExtraction()
  .then(() => console.log('Test completed successfully'))
  .catch(error => console.error('Test failed:', error)); 