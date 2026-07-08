/**
 * Engagement store — the pipe that makes a client link real. One record per
 * engagement: token → client name, status, and (once returned) the full
 * SurveyResult. Vercel Postgres in deployment (auto-detected via POSTGRES_URL,
 * table auto-created); a JSON file under .data/ for local dev so the whole
 * flow works without provisioning anything.
 */
import type { SurveyResult } from "@/lib/survey/types"

export interface Engagement {
  token: string
  clientName: string
  status: "sent" | "submitted"
  result?: SurveyResult
  createdAt: string
  updatedAt: string
}

export interface EngagementStore {
  create(clientName: string): Promise<Engagement>
  get(token: string): Promise<Engagement | null>
  list(): Promise<Engagement[]>
  submit(token: string, result: SurveyResult): Promise<Engagement | null>
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
    return sql
  })()

  const fromRow = (r: any): Engagement => ({
    token: r.token, clientName: r.client_name, status: r.status,
    ...(r.result ? { result: r.result as SurveyResult } : {}),
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
    async submit(token, result) {
      const sql = await ready
      const { rows } = await sql`
        UPDATE engagements SET result = ${JSON.stringify(result)}::jsonb, status = 'submitted', updated_at = now()
        WHERE token = ${token} RETURNING *`
      return rows[0] ? fromRow(rows[0]) : null
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
    async submit(token, result) {
      const all = await load()
      const e = all.find((x) => x.token === token)
      if (!e) return null
      e.result = result; e.status = "submitted"; e.updatedAt = new Date().toISOString()
      await save(all)
      return e
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
