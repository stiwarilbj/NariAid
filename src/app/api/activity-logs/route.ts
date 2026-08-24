import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isUnauthorized, requireUserId } from '@/lib/auth'
import { ZodError } from 'zod'
import { activityCreateSchema, readJson, validationError } from '@/lib/api-validation'

export async function GET() {
  try {
    const userId = await requireUserId()
    const logs = await db.activityLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return NextResponse.json(logs)
  } catch (error) {
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId()
    const data = await readJson(req, activityCreateSchema)
    const log = await db.activityLog.create({ data: { ...data, userId } })
    return NextResponse.json(log)
  } catch (error) {
    if (error instanceof ZodError) return validationError(error)
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to create activity log' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const userId = await requireUserId()
    await db.activityLog.deleteMany({ where: { userId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to clear activity logs' }, { status: 500 })
  }
}
