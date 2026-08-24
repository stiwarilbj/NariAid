import { createHash } from 'crypto'
import { GoogleGenAI } from '@google/genai'
import type { Prisma, PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'
import { getCyclePrediction, getCycleRiskAssessment } from '@/lib/cycle-prediction'
import { AI_CONSENT_VERSION } from '@/lib/ai-consent'

export const EMBEDDING_MODEL = 'gemini-embedding-2'
export const EMBEDDING_DIMENSIONS = 768

type RagClient = PrismaClient | Prisma.TransactionClient

export interface KnowledgeChunkInput {
  sourceType: 'profile' | 'health-log' | 'wellness' | 'calendar-event' | 'reminder' | 'fedcycle-guidance'
  sourceId: string
  sourceDate: Date | null
  title: string
  content: string
  metadata: Record<string, string | number | boolean | null>
}

export interface RetrievedKnowledge {
  id: string
  sourceType: string
  sourceDate: Date | null
  title: string
  content: string
  metadata: Record<string, unknown> | null
  score: number
}

export interface RagCitation {
  label: string
  sourceType: string
  date: string | null
}

interface HealthLogLike {
  id: string
  date: string
  mood: number
  energy: number
  sleep: number
  stress: number
  pain: number
  symptoms: string
  notes: string
  waterIntake: number
  exercise: string
  weight: number
}

interface WellnessLike {
  id: string
  date: string
  meditation: number
  gratitude: string
  affirmations: string
  selfCare: string
  journalEntry: string
}

interface CalendarEventLike {
  id: string
  title: string
  date: string
  endDate: string
  type: string
  notes: string
}

interface ReminderLike {
  id: string
  title: string
  description: string
  time: string
  frequency: string
  category: string
  active: boolean
}

interface ProfileLike {
  id: string
  age: number
  lifeStage: string
  cycleLength: number
  lastPeriodStart: string
  healthGoals: string
}

function parseRecordDate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T12:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function stripDirectIdentifiers(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email removed]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[phone removed]')
    .replace(/\b(?:c[a-z0-9]{20,}|[0-9a-f]{24,}|[0-9a-f]{8}-[0-9a-f-]{27,})\b/gi, '[identifier removed]')
    .trim()
}

function clean(value: string | null | undefined, max = 3000) {
  return stripDirectIdentifiers(String(value ?? '')).slice(0, max)
}

