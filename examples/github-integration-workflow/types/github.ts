export interface TeamMember {
  login: string;
  expertise: string[];
}

export interface PRClassification {
  type: 'bug-fix' | 'feature' | 'documentation' | 'refactor';
  impact: 'low' | 'medium' | 'high';
  areas: string[];
}

export interface IssueClassification {
  type: 'bug' | 'feature' | 'question' | 'documentation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface CheckRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
  started_at: string;
  completed_at?: string;
} 

export interface RawCheckRun {
  id: number;
  name: string;
  node_id: string;
  external_id: string | null;
  url: string;
  html_url: string | null;
  details_url: string | null;
  head_sha: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "neutral" | "cancelled" | "skipped" | "timed_out" | "action_required" | null;
  started_at: string | null;
  completed_at: string | null;
  output: {
    title: string | null;
    summary: string | null;
    text: string | null;
    annotations_count: number;
    annotations_url: string;
  };
  check_suite: {
    id: number;
  } | null;
}
