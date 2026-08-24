# NariAid

NariAid is a private cycle and wellness tracker. It keeps health logs, symptoms, sleep, stress, pain, wellness notes, reminders, and cycle events in PostgreSQL. Ask Nari can now search those records before it answers, so it is not just guessing from one giant prompt anymore.

That is the big idea here. Most health chats forget what you tracked or dump everything into an AI request. NariAid uses SQL to find only the most useful records, adds FedCycle pattern guidance, and shows the record labels it used. It feels way more personal, but it is also easier to check.




## Run the app

Run these to start:
```bash
cd NariAid-main
npm install
cp .env.example .env
npm run db:setup
npm run rag:backfill
npm run dev
```

Open `http://localhost:3000`, sign in with Google, and you are good to go.

## Add the environment values

Fill these in inside `.env`:

```env
DATABASE_URL="your-neon-postgres-url"
NEXTAUTH_SECRET="a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-secret"
GEMINI_API_KEY="your-gemini-api-key"
```

The Gemini key is optional for private fallback mode. Cloud AI needs it. Never put a real key in Git or browser code.

## How the RAG chat works

When a record is saved, NariAid creates a private search chunk for that same signed-in user. PostgreSQL full-text search always works. Neon pgvector adds semantic search when embeddings are available.

Cloud answers try these models in order:

1. `gemma-4-26b-a4b-it`
2. `gemini-3.5-flash`
3. `gemini-3-flash-preview`
4. `gemini-2.5-flash`
5. `gemini-3.1-flash-lite`
6. `gemini-2.5-flash-lite`

If every model is busy, blocked, missing, or rate limited, the built-in safety assistant still answers. That part matters a lot because a health chat should not randomly go blank.

Before cloud AI turns on, each user sees a clear consent choice. Structured names, emails, locations, and database IDs are not placed in AI context. Private mode keeps record excerpts inside NariAid.

## Useful commands

```bash
npm test
npm run lint
npm run test:cycle-model
npm run build
npm run db:rag
npm run rag:backfill -- --no-embeddings
```

`db:setup` enables the Neon extensions, syncs the Prisma schema, and installs the hybrid search SQL. The backfill command safely creates chunks for records that already existed.

## Deploying

Add the same environment values to the Vercel project, run `npm run db:deploy` or the documented production migration step, run `npm run rag:backfill`, and deploy. Google OAuth also needs the production callback URL:

```text
https://nari-aid.vercel.app/api/auth/callback/google
```

NariAid is informational. It does not diagnose, prescribe, replace a clinician, or act as an emergency service. If symptoms feel urgent, contact local emergency care.
