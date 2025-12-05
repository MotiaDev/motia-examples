/**
 * Senior Software Engineer Agent
 * Powered by Gemini - Writes full Python game code based on architecture design
 */
import { getModel } from './index'
import { ArchitectureDesign, GameSpec } from './architect-agent'

export interface GameCodeFile {
  filename: string
  content: string
  description: string
}

export interface GameCodeOutput {
  files: GameCodeFile[]
  mainEntrypoint: string
  runInstructions: string
  engineerNotes: string
}

const ENGINEER_SYSTEM_PROMPT = `You are a Senior Software Engineer with 12+ years of Python development experience. Your role is to:

1. Implement game code EXACTLY following the provided architecture design
2. Write clean, well-documented, idiomatic Python code
3. Include comprehensive docstrings and inline comments
4. Ensure the code is immediately executable
5. Follow PEP 8 style guidelines

CRITICAL REQUIREMENTS:
- The code MUST be complete and runnable - no TODOs or placeholders
- Include all imports at the top of each file
- Add a proper __main__ block in the entry file
- Use type hints for better code clarity
- Handle edge cases and errors gracefully
- Keep dependencies minimal (prefer standard library)
- For pygame: initialize properly and handle quit events

IMPORTANT JSON FORMATTING:
- Your response MUST be valid JSON
- Escape all special characters in code strings properly
- Use \\n for newlines, \\" for quotes, \\\\ for backslashes
- Do NOT truncate code - include complete implementations
- Keep the JSON structure simple and valid`

/**
 * Attempts to repair malformed JSON from LLM responses
 */
function repairJSON(jsonStr: string): string {
  let repaired = jsonStr.trim()
  
  // Remove markdown code blocks
  repaired = repaired.replace(/^```(?:json)?\s*/i, '')
  repaired = repaired.replace(/\s*```$/i, '')
  
  // Try to find JSON object boundaries
  const firstBrace = repaired.indexOf('{')
  const lastBrace = repaired.lastIndexOf('}')
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    repaired = repaired.substring(firstBrace, lastBrace + 1)
  }
  
  // Fix common JSON issues
  // Fix unescaped newlines in strings (common issue)
  repaired = repaired.replace(/(?<!\\)\\n(?!["\s,}\]])/g, '\\\\n')
  
  // Fix trailing commas before closing brackets
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1')
  
  // Fix missing quotes around property names
  repaired = repaired.replace(/(\{|\,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
  
  return repaired
}

/**
 * Attempts to extract partial results from truncated JSON
 */
function extractPartialResults(jsonStr: string): GameCodeOutput | null {
  try {
    // Try to find at least one complete file in the truncated response
    const filesMatch = jsonStr.match(/"files"\s*:\s*\[([\s\S]*)/i)
    if (!filesMatch) return null
    
    const filesContent = filesMatch[1]
    const files: GameCodeFile[] = []
    
    // Try to extract individual file objects
    const fileRegex = /\{\s*"filename"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"([\s\S]*?)"\s*,\s*"description"\s*:\s*"([^"]*)"\s*\}/g
    let match
    
    while ((match = fileRegex.exec(filesContent)) !== null) {
      files.push({
        filename: match[1],
        content: match[2].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
        description: match[3]
      })
    }
    
    if (files.length > 0) {
      // Find main entrypoint
      const mainFile = files.find(f => f.filename === 'main.py') || files[0]
      
      return {
        files,
        mainEntrypoint: mainFile.filename,
        runInstructions: `python ${mainFile.filename}`,
        engineerNotes: 'Recovered from partial response'
      }
    }
    
    return null
  } catch {
    return null
  }
}

export async function generateGameCode(
  spec: GameSpec, 
  design: ArchitectureDesign,
  retryCount: number = 0
): Promise<GameCodeOutput> {
  const model = getModel()
  
  // Simplify design for simpler games to reduce response size
  const simplifiedDesign = spec.complexity === 'simple' ? {
    overview: design.overview,
    fileStructure: design.fileStructure.slice(0, 2),
    gameLoop: design.gameLoop,
    dependencies: design.dependencies,
  } : design
  
  const prompt = `${ENGINEER_SYSTEM_PROMPT}

ORIGINAL GAME SPECIFICATION:
- Title: ${spec.title}
- Genre: ${spec.genre}
- Mechanics: ${spec.mechanics.join(', ')}
- Theme: ${spec.theme}
- Complexity: ${spec.complexity}

ARCHITECTURE DESIGN TO IMPLEMENT:
${JSON.stringify(simplifiedDesign, null, 2)}

Based on the architecture design above, write the COMPLETE Python game code.

${spec.complexity === 'simple' ? 'For simple games, put ALL code in a SINGLE main.py file.' : ''}

Return ONLY a valid JSON object:
{
  "files": [
    {
      "filename": "main.py",
      "content": "# Your complete Python code here with escaped newlines as \\\\n",
      "description": "Main game file"
    }
  ],
  "mainEntrypoint": "main.py",
  "runInstructions": "python main.py",
  "engineerNotes": "Implementation notes"
}

CRITICAL: 
- Ensure valid JSON - escape special characters properly
- Include COMPLETE code - do not truncate
- For newlines in code, use \\n
- For quotes in code, use \\"`

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 8192, // Increased token limit
        temperature: 0.7,
      },
    })
    
    const response = result.response.text()
    
    // Try multiple parsing strategies
    let codeOutput: GameCodeOutput | null = null
    let lastError: Error | null = null
    
    // Strategy 1: Direct JSON parse
    try {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, response]
      const jsonStr = jsonMatch[1]?.trim() || response.trim()
      codeOutput = JSON.parse(jsonStr) as GameCodeOutput
    } catch (e) {
      lastError = e as Error
    }
    
    // Strategy 2: Repair and parse
    if (!codeOutput) {
      try {
        const repairedJson = repairJSON(response)
        codeOutput = JSON.parse(repairedJson) as GameCodeOutput
      } catch (e) {
        lastError = e as Error
      }
    }
    
    // Strategy 3: Extract partial results
    if (!codeOutput) {
      codeOutput = extractPartialResults(response)
      if (codeOutput) {
        console.warn('Recovered partial results from truncated response')
      }
    }
    
    // Strategy 4: Retry with simpler prompt
    if (!codeOutput && retryCount < 2) {
      console.warn(`JSON parsing failed, retrying (attempt ${retryCount + 2}/3)...`)
      return generateGameCode(spec, design, retryCount + 1)
    }
    
    if (!codeOutput) {
      throw new Error(`Failed to parse engineer response as JSON after ${retryCount + 1} attempts: ${lastError?.message}. Response preview: ${response.substring(0, 300)}...`)
    }
    
    // Validate that we have at least one file
    if (!codeOutput.files || codeOutput.files.length === 0) {
      throw new Error('No game files generated')
    }
    
    // Post-process: unescape content strings
    codeOutput.files = codeOutput.files.map(file => ({
      ...file,
      content: file.content
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
    }))
    
    return codeOutput
    
  } catch (error: any) {
    // If it's a rate limit or API error, retry
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      if (retryCount < 2) {
        console.warn('Rate limited, waiting 5s before retry...')
        await new Promise(resolve => setTimeout(resolve, 5000))
        return generateGameCode(spec, design, retryCount + 1)
      }
    }
    
    throw error
  }
}