function labelDate(value: Date | null) {
  if (!value) return null
  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function buildHealthLogChunk(log: HealthLogLike): KnowledgeChunkInput {
  const sourceDate = parseRecordDate(log.date)
  const values = [
    `Date: ${log.date}`,
    `Mood: ${log.mood}/10`,
    `Energy: ${log.energy}/10`,
    `Sleep: ${log.sleep} hours or tracker score`,
    `Stress: ${log.stress}/10`,
    `Pain: ${log.pain}/10`,
    `Symptoms: ${clean(log.symptoms) || 'none recorded'}`,
    `Notes: ${clean(log.notes) || 'none recorded'}`,
    `Water: ${log.waterIntake} cups`,
    `Exercise: ${clean(log.exercise, 500) || 'none recorded'}`,
    `Weight: ${log.weight > 0 ? `${log.weight} kg` : 'not recorded'}`,
  ]
  return {
    sourceType: 'health-log',
    sourceId: log.id,
    sourceDate,
    title: `Health log${labelDate(sourceDate) ? `, ${labelDate(sourceDate)}` : ''}`,
    content: values.join('\n'),
    metadata: { date: log.date, pain: log.pain, stress: log.stress, sleep: log.sleep },
  }
}

export function buildWellnessChunk(entry: WellnessLike): KnowledgeChunkInput {
  const sourceDate = parseRecordDate(entry.date)
  return {
    sourceType: 'wellness',
    sourceId: entry.id,
    sourceDate,
    title: `Wellness entry${labelDate(sourceDate) ? `, ${labelDate(sourceDate)}` : ''}`,
    content: [
      `Date: ${entry.date}`,
      `Meditation: ${entry.meditation} minutes`,
      `Gratitude: ${clean(entry.gratitude) || 'not recorded'}`,
      `Affirmations: ${clean(entry.affirmations) || 'not recorded'}`,
      `Self care: ${clean(entry.selfCare) || 'not recorded'}`,
      `Journal: ${clean(entry.journalEntry, 5000) || 'not recorded'}`,
    ].join('\n'),
    metadata: { date: entry.date, meditation: entry.meditation },
  }
}

export function buildCalendarEventChunk(event: CalendarEventLike): KnowledgeChunkInput {
  const sourceDate = parseRecordDate(event.date)
  return {
    sourceType: 'calendar-event',
    sourceId: event.id,
    sourceDate,
    title: `Cycle calendar${labelDate(sourceDate) ? `, ${labelDate(sourceDate)}` : ''}`,
    content: [
      `Date: ${event.date}${event.endDate ? ` through ${event.endDate}` : ''}`,
      `Event: ${clean(event.title, 200)}`,
      `Type: ${clean(event.type, 80)}`,
      `Notes: ${clean(event.notes) || 'none recorded'}`,
    ].join('\n'),
    metadata: { date: event.date, type: event.type },
  }
}

export function buildReminderChunk(reminder: ReminderLike): KnowledgeChunkInput {
  return {
    sourceType: 'reminder',
    sourceId: reminder.id,
    sourceDate: null,
    title: `Health reminder: ${clean(reminder.title, 120)}`,
    content: [
      `Reminder: ${clean(reminder.title, 200)}`,
      `Description: ${clean(reminder.description, 1000) || 'none recorded'}`,
      `Time: ${clean(reminder.time, 30)}`,
      `Frequency: ${clean(reminder.frequency, 50)}`,
      `Category: ${clean(reminder.category, 50)}`,
      `Active: ${reminder.active ? 'yes' : 'no'}`,
    ].join('\n'),
    metadata: { category: reminder.category, active: reminder.active },
  }
}

export function buildProfileChunk(profile: ProfileLike): KnowledgeChunkInput {
  let goals = profile.healthGoals
  try {
    const parsed = JSON.parse(profile.healthGoals)
    if (Array.isArray(parsed)) goals = parsed.filter((value): value is string => typeof value === 'string').join(', ')
  } catch {}
  return {
    sourceType: 'profile',
    sourceId: profile.id,
    sourceDate: null,
    title: 'Health profile baseline',
    content: [
      `Age: ${profile.age}`,
      `Life stage: ${clean(profile.lifeStage, 60)}`,
      `Usual cycle length: ${profile.cycleLength} days`,
      `Last period start: ${profile.lastPeriodStart || 'not recorded'}`,
      `Health goals: ${clean(goals) || 'not recorded'}`,
    ].join('\n'),
    metadata: { lifeStage: profile.lifeStage, cycleLength: profile.cycleLength },
  }
}

export function buildFedCycleChunk({ profile, healthLogs }: { profile: ProfileLike | null; healthLogs: HealthLogLike[] }): KnowledgeChunkInput {
  const prediction = getCyclePrediction({ profile, healthLogs })
  const guidance = getCycleRiskAssessment({ profile, healthLogs, prediction })
  const signal = guidance.modelSignals[0]
  return {
    sourceType: 'fedcycle-guidance',
    sourceId: 'current',
    sourceDate: new Date(),
    title: 'Current FedCycle and tracker guidance',
    content: [
      `Guidance: ${guidance.title}`,
      `Summary: ${guidance.summary}`,
      `Risk level: ${guidance.riskLevel}`,
      `Next period estimate: ${prediction.predictedNextPeriodLabel}`,
      `Current phase: ${prediction.currentPhase}`,
      `Unusual-bleeding pattern estimate: ${signal ? `${Math.round(signal.estimatedMarkerProbability * 100)}%` : 'not available'}`,
      `Input confidence: ${signal?.confidence ?? 'low'}`,
      `Data quality: ${guidance.dataQuality.status}`,
      `Risk factors: ${guidance.riskFactors.slice(0, 4).join(' ') || 'none identified'}`,
      'This compares tracker patterns with FedCycle records. It is not a diagnosis or a general disease-risk score.',
    ].join('\n'),
    metadata: {
      riskLevel: guidance.riskLevel,
      dataQuality: guidance.dataQuality.status,
      modelEstimate: signal?.estimatedMarkerProbability ?? null,
    },
  }
}

function contentHash(chunk: KnowledgeChunkInput) {
  return createHash('sha256').update(`${chunk.title}\n${chunk.content}`).digest('hex')
}

export async function upsertKnowledgeChunk(client: RagClient, userId: string, chunk: KnowledgeChunkInput) {
  const hash = contentHash(chunk)
  const key = { userId_sourceType_sourceId: { userId, sourceType: chunk.sourceType, sourceId: chunk.sourceId } }
  const existing = await client.healthKnowledgeChunk.findUnique({
    where: key,
    select: { id: true, contentHash: true, embeddingModel: true },
  })
  if (existing?.contentHash === hash) {
    return { id: existing.id, changed: false, needsEmbedding: existing.embeddingModel !== EMBEDDING_MODEL }
  }

  const saved = await client.healthKnowledgeChunk.upsert({
    where: key,
    update: {
      sourceDate: chunk.sourceDate,
      title: chunk.title,
      content: chunk.content,
      metadata: chunk.metadata as Prisma.InputJsonValue,
      contentHash: hash,
      embeddingModel: '',
    },
    create: {
      userId,
      sourceType: chunk.sourceType,
      sourceId: chunk.sourceId,
      sourceDate: chunk.sourceDate,
      title: chunk.title,
      content: chunk.content,
      metadata: chunk.metadata as Prisma.InputJsonValue,
      contentHash: hash,
    },
    select: { id: true },
  })
  if (existing) await client.$executeRaw`UPDATE "HealthKnowledgeChunk" SET "embedding" = NULL WHERE "id" = ${saved.id}`
  return { id: saved.id, changed: true, needsEmbedding: true }
}

export async function removeKnowledgeChunk(client: RagClient, userId: string, sourceType: string, sourceId: string) {
  await client.healthKnowledgeChunk.deleteMany({ where: { userId, sourceType, sourceId } })
}

function configuredApiKey() {
  const value = String(process.env.GEMINI_API_KEY ?? '').trim()
  return value && value !== 'your_actual_api_key_here' ? value : ''
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 8000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Embedding request timed out')), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function generateEmbeddings(texts: string[], taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'): Promise<Array<number[] | null>> {
  const apiKey = configuredApiKey()
  if (!apiKey || !texts.length) return texts.map(() => null)
  try {
    const ai = new GoogleGenAI({ apiKey })
    const result = await withTimeout(ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: texts.map((text) => text.slice(0, 8000)),
      config: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType },
    }))
    return texts.map((_, index) => {
      const values = result.embeddings?.[index]?.values
      if (!values || values.length !== EMBEDDING_DIMENSIONS || values.some((value) => !Number.isFinite(value))) return null
      return values
    })
  } catch {
    return texts.map(() => null)
  }
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  return (await generateEmbeddings([text], 'RETRIEVAL_QUERY'))[0]
}

