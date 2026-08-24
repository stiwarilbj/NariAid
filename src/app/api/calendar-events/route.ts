import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isUnauthorized, requireUserId } from '@/lib/auth'
import { ZodError } from 'zod'
import { calendarEventCreateSchema, calendarEventUpdateSchema, readJson, validationError } from '@/lib/api-validation'
import { buildCalendarEventChunk, removeKnowledgeChunk, upsertKnowledgeChunk } from '@/lib/rag'
import { scheduleRagEmbeddings } from '@/lib/rag-route'

export async function GET() {
  try {
    const userId = await requireUserId()
    const events = await db.calendarEvent.findMany({ where: { userId }, orderBy: { date: 'asc' } })
    return NextResponse.json(events)
  } catch (error) {
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const data = await readJson(req, calendarEventCreateSchema)
    const saved = await db.$transaction(async (tx) => {
      const created = await tx.calendarEvent.create({ data: { ...data, userId } })
      await tx.activityLog.create({
        data: { action: 'Created calendar event', category: 'calendar', details: data.title, userId },
      })
      const chunk = buildCalendarEventChunk(created)
      const result = await upsertKnowledgeChunk(tx, userId, chunk)
      return { record: created, embeddings: [{ chunk, result }] }
    })
    scheduleRagEmbeddings(userId, saved.embeddings)
    return NextResponse.json(saved.record)
  } catch (error) {
    if (error instanceof ZodError) return validationError(error)
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const { id, ...updateData } = await readJson(req, calendarEventUpdateSchema)
    const saved = await db.$transaction(async (tx) => {
      const updated = await tx.calendarEvent.updateMany({ where: { id, userId }, data: updateData })
      if (!updated.count) return null
      const record = await tx.calendarEvent.findFirst({ where: { id, userId } })
      if (!record) return null
      const chunk = buildCalendarEventChunk(record)
      const result = await upsertKnowledgeChunk(tx, userId, chunk)
      return { record, embeddings: [{ chunk, result }] }
    })
    if (!saved) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    scheduleRagEmbeddings(userId, saved.embeddings)
    return NextResponse.json(saved.record)
  } catch (error) {
    if (error instanceof ZodError) return validationError(error)
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to update calendar event' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const deleted = await db.$transaction(async (tx) => {
      const result = await tx.calendarEvent.deleteMany({ where: { id, userId } })
      if (result.count) await removeKnowledgeChunk(tx, userId, 'calendar-event', id)
      return result
    })
    if (!deleted.count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to delete calendar event' }, { status: 500 })
  }
}
