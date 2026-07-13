"use client"

import { use, useEffect, useState } from "react"
import Image from "next/image"
import { Printer, Home, CheckCircle2, Target, MessageCircle, Sparkles } from "lucide-react"

/**
 * The session prep sheet — the client-facing "prep for the live session"
 * debrief. Friendly, printable, zero program numbers: what's still open, who
 * on their side can help close each item, their target acknowledged, and what
 * the working session will feel like. Public by token (the API's prep summary
 * is deliberately client-safe — gap labels, never square footage).
 */

interface Prep {
  gaps: { line: string; message: string }[]
  deferred: string[]
  targetSF?: number
  targetSource?: string
}

export default function PrepPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [clientName, setClientName] = useState<string | null>(null)
  const [prep, setPrep] = useState<Prep | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "empty" | "missing">("loading")

  useEffect(() => {
    fetch(`/api/engagements/${token}`)
      .then(async (r) => {
        if (!r.ok) { setState("missing"); return }
        const e = await r.json()
        setClientName(e.clientName)
        if (e.prep) { setPrep(e.prep); setState("ready") } else setState("empty")
      })
      .catch(() => setState("missing"))
  }, [token])

  if (state === "loading") {
    return <Centered><p className="text-slate-400">Preparing your session sheet…</p></Centered>
  }
  if (state === "missing") {
    return (
      <Centered>
        <Image src="/NELSON_color.png" alt="NELSON" width={170} height={40} className="h-8 w-auto" />
        <p className="mt-5 max-w-md text-slate-600">This link isn&apos;t active. Check it with your NELSON contact.</p>
      </Centered>
    )
  }
  if (state === "empty" || !prep) {
    return (
      <Centered>
        <Image src="/NELSON_color.png" alt="NELSON" width={170} height={40} className="h-8 w-auto" />
        <h1 className="mt-5 text-2xl font-bold text-slate-900">Almost — tell us about your workplace first.</h1>
        <p className="mt-2 max-w-md text-slate-600">
          Your prep sheet builds itself from your answers. Start from{" "}
          <a href={`/s/${token}`} className="font-semibold text-[#0089a3] underline">your home page</a> and it&apos;ll be waiting here.
        </p>
      </Centered>
    )
  }

  const gapLines = [...new Set(prep.gaps.map((g) => g.line))]
  const openCount = prep.gaps.length + prep.deferred.length
  const TYPICAL = 12 // illustrative — TODO(founder): real engagement averages

  return (
    <div className="min-h-screen bg-[#f3f7fa] text-slate-900 print:bg-white">
      <div className="mx-auto max-w-2xl px-6 py-12 print:py-4">
        <div className="flex items-center justify-between">
          <Image src="/NELSON_color.png" alt="NELSON" width={150} height={35} className="h-7 w-auto" />
          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400"
            >
              <Printer className="h-3.5 w-3.5" /> Print / save PDF
            </button>
            <a
              href={`/s/${token}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400"
            >
              <Home className="h-3.5 w-3.5" /> Your home page
            </a>
          </div>
        </div>

        <h1 className="mt-8 text-3xl font-bold tracking-tight">Before our working session</h1>
        <p className="mt-1 text-sm text-slate-500">{clientName} · with NELSON</p>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm leading-relaxed text-slate-700">
            <b>{openCount <= TYPICAL ? "You gave us a strong intake — more complete than most teams manage." : "You gave us what you could — that's exactly right."}</b>{" "}
            The {openCount} open item{openCount === 1 ? "" : "s"} below aren&apos;t homework; they&apos;re what the
            working session is for. Anything you can gather beforehand just means we move faster together.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {gapLines.length > 0 && (
            <PrepItem n={1} title="A few counts and sizes we couldn't see" who="Your office manager or facilities lead — a quick walk-through count is plenty.">
              {gapLines.slice(0, 6).join(" · ")}{gapLines.length > 6 ? ` · +${gapLines.length - 6} more` : ""}
            </PrepItem>
          )}
          {prep.deferred.length > 0 && (
            <PrepItem n={gapLines.length ? 2 : 1} title="Topics you saved for the meeting" who="No prep needed — just the right people in the room.">
              {prep.deferred.join(" · ")}
            </PrepItem>
          )}
          {prep.targetSF && (
            <PrepItem
              n={(gapLines.length ? 1 : 0) + (prep.deferred.length ? 1 : 0) + 1}
              title="Your number"
              who="Whoever holds the lease or the budget conversation."
              icon={<Target className="h-3.5 w-3.5" />}
            >
              You told us {prep.targetSF.toLocaleString()} usable SF{prep.targetSource ? ` (your ${prep.targetSource})` : ""}.
              We&apos;ll bring the math that shows what it takes to get there — and what we&apos;d recommend.
            </PrepItem>
          )}
          {openCount === 0 && !prep.targetSF && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              <CheckCircle2 className="mb-1 h-5 w-5 text-emerald-500" />
              Nothing to gather — your intake covered it all. Come as you are; we&apos;ll spend the whole
              session on your program.
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-[#e9f7fb]/80 p-4 text-sm leading-relaxed text-slate-600">
          <p className="flex items-center gap-1.5 font-bold text-[#0089a3]"><MessageCircle className="h-4 w-4" /> What to expect</p>
          <p className="mt-1">
            About an hour, on screen together. We&apos;ll confirm the open items, walk your program live,
            and make the sizing decisions <i>with</i> you — nothing is final until you&apos;ve seen it. You&apos;ll
            leave with your program presentation, and it lives on your home page afterward.
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400 print:mt-4">
          {clientName} · Session prep · NELSON Worldwide
        </p>
      </div>
    </div>
  )
}

function PrepItem({ n, title, who, icon, children }: { n: number; title: string; who: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="flex items-center gap-2.5 font-bold">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00badc] text-[11px] font-bold text-white">{icon ?? n}</span>
        {title}
      </p>
      <p className="mt-2 pl-[34px] text-sm leading-relaxed text-slate-600">{children}</p>
      <p className="mt-1.5 pl-[34px] text-xs text-slate-400"><b>Who can help:</b> {who}</p>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3f7fa] px-6 text-center">{children}</div>
}
