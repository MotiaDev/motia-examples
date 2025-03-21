import { z } from 'zod';
import { coerce, zodSchemaToTypeString } from './agents/claude';

// Test the coerce function with our improved extraction for string schemas
async function testSystemBoundaries() {
  console.log('Testing system boundaries prompt extraction');
  
  try {
    const result = await coerce(`
      You are an expert professor of software development that can help determine the system boundaries
      of a proposed change to a codebase.
      You are given a set of commits, including code changes and commit messages, and the requirements
      that the code changes are attempting to meet.
      Your job is to describe the strategy employed by the developer through the commit history.

      This is a simplified test to validate the extraction mechanism.
      Please describe in a few sentences what an MCTS (Monte Carlo Tree Search) algorithm does and how
      it might be applied to code reviews.
    `, z.string());
    
    console.log('\nSuccessfully extracted and parsed result:');
    console.log(result.substring(0, 300) + '...');
    return result;
  } catch (error) {
    console.error('Error in system boundaries test:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Run the test
testSystemBoundaries()
  .then(() => console.log('Test completed successfully'))
  .catch(error => console.error('Test failed:', error)); 