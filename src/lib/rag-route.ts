import { after } from 'next/server'
import { refreshChunkEmbeddingsIfAllowed, type KnowledgeChunkInput } from '@/lib/rag'

export interface SyncedKnowledgeChunk {
  chunk: KnowledgeChunkInput
  result: { id: string; needsEmbedding: boolean }
}

export function scheduleRagEmbeddings(userId: string, chunks: SyncedKnowledgeChunk[]) {
  const pending = chunks
    .filter((item) => item.result.needsEmbedding)
    .map((item) => ({ id: item.result.id, text: `${item.chunk.title}\n${item.chunk.content}` }))
  if (!pending.length) return
  after(async () => {
    try {
      await refreshChunkEmbeddingsIfAllowed(userId, pending)
    } catch {
      console.error('Failed to refresh a RAG embedding')
    }
  })
}
