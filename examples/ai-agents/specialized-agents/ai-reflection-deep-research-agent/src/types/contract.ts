/**
 * ContractGPT Type Definitions
 * 
 * Comprehensive types for contract analysis, risk assessment,
 * and the multi-agent reflection pipeline.
 */

import { z } from 'zod'

// ============================================
// Risk Categories and Severity
// ============================================

export const RiskSeverity = z.enum(['critical', 'high', 'medium', 'low'])
export type RiskSeverity = z.infer<typeof RiskSeverity>

export const RiskCategory = z.enum([
  'liability_gap',
  'liability_cap_exceeded',
  'indemnification_issue',
  'payment_term_anomaly',
  'payment_schedule_risk',
  'ip_ownership_issue',
  'ip_assignment_missing',
  'confidentiality_gap',
  'nda_violation_risk',
  'compliance_violation',
  'regulatory_gap',
  'data_privacy_issue',
  'gdpr_violation',
  'termination_clause_issue',
  'auto_renewal_risk',
  'change_of_control',
  'non_compete_issue',
  'warranty_gap',
  'limitation_of_warranty',
  'force_majeure_missing',
  'jurisdiction_conflict',
  'governing_law_issue',
  'dispute_resolution_gap',
  'insurance_requirement_missing',
  'service_level_gap',
  'penalty_clause_risk',
  'non_standard_clause',
  'ambiguous_language',
  'missing_definition',
  'conflicting_terms',
])
export type RiskCategory = z.infer<typeof RiskCategory>

// ============================================
// Contract Types
// ============================================

export const ContractType = z.enum([
  'msa', // Master Service Agreement
  'nda', // Non-Disclosure Agreement
  'sow', // Statement of Work
  'saas_agreement',
  'vendor_agreement',
  'customer_agreement',
  'employment_contract',
  'consulting_agreement',
  'partnership_agreement',
  'licensing_agreement',
  'purchase_agreement',
  'lease_agreement',
  'other',
])
export type ContractType = z.infer<typeof ContractType>

// ============================================
// Risk Finding Schemas
// ============================================

export const RiskFinding = z.object({
  id: z.string(),
  category: RiskCategory,
  severity: RiskSeverity,
  title: z.string(),
  description: z.string(),
  lineNumber: z.number().optional(),
  pageNumber: z.number().optional(),
  excerpt: z.string(),
  explanation: z.string(),
  suggestedAction: z.string(),
  suggestedEditLanguage: z.string().optional(),
  policyViolation: z.boolean().default(false),
  policyReference: z.string().optional(),
})
export type RiskFinding = z.infer<typeof RiskFinding>

// ============================================
// Draft Analysis (Generator Output)
// ============================================

export const DraftAnalysis = z.object({
  id: z.string(),
  contractId: z.string(),
  generatedAt: z.string(),
  modelUsed: z.string(),
  interactionId: z.string().optional(),
  risks: z.array(RiskFinding),
  keyTermsIdentified: z.array(z.object({
    term: z.string(),
    value: z.string(),
    location: z.string().optional(),
  })),
  partiesIdentified: z.array(z.object({
    name: z.string(),
    role: z.string(),
    entityType: z.string().optional(),
  })),
  contractDuration: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    term: z.string().optional(),
    autoRenewal: z.boolean().optional(),
  }).optional(),
  totalValue: z.object({
    amount: z.number().optional(),
    currency: z.string().optional(),
    paymentSchedule: z.string().optional(),
  }).optional(),
  processingTimeMs: z.number(),
})
export type DraftAnalysis = z.infer<typeof DraftAnalysis>

// ============================================
// Critique (Critic Output)
// ============================================

export const CritiqueEdit = z.object({
  riskId: z.string(),
  action: z.enum(['keep', 'remove', 'modify', 'reprioritize']),
  newSeverity: RiskSeverity.optional(),
  reason: z.string(),
  modifiedDescription: z.string().optional(),
  modifiedSuggestedAction: z.string().optional(),
})
export type CritiqueEdit = z.infer<typeof CritiqueEdit>

