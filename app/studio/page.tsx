"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  Monitor, KeyRound, FileSpreadsheet, RefreshCw, Undo2, Search, ExternalLink, Eye, Copy, Trash2,
  Crown, AlertTriangle, ClipboardList, Users, LayoutGrid, Table2, Presentation, CheckCircle2, X,
} from "lucide-react"
import { buildDeliverable, type DeliverableOverrides, type DeliverableAddition } from "@/lib/survey/deliverable"
import { exportFitPlanningPackage } from "@/lib/survey/fitPlanning"
import { lineGaps, type ComparisonLine } from "@/lib/survey/comparison"
import { COLLAB_CATALOG, SUPPORT_CATALOG, type CatalogSpace } from "@/lib/survey/catalog"
import { SpaceDetailModal } from "@/components/survey/space-detail-modal"
import { WORKSTATION_SIZES, OFFICE_SIZES, SURVEY_STEPS, GOAL_MOTIVATORS, SPACE_POSTURES } from "@/lib/survey/sections"
import { isNelsonMode, nelsonCode } from "@/lib/nelsonMode"
import { loadSurveySeed } from "@/lib/survey/seedStorage"
import { demoResult } from "@/lib/survey/demo-scenarios"
import type { SurveyResult } from "@/lib/survey/types"

interface EngRow { token: string; clientName: string; status: string; hasResult: boolean }
type View = "workbench" | "focus" | "briefing"
type Drawer = "gaps" | "decisions" | "survey" | null

/**
 * The Studio v2 — the NELSON engagement workbench, rebuilt to the founder's
 * brief (Council Advisory #6). The live-session cockpit: review the intake,
 * see and close the gaps, adjust the program with the client watching, and
 * everything the survey captured one keystroke away — organized so any panel
 * is safe to display in front of the client. Desktop-only, NELSON-only.
 */
