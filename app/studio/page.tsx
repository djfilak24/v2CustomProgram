"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  Monitor, KeyRound, FileSpreadsheet, RefreshCw, Undo2, Search, ExternalLink,
} from "lucide-react"
import { buildDeliverable, type DeliverableOverrides } from "@/lib/survey/deliverable"
import { exportFitPlanningPackage } from "@/lib/survey/fitPlanning"
import { COLLAB_CATALOG, SUPPORT_CATALOG } from "@/lib/survey/catalog"
import { isNelsonMode, nelsonCode } from "@/lib/nelsonMode"
import { loadSurveySeed } from "@/lib/survey/seedStorage"
import { demoResult } from "@/lib/survey/demo-scenarios"
import type { SurveyResult } from "@/lib/survey/types"
import type { ComparisonLine } from "@/lib/survey/comparison"

interface EngRow { token: string; clientName: string; status: string; hasResult: boolean }

/**
 * The Studio — Canvas v2 from the NELSON point of view. An engagement
 * workbench, not a document: inspect the program intake already built, adjust
 * the dials (qty + unit SF per space), and hand off to fit planning. NELSON-only
 * and desktop-only by design — phones get a branded "open on desktop" screen.
 * Prototyped per Council Advisory #5; the old canvas at / stays frozen until
 * this absorbs daily use.
 */