export async function refreshChunkEmbeddingsIfAllowed(userId: string, chunks: Array<{ id: string; text: string }>) {
  if (!chunks.length) return 0
  const preference = await db.aiPreference.findUnique({ where: { userId }, select: { cloudAiEnabled: true, consentVersion: true } })
  if (!preference?.cloudAiEnabled || preference.consentVersion !== AI_CONSENT_VERSION) return 0

  let embedded = 0
  for (let start = 0; start < chunks.length; start += 20) {
    const batch = chunks.slice(start, start + 20)
    const vectors = await generateEmbeddings(batch.map((chunk) => chunk.text), 'RETRIEVAL_DOCUMENT')
    for (const [index, vectorValues] of vectors.entries()) {
      if (!vectorValues) continue
      const vector = `[${vectorValues.join(',')}]`
      const chunk = batch[index]
      const updated = await db.$executeRaw`UPDATE "HealthKnowledgeChunk" SET "embedding" = ${vector}::vector, "embeddingModel" = ${EMBEDDING_MODEL}, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${chunk.id} AND "userId" = ${userId}`
      if (updated) embedded++
    }
  }
  return embedded
}

export async function refreshChunkEmbeddingIfAllowed(userId: string, chunkId: string, text: string) {
  return (await refreshChunkEmbeddingsIfAllowed(userId, [{ id: chunkId, text }])) === 1
}

export async function syncChunk(userId: string, chunk: KnowledgeChunkInput, client: RagClient = db) {
  return upsertKnowledgeChunk(client, userId, chunk)
}

export async function backfillUserKnowledge(userId: string, { embed = false }: { embed?: boolean } = {}) {
  const [profile, healthLogs, wellnessEntries, calendarEvents, reminders] = await Promise.all([
    db.userProfile.findUnique({ where: { userId } }),
    db.healthLog.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 365 }),
    db.wellnessEntry.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 180 }),
    db.calendarEvent.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 180 }),
    db.reminder.findMany({ where: { userId } }),
  ])
  const chunks: KnowledgeChunkInput[] = [
    ...(profile ? [buildProfileChunk(profile)] : []),
    ...healthLogs.map(buildHealthLogChunk),
    ...wellnessEntries.map(buildWellnessChunk),
    ...calendarEvents.map(buildCalendarEventChunk),
    ...reminders.map(buildReminderChunk),
    buildFedCycleChunk({ profile, healthLogs }),
  ]

  let changed = 0
  const pendingEmbeddings: Array<{ id: string; text: string }> = []
  for (const chunk of chunks) {
    const result = await upsertKnowledgeChunk(db, userId, chunk)
    if (result.changed) changed++
    if (embed && result.needsEmbedding) pendingEmbeddings.push({ id: result.id, text: `${chunk.title}\n${chunk.content}` })
  }
  const embedded = embed ? await refreshChunkEmbeddingsIfAllowed(userId, pendingEmbeddings) : 0
  return { total: chunks.length, changed, embedded }
}

