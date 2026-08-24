import { GoogleGenAI } from '@google/genai'

export const MODEL_CHAIN = [
  'gemma-4-26b-a4b-it',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
] as const

export interface ModelAttempt {
  provider: 'google-gemma' | 'google-gemini'
  model: string
  status: 'succeeded' | 'failed' | 'blocked'
  latencyMs: number
  errorCode: string
}

export interface RotationResult {
  text: string | null
  provider: 'google-gemma' | 'google-gemini' | null
  model: string | null
  blocked: boolean
  attempts: ModelAttempt[]
}

function providerFor(model: string): ModelAttempt['provider'] {
  return model.startsWith('gemma-') ? 'google-gemma' : 'google-gemini'
}

function errorDetails(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()
  if (/safety|blocked|prohibited|policy|finish.?reason.*safety/.test(normalized)) return { code: 'SAFETY_BLOCK', retryable: false }
  if (/timed out|timeout/.test(normalized)) return { code: 'TIMEOUT', retryable: true }
  if (/429|resource_exhausted|rate.?limit|quota/.test(normalized)) return { code: 'RATE_LIMIT', retryable: true }
  if (/404|not found|unsupported model|model.*unavailable/.test(normalized)) return { code: 'MODEL_UNAVAILABLE', retryable: true }
  if (/500|502|503|504|internal|unavailable|network|fetch failed/.test(normalized)) return { code: 'PROVIDER_ERROR', retryable: true }
  if (/400|invalid argument|bad request/.test(normalized)) return { code: 'INVALID_REQUEST', retryable: false }
  return { code: 'UNKNOWN_PROVIDER_ERROR', retryable: true }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Model request timed out')), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function generateWithModelRotation({
  apiKey,
  systemInstruction,
  contents,
  timeoutMs = 7000,
}: {
  apiKey: string
  systemInstruction: string
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
  timeoutMs?: number
}): Promise<RotationResult> {
  const attempts: ModelAttempt[] = []
  if (!apiKey) return { text: null, provider: null, model: null, blocked: false, attempts }

  const ai = new GoogleGenAI({ apiKey })
  for (const model of MODEL_CHAIN) {
    const started = Date.now()
    const provider = providerFor(model)
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.2,
            maxOutputTokens: 450,
          },
        }),
        timeoutMs
      )
      const text = response.text?.trim()
      const blockReason = String(response.promptFeedback?.blockReason ?? '')
      if (blockReason) {
        attempts.push({ provider, model, status: 'blocked', latencyMs: Date.now() - started, errorCode: 'SAFETY_BLOCK' })
        return { text: null, provider: null, model: null, blocked: true, attempts }
      }
      if (!text) throw new Error('Provider returned an empty response')
      attempts.push({ provider, model, status: 'succeeded', latencyMs: Date.now() - started, errorCode: '' })
      return { text, provider, model, blocked: false, attempts }
    } catch (error) {
      const details = errorDetails(error)
      attempts.push({
        provider,
        model,
        status: details.code === 'SAFETY_BLOCK' ? 'blocked' : 'failed',
        latencyMs: Date.now() - started,
        errorCode: details.code,
      })
      if (!details.retryable) return { text: null, provider: null, model: null, blocked: details.code === 'SAFETY_BLOCK', attempts }
    }
  }

  return { text: null, provider: null, model: null, blocked: false, attempts }
}