export const MissedPolicy = z.object({
  policyName: z.string(),
  policyDescription: z.string(),
  severity: RiskSeverity,
  suggestedFinding: RiskFinding.optional(),
})
export type MissedPolicy = z.infer<typeof MissedPolicy>

export const Critique = z.object({
  id: z.string(),
  contractId: z.string(),
  draftAnalysisId: z.string(),
  generatedAt: z.string(),
  modelUsed: z.string(),
  interactionId: z.string().optional(),
  qualityScore: z.number().min(0).max(100),
  accuracyScore: z.number().min(0).max(100),
  completenessScore: z.number().min(0).max(100),
  actionabilityScore: z.number().min(0).max(100),
  edits: z.array(CritiqueEdit),
  priorityReorder: z.array(z.string()), // Risk IDs in new priority order
  missedPolicies: z.array(MissedPolicy),
  falsePositives: z.array(z.string()), // Risk IDs identified as false positives
  overallAssessment: z.string(),
  processingTimeMs: z.number(),
})
export type Critique = z.infer<typeof Critique>

// ============================================
// Refined Analysis (Refiner Output)
// ============================================

export const PrecedentContract = z.object({
  id: z.string(),
  name: z.string(),
  similarity: z.number(),
  relevantClause: z.string(),
  negotiationOutcome: z.string(),
})
export type PrecedentContract = z.infer<typeof PrecedentContract>

export const RecommendedAction = z.enum([
  'approve_as_is',
  'request_minor_amendments',
  'request_major_amendments',
  'escalate_to_gc',
  'reject',
  'require_legal_review',
])
export type RecommendedAction = z.infer<typeof RecommendedAction>

export const RefinedRisk = z.object({
  id: z.string(),
  category: RiskCategory,
  severity: RiskSeverity,
  title: z.string(),
  description: z.string(),
  excerpt: z.string(),
  suggestedEditLanguage: z.string(),
  confidenceScore: z.number().min(0).max(100),
  policyViolation: z.boolean(),
  policyReference: z.string().optional(),
  precedents: z.array(PrecedentContract).optional(),
  negotiationTips: z.array(z.string()).optional(),
})
export type RefinedRisk = z.infer<typeof RefinedRisk>

export const RefinedAnalysis = z.object({
  id: z.string(),
  contractId: z.string(),
  generatedAt: z.string(),
  modelUsed: z.string(),
  interactionId: z.string().optional(),
  
  // Executive Summary
  executiveSummary: z.string(),
  overallScore: z.number().min(0).max(100),
  recommendedAction: RecommendedAction,
  
  // Risk Breakdown
  risks: z.array(RefinedRisk),
  risksByCategory: z.record(RiskCategory, z.array(z.string())).optional(), // Category -> Risk IDs
  risksBySeverity: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),
  
  // Key Insights
  keyNegotiationPoints: z.array(z.object({
    point: z.string(),
    priority: z.number(),
    suggestedApproach: z.string(),
  })),
  
  // Next Steps
  actionItems: z.array(z.object({
    action: z.string(),
    owner: z.string().optional(),
    priority: z.enum(['immediate', 'high', 'medium', 'low']),
    deadline: z.string().optional(),
  })),
  
  // Metadata
  processingTimeMs: z.number(),
  totalPipelineTimeMs: z.number(),
  versionsUsed: z.object({
    draftAnalysisId: z.string(),
    critiqueId: z.string(),
  }),
})
export type RefinedAnalysis = z.infer<typeof RefinedAnalysis>

// ============================================
// Contract Request/Response Schemas
// ============================================

export const ContractContext = z.object({
  customerName: z.string().optional(),
  dealValue: z.number().optional(),
  dealCurrency: z.string().default('USD'),
  contractType: ContractType.optional(),
  jurisdiction: z.string().optional(),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  additionalNotes: z.string().optional(),
})
export type ContractContext = z.infer<typeof ContractContext>

