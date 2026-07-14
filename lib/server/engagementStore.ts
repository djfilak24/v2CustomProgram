/**
 * Engagement store — the pipe that makes a client link real. One record per
 * engagement: token → client name, status, and (once returned) the full
 * SurveyResult. Vercel Postgres in deployment (auto-detected via POSTGRES_URL,
 * table auto-created); a JSON file under .data/ for local dev so the whole
 * flow works without provisioning anything.
 */
import type { SurveyResult } from "@/lib/survey/types"

/** Where the client last was in the journey — the console's live pulse. */
export interface EngagementProgress {
  stage: "landing" | "survey" | "workbook" | "live"
  step?: number
  total?: number
  updatedAt: string
}

/** One intake arriving on the engagement — the audit trail of who sent what, when. */
export interface SubmissionMeta {
  source: "survey" | "workbook" | "unknown"
  at: string
}

/**
 * The Studio's working state — every live-session edit, persisted so a refresh
 * never loses a meeting and the deliverable renders the session's program.
 */
export interface EngagementSession {
  overrides?: Record<string, number>
  counts?: Record<string, number>
  additions?: { key: string; label: string; category: string; unitSF: number; proposedCount: number; ratio?: string }[]
  notes?: Record<string, string>
  resolvedGaps?: Record<string, boolean>
  /** Planning dials (circulation %, load factor) when the session moved them. */
  factors?: Record<string, number>
  /**
   * Seating moves from the Studio's Department Manager — office/desk picks
   * that override the intake's own picks without touching it. Absent means
   * "the intake's answer still stands."
   */
  people?: { officeEmployeeIds?: string[]; deskEmployeeIds?: string[] }
  /**
   * Department moves from the Studio People tab — person id → destination
   * department id, applied on top of the intake's own roster.
   */
  deptMoves?: Record<string, string>
  /** Studio renames — comparison line key → display label. */
  labels?: Record<string, string>
  /** Deliverable beat composer — slide id → included (absent = included). */
  beats?: Record<string, boolean>
  updatedAt: string
}

/** One thing that happened on the engagement — the journey the console/command view replays. */
export interface EngagementEvent {
  kind: "created" | "progress" | "submitted" | "shared" | "unshared" | "session"
  at: string
  detail?: string
}