export async function syncFedCycleKnowledge(client: RagClient, userId: string) {
  const [profile, healthLogs] = await Promise.all([
    client.userProfile.findUnique({ where: { userId } }),
    client.healthLog.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 365 }),
  ])
  const chunk = buildFedCycleChunk({ profile, healthLogs })
  const result = await upsertKnowledgeChunk(client, userId, chunk)
  return { chunk, result }
}

export async function ensureUserKnowledge(userId: string) {
  const count = await db.healthKnowledgeChunk.count({ where: { userId } })
  if (!count) await backfillUserKnowledge(userId, { embed: false })
  const [profile, healthLogs] = await Promise.all([
    db.userProfile.findUnique({ where: { userId } }),
    db.healthLog.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 365 }),
  ])
  const chunk = buildFedCycleChunk({ profile, healthLogs })
  await upsertKnowledgeChunk(db, userId, chunk)
}

interface SearchRow {
  id: string
  source_type: string
  source_date: Date | string | null
  title: string
  content: string
  metadata: Prisma.JsonValue | null
  score: number
}

function normalizeRetrieved(row: SearchRow): RetrievedKnowledge {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceDate: row.source_date ? new Date(row.source_date) : null,
    title: row.title,
    content: row.content,
    metadata: row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata) ? row.metadata as Record<string, unknown> : null,
    score: Number(row.score),
  }
}

function keywordFallbackScore(query: string, title: string, content: string, sourceDate: Date | null) {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 3)
  const haystack = `${title} ${content}`.toLowerCase()
  const matches = words.reduce((sum, word) => sum + (haystack.includes(word) ? 1 : 0), 0)
  const keyword = words.length ? matches / words.length : 0
  const ageDays = sourceDate ? Math.max(0, (Date.now() - sourceDate.getTime()) / 86400000) : 180
  const recency = Math.exp(-ageDays / 90)
  return keyword * 0.75 + recency * 0.25
}

export async function searchUserKnowledge(userId: string, query: string, { allowEmbedding, limit = 8 }: { allowEmbedding: boolean; limit?: number }) {
  const embedding = allowEmbedding ? await generateEmbedding(query) : null
  try {
    let rows: SearchRow[]
    if (embedding) {
      const vector = `[${embedding.join(',')}]`
      rows = await db.$queryRaw<SearchRow[]>`SELECT * FROM search_health_knowledge(${userId}, ${query}, ${vector}::vector, ${limit})`
    } else {
      rows = await db.$queryRaw<SearchRow[]>`SELECT * FROM search_health_knowledge(${userId}, ${query}, NULL, ${limit})`
    }
    return rows.map(normalizeRetrieved)
  } catch {
    const recent = await db.healthKnowledgeChunk.findMany({
      where: { userId },
      orderBy: { sourceDate: 'desc' },
      take: 80,
      select: { id: true, sourceType: true, sourceDate: true, title: true, content: true, metadata: true },
    })
    return recent
      .map((chunk) => ({
        id: chunk.id,
        sourceType: chunk.sourceType,
        sourceDate: chunk.sourceDate,
        title: chunk.title,
        content: chunk.content,
        metadata: chunk.metadata && typeof chunk.metadata === 'object' && !Array.isArray(chunk.metadata) ? chunk.metadata as Record<string, unknown> : null,
        score: keywordFallbackScore(query, chunk.title, chunk.content, chunk.sourceDate),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }
}

export function citationsFor(chunks: RetrievedKnowledge[]): RagCitation[] {
  return chunks.map((chunk) => ({
    label: chunk.title,
    sourceType: chunk.sourceType,
    date: chunk.sourceDate?.toISOString() ?? null,
  }))
}

export function promptContextFor(chunks: RetrievedKnowledge[], maxCharacters = 6000) {
  let used = 0
  const sections: string[] = []
  for (const [index, chunk] of chunks.entries()) {
    const section = `<record index="${index + 1}" label="${chunk.title}">\n${chunk.content}\n</record>`
    if (used + section.length > maxCharacters) break
    used += section.length
    sections.push(section)
  }
  return sections.join('\n')
}
