/**
 * Generate Contract API Step
 * 
 * POST /contracts/generate
 * 
 * Contract generation wizard. Takes structured input about the
 * desired contract and generates a draft using AI, validated
 * against company policies.
 */

import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { errorHandlerMiddleware } from '../../middlewares/error-handler.middleware'
import { getGeminiService } from '../services/gemini-interactions'
import { ContractType, RiskSeverity } from '../types/contract'

const bodySchema = z.object({
  contractType: z.enum([
    'msa', 'nda', 'sow', 'saas_agreement', 'vendor_agreement',
    'customer_agreement', 'employment_contract', 'consulting_agreement',
    'partnership_agreement', 'licensing_agreement', 'purchase_agreement',
    'lease_agreement', 'other',
  ]),
  customerType: z.enum(['startup', 'mid_market', 'enterprise', 'government']),
  dealValue: z.number().optional(),
  dealCurrency: z.string().default('USD'),
  jurisdiction: z.string(),
  term: z.object({
    duration: z.number(),
    unit: z.enum(['days', 'months', 'years']),
    autoRenewal: z.boolean().default(false),
  }),
  keyTerms: z.object({
    liabilityCap: z.number().optional(),
    paymentTerms: z.string().optional(),
    confidentialityLevel: z.enum(['standard', 'enhanced', 'maximum']).default('standard'),
    terminationNoticeDays: z.number().default(30),
    insuranceRequired: z.boolean().default(false),
    insuranceAmount: z.number().optional(),
  }),
  parties: z.object({
    provider: z.object({
      name: z.string(),
      address: z.string().optional(),
      entityType: z.string().optional(),
    }),
    customer: z.object({
      name: z.string(),
      address: z.string().optional(),
      entityType: z.string().optional(),
    }),
  }),
  additionalRequirements: z.string().optional(),
})

const policyViolationSchema = z.object({
  section: z.string(),
  violation: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  suggestedFix: z.string(),
})

const responseSchema = z.object({
  id: z.string(),
  status: z.enum(['generating', 'validating', 'completed', 'failed']),
  createdAt: z.string(),
  contractType: z.string(),
  document: z.string().optional(),
  policyViolations: z.array(policyViolationSchema).optional(),
  requiresGCReview: z.boolean(),
  gcReviewReasons: z.array(z.string()).optional(),
  estimatedTimeSeconds: z.number().optional(),
})

const errorSchema = z.object({
  error: z.string(),
  code: z.string(),
})

export const config: ApiRouteConfig = {
  name: 'GenerateContract',
  type: 'api',
  path: '/contracts/generate',
  method: 'POST',
  description: 'Generate a contract draft based on structured requirements',
  emits: [],
  flows: ['contract-analysis'],
  middleware: [errorHandlerMiddleware],
  bodySchema,
  responseSchema: {
    200: responseSchema,
    202: responseSchema,
    400: errorSchema,
  },
}

// Contract templates based on type
const CONTRACT_TEMPLATES: Record<string, string> = {
  nda: `NON-DISCLOSURE AGREEMENT`,
  msa: `MASTER SERVICE AGREEMENT`,
  sow: `STATEMENT OF WORK`,
  saas_agreement: `SOFTWARE AS A SERVICE AGREEMENT`,
  vendor_agreement: `VENDOR SERVICES AGREEMENT`,
  customer_agreement: `CUSTOMER AGREEMENT`,
}

// Policy requirements based on customer type
const POLICY_REQUIREMENTS: Record<string, any> = {
  startup: {
    maxLiabilityMultiplier: 2,
    minInsurance: 500000,
    minTerminationNotice: 30,
  },
  mid_market: {
    maxLiabilityMultiplier: 2,
    minInsurance: 2000000,
    minTerminationNotice: 30,
  },
  enterprise: {
    maxLiabilityMultiplier: 1,
    minInsurance: 5000000,
    minTerminationNotice: 60,
  },
  government: {
    maxLiabilityMultiplier: 1,
    minInsurance: 10000000,
    minTerminationNotice: 90,
    specialClauses: ['FOIA compliance', 'Government audit rights'],
  },
}

