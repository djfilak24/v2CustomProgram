/**
 * NELSON-side engagement management. Both verbs require the NELSON passcode
 * (x-nelson-code header) — clients never call this route.
 *   POST { clientName } → create an engagement (returns the token/link)
 *   GET → list engagements (status board)
 */
import { NextRequest, NextResponse } from "next/server"
import { engagementStore, storeConfigured, nelsonCodeOk } from "@/lib/server/engagementStore"

const unconfigured = () =>
  NextResponse.json(
    { error: "Engagement store not provisioned — create a Postgres database in Vercel Storage and redeploy." },
    { status: 503 },
  )
const forbidden = () => NextResponse.json({ error: "NELSON passcode required." }, { status: 401 })

export async function POST(req: NextRequest) {
  if (!storeConfigured()) return unconfigured()
  if (!nelsonCodeOk(req.headers.get("x-nelson-code"))) return forbidden()
  const body = await req.json().catch(() => ({}))
  const clientName = typeof body.clientName === "string" ? body.clientName.trim() : ""
  if (!clientName) return NextResponse.json({ error: "clientName required" }, { status: 400 })
  const e = await engagementStore().create(clientName)
  return NextResponse.json(e)
}

export async function GET(req: NextRequest) {
  if (!storeConfigured()) return unconfigured()
  if (!nelsonCodeOk(req.headers.get("x-nelson-code"))) return forbidden()
  const all = await engagementStore().list()
  // The list view doesn't need full results riding along.
  return NextResponse.json(all.map(({ result, ...meta }) => ({ ...meta, hasResult: !!result })))
}
