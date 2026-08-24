import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isUnauthorized, requireUserId } from '@/lib/auth'
import { getCyclePrediction, getCycleRiskAssessment } from '@/lib/cycle-prediction'
import { ZodError } from 'zod'
import { healthLogCreateSchema, healthLogUpdateSchema, readJson, validationError } from '@/lib/api-validation'
import { buildHealthLogChunk, removeKnowledgeChunk, syncFedCycleKnowledge, upsertKnowledgeChunk } from '@/lib/rag'
import { scheduleRagEmbeddings } from '@/lib/rag-route'

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const { searchParams } = new URL(req.url)
    const days = searchParams.get('days')
    const format = searchParams.get('format')
    const logs = await db.healthLog.findMany({ where: { userId }, orderBy: { date: 'desc' } })

    let filtered = logs
    if (days && days !== 'all') {
      const daysNum = parseInt(days, 10)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - daysNum)
      const cutoffStr = cutoff.toISOString().split('T')[0]
      filtered = logs.filter((log) => log.date >= cutoffStr)
    }

    if (format === 'csv') {
      const profile = await db.userProfile.findUnique({ where: { userId } })
      const prediction = getCyclePrediction({ profile, healthLogs: filtered })
      const assessment = getCycleRiskAssessment({ profile, healthLogs: filtered, prediction })
      const headers = [
        'Date', 'Mood', 'Energy', 'Sleep', 'Stress', 'Pain', 'Symptoms', 'Notes',
        'Water Intake', 'Risk Level', 'Health Description', 'Potential Problems',
        'Period Countdown Days', 'Estimated Date', 'Current Phase', 'Model', 'Model Test Result',
      ]
      const rows = filtered.map((log) => [
        log.date,
        log.mood,
        log.energy,
        log.sleep,
        log.stress,
        log.pain,
        log.symptoms,
        log.notes,
        log.waterIntake,
        assessment.title,
        assessment.summary,
        assessment.riskFactors.join('; '),
        prediction.daysUntilNext ?? '',
        prediction.predictedNextPeriod ?? prediction.predictedNextPeriodLabel,
        prediction.currentPhase,
        assessment.modelName,
        assessment.modelPerformance,
      ])
      const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=nariaid-health-logs.csv',
        },
      })
    }

    return NextResponse.json(filtered)
  } catch (error) {
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Failed to fetch health logs:', error)
    return NextResponse.json({ error: 'Failed to fetch health logs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const data = await readJson(req, healthLogCreateSchema)
    const saved = await db.$transaction(async (tx) => {
      const created = await tx.healthLog.create({ data: { ...data, userId } })
      await tx.activityLog.create({
        data: { action: 'Created health log entry', category: 'health-log', details: `Date: ${data.date}`, userId },
      })
      const chunk = buildHealthLogChunk(created)
      const result = await upsertKnowledgeChunk(tx, userId, chunk)
      const fedCycle = await syncFedCycleKnowledge(tx, userId)
      return { record: created, embeddings: [{ chunk, result }, fedCycle] }
    })
    scheduleRagEmbeddings(userId, saved.embeddings)
    return NextResponse.json(saved.record)
  } catch (error) {
    if (error instanceof ZodError) return validationError(error)
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to create health log' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const { id, ...data } = await readJson(req, healthLogUpdateSchema)
    const saved = await db.$transaction(async (tx) => {
      const updated = await tx.healthLog.updateMany({ where: { id, userId }, data })
      if (!updated.count) return null
      const record = await tx.healthLog.findFirst({ where: { id, userId } })
      if (!record) return null
      const chunk = buildHealthLogChunk(record)
      const result = await upsertKnowledgeChunk(tx, userId, chunk)
      const fedCycle = await syncFedCycleKnowledge(tx, userId)
      return { record, embeddings: [{ chunk, result }, fedCycle] }
    })
    if (!saved) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    scheduleRagEmbeddings(userId, saved.embeddings)
    return NextResponse.json(saved.record)
  } catch (error) {
    if (error instanceof ZodError) return validationError(error)
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to update health log' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const deleted = await db.$transaction(async (tx) => {
      const result = await tx.healthLog.deleteMany({ where: { id, userId } })
      if (result.count) await removeKnowledgeChunk(tx, userId, 'health-log', id)
      const fedCycle = result.count ? await syncFedCycleKnowledge(tx, userId) : null
      return { result, fedCycle }
    })
    if (!deleted.result.count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (deleted.fedCycle) scheduleRagEmbeddings(userId, [deleted.fedCycle])
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to delete health log' }, { status: 500 })
  }
}
