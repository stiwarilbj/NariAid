import { after, NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { db } from '@/lib/db'
import { isUnauthorized, requireUserId } from '@/lib/auth'
import { aiPreferenceSchema, readJson, validationError } from '@/lib/api-validation'
import { AI_CONSENT_VERSION } from '@/lib/ai-consent'
import { backfillUserKnowledge } from '@/lib/rag'

export const maxDuration = 60

function payload(preference: {
  cloudAiEnabled: boolean
  consentVersion: string
  consentedAt: Date | null
  decisionAt: Date | null
}) {
  return {
    cloudAiEnabled: preference.cloudAiEnabled,
    consentVersion: preference.consentVersion,
    consentedAt: preference.consentedAt?.toISOString() ?? null,
    decisionAt: preference.decisionAt?.toISOString() ?? null,
    consentRequired: preference.consentVersion !== AI_CONSENT_VERSION,
    currentConsentVersion: AI_CONSENT_VERSION,
  }
}

export async function GET() {
  try {
    const userId = await requireUserId()
    const preference = await db.aiPreference.findUnique({ where: { userId } })
    if (!preference) {
      return NextResponse.json({
        cloudAiEnabled: false,
        consentVersion: '',
        consentedAt: null,
        decisionAt: null,
        consentRequired: true,
        currentConsentVersion: AI_CONSENT_VERSION,
      })
    }
    return NextResponse.json(payload(preference))
  } catch (error) {
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to load AI preferences' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = await readJson(req, aiPreferenceSchema)
    if (body.consentVersion !== AI_CONSENT_VERSION) {
      return NextResponse.json({ error: 'Consent notice is out of date. Refresh and try again.' }, { status: 409 })
    }
    const now = new Date()
    const preference = await db.aiPreference.upsert({
      where: { userId },
      update: {
        cloudAiEnabled: body.cloudAiEnabled,
        consentVersion: AI_CONSENT_VERSION,
        consentedAt: body.cloudAiEnabled ? now : null,
        decisionAt: now,
      },
      create: {
        userId,
        cloudAiEnabled: body.cloudAiEnabled,
        consentVersion: AI_CONSENT_VERSION,
        consentedAt: body.cloudAiEnabled ? now : null,
        decisionAt: now,
      },
    })
    if (body.cloudAiEnabled) {
      after(async () => {
        try {
          await backfillUserKnowledge(userId, { embed: true })
        } catch {
          console.error('Failed to refresh consented RAG embeddings')
        }
      })
    }
    return NextResponse.json(payload(preference))
  } catch (error) {
    if (error instanceof ZodError) return validationError(error)
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to update AI preferences' }, { status: 500 })
  }
}
