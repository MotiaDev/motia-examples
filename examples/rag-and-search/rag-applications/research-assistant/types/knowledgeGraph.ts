export interface RelatedPaper {
  title: string;
  authors: string;
  year: string;
  url: string | null;
  relevance: string;
  keyInsights: string[];
}

export interface CodeExample {
  title: string;
  description: string;
  language: string;
  code: string;
  dependencies: string[];
  usageNotes: string;
}

export interface CodeExamples {
  examples: CodeExample[];
}

export interface Paper {
  id: string;
  title: string;
  authors?: string;
  abstract?: string;
  pdfUrl?: string;
  doi?: string;
  uploadedAt?: string;
  analyzedAt?: string;
  codeExamples?: CodeExamples;
  codeExamplesGeneratedAt?: string;
  internetRelatedPapers?: RelatedPaper[];
  relatedPapersRecommendedAt?: string;
}

export interface Concept {
  name: string;
  description?: string;
  authors?: string;
  year?: string;
  url?: string | null;
  keyInsights?: string[];
  papers: string[];
}

export interface Relationship {
  source: string;
  target: string;
  type: string;
  relevance?: string;
  insights?: string[];
  sharedConcepts?: string[];
  strength?: number;
}

export interface KnowledgeGraph {
  papers: Record<string, Paper>;
  concepts: Record<string, Concept>;
  relationships: Relationship[];
  entities: Record<string, any>;
}
