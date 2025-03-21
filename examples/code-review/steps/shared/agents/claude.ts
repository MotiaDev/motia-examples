import { z } from 'zod';
import { Commits } from "../utils/repository";
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { extractJson } from '../utils/claudeJsonParser';

export const nodeSchema = z.object({
  id: z.string(),
  parent: z.string().nullable(),
  children: z.array(z.string()),
  visits: z.number(),
  value: z.number(),
  state: z.string().optional(),
  isTerminal: z.boolean().optional()
});
export type Node = z.infer<typeof nodeSchema>;

export async function selectNode(nodes: Record<string, Node>, rootId: string, currentNodeId: string, maxIterations: number, currentIteration: number, explorationConstant: number, maxDepth: number) {
  const prompt = 'TODO: select the nodeId (string) with the highest UCB1 value';
  const nodeId = await coerce(prompt, z.string());
  return nodes[nodeId];
}

export const nodeExpansionSchema = z.object({
  reasoning: z.string().describe('the reasoning for the expansion'),
  steps: z.array(z.string()).describe('the steps of the expansion'),
})
export type NodeExpansion = z.infer<typeof nodeExpansionSchema>;

export async function expandNode(currentNode: string) {
  const prompt = `
  You are an expert software engineer analyzing code reasoning patterns.
  Given a reasoning state about code design, suggest possible next steps or directions 
  to explore in the reasoning process.
  
  Current reasoning state:
  ${currentNode}
  
  Generate 2-3 distinct next reasoning steps that would be useful to explore.
  Each step should be a clear, concise statement that moves the reasoning forward.
  `;

  return await coerce(prompt, nodeExpansionSchema);
}

export const issueSchema = z.object({
  claim: z.string().describe('the claim that is being made'),
  grounds: z.string().describe('the grounds that are being used to support the claim'),
  warrant: z.string().describe('the warrant that is being used to support the claim'),
  backing: z.string().describe('the backing that is being used to support the claim'),
  qualifier: z.string().describe('the qualifier that is being used to support the claim'),
})
export type Issue = z.infer<typeof issueSchema>;

export const evaluationSchema = z.object({
  score: z.number().describe('the score of the evaluation'),
  issues: z.array(issueSchema),
  summary: z.string().describe('a human readable evaluation of the commits'),
  issueSummary: z.string().describe('a summary of the issues found in the commits'),
})
export type Evaluation = z.infer<typeof evaluationSchema>;

