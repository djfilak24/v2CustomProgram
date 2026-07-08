/** Verifies the NELSON passcode so the client-side presenter mode can unlock. */
import { NextRequest, NextResponse } from "next/server"
import { nelsonCodeOk } from "@/lib/server/engagementStore"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return NextResponse.json({ ok: nelsonCodeOk(typeof body.code === "string" ? body.code : null) })
}
