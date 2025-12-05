import { parse } from 'csv-parse/sync';

export interface Lead {
  id: string;
  name: string;
  company: string;
  role: string;
  industry: string;
  email: string;
  website: string;
  employeeRange: string;
  country: string;
  notes: string;
}

export interface LeadWithScore extends Lead {
  score: number;
  scoreBreakdown: {
    industryFit: number;
    companySize: number;
    roleRelevance: number;
    engagementSignals: number;
  };
  tier: 'hot' | 'warm' | 'cold';
  scoredAt: string;
}

export interface LeadFlow {
  flowId: string;
  status: 'uploading' | 'processing' | 'scoring' | 'drafting' | 'awaiting_review' | 'sending' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  totalLeads: number;
  processedLeads: number;
  scoredLeads: number;
  draftedLeads: number;
  approvedLeads: number;
  sentLeads: number;
  failedLeads: number;
  error?: string;
}

export function parseCSV(csvContent: string): Lead[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((record: Record<string, string>) => ({
    id: record.id || crypto.randomUUID(),
    name: record.name || '',
    company: record.company || '',
    role: record.role || '',
    industry: record.industry || '',
    email: record.email || '',
    website: record.website || '',
    employeeRange: record.employee_range || '',
    country: record.country || '',
    notes: record.notes || '',
  }));
}

export function validateLead(lead: Lead): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!lead.email || !isValidEmail(lead.email)) {
    errors.push(`Invalid email: ${lead.email}`);
  }
  if (!lead.name) {
    errors.push('Name is required');
  }
  if (!lead.company) {
    errors.push('Company is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function createFlowId(): string {
  return `flow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