export async function evaluateCommits(commits: Commits, requirements: string) {
  let watchdogTriggered = false;
  const watchdogTimer = setTimeout(() => {
    watchdogTriggered = true;
    try {
      const errorFilePath = path.join(process.cwd(), 'Review.md');
      const errorContent = `# Code Review Analysis - Delayed Response - ${new Date().toISOString()}`;
      fs.writeFileSync(errorFilePath, errorContent);
      console.error('Watchdog timer triggered - created emergency error report');
    } catch (emergencyError) {
      console.error('Failed to create emergency error report:', emergencyError);
    }
  }, 6 * 60 * 1000); // 6 minutes timeout

  try {
    console.log(`Starting evaluateCommits with requirements: ${requirements.substring(0, 50)}...`);

    // Check if Claude CLI is installed before proceeding
    let claudeInstalled = false;
    try {
      execSync('which claude', { stdio: 'ignore' });
      claudeInstalled = true;
    } catch (error) {
      console.warn('Claude CLI not found. Creating fallback review report.');

      // Create fallback review file
      const reviewFilePath = path.join(process.cwd(), 'Review.md');

      // General fallback review
      const fallbackReview = `# Code Review Report (Failed to find Claude CLI) - ${new Date().toISOString()}`;

      // Write the fallback review
      fs.writeFileSync(reviewFilePath, fallbackReview);
      console.log(`Created fallback review at: ${reviewFilePath}`);

      // Return a simple fallback evaluation
      return {
        score: 0.5,
        issues: [{
          claim: "Claude CLI not available for evaluation",
          grounds: "Claude CLI not found in system PATH",
          warrant: "Fallback review generated",
          backing: "System environment check",
          qualifier: "Limited analysis without AI assistance"
        }],
        summary: "Fallback review generated due to Claude CLI unavailability",
        issueSummary: "Unable to perform full analysis without Claude CLI"
      };
    }

    const determineSystemBoundariesPrompt = `
      You are an expert professor of software development that can help determine the system boundaries
      of a proposed change to a codebase.
      You are given a set of commits, including code changes and commit messages, and the requirements
      that the code changes are attempting to meet.
      Your job is to describe the strategy employed by the developer through the commit history

      # Files Changed
      ${commits.files}

      # Commit Messages
      ${commits.messages}

      # Diff
      ${commits.diff}
    `;

    console.log(`Sending system boundaries prompt: ${determineSystemBoundariesPrompt.length} chars`);
    const strategy = await coerce(determineSystemBoundariesPrompt, z.string());
    console.log(`Got strategy response: ${strategy.length} chars`);

    const evaluationPrompt = `
      You are an expert professor of software development and the Toulmin Model of Argumentation.
      You are given a set of commits, including code changes and commit messages, and the requirements
      that the code changes are attempting to meet.
      You are also given the strategy employed by the developer through the commit history.
      Your job is to evaluate the commits and the strategy employed by the developer through the commit history
      using the Toulmin Model of Argumentation to break down any issues with the strategy.

      # Requirements
      ${requirements}

      # Strategy
      ${strategy} 
      
      # Files Changed
      ${commits.files}

      # Commit Messages
      ${commits.messages}

      # Diff
      ${commits.diff}
    `;

    console.log(`Sending evaluation prompt: ${evaluationPrompt.length} chars`);
    const result = await coerce(evaluationPrompt, evaluationSchema);
    console.log(`Got evaluation result with score: ${result.score}`);

    // Clear the watchdog timer as we've successfully completed
    clearTimeout(watchdogTimer);

    return result;
  } catch (error) {
    // Clear the watchdog timer as we're handling the error normally
    if (!watchdogTriggered) {
      clearTimeout(watchdogTimer);
    }

    console.error('Error in evaluateCommits:', error);

    // Return a fallback evaluation
    return {
      score: 0.5,
      issues: [{
        claim: "Unable to evaluate commits due to error",
        grounds: `Error occurred: ${error instanceof Error ? error.message : String(error)}`,
        warrant: "System error prevented evaluation",
        backing: "Technical error logs",
        qualifier: "This is a fallback evaluation due to error"
      }],
      summary: `Failed to evaluate commits: ${error instanceof Error ? error.message : String(error)}`,
      issueSummary: "Evaluation failed due to system error"
    };
  }
}

const claudeCodeResponseSchema = z.object({
  cost_usd: z.number(),
  duration_ms: z.number(),
  duration_api_ms: z.number(),
  result: z.string(),
});

// Maximum size for direct command line
const MAX_PROMPT_SIZE_FOR_CLI = 5000;