export default function StudioPage() {
  const [nelson, setNelson] = useState<boolean | null>(null)
  const [rows, setRows] = useState<EngRow[]>([])
  const [source, setSource] = useState<string>("") // token | "seed" | "demo"
  const [result, setResult] = useState<SurveyResult | null>(null)
  const [overrides, setOverrides] = useState<DeliverableOverrides>({})
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState("")

  useEffect(() => { setNelson(isNelsonMode()) }, [])

  // Engagement board for the picker
  useEffect(() => {
    if (!nelson) return
    fetch("/api/engagements", { headers: { "x-nelson-code": nelsonCode() ?? "" } })
      .then(async (r) => (r.ok ? setRows((await r.json()).filter((x: EngRow) => x.hasResult)) : undefined))
      .catch(() => {})
  }, [nelson])

  // Load the selected source
  useEffect(() => {
    if (!nelson) return
    setOverrides({}); setCounts({})
    if (!source || source === "seed") {
      const seed = loadSurveySeed()
      if (seed) { setResult(seed); setSource("seed"); return }
      setResult(demoResult("law")); setSource("demo")
      return
    }
    if (source === "demo") { setResult(demoResult("law")); return }
    fetch(`/api/engagements/${source}`, { headers: { "x-nelson-code": nelsonCode() ?? "" } })
      .then(async (r) => {
        if (!r.ok) return
        const e = await r.json()
        if (e.result) { setResult(e.result); setOverrides(e.overrides ?? {}) }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nelson, source])

  const d = useMemo(() => (result ? buildDeliverable(result, overrides, counts) : null), [result, overrides, counts])
  const edited = Object.keys(overrides).length + Object.keys(counts).length

  if (nelson === false) {
    return (
      <Gate icon={<KeyRound className="h-5 w-5" />} title="NELSON only.">
        The Studio is internal tooling. Unlock presenter mode at{" "}
        <a href="/engagements" className="font-semibold text-[#0089a3] underline">/engagements</a> first.
      </Gate>
    )
  }

  return (
    <>
      {/* Desktop-only by design */}
      <div className="lg:hidden">
        <Gate icon={<Monitor className="h-5 w-5" />} title="The Studio is a desktop tool.">
          Program work needs the room. Open this page on a laptop or larger — everything else
          (console, review, deliverable) works right here.
        </Gate>
      </div>

      <div className="hidden min-h-screen bg-[#f3f7fa] text-slate-900 lg:block">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-8 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image src="/NELSON_color.png" alt="NELSON" width={140} height={33} className="h-6 w-auto" priority />
              <span className="text-sm text-slate-400">·</span>
              <span className="text-sm font-medium text-slate-700">Studio</span>
              <span className="rounded-full bg-[#00badc]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0089a3]">Canvas v2 preview</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-[#00badc] focus:outline-none"
              >
                <option value="seed">Local seed / last reviewed</option>
                <option value="demo">Demo — Law Firm</option>
                {rows.map((r) => (
                  <option key={r.token} value={r.token}>{r.clientName} · {r.token}</option>
                ))}
              </select>
              {edited > 0 && (
                <button
                  onClick={() => { setOverrides({}); setCounts({}) }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-slate-300 hover:text-slate-800"
                >
                  <Undo2 className="h-3.5 w-3.5" /> Reset {edited} edit{edited === 1 ? "" : "s"}
                </button>
              )}
              <button
                onClick={() => result && d && exportFitPlanningPackage(result, d)}
                disabled={!d}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0e1a2e] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-40"
              >
                <FileSpreadsheet className="h-4 w-4" /> Fit-Planning Package
              </button>
            </div>
          </div>
        </header>

        {!d || !result ? (
          <p className="p-16 text-center text-slate-400"><RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />Loading program…</p>
        ) : (
          <main className="mx-auto grid max-w-[1800px] grid-cols-[300px_minmax(0,1fr)] gap-6 px-8 py-6">
            {/* Left rail — the engagement at a glance */}
            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold">{d.clientName}</h2>
                <p className="mt-0.5 text-xs text-slate-400">{d.current} → {d.future} people · {d.daysInOffice} days/wk</p>
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm tabular-nums">
                  <Row k="Net program" v={`${d.totals.proposedNetSF.toLocaleString()} SF`} />
                  <Row k="Circulation" v={`${d.totals.circulationSF.toLocaleString()} SF`} />
                  <Row k="Gross usable" v={`${d.totals.grossUsableSF.toLocaleString()} SF`} strong />
                  <Row k={`Load factor ×${(1 + d.totals.rentableFactor).toFixed(2)}`} v={`${d.totals.rentableAddOnSF.toLocaleString()} SF`} />
                  <Row k="Est. rentable" v={`${d.totals.estimatedRentableSF.toLocaleString()} SF`} strong />
                  <Row k="SF / person" v={`${d.totals.sfPerPerson}`} />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">By category</h3>
                <div className="mt-3 space-y-2 text-sm tabular-nums">
                  {d.categories.map((c) => (
                    <Row key={c.name} k={c.name} v={`${c.proposedTotalSF.toLocaleString()} SF`} />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-500">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Open elsewhere</h3>
                <div className="flex flex-col gap-1.5">
                  <a className="inline-flex items-center gap-1.5 hover:text-slate-800" href="/review"><ExternalLink className="h-3 w-3" /> Program review</a>
                  {source !== "seed" && source !== "demo" && (
                    <a className="inline-flex items-center gap-1.5 hover:text-slate-800" href={`/d/${source}`}><ExternalLink className="h-3 w-3" /> Client deliverable</a>
                  )}
                  <a className="inline-flex items-center gap-1.5 hover:text-slate-800" href="/"><ExternalLink className="h-3 w-3" /> Legacy canvas (frozen)</a>
                </div>
              </div>
            </aside>

            {/* Spaces browser */}
            <section>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold tracking-tight">Spaces</h2>
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter spaces…"
                    className="w-64 rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-[#00badc] focus:outline-none"
                  />
                </label>
              </div>

              {d.categories.map((cat) => {
                const visible = cat.lines.filter(
                  (l) => (l.proposedCount > 0 || l.existingCount > 0) && l.label.toLowerCase().includes(filter.toLowerCase()),
                )
                if (!visible.length) return null
                return (
                  <div key={cat.name} className="mb-8">
                    <h3 className="mb-3 flex items-baseline gap-3 text-xs font-bold uppercase tracking-[0.15em] text-[#0089a3]">
                      {cat.name}
                      <span className="font-medium normal-case tracking-normal text-slate-400">
                        {cat.proposedTotalSF.toLocaleString()} SF incl. circulation
                      </span>
                    </h3>
                    <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                      {visible.map((l) => (
                        <SpaceCard
                          key={l.key}
                          line={l}
                          result={result}
                          onQty={(n) => setCounts((p) => ({ ...p, [l.key]: n }))}
                          onSf={(n) => setOverrides((p) => (n && n > 0 ? { ...p, [l.key]: n } : (() => { const q = { ...p }; delete q[l.key]; return q })()))}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </section>
          </main>
        )}
      </div>
    </>
  )
}

/* ── Pieces ────────────────────────────────────────────────────────────────── */

const PHOTO_FALLBACK: Record<string, string> = {
  Workstations: "/office-2.jpg", Offices: "/office-1.jpg",
}

function catalogFor(line: ComparisonLine) {
  const id = line.key.replace(/^(collab|support):/, "")
  return [...COLLAB_CATALOG, ...SUPPORT_CATALOG].find((c) => c.id === id)
}

function SpaceCard({
  line, result, onQty, onSf,
}: {
  line: ComparisonLine
  result: SurveyResult
  onQty: (n: number) => void
  onSf: (n: number | null) => void
}) {
  const cat = catalogFor(line)
  const photo = cat?.photo ?? PHOTO_FALLBACK[line.category] ?? "/office-3.jpg"
  const deptName = (id: string) => result.people.departments.find((x) => x.id === id)?.name ?? id

  // Who holds this space, where captured
  let alloc: [string, number][] = []
  if (line.key === "offices") {
    alloc = Object.entries(result.spaces.privateOfficesByDept).filter(([, v]) => v > 0).map(([k, v]) => [deptName(k), v])
  } else if (line.key === "workstations") {
    alloc = Object.entries(result.work.dedicatedByDept ?? {}).filter(([, v]) => v > 0).map(([k, v]) => [deptName(k), v])
  } else if (line.category === "Collaboration") {
    const item = result.spaces.collaboration.find((c) => c.type === line.key.replace(/^collab:/, ""))
    alloc = Object.entries(item?.byDept ?? {}).filter(([, v]) => v > 0).map(([k, v]) => [deptName(k), v])
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-md">
      <div className="relative h-24">
        <Image src={photo} alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="absolute bottom-2 left-3 text-sm font-semibold text-white">{line.label}</span>
        {line.ratio && (
          <span className="absolute right-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">{line.ratio}</span>
        )}
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          Qty
          <input
            type="number" min={0} value={line.proposedCount}
            onChange={(e) => onQty(Math.max(0, Number(e.target.value)))}
            className="w-16 rounded-md border border-[#00badc]/40 bg-[#e9f7fb]/50 px-2 py-1 text-right text-sm tabular-nums focus:border-[#00badc] focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          × SF
          <input
            type="number" min={1} value={line.unitSF}
            onChange={(e) => onSf(e.target.value === "" ? null : Number(e.target.value))}
            className="w-20 rounded-md border border-[#00badc]/40 bg-[#e9f7fb]/50 px-2 py-1 text-right text-sm tabular-nums focus:border-[#00badc] focus:outline-none"
          />
        </label>
        <span className="ml-auto text-sm font-bold tabular-nums text-slate-900">
          {(line.proposedCount * line.unitSF).toLocaleString()} SF
        </span>
      </div>
      {(alloc.length > 0 || line.existingCount > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-4 py-2.5">
          {alloc.map(([name, n]) => (
            <span key={name} className="rounded-full bg-[#00badc]/10 px-2 py-0.5 text-[11px] font-medium text-[#0089a3]">
              {name} · {n}
            </span>
          ))}
          {line.existingCount > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">today: {line.existingCount}</span>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={strong ? "font-semibold text-slate-900" : "text-slate-500"}>{k}</span>
      <span className={strong ? "font-bold text-slate-900" : "text-slate-700"}>{v}</span>
    </div>
  )
}

function Gate({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3f7fa] px-6 text-center">
      <Image src="/NELSON_color.png" alt="NELSON" width={170} height={40} className="h-8 w-auto" />
      <span className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#00badc]/10 text-[#0089a3]">{icon}</span>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 max-w-md text-slate-600">{children}</p>
    </div>
  )
}
