/**
 * Critic Step (Event Handler)
 * 
 * Second stage of the reflection pipeline. Meta-analyzes the
 * Generator's draft analysis to identify:
 * - False positives (over-flagged issues)
 * - Missed policy violations
 * - Inaccurate severity ratings
 * - Unclear or non-actionable recommendations
 */

import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { getGeminiService } from '../services/gemini-interactions'
import {
  Critique,
  CritiqueJsonSchema,
  DraftAnalysis,
  StoredContract,
  CritiqueEdit,
  MissedPolicy,
} from '../types/contract'

const inputSchema = z.object({
  contractId: z.string(),
  draftAnalysisId: z.string(),
  context: z.object({
    customerName: z.string().optional(),
    dealValue: z.number().optional(),
    dealCurrency: z.string().optional(),
    contractType: z.string().optional(),
    jurisdiction: z.string().optional(),
    urgency: z.string().optional(),
    additionalNotes: z.string().optional(),
  }).optional(),
})

export const config: EventConfig = {
  name: 'ContractCritic',
  type: 'event',
  description: 'Critic agent: Meta-analysis of draft findings for accuracy and completeness',
  subscribes: ['analysis.draft_generated'],
  emits: [
    { topic: 'analysis.critique_completed', label: 'Critique ready for refinement' },
    { topic: 'analysis.failed', label: 'Analysis failed', conditional: true },
  ],
  input: inputSchema,
  flows: ['contract-analysis'],
}

// Simplified system prompt - policies are embedded in the critique prompt

