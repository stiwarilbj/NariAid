-- NariAid health-record RAG. This migration is additive and safe to rerun.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS "ChatConversation" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL DEFAULT 'New conversation',
  "userId" TEXT NOT NULL REFERENCES "AppUser"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AiPreference" (
  "id" TEXT PRIMARY KEY,
  "cloudAiEnabled" BOOLEAN NOT NULL DEFAULT false,
  "consentVersion" TEXT NOT NULL DEFAULT '',
  "consentedAt" TIMESTAMP(3),
  "decisionAt" TIMESTAMP(3),
  "userId" TEXT NOT NULL UNIQUE REFERENCES "AppUser"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "HealthKnowledgeChunk" (
  "id" TEXT PRIMARY KEY,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceDate" TIMESTAMP(3),
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB,
  "contentHash" TEXT NOT NULL,
  "embedding" vector(768),
  "embeddingModel" TEXT NOT NULL DEFAULT '',
  "search_vector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("content", '')), 'B')
  ) STORED,
  "userId" TEXT NOT NULL REFERENCES "AppUser"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HealthKnowledgeChunk_userId_sourceType_sourceId_key" UNIQUE ("userId", "sourceType", "sourceId")
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'HealthKnowledgeChunk'
      AND column_name = 'search_vector'
      AND is_generated = 'NEVER'
  ) THEN
    ALTER TABLE "HealthKnowledgeChunk" DROP COLUMN "search_vector";
    ALTER TABLE "HealthKnowledgeChunk" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
      setweight(to_tsvector('english', coalesce("content", '')), 'B')
    ) STORED;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ChatGenerationAttempt" (
  "id" TEXT PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "latencyMs" INTEGER NOT NULL DEFAULT 0,
  "errorCode" TEXT NOT NULL DEFAULT '',
  "conversationId" TEXT NOT NULL REFERENCES "ChatConversation"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "AppUser"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "model" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'local-risk-assistant';
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "citations" JSONB;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "conversationId" TEXT;

INSERT INTO "ChatConversation" ("id", "title", "userId", "createdAt", "updatedAt")
SELECT
  'legacy_' || substr(md5("userId"), 1, 20),
  'Earlier conversation',
  "userId",
  min("createdAt"),
  max("createdAt")
FROM "ChatMessage"
WHERE "conversationId" IS NULL
GROUP BY "userId"
ON CONFLICT ("id") DO NOTHING;

UPDATE "ChatMessage"
SET "conversationId" = 'legacy_' || substr(md5("userId"), 1, 20)
WHERE "conversationId" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatMessage_conversationId_fkey') THEN
    ALTER TABLE "ChatMessage"
      ADD CONSTRAINT "ChatMessage_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ChatConversation_userId_updatedAt_idx" ON "ChatConversation"("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "HealthKnowledgeChunk_userId_sourceDate_idx" ON "HealthKnowledgeChunk"("userId", "sourceDate");
CREATE INDEX IF NOT EXISTS "HealthKnowledgeChunk_userId_sourceType_idx" ON "HealthKnowledgeChunk"("userId", "sourceType");
CREATE INDEX IF NOT EXISTS "HealthKnowledgeChunk_search_vector_idx" ON "HealthKnowledgeChunk" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "HealthKnowledgeChunk_embedding_hnsw_idx" ON "HealthKnowledgeChunk" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "ChatGenerationAttempt_conversationId_createdAt_idx" ON "ChatGenerationAttempt"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "ChatGenerationAttempt_userId_createdAt_idx" ON "ChatGenerationAttempt"("userId", "createdAt");

CREATE OR REPLACE FUNCTION search_health_knowledge(
  p_user_id TEXT,
  p_query TEXT,
  p_query_embedding vector(768) DEFAULT NULL,
  p_limit INTEGER DEFAULT 8
)
RETURNS TABLE (
  id TEXT,
  source_type TEXT,
  source_id TEXT,
  source_date TIMESTAMP(3),
  title TEXT,
  content TEXT,
  metadata JSONB,
  score DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  WITH ranked AS (
    SELECT
      chunk."id",
      chunk."sourceType",
      chunk."sourceId",
      chunk."sourceDate",
      chunk."title",
      chunk."content",
      chunk."metadata",
      ts_rank_cd(chunk."search_vector", websearch_to_tsquery('english', coalesce(p_query, '')))::double precision AS keyword_score,
      CASE
        WHEN p_query_embedding IS NOT NULL AND chunk."embedding" IS NOT NULL
          THEN greatest(0, 1 - (chunk."embedding" <=> p_query_embedding))::double precision
        ELSE 0::double precision
      END AS semantic_score,
      CASE
        WHEN chunk."sourceDate" IS NULL THEN 0.15::double precision
        ELSE exp(-greatest(0, extract(epoch FROM (CURRENT_TIMESTAMP - chunk."sourceDate"))) / (86400 * 90))::double precision
      END AS recency_score
    FROM "HealthKnowledgeChunk" chunk
    WHERE chunk."userId" = p_user_id
  )
  SELECT
    ranked."id",
    ranked."sourceType",
    ranked."sourceId",
    ranked."sourceDate",
    ranked."title",
    ranked."content",
    ranked."metadata",
    CASE
      WHEN p_query_embedding IS NOT NULL
        THEN ranked.semantic_score * 0.65 + ranked.keyword_score * 0.25 + ranked.recency_score * 0.10
      ELSE ranked.keyword_score * 0.75 + ranked.recency_score * 0.25
    END AS score
  FROM ranked
  ORDER BY score DESC, ranked."sourceDate" DESC NULLS LAST
  LIMIT greatest(1, least(coalesce(p_limit, 8), 20));
$$;
