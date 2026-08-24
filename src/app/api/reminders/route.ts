import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isUnauthorized, requireUserId } from '@/lib/auth'
import { ZodError } from 'zod'
import { readJson, reminderCreateSchema, reminderUpdateSchema, validationError } from '@/lib/api-validation'
import { buildReminderChunk, removeKnowledgeChunk, upsertKnowledgeChunk } from '@/lib/rag'
import { scheduleRagEmbeddings } from '@/lib/rag-route'

export async function GET() {
  try {
    const userId = await requireUserId()
    const reminders = await db.reminder.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json(reminders)
  } catch (error) {
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const data = await readJson(req, reminderCreateSchema)
    const saved = await db.$transaction(async (tx) => {
      const created = await tx.reminder.create({ data: { ...data, userId } })
      await tx.activityLog.create({
        data: { action: 'Created reminder', category: 'reminders', details: data.title, userId },
      })
      const chunk = buildReminderChunk(created)
      const result = await upsertKnowledgeChunk(tx, userId, chunk)
      return { record: created, embeddings: [{ chunk, result }] }
    })
    scheduleRagEmbeddings(userId, saved.embeddings)
    return NextResponse.json(saved.record)
  } catch (error) {
    if (error instanceof ZodError) return validationError(error)
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const { id, ...updateData } = await readJson(req, reminderUpdateSchema)
    const saved = await db.$transaction(async (tx) => {
      const updated = await tx.reminder.updateMany({ where: { id, userId }, data: updateData })
      if (!updated.count) return null
      const record = await tx.reminder.findFirst({ where: { id, userId } })
      if (!record) return null
      const chunk = buildReminderChunk(record)
      const result = await upsertKnowledgeChunk(tx, userId, chunk)
      return { record, embeddings: [{ chunk, result }] }
    })
    if (!saved) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    scheduleRagEmbeddings(userId, saved.embeddings)
    return NextResponse.json(saved.record)
  } catch (error) {
    if (error instanceof ZodError) return validationError(error)
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const deleted = await db.$transaction(async (tx) => {
      const result = await tx.reminder.deleteMany({ where: { id, userId } })
      if (result.count) await removeKnowledgeChunk(tx, userId, 'reminder', id)
      return result
    })
    if (!deleted.count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 })
  }
}
