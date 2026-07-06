"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { ArrowRight, TrendingUp, TrendingDown, Minus, Building2, Users, Presentation, Box } from "lucide-react"
import { loadSurveySeed, saveSurveySeed } from "@/lib/survey/seedStorage"
import { buildComparison, defaultCompInputs, lineSF, type Comparison, type CompCategory, type CompInputs } from "@/lib/survey/comparison"
import { DEMO_SCENARIOS } from "@/lib/survey/demo-scenarios"
import type { SurveyResult } from "@/lib/survey/types"

const CAT_ICON: Record<CompCategory, typeof Users> = {
  Workstations: Users, Offices: Building2, Collaboration: Presentation, Support: Box,
}

export default function ReviewPage() {
  const [result, setResult] = useState<SurveyResult | null>(null)
  const [inputs, setInputs] = useState<CompInputs | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [sizes, setSizes] = useState<Record<string, number>>({})

  const load = (r: SurveyResult) => { setResult(r); setInputs(defaultCompInputs(r)); setCounts({}); setSizes({}) }

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("demo")
    if (key && DEMO_SCENARIOS[key]) load(DEMO_SCENARIOS[key].result)
    else load(loadSurveySeed() ?? DEMO_SCENARIOS.tech.result)
  }, [])

  const comp = useMemo<Comparison | null>(
    () => (result && inputs ? buildComparison(result, inputs) : null),
    [result, inputs],
  )

  if (!comp || !inputs) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0b1830] text-white/60">Loading your program…</div>
  }

  const setInput = (p: Partial<CompInputs>) => setInputs((prev) => (prev ? { ...prev, ...p } : prev))
  const propCount = (key: string, base: number) => counts[key] ?? base
  const unitSF = (key: string, base: number) => sizes[key] ?? base

  const lines = [...comp.lines].sort(
    (a, b) => Math.abs((b.proposedCount - b.existingCount) * b.unitSF) - Math.abs((a.proposedCount - a.existingCount) * a.unitSF),
  )
  const existingTotal = comp.lines.reduce((s, l) => s + lineSF(l, l.existingCount), 0)
  const proposedTotal = comp.lines.reduce((s, l) => s + propCount(l.key, l.proposedCount) * unitSF(l.key, l.unitSF), 0)

  const openCanvas = () => { if (result) saveSurveySeed(result); window.location.href = "/" }

  return (
    <div className="min-h-screen bg-[#0b1830] bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(0,186,220,0.10),transparent)] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b1830]/85 px-6 py-4 backdrop-blur-md lg:px-10">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
          <Image src="/nelson-logo.png" alt="NELSON" width={104} height={28} className="h-6 w-auto brightness-0 invert" priority />
          <div className="flex items-center gap-2">
            <span className="mr-1 text-[11px] uppercase tracking-wide text-white/35">Demo</span>
            {Object.entries(DEMO_SCENARIOS).map(([key, s]) => (
              <button key={key} type="button" onClick={() => load(s.result)} title={s.blurb}
                className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/60 transition-colors hover:border-[#00badc]/50 hover:text-white">
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-6 py-10 lg:px-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#00badc]">{comp.clientName}</p>
        <h1 className="mt-2 max-w-4xl text-4xl font-bold tracking-tight">
          Here&apos;s what you have today, next to what we&apos;d suggest.
        </h1>

        {/* Live decision points — adjust and the engine re-runs the whole program */}
        <div className="mt-6 rounded-2xl border border-[#00badc]/25 bg-[#00badc]/[0.05] p-6">
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-3 text-lg leading-relaxed text-white/80">
            You&apos;re planning for
            <InlineNum value={inputs.future} min={1} max={5000} step={5} onChange={(n) => setInput({ future: n })} />
            people (from <Strong>{inputs.current}</Strong> today). With a
            <InlineNum value={inputs.daysInOffice} min={1} max={5} suffix="-day" onChange={(n) => setInput({ daysInOffice: n })} />
            in-office week and
            <InlineNum value={inputs.fullyRemote} min={0} max={inputs.future} onChange={(n) => setInput({ fullyRemote: n })} />
            fully remote, industry ratios suggest the program below. Slide any of these and watch it update.
          </p>
        </div>

        {/* Totals */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TotalCard label="Existing today" value={existingTotal} tone="muted" />
          <TotalCard label="Proposed program" value={proposedTotal} tone="cyan" />
          <DeltaCard existing={existingTotal} proposed={proposedTotal} />
        </div>

        {/* Line-by-line */}
        <div className="mt-8 space-y-2.5">
          <div className="mb-2 grid grid-cols-[1fr_96px_300px_104px] items-center gap-5 px-5 text-xs font-medium uppercase tracking-wide text-white/35">
            <span>Space</span>
            <span className="text-center">Existing</span>
            <span className="text-center">Proposed (count × size)</span>
            <span className="text-right">Difference</span>
          </div>
          {lines.map((l) => {
            const Icon = CAT_ICON[l.category]
            const cnt = propCount(l.key, l.proposedCount)
            const sf = unitSF(l.key, l.unitSF)
            const dCount = cnt - l.existingCount
            const dSF = cnt * sf - l.existingCount * l.unitSF
            return (
              <div key={l.key} className="grid grid-cols-[1fr_96px_300px_104px] items-center gap-5 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/55"><Icon className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold text-white">{l.label}</div>
                    <div className="text-xs text-white/40">{l.category}</div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-sm font-semibold text-white/70 tabular-nums">{l.existingCount}</div>
                  <div className="text-[11px] text-white/35 tabular-nums">{lineSF(l, l.existingCount).toLocaleString()} SF</div>
                </div>

                {/* count × size */}
                <div className="flex items-center justify-center gap-2">
                  <MiniStepper value={cnt} onChange={(n) => setCounts((p) => ({ ...p, [l.key]: Math.max(0, n) }))} />
                  <span className="text-white/30">×</span>
                  <MiniStepper value={sf} step={5} unit="SF" onChange={(n) => setSizes((p) => ({ ...p, [l.key]: Math.max(0, n) }))} />
                  <span className="w-20 text-right text-[11px] font-medium tabular-nums text-[#00badc]/85">= {(cnt * sf).toLocaleString()} SF</span>
                </div>

                <div className="text-right"><DeltaPill dCount={dCount} dSF={dSF} /></div>
              </div>
            )
          })}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <p className="max-w-xl text-sm text-white/50">
            Adjust counts and sizes line by line — the difference column tracks each against what you have today.
            Open the canvas to go deeper.
          </p>
          <button onClick={openCanvas} className="inline-flex items-center gap-2 rounded-xl bg-[#00badc] px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#2fd0ee]">
            Open in Advanced Canvas <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </main>
    </div>
  )
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-white">{children}</span>
}

function InlineNum({ value, onChange, min = 0, max = 9999, step = 1, suffix }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; suffix?: string
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n))
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-[#00badc]/50 bg-[#00badc]/10 px-1 py-0.5 align-middle">
      <button type="button" onClick={() => onChange(clamp(value - step))} className="flex h-6 w-6 items-center justify-center rounded text-[#00badc] hover:bg-[#00badc]/20">−</button>
      <span className="min-w-[2ch] px-1 text-center text-lg font-bold tabular-nums text-white">{value}{suffix}</span>
      <button type="button" onClick={() => onChange(clamp(value + step))} className="flex h-6 w-6 items-center justify-center rounded text-[#00badc] hover:bg-[#00badc]/20">+</button>
    </span>
  )
}

function MiniStepper({ value, onChange, step = 1, unit }: { value: number; onChange: (n: number) => void; step?: number; unit?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" onClick={() => onChange(value - step)} className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.06] text-white/70 hover:bg-white/12">−</button>
      <span className="w-11 text-center text-sm font-bold tabular-nums text-white">{value.toLocaleString()}{unit ? <span className="ml-0.5 text-[10px] font-medium text-white/40">{unit}</span> : ""}</span>
      <button type="button" onClick={() => onChange(value + step)} className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.06] text-white/70 hover:bg-white/12">+</button>
    </span>
  )
}

function TotalCard({ label, value, tone }: { label: string; value: number; tone: "muted" | "cyan" }) {
  return (
    <div className={`rounded-2xl border p-5 ${tone === "cyan" ? "border-[#00badc]/30 bg-[#00badc]/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-white/45">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums text-white">{Math.round(value).toLocaleString()} <span className="text-base font-medium text-white/45">SF</span></div>
    </div>
  )
}

function DeltaCard({ existing, proposed }: { existing: number; proposed: number }) {
  const d = proposed - existing
  const pct = existing > 0 ? Math.round((d / existing) * 100) : 0
  const up = d > 0
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-white/45">Difference</div>
      <div className={`mt-1 flex items-center gap-2 text-3xl font-bold tabular-nums ${up ? "text-emerald-400" : d < 0 ? "text-amber-400" : "text-white"}`}>
        {up ? <TrendingUp className="h-6 w-6" /> : d < 0 ? <TrendingDown className="h-6 w-6" /> : <Minus className="h-6 w-6" />}
        {d > 0 ? "+" : ""}{Math.round(d).toLocaleString()} <span className="text-base font-medium text-white/45">SF{existing > 0 ? ` · ${pct > 0 ? "+" : ""}${pct}%` : ""}</span>
      </div>
    </div>
  )
}

function DeltaPill({ dCount, dSF }: { dCount: number; dSF: number }) {
  if (dCount === 0 && Math.round(dSF) === 0) return <span className="text-xs text-white/30">no change</span>
  const up = dSF > 0
  return (
    <div className={`inline-flex flex-col items-end ${up ? "text-emerald-400" : "text-amber-400"}`}>
      <span className="text-sm font-semibold tabular-nums">{dCount > 0 ? "+" : ""}{dCount}</span>
      <span className="text-[11px] tabular-nums opacity-80">{dSF > 0 ? "+" : ""}{Math.round(dSF).toLocaleString()} SF</span>
    </div>
  )
}