// Run Claude Code agent over CLI
export async function cli(prompt: string) {
  try {
    // Check if Claude CLI is installed
    let claudeInstalled = false;
    try {
      execSync('which claude', { stdio: 'ignore' });
      claudeInstalled = true;
    } catch (error) {
      console.warn('Claude CLI not found in PATH. Using mock responses.');
      // Return a mock response when Claude is not available
      return {
        cost_usd: 0.0,
        duration_ms: 0,
        duration_api_ms: 0,
        result: JSON.stringify({
          message: "MOCK RESPONSE: Claude CLI not available. This is a mock response.",
          mockData: true,
          timestamp: new Date().toISOString()
        })
      };
    }

    // Generate a temp file path
    const tempId = crypto.randomUUID();
    const tempDir = path.join(os.tmpdir(), 'claude-prompts');
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const promptFilePath = path.join(tempDir, `prompt-${tempId}.txt`);
    const outputFilePath = path.join(tempDir, `output-${tempId}.json`);
    
    // Check if prompt is small enough for direct CLI
    if (prompt.length < MAX_PROMPT_SIZE_FOR_CLI) {
      // For small prompts, use direct CLI but write to file instead to avoid escaping issues
      console.log(`Using direct CLI for prompt (${prompt.length} chars)`);
      
      // Write prompt to file
      fs.writeFileSync(promptFilePath, prompt);
      
      try {
        // Use file input instead of command line argument to avoid escaping issues
        const response = execSync(`claude -p --json < "${promptFilePath}"`, {
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          timeout: 120000 // 2 minute timeout
        });
        
        // Clean up temp file
        try {
          fs.unlinkSync(promptFilePath);
        } catch (cleanupError) {
          console.warn('Failed to clean up temp file:', cleanupError);
        }
        
        return claudeCodeResponseSchema.parse(JSON.parse(response.toString()));
      } catch (execError) {
        console.error(`Claude CLI direct approach timed out or failed: ${execError instanceof Error ? execError.message : String(execError)}`);
        throw new Error(`Claude CLI execution failed: ${execError instanceof Error ? execError.message : String(execError)}`);
      }
    }

    // For larger prompts, use piped input approach
    console.log(`Using piped input approach for large prompt (${prompt.length} chars)`);

    // Write prompt to file for reference/debugging, but we'll use piping
    fs.writeFileSync(promptFilePath, prompt);
    console.log(`Wrote prompt to file for reference: ${promptFilePath} (${fs.statSync(promptFilePath).size} bytes)`);

    // Execute Claude with piped input and timeout (5 minutes)
    console.log(`Executing Claude with piped input: cat "${promptFilePath}" | claude -p --json > "${outputFilePath}"`);
    const response = execSync(`cat "${promptFilePath}" | claude -p --json > "${outputFilePath}"`, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 300000 // 5 minute timeout
    });

    // Check if output file exists
    if (!fs.existsSync(outputFilePath)) {
      console.error(`Claude did not create output file: ${outputFilePath}`);
      throw new Error('Claude failed to create output file');
    }

    console.log(`Claude created output file: ${outputFilePath} (${fs.statSync(outputFilePath).size} bytes)`);

    // Read output from file
    const outputData = fs.readFileSync(outputFilePath, 'utf8');
    console.log(`Read ${outputData.length} characters from output file`);

    // Cleanup temp files
    try {
      fs.unlinkSync(promptFilePath);
      fs.unlinkSync(outputFilePath);
      console.log('Cleaned up temporary files');
    } catch (cleanupError) {
      console.warn('Failed to clean up temp files:', cleanupError);
    }

    return claudeCodeResponseSchema.parse(JSON.parse(outputData));
  } catch (error) {
    console.error('Error in cli function:', error);
    throw error;
  }
}

// Add a standard import for Simulation Result schema
export const simulationResultSchema = z.object({
  nodeId: z.string().describe('the ID of the node being evaluated'),
  value: z.number().describe('the score of the evaluation, between 0 and 1'),
  explanation: z.string().describe('explanation of why this score was assigned')
});

export type SimulationResult = z.infer<typeof simulationResultSchema>;

/**
 * Evaluates the quality of reasoning paths from expanded nodes
 * Used in the simulation phase of MCTS to quickly assess the potential of different paths
 * @param parentState The state of the parent node from which expansion occurred
 * @param expandedStates Array of expanded reasoning states to evaluate
 * @param expandedNodeIds Array of node IDs corresponding to the expanded states
 * @returns A simulation result with value score
 */