export const ContractAnalysisRequest = z.object({
  document: z.string(), // Base64 encoded document or text content
  documentType: z.enum(['pdf', 'docx', 'text']).default('text'),
  fileName: z.string().optional(),
  context: ContractContext.optional(),
  useDeepResearch: z.boolean().default(false),
})
export type ContractAnalysisRequest = z.infer<typeof ContractAnalysisRequest>

export const AnalysisStatus = z.enum([
  'pending',
  'extracting_text',
  'generator_running',
  'generator_completed',
  'critic_running',
  'critic_completed',
  'refiner_running',
  'completed',
  'failed',
])
export type AnalysisStatus = z.infer<typeof AnalysisStatus>

export const ContractAnalysisResponse = z.object({
  id: z.string(),
  status: AnalysisStatus,
  createdAt: z.string(),
  updatedAt: z.string(),
  contractName: z.string().optional(),
  context: ContractContext.optional(),
  progress: z.object({
    currentStep: z.string(),
    completedSteps: z.array(z.string()),
    percentComplete: z.number(),
  }),
  result: RefinedAnalysis.optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    step: z.string().optional(),
  }).optional(),
})
export type ContractAnalysisResponse = z.infer<typeof ContractAnalysisResponse>

// ============================================
// Contract Generation Schemas
// ============================================

export const ContractGenerationRequest = z.object({
  contractType: ContractType,
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
export type ContractGenerationRequest = z.infer<typeof ContractGenerationRequest>

export const ContractGenerationResponse = z.object({
  id: z.string(),
  status: z.enum(['generating', 'validating', 'completed', 'failed']),
  createdAt: z.string(),
  contractType: ContractType,
  document: z.string().optional(), // Generated contract text
  policyViolations: z.array(z.object({
    section: z.string(),
    violation: z.string(),
    severity: RiskSeverity,
    suggestedFix: z.string(),
  })).optional(),
  requiresGCReview: z.boolean().default(false),
  gcReviewReasons: z.array(z.string()).optional(),
})
export type ContractGenerationResponse = z.infer<typeof ContractGenerationResponse>

// ============================================
// Stream Progress Schema
// ============================================

export const AnalysisProgressUpdate = z.object({
  id: z.string(),
  contractId: z.string(),
  status: AnalysisStatus,
  step: z.string(),
  message: z.string(),
  timestamp: z.string(),
  progress: z.number().min(0).max(100),
  metadata: z.record(z.string(), z.unknown()).optional(),
})
export type AnalysisProgressUpdate = z.infer<typeof AnalysisProgressUpdate>

// ============================================
// State Storage Schemas
// ============================================

export const StoredContract = z.object({
  id: z.string(),
  fileName: z.string().optional(),
  originalDocument: z.string(), // Base64 encoded
  extractedText: z.string(),
  context: ContractContext.optional(),
  createdAt: z.string(),
  status: AnalysisStatus,
  draftAnalysisId: z.string().optional(),
  critiqueId: z.string().optional(),
  refinedAnalysisId: z.string().optional(),
  error: z.string().optional(),
})
export type StoredContract = z.infer<typeof StoredContract>

// ============================================
// JSON Schema Generators for Gemini
// ============================================

export const DraftAnalysisJsonSchema = {
  type: 'object',
  properties: {
    risks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          category: { type: 'string', enum: RiskCategory.options },
          severity: { type: 'string', enum: RiskSeverity.options },
          title: { type: 'string' },
          description: { type: 'string' },
          lineNumber: { type: 'number' },
          excerpt: { type: 'string' },
          explanation: { type: 'string' },
          suggestedAction: { type: 'string' },
          suggestedEditLanguage: { type: 'string' },
          policyViolation: { type: 'boolean' },
        },
        required: ['id', 'category', 'severity', 'title', 'description', 'excerpt', 'explanation', 'suggestedAction'],
      },
    },
    keyTermsIdentified: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          term: { type: 'string' },
          value: { type: 'string' },
          location: { type: 'string' },
        },
        required: ['term', 'value'],
      },
    },
    partiesIdentified: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
          entityType: { type: 'string' },
        },
        required: ['name', 'role'],
      },
    },
    contractDuration: {
      type: 'object',
      properties: {
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        term: { type: 'string' },
        autoRenewal: { type: 'boolean' },
      },
    },
    totalValue: {
      type: 'object',
      properties: {
        amount: { type: 'number' },
        currency: { type: 'string' },
        paymentSchedule: { type: 'string' },
      },
    },
  },
  required: ['risks', 'keyTermsIdentified', 'partiesIdentified'],
}

