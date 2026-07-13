"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Target, Building2, CalendarDays, Gauge, Check, AlertTriangle, Sparkles,
  ChevronRight, Undo2,
} from "lucide-react"
import { buildDeliverable, CATEGORY_COLORS } from "@/lib/survey/deliverable"
import { demoResult } from "@/lib/survey/demo-scenarios"
import { computeSeatDemandBlock, getTotalSeatDemand } from "@/lib/fast-track-calculations"

/**
 * Lab 0.4 — the target conversation, prototyped live.
 *
 * Four questions answered together: what you have today · how you're
 * designing your business to work · what the ratios say you should be ·
 * can we achieve YOUR number. Below the fold: the compromise levers, each
 * one priced by the real engine (buildDeliverable variants + the seat-demand
 * model), each with the designer's caution attached. The point is the delta
 * map — make the big gaps visible, let the client decide what they'll trade.
 */

interface Lever {
  id: string
  label: string
  save: number
  caution: string
  engineNote?: string
}

export default function TargetLab() {
  const result = useMemo(() => demoResult("law")!, [])
  const base = useMemo(() => buildDeliverable(result), [result])

  const [targetSF, setTargetSF] = useState<number | null>(null)
  const [source, setSource] = useState<"lease" | "building" | "budget">("lease")
  const [active, setActive] = useState<Record<string, boolean>>({})

  // ── The levers — each priced by rebuilding the deliverable ──────────────
  const levers = useMemo<Lever[]>(() => {
    const g0 = base.totals.grossUsableSF
    const out: Lever[] = []
    const ws = base.comp.lines.find((l) => l.key === "workstations")
    const off = base.comp.lines.find((l) => l.key === "offices")
    const phone = base.comp.lines.find((l) => l.key === "collab:Phone Room / Focus Booth")

    if (ws && ws.unitSF > 36) {
      const v = buildDeliverable(result, { workstations: 36 })
      out.push({
        id: "ws36",
        label: `Right-size workstations ${ws.unitSF} → 36 SF (6′ × 6′)`,
        save: g0 - v.totals.grossUsableSF,
        caution: "A bench-scale footprint. Pair it with generous focus rooms — this client's intake cited heads-down work.",
      })
    }
    if (off && off.unitSF > 120) {
      const v = buildDeliverable(result, { offices: 120 })
      out.push({
        id: "off120",
        label: `Office standard ${off.unitSF} → 120 SF (10′ × 12′)`,
        save: g0 - v.totals.grossUsableSF,
        caution: "Still a real office — but partners with 12′ × 12′ today will feel it. A second retained size for principals is the usual trade.",
      })
    }
    if (off && ws && off.proposedCount >= 6) {
      const v = buildDeliverable(result, {}, { offices: off.proposedCount - 6, workstations: ws.proposedCount + 6 })
      out.push({
        id: "convert6",
        label: `Convert 6 private offices to workstations`,
        save: g0 - v.totals.grossUsableSF,
        caution: "Six individual conversations, not a policy memo. The survey says who holds these offices — start with the roster.",
      })
    }
    // Seat sharing at a 3-day policy — the engine's own seat-demand model.
    if (ws) {
      const hc = base.future
      const remote = result.work.fullyRemote ?? 0
      const cur = getTotalSeatDemand(computeSeatDemandBlock(Math.min(5, Math.max(1, Math.round(result.work.daysInOffice))), hc, remote))
      const at3 = getTotalSeatDemand(computeSeatDemandBlock(3, hc, remote))
      const factor = cur > 0 ? at3 / cur : 1
      const newWs = Math.max(1, Math.ceil(ws.proposedCount * factor))
      if (newWs < ws.proposedCount) {
        // The engine's rule: at ≤3 days the phone-booth ratio tightens to 1:10
        // (vs 1:15 at five days) — the added booths are counted against the save.
        const boothsNeeded = Math.ceil(newWs / 10)
        const boothCount = Math.max(phone?.proposedCount ?? 0, boothsNeeded)
        const v = buildDeliverable(result, {}, {
          workstations: newWs,
          ...(phone ? { [phone.key]: boothCount } : {}),
        })
        out.push({
          id: "share3",
          label: `Seat sharing on a 3-day hybrid policy — ${ws.proposedCount} → ${newWs} desks`,
          save: g0 - v.totals.grossUsableSF,
          caution: "Only works if the policy holds: desk booking, day coordination, leadership modeling it. Without that, this is a seat shortage with good intentions.",
          engineNote: `Engine seat-demand model: attendance bands × desk-share ratios (1.0/0.6/0.4/0.2). Focus booths tighten to 1:10 at ≤3 days — ${phone ? boothCount - (phone.proposedCount ?? 0) : 0} added booth(s) already netted out of this number.`,
        })
      }
    }
    // Circulation discipline — manual: the deliverable's multipliers are fixed
    // 45/45/45/35; price a 5-point tightening on the non-support categories.
    const circSave = Math.round(base.categories.reduce((s, c) => (c.name === "Support" ? s : s + c.proposedNetSF * 0.05), 0))
    out.push({
      id: "circ40",
      label: "Circulation discipline 45% → 40% on individual + collab",
      save: circSave,
      caution: "Only honest on an efficient floor plate. Fit planning confirms this one — we don't promise it from a spreadsheet.",
    })
    return out.sort((a, b) => b.save - a.save)
  }, [base, result])

  const g0 = base.totals.grossUsableSF
  const savings = levers.filter((l) => active[l.id]).reduce((s, l) => s + l.save, 0)
  const adjusted = g0 - savings
  const maxSave = levers.reduce((s, l) => s + l.save, 0)
  const floor = g0 - maxSave
  const people = base.future
  const perPerson = Math.round(adjusted / people)
  const targetPerPerson = targetSF ? Math.round(targetSF / people) : null

  // ── The verdict — three honest states (plus "beyond compromise") ────────
  type Verdict = "none" | "spare" | "inline" | "compromise" | "beyond"
  const verdict: Verdict = !targetSF
    ? "none"
    : targetSF >= adjusted * 1.05
      ? "spare"
      : targetSF >= adjusted * 0.98
        ? "inline"
        : targetSF >= floor * 0.98
          ? "compromise"
          : "beyond"

  const V: Record<Exclude<Verdict, "none">, { color: string; bg: string; title: string; body: string }> = {
    spare: {
      color: "#047857", bg: "#ecfdf5",
      title: "Room to spare.",
      body: `Your target sits ${(targetSF! - adjusted).toLocaleString()} SF above the program your team's answers call for. Options: bank it as growth headroom (~${Math.max(0, Math.floor((targetSF! - adjusted) / Math.max(1, Math.round(adjusted / people))))} future seats), invest it in amenity, or take the smaller footprint and the savings.`,
    },
    inline: {
      color: "#0089a3", bg: "#e9f7fb",
      title: "In line.",
      body: "Your target and the ratio-backed program agree within a couple of percent. This is the comfortable verdict: the number your business needs is the number you're planning for.",
    },
    compromise: {
      color: "#b45309", bg: "#fffbeb",
      title: "Achievable — with named compromises.",
      body: "The gap below is closable, but not for free. Each lever is priced by the engine and carries its condition. Turn them on to see the path; what you won't trade tells us as much as what you will.",
    },
    beyond: {
      color: "#be123c", bg: "#fff1f2",
      title: "Below what we can recommend.",
      body: `Even with every lever pulled, the program bottoms out at ${floor.toLocaleString()} SF. Your target would push density past industry-recognized levels without the hybrid policy to support it. We'd rather show you this line than design past it.`,
    },
  }

  const shouldBe = g0

  return (
    <div className="min-h-screen bg-[#f3f7fa] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/lab" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> The Lab
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">0.4 · The target conversation — prototype</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Can we get {base.clientName} to their number?</h1>
        <p className="mt-2 max-w-3xl leading-relaxed text-slate-500">
          Four questions, answered together. The first three come from intake and the engine; the
          fourth is the one the product has never asked. Type a target below and watch the verdict.
        </p>

        {/* ── The four questions ──────────────────────────────────────────── */}
        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          <QCard n={1} icon={<Building2 className="h-4 w-4" />} q="What do you have today?">
            <p className="text-3xl font-bold tabular-nums">{base.totals.existingSF.toLocaleString()}<span className="ml-1 text-sm font-medium text-slate-400">SF</span></p>
            <p className="mt-1 text-xs text-slate-500">{Math.round(base.totals.existingSF / base.current)} SF / person today · from existing conditions</p>
          </QCard>
          <QCard n={2} icon={<CalendarDays className="h-4 w-4" />} q="How are you designing work?">
            <p className="text-3xl font-bold tabular-nums">{result.work.daysInOffice}<span className="ml-1 text-sm font-medium text-slate-400">days/wk</span></p>
            <p className="mt-1 text-xs text-slate-500">{result.work.fullyRemote} fully remote · {base.current} → {base.future} people · office-forward posture</p>
          </QCard>
          <QCard n={3} icon={<Gauge className="h-4 w-4" />} q="What should it be?">
            <p className="text-3xl font-bold tabular-nums text-[#0089a3]">{shouldBe.toLocaleString()}<span className="ml-1 text-sm font-medium text-slate-400">SF</span></p>
            <p className="mt-1 text-xs text-slate-500">the ratio-backed program — engine + your team&apos;s answers</p>
          </QCard>
          <QCard n={4} icon={<Target className="h-4 w-4" />} q="Can we achieve your target?" highlight>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="e.g. 12000"
                value={targetSF ?? ""}
                onChange={(e) => setTargetSF(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
                className="w-28 rounded-lg border border-[#00badc]/50 bg-white px-2.5 py-1.5 text-xl font-bold tabular-nums focus:border-[#00badc] focus:outline-none"
              />
              <span className="text-sm font-medium text-slate-400">SF</span>
            </div>
            <div className="mt-2 flex gap-1">
              {(["lease", "building", "budget"] as const).map((s) => (
                <button key={s} onClick={() => setSource(s)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${source === s ? "bg-[#0e1a2e] text-white" : "bg-slate-100 text-slate-500"}`}>
                  {s}
                </button>
              ))}
            </div>
          </QCard>
        </div>

        {/* ── The delta map ───────────────────────────────────────────────── */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">The delta map</h2>
            <p className="text-sm tabular-nums text-slate-500">
              {savings > 0 && <>adjusted program <span className="font-bold text-slate-900">{adjusted.toLocaleString()} SF</span> · </>}
              {targetSF ? (
                <>gap to target{" "}
                  <span className={`font-bold ${targetSF - adjusted >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {targetSF - adjusted >= 0 ? "+" : ""}{(targetSF - adjusted).toLocaleString()} SF
                  </span>
                </>
              ) : "set a target to see the gap"}
            </p>
          </div>
          <DeltaBar base={base} adjusted={adjusted} shouldBe={shouldBe} target={targetSF} />
          {/* density guardrail */}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-500">
            <span>program density: <b className="tabular-nums text-slate-800">{perPerson} SF/person</b></span>
            {targetPerPerson !== null && (
              <span>at your target: <b className={`tabular-nums ${targetPerPerson < 120 ? "text-rose-600" : "text-slate-800"}`}>{targetPerPerson} SF/person</b></span>
            )}
            <span className="text-slate-400">
              reference bands (illustrative — calibrate with NELSON benchmarks): &lt;120 high-density, needs policy support · 120–180 efficient hybrid · 180–250 moderate · &gt;250 generous
            </span>
          </div>
        </div>

        {/* ── The verdict ─────────────────────────────────────────────────── */}
        {verdict !== "none" && (
          <div className="mt-6 rounded-2xl border p-6" style={{ backgroundColor: V[verdict].bg, borderColor: `${V[verdict].color}44` }}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0" style={{ color: V[verdict].color }}>
                {verdict === "spare" ? <Sparkles className="h-5 w-5" /> : verdict === "inline" ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </span>
              <div>
                <h3 className="text-lg font-bold" style={{ color: V[verdict].color }}>{V[verdict].title}</h3>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-700">{V[verdict].body}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── The levers ──────────────────────────────────────────────────── */}
        <div className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold tracking-tight">
              {verdict === "compromise" || verdict === "beyond" ? "What it takes to get there" : "The levers — priced, in case you need them"}
            </h2>
            {savings > 0 && (
              <button onClick={() => setActive({})} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900">
                <Undo2 className="h-3 w-3" /> reset levers
              </button>
            )}
          </div>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Every number below is the engine re-running the whole program — not a rule of thumb.
            Every lever carries its condition; agreeing to the number means agreeing to the condition.
          </p>
          <div className="mt-4 space-y-3">
            {levers.map((l) => {
              const on = !!active[l.id]
              return (
                <button
                  key={l.id}
                  onClick={() => setActive((p) => ({ ...p, [l.id]: !on }))}
                  className={`block w-full rounded-2xl border p-4 text-left transition-colors ${on ? "border-[#00badc] bg-[#e9f7fb]/60" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-3">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? "border-[#00badc] bg-[#00badc] text-white" : "border-slate-300 bg-white"}`}>
                        {on && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="font-semibold">{l.label}</span>
                    </span>
                    <span className="shrink-0 text-lg font-bold tabular-nums text-[#0089a3]">−{l.save.toLocaleString()} SF</span>
                  </div>
                  <p className="mt-2 pl-8 text-xs leading-relaxed text-slate-500">
                    <span className="font-semibold text-amber-600">The condition: </span>{l.caution}
                  </p>
                  {l.engineNote && (
                    <p className="mt-1 pl-8 text-[11px] leading-relaxed text-slate-400">
                      <ChevronRight className="mr-0.5 inline h-3 w-3" />{l.engineNote}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
          <p className="mt-4 text-xs text-slate-400">
            All levers on: the program bottoms out at <b className="tabular-nums">{floor.toLocaleString()} SF</b>{" "}
            ({Math.round(floor / people)} SF/person). Below that line, we say so instead of designing past it.
          </p>
        </div>
      </main>
    </div>
  )
}

/* ── pieces ─────────────────────────────────────────────────────────────── */

function QCard({ n, icon, q, highlight, children }: { n: number; icon: React.ReactNode; q: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? "border-[#00badc]/60 bg-white shadow-[0_0_0_3px_rgba(0,186,220,0.12)]" : "border-slate-200 bg-white"}`}>
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${highlight ? "bg-[#00badc] text-white" : "bg-slate-100 text-slate-500"}`}>{n}</span>
        {icon} {q}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function DeltaBar({
  base, adjusted, shouldBe, target,
}: {
  base: ReturnType<typeof buildDeliverable>
  adjusted: number
  shouldBe: number
  target: number | null
}) {
  const max = Math.max(adjusted, shouldBe, target ?? 0) * 1.08
  const pct = (v: number) => `${(v / max) * 100}%`
  const scale = adjusted / shouldBe
  return (
    <div className="mt-6">
      <div className="relative h-10">
        {/* stacked categories, scaled to the adjusted program */}
        <div className="absolute inset-y-1 left-0 flex gap-[2px] overflow-hidden rounded-lg" style={{ width: pct(adjusted) }}>
          {base.categories.filter((c) => c.proposedTotalSF > 0).map((c) => (
            <span
              key={c.name}
              title={`${c.name} · ~${Math.round(c.proposedTotalSF * scale).toLocaleString()} SF`}
              className="h-full"
              style={{ width: `${(c.proposedTotalSF / shouldBe) * 100}%`, backgroundColor: CATEGORY_COLORS[c.name].accent }}
            />
          ))}
        </div>
        {/* should-be tick (when levers moved the program) */}
        {adjusted !== shouldBe && (
          <Tick x={pct(shouldBe)} color="#94a3b8" label={`ratios say ${shouldBe.toLocaleString()}`} below />
        )}
        {/* target tick */}
        {target !== null && target > 0 && (
          <Tick x={pct(target)} color="#0e1a2e" label={`your target ${target.toLocaleString()}`} />
        )}
      </div>
      <div className="mt-8 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-500">
        {base.categories.map((c) => (
          <span key={c.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: CATEGORY_COLORS[c.name].accent }} />
            {c.name}
          </span>
        ))}
      </div>
    </div>
  )
}

function Tick({ x, color, label, below }: { x: string; color: string; label: string; below?: boolean }) {
  return (
    <div className="absolute inset-y-0" style={{ left: x }}>
      <div className="absolute -inset-y-1 w-[2.5px] -translate-x-1/2 rounded-full" style={{ backgroundColor: color }} />
      <span
        className={`absolute left-1/2 w-max -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${below ? "top-full mt-2" : "bottom-full mb-2"}`}
        style={{ backgroundColor: color }}
      >
        {label}
      </span>
    </div>
  )
}
