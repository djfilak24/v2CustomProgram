/**
 * Per-engagement endpoints.
 *   GET  → public metadata for the client landing (name, status, shared) plus —
 *          once submitted — the six-axis Workplace Profile ONLY (the founder's
 *          "minimum effective dose": whet the appetite, hold the numbers).
 *          Once NELSON shares the deliverable, the full result + presentation
 *          overrides ride along so /d/<token> can render for the client.
 *          With the NELSON passcode, the full record is always included.
 *   PATCH → public progress pings (stage/step/total; token is the credential),
 *          or — with the NELSON passcode — { shared } / { overrides } for the
 *          deliverable's human-in-the-loop gate and presentation edits.
 *   POST → submit a SurveyResult (survey finish or workbook return). Public by
 *          design: the unguessable token IS the credential. ?source= tags the
 *          submission log.
 */
import { NextRequest, NextResponse } from "next/server"
import { engagementStore, storeConfigured, nelsonCodeOk } from "@/lib/server/engagementStore"
import { surveyStateFromResult, computeProfile } from "@/lib/survey/sections"
import type { SurveyResult } from "@/lib/survey/types"

const unconfigured = () =>
  NextResponse.json(
    { error: "Engagement store not provisioned — create a Postgres database in Vercel Storage and redeploy." },
    { status: 503 },
  )

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
    // The deliverable gate: the full result leaves the building only after
    // NELSON has audited it and flipped share.
    ...(e.shared && e.result ? { result: e.result, overrides: e.overrides ?? {} } : {}),
  })
}

/**
 * Public: progress pings ("survey step 4 of 10"). NELSON-only: the deliverable
 * share gate and presentation-edit overrides.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!storeConfigured()) return unconfigured()
  const { token } = await params
  const body = (await req.json().catch(() => null)) as
    | { stage?: string; step?: number; total?: number; shared?: boolean; overrides?: Record<string, number> }
    | null
  if (!body) return NextResponse.json({ error: "Body required" }, { status: 400 })

  const e = await engagementStore().get(token)
  if (!e) return NextResponse.json({ error: "Unknown engagement" }, { status: 404 })

  // NELSON-gated mutations first — never reachable with the token alone.
  if (body.shared !== undefined || body.overrides !== undefined) {
    if (!nelsonCodeOk(req.headers.get("x-nelson-code"))) {
      return NextResponse.json({ error: "NELSON passcode required." }, { status: 401 })
    }
    if (body.shared !== undefined) await engagementStore().setShared(token, !!body.shared)
    if (body.overrides !== undefined) {
      const clean = Object.fromEntries(
        Object.entries(body.overrides).filter(([, v]) => typeof v === "number" && v > 0 && v < 100000),
      )
      await engagementStore().setOverrides(token, clean)
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
  await engagementStore().setProgress(token, {
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
  const profile = computeProfile(surveyStateFromResult(result))
  return NextResponse.json({ ok: true, status: e.status, profile })
}
