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
  return NextResponse.json({
    token: e.token,
    clientName: e.clientName,
    status: e.status,
    shared: !!e.shared,
    ...(profile ? { profile } : {}),
    ...(e.result ? { prep: prepSummary(e.result) } : {}),
    // The deliverable gate: the full result leaves the building only after
    // NELSON has audited it and flipped share. The Studio session rides along
    // so the client's deck IS the session's program.
    ...(e.shared && e.result
      ? { result: e.result, overrides: e.overrides ?? {}, ...(e.session ? { session: e.session } : {}) }
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
  const body = (await req.json().catch(() => null)) as
    | {
        stage?: string; step?: number; total?: number
        shared?: boolean; overrides?: Record<string, number>; session?: EngagementSession
      }
    | null
  if (!body) return NextResponse.json({ error: "Body required" }, { status: 400 })

  const store = engagementStore()
  const e = await store.get(token)
  if (!e) return NextResponse.json({ error: "Unknown engagement" }, { status: 404 })

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

  if (!["landing", "survey", "workbook"].includes(body.stage ?? "")) {
    return NextResponse.json({ error: "stage must be landing | survey | workbook" }, { status: 400 })
  }
  // A landing revisit never downgrades a deeper stage (survey/workbook).
  if (body.stage === "landing" && e.progress && e.progress.stage !== "landing") {
    return NextResponse.json({ ok: true, kept: e.progress.stage })
  }
  // First touch of each stage lands in the event log (the journey timeline).
  if (!e.progress || e.progress.stage !== body.stage) {
    await store.addEvent(token, { kind: "progress", at: new Date().toISOString(), detail: body.stage })
  }
  await store.setProgress(token, {
    stage: body.stage as "landing" | "survey" | "workbook",
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
  const profile = computeProfile(surveyStateFromResult(result))
  return NextResponse.json({ ok: true, status: e.status, profile })
}
