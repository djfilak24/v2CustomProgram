"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  TrendingUp, TrendingDown, Minus, Building2, Users, Presentation, Box,
  Crown, AlertTriangle, LayoutDashboard, ListChecks, GitCompareArrows, Sun, Moon, Network, Wrench, FileDown,
} from "lucide-react"
import { loadSurveySeed, saveSurveySeed } from "@/lib/survey/seedStorage"
import {
  buildComparison, defaultCompInputs, lineSF, lineGaps, spaceStrategy,
  type Comparison, type CompCategory, type CompInputs,
} from "@/lib/survey/comparison"
import { CATEGORY_COLORS, DEFAULT_FACTORS } from "@/lib/survey/deliverable"
import { DEMO_SCENARIOS, demoResult } from "@/lib/survey/demo-scenarios"
import {
  surveyStateFromResult, computeProfile, SURVEY_STEPS,
  GOAL_MOTIVATORS, SPACE_POSTURES, OFFICE_PLACEMENT_OPTIONS,
} from "@/lib/survey/sections"
import { WorkplaceProfile } from "@/components/survey/workplace-profile"
import { buildProgramMap, MAP_DEPT_COLORS } from "@/lib/survey/programMap"
import { ProgramMapView } from "@/components/survey/program-map"
import { PrintReport } from "@/components/survey/print-report"
import { exportProgramXlsx, exportIntakeWorkbook } from "@/lib/survey/excelExport"
import { isNelsonMode } from "@/lib/nelsonMode"
import type { SurveyResult } from "@/lib/survey/types"

const CAT_ICON: Record<CompCategory, typeof Users> = {
  Workstations: Users, Offices: Building2, Collaboration: Presentation, Support: Box,
}
const CATS: CompCategory[] = ["Workstations", "Offices", "Collaboration", "Support"]

const labelOf = (list: { id: string; label: string }[], id?: string | null) =>
  list.find((o) => o.id === id)?.label ?? id ?? ""
const PLACEMENT_BLURB: Record<string, string> = {
  exterior: "Offices ring the perimeter (on the glass)", interior: "Offices interior — glass stays open",
  mixed: "A mix of perimeter and interior",
}

type Tab = "dashboard" | "map" | "responses" | "validation"

