import { z } from 'zod';

/**
 * Extracts valid JSON from Claude's response text
 * Handles various formats Claude might return including:
 * 1. JSON wrapped in markdown code blocks (```json ... ```)
 * 2. JSON with extra text before or after
 * 3. Direct JSON responses
 * 4. JSON with escape sequences
 * 5. Multiple JSON objects in the same text
 */
export function extractJson(text: string): any {
  if (!text) {
    throw new Error('Empty response from Claude');
  }

  // Keep a record of all extraction attempts
  const attempts: Array<{method: string, result: any | null, error?: string}> = [];

  // Case 1: Try to extract JSON from a markdown code block with explicit json tag
  const jsonCodeBlockRegex = /```json\s*\n([\s\S]*?)\n```/g;
  const jsonCodeBlockMatch = jsonCodeBlockRegex.exec(text);
  
  if (jsonCodeBlockMatch && jsonCodeBlockMatch[1]) {
    try {
      const result = JSON.parse(jsonCodeBlockMatch[1]);
      attempts.push({ method: 'json-code-block', result });
      return result; // Return immediately if successful
    } catch (e) {
      attempts.push({ 
        method: 'json-code-block', 
        result: null, 
        error: e instanceof Error ? e.message : String(e) 
      });
      // Continue to other methods
    }
  }

  // Case 2: Try to extract JSON from any markdown code block
  const genericCodeBlockRegex = /```(?:[\w]*)\s*\n([\s\S]*?)\n```/g;
  const codeBlockMatches = Array.from(text.matchAll(genericCodeBlockRegex));
  
  if (codeBlockMatches.length > 0) {
    for (const match of codeBlockMatches) {
      if (match[1]) {
        try {
          const result = JSON.parse(match[1]);
          attempts.push({ method: 'generic-code-block', result });
          return result;
        } catch (e) {
          attempts.push({ 
            method: 'generic-code-block', 
            result: null, 
            error: e instanceof Error ? e.message : String(e) 
          });
          // Try next match
        }
      }
    }
  }

  // Case 3: Try to find the outermost JSON object (greedy)
  const outerJsonObjectRegex = /(\{[\s\S]*\})/g;
  const outerJsonMatch = outerJsonObjectRegex.exec(text);
  
  if (outerJsonMatch && outerJsonMatch[1]) {
    try {
      // Use a more permissive approach by trimming whitespace
      const trimmed = outerJsonMatch[1].trim();
      const result = JSON.parse(trimmed);
      attempts.push({ method: 'outer-json-object', result });
      return result;
    } catch (e) {
      attempts.push({ 
        method: 'outer-json-object', 
        result: null, 
        error: e instanceof Error ? e.message : String(e) 
      });
      // Continue to other methods
    }
  }

  // Case 4: Try to find all possible JSON objects (non-greedy)
  const jsonObjectRegex = /(\{[\s\S]*?\})/g;
  const jsonMatches = text.match(jsonObjectRegex);
  
  if (jsonMatches) {
    // Sort by length desc - usually the longest match is the most complete
    const sortedMatches = [...jsonMatches].sort((a, b) => b.length - a.length);
    
    // Try each potential JSON match
    for (const potentialJson of sortedMatches) {
      try {
        const result = JSON.parse(potentialJson);
        attempts.push({ method: 'json-object-non-greedy', result });
        return result;
      } catch (e) {
        attempts.push({ 
          method: 'json-object-non-greedy', 
          result: null, 
          error: e instanceof Error ? e.message : String(e) 
        });
        // Continue to next match
      }
    }
  }

  // Case 5: Handle Claude CLI escape sequences
  // Claude CLI sometimes doubly escapes newlines and quotes
  const unescaped = text
    .replace(/\\\\n/g, '\\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\"/g, '\\"');
  
  try {
    const result = JSON.parse(unescaped);
    attempts.push({ method: 'unescaped', result });
    return result;
  } catch (e) {
    attempts.push({ 
      method: 'unescaped', 
      result: null, 
      error: e instanceof Error ? e.message : String(e) 
    });
    // Continue to other methods
  }

  // Case 6: Try the entire text as JSON directly (fallback)
  try {
    const result = JSON.parse(text);
    attempts.push({ method: 'direct', result });
    return result;
  } catch (e) {
    attempts.push({ 
      method: 'direct', 
      result: null, 
      error: e instanceof Error ? e.message : String(e) 
    });
    // Move to final error handling
  }

  // Final fallback: Try to clean up the text
  try {
    // Replace common problematic characters
    const cleaned = text
      .replace(/[\n\r\t]/g, ' ')  // Replace newlines and tabs with spaces
      .replace(/\s+/g, ' ')       // Collapse multiple spaces
      .replace(/('(?:\\.|[^'])*'|"(?:\\.|[^"])*")|\/\/.*|\/\*[\s\S]*?\*\//g, '$1')  // Remove comments
      .trim();
    
    // Find anything that looks like a JSON object
    const cleanedMatch = /\{.+\}/g.exec(cleaned);
    if (cleanedMatch) {
      const result = JSON.parse(cleanedMatch[0]);
      attempts.push({ method: 'cleaned', result });
      return result;
    }
  } catch (e) {
    attempts.push({ 
      method: 'cleaned', 
      result: null, 
      error: e instanceof Error ? e.message : String(e) 
    });
  }

  // If all attempts failed, throw an error with the attempts log
  console.error('All JSON extraction methods failed:', attempts);
  throw new Error(`Failed to extract valid JSON from Claude response after ${attempts.length} attempts. Response: ${text.substring(0, 100)}...`);
}

/**
 * Takes a Claude result and safely extracts and parses it to a specific schema
 */
export function parseClaudeResponse<T extends z.ZodSchema>(
  claudeResult: string, 
  schema: T
): z.infer<T> {
  try {
    const extracted = extractJson(claudeResult);
    return schema.parse(extracted);
  } catch (error) {
    console.error('Failed to parse Claude response:', 
                 error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Test cases for Claude JSON extraction
 * Used to validate the robustness of our JSON extraction logic
 */
export const testCases = {
  markdownCodeBlock: {
    input: '```json\n{"message": "Hello world"}\n```',
    expected: { message: 'Hello world' }
  },
  markdownCodeBlockNoLanguage: {
    input: '```\n{"message": "Hello world"}\n```',
    expected: { message: 'Hello world' }
  },
  directJson: {
    input: '{"message": "Hello world"}',
    expected: { message: 'Hello world' }
  },
  jsonWithTextBefore: {
    input: 'Here is your JSON response:\n{"message": "Hello world"}',
    expected: { message: 'Hello world' }
  },
  jsonWithTextAfter: {
    input: '{"message": "Hello world"}\nI hope this helps!',
    expected: { message: 'Hello world' }
  },
  complexJson: {
    input: '```json\n{"data": {"items": [1, 2, 3], "metadata": {"created": "2023-01-01"}}}\n```',
    expected: { data: { items: [1, 2, 3], metadata: { created: "2023-01-01" } } }
  },
  claudeCliJson: {
    input: '{"cost_usd": 0.0078285, "duration_ms": 2057, "duration_api_ms": 2057, "result": "```json\\n{\\"message\\": \\"Hello! I\'m ready to assist you.\\"}\\n```"}',
    expected: { message: "Hello! I'm ready to assist you." }
  },
  doubleEscaped: {
    input: '{"result": "{\\"items\\": [1, 2, 3]}"}',
    expected: { items: [1, 2, 3] }
  }
};

/**
 * Run tests on the JSON extraction function
 * Returns test results with pass/fail status
 */
export function runExtractJsonTests(): { success: boolean, results: any[] } {
  const results = [];
  let allPassed = true;

  for (const [name, testCase] of Object.entries(testCases)) {
    try {
      const result = extractJson(testCase.input);
      const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);
      
      results.push({
        name,
        passed,
        input: testCase.input,
        expected: testCase.expected,
        actual: result
      });
      
      if (!passed) {
        allPassed = false;
      }
    } catch (error: unknown) {
      results.push({
        name,
        passed: false,
        input: testCase.input,
        expected: testCase.expected,
        error: error instanceof Error ? error.message : String(error)
      });
      allPassed = false;
    }
  }

  return {
    success: allPassed,
    results
  };
} 