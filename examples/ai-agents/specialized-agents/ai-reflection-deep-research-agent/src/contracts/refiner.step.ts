/**
 * Refiner Step (Event Handler)
 * 
 * Final stage of the reflection pipeline. Synthesizes the draft
 * analysis and critique into a polished, actionable report with:
 * - Executive summary
 * - Prioritized risk list with confidence scores
 * - Specific edit language for negotiations
 * - Recommended next steps
 */

import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { getGeminiService } from '../services/gemini-interactions'
import {
  RefinedAnalysis,
  RefinedAnalysisJsonSchema,
  DraftAnalysis,
  Critique,
  StoredContract,
  RefinedRisk,
  RecommendedAction,
} from '../types/contract'

const inputSchema = z.object({
  contractId: z.string(),
  draftAnalysisId: z.string(),
  critiqueId: z.string(),
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
  name: 'ContractRefiner',
  type: 'event',
  description: 'Refiner agent: Synthesize draft and critique into final actionable analysis',
  subscribes: ['analysis.critique_completed'],
  emits: [
    { topic: 'analysis.completed', label: 'Final analysis ready' },
    { topic: 'analysis.failed', label: 'Analysis failed', conditional: true },
  ],
  input: inputSchema,
  flows: ['contract-analysis'],
}

// Simplified - prompt is embedded in the handler

export const handler: Handlers['ContractRefiner'] = async (input, { emit, logger, state, streams }) => {
  const startTime = Date.now()
  const { contractId, draftAnalysisId, critiqueId, context } = input

  logger.info('Refiner started', { contractId, draftAnalysisId, critiqueId })

  // Update progress stream immediately
  const progressId = randomUUID()
  await streams.analysisProgress.set(contractId, progressId, {
    id: progressId,
    contractId,
    status: 'refiner_running',
    step: 'Refiner',
    message: 'AI is synthesizing the final analysis report...',
    timestamp: new Date().toISOString(),
    progress: 80,
  })

  // Update contract status immediately so polling sees the change
  const existingContract = await state.get<StoredContract>('contracts', contractId)
  if (existingContract) {
    await state.set('contracts', contractId, {
      ...existingContract,
      status: 'refiner_running',
    })
  }

  try {
    // Retrieve all artifacts from state
    const [draftAnalysis, critique, contract] = await Promise.all([
      state.get<DraftAnalysis>('draft-analyses', draftAnalysisId),
      state.get<Critique>('critiques', critiqueId),
      state.get<StoredContract>('contracts', contractId),
    ])

    if (!draftAnalysis) {
      throw new Error(`Draft analysis not found: ${draftAnalysisId}`)
    }
    if (!critique) {
      throw new Error(`Critique not found: ${critiqueId}`)
    }
    if (!contract) {
      throw new Error(`Contract not found: ${contractId}`)
    }

    // Calculate pipeline time so far
    const contractCreated = new Date(contract.createdAt).getTime()
    const pipelineElapsed = Date.now() - contractCreated

    // Build synthesis prompt
    const dealContext = context ? `
DEAL CONTEXT:
- Customer: ${context.customerName || 'Not specified'}
- Deal Value: ${context.dealValue ? `${context.dealCurrency || 'USD'} ${context.dealValue.toLocaleString()}` : 'Not specified'}
- Contract Type: ${context.contractType || 'Not specified'}
- Jurisdiction: ${context.jurisdiction || 'Not specified'}
- Urgency: ${context.urgency || 'normal'}
` : ''

    // Format draft analysis
    const draftSummary = `
DRAFT ANALYSIS (Generator Output):
=================================
Total Risks: ${draftAnalysis.risks.length}
Processing Time: ${draftAnalysis.processingTimeMs}ms

FINDINGS:
${draftAnalysis.risks.map((risk, i) => `
${i + 1}. [${risk.id}] ${risk.title} [${risk.severity.toUpperCase()}]
   Category: ${risk.category}
   Excerpt: "${risk.excerpt}"
   Explanation: ${risk.explanation}
   Suggested Action: ${risk.suggestedAction}
   ${risk.suggestedEditLanguage ? `Suggested Edit: "${risk.suggestedEditLanguage}"` : ''}
`).join('\n')}

KEY TERMS:
${draftAnalysis.keyTermsIdentified.map(t => `- ${t.term}: ${t.value}`).join('\n')}
`

    // Format critique
    const critiqueSummary = `
CRITIQUE (Critic Output):
========================
Quality Score: ${critique.qualityScore}/100
Accuracy: ${critique.accuracyScore}/100
Completeness: ${critique.completenessScore}/100
Actionability: ${critique.actionabilityScore}/100

OVERALL ASSESSMENT:
${critique.overallAssessment}

FALSE POSITIVES TO REMOVE:
${critique.falsePositives.length > 0 ? critique.falsePositives.join(', ') : 'None identified'}

MISSED POLICIES TO ADD:
${critique.missedPolicies.length > 0 ? critique.missedPolicies.map(p => 
  `- ${p.policyName} [${p.severity.toUpperCase()}]: ${p.policyDescription}`
).join('\n') : 'None identified'}

EDITS TO FINDINGS:
${critique.edits.map(edit => 
  `- [${edit.riskId}] ${edit.action.toUpperCase()}: ${edit.reason}${edit.newSeverity ? ` (new severity: ${edit.newSeverity})` : ''}`
).join('\n')}

SUGGESTED PRIORITY ORDER:
${critique.priorityReorder.join(' > ')}
`

    // Concise prompt - limit output to top 5 risks to avoid truncation
    const refinerPrompt = `Create a final contract risk report.

${dealContext}

DRAFT FINDINGS (keep top 5, remove false positives):
${draftAnalysis.risks.slice(0, 5).map((r, i) => `${i+1}. [${r.severity}] ${r.title}: ${r.description.slice(0, 100)}`).join('\n')}

CRITIQUE SUMMARY:
Quality: ${critique.qualityScore}/100
False positives to remove: ${critique.falsePositives.join(', ') || 'None'}
Missed policies: ${critique.missedPolicies.length}

Return ONLY valid JSON (no markdown):
{
  "executiveSummary": "1-2 sentence overview",
  "overallScore": 0-100,
  "recommendedAction": "approve_as_is|request_minor_amendments|request_major_amendments|escalate_to_gc|reject",
  "risks": [{"id": "string", "category": "string", "severity": "critical|high|medium|low", "title": "string", "description": "string", "excerpt": "string", "suggestedEditLanguage": "string", "confidenceScore": 0-100, "policyViolation": false}],
  "risksBySeverity": {"critical": 0, "high": 0, "medium": 0, "low": 0},
  "keyNegotiationPoints": [{"point": "string", "priority": 1, "suggestedApproach": "string"}],
  "actionItems": [{"action": "string", "priority": "immediate|high|medium|low"}]
}`

    // Use flash model with enough tokens for the full response
    const gemini = getGeminiService()
    const response = await gemini.createStructuredInteraction<any>(
      refinerPrompt,
      RefinedAnalysisJsonSchema,
      {
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192, // Increased for full JSON response
        },
      }
    )

    const refinedData = response.data

    // Assign IDs to refined risks
    const refinedRisks: RefinedRisk[] = (refinedData.risks || []).map((risk: any, index: number) => ({
      ...risk,
      id: risk.id || `refined-${contractId.slice(0, 8)}-${index + 1}`,
    }))

    // Create refined analysis
    const refinedAnalysisId = randomUUID()
    const totalPipelineTime = Date.now() - contractCreated
    
    const refinedAnalysis: RefinedAnalysis = {
      id: refinedAnalysisId,
      contractId,
      generatedAt: new Date().toISOString(),
      modelUsed: 'gemini-3-pro-preview',
      interactionId: response.id,
      executiveSummary: refinedData.executiveSummary,
      overallScore: refinedData.overallScore,
      recommendedAction: refinedData.recommendedAction as RecommendedAction,
      risks: refinedRisks,
      risksBySeverity: refinedData.risksBySeverity,
      keyNegotiationPoints: refinedData.keyNegotiationPoints,
      actionItems: refinedData.actionItems,
      processingTimeMs: Date.now() - startTime,
      totalPipelineTimeMs: totalPipelineTime,
      versionsUsed: {
        draftAnalysisId,
        critiqueId,
      },
    }

    // Store refined analysis in state
    await state.set('refined-analyses', refinedAnalysisId, refinedAnalysis)

    // Update contract with final analysis reference
    const updatedContract: StoredContract = {
      ...contract,
      status: 'completed',
      refinedAnalysisId,
    }
    await state.set('contracts', contractId, updatedContract)

    // Update progress stream - completed
    await streams.analysisProgress.set(contractId, progressId, {
      id: progressId,
      contractId,
      status: 'completed',
      step: 'Complete',
      message: `Analysis complete! Overall score: ${refinedAnalysis.overallScore}/100. Recommendation: ${refinedAnalysis.recommendedAction.replace(/_/g, ' ')}`,
      timestamp: new Date().toISOString(),
      progress: 100,
      metadata: {
        overallScore: refinedAnalysis.overallScore,
        recommendedAction: refinedAnalysis.recommendedAction,
        totalRisks: refinedRisks.length,
        criticalRisks: refinedRisks.filter(r => r.severity === 'critical').length,
        highRisks: refinedRisks.filter(r => r.severity === 'high').length,
        totalPipelineTimeMs: totalPipelineTime,
      },
    })

    logger.info('Refiner completed', {
      contractId,
      refinedAnalysisId,
      overallScore: refinedAnalysis.overallScore,
      recommendedAction: refinedAnalysis.recommendedAction,
      totalRisks: refinedRisks.length,
      processingTimeMs: Date.now() - startTime,
      totalPipelineTimeMs: totalPipelineTime,
    })

    // Emit completion event
    await emit({
      topic: 'analysis.completed',
      data: {
        contractId,
        refinedAnalysisId,
        overallScore: refinedAnalysis.overallScore,
        recommendedAction: refinedAnalysis.recommendedAction,
        riskCount: refinedRisks.length,
      },
    })

  } catch (error) {
    logger.error('Refiner failed', {
      contractId,
      error: (error as Error).message,
      stack: (error as Error).stack,
    })

    // Update progress stream - failed
    await streams.analysisProgress.set(contractId, progressId, {
      id: progressId,
      contractId,
      status: 'failed',
      step: 'Refiner',
      message: `Refinement failed: ${(error as Error).message}`,
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
        step: 'refiner',
        error: (error as Error).message,
      },
    })
  }
}

