import { z } from 'zod';

// ====================
// Zod Schema Definitions
// ====================

/**
 * Schema for Node model
 */
export const NodeSchema = z.object({
  id: z.string(),
  parent: z.string().nullable().optional(),
  children: z.array(z.string()).default([]),
  visits: z.number().int().default(0),
  value: z.number().default(0.0),
  state: z.string().nullable().optional(),
  isTerminal: z.boolean().nullable().optional(),
});

/**
 * Schema for NodeExpansion model
 */
export const NodeExpansionSchema = z.object({
  reasoning: z.string().describe("Explanation of the reasoning process"),
  steps: z.array(z.string()).describe("Next steps in the reasoning process"),
});

/**
 * Schema for Issue model
 */
export const IssueSchema = z.object({
  claim: z.string(),
  grounds: z.string(),
  warrant: z.string(),
  backing: z.string(),
  qualifier: z.string(),
});

/**
 * Schema for Evaluation model
 */
export const EvaluationSchema = z.object({
  score: z.number(),
  issues: z.array(IssueSchema),
  summary: z.string(),
  issueSummary: z.string(),
});

/**
 * Schema for SimulationResult model
 */
export const SimulationResultSchema = z.object({
  nodeId: z.string().describe("ID of the evaluated node"),
  value: z.number().min(0.0).max(1.0).describe("Score between 0 and 1"),
  explanation: z.string().describe("Explanation of the score"),
});

/**
 * Schema for NodeSelectionResponse model
 */
export const NodeSelectionResponseSchema = z.object({
  selected_node_id: z.string().describe("ID of the selected node"),
});

/**
 * Schema for ReasoningEvaluation model
 */
export const ReasoningEvaluationSchema = z.object({
  value: z.number().min(0.0).max(1.0).describe("Evaluation score"),
  explanation: z.string().describe("Explanation of the score"),
});

/**
 * Schema for MCTSControllerState model (found in controller.step.py)
 */
export const MCTSControllerStateSchema = z.object({
  nodes: z.record(z.string(), NodeSchema),
  root_id: z.string(),
  current_node_id: z.string(),
  current_iteration: z.number().int(),
  max_iterations: z.number().int(),
  exploration_constant: z.number(),
  max_depth: z.number().int(),
  output_url: z.string().nullable().optional(),
});

// Type definitions derived from the schemas
export type Node = z.infer<typeof NodeSchema>;
export type NodeExpansion = z.infer<typeof NodeExpansionSchema>;
export type Issue = z.infer<typeof IssueSchema>;
export type Evaluation = z.infer<typeof EvaluationSchema>;
export type SimulationResult = z.infer<typeof SimulationResultSchema>;
export type NodeSelectionResponse = z.infer<typeof NodeSelectionResponseSchema>;
export type ReasoningEvaluation = z.infer<typeof ReasoningEvaluationSchema>;
export type MCTSControllerState = z.infer<typeof MCTSControllerStateSchema>;
