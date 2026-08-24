import { beforeEach, describe, expect, it, vi } from 'vitest'

const generateContent = vi.fn()

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent }
  },
}))

import { generateWithModelRotation, MODEL_CHAIN } from '@/lib/ai-models'

const request = {
  apiKey: 'test-key',
  systemInstruction: 'Use records safely',
  contents: [{ role: 'user' as const, parts: [{ text: 'How was my sleep?' }] }],
  timeoutMs: 100,
}

describe('model rotation', () => {
  beforeEach(() => {
    generateContent.mockReset()
  })

  it('uses Gemma first and then the requested Gemini order', () => {
    expect(MODEL_CHAIN).toEqual([
      'gemma-4-26b-a4b-it',
      'gemini-3.5-flash',
      'gemini-3-flash-preview',
      'gemini-2.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash-lite',
    ])
  })

  it('rotates after a retryable provider error', async () => {
    generateContent
      .mockRejectedValueOnce(new Error('429 RESOURCE_EXHAUSTED'))
      .mockResolvedValueOnce({ text: 'A grounded answer', promptFeedback: undefined })
    const result = await generateWithModelRotation(request)
    expect(result.model).toBe('gemini-3.5-flash')
    expect(result.attempts.map((attempt) => attempt.status)).toEqual(['failed', 'succeeded'])
  })

  it('does not rotate around a safety block', async () => {
    generateContent.mockRejectedValueOnce(new Error('Request blocked by safety policy'))
    const result = await generateWithModelRotation(request)
    expect(result.blocked).toBe(true)
    expect(generateContent).toHaveBeenCalledTimes(1)
  })

  it('returns no cloud result when every model fails', async () => {
    generateContent.mockImplementation(() => {
      throw new Error('503 provider unavailable')
    })
    const result = await generateWithModelRotation(request)
    expect(result.text).toBeNull()
    expect(result.attempts).toHaveLength(MODEL_CHAIN.length)
  })
})
