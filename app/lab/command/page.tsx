"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Radar, Quote, Target, AlertTriangle, CheckCircle2, FileText, FileSpreadsheet,
  MonitorPlay, ExternalLink, Send, Eye, Check, LayoutGrid, Map as MapIcon, Users, Layers,
  Clock, TrendingUp,
} from "lucide-react"
import { buildDeliverable, CATEGORY_COLORS } from "@/lib/survey/deliverable"
import { demoResult } from "@/lib/survey/demo-scenarios"
import { lineGaps } from "@/lib/survey/comparison"
import { GOAL_MOTIVATORS, SURVEY_STEPS } from "@/lib/survey/sections"

/**
 * Lab 0.5 — the Command Center: fetching an engagement from the NELSON
 * designer's chair. One screen answers the founder's six questions — what
 * they said · what the system recommends · which door they used and how
 * completely · what the deliverable looks like · is it ready for them ·
 * can we push it back — and then points the whole thing at the live
 * session: the agenda built from gaps, the prep pack, and the screen kit
 * for the meeting itself. The designer human-in-the-loop's home page.
 */

// Simulated engagement meta — in production this is the engagement record.
const ENG = {
  token: "hartwell-x7k2",
  sent: "Jul 8", opened: "Jul 8, 9:12 AM",
  lane: "Detailed", stepsDone: 14, stepsTotal: 14,
  returnedAt: "Jul 12, 4:41 PM",
  sessionAt: "Tue Jul 15 · 2:00 PM",
}

// Illustrative benchmarks — TODO(founder): replace with real engagement averages.
const BENCH = {
  minutes: { them: 26, typical: 18 },
  answered: { them: 41, total: 46, typicalPct: 78 },
  gaps: { typical: 12 },
}

// The demo's premise: the target was captured lightly in the survey (Phase A
// ships the question); the VERDICT stays reserved for the session.
const TARGET = { sf: 12000, source: "current lease" }

const BEATS = [
  "Cover", "Who you are", "How you work", "The verdict", "Your number",
  "What we decided", "The program", "Where everyone sits", "What's next",
]