const GENERATION_SYSTEM_PROMPT = `You are an expert legal contract drafter. Generate professional, legally sound contracts based on the provided specifications.

REQUIREMENTS:
1. Use formal legal language appropriate for the jurisdiction
2. Include all standard clauses for the contract type
3. Incorporate the specific terms provided
4. Add appropriate definitions section
5. Include signature blocks
6. Use clear section numbering
7. Follow best practices for the contract type

OUTPUT FORMAT:
Generate the complete contract text in a professional format, ready for review.`

export const handler: Handlers['GenerateContract'] = async (req, { emit, logger, state, streams }) => {
  const startTime = Date.now()
  const validatedBody = bodySchema.parse(req.body)
  
  const contractId = randomUUID()

  logger.info('Starting contract generation', {
    contractId,
    contractType: validatedBody.contractType,
    customerType: validatedBody.customerType,
    jurisdiction: validatedBody.jurisdiction,
  })

  // Check policy requirements
  const policyReqs = POLICY_REQUIREMENTS[validatedBody.customerType]
  const violations: Array<{
    section: string
    violation: string
    severity: RiskSeverity
    suggestedFix: string
  }> = []

  // Validate liability cap
  if (validatedBody.keyTerms.liabilityCap && validatedBody.dealValue) {
    const maxLiability = validatedBody.dealValue * policyReqs.maxLiabilityMultiplier
    if (validatedBody.keyTerms.liabilityCap > maxLiability) {
      violations.push({
        section: 'Limitation of Liability',
        violation: `Liability cap exceeds policy maximum of ${policyReqs.maxLiabilityMultiplier}x annual fees`,
        severity: 'high',
        suggestedFix: `Reduce liability cap to ${validatedBody.dealCurrency} ${maxLiability.toLocaleString()} or less`,
      })
    }
  }

  // Validate insurance
  if (validatedBody.keyTerms.insuranceRequired && validatedBody.keyTerms.insuranceAmount) {
    if (validatedBody.keyTerms.insuranceAmount < policyReqs.minInsurance) {
      violations.push({
        section: 'Insurance Requirements',
        violation: `Insurance amount below minimum of ${validatedBody.dealCurrency} ${policyReqs.minInsurance.toLocaleString()}`,
        severity: 'medium',
        suggestedFix: `Increase insurance requirement to ${validatedBody.dealCurrency} ${policyReqs.minInsurance.toLocaleString()}`,
      })
    }
  }

  // Validate termination notice
  if (validatedBody.keyTerms.terminationNoticeDays < policyReqs.minTerminationNotice) {
    violations.push({
      section: 'Termination',
      violation: `Termination notice period (${validatedBody.keyTerms.terminationNoticeDays} days) below minimum of ${policyReqs.minTerminationNotice} days`,
      severity: 'medium',
      suggestedFix: `Increase termination notice to ${policyReqs.minTerminationNotice} days`,
    })
  }

  // Determine if GC review is required
  const requiresGCReview = 
    validatedBody.customerType === 'government' ||
    validatedBody.customerType === 'enterprise' ||
    (validatedBody.dealValue && validatedBody.dealValue > 500000) ||
    violations.some(v => v.severity === 'critical' || v.severity === 'high')

  const gcReviewReasons: string[] = []
  if (validatedBody.customerType === 'government') {
    gcReviewReasons.push('Government contract requires legal review')
  }
  if (validatedBody.customerType === 'enterprise') {
    gcReviewReasons.push('Enterprise deal requires legal review')
  }
  if (validatedBody.dealValue && validatedBody.dealValue > 500000) {
    gcReviewReasons.push(`Deal value exceeds $500K threshold (${validatedBody.dealCurrency} ${validatedBody.dealValue.toLocaleString()})`)
  }
  if (violations.some(v => v.severity === 'critical' || v.severity === 'high')) {
    gcReviewReasons.push('Policy violations require legal review')
  }

  // Build generation prompt
  const termDuration = `${validatedBody.term.duration} ${validatedBody.term.unit}`
  const generationPrompt = `${GENERATION_SYSTEM_PROMPT}

CONTRACT TYPE: ${CONTRACT_TEMPLATES[validatedBody.contractType] || validatedBody.contractType.toUpperCase()}

PARTIES:
- Provider: ${validatedBody.parties.provider.name}${validatedBody.parties.provider.entityType ? ` (${validatedBody.parties.provider.entityType})` : ''}
  ${validatedBody.parties.provider.address ? `Address: ${validatedBody.parties.provider.address}` : ''}
- Customer: ${validatedBody.parties.customer.name}${validatedBody.parties.customer.entityType ? ` (${validatedBody.parties.customer.entityType})` : ''}
  ${validatedBody.parties.customer.address ? `Address: ${validatedBody.parties.customer.address}` : ''}

KEY TERMS:
- Governing Law: ${validatedBody.jurisdiction}
- Term: ${termDuration}${validatedBody.term.autoRenewal ? ' (auto-renewal enabled)' : ''}
- Deal Value: ${validatedBody.dealValue ? `${validatedBody.dealCurrency} ${validatedBody.dealValue.toLocaleString()}` : 'Not specified'}
- Liability Cap: ${validatedBody.keyTerms.liabilityCap ? `${validatedBody.dealCurrency} ${validatedBody.keyTerms.liabilityCap.toLocaleString()}` : 'Standard (12 months of fees)'}
- Payment Terms: ${validatedBody.keyTerms.paymentTerms || 'Net 30'}
- Confidentiality: ${validatedBody.keyTerms.confidentialityLevel}
- Termination Notice: ${validatedBody.keyTerms.terminationNoticeDays} days
${validatedBody.keyTerms.insuranceRequired ? `- Insurance Required: ${validatedBody.dealCurrency} ${validatedBody.keyTerms.insuranceAmount?.toLocaleString() || 'Standard amount'}` : ''}

${validatedBody.additionalRequirements ? `ADDITIONAL REQUIREMENTS:\n${validatedBody.additionalRequirements}` : ''}

Generate a complete, professional contract with all standard sections for a ${validatedBody.contractType.replace(/_/g, ' ')}.`

  // Generate contract using Gemini
  const gemini = getGeminiService()
  
  try {
    const response = await gemini.createInteraction(generationPrompt, {
      model: 'gemini-3-pro-preview',
      generationConfig: {
        temperature: 0.4, // Slightly higher for creative drafting
        maxOutputTokens: 16384, // Long output for full contract
      },
    })

    const generatedContract = response.text

    // Store generated contract
    await state.set('generated-contracts', contractId, {
      id: contractId,
      request: validatedBody,
      document: generatedContract,
      violations,
      requiresGCReview,
      gcReviewReasons,
      createdAt: new Date().toISOString(),
      interactionId: response.id,
    })

    logger.info('Contract generated successfully', {
      contractId,
      contractType: validatedBody.contractType,
      documentLength: generatedContract.length,
      violations: violations.length,
      requiresGCReview,
      processingTimeMs: Date.now() - startTime,
    })

    return {
      status: 200,
      body: {
        id: contractId,
        status: 'completed',
        createdAt: new Date().toISOString(),
        contractType: validatedBody.contractType,
        document: generatedContract,
        policyViolations: violations.length > 0 ? violations : undefined,
        requiresGCReview,
        gcReviewReasons: gcReviewReasons.length > 0 ? gcReviewReasons : undefined,
      },
    }

  } catch (error) {
    logger.error('Contract generation failed', {
      contractId,
      error: (error as Error).message,
    })

    return {
      status: 200,
      body: {
        id: contractId,
        status: 'failed',
        createdAt: new Date().toISOString(),
        contractType: validatedBody.contractType,
        requiresGCReview: false,
      },
    }
  }
}

