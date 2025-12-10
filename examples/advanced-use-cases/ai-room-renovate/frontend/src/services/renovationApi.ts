import type {
  RenovationRequest,
  RenovationStartResponse,
  RenovationResult,
  RenderingResponse,
  EditRenderingRequest,
  EditRenderingResponse,
} from '@/types/renovation';

const API_BASE_URL = '/renovation';

class RenovationApiService {
  async startRenovation(request: RenovationRequest): Promise<RenovationStartResponse> {
    const response = await fetch(`${API_BASE_URL}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to start renovation request');
    }

    return response.json();
  }

  async getRenovationResult(sessionId: string): Promise<RenovationResult> {
    const response = await fetch(`${API_BASE_URL}/${sessionId}/result`);

    if (!response.ok) {
      throw new Error('Failed to fetch renovation result');
    }

    return response.json();
  }

  async getRendering(sessionId: string): Promise<RenderingResponse> {
    const response = await fetch(`${API_BASE_URL}/${sessionId}/rendering`);

    if (!response.ok) {
      throw new Error('Failed to fetch rendering');
    }

    return response.json();
  }

  async editRendering(
    sessionId: string,
    request: EditRenderingRequest
  ): Promise<EditRenderingResponse> {
    const response = await fetch(`${API_BASE_URL}/${sessionId}/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to edit rendering');
    }

    return response.json();
  }

  async pollForResult(
    sessionId: string,
    maxAttempts = 30,
    intervalMs = 2000
  ): Promise<RenovationResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this.getRenovationResult(sessionId);
      
      if (result.completed) {
        return result;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Timeout waiting for renovation result');
  }

  async pollForRendering(
    sessionId: string,
    maxAttempts = 20,
    intervalMs = 3000
  ): Promise<RenderingResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this.getRendering(sessionId);
      
      if (result.renderingCompleted) {
        return result;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Timeout waiting for rendering');
  }
}

export const renovationApi = new RenovationApiService();