export default function ReviewPage() {
  const [result, setResult] = useState<SurveyResult | null>(null)
  const [inputs, setInputs] = useState<CompInputs | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [sizes, setSizes] = useState<Record<string, number>>({})
  const [tab, setTab] = useState<Tab>("dashboard")
  const [showGaps, setShowGaps] = useState(true)
  // Presenter chrome (demo chips, canvas wrench) is NELSON-only.
  const [nelson, setNelson] = useState(false)
  // A real client session (opened from the console/command center) shows NO
  // demo chrome — a designer mid-engagement never sees override buttons.
  const [seedToken, setSeedToken] = useState<string | null>(null)
  useEffect(() => { setNelson(isNelsonMode()) }, [])

  const load = (r: SurveyResult) => {
    setResult(r); setInputs(defaultCompInputs(r)); setCounts({}); setSizes({})
    // Switching to a demo leaves client-session mode explicitly.
    try { localStorage.removeItem("nelson:seedSource") } catch { /* fine */ }
    setSeedToken(null)
  }

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("demo")
    if (key && DEMO_SCENARIOS[key]) { load(demoResult(key) ?? DEMO_SCENARIOS[key].result); return }
    const seed = loadSurveySeed()
    if (seed) {
      setResult(seed); setInputs(defaultCompInputs(seed)); setCounts({}); setSizes({})
      try { setSeedToken(localStorage.getItem("nelson:seedSource")) } catch { /* fine */ }
      return
    }
    load(demoResult("tech") ?? DEMO_SCENARIOS.tech.result)
  }, [])

  const comp = useMemo<Comparison | null>(
    () => (result && inputs ? buildComparison(result, inputs) : null),
    [result, inputs],
  )
  const profile = useMemo(
    () => (result ? computeProfile(surveyStateFromResult(result)) : null),
    [result],
  )
  const programMap = useMemo(
    () => (result && comp ? buildProgramMap(result, comp.lines) : null),
    [result, comp],
  )

  if (!comp || !inputs || !result || !profile) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f3f7fa] text-slate-600">Loading your program…</div>
  }

  const setInput = (p: Partial<CompInputs>) => setInputs((prev) => (prev ? { ...prev, ...p } : prev))
  const propCount = (key: string, base: number) => counts[key] ?? base
  const unitSF = (key: string, base: number) => sizes[key] ?? base

  const lines = [...comp.lines].sort(
    (a, b) => Math.abs((b.proposedCount - b.existingCount) * b.unitSF) - Math.abs((a.proposedCount - a.existingCount) * a.unitSF),
  )
  const existingTotal = comp.lines.reduce((s, l) => s + lineSF(l, l.existingCount), 0)
  // ONE math, everywhere: the review speaks the same number as the deck and
  // the Studio — gross usable (net + category circulation). A net figure here
  // once read 5,700 SF apart from the deliverable for the same program.
  const circFor = (cat: CompCategory) =>
    cat === "Support" ? DEFAULT_FACTORS.circSupport : cat === "Collaboration" ? DEFAULT_FACTORS.circCollab : DEFAULT_FACTORS.circIndividual
  const catTotals = CATS.map((cat) => {
    const ls = comp.lines.filter((l) => l.category === cat)
    const net = ls.reduce((s, l) => s + propCount(l.key, l.proposedCount) * unitSF(l.key, l.unitSF), 0)
    return {
      cat,
      existing: ls.reduce((s, l) => s + lineSF(l, l.existingCount), 0),
      proposed: net + Math.round(net * circFor(cat)),
    }
  })
  const proposedTotal = catTotals.reduce((s, c) => s + c.proposed, 0)
  const strategy = spaceStrategy(existingTotal, proposedTotal, result.goals)
  const gapCount = comp.lines.reduce((s, l) => s + lineGaps(l).length, 0)

  const openCanvas = () => { if (result) saveSurveySeed(result); window.location.href = "/canvas" }

  const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "map", label: "Program map", icon: Network },
    { id: "responses", label: "Detailed responses", icon: ListChecks },
    { id: "validation", label: "Recommended program", icon: GitCompareArrows },
  ]

  return (
    <>
    <PrintReport
      result={result} comp={comp} lines={lines}
      existingTotal={existingTotal} proposedTotal={proposedTotal} catTotals={catTotals}
    />
    <div className="min-h-screen bg-[#f3f7fa] bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(0,186,220,0.10),transparent)] text-slate-900 print:hidden">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 px-6 py-4 backdrop-blur-md lg:px-10">
        <div className="mx-auto flex max-w-[2000px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Image src="/nelson-logo.png" alt="NELSON" width={104} height={28} className="h-6 w-auto" priority />
            <span className="hidden text-sm text-slate-400 sm:inline">·</span>
            <span className="hidden text-sm font-medium text-slate-600 sm:inline">{comp.clientName}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Demo chrome only when this is NOT a real client session. */}
            {nelson && !seedToken && (<>
            <span className="mr-1 text-[11px] uppercase tracking-wide text-slate-400">Demo</span>
            {Object.entries(DEMO_SCENARIOS).map(([key, s]) => (
              <button key={key} type="button" onClick={() => load(demoResult(key) ?? s.result)} title={s.blurb}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-[#00badc]/50 hover:text-slate-900">
                {s.label}
              </button>
            ))}
            </>)}
            {seedToken && (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  Client session
                </span>
                <a
                  href={`/command/${seedToken}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400"
                >
                  Command Center
                </a>
              </>
            )}
            {nelson && (
              <a
                href="/studio"
                title="The Studio — where the live session happens"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0e1a2e] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
              >
                Studio
              </a>
            )}
            {/* The leave-behinds — named for what they are */}
            <button
              type="button"
              onClick={() => window.print()}
              title="A branded, paginated report of this review — print or save as PDF"
              className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-[#00badc]/45 bg-[#00badc]/10 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-[#00badc]/20"
            >
              <FileDown className="h-3.5 w-3.5 text-[#0089a3]" /> Print report
            </button>
            <button
              type="button"
              onClick={() => exportProgramXlsx(result, comp, lines, { existing: existingTotal, proposed: proposedTotal })}
              title="The PROGRAM as a spreadsheet — every space sized, existing vs proposed. Send after the session."
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#00badc]/45 bg-[#00badc]/10 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-[#00badc]/20"
            >
              <FileDown className="h-3.5 w-3.5 text-[#0089a3]" /> Program (Excel)
            </button>
            <button
              type="button"
              onClick={() => exportIntakeWorkbook(result)}
              title="The INTAKE workbook — every question pre-filled with their answers, ready to circulate for corrections and return"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              <FileDown className="h-3.5 w-3.5" /> Intake workbook
            </button>
            <a
              href={`/workbook-guide${comp.clientName ? `?client=${encodeURIComponent(comp.clientName)}` : ""}`}
              target="_blank"
              rel="noreferrer"
              title="The send-along guide — what the workbook is, why they got it, what to do. Save as PDF and send both together."
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              Guide
            </a>
            {/* NELSON-only: the legacy canvas is our tool, never a client affordance. */}
            {nelson && !seedToken && (
            <button
              type="button"
              onClick={openCanvas}
              title="NELSON only — open this program in the legacy Advanced Canvas"
              className="ml-2 flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600"
            >
              <Wrench className="h-3.5 w-3.5" />
            </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="mx-auto mt-4 flex max-w-[2000px] items-center gap-1">
          {TABS.map((t) => {
            const on = tab === t.id
            const Icon = t.icon
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  on ? "border-[#00badc] text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}>
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            )
          })}
        </div>
      </header>

      <main className="mx-auto max-w-[2000px] px-6 py-8 lg:px-10">
        {tab === "dashboard" && (
          <DashboardTab
            comp={comp} result={result} profile={profile} strategy={strategy}
            existingTotal={existingTotal} proposedTotal={proposedTotal} catTotals={catTotals}
            gapCount={gapCount} onOpenValidation={() => { setShowGaps(true); setTab("validation") }}
            onOpenMap={() => setTab("map")}
          />
        )}
        {tab === "map" && programMap && (
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Your program, on the whiteboard.</h1>
              <p className="mt-1.5 text-slate-500">
                Teams as clusters, spaces sized by square footage, named offices, and your adjacency
                priorities pulling neighborhoods together. The shared program sits in the middle.
              </p>
            </div>
            <ProgramMapView map={programMap} />
          </div>
        )}
        {tab === "responses" && <ResponsesTab result={result} />}
        {tab === "validation" && (
          <ValidationTab
            comp={comp} inputs={inputs} setInput={setInput} lines={lines}
            existingTotal={existingTotal} proposedTotal={proposedTotal} strategy={strategy}
            counts={counts} sizes={sizes} setCounts={setCounts} setSizes={setSizes}
            propCount={propCount} unitSF={unitSF} showGaps={showGaps} setShowGaps={setShowGaps} gapCount={gapCount}
          />
        )}

        <div className="mt-10 border-t border-slate-200 pt-6">
          <p className="max-w-2xl text-sm text-slate-500">
            {tab === "validation"
              ? "Adjust counts and sizes line by line — the difference column tracks each against today. Toggle gaps to see what's missing."
              : tab === "map"
                ? "This is the conversation piece — walk it team by team, then confirm the numbers on the Recommended program tab."
                : "Walk the dashboard, see it on the whiteboard, then dig into responses and the recommended program."}
          </p>
        </div>
      </main>
    </div>
    </>
  )
}

/* ── Dashboard tab ──────────────────────────────────────────────────────────── */

function DashboardTab({
  comp, result, profile, strategy, existingTotal, proposedTotal, catTotals, gapCount, onOpenValidation, onOpenMap,
}: {
  comp: Comparison; result: SurveyResult; profile: ReturnType<typeof computeProfile>
  strategy: ReturnType<typeof spaceStrategy>; existingTotal: number; proposedTotal: number
  catTotals: { cat: CompCategory; existing: number; proposed: number }[]
  gapCount: number; onOpenValidation: () => void; onOpenMap: () => void
}) {
  const motivators = result.goals?.motivators ?? []
  const growthPct = result.people.companyGrowthPct
  const stepTitle = (id: string) => SURVEY_STEPS.find((s) => s.id === id)?.title ?? id
  const confirmLive: string[] = [
    ...result.deferred.map(stepTitle),
    ...(result.work.daysUnsureDepts?.length
      ? [`In-office cadence: ${result.work.daysUnsureDepts.join(", ")}`]
      : []),
  ]

  const delta = proposedTotal - existingTotal
  const deltaPct = existingTotal > 0 ? Math.round((delta / existingTotal) * 100) : 0
  const up = delta > 0

  // Declared seat posture — where the people they described actually sit today.
  const depts = result.people.departments
  const headcount = result.people.totalHeadcount
  const seatOffices = depts.reduce((s, d) => s + (result.spaces.privateOfficesByDept[d.id] ?? 0), 0)
  const seatDedicated = depts.reduce((s, d) => s + (result.work.dedicatedByDept?.[d.id] ?? 0), 0)
  const seatRemote = comp.fullyRemote
  const seatFlex = Math.max(0, headcount - seatOffices - seatDedicated - seatRemote)
  const seatSegs = [
    { label: "Private offices", n: seatOffices, cls: "bg-[#2563eb]" },
    { label: "Dedicated desks", n: seatDedicated, cls: "bg-[#00badc]" },
    { label: "Flexible / shared", n: seatFlex, cls: "bg-slate-300" },
    { label: "Fully remote", n: seatRemote, cls: "bg-slate-200" },
  ].filter((s) => s.n > 0)

  return (
    <div className="space-y-6">
      {/* ── The verdict — the number, the delta, and the why, first ─────────── */}
      <div className="grid gap-6 rounded-2xl border border-[#00badc]/25 bg-[#00badc]/[0.04] p-7 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#0089a3]">{comp.clientName} · your program</p>
          <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
            <span className="text-6xl font-bold tabular-nums leading-none tracking-tight">
              {Math.round(proposedTotal).toLocaleString()}
              <span className="ml-2 text-2xl font-medium text-slate-500">SF usable</span>
            </span>
            <span className={`mb-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${
              up ? "bg-emerald-100 text-emerald-700" : delta < 0 ? "bg-amber-100 text-amber-500" : "bg-slate-100 text-slate-600"
            }`}>
              {up ? <TrendingUp className="h-4 w-4" /> : delta < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              {up ? "+" : ""}{Math.round(delta).toLocaleString()} SF vs today{existingTotal > 0 ? ` · ${deltaPct > 0 ? "+" : ""}${deltaPct}%` : ""}
            </span>
          </div>
          <div className="mt-4 max-w-2xl">
            <p className="text-base font-semibold text-slate-900">{strategy.headline}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{strategy.note}</p>
          </div>
        </div>

        {/* Quiet context — the inputs behind the number */}
        <div className="flex flex-col justify-center gap-3 border-slate-200 text-sm lg:border-l lg:pl-7">
          <ContextRow label="People" value={<><Strong>{comp.current}</Strong> → <Strong>{comp.future}</Strong>{growthPct ? <span className="text-slate-500"> · {growthPct}% growth</span> : null}</>} />
          <ContextRow label="Rhythm" value={<><Strong>{comp.daysInOffice}</Strong> days/wk in office · <Strong>{comp.fullyRemote}</Strong> fully remote</>} />
          <ContextRow label="Today" value={<><Strong>{Math.round(existingTotal).toLocaleString()}</Strong> SF existing</>} />
          {(motivators.length > 0 || result.goals?.posture) && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {motivators.map((m) => (
                <span key={m} className="rounded-full border border-[#00badc]/35 bg-[#00badc]/[0.08] px-2.5 py-0.5 text-xs font-medium text-slate-800">
                  {labelOf(GOAL_MOTIVATORS, m)}
                </span>
              ))}
              {result.goals?.posture && (
                <span className="rounded-full border border-amber-400/70 bg-amber-100/70 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  {labelOf(SPACE_POSTURES, result.goals.posture)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Seat posture + live-session strip, side by side ─────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {seatSegs.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Where your {headcount} people sit</h3>
              <span className="text-[11px] text-slate-400">as you described it</span>
            </div>
            <div className="flex h-3.5 overflow-hidden rounded-full bg-slate-100/80">
              {seatSegs.map((s) => (
                <div key={s.label} className={`${s.cls} transition-all`} style={{ width: `${(s.n / Math.max(1, headcount)) * 100}%` }} title={`${s.n} ${s.label.toLowerCase()}`} />
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
              {seatSegs.map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${s.cls}`} />
                  <span className="font-bold tabular-nums text-slate-900">{s.n}</span>
                  <span className="text-slate-500">{s.label.toLowerCase()}</span>
                </span>
              ))}
            </div>
          </div>
        ) : <div />}

        {(confirmLive.length > 0 || gapCount > 0) && (
          <div className="rounded-2xl border border-amber-300/70 bg-amber-50 p-5">
            <div className="mb-2.5 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium uppercase tracking-wide text-amber-700">For the live session</span>
            </div>
            {confirmLive.length > 0 && (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {confirmLive.map((t) => (
                  <span key={t} className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs text-slate-700">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {gapCount > 0 && (
              <button
                type="button"
                onClick={onOpenValidation}
                className="w-full rounded-lg border border-amber-400/70 bg-amber-100/70 px-3 py-2 text-left text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
              >
                {confirmLive.length === 0 ? "Everything answered — " : ""}{gapCount} program detail{gapCount === 1 ? "" : "s"} to confirm together →
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {/* Where the space goes — one glanceable row per category (the founder's
              dashboard brief: less bar-chart real estate, more signal). One
              allocation bar up top, then category rows in the Studio's color
              language: proposed as the fill, today as the dark tick. */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">Where the space goes</h3>
              <span className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-3 w-[2.5px] rounded bg-slate-700" /> today</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-[#00badc]" /> proposed</span>
              </span>
            </div>
            {(() => {
              const target = result.goals?.targetSF
              const maxTotal = Math.max(proposedTotal, target ?? 0) || 1
              return (
                <div className="relative mb-4">
                  <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" style={{ width: `${(proposedTotal / maxTotal) * 100}%` }}>
                    {catTotals.filter((c) => c.proposed > 0).map(({ cat, proposed }) => (
                      <span key={cat} title={`${cat} · ${Math.round(proposed).toLocaleString()} SF`} style={{ width: `${(proposed / proposedTotal) * 100}%`, backgroundColor: CATEGORY_COLORS[cat].accent }} />
                    ))}
                  </div>
                  {target ? (
                    <span title={`Their number · ${target.toLocaleString()} SF`} className="absolute -inset-y-1 w-[2.5px] rounded-full bg-[#0e1a2e]" style={{ left: `${Math.min(99.5, (target / maxTotal) * 100)}%` }} />
                  ) : null}
                </div>
              )
            })()}
            <div className="space-y-2.5">
              {catTotals.map(({ cat, existing, proposed }) => {
                const max = Math.max(1, ...catTotals.flatMap((c) => [c.existing, c.proposed]))
                const d = proposed - existing
                const Icon = CAT_ICON[cat]
                const cc = CATEGORY_COLORS[cat]
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="flex w-36 shrink-0 items-center gap-2 text-sm text-slate-700">
                      <Icon className="h-4 w-4" style={{ color: cc.accent }} /> {cat}
                    </span>
                    <div className="relative h-2.5 flex-1 rounded-full bg-slate-100">
                      <div className="h-2.5 rounded-full" style={{ width: `${(proposed / max) * 100}%`, backgroundColor: cc.accent }} />
                      {existing > 0 && (
                        <span className="absolute -inset-y-0.5 w-[2.5px] rounded-full bg-slate-700" style={{ left: `${Math.min(99.5, (existing / max) * 100)}%` }} title={`today ${Math.round(existing).toLocaleString()} SF`} />
                      )}
                    </div>
                    <span className="w-32 shrink-0 text-right text-[12px] tabular-nums text-slate-500">
                      {Math.round(existing).toLocaleString()} → <b className="text-slate-900">{Math.round(proposed).toLocaleString()}</b>
                    </span>
                    <span className={`w-20 shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold tabular-nums ${
                      d > 0 ? "bg-emerald-50 text-emerald-700" : d < 0 ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-400"
                    }`}>
                      {d === 0 ? "—" : `${d > 0 ? "+" : ""}${Math.round(d).toLocaleString()}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Departments — the shape of the org, today → future */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">Your teams</h3>
              <button type="button" onClick={onOpenMap} className="text-xs font-medium text-[#0089a3]/85 transition-colors hover:text-[#0089a3]">
                see them on the Program map →
              </button>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {depts.map((d, i) => {
                const fut = d.futureHeadcount ?? d.headcount
                const dd = fut - d.headcount
                return (
                  <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: MAP_DEPT_COLORS[i % MAP_DEPT_COLORS.length] }} />
                      <span className="truncate text-sm font-medium text-slate-900">{d.name}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-sm tabular-nums">
                      <span className="text-slate-500">{d.headcount}</span>
                      <span className="text-slate-300">→</span>
                      <span className="font-semibold text-slate-900">{fut}</span>
                      {dd !== 0 && (
                        dd > 0
                          ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                          : <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right rail: who they are — starts high, alongside the money chart */}
        <div>
          <WorkplaceProfile scores={profile} />
        </div>
      </div>
    </div>
  )
}

function ContextRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-14 shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  )
}

/* ── Detailed responses tab ─────────────────────────────────────────────────── */

function ResponsesTab({ result }: { result: SurveyResult }) {
  const ex = result.existing ?? {}
  const placement = result.spaces.officePlacement
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Everything you told us</h1>

      <Section title="People & growth">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-4 font-medium">Department</th>
                <th className="pb-2 pr-4 font-medium">Today</th>
                <th className="pb-2 pr-4 font-medium">3–5 yr</th>
                <th className="pb-2 font-medium">Named roster</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.people.departments.map((d) => {
                const roster = [...(d.employees ?? [])].sort((a, b) => Number(!!b.isLeader) - Number(!!a.isLeader))
                return (
                  <tr key={d.id} className="align-top">
                    <td className="py-2.5 pr-4 font-medium text-slate-900">{d.name}</td>
                    <td className="py-2.5 pr-4 tabular-nums text-slate-600">{d.headcount}</td>
                    <td className="py-2.5 pr-4 tabular-nums text-slate-600">{d.futureHeadcount ?? d.headcount}</td>
                    <td className="py-2.5">
                      {roster.length === 0 ? <span className="text-slate-400">—</span> : (
                        <div className="flex flex-wrap gap-1">
                          {roster.map((p) => (
                            <span key={p.id} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${p.isLeader ? "border-amber-400/70 bg-amber-100/70 text-amber-700 font-medium" : "border-slate-200 bg-white text-slate-600"}`}>
                              {p.isLeader && <Crown className="h-2.5 w-2.5" />}{p.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {(result.goals?.motivators?.length || result.goals?.posture) && (
        <Section title="Goals & motivators">
          <div className="flex flex-wrap gap-2">
            {(result.goals?.motivators ?? []).map((m) => <Chip key={m}>{labelOf(GOAL_MOTIVATORS, m)}</Chip>)}
            {result.goals?.posture && <Chip amber>Posture: {labelOf(SPACE_POSTURES, result.goals.posture)}</Chip>}
          </div>
        </Section>
      )}

      <Section title="How teams work">
        <Facts rows={[
          ["Typical in-office week", `${result.work.daysInOffice} days`],
          ["Fully remote", `${result.work.fullyRemote} people`],
          ...(result.work.daysUnsureDepts?.length ? [["Cadence to confirm live", result.work.daysUnsureDepts.join(", ")] as [string, string]] : []),
          ...(result.work.dedicatedByDept ? [["Dedicated desks", byDeptText(result, result.work.dedicatedByDept)] as [string, string]] : []),
        ]} />
      </Section>

      <Section title="Private offices">
        <Facts rows={[
          ["Offices by team", byDeptText(result, result.spaces.privateOfficesByDept)],
          ...(placement ? [["Placement", PLACEMENT_BLURB[placement] ?? labelOf(OFFICE_PLACEMENT_OPTIONS, placement)] as [string, string]] : []),
          ["Leaders named", leaderNames(result) || "—"],
        ]} />
      </Section>

      {result.work.adjacencyNotes && (
        <Section title="Adjacencies"><p className="text-sm text-slate-600">{result.work.adjacencyNotes}</p></Section>
      )}

      <Section title="Collaboration spaces">
        {result.spaces.collaboration.length === 0 ? <Empty /> : (
          <ul className="space-y-2">
            {result.spaces.collaboration.map((c) => {
              const cfg = result.spaces.collabConfig?.[c.type]
              const bits = [cfg?.build && `setup: ${cfg.build}`, cfg?.monitor && `monitor: ${cfg.monitor}`, cfg?.notes].filter(Boolean)
              return (
                <li key={c.type} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm">
                  <span className="font-medium text-slate-900">{c.type}</span>
                  {bits.length > 0 && <span className="text-xs text-slate-500">{bits.join(" · ")}</span>}
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Section title="Support spaces">
        {result.spaces.support.length === 0 ? <Empty /> : (
          <div className="flex flex-wrap gap-2">{result.spaces.support.map((s) => <Chip key={s}>{s}</Chip>)}</div>
        )}
      </Section>

      <Section title="Existing conditions">
        <Facts rows={[
          ...(ex.furniture ? [["Furniture posture", ex.furniture] as [string, string]] : []),
          ["Existing workstations", ex.existingWorkstations !== undefined ? `${ex.existingWorkstations}${ex.workstationSF ? ` · ${ex.workstationSF} SF each` : " · size unknown"}` : "not captured"],
          ["Existing offices", ex.existingOffices !== undefined ? `${ex.existingOffices}${ex.officeSF ? ` · ${ex.officeSF} SF each` : " · size unknown"}` : "not captured"],
          ...(ex.existingCollab && Object.keys(ex.existingCollab).length ? [["Existing collaboration", Object.entries(ex.existingCollab).map(([n, c]) => `${c}× ${n}`).join(", ")] as [string, string]] : []),
          ...(ex.existingSupport && Object.keys(ex.existingSupport).length ? [["Existing support", Object.entries(ex.existingSupport).map(([n, c]) => `${c}× ${n}`).join(", ")] as [string, string]] : []),
        ]} />
      </Section>

      {(result.qualitative.loves || result.qualitative.painPoints || result.qualitative.imbalances) && (
        <Section title="What's working / what isn't">
          <Facts rows={[
            ...(result.qualitative.loves ? [["Working", result.qualitative.loves] as [string, string]] : []),
            ...(result.qualitative.painPoints ? [["Pain points", result.qualitative.painPoints] as [string, string]] : []),
            ...(result.qualitative.imbalances ? [["Over/under-used", result.qualitative.imbalances] as [string, string]] : []),
          ]} />
        </Section>
      )}

      {result.deferred.length > 0 && (
        <Section title="Deferred to the live session">
          <div className="flex flex-wrap gap-2">{result.deferred.map((d) => <Chip key={d}>{d}</Chip>)}</div>
        </Section>
      )}
    </div>
  )
}

/* ── Validation / recommended program tab ───────────────────────────────────── */

function ValidationTab({
  comp, inputs, setInput, lines, existingTotal, proposedTotal, strategy,
  counts, sizes, setCounts, setSizes, propCount, unitSF, showGaps, setShowGaps, gapCount,
}: any) {
  return (
    <div>
      <h1 className="max-w-4xl text-3xl font-bold tracking-tight">What you have today, next to what we&apos;d suggest.</h1>

      <div className="mt-5 rounded-2xl border border-[#00badc]/25 bg-[#00badc]/[0.05] p-6">
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-3 text-lg leading-relaxed text-slate-700">
          You&apos;re planning for
          <InlineNum value={inputs.future} min={1} max={5000} step={5} onChange={(n: number) => setInput({ future: n })} />
          people (from <Strong>{inputs.current}</Strong> today). With a
          <InlineNum value={inputs.daysInOffice} min={1} max={5} suffix="-day" onChange={(n: number) => setInput({ daysInOffice: n })} />
          in-office week and
          <InlineNum value={inputs.fullyRemote} min={0} max={inputs.future} onChange={(n: number) => setInput({ fullyRemote: n })} />
          fully remote, industry ratios suggest the program below. Slide any of these and watch it update.
        </p>
      </div>

      <StrategyBanner strategy={strategy} className="mt-5" />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TotalCard label="Existing today" value={existingTotal} tone="muted" />
        <TotalCard label="Proposed program" value={proposedTotal} tone="cyan" />
        <DeltaCard existing={existingTotal} proposed={proposedTotal} />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Every space — existing vs. proposed</h3>
        <button type="button" onClick={() => setShowGaps((v: boolean) => !v)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            showGaps ? "border-amber-400/70 bg-amber-100 text-amber-700" : "border-slate-200 bg-white text-slate-500 hover:text-slate-900"
          }`}>
          <AlertTriangle className="h-3.5 w-3.5" />
          {showGaps ? "Gaps shown" : "Show gaps"}{gapCount > 0 ? ` · ${gapCount}` : ""}
        </button>
      </div>

      <div className="mt-3 space-y-2.5">
        <div className="mb-2 grid grid-cols-[1fr_96px_300px_104px] items-center gap-5 px-5 text-xs font-medium uppercase tracking-wide text-slate-400">
          <span>Space</span>
          <span className="text-center">Existing</span>
          <span className="text-center">Proposed (count × size)</span>
          <span className="text-right">Difference</span>
        </div>
        {lines.map((l: any) => {
          const Icon = CAT_ICON[l.category as CompCategory]
          const cnt = propCount(l.key, l.proposedCount)
          const sf = unitSF(l.key, l.unitSF)
          const dCount = cnt - l.existingCount
          const dSF = cnt * sf - l.existingCount * l.unitSF
          const gaps = showGaps ? lineGaps(l) : []
          return (
            <div key={l.key} className="rounded-xl border border-slate-200 bg-white">
              <div className="grid grid-cols-[1fr_96px_300px_104px] items-center gap-5 px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Icon className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 truncate text-[15px] font-semibold text-slate-900">
                      {l.label}
                      {gaps.length > 0 && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      {l.category}{l.ratio ? <span className="text-[#0089a3]/70"> · {l.ratio}</span> : ""}
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-slate-600 tabular-nums">{l.existingCount}</div>
                  <div className="text-[11px] text-slate-400 tabular-nums">{lineSF(l, l.existingCount).toLocaleString()} SF</div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <MiniStepper value={cnt} onChange={(n: number) => setCounts((p: any) => ({ ...p, [l.key]: Math.max(0, n) }))} />
                  <span className="text-slate-400">×</span>
                  <MiniStepper value={sf} step={5} unit="SF" onChange={(n: number) => setSizes((p: any) => ({ ...p, [l.key]: Math.max(0, n) }))} />
                  <span className="w-20 text-right text-[11px] font-medium tabular-nums text-[#0089a3]/85">= {(cnt * sf).toLocaleString()} SF</span>
                </div>
                <div className="text-right"><DeltaPill dCount={dCount} dSF={dSF} /></div>
              </div>
              {gaps.length > 0 && (
                <div className="border-t border-amber-300/15 bg-amber-50 px-5 py-2">
                  {gaps.map((g: any, i: number) => (
                    <p key={i} className="flex items-center gap-2 text-xs text-amber-700">
                      <AlertTriangle className="h-3 w-3 shrink-0" /> {g.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Shared bits ────────────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  )
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex flex-col">
          <dt className="text-xs uppercase tracking-wide text-slate-400">{k}</dt>
          <dd className="mt-0.5 text-sm text-slate-700">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Chip({ children, amber }: { children: React.ReactNode; amber?: boolean }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-sm font-medium ${amber ? "border-amber-400/70 bg-amber-100/70 text-amber-700" : "border-slate-200 bg-white text-slate-700"}`}>
      {children}
    </span>
  )
}

function Empty() { return <p className="text-sm text-slate-400">None selected.</p> }

function StrategyBanner({ strategy, className = "" }: { strategy: ReturnType<typeof spaceStrategy>; className?: string }) {
  const grow = strategy.direction === "grow"
  const Icon = strategy.posture === "optimize" ? Moon : strategy.posture === "expand" ? Sun : grow ? TrendingUp : TrendingDown
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#00badc]/15 text-[#0089a3]"><Icon className="h-4 w-4" /></span>
        <div>
          <div className="text-sm font-semibold text-slate-900">{strategy.headline}</div>
          <p className="mt-0.5 text-sm text-slate-500">{strategy.note}</p>
        </div>
      </div>
    </div>
  )
}

function byDeptText(result: SurveyResult, m: Record<string, number>): string {
  const name = (id: string) => result.people.departments.find((d) => d.id === id)?.name ?? id
  const parts = Object.entries(m).filter(([, c]) => c > 0).map(([id, c]) => `${c} · ${name(id)}`)
  return parts.length ? parts.join(", ") : "—"
}

function leaderNames(result: SurveyResult): string {
  const names = result.people.departments.flatMap((d) => (d.employees ?? []).filter((e) => e.isLeader).map((e) => e.name))
  return names.join(", ")
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-slate-900">{children}</span>
}

function InlineNum({ value, onChange, min = 0, max = 9999, step = 1, suffix }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; suffix?: string
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n))
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-[#00badc]/50 bg-[#00badc]/10 px-1 py-0.5 align-middle">
      <button type="button" onClick={() => onChange(clamp(value - step))} className="flex h-6 w-6 items-center justify-center rounded text-[#0089a3] hover:bg-[#00badc]/20">−</button>
      <span className="min-w-[2ch] px-1 text-center text-lg font-bold tabular-nums text-slate-900">{value}{suffix}</span>
      <button type="button" onClick={() => onChange(clamp(value + step))} className="flex h-6 w-6 items-center justify-center rounded text-[#0089a3] hover:bg-[#00badc]/20">+</button>
    </span>
  )
}

function MiniStepper({ value, onChange, step = 1, unit }: { value: number; onChange: (n: number) => void; step?: number; unit?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" onClick={() => onChange(value - step)} className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200">−</button>
      <span className="w-11 text-center text-sm font-bold tabular-nums text-slate-900">{value.toLocaleString()}{unit ? <span className="ml-0.5 text-[10px] font-medium text-slate-400">{unit}</span> : ""}</span>
      <button type="button" onClick={() => onChange(value + step)} className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200">+</button>
    </span>
  )
}

function TotalCard({ label, value, tone }: { label: string; value: number; tone: "muted" | "cyan" }) {
  return (
    <div className={`rounded-2xl border p-5 ${tone === "cyan" ? "border-[#00badc]/30 bg-[#00badc]/[0.06]" : "border-slate-200 bg-white"}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{Math.round(value).toLocaleString()} <span className="text-base font-medium text-slate-500">SF</span></div>
    </div>
  )
}

function DeltaCard({ existing, proposed }: { existing: number; proposed: number }) {
  const d = proposed - existing
  const pct = existing > 0 ? Math.round((d / existing) * 100) : 0
  const up = d > 0
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Difference</div>
      <div className={`mt-1 flex items-center gap-2 text-3xl font-bold tabular-nums ${up ? "text-emerald-600" : d < 0 ? "text-amber-600" : "text-slate-900"}`}>
        {up ? <TrendingUp className="h-6 w-6" /> : d < 0 ? <TrendingDown className="h-6 w-6" /> : <Minus className="h-6 w-6" />}
        {d > 0 ? "+" : ""}{Math.round(d).toLocaleString()} <span className="text-base font-medium text-slate-500">SF{existing > 0 ? ` · ${pct > 0 ? "+" : ""}${pct}%` : ""}</span>
      </div>
    </div>
  )
}

function DeltaPill({ dCount, dSF }: { dCount: number; dSF: number }) {
  if (dCount === 0 && Math.round(dSF) === 0) return <span className="text-xs text-slate-400">no change</span>
  const up = dSF > 0
  return (
    <div className={`inline-flex flex-col items-end ${up ? "text-emerald-600" : "text-amber-600"}`}>
      <span className="text-sm font-semibold tabular-nums">{dCount > 0 ? "+" : ""}{dCount}</span>
      <span className="text-[11px] tabular-nums opacity-80">{dSF > 0 ? "+" : ""}{Math.round(dSF).toLocaleString()} SF</span>
    </div>
  )
}
