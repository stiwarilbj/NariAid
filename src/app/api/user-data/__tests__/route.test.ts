import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  transaction: vi.fn(),
  deletes: {
    chatMessage: vi.fn(),
    chatConversation: vi.fn(),
    chatGenerationAttempt: vi.fn(),
    healthKnowledgeChunk: vi.fn(),
    aiPreference: vi.fn(),
    activityLog: vi.fn(),
    calendarEvent: vi.fn(),
    reminder: vi.fn(),
    wellnessEntry: vi.fn(),
    healthLog: vi.fn(),
    userProfile: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({
  requireUserId: mocks.requireUserId,
  isUnauthorized: (error: unknown) => error instanceof Error && error.message === 'UNAUTHORIZED',
}))

vi.mock('@/lib/db', () => ({ db: { $transaction: mocks.transaction } }))

import { DELETE } from '@/app/api/user-data/route'

describe('clear health data API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.requireUserId.mockResolvedValue('user-a')
    const tx = Object.fromEntries(Object.entries(mocks.deletes).map(([name, deleteMany]) => [name, { deleteMany }]))
    mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<void>) => callback(tx))
  })

  it('clears every health and RAG table for only the signed-in user while keeping the account', async () => {
    const response = await DELETE()
    expect(response.status).toBe(200)
    for (const deleteMany of Object.values(mocks.deletes)) {
      expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-a' } })
    }
  })

  it('does not start a transaction without authentication', async () => {
    mocks.requireUserId.mockRejectedValue(new Error('UNAUTHORIZED'))
    const response = await DELETE()
    expect(response.status).toBe(401)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
