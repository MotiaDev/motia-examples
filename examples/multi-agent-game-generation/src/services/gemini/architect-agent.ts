/**
 * Senior Game Architect Agent
 * Powered by Gemini - Reviews spec and designs game structure
 */
import { getModel } from './index'

export interface GameSpec {
  title: string
  genre: string
  mechanics: string[]
  theme: string
  targetAudience: string
  complexity: 'simple' | 'medium' | 'complex'
  additionalRequirements?: string
}

export interface ArchitectureDesign {
  gameTitle: string
  overview: string
  fileStructure: {
    filename: string
    purpose: string
    classes: string[]
    functions: string[]
  }[]
  classHierarchy: {
    className: string
    parentClass?: string
    description: string
    methods: string[]
    properties: string[]
  }[]
  coreAlgorithms: {
    name: string
    purpose: string
    pseudocode: string
  }[]
  gameLoop: string
  stateManagement: string
  inputHandling: string
  renderingApproach: string
  dependencies: string[]
  estimatedComplexity: string
  architectNotes: string
}

const ARCHITECT_SYSTEM_PROMPT = `You are a Senior Game Architect with 15+ years of experience designing Python games. Your role is to:

1. Analyze game specifications and create detailed architectural designs
2. Define clear file structures with separation of concerns
3. Design class hierarchies following OOP best practices
4. Plan core algorithms with pseudocode
5. Consider maintainability, readability, and extensibility

IMPORTANT GUIDELINES:
- Design for Python 3.10+ using standard library (pygame is allowed for graphics if needed)
- Keep designs simple and executable - users should run the game immediately
- Include comprehensive docstrings and comments in your design
- Focus on clean, idiomatic Python code structure
- For "simple" complexity: single file, basic mechanics
- For "medium" complexity: 2-3 files, moderate mechanics
- For "complex" complexity: 4-5 files, advanced mechanics

CRITICAL: Output ONLY valid JSON. Escape special characters properly.`

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
  
  // Fix trailing commas before closing brackets
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1')
  
  return repaired
}

export async function generateArchitectureDesign(
  spec: GameSpec,
  retryCount: number = 0
): Promise<ArchitectureDesign> {
  const model = getModel()
  
  const prompt = `${ARCHITECT_SYSTEM_PROMPT}

GAME SPECIFICATION:
- Title: ${spec.title}
- Genre: ${spec.genre}
- Mechanics: ${spec.mechanics.join(', ')}
- Theme: ${spec.theme}
- Target Audience: ${spec.targetAudience}
- Complexity Level: ${spec.complexity}
${spec.additionalRequirements ? `- Additional Requirements: ${spec.additionalRequirements}` : ''}

Please design the complete game architecture. Return ONLY a valid JSON object with this structure:
{
  "gameTitle": "string",
  "overview": "string describing the game concept and how it plays",
  "fileStructure": [{ "filename": "string", "purpose": "string", "classes": ["string"], "functions": ["string"] }],
  "classHierarchy": [{ "className": "string", "parentClass": "string or null", "description": "string", "methods": ["string"], "properties": ["string"] }],
  "coreAlgorithms": [{ "name": "string", "purpose": "string", "pseudocode": "string" }],
  "gameLoop": "string describing the main game loop",
  "stateManagement": "string describing how game state is managed",
  "inputHandling": "string describing input handling approach",
  "renderingApproach": "string describing how the game renders (console/pygame/etc)",
  "dependencies": ["list of Python packages needed, prefer standard library"],
  "estimatedComplexity": "string with complexity assessment",
  "architectNotes": "string with any important implementation notes"
}

${spec.complexity === 'simple' ? 'For simple complexity: Design a SINGLE FILE solution with minimal classes.' : ''}`

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.7,
      },
    })
    
    const response = result.response.text()
    
    // Try multiple parsing strategies
    let design: ArchitectureDesign | null = null
    let lastError: Error | null = null
    
    // Strategy 1: Direct JSON parse
    try {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, response]
      const jsonStr = jsonMatch[1]?.trim() || response.trim()
      design = JSON.parse(jsonStr) as ArchitectureDesign
    } catch (e) {
      lastError = e as Error
    }
    
    // Strategy 2: Repair and parse
    if (!design) {
      try {
        const repairedJson = repairJSON(response)
        design = JSON.parse(repairedJson) as ArchitectureDesign
      } catch (e) {
        lastError = e as Error
      }
    }
    
    // Strategy 3: Retry
    if (!design && retryCount < 2) {
      console.warn(`JSON parsing failed, retrying (attempt ${retryCount + 2}/3)...`)
      return generateArchitectureDesign(spec, retryCount + 1)
    }
    
    if (!design) {
      throw new Error(`Failed to parse architect response as JSON: ${lastError?.message}. Response preview: ${response.substring(0, 300)}...`)
    }
    
    return design
    
  } catch (error: any) {
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      if (retryCount < 2) {
        console.warn('Rate limited, waiting 5s before retry...')
        await new Promise(resolve => setTimeout(resolve, 5000))
        return generateArchitectureDesign(spec, retryCount + 1)
      }
    }
    throw error
  }
}
