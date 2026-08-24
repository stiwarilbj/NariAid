import { NextResponse } from 'next/server'
import { z } from 'zod'

const shortText = (max = 250) => z.string().trim().max(max)
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date')

export const pageContextSchema = z.object({
  activeTab: shortText(50).optional(),
  activeSection: shortText(80).optional(),
  pageTitle: shortText(100).optional(),
  pagePurpose: shortText(300).optional(),
}).strict()

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationId: z.string().trim().min(1).max(120).optional(),
  pageContext: pageContextSchema.optional(),
}).strict()

export const aiPreferenceSchema = z.object({
  cloudAiEnabled: z.boolean(),
  consentVersion: z.string().trim().min(1).max(40),
}).strict()

export const healthLogCreateSchema = z.object({
  date: dateString,
  mood: z.number().int().min(0).max(10).default(5),
  energy: z.number().int().min(0).max(10).default(5),
  sleep: z.number().int().min(0).max(24).default(5),
  stress: z.number().int().min(0).max(10).default(5),
  pain: z.number().int().min(0).max(10).default(0),
  symptoms: shortText(2000).default(''),
  notes: shortText(5000).default(''),
  waterIntake: z.number().int().min(0).max(100).default(0),
  exercise: shortText(500).default(''),
  weight: z.number().min(0).max(1000).default(0),
}).strict()

export const healthLogUpdateSchema = z.object({
  id: z.string().trim().min(1).max(120),
  date: dateString.optional(),
  mood: z.number().int().min(0).max(10).optional(),
  energy: z.number().int().min(0).max(10).optional(),
  sleep: z.number().int().min(0).max(24).optional(),
  stress: z.number().int().min(0).max(10).optional(),
  pain: z.number().int().min(0).max(10).optional(),
  symptoms: shortText(2000).optional(),
  notes: shortText(5000).optional(),
  waterIntake: z.number().int().min(0).max(100).optional(),
  exercise: shortText(500).optional(),
  weight: z.number().min(0).max(1000).optional(),
}).strict()

export const wellnessCreateSchema = z.object({
  date: dateString,
  meditation: z.number().int().min(0).max(1440).default(0),
  gratitude: shortText(3000).default(''),
  affirmations: shortText(3000).default(''),
  selfCare: shortText(3000).default(''),
  journalEntry: shortText(8000).default(''),
}).strict()

export const wellnessUpdateSchema = z.object({
  id: z.string().trim().min(1).max(120),
  date: dateString.optional(),
  meditation: z.number().int().min(0).max(1440).optional(),
  gratitude: shortText(3000).optional(),
  affirmations: shortText(3000).optional(),
  selfCare: shortText(3000).optional(),
  journalEntry: shortText(8000).optional(),
}).strict()

export const reminderCreateSchema = z.object({
  title: shortText(200).min(1),
  description: shortText(1000).default(''),
  time: z.string().trim().min(1).max(30),
  frequency: shortText(50).default('daily'),
  category: shortText(50).default('health'),
  active: z.boolean().default(true),
}).strict()

export const reminderUpdateSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: shortText(200).min(1).optional(),
  description: shortText(1000).optional(),
  time: z.string().trim().min(1).max(30).optional(),
  frequency: shortText(50).optional(),
  category: shortText(50).optional(),
  active: z.boolean().optional(),
}).strict()

export const calendarEventCreateSchema = z.object({
  title: shortText(200).min(1),
  date: dateString,
  endDate: z.union([dateString, z.literal('')]).default(''),
  type: shortText(50).default('general'),
  notes: shortText(3000).default(''),
  color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).default('#F9A8D4'),
}).strict()

export const calendarEventUpdateSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: shortText(200).min(1).optional(),
  date: dateString.optional(),
  endDate: z.union([dateString, z.literal('')]).optional(),
  type: shortText(50).optional(),
  notes: shortText(3000).optional(),
  color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
}).strict()

export const profileUpdateSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  name: shortText(120).optional(),
  email: z.string().email().max(320).optional(),
  age: z.number().int().min(10).max(120).optional(),
  lifeStage: shortText(60).optional(),
  avatar: z.string().trim().max(2000).optional(),
  theme: shortText(30).optional(),
  accentColor: shortText(30).optional(),
  notifications: z.boolean().optional(),
  cycleLength: z.number().int().min(15).max(90).optional(),
  lastPeriodStart: z.union([dateString, z.literal('')]).optional(),
  healthGoals: z.array(shortText(80)).max(30).optional(),
  avatarColor: shortText(30).optional(),
  bio: shortText(3000).optional(),
  location: shortText(200).optional(),
}).strict()

export const activityCreateSchema = z.object({
  action: shortText(250).min(1),
  category: shortText(80).default('general'),
  details: shortText(1000).default(''),
}).strict()

export function validationError(error: z.ZodError) {
  return NextResponse.json(
    { error: 'Invalid request', details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) },
    { status: 400 }
  )
}

export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new z.ZodError([{ code: 'custom', path: [], message: 'Malformed JSON', input: undefined }])
  }
  return schema.parse(body)
}
