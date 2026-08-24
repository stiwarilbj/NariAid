import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isUnauthorized, requireUserId } from '@/lib/auth'

export async function DELETE() {
  try {
    const userId = await requireUserId()
    await db.$transaction(async (tx) => {
      await tx.chatMessage.deleteMany({ where: { userId } })
      await tx.chatConversation.deleteMany({ where: { userId } })
      await tx.chatGenerationAttempt.deleteMany({ where: { userId } })
      await tx.healthKnowledgeChunk.deleteMany({ where: { userId } })
      await tx.aiPreference.deleteMany({ where: { userId } })
      await tx.activityLog.deleteMany({ where: { userId } })
      await tx.calendarEvent.deleteMany({ where: { userId } })
      await tx.reminder.deleteMany({ where: { userId } })
      await tx.wellnessEntry.deleteMany({ where: { userId } })
      await tx.healthLog.deleteMany({ where: { userId } })
      await tx.userProfile.deleteMany({ where: { userId } })
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Failed to clear account data' }, { status: 500 })
  }
}