export async function evaluateReasoning(
  parentState: string,
  expandedStates: string[],
  expandedNodeIds?: string[]
): Promise<SimulationResult> {
  if (expandedStates.length === 0) {
    throw new Error('No expanded states to evaluate');
  }

  const bestStateIndex = Math.floor(Math.random() * expandedStates.length);
  const selectedState = expandedStates[bestStateIndex];

  const prompt = `
    You are an expert evaluator of software development reasoning.
    I'll show you a reasoning path consisting of an initial state and a possible next step.
    Rate how promising this reasoning path is for solving a software development problem.
    
    Initial reasoning state:
    ${parentState}
    
    Possible next step in reasoning:
    ${selectedState}
    
    Evaluate the quality of this reasoning path on a scale from 0.0 to 1.0, where:
    - 0.0 means the reasoning is completely flawed or irrelevant
    - 0.5 means the reasoning is somewhat reasonable but has issues
    - 1.0 means the reasoning is excellent and very promising
    
    Provide:
    1. A numerical score between 0.0 and 1.0
    2. A brief explanation of why you assigned this score
  `;

  // Get result from Claude
  const result = await coerce(prompt, simulationResultSchema);

  // Use the expanded node ID if provided, otherwise use the state itself
  const nodeId = expandedNodeIds && expandedNodeIds.length > bestStateIndex
    ? expandedNodeIds[bestStateIndex]
    : expandedStates[bestStateIndex];

  return {
    nodeId,
    value: result.value,
    explanation: result.explanation
  };
}

/**
 * Converts a Zod schema to a readable TypeScript-like type string for use in prompts
 * @param schema The Zod schema to convert
 * @returns A string representation of the schema's type structure
 */
export function zodSchemaToTypeString(schema: z.ZodTypeAny): string {
  // Handle basic types
  if (schema instanceof z.ZodString) {
    return "string";
  } else if (schema instanceof z.ZodNumber) {
    return "number";
  } else if (schema instanceof z.ZodBoolean) {
    return "boolean";
  } else if (schema instanceof z.ZodNull) {
    return "null";
  } else if (schema instanceof z.ZodUndefined) {
    return "undefined";
  } else if (schema instanceof z.ZodAny) {
    return "any";
  } else if (schema instanceof z.ZodUnknown) {
    return "unknown";
  } else if (schema instanceof z.ZodNever) {
    return "never";
  } else if (schema instanceof z.ZodVoid) {
    return "void";
  }

  // Handle objects
  else if (schema instanceof z.ZodObject) {
    const shape = schema._def.shape();
    const entries = Object.entries(shape).map(([key, value]) => {
      const description = (value as any)._def.description;
      const descriptionComment = description ? ` // ${description}` : '';
      return `  ${key}: ${zodSchemaToTypeString(value as z.ZodTypeAny)}${descriptionComment}`;
    });
    return `{\n${entries.join(',\n')}\n}`;
  }

  // Handle arrays
  else if (schema instanceof z.ZodArray) {
    const elementType = zodSchemaToTypeString(schema._def.type);
    return `${elementType}[]`;
  }

  // Handle unions
  else if (schema instanceof z.ZodUnion) {
    const options = schema._def.options.map((option: z.ZodTypeAny) =>
      zodSchemaToTypeString(option)
    );
    return options.join(' | ');
  }

  // Handle intersections
  else if (schema instanceof z.ZodIntersection) {
    const left = zodSchemaToTypeString(schema._def.left);
    const right = zodSchemaToTypeString(schema._def.right);
    return `${left} & ${right}`;
  }

  // Handle literals
  else if (schema instanceof z.ZodLiteral) {
    const value = schema._def.value;
    return typeof value === 'string' ? `"${value}"` : `${value}`;
  }

  // Handle enums
  else if (schema instanceof z.ZodEnum) {
    const values = schema._def.values;
    return values.map((v: string) => `"${v}"`).join(' | ');
  }

  // Handle nullable and optional
  else if (schema instanceof z.ZodNullable) {
    return `${zodSchemaToTypeString(schema._def.innerType)} | null`;
  } else if (schema instanceof z.ZodOptional) {
    return `${zodSchemaToTypeString(schema._def.innerType)}?`;
  }

  // Handle records/maps
  else if (schema instanceof z.ZodRecord) {
    const keyType = zodSchemaToTypeString(schema._def.keyType);
    const valueType = zodSchemaToTypeString(schema._def.valueType);
    return `Record<${keyType}, ${valueType}>`;
  }

  // Handle tuples
  else if (schema instanceof z.ZodTuple) {
    const items = schema._def.items.map((item: z.ZodTypeAny) =>
      zodSchemaToTypeString(item)
    );
    return `[${items.join(', ')}]`;
  }

  // Default case
  return "unknown";
}