export default function StudioPage() {
  const [nelson, setNelson] = useState<boolean | null>(null)
  const [rows, setRows] = useState<EngRow[]>([])
  const [source, setSource] = useState<string>("")
  const [result, setResult] = useState<SurveyResult | null>(null)

  // Session working state (persistence deliberately deferred — Advisory #6)
  const [overrides, setOverrides] = useState<DeliverableOverrides>({})
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [additions, setAdditions] = useState<DeliverableAddition[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [resolvedGaps, setResolvedGaps] = useState<Record<string, boolean>>({})

  const [view, setView] = useState<View>("workbench")
  const [drawer, setDrawer] = useState<Drawer>(null)
  const [surveyTab, setSurveyTab] = useState<"people" | "answers" | "existing">("people")
  const [filter, setFilter] = useState("")
  const [detail, setDetail] = useState<CatalogSpace | null>(null)

  useEffect(() => { setNelson(isNelsonMode()) }, [])

  useEffect(() => {
    if (!nelson) return
    fetch("/api/engagements", { headers: { "x-nelson-code": nelsonCode() ?? "" } })
      .then(async (r) => (r.ok ? setRows((await r.json()).filter((x: EngRow) => x.hasResult)) : undefined))
      .catch(() => {})
  }, [nelson])

  useEffect(() => {
    if (!nelson) return
    setOverrides({}); setCounts({}); setAdditions([]); setNotes({}); setResolvedGaps({})
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

  const d = useMemo(() => (result ? buildDeliverable(result, overrides, counts, additions) : null), [result, overrides, counts, additions])
  const baseline = d?.comp.lines ?? []
  const baseOf = (key: string) => baseline.find((l) => l.key === key)

  // ── Derived: the decision log (deviations ARE the log — Advisory #6.6) ─────
  const decisions = useMemo(() => {
    if (!d) return [] as { id: string; text: string }[]
    const out: { id: string; text: string }[] = []
    for (const b of baseline) {
      const sf = overrides[b.key]
      if (sf && sf > 0 && sf !== b.unitSF)
        out.push({ id: `${b.key}:sf`, text: `${b.label} — unit size ${b.unitSF} → ${sf} SF (${dims(sf) ?? "custom"})` })
      const q = counts[b.key]
      if (q !== undefined && q !== b.proposedCount)
        out.push({ id: `${b.key}:qty`, text: `${b.label} — quantity ${b.proposedCount} → ${q}` })
    }
    for (const a of additions)
      out.push({ id: `add:${a.key}`, text: `Added ${a.label} — ${a.proposedCount} × ${a.unitSF} SF (${a.category})` })
    for (const [gid, on] of Object.entries(resolvedGaps))
      if (on) out.push({ id: `gap:${gid}`, text: `Gap closed — ${gid.split("::")[1] ?? gid}` })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, overrides, counts, additions, resolvedGaps])

  // ── Derived: gaps (intake holes + deferred questions) ──────────────────────
  const gaps = useMemo(() => {
    if (!d || !result) return [] as { id: string; line: string; message: string }[]
    const out = baseline.flatMap((l) =>
      lineGaps(l).map((g) => ({ id: `${l.key}:${g.kind}::${l.label}`, line: l.label, message: g.message })),
    )
    for (const dq of result.deferred) {
      const title = SURVEY_STEPS.find((s) => s.id === dq)?.title ?? dq
      out.push({ id: `defer:${dq}::${title}`, line: title, message: "Deferred by the client — cover live." })
    }
    return out
  }, [d, result, baseline])
  const openGaps = gaps.filter((g) => !resolvedGaps[g.id]).length

  const editedCount = decisions.length

  if (nelson === false) {
    return (
      <Gate icon={<KeyRound className="h-5 w-5" />} title="NELSON only.">
        The Studio is internal tooling. Unlock presenter mode at{" "}
        <a href="/engagements" className="font-semibold text-[#0089a3] underline">/engagements</a> first.
      </Gate>
    )
  }

  const briefing = view === "briefing"

  return (
    <>
      <div className="lg:hidden">
        <Gate icon={<Monitor className="h-5 w-5" />} title="The Studio is a desktop tool.">
          Program work needs the room. Open this page on a laptop or larger — everything else
          (console, review, deliverable) works right here.
        </Gate>
      </div>

      <div className="hidden min-h-screen bg-[#f3f7fa] text-slate-900 lg:block">
        {detail && <SpaceDetailModal space={detail} onClose={() => setDetail(null)} />}

        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-6 py-2.5 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1900px] items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Image src="/NELSON_color.png" alt="NELSON" width={140} height={33} className="h-6 w-auto" priority />
              <span className="text-sm text-slate-400">·</span>
              <span className="text-sm font-medium text-slate-700">Studio</span>
              {/* View presets — Advisory #6.10 */}
              <div className="ml-3 flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {([["workbench", LayoutGrid, "Workbench"], ["focus", Table2, "Focus"], ["briefing", Presentation, "Briefing"]] as const).map(([id, Icon, label]) => (
                  <button
                    key={id}
                    onClick={() => { setView(id); if (id === "briefing") setDrawer(null) }}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      view === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!briefing && (
                <>
                  <DrawerBtn active={drawer === "gaps"} onClick={() => setDrawer(drawer === "gaps" ? null : "gaps")} icon={<AlertTriangle className="h-3.5 w-3.5" />}>
                    Gaps{openGaps > 0 && <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">{openGaps}</span>}
                  </DrawerBtn>
                  <DrawerBtn active={drawer === "decisions"} onClick={() => setDrawer(drawer === "decisions" ? null : "decisions")} icon={<ClipboardList className="h-3.5 w-3.5" />}>
                    Decisions{editedCount > 0 && <span className="ml-1 rounded-full bg-[#00badc]/15 px-1.5 text-[10px] font-bold text-[#0089a3]">{editedCount}</span>}
                  </DrawerBtn>
                  <DrawerBtn active={drawer === "survey"} onClick={() => setDrawer(drawer === "survey" ? null : "survey")} icon={<Users className="h-3.5 w-3.5" />}>
                    Survey
                  </DrawerBtn>
                  <span className="mx-1 h-5 w-px bg-slate-200" />
                </>
              )}
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="max-w-56 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-[#00badc] focus:outline-none"
              >
                <option value="seed">Local seed / last reviewed</option>
                <option value="demo">Demo — Law Firm</option>
                {rows.map((r) => <option key={r.token} value={r.token}>{r.clientName}</option>)}
              </select>
              <button
                onClick={() => result && d && exportFitPlanningPackage(result, d, {
                  decisions: decisions.map((x) => ({ text: x.text, note: notes[x.id] })),
                  gaps: gaps.map((g) => ({ line: g.line, message: g.message, resolved: !!resolvedGaps[g.id], note: notes[`gapnote:${g.id}`] })),
                })}
                disabled={!d}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0e1a2e] px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-40"
              >
                <FileSpreadsheet className="h-4 w-4" /> Fit-Planning Package
              </button>
            </div>
          </div>
        </header>

        {!d || !result ? (
          <p className="p-16 text-center text-slate-400"><RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />Loading program…</p>
        ) : (
          <main className={`mx-auto grid max-w-[1900px] gap-6 px-6 py-6 ${drawer && !briefing ? "grid-cols-[280px_minmax(0,1fr)_360px]" : "grid-cols-[280px_minmax(0,1fr)]"}`}>
            {/* ── Left rail: ONE hero number, everything else subordinate ───── */}
            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className={briefing ? "text-xl font-bold" : "text-lg font-bold"}>{d.clientName}</h2>
                <p className="mt-0.5 text-xs text-slate-400">{d.current} → {d.future} people · {d.daysInOffice} days/wk</p>
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0089a3]">Gross usable</p>
                  <p className={`${briefing ? "text-5xl" : "text-4xl"} font-bold tabular-nums tracking-tight`}>
                    {d.totals.grossUsableSF.toLocaleString()}<span className="ml-1 text-base font-medium text-slate-400">SF</span>
                  </p>
                  {d.totals.existingSF > 0 && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {d.totals.grossUsableSF - d.totals.existingSF >= 0 ? "+" : ""}
                      {(d.totals.grossUsableSF - d.totals.existingSF).toLocaleString()} SF vs today
                    </p>
                  )}
                </div>
                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-[13px] tabular-nums text-slate-500">
                  <Row k="Net program" v={`${d.totals.proposedNetSF.toLocaleString()}`} />
                  <Row k="Circulation" v={`${d.totals.circulationSF.toLocaleString()}`} />
                  <Row k={`Load ×${(1 + d.totals.rentableFactor).toFixed(2)} → rentable`} v={`${d.totals.estimatedRentableSF.toLocaleString()}`} />
                  <Row k="SF / person" v={`${d.totals.sfPerPerson}`} />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">By category</h3>
                <div className="mt-3 space-y-2 text-sm tabular-nums">
                  {d.categories.map((c) => <Row key={c.name} k={c.name} v={`${c.proposedTotalSF.toLocaleString()} SF`} />)}
                </div>
              </div>
              {!briefing && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-500">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Open elsewhere</h3>
                  <div className="flex flex-col gap-1.5">
                    <a className="inline-flex items-center gap-1.5 hover:text-slate-800" href="/review"><ExternalLink className="h-3 w-3" /> Program review</a>
                    {source !== "seed" && source !== "demo" && (
                      <a className="inline-flex items-center gap-1.5 hover:text-slate-800" href={`/d/${source}`}><ExternalLink className="h-3 w-3" /> Client deliverable</a>
                    )}
                    <a className="inline-flex items-center gap-1.5 hover:text-slate-800" href="/"><ExternalLink className="h-3 w-3" /> Legacy canvas (frozen)</a>
                  </div>
                  {editedCount > 0 && (
                    <button
                      onClick={() => { setOverrides({}); setCounts({}); setAdditions([]) }}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 font-medium hover:border-slate-300 hover:text-slate-800"
                    >
                      <Undo2 className="h-3 w-3" /> Reset program edits
                    </button>
                  )}
                </div>
              )}
            </aside>

            {/* ── Center: the spaces (Workbench cards / Focus table / Briefing) ─ */}
            <section>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold tracking-tight">Spaces</h2>
                {!briefing && (
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1"><Dot c="#00badc" /> size changed</span>
                      <span className="flex items-center gap-1"><Dot c="#8b5cf6" /> qty changed</span>
                    </span>
                    <label className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter spaces…"
                        className="w-56 rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-[#00badc] focus:outline-none"
                      />
                    </label>
                  </div>
                )}
              </div>

              {view === "focus" ? (
                <FocusTable d={d} baseOf={baseOf} onSf={(k, n) => setSf(k, n)} onQty={(k, n) => setQty(k, n)} filter={filter} />
              ) : (
                d.categories.map((cat) => {
                  const visible = cat.lines.filter(
                    (l) => (l.proposedCount > 0 || l.existingCount > 0 || l.key.startsWith("studio:")) &&
                      l.label.toLowerCase().includes(filter.toLowerCase()),
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
                      <div className={`grid gap-3.5 ${briefing ? "xl:grid-cols-2 2xl:grid-cols-3" : "xl:grid-cols-2 2xl:grid-cols-3"}`}>
                        {visible.map((l) => (
                          <SpaceCard
                            key={l.key} line={l} base={baseOf(l.key)} result={result} briefing={briefing}
                            onQty={(n) => setQty(l.key, n)}
                            onSf={(n) => setSf(l.key, n)}
                            onInfo={() => setDetail(detailFor(l))}
                            onDuplicate={() => duplicate(l)}
                            onDelete={l.key.startsWith("studio:") ? () => setAdditions((p) => p.filter((a) => a.key !== l.key)) : undefined}
                            onRename={l.key.startsWith("studio:") ? (name) => setAdditions((p) => p.map((a) => (a.key === l.key ? { ...a, label: name } : a))) : undefined}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </section>

            {/* ── Right drawer ──────────────────────────────────────────────── */}
            {drawer && !briefing && (
              <aside className="max-h-[calc(100vh-6rem)] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5">
                {drawer === "gaps" && (
                  <>
                    <DrawerTitle icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} title={`Gaps · ${openGaps} open`} onClose={() => setDrawer(null)} />
                    <p className="text-xs text-slate-400">What intake couldn&apos;t answer — resolve each live, with a note. Resolutions join the decision log and the Fit-Planning Package.</p>
                    {gaps.length === 0 && <p className="pt-4 text-sm text-slate-400">No gaps — a complete intake.</p>}
                    {gaps.map((g) => {
                      const done = !!resolvedGaps[g.id]
                      return (
                        <div key={g.id} className={`rounded-xl border p-3 ${done ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-slate-900">{g.line}</p>
                              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{g.message}</p>
                            </div>
                            <button
                              onClick={() => setResolvedGaps((p) => ({ ...p, [g.id]: !done }))}
                              title={done ? "Reopen" : "Mark resolved"}
                              className={`shrink-0 rounded-full p-1 ${done ? "text-emerald-600" : "text-slate-300 hover:text-emerald-600"}`}
                            >
                              <CheckCircle2 className="h-5 w-5" />
                            </button>
                          </div>
                          <input
                            value={notes[`gapnote:${g.id}`] ?? ""}
                            onChange={(e) => setNotes((p) => ({ ...p, [`gapnote:${g.id}`]: e.target.value }))}
                            placeholder="How we closed it…"
                            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-[#00badc] focus:outline-none"
                          />
                        </div>
                      )
                    })}
                  </>
                )}

                {drawer === "decisions" && (
                  <>
                    <DrawerTitle icon={<ClipboardList className="h-4 w-4 text-[#0089a3]" />} title={`Decisions · ${decisions.length}`} onClose={() => setDrawer(null)} />
                    <p className="text-xs text-slate-400">Derived from your edits — every deviation from the ratio baseline, every added space, every gap closed. Notes ride into the handoff.</p>
                    {decisions.length === 0 && <p className="pt-4 text-sm text-slate-400">No deviations yet — the program is pure ratio baseline.</p>}
                    {decisions.map((x) => (
                      <div key={x.id} className="rounded-xl border border-slate-200 p-3">
                        <p className="text-xs font-medium leading-relaxed text-slate-800">{x.text}</p>
                        <input
                          value={notes[x.id] ?? ""}
                          onChange={(e) => setNotes((p) => ({ ...p, [x.id]: e.target.value }))}
                          placeholder="Why — for the record…"
                          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-[#00badc] focus:outline-none"
                        />
                      </div>
                    ))}
                  </>
                )}

                {drawer === "survey" && (
                  <>
                    <DrawerTitle icon={<Users className="h-4 w-4 text-[#0089a3]" />} title="Everything from intake" onClose={() => setDrawer(null)} />
                    <div className="flex gap-1 rounded-lg bg-slate-50 p-0.5">
                      {(["people", "answers", "existing"] as const).map((t) => (
                        <button key={t} onClick={() => setSurveyTab(t)}
                          className={`flex-1 rounded-md px-2 py-1 text-xs font-medium capitalize ${surveyTab === t ? "bg-white shadow-sm" : "text-slate-500"}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <SurveyDrawer result={result} tab={surveyTab} />
                  </>
                )}
              </aside>
            )}
          </main>
        )}
      </div>
    </>
  )

  // ── Session-edit helpers ─────────────────────────────────────────────────
  function setSf(key: string, n: number | null) {
    if (key.startsWith("studio:")) {
      setAdditions((p) => p.map((a) => (a.key === key ? { ...a, unitSF: Math.max(1, n ?? 1) } : a)))
      return
    }
    setOverrides((p) => {
      const q = { ...p }
      if (n && n > 0) q[key] = n
      else delete q[key]
      return q
    })
  }
  function setQty(key: string, n: number) {
    if (key.startsWith("studio:")) {
      setAdditions((p) => p.map((a) => (a.key === key ? { ...a, proposedCount: Math.max(0, n) } : a)))
      return
    }
    setCounts((p) => ({ ...p, [key]: Math.max(0, n) }))
  }
  function duplicate(l: ComparisonLine) {
    const key = `studio:${l.key}:${Date.now().toString(36)}`
    setAdditions((p) => [...p, {
      key, label: `${l.label} (B)`, category: l.category, unitSF: l.unitSF,
      proposedCount: l.proposedCount, ...(l.ratio ? { ratio: l.ratio } : {}),
    }])
  }
  function detailFor(l: ComparisonLine): CatalogSpace {
    const id = l.key.replace(/^studio:/, "").replace(/^(collab|support):/, "").replace(/:[a-z0-9]+$/, "")
    const hit = [...COLLAB_CATALOG, ...SUPPORT_CATALOG].find((c) => c.id === id || c.label === l.label.replace(/ \(B\)$/, ""))
    if (hit) return hit
    const ws = l.category === "Workstations"
    return {
      id: l.key, label: l.label, icon: ws ? "users" : "building",
      sfEach: l.unitSF, ratio: l.ratio ?? "per program",
      photo: ws ? "/office-2.jpg" : "/office-1.jpg",
      description: ws
        ? "Open-plan assigned workstations — the desk footprint that anchors the individual-space program."
        : "Enclosed, assigned private offices — typically leadership and roles that need a door.",
      uses: ws
        ? ["Daily individual work for assigned-seat staff", "The unit that sets open-plan density"]
        : ["Leadership and door-required roles", "Doubles as a 2–3 person meeting point"],
    }
  }
}

/* ── Dimension language: SF ⇄ footprint ─────────────────────────────────── */

function dims(sf: number): string | null {
  const preset = [...WORKSTATION_SIZES, ...OFFICE_SIZES].find((o) => o.sf === sf)
  if (preset) return preset.label
  if (sf < 16) return null
  const w = Math.ceil(Math.sqrt(sf))
  const dep = Math.round(sf / w)
  return `≈ ${w}′ × ${dep}′`
}

/* ── The card ──────────────────────────────────────────────────────────── */

function SpaceCard({
  line, base, result, briefing, onQty, onSf, onInfo, onDuplicate, onDelete, onRename,
}: {
  line: ComparisonLine
  base?: ComparisonLine
  result: SurveyResult
  briefing: boolean
  onQty: (n: number) => void
  onSf: (n: number | null) => void
  onInfo: () => void
  onDuplicate: () => void
  onDelete?: () => void
  onRename?: (name: string) => void
}) {
  const deptName = (id: string) => result.people.departments.find((x) => x.id === id)?.name ?? id
  const sfChanged = !!base && line.unitSF !== base.unitSF
  const qtyChanged = !!base && line.proposedCount !== base.proposedCount
  const isAddition = line.key.startsWith("studio:")

  // Ratio · Survey · Today — the validation triangle (Advisory #6.4)
  const surveyAsk = (() => {
    if (line.key === "offices") {
      const s = Object.values(result.spaces.privateOfficesByDept).reduce((a, b) => a + b, 0)
      return s > 0 ? s : null
    }
    if (line.key === "workstations") {
      const s = Object.values(result.work.dedicatedByDept ?? {}).reduce((a, b) => a + b, 0)
      return s > 0 ? s : null
    }
    if (line.category === "Collaboration") {
      const item = result.spaces.collaboration.find((c) => c.type === line.key.replace(/^collab:/, ""))
      const s = Object.values(item?.byDept ?? {}).reduce((a, b) => a + b, 0)
      return s > 0 ? s : null
    }
    return null
  })()

  let alloc: [string, number][] = []
  if (line.key === "offices") alloc = Object.entries(result.spaces.privateOfficesByDept).filter(([, v]) => v > 0).map(([k, v]) => [deptName(k), v])
  else if (line.key === "workstations") alloc = Object.entries(result.work.dedicatedByDept ?? {}).filter(([, v]) => v > 0).map(([k, v]) => [deptName(k), v])
  else if (line.category === "Collaboration") {
    const item = result.spaces.collaboration.find((c) => c.type === line.key.replace(/^collab:/, ""))
    alloc = Object.entries(item?.byDept ?? {}).filter(([, v]) => v > 0).map(([k, v]) => [deptName(k), v])
  }

  return (
    <div className={`rounded-2xl border bg-white transition-shadow hover:shadow-md ${isAddition ? "border-[#00badc]/40" : "border-slate-200"}`}>
      <div className="flex items-center gap-2 px-4 pb-1 pt-3">
        {onRename ? (
          <input
            value={line.label}
            onChange={(e) => onRename(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent text-[15px] font-semibold text-slate-900 hover:border-slate-200 focus:border-[#00badc] focus:outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-slate-900">{line.label}</span>
        )}
        <span className="flex shrink-0 items-center gap-1">
          {sfChanged && <Dot c="#00badc" title="Unit size changed from ratio baseline" />}
          {qtyChanged && <Dot c="#8b5cf6" title="Quantity changed from ratio baseline" />}
        </span>
        {!briefing && (
          <span className="flex shrink-0 items-center">
            <IconBtn title="About this space" onClick={onInfo}><Eye className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn title="Duplicate — e.g. a second size standard" onClick={onDuplicate}><Copy className="h-3.5 w-3.5" /></IconBtn>
            {onDelete && <IconBtn title="Remove this added line" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 text-red-400" /></IconBtn>}
          </span>
        )}
      </div>

      {/* Ratio · Survey · Today */}
      <p className="px-4 text-[11px] text-slate-400">
        {line.ratio ? <>ratio {line.ratio}{base ? ` → ${base.proposedCount}` : ""}</> : "added in studio"}
        {surveyAsk !== null && <> · survey {surveyAsk}</>}
        {line.existingCount > 0 && <> · today {line.existingCount}</>}
      </p>

      <div className="flex items-center gap-3 px-4 py-2.5">
        {briefing ? (
          <span className="text-sm text-slate-600 tabular-nums">{line.proposedCount} × {line.unitSF} SF{dims(line.unitSF) ? ` (${dims(line.unitSF)})` : ""}</span>
        ) : (
          <>
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              Qty
              <input
                type="number" min={0} value={line.proposedCount}
                onChange={(e) => onQty(Math.max(0, Number(e.target.value)))}
                className="w-14 rounded-md border border-[#00badc]/40 bg-[#e9f7fb]/50 px-1.5 py-1 text-right text-sm tabular-nums focus:border-[#00badc] focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              × SF
              <span className="flex flex-col">
                <input
                  type="number" min={1} value={line.unitSF}
                  onChange={(e) => onSf(e.target.value === "" ? null : Number(e.target.value))}
                  className="w-[70px] rounded-md border border-[#00badc]/40 bg-[#e9f7fb]/50 px-1.5 py-1 text-right text-sm tabular-nums focus:border-[#00badc] focus:outline-none"
                />
              </span>
            </label>
            {dims(line.unitSF) && <span className="text-[11px] font-medium text-[#0089a3]">{dims(line.unitSF)}</span>}
          </>
        )}
        <span className="ml-auto text-sm font-bold tabular-nums text-slate-900">
          {(line.proposedCount * line.unitSF).toLocaleString()} SF
        </span>
      </div>

      {alloc.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-4 py-2">
          {alloc.map(([name, n]) => (
            <span key={name} className="rounded-full bg-[#00badc]/10 px-2 py-0.5 text-[11px] font-medium text-[#0089a3]">{name} · {n}</span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Focus view: the dense table ───────────────────────────────────────── */

function FocusTable({
  d, baseOf, onSf, onQty, filter,
}: {
  d: NonNullable<ReturnType<typeof buildDeliverable>>
  baseOf: (k: string) => ComparisonLine | undefined
  onSf: (k: string, n: number | null) => void
  onQty: (k: string, n: number) => void
  filter: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
            <th className="px-4 py-2.5 font-semibold">Space</th>
            <th className="px-3 py-2.5 font-semibold">Ratio</th>
            <th className="px-3 py-2.5 text-right font-semibold">Today</th>
            <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
            <th className="px-3 py-2.5 text-right font-semibold">Unit SF</th>
            <th className="px-3 py-2.5 font-semibold">Footprint</th>
            <th className="px-4 py-2.5 text-right font-semibold">Total SF</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 tabular-nums">
          {d.categories.map((c) => {
            const visible = c.lines.filter((l) => (l.proposedCount > 0 || l.existingCount > 0 || l.key.startsWith("studio:")) && l.label.toLowerCase().includes(filter.toLowerCase()))
            if (!visible.length) return null
            return (
              <FocusRows key={c.name} name={c.name} circ={c.circulationSF} lines={visible} baseOf={baseOf} onSf={onSf} onQty={onQty} />
            )
          })}
          <tr className="bg-slate-50 font-semibold">
            <td className="px-4 py-2.5" colSpan={6}>Gross usable (net + circulation)</td>
            <td className="px-4 py-2.5 text-right">{d.totals.grossUsableSF.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function FocusRows({
  name, circ, lines, baseOf, onSf, onQty,
}: {
  name: string
  circ: number
  lines: ComparisonLine[]
  baseOf: (k: string) => ComparisonLine | undefined
  onSf: (k: string, n: number | null) => void
  onQty: (k: string, n: number) => void
}) {
  return (
    <>
      <tr className="bg-[#00badc]/[0.06]">
        <td className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#0089a3]" colSpan={7}>{name}</td>
      </tr>
      {lines.map((l) => {
        const b = baseOf(l.key)
        return (
          <tr key={l.key}>
            <td className="px-4 py-1.5 font-medium text-slate-900">
              <span className="mr-1.5 inline-flex gap-1 align-middle">
                {b && l.unitSF !== b.unitSF && <Dot c="#00badc" />}
                {b && l.proposedCount !== b.proposedCount && <Dot c="#8b5cf6" />}
              </span>
              {l.label}
            </td>
            <td className="px-3 py-1.5 text-xs text-slate-500">{l.ratio ?? "—"}</td>
            <td className="px-3 py-1.5 text-right text-slate-500">{l.existingCount || "—"}</td>
            <td className="px-3 py-1.5 text-right">
              <input type="number" min={0} value={l.proposedCount} onChange={(e) => onQty(l.key, Math.max(0, Number(e.target.value)))}
                className="w-14 rounded-md border border-[#00badc]/30 bg-[#e9f7fb]/40 px-1.5 py-0.5 text-right tabular-nums focus:border-[#00badc] focus:outline-none" />
            </td>
            <td className="px-3 py-1.5 text-right">
              <input type="number" min={1} value={l.unitSF} onChange={(e) => onSf(l.key, e.target.value === "" ? null : Number(e.target.value))}
                className="w-[70px] rounded-md border border-[#00badc]/30 bg-[#e9f7fb]/40 px-1.5 py-0.5 text-right tabular-nums focus:border-[#00badc] focus:outline-none" />
            </td>
            <td className="px-3 py-1.5 text-xs text-[#0089a3]">{dims(l.unitSF) ?? ""}</td>
            <td className="px-4 py-1.5 text-right font-semibold">{(l.proposedCount * l.unitSF).toLocaleString()}</td>
          </tr>
        )
      })}
      <tr className="text-slate-400">
        <td className="px-4 py-1 text-xs" colSpan={6}>{name} circulation</td>
        <td className="px-4 py-1 text-right text-xs">{circ.toLocaleString()}</td>
      </tr>
    </>
  )
}

/* ── Survey drawer: everything from intake ─────────────────────────────── */

function SurveyDrawer({ result, tab }: { result: SurveyResult; tab: "people" | "answers" | "existing" }) {
  if (tab === "people") {
    return (
      <div className="space-y-3">
        {result.people.departments.map((dep) => (
          <div key={dep.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{dep.name}</span>
              <span className="text-xs tabular-nums text-slate-400">{dep.headcount}{dep.futureHeadcount && dep.futureHeadcount !== dep.headcount ? ` → ${dep.futureHeadcount}` : ""}</span>
            </div>
            {(dep.employees?.length ?? 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {dep.employees!.map((e) => (
                  <span key={e.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${e.isLeader ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-300" : "bg-slate-100 text-slate-600"}`}>
                    {e.isLeader && <Crown className="h-2.5 w-2.5" />}{e.name || "Unnamed"}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }
  if (tab === "answers") {
    const g = result.goals
    const q = result.qualitative
    const sp = result.special
    return (
      <div className="space-y-3 text-sm">
        {g && (
          <Block label="Goals">
            <div className="flex flex-wrap gap-1">
              {g.motivators.map((m) => (
                <span key={m} className="rounded-full bg-[#00badc]/10 px-2 py-0.5 text-[11px] font-medium text-[#0089a3]">
                  {GOAL_MOTIVATORS.find((x) => x.id === m)?.label ?? m}
                </span>
              ))}
            </div>
            {g.posture && <p className="mt-1.5 text-xs text-slate-500">Posture: {SPACE_POSTURES.find((x) => x.id === g.posture)?.label ?? g.posture}</p>}
          </Block>
        )}
        <Block label="Cadence">
          <p className="text-xs text-slate-600">{result.work.daysInOffice} days/week average · {result.work.fullyRemote} fully remote</p>
        </Block>
        {result.spaces.officePlacement && <Block label="Office placement"><p className="text-xs capitalize text-slate-600">{result.spaces.officePlacement}</p></Block>}
        {q.loves && <Block label="What's working"><p className="text-xs leading-relaxed text-slate-600">{q.loves}</p></Block>}
        {q.painPoints && <Block label="Pain points"><p className="text-xs leading-relaxed text-slate-600">{q.painPoints}</p></Block>}
        {q.imbalances && <Block label="Imbalances"><p className="text-xs leading-relaxed text-slate-600">{q.imbalances}</p></Block>}
        {sp.equipment && <Block label="Equipment"><p className="text-xs leading-relaxed text-slate-600">{sp.equipment}</p></Block>}
        {sp.security && <Block label="Security"><p className="text-xs leading-relaxed text-slate-600">{sp.security}</p></Block>}
        {sp.storage && <Block label="Storage"><p className="text-xs leading-relaxed text-slate-600">{sp.storage}</p></Block>}
        {sp.wishlist && <Block label="Wishlist"><p className="text-xs leading-relaxed text-slate-600">{sp.wishlist}</p></Block>}
      </div>
    )
  }
  const ex = result.existing ?? {}
  return (
    <div className="space-y-3 text-sm">
      <Block label="Counts today">
        <p className="text-xs text-slate-600">
          {ex.existingWorkstations ?? "—"} workstations · {ex.existingOffices ?? "—"} offices
        </p>
      </Block>
      <Block label="Standards">
        <p className="text-xs text-slate-600">
          Workstation {ex.workstationSF ? `${ex.workstationSF} SF (${dims(ex.workstationSF) ?? "custom"})` : "—"} ·
          Office {ex.officeSF ? ` ${ex.officeSF} SF (${dims(ex.officeSF) ?? "custom"})` : " —"}
        </p>
      </Block>
      {(ex.workstationMix?.length ?? 0) > 0 && (
        <Block label="Workstation size mix">
          {ex.workstationMix!.map((m, i) => (
            <p key={i} className="text-xs text-slate-600">{m.count} × {m.sf} SF ({dims(m.sf) ?? "custom"}){m.note ? ` — ${m.note}` : ""}</p>
          ))}
        </Block>
      )}
      {(ex.officeMix?.length ?? 0) > 0 && (
        <Block label="Office size mix">
          {ex.officeMix!.map((m, i) => (
            <p key={i} className="text-xs text-slate-600">{m.count} × {m.sf} SF ({dims(m.sf) ?? "custom"}){m.note ? ` — ${m.note}` : ""}</p>
          ))}
        </Block>
      )}
      {Object.keys(ex.existingCollab ?? {}).length > 0 && (
        <Block label="Collaboration today">
          {Object.entries(ex.existingCollab!).map(([k, v]) => <p key={k} className="text-xs text-slate-600">{v} × {k}</p>)}
        </Block>
      )}
      {Object.keys(ex.existingSupport ?? {}).length > 0 && (
        <Block label="Support today">
          {Object.entries(ex.existingSupport!).map(([k, v]) => <p key={k} className="text-xs text-slate-600">{v} × {k}</p>)}
        </Block>
      )}
    </div>
  )
}

/* ── Small pieces ──────────────────────────────────────────────────────── */

function Dot({ c, title }: { c: string; title?: string }) {
  return <span title={title} className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-[#00badc]/10 hover:text-[#0089a3]">
      {children}
    </button>
  )
}

function DrawerBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active ? "border-[#00badc]/50 bg-[#00badc]/10 text-slate-900" : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800"
      }`}>
      {icon} {children}
    </button>
  )
}

function DrawerTitle({ icon, title, onClose }: { icon: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-sm font-bold">{icon} {title}</h3>
      <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
    </div>
  )
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      {children}
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium text-slate-800">{v}</span>
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
