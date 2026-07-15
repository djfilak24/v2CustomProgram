/**
 * Per-engagement endpoints.
 *   GET  → public metadata for the client landing (name, status, shared) plus —
 *          once submitted — the six-axis Workplace Profile ONLY (the founder's
 *          "minimum effective dose": whet the appetite, hold the numbers), and
 *          a prep summary (gap lines + target) so the client can get ready for
 *          the live session without seeing any program numbers.
 *          Once NELSON shares the deliverable, the full result + presentation
 *          edits (overrides AND the Studio session) ride along so /d/<token>
 *          renders the session's program for the client.
 *          With the NELSON passcode, the full record is always included.
 *   PATCH → public progress pings (stage/step/total; token is the credential),
 *          or — with the NELSON passcode — { shared } / { overrides } /
 *          { session } for the human-in-the-loop gate, presentation edits, and
 *          the Studio's persisted working state.
 *   POST → submit a SurveyResult (survey finish or workbook return). Public by
 *          design: the unguessable token IS the credential. ?source= tags the
 *          submission log.
 */
import { NextRequest, NextResponse } from "next/server"
import { engagementStore, storeConfigured, nelsonCodeOk, type EngagementSession } from "@/lib/server/engagementStore"
import { notifyNelson } from "@/lib/server/notify"
import { surveyStateFromResult, computeProfile, SURVEY_STEPS } from "@/lib/survey/sections"
import { buildComparison, lineGaps } from "@/lib/survey/comparison"
import type { SurveyResult } from "@/lib/survey/types"

const unconfigured = () =>
  NextResponse.json(
    { error: "Engagement store not provisioned — create a Postgres database in Vercel Storage and redeploy." },
    { status: 503 },
  )

/** Client-safe prep summary: what's open, never how big the program is. */
function prepSummary(result: SurveyResult) {
  const comp = buildComparison(result)
  const gaps = comp.lines.flatMap((l) => lineGaps(l).map((g) => ({ line: l.label, message: g.message })))
  const deferred = result.deferred.map((dq) => SURVEY_STEPS.find((s) => s.id === dq)?.title ?? dq)
  return {
    gaps,
    deferred,
    ...(result.goals?.targetSF
      ? { targetSF: result.goals.targetSF, ...(result.goals.targetSource ? { targetSource: result.goals.targetSource } : {}) }
      : {}),
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!storeConfigured()) return unconfigured()
  const { token } = await params
  const e = await engagementStore().get(token)
  if (!e) return NextResponse.json({ error: "Unknown engagement" }, { status: 404 })

  if (nelsonCodeOk(req.headers.get("x-nelson-code"))) return NextResponse.json(e)

  const profile = e.result ? computeProfile(surveyStateFromResult(e.result)) : undefined
  // Shared client surfaces read the protected finalized snapshot. The active
  // Studio session may continue evolving without silently changing what was published.
  const publicSession = e.session?.finalized
    ? { ...e.session.finalized, finalized: e.session.finalized, updatedAt: e.session.finalized.at }
    : e.session
  return NextResponse.json({
    token: e.token,
    clientName: e.clientName,
    status: e.status,
    shared: !!e.shared,
    ...(profile ? { profile } : {}),
    // Their own in-progress draft rides back on their own token — this is
    // what makes "start on the phone, finish on the laptop" real.
    ...(e.draft ? { draft: e.draft } : {}),
    ...(e.result ? { prep: prepSummary(e.result) } : {}),
    // The deliverable gate: the full result leaves the building only after
    // NELSON has audited it and flipped share. The Studio session rides along
    // so the client's deck IS the session's program.
    ...(e.shared && e.result
      ? { result: e.result, overrides: e.overrides ?? {}, ...(publicSession ? { session: publicSession } : {}) }
      : {}),
  })
}