export default function CommandLab() {
  const result = useMemo(() => demoResult("law")!, [])
  const d = useMemo(() => buildDeliverable(result), [result])

  const [debrief, setDebrief] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [pushed, setPushed] = useState(false)
  const [beats, setBeats] = useState<Record<string, boolean>>(() => Object.fromEntries(BEATS.map((b) => [b, true])))

  // Real gaps, same derivation as the Studio.
  const gaps = useMemo(() => {
    const out = d.comp.lines.flatMap((l) => lineGaps(l).map((g) => ({ line: l.label, message: g.message })))
    const deferred = result.deferred.map((dq) => ({
      line: SURVEY_STEPS.find((s) => s.id === dq)?.title ?? dq,
      message: "Deferred by the client — cover live.",
    }))
    return { intake: out, deferred }
  }, [d, result])
  const gapCount = gaps.intake.length + gaps.deferred.length

  // The three biggest program moves vs today — the session's headlines.
  const moves = useMemo(
    () =>
      [...d.lines]
        .filter((l) => l.existingCountKnown && l.proposedCount !== l.existingCount)
        .map((l) => ({ label: l.label, from: l.existingCount, to: l.proposedCount, sf: (l.proposedCount - l.existingCount) * l.unitSF }))
        .sort((a, b) => Math.abs(b.sf) - Math.abs(a.sf))
        .slice(0, 3),
    [d],
  )

  const onBeats = BEATS.filter((b) => beats[b]).length
  const gross = d.totals.grossUsableSF

  return (
    <div className="min-h-screen bg-[#f3f7fa] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between">
          <Link href="/lab" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> The Lab
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">0.5 · The Command Center — prototype</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-6 py-8">
        <Intent />

        {/* ══ Top strip — identity · journey · effort · session ═══════════ */}
        <div className="relative mt-6 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <Pin n={3} />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">{d.clientName}</h2>
              <p className="text-xs text-slate-400">/{ENG.token} · {d.current} → {d.future} people</p>
            </div>
            {/* journey timeline */}
            <div className="flex items-center gap-0 text-[11px]">
              {[
                ["Sent", ENG.sent, true],
                ["Opened", ENG.opened, true],
                [`Survey · ${ENG.lane}`, `${ENG.stepsDone}/${ENG.stepsTotal} steps`, true],
                ["Returned", ENG.returnedAt, true],
                ["Live session", ENG.sessionAt, false],
              ].map(([label, sub, done], i, arr) => (
                <div key={label as string} className="flex items-center">
                  <div className="text-center">
                    <span className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full ${done ? "bg-[#00badc] text-white" : "border-2 border-dashed border-slate-300 text-slate-400"}`}>
                      {done ? <Check className="h-3.5 w-3.5" /> : <Clock className="h-3 w-3" />}
                    </span>
                    <p className="mt-1 font-bold text-slate-700">{label}</p>
                    <p className="text-slate-400">{sub}</p>
                  </div>
                  {i < arr.length - 1 && <span className={`mx-2 mb-7 h-px w-8 ${done ? "bg-[#00badc]" : "bg-slate-200"}`} />}
                </div>
              ))}
            </div>
            {/* effort vs typical */}
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <TrendingUp className="h-3.5 w-3.5" /> Strong intake — above average
              </span>
              <p className="mt-1.5 text-[11px] tabular-nums text-slate-500">
                {BENCH.minutes.them} min spent (typical ~{BENCH.minutes.typical}) · {BENCH.answered.them}/{BENCH.answered.total} answered · {gapCount} gaps (typical ~{BENCH.gaps.typical})
              </p>
              <p className="text-[10px] text-slate-300">benchmarks illustrative — TODO(founder)</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3 text-[11px]">
            <DoorBadge label="Interactive survey" state="Detailed lane · complete" on />
            <DoorBadge label="Workbook" state="not used" />
            <DoorBadge label="Do it live" state="session booked" pending />
          </div>
        </div>

        {/* ══ Three columns ════════════════════════════════════════════════ */}
        <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)_380px]">
          {/* ── 1 · What they said ── */}
          <section className="relative space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <Pin n={1} />
            <h3 className="flex items-center gap-2 text-sm font-bold"><Users className="h-4 w-4 text-[#0089a3]" /> What they said</h3>
            <div className="flex flex-wrap gap-1.5">
              {(result.goals?.motivators ?? []).map((m) => (
                <span key={m} className="rounded-full bg-[#00badc]/10 px-2 py-0.5 text-[11px] font-medium text-[#0089a3]">
                  {GOAL_MOTIVATORS.find((x) => x.id === m)?.label ?? m}
                </span>
              ))}
            </div>
            <KV k="Cadence" v={`${result.work.daysInOffice} days/wk · ${result.work.fullyRemote} fully remote`} />
            <KV k="Teams" v={`${result.people.departments.length} departments · leaders named`} />
            <KV k="Today" v={`${result.existing?.existingWorkstations ?? "—"} workstations · ${result.existing?.existingOffices ?? "—"} offices · ${result.existing?.workstationSF ?? "—"}/${result.existing?.officeSF ?? "—"} SF standards`} />
            {result.qualitative.painPoints && (
              <blockquote className="rounded-xl border-l-[3px] border-[#00badc] bg-slate-50 p-3 text-xs italic leading-relaxed text-slate-600">
                <Quote className="mb-1 h-3 w-3 text-[#00badc]" /> {result.qualitative.painPoints}
              </blockquote>
            )}
            {result.qualitative.loves && (
              <blockquote className="rounded-xl border-l-[3px] border-emerald-300 bg-slate-50 p-3 text-xs italic leading-relaxed text-slate-600">
                <Quote className="mb-1 h-3 w-3 text-emerald-400" /> {result.qualitative.loves}
              </blockquote>
            )}
            <p className="text-[11px] text-slate-400">Full answers: the Studio&apos;s survey drawer — every question, one keystroke.</p>
          </section>

          {/* ── 2 · What the system recommends ── */}
          <section className="relative rounded-2xl border border-slate-200 bg-white p-5">
            <Pin n={2} />
            <h3 className="flex items-center gap-2 text-sm font-bold"><Radar className="h-4 w-4 text-[#0089a3]" /> What the system recommends</h3>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold tabular-nums tracking-tight">{gross.toLocaleString()}<span className="ml-1 text-base font-medium text-slate-400">SF</span></p>
                <p className="text-xs text-slate-500">
                  {gross - d.totals.existingSF >= 0 ? "+" : ""}{(gross - d.totals.existingSF).toLocaleString()} SF vs today · {d.totals.sfPerPerson} SF/person · rentable est. {d.totals.estimatedRentableSF.toLocaleString()}
                </p>
              </div>
              <a href="/studio" className="inline-flex items-center gap-2 rounded-lg bg-[#0e1a2e] px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                <LayoutGrid className="h-4 w-4" /> Open in Studio
              </a>
            </div>
            <div className="mt-3 flex h-3 gap-[2px] overflow-hidden rounded-full">
              {d.categories.map((c) => (
                <span key={c.name} title={`${c.name} · ${c.proposedTotalSF.toLocaleString()} SF`} style={{ width: `${(c.proposedTotalSF / gross) * 100}%`, backgroundColor: CATEGORY_COLORS[c.name].accent }} />
              ))}
            </div>
            {/* the target, acknowledged — verdict reserved */}
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <p className="flex items-center gap-2 text-xs font-bold text-amber-800">
                <Target className="h-3.5 w-3.5" /> Their number: {TARGET.sf.toLocaleString()} SF ({TARGET.source}) — captured in the survey
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-700/90">
                Program runs {(gross - TARGET.sf).toLocaleString()} SF over. The verdict and the compromise levers are
                reserved for the session — <a className="font-semibold underline" href="/lab/target">the target page</a> is loaded and ready.
              </p>
            </div>
            {/* headlines */}
            <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">The session&apos;s headlines — biggest moves vs today</p>
            <div className="mt-2 space-y-1.5">
              {moves.map((m) => (
                <div key={m.label} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-1.5 text-sm">
                  <span className="font-medium">{m.label}</span>
                  <span className="tabular-nums text-slate-500">{m.from} → {m.to} <b className={m.sf >= 0 ? "text-amber-600" : "text-emerald-600"}>{m.sf >= 0 ? "+" : ""}{m.sf.toLocaleString()} SF</b></span>
                </div>
              ))}
            </div>
          </section>

          {/* ── 3 · The session ── */}
          <section className="relative space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <Pin n={5} />
            <h3 className="flex items-center gap-2 text-sm font-bold"><MonitorPlay className="h-4 w-4 text-[#0089a3]" /> The live session — {ENG.sessionAt}</h3>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Agenda — drafted from the gaps</p>
              <ol className="mt-2 space-y-1.5 text-xs">
                <li className="flex gap-2"><b className="text-slate-400">1.</b> Numbers to confirm — {gaps.intake.length} lines where intake couldn&apos;t size or count <span className="text-slate-400">(~{Math.max(10, gaps.intake.length * 4)} min)</span></li>
                <li className="flex gap-2"><b className="text-slate-400">2.</b> Deferred topics — {gaps.deferred.length} the client saved for us: {gaps.deferred.map((g) => g.line).join(" · ") || "none"} <span className="text-slate-400">(~10 min)</span></li>
                <li className="flex gap-2"><b className="text-slate-400">3.</b> The target conversation — {TARGET.sf.toLocaleString()} vs {gross.toLocaleString()} SF, levers ready <span className="text-slate-400">(~20 min)</span></li>
                <li className="flex gap-2"><b className="text-slate-400">4.</b> Shape the program live · close with next steps</li>
              </ol>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Prep pack</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => setDebrief((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${debrief ? "border-[#00badc] bg-[#e9f7fb] text-[#0089a3]" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                  <FileText className="h-3.5 w-3.5" /> Client debrief {debrief ? "· hide" : "· preview"}
                </button>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600"><FileText className="h-3.5 w-3.5" /> Designer brief</span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600"><FileSpreadsheet className="h-3.5 w-3.5" /> Fit-planning package</span>
              </div>
            </div>

            <div className="relative rounded-xl bg-slate-50 p-3">
              <Pin n={6} />
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">The screen kit — open before the call</p>
              <div className="mt-2 space-y-1.5 text-xs">
                <Screen icon={<LayoutGrid className="h-3.5 w-3.5" />} what="Studio — Delta Cockpit, Briefing view" why="the room's main share" href="/studio" />
                <Screen icon={<MapIcon className="h-3.5 w-3.5" />} what="Program map, full screen" why="the Zoom-friendly visual" href="/review" />
                <Screen icon={<Target className="h-3.5 w-3.5" />} what="The target page" why="when the number conversation starts" href="/lab/target" />
                <Screen icon={<Users className="h-3.5 w-3.5" />} what="Survey drawer (inside Studio)" why="any answer, one keystroke" href="/studio" />
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">Share screen 1; keep 2–4 on the driver monitor. Nothing here is unsafe to show — briefing surfaces only.</p>
            </div>
          </section>
        </div>

        {/* ══ Deliverable composer + push ═══════════════════════════════════ */}
        <div className="relative mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <Pin n={4} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold"><Layers className="h-4 w-4 text-[#0089a3]" /> The deliverable — composed, reviewed, pushed</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {onBeats} of {BEATS.length} beats in · ~{onBeats * 2} min runtime. The beat library grows; the designer
                composes the presentation these conditions deserve.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${pushed ? "bg-emerald-100 text-emerald-700" : reviewed ? "bg-[#00badc]/15 text-[#0089a3]" : "bg-slate-100 text-slate-500"}`}>
                {pushed ? "Live for the client ✓" : reviewed ? "Reviewed — ready to push" : "Draft — human review pending"}
              </span>
              {!reviewed && (
                <button onClick={() => setReviewed(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400">
                  <Eye className="h-3.5 w-3.5" /> Mark reviewed
                </button>
              )}
              {reviewed && !pushed && (
                <button onClick={() => setPushed(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0e1a2e] px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                  <Send className="h-3.5 w-3.5" /> Push to client
                </button>
              )}
              {pushed && (
                <a href="#" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0089a3]"><ExternalLink className="h-3.5 w-3.5" /> view as client</a>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {BEATS.map((b, i) => {
              const on = beats[b]
              const isNew = b === "Your number" || b === "What we decided"
              return (
                <button
                  key={b}
                  onClick={() => setBeats((p) => ({ ...p, [b]: !on }))}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    on ? "border-[#00badc]/50 bg-[#e9f7fb]/70 text-slate-800" : "border-slate-200 text-slate-400"
                  }`}
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded ${on ? "bg-[#00badc] text-white" : "bg-slate-200"}`}>{on && <Check className="h-3 w-3" />}</span>
                  {i + 1}. {b}
                  {isNew && <span className="rounded-full bg-[#00badc]/15 px-1.5 text-[9px] font-bold text-[#0089a3]">NEW</span>}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Gate honored: nothing reaches the client until a human marks it reviewed and pushes — the share flag, grown up.
          </p>
        </div>

        {/* ══ Client debrief preview ════════════════════════════════════════ */}
        {debrief && (
          <div className="mt-5 rounded-2xl border-2 border-dashed border-[#00badc]/40 bg-white p-8">
            <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-wider text-[#0089a3]">
              Preview — the client-facing “Prep for the live session” download
            </p>
            <div className="mx-auto max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">Before our working session</h2>
              <p className="mt-1 text-sm text-slate-500">{d.clientName} · with NELSON · {ENG.sessionAt}</p>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                You gave us a <b>strong intake</b> — more complete than most teams manage. The
                {" "}{gapCount} open items below aren&apos;t homework; they&apos;re exactly what the working
                session is for. If you can gather any of them beforehand, we&apos;ll move that much faster.
              </p>
              <div className="mt-5 space-y-3">
                <DebriefItem n={1} title="A few counts we couldn't see" who="Office manager or facilities — a walk-through count is plenty.">
                  {gaps.intake.slice(0, 3).map((g) => g.line).join(" · ")}{gaps.intake.length > 3 ? ` · +${gaps.intake.length - 3} more` : ""}
                </DebriefItem>
                {gaps.deferred.length > 0 && (
                  <DebriefItem n={2} title="Topics you saved for the meeting" who="No prep needed — just the right people in the room.">
                    {gaps.deferred.map((g) => g.line).join(" · ")}
                  </DebriefItem>
                )}
                <DebriefItem n={3} title="Your number" who="Whoever holds the lease or the budget conversation.">
                  You told us {TARGET.sf.toLocaleString()} SF ({TARGET.source}). We&apos;ll bring the math that shows
                  what it takes to get there — and what we&apos;d recommend.
                </DebriefItem>
              </div>
              <p className="mt-5 rounded-xl bg-[#e9f7fb]/70 p-3 text-xs leading-relaxed text-slate-600">
                <b className="text-[#0089a3]">What to expect:</b> ~60 minutes. We&apos;ll confirm the open items together,
                walk your program on screen, and make the size decisions with you — nothing is final until you&apos;ve seen it.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

/* ── pieces ─────────────────────────────────────────────────────────────── */

function Intent() {
  const pins = [
    "What they said — the intake distilled: goals, cadence, their own words. Full answers stay one keystroke away in the Studio.",
    "What the system recommends — the engine's program, the target acknowledged (verdict reserved for the session), the biggest moves as headlines.",
    "Doors & completeness — which door they used, how far they got, effort vs. typical. The 'above average' chip is earned encouragement, not decoration.",
    "The deliverable — a beat library the designer composes per engagement, behind an explicit review → push state machine.",
    "Session prep — the agenda drafts itself from the gaps; the prep pack includes the client-facing debrief (previewable below).",
    "The screen kit — exactly what to have open on Zoom, ordered, with why.",
  ]
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight"><MonitorPlay className="h-5 w-5 text-[#0089a3]" /> The Command Center — one engagement, fetched</h1>
      <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-500">
        The designer human-in-the-loop&apos;s home page. Today this job is spread across the console, the
        review, and the Studio; this comp pulls it into one screen pointed at the live session.
      </p>
      <div className="mt-3 grid gap-x-8 gap-y-1.5 text-xs text-slate-600 sm:grid-cols-2">
        {pins.map((p, i) => (
          <p key={i} className="flex gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0e1a2e] text-[9px] font-bold text-white">{i + 1}</span>
            <span className="leading-relaxed">{p}</span>
          </p>
        ))}
      </div>
    </div>
  )
}

function Pin({ n }: { n: number }) {
  return (
    <span className="absolute right-3 top-3 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#0e1a2e] text-[10px] font-bold text-white">{n}</span>
  )
}

function DoorBadge({ label, state, on, pending }: { label: string; state: string; on?: boolean; pending?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${on ? "bg-[#00badc]/10 text-[#0089a3]" : pending ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-400"}`}>
      {on ? <CheckCircle2 className="h-3.5 w-3.5" /> : pending ? <Clock className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5 opacity-40" />}
      <b>{label}</b> · {state}
    </span>
  )
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <p className="text-xs leading-relaxed text-slate-600"><b className="text-slate-400">{k}:</b> {v}</p>
  )
}

function Screen({ icon, what, why, href }: { icon: React.ReactNode; what: string; why: string; href: string }) {
  return (
    <a href={href} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 hover:border-[#00badc]/50">
      <span className="flex items-center gap-2 font-medium text-slate-700">{icon} {what}</span>
      <span className="text-slate-400">{why} <ExternalLink className="ml-1 inline h-3 w-3" /></span>
    </a>
  )
}

function DebriefItem({ n, title, who, children }: { n: number; title: string; who: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="flex items-center gap-2 text-sm font-bold">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00badc] text-[10px] font-bold text-white">{n}</span>
        {title}
      </p>
      <p className="mt-1.5 pl-7 text-xs leading-relaxed text-slate-600">{children}</p>
      <p className="mt-1 pl-7 text-[11px] text-slate-400"><b>Who can help:</b> {who}</p>
    </div>
  )
}
