"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, Moon, Sun, Sparkles, Printer, MessageSquareText } from "lucide-react"
import { buildDeliverable, CATEGORY_COLORS } from "@/lib/survey/deliverable"
import { demoResult } from "@/lib/survey/demo-scenarios"

/**
 * Lab 0.2 — the deliverable as a designed presentation. Not a rebuild: a
 * pacing storyboard. The current 8 slides plus the two new beats the target
 * conversation earns (verdict-vs-target, decisions & compromises), with the
 * dark/light rhythm from Advisory #5 made visible, presenter notes marked,
 * and print parity noted per slide.
 */

interface Beat {
  n: number
  title: string
  mode: "dark" | "light"
  isNew?: boolean
  beat: string
  notes: string
  print: string
}

export default function DeliverableLab() {
  const d = useMemo(() => buildDeliverable(demoResult("law")!), [])
  const target = 12000

  const BEATS: Beat[] = [
    { n: 1, title: "Cover", mode: "dark", beat: "The client's name in lights. One-liner added: “60 → 67 people · ~14,400 USF · office-forward hybrid.” The cover alone summarizes the engagement.", notes: "Set the room: this is their document, not our template.", print: "full-bleed navy, logo lockup" },
    { n: 2, title: "Who you are", mode: "light", beat: "Teams, headcounts, growth arrows — the roster they gave us, honored back.", notes: "Name the leaders; they're in the room.", print: "as-is" },
    { n: 3, title: "How you work", mode: "light", beat: "Cadence, remote, posture — AND the engine made visible: “a 5-day office means desk-per-person and 1:15 focus booths; here's why.” The evidence slide.", notes: "This is where the engine earns trust before it asks for money.", print: "as-is" },
    { n: 4, title: "The verdict", mode: "dark", beat: "The number, huge. What the ratios + their answers call for. Held one beat before anything else appears.", notes: "Pause here. Let them react before the next click.", print: "dark moment, page-break-safe" },
    { n: 5, title: "Your number", mode: "dark", isNew: true, beat: `The target beat: their ${target.toLocaleString()} SF lease against the program — the delta map, the tick, one of three honest verdicts. The slide the whole engagement points at.`, notes: "If compromise: don't solve it here — set up the next slide.", print: "dark pair with the verdict — the deck's centerpiece spread" },
    { n: 6, title: "What we decided together", mode: "light", isNew: true, beat: "The session's decision log, humanized: each compromise with its condition (“36 SF benches — paired with 1:10 focus booths”). Their fingerprints on the program.", notes: "Read it back to them; agreement compounds when it's witnessed.", print: "as-is, from the persisted session (Phase A)" },
    { n: 7, title: "The program", mode: "light", beat: "The full technical table — every line, circulation, load factor. Category colors from the Studio carry through.", notes: "Skim it; the appendix holds the detail.", print: "never breaks a category across pages" },
    { n: 8, title: "Where everyone sits", mode: "light", beat: "The program map — clusters, adjacencies, named offices. The screenshot that gets forwarded.", notes: "Point at their name on the map. Every time.", print: "landscape spread" },
    { n: 9, title: "What happens next", mode: "dark", beat: "Fit planning tests it on real floor plates. Names, dates, the one ask we have of them.", notes: "End with their action item, not ours.", print: "dark close, contact block" },
  ]

  return (
    <div className="min-h-screen bg-[#f3f7fa] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/lab" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> The Lab
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">0.2 · The deliverable arc — storyboard</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight">The deck as a designed presentation.</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
          Nine beats — the current eight slides re-paced, plus the two the target conversation earns
          (marked NEW). Dark slides are moments; light slides are information. The rhythm bar below
          is the whole argument at a glance.
        </p>

        {/* ── the rhythm bar ─────────────────────────────────────────────── */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Pacing — dark = moment, light = information</p>
          <div className="mt-3 flex gap-1.5">
            {BEATS.map((b) => (
              <div key={b.n} className="group relative flex-1">
                <div
                  className={`flex h-14 items-center justify-center rounded-lg border text-xs font-bold ${
                    b.mode === "dark" ? "border-[#0e1a2e] bg-[#0e1a2e] text-white" : "border-slate-200 bg-slate-50 text-slate-500"
                  } ${b.isNew ? "ring-2 ring-[#00badc] ring-offset-2" : ""}`}
                >
                  {b.n}
                </div>
                <p className="mt-1 truncate text-center text-[9px] font-medium text-slate-400">{b.title}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            The shape: two quiet light slides build evidence → the dark verdict pair (4–5) lands the
            number and <i>their</i> number back to back → light slides do the accounting → a dark
            close. One climb, one summit, one descent — not eight equal slides.
          </p>
        </div>

        {/* ── the beats ──────────────────────────────────────────────────── */}
        <div className="mt-8 space-y-3">
          {BEATS.map((b) => (
            <div key={b.n} className={`flex gap-4 rounded-2xl border bg-white p-4 ${b.isNew ? "border-[#00badc]/60" : "border-slate-200"}`}>
              {/* mini slide */}
              <div className={`relative flex h-24 w-40 shrink-0 flex-col justify-center overflow-hidden rounded-lg border px-3 ${b.mode === "dark" ? "border-[#0e1a2e] bg-[#0e1a2e]" : "border-slate-200 bg-slate-50"}`}>
                {b.n === 5 ? (
                  <MiniDelta d={d} target={target} />
                ) : b.n === 4 ? (
                  <p className="text-lg font-bold tabular-nums text-white">{d.totals.grossUsableSF.toLocaleString()} <span className="text-[9px] font-medium text-white/50">SF</span></p>
                ) : b.n === 7 ? (
                  <MiniTable />
                ) : (
                  <p className={`text-[11px] font-bold ${b.mode === "dark" ? "text-white" : "text-slate-600"}`}>{b.title}</p>
                )}
                <span className={`absolute right-1.5 top-1.5 ${b.mode === "dark" ? "text-white/40" : "text-slate-300"}`}>
                  {b.mode === "dark" ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                </span>
              </div>
              {/* copy */}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-bold">
                  {b.n}. {b.title}
                  {b.isNew && <span className="inline-flex items-center gap-1 rounded-full bg-[#00badc]/10 px-2 py-0.5 text-[10px] font-bold text-[#0089a3]"><Sparkles className="h-3 w-3" /> NEW</span>}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{b.beat}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-0.5 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1"><MessageSquareText className="h-3 w-3" /> presenter: {b.notes}</span>
                  <span className="inline-flex items-center gap-1"><Printer className="h-3 w-3" /> print: {b.print}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs leading-relaxed text-slate-400">
          Standing requirements carried from Advisory #5: presenter-notes strip is NELSON-only and
          never prints · the PDF mirrors this exact arc (technical table at the end) · slide 6 renders
          from the persisted Studio session, which is why Phase A ships before this deck does.
        </p>
      </main>
    </div>
  )
}

function MiniDelta({ d, target }: { d: ReturnType<typeof buildDeliverable>; target: number }) {
  const gross = d.totals.grossUsableSF
  const max = Math.max(gross, target) * 1.06
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wide text-[#00badc]">your number</p>
      <div className="relative mt-1.5 h-2.5 w-full">
        <div className="absolute inset-y-0 left-0 flex gap-[1px] overflow-hidden rounded-full" style={{ width: `${(gross / max) * 100}%` }}>
          {d.categories.map((c) => (
            <span key={c.name} style={{ width: `${(c.proposedTotalSF / gross) * 100}%`, backgroundColor: CATEGORY_COLORS[c.name].accent }} />
          ))}
        </div>
        <div className="absolute -inset-y-0.5 w-[2px] rounded bg-white" style={{ left: `${(target / max) * 100}%` }} />
      </div>
      <p className="mt-1.5 text-[9px] tabular-nums text-white/60">{gross.toLocaleString()} vs {target.toLocaleString()} SF</p>
    </div>
  )
}

function MiniTable() {
  return (
    <div className="space-y-1">
      {[80, 62, 71, 45].map((w, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="h-1.5 rounded-full bg-slate-300" style={{ width: `${w}%` }} />
          <span className="h-1.5 w-4 rounded-full bg-slate-200" />
        </div>
      ))}
    </div>
  )
}
