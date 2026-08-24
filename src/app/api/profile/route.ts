import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isUnauthorized, requireUserId } from '@/lib/auth'
import { ZodError } from 'zod'
import { profileUpdateSchema, readJson, validationError } from '@/lib/api-validation'
import { buildProfileChunk, syncFedCycleKnowledge, upsertKnowledgeChunk } from '@/lib/rag'
import { scheduleRagEmbeddings } from '@/lib/rag-route'

function parseHealthGoals(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []
  }
}

function serializeProfile<T extends { healthGoals: string; accentColor: string }>(profile: T) {
  return { ...profile, healthGoals: parseHealthGoals(profile.healthGoals), avatarColor: profile.accentColor }
}

export async function GET() {
  try {
    const userId = await requireUserId()
    const account = await db.appUser.findUnique({ where: { id: userId } })
    const result = await db.$transaction(async (tx) => {
      const profile = await tx.userProfile.upsert({
        where: { userId },
        update: account?.email ? { email: account.email } : {},
        create: {
          userId,
          name: account?.name || 'User',
          email: account?.email || '',
          avatar: account?.image || '',
        },
      })
      const chunk = buildProfileChunk(profile)
      const chunkResult = await upsertKnowledgeChunk(tx, userId, chunk)
      const fedCycle = await syncFedCycleKnowledge(tx, userId)
      return { profile, embeddings: [{ chunk, result: chunkResult }, fedCycle] }
    })
    scheduleRagEmbeddings(userId, result.embeddings)
    return NextResponse.json(serializeProfile(result.profile))
  } catch (error) {
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const { id: _ignoredId, avatarColor, healthGoals, ...input } = await readJson(req, profileUpdateSchema)
    void _ignoredId
    const data = {
      ...input,
      ...(avatarColor ? { accentColor: avatarColor } : {}),
      ...(healthGoals ? { healthGoals: JSON.stringify(healthGoals) } : {}),
    }
    const result = await db.$transaction(async (tx) => {
      const profile = await tx.userProfile.upsert({
        where: { userId },
        update: data,
        create: { ...data, userId },
      })
      const chunk = buildProfileChunk(profile)
      const chunkResult = await upsertKnowledgeChunk(tx, userId, chunk)
      const fedCycle = await syncFedCycleKnowledge(tx, userId)
      return { profile, embeddings: [{ chunk, result: chunkResult }, fedCycle] }
    })
    scheduleRagEmbeddings(userId, result.embeddings)
    return NextResponse.json(serializeProfile(result.profile))
  } catch (error) {
    if (error instanceof ZodError) return validationError(error)
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