export const CritiqueJsonSchema = {
  type: 'object',
  properties: {
    qualityScore: { type: 'number', minimum: 0, maximum: 100 },
    accuracyScore: { type: 'number', minimum: 0, maximum: 100 },
    completenessScore: { type: 'number', minimum: 0, maximum: 100 },
    actionabilityScore: { type: 'number', minimum: 0, maximum: 100 },
    edits: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          riskId: { type: 'string' },
          action: { type: 'string', enum: ['keep', 'remove', 'modify', 'reprioritize'] },
          newSeverity: { type: 'string', enum: RiskSeverity.options },
          reason: { type: 'string' },
          modifiedDescription: { type: 'string' },
          modifiedSuggestedAction: { type: 'string' },
        },
        required: ['riskId', 'action', 'reason'],
      },
    },
    priorityReorder: { type: 'array', items: { type: 'string' } },
    missedPolicies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          policyName: { type: 'string' },
          policyDescription: { type: 'string' },
          severity: { type: 'string', enum: RiskSeverity.options },
        },
        required: ['policyName', 'policyDescription', 'severity'],
      },
    },
    falsePositives: { type: 'array', items: { type: 'string' } },
    overallAssessment: { type: 'string' },
  },
  required: ['qualityScore', 'accuracyScore', 'completenessScore', 'actionabilityScore', 'edits', 'priorityReorder', 'overallAssessment'],
}

export const RefinedAnalysisJsonSchema = {
  type: 'object',
  properties: {
    executiveSummary: { type: 'string' },
    overallScore: { type: 'number', minimum: 0, maximum: 100 },
    recommendedAction: { type: 'string', enum: RecommendedAction.options },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          category: { type: 'string', enum: RiskCategory.options },
          severity: { type: 'string', enum: RiskSeverity.options },
          title: { type: 'string' },
          description: { type: 'string' },
          excerpt: { type: 'string' },
          suggestedEditLanguage: { type: 'string' },
          confidenceScore: { type: 'number', minimum: 0, maximum: 100 },
          policyViolation: { type: 'boolean' },
          policyReference: { type: 'string' },
          negotiationTips: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'category', 'severity', 'title', 'description', 'excerpt', 'suggestedEditLanguage', 'confidenceScore', 'policyViolation'],
      },
    },
    risksBySeverity: {
      type: 'object',
      properties: {
        critical: { type: 'number' },
        high: { type: 'number' },
        medium: { type: 'number' },
        low: { type: 'number' },
      },
      required: ['critical', 'high', 'medium', 'low'],
    },
    keyNegotiationPoints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          point: { type: 'string' },
          priority: { type: 'number' },
          suggestedApproach: { type: 'string' },
        },
        required: ['point', 'priority', 'suggestedApproach'],
      },
    },
    actionItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          owner: { type: 'string' },
          priority: { type: 'string', enum: ['immediate', 'high', 'medium', 'low'] },
          deadline: { type: 'string' },
        },
        required: ['action', 'priority'],
      },
    },
  },
  required: ['executiveSummary', 'overallScore', 'recommendedAction', 'risks', 'risksBySeverity', 'keyNegotiationPoints', 'actionItems'],
}


