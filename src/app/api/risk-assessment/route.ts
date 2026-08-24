import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCyclePrediction, getCycleRiskAssessment } from '@/lib/cycle-prediction'
import { isUnauthorized, requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await requireUserId()
    const [profile, healthLogs] = await Promise.all([
      db.userProfile.findUnique({ where: { userId } }),
      db.healthLog.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 180 }),
    ])
    const prediction = getCyclePrediction({ profile, healthLogs })
    const assessment = getCycleRiskAssessment({ profile, healthLogs, prediction })

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        assessment,
        prediction,
        disclaimer: 'This is a pattern-screening tool, not a diagnosis. It cannot estimate conditions that are not labeled in the training data.',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('Failed to calculate risk assessment:', error)
    return NextResponse.json({ error: 'Failed to calculate risk assessment' }, { status: 500 })
  }
}
