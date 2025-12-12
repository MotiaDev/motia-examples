/**
 * Generator Step (Event Handler)
 * 
 * First stage of the reflection pipeline. Analyzes the contract
 * using Gemini 3 Pro to identify risks, key terms, and issues.
 * Produces a DraftAnalysis that the Critic will review.
 */

import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { getGeminiService } from '../services/gemini-interactions'
import {
  DraftAnalysis,
  DraftAnalysisJsonSchema,
  StoredContract,
  RiskFinding,
} from '../types/contract'

const inputSchema = z.object({
  contractId: z.string(),
  useDeepResearch: z.boolean().default(false),
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
  name: 'ContractGenerator',
  type: 'event',
  description: 'Generator agent: Initial contract analysis using Gemini 3 Pro',
  subscribes: ['contract.requested'],
  emits: [
    { topic: 'analysis.draft_generated', label: 'Draft analysis ready for critique' },
    { topic: 'analysis.failed', label: 'Analysis failed', conditional: true },
  ],
  input: inputSchema,
  flows: ['contract-analysis'],
}

const GENERATOR_SYSTEM_PROMPT = `You are an expert legal contract analyst specializing in risk identification and due diligence. Your task is to analyze contracts and identify potential risks, issues, and areas of concern.

ANALYSIS REQUIREMENTS:
1. Identify 20+ risk categories including but not limited to:
   - Liability gaps and caps
   - Indemnification issues
   - Payment term anomalies
   - IP ownership and assignment issues
   - Confidentiality gaps
   - Compliance violations (GDPR, SOX, etc.)
   - Termination clause issues
   - Auto-renewal risks
   - Change of control provisions
   - Non-compete issues
   - Warranty gaps
   - Force majeure provisions
   - Jurisdiction conflicts
   - Insurance requirements
   - Service level gaps
   - Non-standard or unusual clauses
   - Ambiguous language
   - Missing definitions
   - Conflicting terms

2. For each risk identified:
   - Assign a severity: critical, high, medium, or low
   - Provide the exact text excerpt from the contract
   - Explain why this is a risk
   - Suggest specific action or edit language

3. Also identify:
   - Key terms and their values (deal value, payment terms, term length, etc.)
   - All parties mentioned and their roles
   - Contract duration and renewal terms
   - Total contract value and payment schedule

Be thorough and specific. Flag anything that could be problematic in a business negotiation or legal review.`

export const handler: Handlers['ContractGenerator'] = async (input, { emit, logger, state, streams }) => {
  const startTime = Date.now()
  const { contractId, useDeepResearch, context } = input

  logger.info('Generator started', { contractId, useDeepResearch })

  // Update progress stream immediately
  const progressId = randomUUID()
  await streams.analysisProgress.set(contractId, progressId, {
    id: progressId,
    contractId,
    status: 'generator_running',
    step: 'Generator',
    message: 'AI is analyzing the contract for risks and issues...',
    timestamp: new Date().toISOString(),
    progress: 20,
  })

  // Update contract status immediately so polling sees the change
  const existingContract = await state.get<StoredContract>('contracts', contractId)
  if (existingContract) {
    await state.set('contracts', contractId, {
      ...existingContract,
      status: 'generator_running',
    })
  }

  try {
    // Retrieve contract from state
    const contract = await state.get<StoredContract>('contracts', contractId)
    if (!contract) {
      throw new Error(`Contract not found: ${contractId}`)
    }

    // Build context prompt
    const contextPrompt = context ? `
DEAL CONTEXT:
- Customer: ${context.customerName || 'Not specified'}
- Deal Value: ${context.dealValue ? `${context.dealCurrency || 'USD'} ${context.dealValue.toLocaleString()}` : 'Not specified'}
- Contract Type: ${context.contractType || 'Not specified'}
- Jurisdiction: ${context.jurisdiction || 'Not specified'}
- Urgency: ${context.urgency || 'normal'}
${context.additionalNotes ? `- Additional Notes: ${context.additionalNotes}` : ''}
` : ''

    const analysisPrompt = `${GENERATOR_SYSTEM_PROMPT}

${contextPrompt}

CONTRACT TEXT:
---
${contract.extractedText}
---

Analyze this contract and provide a comprehensive risk assessment in the specified JSON format.`

    // Call Gemini 3 Pro with structured output
    const gemini = getGeminiService()
    
    let response
    if (useDeepResearch) {
      // Use Deep Research agent for comprehensive analysis
      logger.info('Using Deep Research agent', { contractId })
      
      await streams.analysisProgress.set(contractId, progressId, {
        id: progressId,
        contractId,
        status: 'generator_running',
        step: 'Generator (Deep Research)',
        message: 'Deep Research agent is conducting comprehensive analysis...',
        timestamp: new Date().toISOString(),
        progress: 25,
        metadata: { usingDeepResearch: true },
      })

      response = await gemini.deepResearch(analysisPrompt, {
        pollIntervalMs: 5000,
        maxWaitMs: 300000, // 5 minutes max
        onProgress: async (status) => {
          logger.info('Deep Research progress', { contractId, status })
        },
      })
    } else {
      // Use standard Gemini 3 Pro with structured output
      response = await gemini.createStructuredInteraction<any>(
        analysisPrompt,
        DraftAnalysisJsonSchema,
        {
          model: 'gemini-3-pro-preview',
          generationConfig: {
            temperature: 0.3, // Lower temperature for more consistent analysis
            thinkingLevel: 'high',
          },
        }
      )
    }

    // Parse and validate the response
    const analysisData = useDeepResearch ? JSON.parse(response.text) : response.data

    // Generate unique IDs for each risk
    const risks: RiskFinding[] = (analysisData.risks || []).map((risk: any, index: number) => ({
      ...risk,
      id: `risk-${contractId.slice(0, 8)}-${index + 1}`,
      policyViolation: risk.policyViolation || false,
    }))

    // Create draft analysis
    const draftAnalysisId = randomUUID()
    const draftAnalysis: DraftAnalysis = {
      id: draftAnalysisId,
      contractId,
      generatedAt: new Date().toISOString(),
      modelUsed: useDeepResearch ? 'deep-research-pro-preview-12-2025' : 'gemini-3-pro-preview',
      interactionId: response.id,
      risks,
      keyTermsIdentified: analysisData.keyTermsIdentified || [],
      partiesIdentified: analysisData.partiesIdentified || [],
      contractDuration: analysisData.contractDuration,
      totalValue: analysisData.totalValue,
      processingTimeMs: Date.now() - startTime,
    }

    // Store draft analysis in state
    await state.set('draft-analyses', draftAnalysisId, draftAnalysis)

    // Update contract with draft analysis reference
    const updatedContract: StoredContract = {
      ...contract,
      status: 'generator_completed',
      draftAnalysisId,
    }
    await state.set('contracts', contractId, updatedContract)

    // Update progress stream
    await streams.analysisProgress.set(contractId, progressId, {
      id: progressId,
      contractId,
      status: 'generator_completed',
      step: 'Generator',
      message: `Draft analysis complete. Found ${risks.length} potential risks. Starting Critic review...`,
      timestamp: new Date().toISOString(),
      progress: 40,
      metadata: {
        risksFound: risks.length,
        criticalRisks: risks.filter(r => r.severity === 'critical').length,
        highRisks: risks.filter(r => r.severity === 'high').length,
      },
    })

    logger.info('Generator completed', {
      contractId,
      draftAnalysisId,
      risksFound: risks.length,
      processingTimeMs: Date.now() - startTime,
    })

    // Emit event to trigger Critic step
    await emit({
      topic: 'analysis.draft_generated',
      data: {
        contractId,
        draftAnalysisId,
        context,
      },
    })

  } catch (error) {
    logger.error('Generator failed', {
      contractId,
      error: (error as Error).message,
      stack: (error as Error).stack,
    })

    // Update progress stream - failed
    await streams.analysisProgress.set(contractId, progressId, {
      id: progressId,
      contractId,
      status: 'failed',
      step: 'Generator',
      message: `Analysis failed: ${(error as Error).message}`,
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
        step: 'generator',
        error: (error as Error).message,
      },
    })
  }
}

