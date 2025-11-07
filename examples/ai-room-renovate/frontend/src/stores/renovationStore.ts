import { create } from 'zustand';
import type {
  RenovationRequest,
  RenovationResult,
  RenderingResponse,
} from '@/types/renovation';

interface RenovationState {
  // Current session
  sessionId: string | null;
  
  // Form data
  formData: Partial<RenovationRequest>;
  
  // Results
  renovationResult: RenovationResult | null;
  renderingResult: RenderingResponse | null;
  
  // Loading states
  isSubmitting: boolean;
  isLoadingResult: boolean;
  isLoadingRendering: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  setFormData: (data: Partial<RenovationRequest>) => void;
  setSessionId: (sessionId: string) => void;
  setRenovationResult: (result: RenovationResult) => void;
  setRenderingResult: (result: RenderingResponse) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  setIsLoadingResult: (isLoading: boolean) => void;
  setIsLoadingRendering: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  formData: {},
  renovationResult: null,
  renderingResult: null,
  isSubmitting: false,
  isLoadingResult: false,
  isLoadingRendering: false,
  error: null,
};

export const useRenovationStore = create<RenovationState>((set) => ({
  ...initialState,
  
  setFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),
  
  setSessionId: (sessionId) => set({ sessionId }),
  
  setRenovationResult: (result) => set({ renovationResult: result }),
  
  setRenderingResult: (result) => set({ renderingResult: result }),
  
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
  
  setIsLoadingResult: (isLoading) => set({ isLoadingResult: isLoading }),
  
  setIsLoadingRendering: (isLoading) => set({ isLoadingRendering: isLoading }),
  
  setError: (error) => set({ error }),
  
  reset: () => set(initialState),
}));