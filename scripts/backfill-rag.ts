import { db } from '../src/lib/db'
import { backfillUserKnowledge } from '../src/lib/rag'

async function main() {
  const embed = !process.argv.includes('--no-embeddings')
  const users = await db.appUser.findMany({ select: { id: true }, orderBy: { createdAt: 'asc' } })
  let chunks = 0
  let changed = 0
  let embedded = 0

  for (const user of users) {
    const result = await backfillUserKnowledge(user.id, { embed })
    chunks += result.total
    changed += result.changed
    embedded += result.embedded
  }

  console.log(`RAG backfill complete for ${users.length} user(s): ${chunks} chunks checked, ${changed} changed, ${embedded} embedded.`)
}

main()
  .catch((error) => {
    console.error('RAG backfill failed:', error instanceof Error ? error.message : 'Unknown error')
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