// Force the response to be of a given type
export async function coerce<T extends z.ZodSchema>(prompt: string, schema: T): Promise<z.infer<T>> {
  try {
    // Special handling for string schema to prevent the "Expected string, received object" error
    const isStringSchema = schema instanceof z.ZodString;
    
    // For string schemas, modify the prompt to request plain text instead of JSON
    const finalPrompt = isStringSchema ? 
      `${prompt}\n\n# Output Format (IMPORTANT)\nResponse in plain text format.\nDo not include JSON or code blocks in your response.` :
      `${prompt}\n\n# Output Format (IMPORTANT)\nRespond with a JSON object matching this structure: ${zodSchemaToTypeString(schema)}\n\nPlace your JSON inside a markdown code block with json syntax highlighting like this:\n\`\`\`json\n{\n  "key": "value"\n}\n\`\`\`\n\nDo not include any text before or after the code block.`;
    
    const response = await cli(finalPrompt);
    
    try {
      // Use our robust JSON extractor to handle Claude's various response formats
      if (response && response.result) {
        console.log(`Extracting JSON from Claude response (${response.result.length} chars)`);
        
        // For string schemas, just return the cleaned text
        if (isStringSchema) {
          // Clean up the response - remove markdown code blocks if present
          let cleanedText = response.result.replace(/```[\s\S]*?```/g, '').trim();
          // Remove any lines that appear to be JSON
          cleanedText = cleanedText.replace(/^\s*\{.*\}\s*$/gm, '').trim();
          return schema.parse(cleanedText);
        }
        
        // For non-string schemas, proceed with JSON extraction
        
        // Try to extract JSON from markdown code blocks first (Claude's preferred format)
        const jsonCodeBlockRegex = /```json\s*\n([\s\S]*?)\n\s*```/g;
        const codeBlockMatches = response.result.match(jsonCodeBlockRegex);
        
        if (codeBlockMatches && codeBlockMatches.length > 0) {
          console.log(`Found ${codeBlockMatches.length} JSON code blocks in response`);
          
          // Extract content inside the first code block
          const jsonContent = response.result.match(/```json\s*\n([\s\S]*?)\n\s*```/)?.[1];
          
          if (jsonContent) {
            try {
              const parsedResult = JSON.parse(jsonContent.trim());
              console.log('Successfully parsed JSON from code block');
              return schema.parse(parsedResult);
            } catch (blockParseError) {
              console.warn('Failed to parse JSON from code block:', 
                          blockParseError instanceof Error ? blockParseError.message : String(blockParseError));
              // Continue to fallback methods
            }
          }
        }
        
        // If code block extraction fails, try original extraction logic
        try {
          const parsedResult = extractJson(response.result);
          console.log('Successfully extracted JSON from Claude response using extractJson');
          return schema.parse(parsedResult);
        } catch (extractError) {
          console.warn('Failed to extract JSON with standard extractor:', extractError instanceof Error ? extractError.message : String(extractError));

          // Fallback: Try direct JSON.parse for simple cases (with error handling)
          try {
            const parsedResult = JSON.parse(response.result.trim());
            console.log('Successfully parsed response as direct JSON');
            return schema.parse(parsedResult);
          } catch (jsonError) {
            // Try to handle common issues with Claude responses
            // Look for JSON-like content with strict regex
            const jsonObjectRegex = /(\{[\s\S]*?\})/g;
            const matches = response.result.match(jsonObjectRegex);

            if (matches && matches.length > 0) {
              console.log(`Found ${matches.length} potential JSON objects in response`);
              // Try each match
              for (const potentialJson of matches) {
                try {
                  const parsedResult = JSON.parse(potentialJson);
                  console.log('Successfully parsed JSON from regex match');
                  return schema.parse(parsedResult);
                } catch (matchError) {
                  // Continue to next match
                }
              }
            }

            // If we still don't have a result, rethrow the original error
            throw extractError;
          }
        }
      } else {
        throw new Error('Empty or invalid response from Claude');
      }
    } catch (parseError: unknown) {
      console.warn('Failed to parse Claude response as the requested schema',
        parseError instanceof Error ? parseError.message : String(parseError));

      // If the response indicates it's a fallback due to auth failure
      if (response?.result && response.result.includes('MOCK RESPONSE')) {
        // Generate appropriate fallback based on the schema type
        if (schema instanceof z.ZodObject) {
          // Check what type of schema it is by looking at its shape
          const schemaShape = schema._def.shape();

          // Check if it's evaluationSchema (has score, issues, summary fields)
          if ('score' in schemaShape && 'issues' in schemaShape && 'summary' in schemaShape) {
            return {
              score: 0.5,
              issues: [{
                claim: "Mock claim due to Claude authentication failure",
                grounds: "Claude CLI authentication failed",
                warrant: "Fallback response generated",
                backing: "No actual Claude evaluation performed",
                qualifier: "This is not a real evaluation"
              }],
              summary: "MOCK RESPONSE: Could not authenticate with Claude. This is a fallback response.",
              issueSummary: "Claude authentication failed - using mock data."
            } as any as z.infer<T>;
          }

          // Check if it's simulationResultSchema (has nodeId, value, explanation fields)
          else if ('nodeId' in schemaShape && 'value' in schemaShape && 'explanation' in schemaShape) {
            return {
              nodeId: "mock-node",
              value: 0.5,
              explanation: "MOCK RESPONSE: Could not authenticate with Claude. This is a fallback score."
            } as any as z.infer<T>;
          }

          // Check if it's nodeExpansionSchema (has reasoning and steps fields)
          else if ('reasoning' in schemaShape && 'steps' in schemaShape) {
            return {
              reasoning: "MOCK RESPONSE: Could not authenticate with Claude.",
              steps: ["Mock step 1", "Mock step 2"]
            } as any as z.infer<T>;
          }
        }
        // Check if it's a string schema
        else if (schema instanceof z.ZodString) {
          return "MOCK RESPONSE: Could not authenticate with Claude. This is fallback text." as any as z.infer<T>;
        }
      }

      // Create a more descriptive error report with sample of the Claude response
      const errorReport = {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        responseSample: response?.result ? response.result.substring(0, 300) + '...' : 'No response',
        requestPromptSample: prompt.substring(0, 100) + '...',
      };

      console.error('Claude response parsing failed:', JSON.stringify(errorReport, null, 2));

      // If direct schema validation failed, try creating a basic conforming object if possible
      try {
        if (schema instanceof z.ZodObject) {
          // Create a minimal object that conforms to the schema structure
          const schemaShape = schema._def.shape();
          const minimalObject: Record<string, any> = {};

          for (const key in schemaShape) {
            // Create default values based on type
            if (schemaShape[key] instanceof z.ZodString) {
              minimalObject[key] = `Error fallback: ${key}`;
            } else if (schemaShape[key] instanceof z.ZodNumber) {
              minimalObject[key] = 0;
            } else if (schemaShape[key] instanceof z.ZodBoolean) {
              minimalObject[key] = false;
            } else if (schemaShape[key] instanceof z.ZodArray) {
              minimalObject[key] = [];
            } else if (schemaShape[key] instanceof z.ZodObject) {
              minimalObject[key] = { fallback: true };
            } else {
              minimalObject[key] = null;
            }
          }

          console.log('Created fallback object for failed Claude response');
          return schema.parse(minimalObject);
        }
      } catch (fallbackError) {
        console.error('Failed to create fallback response:',
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
      }

      // If we've exhausted all options, throw a comprehensive error
      throw new Error(`Failed to extract valid data from Claude response: ${parseError instanceof Error ? parseError.message : String(parseError)
        }`);
    }
  } catch (error: unknown) {
    console.error('Error in coerce function:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}