/**
 * Public: progress pings ("survey step 4 of 10"). NELSON-only: the deliverable
 * share gate, presentation-edit overrides, and the Studio session state.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!storeConfigured()) return unconfigured()
  const { token } = await params
  const raw = await req.text()
  const body = (() => { try { return JSON.parse(raw) } catch { return null } })() as
    | {
        stage?: string; step?: number; total?: number
        shared?: boolean; overrides?: Record<string, number>; session?: EngagementSession
        draft?: Record<string, unknown> | null
      }
    | null
  if (!body) return NextResponse.json({ error: "Body required" }, { status: 400 })

  const store = engagementStore()
  const e = await store.get(token)
  if (!e) return NextResponse.json({ error: "Unknown engagement" }, { status: 404 })

  // Public: the client's own in-progress draft (their token is the
  // credential, exactly like submitting). Size-capped; null clears it.
  if (body.draft !== undefined) {
    if (raw.length > 400_000) return NextResponse.json({ error: "Draft too large" }, { status: 413 })
    if (body.draft !== null && (typeof body.draft !== "object" || !("state" in body.draft))) {
      return NextResponse.json({ error: "Not a survey draft" }, { status: 400 })
    }
    await store.setDraft(token, body.draft)
    return NextResponse.json({ ok: true })
  }

  // NELSON-gated mutations first — never reachable with the token alone.
  if (body.shared !== undefined || body.overrides !== undefined || body.session !== undefined) {
    if (!nelsonCodeOk(req.headers.get("x-nelson-code"))) {
      return NextResponse.json({ error: "NELSON passcode required." }, { status: 401 })
    }
    if (body.shared !== undefined) {
      await store.setShared(token, !!body.shared)
      await store.addEvent(token, { kind: body.shared ? "shared" : "unshared", at: new Date().toISOString() })
    }
    if (body.overrides !== undefined) {
      const clean = Object.fromEntries(
        Object.entries(body.overrides).filter(([, v]) => typeof v === "number" && v > 0 && v < 100000),
      )
      await store.setOverrides(token, clean)
    }
    if (body.session !== undefined && typeof body.session === "object") {
      await store.setSession(token, { ...body.session, updatedAt: new Date().toISOString() })
    }
    return NextResponse.json({ ok: true })
  }

  if (!["landing", "survey", "workbook", "live"].includes(body.stage ?? "")) {
    return NextResponse.json({ error: "stage must be landing | survey | workbook | live" }, { status: 400 })
  }
  // A landing revisit never downgrades a deeper stage (survey/workbook/live).
  if (body.stage === "landing" && e.progress && e.progress.stage !== "landing") {
    return NextResponse.json({ ok: true, kept: e.progress.stage })
  }
  // First touch of each stage lands in the event log (the journey timeline).
  if (!e.progress || e.progress.stage !== body.stage) {
    await store.addEvent(token, { kind: "progress", at: new Date().toISOString(), detail: body.stage })
    // A live-session request deserves a human's attention today, not at the
    // next console check.
    if (body.stage === "live") {
      void notifyNelson(
        `${e.clientName} wants to do it live`,
        `${e.clientName} chose the live-session door. Command center: /command/${token}`,
      )
    }
  }
  await store.setProgress(token, {
    stage: body.stage as "landing" | "survey" | "workbook" | "live",
    ...(typeof body.step === "number" ? { step: body.step } : {}),
    ...(typeof body.total === "number" ? { total: body.total } : {}),
    updatedAt: new Date().toISOString(),
  })
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!storeConfigured()) return unconfigured()
  const { token } = await params
  const result = (await req.json().catch(() => null)) as SurveyResult | null
  if (!result || !result.people || !result.meta) {
    return NextResponse.json({ error: "Body must be a SurveyResult" }, { status: 400 })
  }
  const src = req.nextUrl.searchParams.get("source")
  const source = src === "survey" || src === "workbook" ? src : "unknown"
  const e = await engagementStore().submit(token, result, source)
  if (!e) return NextResponse.json({ error: "Unknown engagement" }, { status: 404 })
  await engagementStore().addEvent(token, { kind: "submitted", at: new Date().toISOString(), detail: source })
  await engagementStore().setDraft(token, null) // the draft's job is done
  void notifyNelson(
    `${e.clientName} returned their intake (${source})`,
    `The ${source} came back for ${e.clientName}. Command center: /command/${token}`,
  )
  const profile = computeProfile(surveyStateFromResult(result))
  return NextResponse.json({ ok: true, status: e.status, profile })
}
