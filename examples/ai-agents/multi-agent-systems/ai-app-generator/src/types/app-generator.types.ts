/**
 * AI App Generator - Shared Types and Interfaces
 * 
 * This module defines all the types used across the multi-agent
 * app generation workflow.
 */

import { z } from 'zod';

// ============================================
// App Specification Types
// ============================================

export const AppGenreValues = [
  'e-commerce',
  'dashboard',
  'content-editor',
  'social-platform',
  'portfolio',
  'blog',
  'saas',
  'landing-page',
  'admin-panel',
  'chat-app',
  'marketplace',
  'booking-system',
  'productivity',
  'task-manager',
  'crm',
  'analytics',
  'custom'
] as const;

export const AppGenreSchema = z.string()
  .transform(v => v.toLowerCase().replace(/\s+/g, '-'))
  .pipe(z.enum(AppGenreValues));

// Helper to normalize string values to lowercase
const normalizeEnum = <T extends readonly string[]>(values: T) => 
  z.string().transform(v => v.toLowerCase()).pipe(z.enum(values as unknown as [string, ...string[]]));

export const TechStackSchema = z.object({
  frontend: normalizeEnum(['react', 'vue', 'next', 'svelte'] as const).default('react'),
  styling: z.string().transform(v => {
    const normalized = v.toLowerCase().replace(/\s+/g, '');
    if (normalized === 'tailwindcss' || normalized === 'tailwind') return 'tailwind';
    if (normalized === 'cssmodules' || normalized === 'css-modules') return 'css-modules';
    if (normalized === 'styledcomponents' || normalized === 'styled-components') return 'styled-components';
    return normalized;
  }).pipe(z.enum(['tailwind', 'css-modules', 'styled-components', 'sass'])).default('tailwind'),
  stateManagement: normalizeEnum(['zustand', 'redux', 'context', 'jotai'] as const).default('zustand'),
  testing: normalizeEnum(['vitest', 'jest'] as const).default('vitest'),
  buildTool: normalizeEnum(['vite', 'webpack', 'turbopack'] as const).default('vite')
});

export const AppSpecSchema = z.object({
  title: z.string().min(1, 'App title is required'),
  description: z.string().min(10, 'Please provide a detailed description'),
  genre: AppGenreSchema,
  features: z.array(z.string()).min(1, 'At least one feature is required'),
  targetAudience: z.string().optional(),
  techPreferences: TechStackSchema.optional(),
  additionalContext: z.string().optional(),
  maxIterations: z.number().min(1).max(10).default(3),
  priority: z.enum(['speed', 'quality', 'balanced']).default('balanced')
});

export type AppSpec = z.infer<typeof AppSpecSchema>;
export type AppGenre = z.infer<typeof AppGenreSchema>;
export type TechStack = z.infer<typeof TechStackSchema>;

// ============================================
// Agent Role Types
// ============================================

export type AgentRole = 
  | 'architect'
  | 'engineer'
  | 'test-designer'
  | 'test-executor'
  | 'project-manager'
  | 'designer'
  | 'assembly';

export interface AgentContext {
  flowId: string;
  role: AgentRole;
  iteration: number;
  startedAt: string;
  tokenCount?: number;
  estimatedCost?: number;
}

// ============================================
// Design Document Types
// ============================================

export const ComponentSpecSchema = z.object({
  name: z.string(),
  description: z.string(),
  props: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean(),
    description: z.string().optional()
  })),
  dependencies: z.array(z.string()).default([]),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium')
});

export const DataModelSchema = z.object({
  name: z.string(),
  fields: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean(),
    description: z.string().optional()
  })),
  relationships: z.array(z.string()).default([])
});

export const FileStructureSchema = z.object({
  path: z.string(),
  type: z.enum(['file', 'directory']),
  description: z.string(),
  children: z.array(z.lazy(() => FileStructureSchema)).optional()
});

export const DesignDocumentSchema = z.object({
  flowId: z.string(),
  appSpec: AppSpecSchema,
  systemArchitecture: z.object({
    overview: z.string(),
    patterns: z.array(z.string()),
    decisions: z.array(z.object({
      decision: z.string(),
      rationale: z.string()
    }))
  }),
  fileLayout: z.array(FileStructureSchema),
  components: z.array(ComponentSpecSchema),
  dataModels: z.array(DataModelSchema),
  integrationPoints: z.array(z.object({
    name: z.string(),
    type: z.enum(['api', 'storage', 'auth', 'external']),
    description: z.string()
  })),
  uiGuidelines: z.object({
    colorScheme: z.array(z.string()),
    typography: z.object({
      headingFont: z.string(),
      bodyFont: z.string()
    }),
    spacing: z.string(),
    componentLibrary: z.string().optional()
  }).optional(),
  createdAt: z.string(),
  createdBy: z.literal('architect')
});

export type ComponentSpec = z.infer<typeof ComponentSpecSchema>;
export type DataModel = z.infer<typeof DataModelSchema>;
export type FileStructure = z.infer<typeof FileStructureSchema>;
export type DesignDocument = z.infer<typeof DesignDocumentSchema>;

// ============================================
// Code Generation Types
// ============================================

export const GeneratedFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  language: z.enum(['typescript', 'javascript', 'json', 'css', 'html', 'markdown', 'yaml']),
  moduleType: z.enum(['component', 'utility', 'hook', 'service', 'type', 'config', 'test', 'style']),
  generatedAt: z.string(),
  iteration: z.number()
});