export const handler: Handlers['ContractCritic'] = async (input, { emit, logger, state, streams }) => {
  const startTime = Date.now()
  const { contractId, draftAnalysisId, context } = input

  logger.info('Critic started', { contractId, draftAnalysisId })

  // Update progress stream immediately
  const progressId = randomUUID()
  await streams.analysisProgress.set(contractId, progressId, {
    id: progressId,
    contractId,
    status: 'critic_running',
    step: 'Critic',
    message: 'AI is reviewing and validating the draft analysis...',
    timestamp: new Date().toISOString(),
    progress: 50,
  })

  // Update contract status immediately so polling sees the change
  const existingContract = await state.get<StoredContract>('contracts', contractId)
  if (existingContract) {
    await state.set('contracts', contractId, {
      ...existingContract,
      status: 'critic_running',
    })
  }

  try {
    // Retrieve draft analysis from state
    const draftAnalysis = await state.get<DraftAnalysis>('draft-analyses', draftAnalysisId)
    if (!draftAnalysis) {
      throw new Error(`Draft analysis not found: ${draftAnalysisId}`)
    }

    // Retrieve original contract for context
    const contract = await state.get<StoredContract>('contracts', contractId)
    if (!contract) {
      throw new Error(`Contract not found: ${contractId}`)
    }

    // Build context prompt
    const dealContext = context ? `
DEAL CONTEXT:
- Customer: ${context.customerName || 'Not specified'}
- Deal Value: ${context.dealValue ? `${context.dealCurrency || 'USD'} ${context.dealValue.toLocaleString()}` : 'Not specified'}
- Contract Type: ${context.contractType || 'Not specified'}
- Jurisdiction: ${context.jurisdiction || 'Not specified'}
- Urgency: ${context.urgency || 'normal'}
` : ''

    // Format draft analysis for review
    const draftSummary = `
DRAFT ANALYSIS TO REVIEW:
========================

Total Risks Found: ${draftAnalysis.risks.length}
- Critical: ${draftAnalysis.risks.filter(r => r.severity === 'critical').length}
- High: ${draftAnalysis.risks.filter(r => r.severity === 'high').length}
- Medium: ${draftAnalysis.risks.filter(r => r.severity === 'medium').length}
- Low: ${draftAnalysis.risks.filter(r => r.severity === 'low').length}

INDIVIDUAL FINDINGS:
${draftAnalysis.risks.map((risk, i) => `
${i + 1}. [${risk.id}] ${risk.title}
   Severity: ${risk.severity.toUpperCase()}
   Category: ${risk.category}
   Excerpt: "${risk.excerpt}"
   Explanation: ${risk.explanation}
   Suggested Action: ${risk.suggestedAction}
   ${risk.suggestedEditLanguage ? `Suggested Edit: "${risk.suggestedEditLanguage}"` : ''}
`).join('\n')}

KEY TERMS IDENTIFIED:
${draftAnalysis.keyTermsIdentified.map(t => `- ${t.term}: ${t.value}`).join('\n')}

PARTIES:
${draftAnalysis.partiesIdentified.map(p => `- ${p.name} (${p.role})`).join('\n')}
`

    // Simplified prompt for faster response
    const riskIds = draftAnalysis.risks.map(r => r.id)
    const critiquePrompt = `Evaluate this contract risk analysis. Be concise.

${dealContext}

RISKS FOUND: ${draftAnalysis.risks.length}
${draftAnalysis.risks.slice(0, 5).map((r, i) => `${i+1}. [${r.id}] ${r.severity}: ${r.title}`).join('\n')}

Return ONLY valid JSON (no markdown, keep reasons SHORT):
{
  "qualityScore": 75,
  "accuracyScore": 70,
  "completenessScore": 80,
  "actionabilityScore": 75,
  "edits": [{"riskId": "${riskIds[0] || 'risk-1'}", "action": "keep", "reason": "Valid concern"}],
  "priorityReorder": ${JSON.stringify(riskIds.slice(0, 5))},
  "missedPolicies": [],
  "falsePositives": [],
  "overallAssessment": "Brief 1-sentence assessment"
}`

    // Use flash model with higher token limit
    const gemini = getGeminiService()
    const response = await gemini.createStructuredInteraction<any>(
      critiquePrompt,
      CritiqueJsonSchema,
      {
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      }
    )

    const critiqueData = response.data

    // Create critique object
    const critiqueId = randomUUID()
    const critique: Critique = {
      id: critiqueId,
      contractId,
      draftAnalysisId,
      generatedAt: new Date().toISOString(),
      modelUsed: 'gemini-3-pro-preview',
      interactionId: response.id,
      qualityScore: critiqueData.qualityScore,
      accuracyScore: critiqueData.accuracyScore,
      completenessScore: critiqueData.completenessScore,
      actionabilityScore: critiqueData.actionabilityScore,
      edits: critiqueData.edits as CritiqueEdit[],
      priorityReorder: critiqueData.priorityReorder,
      missedPolicies: critiqueData.missedPolicies as MissedPolicy[],
      falsePositives: critiqueData.falsePositives || [],
      overallAssessment: critiqueData.overallAssessment,
      processingTimeMs: Date.now() - startTime,
    }

    // Store critique in state
    await state.set('critiques', critiqueId, critique)

    // Update contract with critique reference
    const updatedContract: StoredContract = {
      ...contract,
      status: 'critic_completed',
      critiqueId,
    }
    await state.set('contracts', contractId, updatedContract)

    // Update progress stream
    await streams.analysisProgress.set(contractId, progressId, {
      id: progressId,
      contractId,
      status: 'critic_completed',
      step: 'Critic',
      message: `Critique complete. Quality score: ${critique.qualityScore}/100. Found ${critique.falsePositives.length} false positives, ${critique.missedPolicies.length} missed policies. Starting Refiner...`,
      timestamp: new Date().toISOString(),
      progress: 70,
      metadata: {
        qualityScore: critique.qualityScore,
        falsePositives: critique.falsePositives.length,
        missedPolicies: critique.missedPolicies.length,
        editsProposed: critique.edits.length,
      },
    })

    logger.info('Critic completed', {
      contractId,
      critiqueId,
      qualityScore: critique.qualityScore,
      falsePositives: critique.falsePositives.length,
      missedPolicies: critique.missedPolicies.length,
      processingTimeMs: Date.now() - startTime,
    })

    // Emit event to trigger Refiner step
    await emit({
      topic: 'analysis.critique_completed',
      data: {
        contractId,
        draftAnalysisId,
        critiqueId,
        context,
      },
    })

  } catch (error) {
    logger.error('Critic failed', {
      contractId,
      error: (error as Error).message,
      stack: (error as Error).stack,
    })

    // Update progress stream - failed
    await streams.analysisProgress.set(contractId, progressId, {
      id: progressId,
      contractId,
      status: 'failed',
      step: 'Critic',
      message: `Critique failed: ${(error as Error).message}`,
      timestamp: new Date().toISOString(),
      progress: 0,
    })

    // Update contract status
    const contract = await state.get<StoredContract>('contracts', contractId)
    if (contract) {
      await state.set('contracts', contractId, {
        ...contract,
        status: 'failed',
        error: (error as Error).message,
      })
    }

    // Emit failure event
    await emit({
      topic: 'analysis.failed',
      data: {
        contractId,
        step: 'critic',
        error: (error as Error).message,
      },
    })
  }
}

