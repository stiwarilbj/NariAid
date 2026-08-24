import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isUnauthorized, requireUserId } from '@/lib/auth'
import { ZodError } from 'zod'
import { readJson, validationError, wellnessCreateSchema, wellnessUpdateSchema } from '@/lib/api-validation'
import { buildWellnessChunk, removeKnowledgeChunk, upsertKnowledgeChunk } from '@/lib/rag'
import { scheduleRagEmbeddings } from '@/lib/rag-route'

export async function GET() {
  try {
    const userId = await requireUserId()
    const entries = await db.wellnessEntry.findMany({ where: { userId }, orderBy: { date: 'desc' } })
    return NextResponse.json(entries)
  } catch (error) {
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to fetch wellness entries' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const data = await readJson(req, wellnessCreateSchema)
    const saved = await db.$transaction(async (tx) => {
      const created = await tx.wellnessEntry.create({ data: { ...data, userId } })
      await tx.activityLog.create({
        data: { action: 'Created wellness entry', category: 'wellness', details: `Date: ${data.date}`, userId },
      })
      const chunk = buildWellnessChunk(created)
      const result = await upsertKnowledgeChunk(tx, userId, chunk)
      return { record: created, embeddings: [{ chunk, result }] }
    })
    scheduleRagEmbeddings(userId, saved.embeddings)
    return NextResponse.json(saved.record)
  } catch (error) {
    if (error instanceof ZodError) return validationError(error)
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to create wellness entry' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const { id, ...updateData } = await readJson(req, wellnessUpdateSchema)
    const saved = await db.$transaction(async (tx) => {
      const updated = await tx.wellnessEntry.updateMany({ where: { id, userId }, data: updateData })
      if (!updated.count) return null
      const record = await tx.wellnessEntry.findFirst({ where: { id, userId } })
      if (!record) return null
      const chunk = buildWellnessChunk(record)
      const result = await upsertKnowledgeChunk(tx, userId, chunk)
      return { record, embeddings: [{ chunk, result }] }
    })
    if (!saved) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    scheduleRagEmbeddings(userId, saved.embeddings)
    return NextResponse.json(saved.record)
  } catch (error) {
    if (error instanceof ZodError) return validationError(error)
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to update wellness entry' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const deleted = await db.$transaction(async (tx) => {
      const result = await tx.wellnessEntry.deleteMany({ where: { id, userId } })
      if (result.count) await removeKnowledgeChunk(tx, userId, 'wellness', id)
      return result
    })
    if (!deleted.count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to delete wellness entry' }, { status: 500 })
  }
}
