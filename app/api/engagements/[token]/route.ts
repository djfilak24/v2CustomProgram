/**
 * Per-engagement endpoints.
 *   GET  → public metadata for the client landing (name, status) plus — once
 *          submitted — the six-axis Workplace Profile ONLY (the founder's
 *          "minimum effective dose": whet the appetite, hold the numbers).
 *          With the NELSON passcode, the full SurveyResult is included.
 *   POST → submit a SurveyResult (survey finish or workbook import). Public by
 *          design: the unguessable token IS the credential.
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
    ...(profile ? { profile } : {}),
  })
}

/**
 * Lightweight progress ping — "the client is on survey step 4 of 10". Public
 * like POST (the token is the credential); powers the console's live status.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!storeConfigured()) return unconfigured()
  const { token } = await params
  const body = (await req.json().catch(() => null)) as { stage?: string; step?: number; total?: number } | null
  if (!body || !["landing", "survey", "workbook"].includes(body.stage ?? "")) {
    return NextResponse.json({ error: "stage must be landing | survey | workbook" }, { status: 400 })
  }
  const e = await engagementStore().get(token)
  if (!e) return NextResponse.json({ error: "Unknown engagement" }, { status: 404 })
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
  const e = await engagementStore().submit(token, result)
  if (!e) return NextResponse.json({ error: "Unknown engagement" }, { status: 404 })
  const profile = computeProfile(surveyStateFromResult(result))
  return NextResponse.json({ ok: true, status: e.status, profile })
}
