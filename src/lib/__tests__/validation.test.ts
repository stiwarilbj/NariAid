import { describe, expect, it } from 'vitest'
import { chatRequestSchema, healthLogCreateSchema, healthLogUpdateSchema, profileUpdateSchema } from '@/lib/api-validation'

describe('API validation', () => {
  it('rejects oversized and empty chat messages', () => {
    expect(chatRequestSchema.safeParse({ message: '' }).success).toBe(false)
    expect(chatRequestSchema.safeParse({ message: 'x'.repeat(2001) }).success).toBe(false)
  })

  it('rejects impossible tracker values and extra fields', () => {
    expect(healthLogCreateSchema.safeParse({ date: '2026-08-18', pain: 99 }).success).toBe(false)
    expect(healthLogCreateSchema.safeParse({ date: '2026-08-18', userId: 'another-user' }).success).toBe(false)
  })

  it('accepts the existing profile UI shape but constrains goal count', () => {
    expect(profileUpdateSchema.safeParse({
      age: 28,
      avatarColor: 'rose',
      healthGoals: ['better-sleep'],
    }).success).toBe(true)
    expect(profileUpdateSchema.safeParse({ healthGoals: Array.from({ length: 31 }, (_, index) => `goal-${index}`) }).success).toBe(false)
  })

  it('does not inject create defaults into a partial update', () => {
    expect(healthLogUpdateSchema.parse({ id: 'log-1', pain: 3 })).toEqual({ id: 'log-1', pain: 3 })
  })
})
