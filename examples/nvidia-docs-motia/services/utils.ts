import { z } from 'zod';

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Commonly used zod types can be re-exported for convenience if desired
export { z };