export interface Engagement {
  token: string
  clientName: string
  status: "sent" | "submitted"
  /** Latest result — what the deliverable and review read. */
  result?: SurveyResult
  progress?: EngagementProgress
  /** Deliverable presentation edits (comparison line key → unit SF), saved so the printed PDF matches what was presented. */
  overrides?: Record<string, number>
  /** Human-in-the-loop gate: the deliverable is only visible to the client after NELSON shares it. */
  shared?: boolean
  /** Submission log — every intake that landed, newest last. */
  submissions?: SubmissionMeta[]
  /** The Studio's persisted working state (live-session edits). */
  session?: EngagementSession
  /** Event log — the engagement's journey, newest last. */
  events?: EngagementEvent[]
  /**
   * In-progress survey draft — "resume is sacred" graduates from
   * localStorage to the engagement, so a client can start on their phone
   * and finish on a laptop. Opaque to the server; cleared on submit.
   */
  draft?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface EngagementStore {
  create(clientName: string): Promise<Engagement>
  get(token: string): Promise<Engagement | null>
  list(): Promise<Engagement[]>
  submit(token: string, result: SurveyResult, source?: SubmissionMeta["source"]): Promise<Engagement | null>
  setProgress(token: string, progress: EngagementProgress): Promise<void>
  setShared(token: string, shared: boolean): Promise<void>
  setOverrides(token: string, overrides: Record<string, number>): Promise<void>
  setSession(token: string, session: EngagementSession): Promise<void>
  addEvent(token: string, event: EngagementEvent): Promise<void>
  setDraft(token: string, draft: Record<string, unknown> | null): Promise<void>
}

const newToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(9))
  return Array.from(bytes, (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("")
}

/* ── Vercel Postgres ─────────────────────────────────────────────────────── */

function postgresStore(): EngagementStore {
  // Lazy import keeps local dev (no POSTGRES_URL) from touching the package.
  const ready = (async () => {
    const { sql } = await import("@vercel/postgres")
    await sql`CREATE TABLE IF NOT EXISTS engagements (
      token TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'sent',
      result JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
    await sql`ALTER TABLE engagements ADD COLUMN IF NOT EXISTS progress JSONB`
    await sql`ALTER TABLE engagements ADD COLUMN IF NOT EXISTS overrides JSONB`
    await sql`ALTER TABLE engagements ADD COLUMN IF NOT EXISTS shared BOOLEAN NOT NULL DEFAULT false`
    await sql`ALTER TABLE engagements ADD COLUMN IF NOT EXISTS submissions JSONB`
    await sql`ALTER TABLE engagements ADD COLUMN IF NOT EXISTS session JSONB`
    await sql`ALTER TABLE engagements ADD COLUMN IF NOT EXISTS events JSONB`
    await sql`ALTER TABLE engagements ADD COLUMN IF NOT EXISTS draft JSONB`
    return sql
  })()

  const fromRow = (r: any): Engagement => ({
    token: r.token, clientName: r.client_name, status: r.status,
    ...(r.result ? { result: r.result as SurveyResult } : {}),
    ...(r.progress ? { progress: r.progress as EngagementProgress } : {}),
    ...(r.overrides ? { overrides: r.overrides as Record<string, number> } : {}),
    ...(r.shared ? { shared: true } : {}),
    ...(r.submissions ? { submissions: r.submissions as SubmissionMeta[] } : {}),
    ...(r.session ? { session: r.session as EngagementSession } : {}),
    ...(r.events ? { events: r.events as EngagementEvent[] } : {}),
    ...(r.draft ? { draft: r.draft as Record<string, unknown> } : {}),
    createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString(),
  })

  return {
    async create(clientName) {
      const sql = await ready
      const token = newToken()
      const { rows } = await sql`
        INSERT INTO engagements (token, client_name) VALUES (${token}, ${clientName}) RETURNING *`
      return fromRow(rows[0])
    },
    async get(token) {
      const sql = await ready
      const { rows } = await sql`SELECT * FROM engagements WHERE token = ${token}`
      return rows[0] ? fromRow(rows[0]) : null
    },
    async list() {
      const sql = await ready
      const { rows } = await sql`SELECT * FROM engagements ORDER BY updated_at DESC LIMIT 200`
      return rows.map(fromRow)
    },
    async submit(token, result, source = "unknown") {
      const sql = await ready
      const sub: SubmissionMeta = { source, at: new Date().toISOString() }
      const { rows } = await sql`
        UPDATE engagements SET
          result = ${JSON.stringify(result)}::jsonb,
          status = 'submitted',
          submissions = COALESCE(submissions, '[]'::jsonb) || ${JSON.stringify([sub])}::jsonb,
          updated_at = now()
        WHERE token = ${token} RETURNING *`
      return rows[0] ? fromRow(rows[0]) : null
    },
    async setProgress(token, progress) {
      const sql = await ready
      await sql`
        UPDATE engagements SET progress = ${JSON.stringify(progress)}::jsonb, updated_at = now()
        WHERE token = ${token}`
    },
    async setShared(token, shared) {
      const sql = await ready
      await sql`UPDATE engagements SET shared = ${shared}, updated_at = now() WHERE token = ${token}`
    },
    async setOverrides(token, overrides) {
      const sql = await ready
      await sql`
        UPDATE engagements SET overrides = ${JSON.stringify(overrides)}::jsonb, updated_at = now()
        WHERE token = ${token}`
    },
    async setSession(token, session) {
      const sql = await ready
      await sql`
        UPDATE engagements SET session = ${JSON.stringify(session)}::jsonb, updated_at = now()
        WHERE token = ${token}`
    },
    async addEvent(token, event) {
      const sql = await ready
      await sql`
        UPDATE engagements SET
          events = COALESCE(events, '[]'::jsonb) || ${JSON.stringify([event])}::jsonb,
          updated_at = now()
        WHERE token = ${token}`
    },
    async setDraft(token, draft) {
      const sql = await ready
      await sql`
        UPDATE engagements SET draft = ${draft ? JSON.stringify(draft) : null}::jsonb, updated_at = now()
        WHERE token = ${token}`
    },
  }
}

/* ── Local-dev file store ────────────────────────────────────────────────── */

function fileStore(): EngagementStore {
  const FILE = ".data/engagements.json"
  const load = async (): Promise<Engagement[]> => {
    const fs = await import("node:fs/promises")
    try { return JSON.parse(await fs.readFile(FILE, "utf8")) } catch { return [] }
  }
  const save = async (all: Engagement[]) => {
    const fs = await import("node:fs/promises")
    await fs.mkdir(".data", { recursive: true })
    await fs.writeFile(FILE, JSON.stringify(all, null, 2))
  }
  return {
    async create(clientName) {
      const all = await load()
      const now = new Date().toISOString()
      const e: Engagement = { token: newToken(), clientName, status: "sent", createdAt: now, updatedAt: now }
      all.unshift(e); await save(all)
      return e
    },
    async get(token) { return (await load()).find((e) => e.token === token) ?? null },
    async list() { return load() },
    async submit(token, result, source = "unknown") {
      const all = await load()
      const e = all.find((x) => x.token === token)
      if (!e) return null
      e.result = result; e.status = "submitted"; e.updatedAt = new Date().toISOString()
      e.submissions = [...(e.submissions ?? []), { source, at: e.updatedAt }]
      await save(all)
      return e
    },
    async setProgress(token, progress) {
      const all = await load()
      const e = all.find((x) => x.token === token)
      if (!e) return
      e.progress = progress; e.updatedAt = new Date().toISOString()
      await save(all)
    },
    async setShared(token, shared) {
      const all = await load()
      const e = all.find((x) => x.token === token)
      if (!e) return
      e.shared = shared; e.updatedAt = new Date().toISOString()
      await save(all)
    },
    async setOverrides(token, overrides) {
      const all = await load()
      const e = all.find((x) => x.token === token)
      if (!e) return
      e.overrides = overrides; e.updatedAt = new Date().toISOString()
      await save(all)
    },
    async setSession(token, session) {
      const all = await load()
      const e = all.find((x) => x.token === token)
      if (!e) return
      e.session = session; e.updatedAt = new Date().toISOString()
      await save(all)
    },
    async addEvent(token, event) {
      const all = await load()
      const e = all.find((x) => x.token === token)
      if (!e) return
      e.events = [...(e.events ?? []), event]; e.updatedAt = new Date().toISOString()
      await save(all)
    },
    async setDraft(token, draft) {
      const all = await load()
      const e = all.find((x) => x.token === token)
      if (!e) return
      if (draft) e.draft = draft
      else delete e.draft
      e.updatedAt = new Date().toISOString()
      await save(all)
    },
  }
}

/**
 * Deployed without a database → a clear 503 story instead of mystery crashes.
 * Local (non-Vercel) always works via the file store; on Vercel the filesystem
 * is read-only, so Postgres must be provisioned.
 */
export const storeConfigured = (): boolean => !!process.env.POSTGRES_URL || !process.env.VERCEL

let cached: EngagementStore | null = null
export function engagementStore(): EngagementStore {
  if (!cached) cached = process.env.POSTGRES_URL ? postgresStore() : fileStore()
  return cached
}

/** NELSON-side calls carry this code; compared to the server env. */
export function nelsonCodeOk(code: string | null): boolean {
  const expected = process.env.NELSON_PASSCODE ?? (process.env.NODE_ENV !== "production" ? "nelson" : null)
  return !!expected && !!code && code === expected
}
