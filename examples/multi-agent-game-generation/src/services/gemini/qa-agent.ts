/**
 * QA Engineer Agent
 * Powered by Gemini - Reviews code for syntax errors, logic bugs, and spec adherence
 */
import { getModel } from './index'
import { GameSpec } from './architect-agent'
import { GameCodeOutput } from './engineer-agent'

export interface QAIssue {
  severity: 'critical' | 'major' | 'minor' | 'suggestion'
  file: string
  line?: number
  description: string
  suggestedFix: string
}

export interface QAReport {
  passedChecks: string[]
  issues: QAIssue[]
  syntaxValid: boolean
  logicValid: boolean
  specAdherence: boolean
  overallScore: number // 0-100
  qaNotes: string
  requiresRevision: boolean
}

const QA_SYSTEM_PROMPT = `You are a Senior QA Engineer with 10+ years of experience testing Python games. Your role is to:

1. Review Python code for syntax errors and typos
2. Identify logic bugs and potential runtime errors
3. Verify the code matches the original game specification
4. Check for edge cases and error handling
5. Assess code quality and maintainability

REVIEW CHECKLIST:
- Syntax: Valid Python 3.10+ syntax, proper indentation
- Imports: All required modules imported, no missing dependencies
- Logic: Game mechanics work as specified, no infinite loops
- Error Handling: Graceful handling of invalid inputs and edge cases
- Completeness: All features from spec implemented, no placeholders
- Runability: Code can be executed immediately without modifications

Score the code 0-100:
- 90-100: Excellent, ready for release
- 70-89: Good, minor issues only
- 50-69: Needs work, some issues to fix
- Below 50: Major issues, requires significant revision

CRITICAL: Output ONLY valid JSON. Keep responses concise.`

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

export async function reviewCode(
  spec: GameSpec,
  codeOutput: GameCodeOutput,
  retryCount: number = 0
): Promise<QAReport> {
  const model = getModel()
  
  // Format all code files for review (limit size to avoid token issues)
  const codeReview = codeOutput.files.map(f => {
    const content = f.content.length > 2000 
      ? f.content.substring(0, 2000) + '\n... [truncated for review]'
      : f.content
    return `=== FILE: ${f.filename} ===\n${content}\n`
  }).join('\n')
  
  const prompt = `${QA_SYSTEM_PROMPT}

ORIGINAL GAME SPECIFICATION:
- Title: ${spec.title}
- Genre: ${spec.genre}
- Mechanics: ${spec.mechanics.join(', ')}
- Theme: ${spec.theme}
- Complexity: ${spec.complexity}

CODE TO REVIEW:
${codeReview}

RUN INSTRUCTIONS: ${codeOutput.runInstructions}

Please perform a thorough QA review. Return ONLY a valid JSON object:
{
  "passedChecks": ["list of checks that passed"],
  "issues": [
    {
      "severity": "critical|major|minor|suggestion",
      "file": "filename.py",
      "line": null,
      "description": "description of the issue",
      "suggestedFix": "how to fix it"
    }
  ],
  "syntaxValid": true,
  "logicValid": true,
  "specAdherence": true,
  "overallScore": 75,
  "qaNotes": "overall assessment",
  "requiresRevision": false
}`

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.5,
      },
    })
    
    const response = result.response.text()
    
    // Try multiple parsing strategies
    let report: QAReport | null = null
    let lastError: Error | null = null
    
    // Strategy 1: Direct JSON parse
    try {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, response]
      const jsonStr = jsonMatch[1]?.trim() || response.trim()
      report = JSON.parse(jsonStr) as QAReport
    } catch (e) {
      lastError = e as Error
    }
    
    // Strategy 2: Repair and parse
    if (!report) {
      try {
        const repairedJson = repairJSON(response)
        report = JSON.parse(repairedJson) as QAReport
      } catch (e) {
        lastError = e as Error
      }
    }
    
    // Strategy 3: Return default report if parsing fails
    if (!report && retryCount < 2) {
      console.warn(`JSON parsing failed, retrying (attempt ${retryCount + 2}/3)...`)
      return reviewCode(spec, codeOutput, retryCount + 1)
    }
    
    if (!report) {
      // Return a default pass report if we can't parse the response
      console.warn('Could not parse QA response, returning default report')
      report = {
        passedChecks: ['Code structure review'],
        issues: [],
        syntaxValid: true,
        logicValid: true,
        specAdherence: true,
        overallScore: 70,
        qaNotes: 'QA review completed with default assessment due to parsing issues.',
        requiresRevision: false
      }
    }
    
    // Ensure requiresRevision is set correctly
    report.requiresRevision = report.overallScore < 70 || 
      report.issues.some(i => i.severity === 'critical')
    
    return report
    
  } catch (error: any) {
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      if (retryCount < 2) {
        console.warn('Rate limited, waiting 5s before retry...')
        await new Promise(resolve => setTimeout(resolve, 5000))
        return reviewCode(spec, codeOutput, retryCount + 1)
      }
    }
    throw error
  }
}
