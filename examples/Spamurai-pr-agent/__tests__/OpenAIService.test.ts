/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import OpenAI from 'openai'
import { OpenAIService } from '../services/open-ai.service'

vi.mock('openai')

describe('OpenAIService', () => {
    let service: OpenAIService
    let mockCreateCompletion: ReturnType<typeof vi.fn>

    const mockResponse = {
        choices: [
            {
                message: {
                    content: JSON.stringify({
                        isSpam: false,
                        spamConfidence: 0.1,
                        PRConfidence: 0.9,
                        quality: 0.85,
                        reasons: ['Fixes real issue', 'Well-tested'],
                        feedback: 'Great job! Just make sure to add more test coverage next time.',
                        recommendedAction: 'approve',
                    }),
                },
            },
        ],
    }

    beforeEach(() => {
        mockCreateCompletion = vi.fn().mockResolvedValue(mockResponse)

        const MockOpenAI = OpenAI as unknown as { new(): any }
            ; (MockOpenAI as any).mockImplementation(() => ({
                chat: {
                    completions: {
                        create: mockCreateCompletion,
                    },
                },
            }))

        service = new OpenAIService()
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('should analyze PR and return parsed result', async () => {
        const input = {
            prTitle: 'Fix login issue',
            prDescription: 'Fixed a bug in login flow',
            prDiff: 'diff --git a/login.js b/login.js\n...',
        }

        const result = await service.analyzePRForSpam(input)

        expect(mockCreateCompletion).toHaveBeenCalledOnce()
        expect(result).toMatchObject({
            isSpam: false,
            spamConfidence: 0.1,
            PRConfidence: 0.9,
            quality: 0.85,
            recommendedAction: 'approve',
        })
    })

    it('should return null if OpenAI throws an error', async () => {
        mockCreateCompletion.mockRejectedValueOnce(new Error('API error'))

        const result = await service.analyzePRForSpam({
            prTitle: 'Refactor',
            prDescription: 'Minor update',
            prDiff: 'diff --git a/file.js b/file.js\n...',
        })

        expect(result).toBeNull()
    })

    it('should handle empty response content gracefully', async () => {
        mockCreateCompletion.mockResolvedValueOnce({
            choices: [{ message: { content: '' } }],
        })

        const result = await service.analyzePRForSpam({
            prTitle: 'Title',
            prDescription: 'Description',
            prDiff: 'Diff',
        })

        expect(result).toEqual([])
    })

    it('should handle invalid JSON response content', async () => {
        mockCreateCompletion.mockResolvedValueOnce({
            choices: [{ message: { content: 'not valid json' } }],
        })

        const result = await service.analyzePRForSpam({
            prTitle: 'Title',
            prDescription: 'Description',
            prDiff: 'Diff',
        })

        expect(result).toBeNull()
    })
})
