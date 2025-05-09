// steps/doc-generator.step.ts
import { OpenAI } from 'openai';

// Configuration section
export const config = {
  type: "event",
  name: "doc-generator",
  subscribes: ["doc-gaps-identified"],
  emits: ["documentation-generated"],
  flows: ["documentation-guardian"]
};

// Type definitions
type Gap = {
  type: string;
  name: string;
  issue: string;
  generated_doc?: string;
};

type Payload = {
  file: string;
  content?: string;
  gaps?: Gap[];
};

type Context = {
  logger: {
    info: (message: string) => void;
    error: (message: string) => void;
  };
  emit: (event: { topic: string; data: any }) => Promise<void>;
};

// Initialize the OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Handler function
export const handler = async (payload: Payload, context: Context): Promise<void> => {
  const { logger, emit } = context;
  
  logger.info(`Generating documentation for ${payload.file}`);
  
  const fileContent = payload.content || '';
  const gaps = payload.gaps || [];
  const fileExtension = payload.file.split('.').pop() || '';
  
  for (const gap of gaps) {
    // Extract the code segment needing documentation
    const codeSegment = extractCodeSegment(fileContent, gap, fileExtension);
    
    // Generate documentation using an LLM
    const docComment = await generateDocumentation(codeSegment, gap, fileExtension);
    
    gap.generated_doc = docComment;
  }
  
  await emit({
    topic: "documentation-generated",
    data: {
      ...payload,
      gaps
    }
  });
};

function extractCodeSegment(content: string, gap: Gap, fileExtension: string): string {
  // This is a simplified implementation
  // In a real system, use an AST parser for better code extraction
  if (!content) {
    return "";
  }
    
  const lines = content.split('\n');
  
  // Simple pattern matching to find the relevant code block
  const pattern = `${gap.type}\\s+${gap.name}`;
  const regex = new RegExp(pattern);
  
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      // Extract a reasonable context (the function or class definition)
      let start = i;
      let end = i;
      
      // Find the end of the block (simplistic approach)
      let brackets = 0;
      let inBlock = false;
      
      for (let j = i; j < Math.min(i + 100, lines.length); j++) {
        if (lines[j].includes('{')) {
          brackets += 1;
          inBlock = true;
        }
        if (lines[j].includes('}')) {
          brackets -= 1;
        }
        
        end = j;
        
        // Different languages have different block styles
        if (fileExtension === 'py') {
          // For Python, look for consistent indentation
          if (j > i && (j+1 >= lines.length || 
                       (lines[j+1].trim() && !lines[j+1].startsWith('    ')))) {
            break;
          }
        } else if (inBlock && brackets === 0) {
          // For C-style languages, track braces
          break;
        }
      }
      
      // Return the relevant code segment
      return lines.slice(start, end + 1).join('\n');
    }
  }
  
  return "";
}

async function generateDocumentation(codeSegment: string, gap: Gap, fileExtension: string): Promise<string> {
  // Prepare a prompt for the LLM
  const prompt = `
  Write a clear and concise documentation comment for the following code.
  
  Code:
  \`\`\`${fileExtension}
  ${codeSegment}
  \`\`\`
  
  Documentation format: ${fileExtension === 'js' || fileExtension === 'ts' ? 'JSDoc' : 
                          fileExtension === 'py' ? 'Docstring' : 'Comment'}
  
  Generate only the documentation comment, nothing else.
  `;
  
  try {
    // Call the OpenAI API
    const response = await client.chat.completions.create({
      model: "gpt-4",
      messages: [
        {role: "system", content: "You are a technical documentation expert."},
        {role: "user", content: prompt}
      ],
      temperature: 0.3,
      max_tokens: 500
    });
    
    // Extract the generated documentation
    return response.choices[0].message.content?.trim() || "";
  } catch (e) {
    return `/* Error generating documentation: ${e instanceof Error ? e.message : String(e)} */`;
  }
}