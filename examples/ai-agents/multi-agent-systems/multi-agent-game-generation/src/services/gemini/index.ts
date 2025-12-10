/**
 * Gemini AI Service
 * Handles all interactions with Google's Gemini API for multi-agent game generation
 */
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import { generateArchitectureDesign } from './architect-agent'
import { generateGameCode } from './engineer-agent'
import { reviewCode } from './qa-agent'
import { finalValidation } from './chief-qa-agent'

// Initialize the Gemini client
const getClient = (): GoogleGenerativeAI => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set')
  }
  return new GoogleGenerativeAI(apiKey)
}

// Get the Gemini model
export const getModel = (modelName: string = 'gemini-2.0-flash'): GenerativeModel => {
  const client = getClient()
  return client.getGenerativeModel({ model: modelName })
}

// Export all agent functions
export const geminiService = {
  generateArchitectureDesign,
  generateGameCode,
  reviewCode,
  finalValidation,
  getModel,
}