export const CodeModuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  files: z.array(GeneratedFileSchema),
  dependencies: z.array(z.string()),
  status: z.enum(['pending', 'generating', 'generated', 'testing', 'passed', 'failed', 'refined']),
  iteration: z.number().default(1)
});

export type GeneratedFile = z.infer<typeof GeneratedFileSchema>;
export type CodeModule = z.infer<typeof CodeModuleSchema>;

// ============================================
// Test Types
// ============================================

export const TestCaseSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['unit', 'integration', 'e2e']),
  code: z.string(),
  targetFile: z.string(),
  createdAt: z.string()
});

export const TestResultSchema = z.object({
  testId: z.string(),
  moduleId: z.string(),
  passed: z.boolean(),
  duration: z.number(),
  errorMessage: z.string().optional(),
  stackTrace: z.string().optional(),
  executedAt: z.string()
});

export const TestReportSchema = z.object({
  flowId: z.string(),
  moduleId: z.string(),
  iteration: z.number(),
  totalTests: z.number(),
  passedTests: z.number(),
  failedTests: z.number(),
  results: z.array(TestResultSchema),
  summary: z.string(),
  createdAt: z.string()
});

export type TestCase = z.infer<typeof TestCaseSchema>;
export type TestResult = z.infer<typeof TestResultSchema>;
export type TestReport = z.infer<typeof TestReportSchema>;

// ============================================
// Workflow Status Types
// ============================================

export const WorkflowStatusSchema = z.enum([
  'requested',
  'designing',
  'design_completed',
  'coding',
  'testing',
  'refining',
  'assembling',
  'completed',
  'failed',
  'cancelled'
]);

export const WorkflowPhaseSchema = z.object({
  name: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'skipped']),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  agent: z.string().optional(),
  details: z.string().optional()
});

export const WorkflowStateSchema = z.object({
  flowId: z.string(),
  status: WorkflowStatusSchema,
  phases: z.array(WorkflowPhaseSchema),
  currentPhase: z.string(),
  currentIteration: z.number().default(1),
  maxIterations: z.number().default(3),
  appSpec: AppSpecSchema,
  designDocument: DesignDocumentSchema.optional(),
  modules: z.array(CodeModuleSchema).default([]),
  testReports: z.array(TestReportSchema).default([]),
  artifacts: z.object({
    designDoc: z.string().optional(),
    codeBundle: z.string().optional(),
    testResults: z.string().optional()
  }).default({}),
  metrics: z.object({
    totalTokens: z.number().default(0),
    estimatedCost: z.number().default(0),
    totalDuration: z.number().default(0)
  }).default({}),
  errors: z.array(z.object({
    phase: z.string(),
    message: z.string(),
    timestamp: z.string()
  })).default([]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;
export type WorkflowPhase = z.infer<typeof WorkflowPhaseSchema>;
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;

// ============================================
// Event Payloads
// ============================================

export const AppGenerationRequestedPayload = z.object({
  flowId: z.string(),
  appSpec: AppSpecSchema
});

export const DesignCompletedPayload = z.object({
  flowId: z.string(),
  designDocument: DesignDocumentSchema
});

export const ModuleCodingRequestPayload = z.object({
  flowId: z.string(),
  moduleId: z.string(),
  moduleName: z.string(),
  componentSpec: ComponentSpecSchema.optional(),
  designDocument: DesignDocumentSchema
});

export const TestDesignRequestPayload = z.object({
  flowId: z.string(),
  moduleId: z.string(),
  codeModule: CodeModuleSchema
});

export const TestExecutionRequestPayload = z.object({
  flowId: z.string(),
  moduleId: z.string(),
  testCases: z.array(TestCaseSchema),
  codeModule: CodeModuleSchema
});

export const CodeRefinementRequestPayload = z.object({
  flowId: z.string(),
  moduleId: z.string(),
  codeModule: CodeModuleSchema,
  testReport: TestReportSchema,
  iteration: z.number()
});

export const AssemblyRequestPayload = z.object({
  flowId: z.string(),
  designDocument: DesignDocumentSchema,
  modules: z.array(CodeModuleSchema)
});

export type AppGenerationRequestedPayloadType = z.infer<typeof AppGenerationRequestedPayload>;
export type DesignCompletedPayloadType = z.infer<typeof DesignCompletedPayload>;
export type ModuleCodingRequestPayloadType = z.infer<typeof ModuleCodingRequestPayload>;
export type TestDesignRequestPayloadType = z.infer<typeof TestDesignRequestPayload>;
export type TestExecutionRequestPayloadType = z.infer<typeof TestExecutionRequestPayload>;
export type CodeRefinementRequestPayloadType = z.infer<typeof CodeRefinementRequestPayload>;
export type AssemblyRequestPayloadType = z.infer<typeof AssemblyRequestPayload>;

// ============================================
// Final Output Types
// ============================================

export const FinalOutputSchema = z.object({
  flowId: z.string(),
  appSpec: AppSpecSchema,
  files: z.array(GeneratedFileSchema),
  buildConfig: z.object({
    packageJson: z.string(),
    tsconfig: z.string().optional(),
    viteConfig: z.string().optional(),
    dockerfile: z.string().optional(),
    envTemplate: z.string()
  }),
  readme: z.string(),
  totalFiles: z.number(),
  totalLines: z.number(),
  generatedAt: z.string()
});

export type FinalOutput = z.infer<typeof FinalOutputSchema>;

