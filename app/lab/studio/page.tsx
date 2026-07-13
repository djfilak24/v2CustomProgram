"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, AlertTriangle, ClipboardList, CheckCircle2, Target, Layers,
} from "lucide-react"
import { buildDeliverable, CATEGORY_COLORS } from "@/lib/survey/deliverable"
import { demoResult } from "@/lib/survey/demo-scenarios"

/**
 * Lab 0.1 — two layout directions for the Studio, with the target line
 * designed IN (not bolted on). Static comps on real numbers; numbered pins
 * carry the design intent. Direction C (evolve the current layout) is noted,
 * not drawn — we know what it looks like, it's live at /studio.
 */

type Dir = "a" | "b"

export default function StudioLab() {
  const result = useMemo(() => demoResult("law")!, [])
  const d = useMemo(() => buildDeliverable(result), [result])
  const [dir, setDir] = useState<Dir>("a")
  const target = 12000 // the comp's premise: a lease the client already holds

  return (
    <div className="min-h-screen bg-[#f3f7fa] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between">
          <Link href="/lab" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> The Lab
          </Link>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {([["a", "Direction A — the Delta Cockpit"], ["b", "Direction B — the Ledger"]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setDir(id)}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${dir === id ? "bg-white shadow-sm" : "text-slate-500"}`}>
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">0.1 · Studio UI — comps</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-6 py-8">
        {dir === "a" ? <DirectionA d={d} target={target} /> : <DirectionB d={d} target={target} />}
      </main>
    </div>
  )
}

/* ════ Direction A — the Delta Cockpit ═══════════════════════════════════ */
/* Target-first mission control: the delta band owns the top, scenarios are
   tabs, the session feed is always visible. Built for the live meeting. */

function DirectionA({ d, target }: { d: ReturnType<typeof buildDeliverable>; target: number }) {
  const gross = d.totals.grossUsableSF
  const gap = target - gross
  return (
    <div>
      <Intent
        title="Direction A — the Delta Cockpit"
        thesis="The session IS the pursuit of the target, so the target owns the room. One band across the top answers 'where are we vs. their number' at every moment; everything below is how you move it."
        pins={[
          "The delta band: program bar + target tick + live gap chip. Never scrolls away.",
          "Scenario tabs — Baseline / Session / Target-fit — switching repaints everything below.",
          "The session feed (decisions + gaps interleaved, newest first) is a permanent right rail, not a drawer. The meeting's record is always on the wall.",
          "Space cards compress to rows — qty × SF and the total; the eye/duplicate affordances surface on hover.",
        ]}
      />

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        {/* ── the delta band ── */}
        <div className="relative border-b border-slate-200 bg-[#0e1a2e] px-6 py-4 text-white">
          <Pin n={1} light />
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#00badc]">{d.clientName} · target {target.toLocaleString()} SF (lease)</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {gross.toLocaleString()} <span className="text-base font-medium text-white/50">SF program</span>
                <span className={`ml-3 rounded-full px-2.5 py-1 text-sm font-bold ${gap >= 0 ? "bg-emerald-400/20 text-emerald-300" : "bg-rose-400/20 text-rose-300"}`}>
                  {gap >= 0 ? "+" : ""}{gap.toLocaleString()} SF vs target
                </span>
              </p>
            </div>
            <div className="relative w-[42%]">
              <div className="flex h-4 gap-[2px] overflow-hidden rounded-full">
                {d.categories.map((c) => (
                  <span key={c.name} style={{ width: `${(c.proposedTotalSF / gross) * 100}%`, backgroundColor: CATEGORY_COLORS[c.name].accent }} />
                ))}
              </div>
              <div className="absolute -inset-y-1 w-[2.5px] rounded bg-white" style={{ left: `${Math.min(99, (target / (Math.max(gross, target) * 1.05)) * 100)}%` }} />
              <p className="mt-1.5 text-[10px] text-white/50">white tick = their number · bar = your program, by category</p>
            </div>
            <div className="relative flex rounded-lg bg-white/10 p-0.5 text-xs font-semibold">
              <Pin n={2} light />
              <span className="rounded-md px-2.5 py-1 text-white/50">Baseline</span>
              <span className="rounded-md bg-white px-2.5 py-1 text-slate-900 shadow-sm">Session</span>
              <span className="rounded-md px-2.5 py-1 text-white/50">Target-fit</span>
            </div>
          </div>
        </div>

        {/* ── body: levers | spaces | feed ── */}
        <div className="grid grid-cols-[240px_minmax(0,1fr)_300px]">
          <div className="border-r border-slate-100 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">The levers</p>
            {[["Workstations 48 → 36", "−336"], ["Offices 144 → 120", "−1,288"], ["Seat share @ 3 days", "−1,175"], ["Circulation 45 → 40", "−440"]].map(([l, v]) => (
              <div key={l} className="mt-2 flex items-center justify-between rounded-lg border border-slate-200 px-2.5 py-2 text-xs">
                <span className="font-medium text-slate-700">{l}</span>
                <span className="font-bold tabular-nums text-[#0089a3]">{v}</span>
              </div>
            ))}
            <p className="mt-3 text-[10px] leading-relaxed text-slate-400">every lever = engine re-run, condition attached (see 0.4)</p>
          </div>

          <div className="relative p-4">
            <Pin n={4} />
            {d.categories.slice(0, 3).map((cat) => (
              <div key={cat.name} className="mb-4">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: CATEGORY_COLORS[cat.name].text }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.name].accent }} />
                  {cat.name} · {cat.proposedTotalSF.toLocaleString()} SF
                </p>
                <div className="mt-1.5 space-y-1">
                  {cat.lines.filter((l) => l.proposedCount > 0).slice(0, 3).map((l) => (
                    <div key={l.key} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-1.5 text-sm hover:border-slate-300" style={{ borderLeft: `3px solid ${CATEGORY_COLORS[cat.name].accent}` }}>
                      <span className="font-medium">{l.label}</span>
                      <span className="tabular-nums text-slate-500">{l.proposedCount} × {l.unitSF} SF <b className="ml-2 text-slate-900">{(l.proposedCount * l.unitSF).toLocaleString()}</b></span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="relative border-l border-slate-100 bg-slate-50/60 p-4">
            <Pin n={3} />
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Session feed · live</p>
            <Feed
              items={[
                { icon: <ClipboardList className="h-3.5 w-3.5 text-[#0089a3]" />, text: "Offices — unit size 144 → 120 SF", note: "principals keep 144; associates to 120" },
                { icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />, text: "Gap closed — office count", note: "confirmed 34 live with Partners" },
                { icon: <ClipboardList className="h-3.5 w-3.5 text-[#0089a3]" />, text: "Added Huddle Room (B) — 2 × 140 SF" },
                { icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />, text: "Open — paralegal cadence unknown", note: "cover before target verdict" },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════ Direction B — the Ledger ══════════════════════════════════════════ */
/* A calm session document: category rail, one continuous table, the record
   as a timeline. Reads like a working paper — presentation-safe by default. */

function DirectionB({ d, target }: { d: ReturnType<typeof buildDeliverable>; target: number }) {
  const gross = d.totals.grossUsableSF
  return (
    <div>
      <Intent
        title="Direction B — the Ledger"
        thesis="The session is a working document the client reads along with. One continuous ledger, a quiet category rail, the record as a timeline down the right. The target is the ledger's bottom line — literally."
        pins={[
          "Category rail: color-keyed anchors that scroll the ledger; totals always visible.",
          "One continuous table — no cards, no grids. Every line is a row; editing happens in place.",
          "The bottom line IS the target verdict: program total, target, and the gap — the last row of the document.",
          "The session record: decisions and gap-closures as one chronological timeline — reads like meeting minutes, exports like them too.",
        ]}
      />

      <div className="mt-6 grid grid-cols-[200px_minmax(0,1fr)_290px] overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="relative border-r border-slate-100 p-4">
          <Pin n={1} />
          <p className="text-xs font-bold text-slate-900">{d.clientName}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">{d.current} → {d.future} people</p>
          <div className="mt-4 space-y-1">
            {d.categories.map((c) => (
              <div key={c.name} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[c.name].accent }} />
                {c.name}
                <span className="ml-auto tabular-nums text-slate-400">{Math.round((c.proposedTotalSF / gross) * 100)}%</span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Gross usable</p>
            <p className="text-xl font-bold tabular-nums">{gross.toLocaleString()} SF</p>
          </div>
        </div>

        <div className="relative">
          <Pin n={2} />
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {d.categories.slice(0, 2).map((cat) => (
                <CatRows key={cat.name} cat={cat} />
              ))}
              <tr className="text-slate-400">
                <td className="px-4 py-1.5 text-xs" colSpan={2}>… collaboration · support (continues)</td>
                <td className="px-4 py-1.5 text-right text-xs">4,707</td>
              </tr>
              <tr className="relative bg-[#0e1a2e] font-semibold text-white">
                <td className="relative px-4 py-2.5">
                  <Pin n={3} light />
                  Program {gross.toLocaleString()} · target {target.toLocaleString()} <span className="font-normal text-white/50">(lease)</span>
                </td>
                <td className="px-3 py-2.5 text-right" colSpan={2}>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${target - gross >= 0 ? "bg-emerald-400/20 text-emerald-300" : "bg-rose-400/20 text-rose-300"}`}>
                    {target - gross >= 0 ? "+" : ""}{(target - gross).toLocaleString()} SF to their number
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="relative border-l border-slate-100 bg-slate-50/60 p-4">
          <Pin n={4} />
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">The session record</p>
          <div className="mt-3 space-y-0 border-l-2 border-slate-200 pl-4">
            {[
              ["2:04", "Session opened — baseline ratio program"],
              ["2:11", "Offices 144 → 120 SF · “principals keep 144”"],
              ["2:19", "Gap closed: office count confirmed (34)"],
              ["2:26", "Added Huddle (B) · 2 × 140"],
              ["2:31", "Target set: 12,000 SF from current lease"],
            ].map(([t, x]) => (
              <div key={t} className="relative pb-3">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#00badc]" />
                <p className="text-[10px] font-bold text-slate-400">{t} PM</p>
                <p className="text-xs leading-snug text-slate-700">{x}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CatRows({ cat }: { cat: ReturnType<typeof buildDeliverable>["categories"][number] }) {
  return (
    <>
      <tr style={{ backgroundColor: CATEGORY_COLORS[cat.name].tint }}>
        <td className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: CATEGORY_COLORS[cat.name].text }} colSpan={3}>{cat.name}</td>
      </tr>
      {cat.lines.filter((l) => l.proposedCount > 0).slice(0, 2).map((l) => (
        <tr key={l.key}>
          <td className="px-4 py-1.5 font-medium">{l.label}</td>
          <td className="px-3 py-1.5 text-right text-slate-500">{l.proposedCount} × {l.unitSF} SF</td>
          <td className="px-4 py-1.5 text-right font-semibold">{(l.proposedCount * l.unitSF).toLocaleString()}</td>
        </tr>
      ))}
    </>
  )
}

function Feed({ items }: { items: { icon: React.ReactNode; text: string; note?: string }[] }) {
  return (
    <div className="mt-3 space-y-2">
      {items.map((x, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white p-2.5">
          <p className="flex items-start gap-2 text-xs font-medium leading-snug text-slate-800">
            <span className="mt-0.5 shrink-0">{x.icon}</span>{x.text}
          </p>
          {x.note && <p className="mt-1 pl-[22px] text-[11px] italic text-slate-400">“{x.note}”</p>}
        </div>
      ))}
    </div>
  )
}

/* ── comp chrome ────────────────────────────────────────────────────────── */

function Intent({ title, thesis, pins }: { title: string; thesis: string; pins: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight"><Layers className="h-5 w-5 text-[#0089a3]" /> {title}</h1>
      <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-500">{thesis}</p>
      <div className="mt-3 grid gap-x-8 gap-y-1.5 text-xs text-slate-600 sm:grid-cols-2">
        {pins.map((p, i) => (
          <p key={i} className="flex gap-2"><PinDot n={i + 1} /> <span className="leading-relaxed">{p}</span></p>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
        <Target className="h-3 w-3" /> Comp premise: the client holds a 12,000 SF lease — the target from exploration 0.4 designed into the room.
        Direction C (evolve the current /studio layout) is the fallback; it&apos;s live today and needs no comp.
      </p>
    </div>
  )
}

function Pin({ n, light }: { n: number; light?: boolean }) {
  return (
    <span className={`absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${light ? "bg-white text-slate-900" : "bg-[#0e1a2e] text-white"}`}>
      {n}
    </span>
  )
}

function PinDot({ n }: { n: number }) {
  return <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0e1a2e] text-[9px] font-bold text-white">{n}</span>
}
