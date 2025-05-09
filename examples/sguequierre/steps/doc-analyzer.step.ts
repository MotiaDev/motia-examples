// steps/doc-analyzer.step.ts
// Configuration section
export const config = {
  type: "event",
  name: "doc-analyzer",
  subscribes: ["file-content-fetched"],
  emits: ["doc-gaps-identified"],
  flows: ["documentation-guardian"]
};

// Type definitions
type Gap = {
  type: string;
  name: string;
  issue: string;
};

type Payload = {
  file: string;
  content: string;
  gaps?: Gap[];
};

type Context = {
  logger: {
    info: (message: string) => void;
    error: (message: string) => void;
  };
  emit: (event: { topic: string; data: any }) => Promise<void>;
};

// Handler function
export const handler = async (payload: Payload, context: Context): Promise<void> => {
  const { logger, emit } = context;
  
  logger.info(`Analyzing documentation for ${payload.file}`);
  
  const fileContent = payload.content;
  const filePath = payload.file;
  const fileExtension = filePath.split('.').pop() || '';
  
  // Different analysis strategies based on file type
  let docGaps: Gap[] = [];
  
  if (['js', 'ts'].includes(fileExtension)) {
    docGaps = analyzeJsTs(fileContent);
  } else if (fileExtension === 'py') {
    docGaps = analyzePython(fileContent);
  } else {
    docGaps = analyzeGeneric(fileContent);
  }
  
  if (!docGaps.length) {
    logger.info(`No documentation gaps found in ${filePath}`);
    return;
  }
  
  // Emit an event with the documentation gaps
  await emit({
    topic: "doc-gaps-identified",
    data: {
      ...payload,
      gaps: docGaps
    }
  });
};

function analyzeJsTs(content: string): Gap[] {
  // Can be improved: could use an AST parser for better analysis
  const functionRegex = /(function\s+(\w+)|(\w+)\s*=\s*function|\(\s*\)\s*=>\s*{)/g;
  const classRegex = /class\s+(\w+)/g;
  
  const gaps: Gap[] = [];
  
  // Check for missing JSDoc comments for functions
  let functionMatch;
  while ((functionMatch = functionRegex.exec(content)) !== null) {
    const funcName = functionMatch[2] || functionMatch[3] || "anonymous";
    const pattern = new RegExp(`/\\*\\*[\\s\\S]*?\\*/\\s*function\\s+${funcName}|/\\*\\*[\\s\\S]*?\\*/\\s*${funcName}\\s*=`);
    
    if (!pattern.test(content)) {
      gaps.push({
        type: "function",
        name: funcName,
        issue: "Missing JSDoc comment"
      });
    }
  }
  
  // Check for missing class documentation
  let classMatch;
  while ((classMatch = classRegex.exec(content)) !== null) {
    const className = classMatch[1];
    const pattern = new RegExp(`/\\*\\*[\\s\\S]*?\\*/\\s*class\\s+${className}`);
    
    if (!pattern.test(content)) {
      gaps.push({
        type: "class",
        name: className,
        issue: "Missing class documentation"
      });
    }
  }
  
  return gaps;
}

function analyzePython(content: string): Gap[] {
  // Check for missing docstrings
  const functionRegex = /def\s+(\w+)\s*\(/g;
  const classRegex = /class\s+(\w+)/g;
  
  const gaps: Gap[] = [];
  
  // Check functions for docstrings
  let functionMatch;
  while ((functionMatch = functionRegex.exec(content)) !== null) {
    const funcName = functionMatch[1];
    const pattern = new RegExp(`def\\s+${funcName}\\s*\\([^)]*\\):\\s*(['\\"]{3}|[\\"']{3})`);
    
    if (!pattern.test(content)) {
      gaps.push({
        type: "function",
        name: funcName,
        issue: "Missing docstring"
      });
    }
  }
  
  // Check classes for docstrings
  let classMatch;
  while ((classMatch = classRegex.exec(content)) !== null) {
    const className = classMatch[1];
    const pattern = new RegExp(`class\\s+${className}[^:]*:\\s*(['\\"]{3}|[\\"']{3})`);
    
    if (!pattern.test(content)) {
      gaps.push({
        type: "class",
        name: className,
        issue: "Missing class docstring"
      });
    }
  }
  
  return gaps;
}

function analyzeGeneric(content: string): Gap[] {
  // Basic heuristic for other languages
  const lines = content.split('\n');
  const gaps: Gap[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/(function|def|class|interface|struct)\s+(\w+)/);
    
    if (match && i > 0) {
      // Check if previous lines have comments
      let hasComment = false;
      
      for (let j = Math.max(0, i-3); j < i; j++) {
        if (lines[j].includes('//') || lines[j].includes('/*') || lines[j].includes('#')) {
          hasComment = true;
          break;
        }
      }
      
      if (!hasComment && match[1] && match[2]) {
        gaps.push({
          type: match[1],
          name: match[2],
          issue: "Missing documentation comment"
        });
      }
    }
  }
  
  return gaps;
}