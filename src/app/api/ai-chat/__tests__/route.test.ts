import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  conversationFindMany: vi.fn(),
  conversationFindFirst: vi.fn(),
  conversationCreate: vi.fn(),
  conversationUpdate: vi.fn(),
  conversationDeleteMany: vi.fn(),
  messageCount: vi.fn(),
  messageCreate: vi.fn(),
  messageFindMany: vi.fn(),
  preferenceFind: vi.fn(),
  profileFind: vi.fn(),
  healthLogsFind: vi.fn(),
  attemptsCreateMany: vi.fn(),
  ensureKnowledge: vi.fn(),
  searchKnowledge: vi.fn(),
  generate: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  requireUserId: mocks.requireUserId,
  isUnauthorized: (error: unknown) => error instanceof Error && error.message === 'UNAUTHORIZED',
}))

vi.mock('@/lib/db', () => ({
  db: {
    chatConversation: {
      findMany: mocks.conversationFindMany,
      findFirst: mocks.conversationFindFirst,
      create: mocks.conversationCreate,
      update: mocks.conversationUpdate,
      deleteMany: mocks.conversationDeleteMany,
    },
    chatMessage: {
      count: mocks.messageCount,
      create: mocks.messageCreate,
      findMany: mocks.messageFindMany,
    },
    aiPreference: { findUnique: mocks.preferenceFind },
    userProfile: { findUnique: mocks.profileFind },
    healthLog: { findMany: mocks.healthLogsFind },
    chatGenerationAttempt: { createMany: mocks.attemptsCreateMany },
  },
}))

vi.mock('@/lib/rag', () => ({
  ensureUserKnowledge: mocks.ensureKnowledge,
  searchUserKnowledge: mocks.searchKnowledge,
  citationsFor: (chunks: Array<{ title: string; sourceType: string; sourceDate: Date | null }>) => chunks.map((chunk) => ({
    label: chunk.title,
    sourceType: chunk.sourceType,
    date: chunk.sourceDate?.toISOString() ?? null,
  })),
  promptContextFor: () => '<record label="Health log, Aug 18">Sleep: 5</record>',
}))

vi.mock('@/lib/ai-models', () => ({ generateWithModelRotation: mocks.generate }))

vi.mock('@/lib/cycle-prediction', () => ({
  getCyclePrediction: () => ({ predictedNextPeriodLabel: 'Aug 30', currentPhase: 'luteal', daysUntilNext: 6 }),
  getCycleRiskAssessment: () => ({
    title: 'Keep tracking',
    summary: 'There is enough data for basic guidance.',
    riskLevel: 'low',
    riskFactors: [],
    riskAreas: [{ key: 'recovery', level: 'low', summary: 'Recent recovery looks steady.' }],
    modelSignals: [{ estimatedMarkerProbability: 0.12, confidence: 'medium' }],
    modelTarget: 'unusual bleeding pattern',
    dataQuality: { status: 'good' },
  }),
}))

import { DELETE, GET, POST } from '@/app/api/ai-chat/route'

const now = new Date('2026-08-24T12:00:00.000Z')
const conversation = { id: 'conversation-1', title: 'Sleep check', userId: 'user-a', createdAt: now, updatedAt: now }

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('AI chat API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.requireUserId.mockResolvedValue('user-a')
    mocks.messageCount.mockResolvedValue(0)
    mocks.conversationFindFirst.mockResolvedValue(conversation)
    mocks.conversationCreate.mockResolvedValue(conversation)
    mocks.conversationUpdate.mockResolvedValue(conversation)
    mocks.messageFindMany.mockResolvedValue([{ role: 'user', content: 'How was my sleep?' }])
    mocks.preferenceFind.mockResolvedValue({ cloudAiEnabled: false, consentVersion: '2026-08-health-rag-v1', consentedAt: null, decisionAt: now })
    mocks.profileFind.mockResolvedValue(null)
    mocks.healthLogsFind.mockResolvedValue([])
    mocks.searchKnowledge.mockResolvedValue([{
      id: 'private-chunk-id',
      sourceType: 'health-log',
      sourceDate: new Date('2026-08-18T12:00:00.000Z'),
      title: 'Health log, Aug 18',
      content: 'Sleep: 5',
      metadata: null,
      score: 1,
    }])
    mocks.generate.mockResolvedValue({ text: null, provider: null, model: null, blocked: false, attempts: [] })
    mocks.messageCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: data.role === 'assistant' ? 'assistant-1' : 'user-message-1',
      role: data.role,
      content: data.content,
      provider: data.provider ?? '',
      model: data.model ?? '',
      mode: data.mode ?? 'user',
      citations: data.citations ?? null,
      status: data.status ?? 'completed',
      createdAt: now,
    }))
  })

  it('loads only a conversation owned by the authenticated user', async () => {
    mocks.conversationFindMany.mockResolvedValue([conversation])
    mocks.conversationFindFirst.mockResolvedValue({ ...conversation, messages: [] })
    const response = await GET(new NextRequest('http://localhost/api/ai-chat?conversationId=conversation-1'))
    expect(response.status).toBe(200)
    expect(mocks.conversationFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'conversation-1', userId: 'user-a' },
    }))
  })

  it('deletes conversations with both conversation and tenant filters', async () => {
    mocks.conversationDeleteMany.mockResolvedValue({ count: 1 })
    const response = await DELETE(new NextRequest('http://localhost/api/ai-chat?conversationId=conversation-1', { method: 'DELETE' }))
    expect(response.status).toBe(200)
    expect(mocks.conversationDeleteMany).toHaveBeenCalledWith({ where: { id: 'conversation-1', userId: 'user-a' } })
  })

  it('enforces the database-backed per-user rate limit', async () => {
    mocks.messageCount.mockResolvedValue(8)
    const response = await POST(postRequest({ message: 'Hello' }))
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(mocks.conversationCreate).not.toHaveBeenCalled()
  })

  it('keeps excerpts out of cloud generation when consent is off and returns citations', async () => {
    const response = await POST(postRequest({ message: 'How was my sleep?', conversationId: 'conversation-1' }))
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(mocks.searchKnowledge).toHaveBeenCalledWith('user-a', 'How was my sleep?', { allowEmbedding: false, limit: 8 })
    expect(data.mode).toBe('local-risk-assistant')
    expect(data.sources).toEqual([expect.objectContaining({ label: 'Health log, Aug 18' })])
    expect(JSON.stringify(data.sources)).not.toContain('private-chunk-id')
  })

  it('uses server-loaded history and falls back if all cloud models fail', async () => {
    mocks.preferenceFind.mockResolvedValue({
      cloudAiEnabled: true,
      consentVersion: '2026-08-health-rag-v1',
      consentedAt: now,
      decisionAt: now,
    })
    mocks.generate.mockResolvedValue({
      text: null,
      provider: null,
      model: null,
      blocked: false,
      attempts: [{ provider: 'google-gemma', model: 'gemma-4-26b-a4b-it', status: 'failed', latencyMs: 10, errorCode: 'PROVIDER_ERROR' }],
    })
    const response = await POST(postRequest({ message: 'Compare my sleep', conversationId: 'conversation-1' }))
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(mocks.messageFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-a', conversationId: 'conversation-1' },
      take: 12,
    }))
    expect(mocks.attemptsCreateMany).toHaveBeenCalled()
    expect(data.model).toBe('local-risk-assistant')
    expect(data.fallbackReason).toBe('missing-api-key')
  })

  it('returns a consistent 400 response for malformed JSON', async () => {
    const request = new NextRequest('http://localhost/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad json',
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual(expect.objectContaining({ error: 'Invalid request' }))
  })
})
