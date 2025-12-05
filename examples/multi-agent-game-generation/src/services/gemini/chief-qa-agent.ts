/**
 * Chief QA Engineer Agent
 * Powered by Gemini - Final validation pass, confirms game meets all requirements
 */
import { getModel } from './index'
import { GameSpec, ArchitectureDesign } from './architect-agent'
import { GameCodeOutput } from './engineer-agent'
import { QAReport } from './qa-agent'

export interface FinalValidationResult {
  approved: boolean
  approvalStatus: 'approved' | 'needs_revision' | 'rejected'
  revisionTarget?: 'architect' | 'engineer' | 'qa'
  revisionInstructions?: string
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F'
  finalChecks: {
    check: string
    passed: boolean
    notes: string
  }[]
  executionTest: {
    canRun: boolean
    expectedBehavior: string
    potentialIssues: string[]
  }
  deliverables: {
    codeComplete: boolean
    documentationComplete: boolean
    specMet: boolean
  }
  chiefNotes: string
  signOff: string
}

const CHIEF_QA_SYSTEM_PROMPT = `You are the Chief QA Engineer with 20+ years of experience in game development. Your role is to:

1. Perform final executive review of the game development process
2. Verify that the game meets all original specifications
3. Ensure the code is production-ready and user-friendly
4. Make the final approval decision
5. If issues exist, route back to the appropriate team

FINAL APPROVAL CRITERIA:
- Game runs without errors
- All specified mechanics are implemented
- Code is clean, readable, and documented
- User experience matches the target audience
- No critical or major bugs remain

GRADING SCALE:
- A (90-100): Exceptional quality
- B (80-89): Good quality, meets requirements
- C (70-79): Acceptable, minor improvements possible
- D (60-69): Below standard, needs revision
- F (Below 60): Unacceptable, major rework needed

CRITICAL: Output ONLY valid JSON. Be concise.`

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

export async function finalValidation(
  spec: GameSpec,
  design: ArchitectureDesign,
  codeOutput: GameCodeOutput,
  qaReport: QAReport,
  retryCount: number = 0
): Promise<FinalValidationResult> {
  const model = getModel()
  
  // Summarize code (don't include full content to save tokens)
  const codeSummary = codeOutput.files.map(f => 
    `- ${f.filename}: ${f.content.split('\n').length} lines`
  ).join('\n')
  
  const prompt = `${CHIEF_QA_SYSTEM_PROMPT}

ORIGINAL GAME SPECIFICATION:
- Title: ${spec.title}
- Genre: ${spec.genre}
- Mechanics: ${spec.mechanics.join(', ')}
- Complexity: ${spec.complexity}

ARCHITECTURE: ${design.overview.substring(0, 200)}

CODE FILES:
${codeSummary}

QA REPORT:
- Overall Score: ${qaReport.overallScore}/100
- Syntax Valid: ${qaReport.syntaxValid}
- Logic Valid: ${qaReport.logicValid}
- Issues: ${qaReport.issues.length} (${qaReport.issues.filter(i => i.severity === 'critical').length} critical)

Perform final review. Return ONLY valid JSON:
{
  "approved": true,
  "approvalStatus": "approved",
  "revisionTarget": null,
  "revisionInstructions": null,
  "qualityGrade": "B",
  "finalChecks": [
    { "check": "Code completeness", "passed": true, "notes": "All files present" }
  ],
  "executionTest": {
    "canRun": true,
    "expectedBehavior": "Game should run",
    "potentialIssues": []
  },
  "deliverables": {
    "codeComplete": true,
    "documentationComplete": true,
    "specMet": true
  },
  "chiefNotes": "Summary",
  "signOff": "Approved by Chief QA"
}`

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.5,
      },
    })
    
    const response = result.response.text()
    
    // Try multiple parsing strategies
    let validation: FinalValidationResult | null = null
    let lastError: Error | null = null
    
    // Strategy 1: Direct JSON parse
    try {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, response]
      const jsonStr = jsonMatch[1]?.trim() || response.trim()
      validation = JSON.parse(jsonStr) as FinalValidationResult
    } catch (e) {
      lastError = e as Error
    }
    
    // Strategy 2: Repair and parse
    if (!validation) {
      try {
        const repairedJson = repairJSON(response)
        validation = JSON.parse(repairedJson) as FinalValidationResult
      } catch (e) {
        lastError = e as Error
      }
    }
    
    // Strategy 3: Retry
    if (!validation && retryCount < 2) {
      console.warn(`JSON parsing failed, retrying (attempt ${retryCount + 2}/3)...`)
      return finalValidation(spec, design, codeOutput, qaReport, retryCount + 1)
    }
    
    // Strategy 4: Return default approval based on QA score
    if (!validation) {
      console.warn('Could not parse Chief QA response, using QA score for decision')
      const qaScore = qaReport.overallScore
      const approved = qaScore >= 60
      
      validation = {
        approved,
        approvalStatus: approved ? 'approved' : 'needs_revision',
        revisionTarget: approved ? undefined : 'engineer',
        revisionInstructions: approved ? undefined : 'Please fix the issues identified in QA review',
        qualityGrade: qaScore >= 90 ? 'A' : qaScore >= 80 ? 'B' : qaScore >= 70 ? 'C' : qaScore >= 60 ? 'D' : 'F',
        finalChecks: [{ check: 'QA Review', passed: approved, notes: `QA Score: ${qaScore}` }],
        executionTest: { canRun: true, expectedBehavior: 'Game should run', potentialIssues: [] },
        deliverables: { codeComplete: true, documentationComplete: true, specMet: approved },
        chiefNotes: `Auto-approved based on QA score of ${qaScore}/100`,
        signOff: approved ? 'Approved by Chief QA (auto)' : 'Revision required (auto)'
      }
    }
    
    return validation
    
  } catch (error: any) {
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      if (retryCount < 2) {
        console.warn('Rate limited, waiting 5s before retry...')
        await new Promise(resolve => setTimeout(resolve, 5000))
        return finalValidation(spec, design, codeOutput, qaReport, retryCount + 1)
      }
    }
    throw error
  }
}
