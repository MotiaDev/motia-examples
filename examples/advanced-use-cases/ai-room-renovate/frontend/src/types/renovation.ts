export interface RenovationRequest {
  message: string;
  budget?: number;
  roomType?: string;
  style?: string;
  hasImages?: boolean;
  imageUrls?: string[];
}

export interface RenovationStartResponse {
  sessionId: string;
  message: string;
  routedTo: string;
}

export interface BudgetBreakdown {
  materials: number;
  labor: number;
  permits: number;
  contingency: number;
  total: number;
}

export interface DesignPlan {
  approach: string;
  materials: string[];
  colors: {
    cabinets?: string;
    walls?: string;
    accents?: string;
    [key: string]: string | undefined;
  };
  features: string[];
}

export interface ProjectSummary {
  roomType: string;
  style: string;
  scope: string;
  squareFootage: number;
}

export interface Timeline {
  duration: string;
  scope: string;
  roomType: string;
}

export interface Roadmap {
  projectSummary: ProjectSummary;
  budget: BudgetBreakdown;
  timeline: Timeline;
  designPlan: DesignPlan;
  contractors: string[];
  actionChecklist: string[];
  renderingPrompt: string;
}

export interface AssessmentSummary {
  roomType: string;
  estimatedSize: string;
  budget: number;
  style: string;
  keyIssues: string[];
  opportunities: string[];
}

export interface RenovationResult {
  sessionId: string;
  completed: boolean;
  roadmap?: Roadmap;
  assessmentSummary?: AssessmentSummary;
  infoResponse?: string;
  message: string;
}

export interface Rendering {
  imageBase64: string;
  mimeType: string;
  prompt: string;
  generatedAt: string;
  model: string;
}

export interface RenderingResponse {
  sessionId: string;
  renderingCompleted: boolean;
  rendering?: Rendering;
  renderingError?: string;
  message: string;
}

export interface EditRenderingRequest {
  editPrompt: string;
}

export interface EditRenderingResponse {
  sessionId: string;
  message: string;
}

export type RoomType = 'kitchen' | 'bathroom' | 'bedroom' | 'living_room' | 'dining_room' | 'office';
export type StyleType = 'modern' | 'farmhouse' | 'industrial' | 'minimalist' | 'traditional' | 'contemporary' | 'rustic' | 'coastal';