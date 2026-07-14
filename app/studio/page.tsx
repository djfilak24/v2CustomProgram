"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import {
  Monitor, KeyRound, FileSpreadsheet, RefreshCw, Undo2, Redo2, Search, ExternalLink, Eye, Copy, Trash2,
  Crown, AlertTriangle, ClipboardList, Users, LayoutGrid, Table2, Presentation, CheckCircle2, X,
  Map as MapIcon, Settings2, Plus, Minus, TrendingUp, TrendingDown, ArrowRightLeft, PieChart, Gauge,
} from "lucide-react"
import { buildDeliverable, CATEGORY_COLORS, DEFAULT_FACTORS, type DeliverableOverrides, type DeliverableAddition, type DeliverableFactors } from "@/lib/survey/deliverable"
import { ProgramMapView } from "@/components/survey/program-map"
import { exportFitPlanningPackage } from "@/lib/survey/fitPlanning"
import { lineGaps, type ComparisonLine, type CompCategory } from "@/lib/survey/comparison"
import { COLLAB_CATALOG, SUPPORT_CATALOG, type CatalogSpace } from "@/lib/survey/catalog"
import { SpaceDetailModal } from "@/components/survey/space-detail-modal"
import { WORKSTATION_SIZES, OFFICE_SIZES, SURVEY_STEPS, GOAL_MOTIVATORS, SPACE_POSTURES } from "@/lib/survey/sections"
import { resolveSeating, applyDeptMoves, type SeatPlacement, type SeatingPatch, type ResolvedSeating } from "@/lib/survey/seating"
import { isNelsonMode, nelsonCode } from "@/lib/nelsonMode"
import { loadSurveySeed } from "@/lib/survey/seedStorage"
import { demoResult } from "@/lib/survey/demo-scenarios"
import type { SurveyResult } from "@/lib/survey/types"

interface EngRow { token: string; clientName: string; status: string; hasResult: boolean }
interface SeatGroup { dept: string; names: string[]; extra: number }
type View = "workbench" | "focus" | "briefing" | "people"
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
  const [factors, setFactors] = useState<DeliverableFactors>({})
  /** Department Manager moves — office/desk picks that override the intake. */
  const [peoplePatch, setPeoplePatch] = useState<SeatingPatch>({})
  /** Department Manager moves — person id → destination department id. */
  const [deptMoves, setDeptMoves] = useState<Record<string, string>>({})
  /** Studio renames — comparison line key → display label (baseline lines only; additions carry their own label). */
  const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>({})

  const [view, setView] = useState<View>("workbench")
  const [drawer, setDrawer] = useState<Drawer>(null)
  const [surveyTab, setSurveyTab] = useState<"people" | "answers" | "existing">("people")
  const [filter, setFilter] = useState("")
  const [detail, setDetail] = useState<CatalogSpace | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const sessionToken = useRef<string | null>(null)
  const saveTimer = useRef<number | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  // Display toggles (the old canvas's show/hide dials, reborn in settings)
  const [showDeptChips, setShowDeptChips] = useState(true)
  const [showRatios, setShowRatios] = useState(true)
  /** Workbench detail layers: full = every connected data point; compact = the numbers. */
  const [compactCards, setCompactCards] = useState(false)
  /** Per-category card ↔ table pivot in the Workbench. */
  const [tableCats, setTableCats] = useState<Record<string, boolean>>({})
  /** Left rail: which readout leads the hero — designers vary on this. */
  const [heroKpi, setHeroKpi] = useState<"gross" | "rentable">("gross")
  /** Left rail tab — KPIs (default) or the allocation chart. */
  const [railTab, setRailTab] = useState<"kpis" | "allocation">("kpis")

  // ── Undo / redo — the session's working state, time-travelable ────────────
  type Snap = {
    overrides: DeliverableOverrides; counts: Record<string, number>; additions: DeliverableAddition[]
    notes: Record<string, string>; resolvedGaps: Record<string, boolean>; factors: DeliverableFactors
    peoplePatch: SeatingPatch; deptMoves: Record<string, string>; labelOverrides: Record<string, string>
  }
  const history = useRef<{ past: Snap[]; future: Snap[]; skip: boolean }>({ past: [], future: [], skip: false })
  const [histVer, setHistVer] = useState(0) // re-render hook for disabled states
  useEffect(() => {
    const h = history.current
    if (h.skip) { h.skip = false; return }
    const snap: Snap = { overrides, counts, additions, notes, resolvedGaps, factors, peoplePatch, deptMoves, labelOverrides }
    const last = h.past[h.past.length - 1]
    if (last && JSON.stringify(last) === JSON.stringify(snap)) return
    h.past.push(snap)
    if (h.past.length > 60) h.past.shift()
    h.future = []
    setHistVer((v) => v + 1)
  }, [overrides, counts, additions, notes, resolvedGaps, factors, peoplePatch, deptMoves, labelOverrides])
  const applySnap = (s: Snap) => {
    history.current.skip = true
    setOverrides(s.overrides); setCounts(s.counts); setAdditions(s.additions)
    setNotes(s.notes); setResolvedGaps(s.resolvedGaps); setFactors(s.factors)
    setPeoplePatch(s.peoplePatch ?? {})
    setDeptMoves(s.deptMoves ?? {}); setLabelOverrides(s.labelOverrides ?? {})
    setHistVer((v) => v + 1)
  }
  const undo = () => {
    const h = history.current
    if (h.past.length < 2) return
    h.future.push(h.past.pop()!)
    applySnap(h.past[h.past.length - 1])
  }
  const redo = () => {
    const h = history.current
    const nxt = h.future.pop()
    if (!nxt) return
    h.past.push(nxt)
    applySnap(nxt)
  }
  void histVer

  useEffect(() => { setNelson(isNelsonMode()) }, [])

  // Close the settings menu on any click outside it. (A fixed backdrop can't
  // work here: the header's backdrop-blur makes it the containing block for
  // fixed descendants, clipping the overlay to the header strip.)
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [menuOpen])

  useEffect(() => {
    if (!nelson) return
    fetch("/api/engagements", { headers: { "x-nelson-code": nelsonCode() ?? "" } })
      .then(async (r) => (r.ok ? setRows((await r.json()).filter((x: EngRow) => x.hasResult)) : undefined))
      .catch(() => {})
  }, [nelson])

  useEffect(() => {
    if (!nelson) return
    sessionToken.current = null
    history.current = { past: [], future: [], skip: false }
    setOverrides({}); setCounts({}); setAdditions([]); setNotes({}); setResolvedGaps({}); setFactors({}); setPeoplePatch({})
    setDeptMoves({}); setLabelOverrides({})
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
        if (e.result) {
          setResult(e.result)
          // The persisted session is the truth of the last working meeting;
          // legacy overrides are the fallback for pre-session engagements.
          const s = e.session
          setOverrides(s?.overrides ?? e.overrides ?? {})
          setCounts(s?.counts ?? {})
          setAdditions(s?.additions ?? [])
          setNotes(s?.notes ?? {})
          setResolvedGaps(s?.resolvedGaps ?? {})
          setFactors(s?.factors ?? {})
          setPeoplePatch(s?.people ?? {})
          setDeptMoves(s?.deptMoves ?? {})
          setLabelOverrides(s?.labels ?? {})
          sessionToken.current = source
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nelson, source])

  // Every session edit persists (debounced) — a refresh never loses a meeting,
  // and the client's deck renders exactly what the session decided (A1/A2).
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  useEffect(() => {
    if (!sessionToken.current || sessionToken.current !== source) return
    setSaveState("saving")
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      fetch(`/api/engagements/${source}`, {
        method: "PATCH",
        headers: { "x-nelson-code": nelsonCode() ?? "" },
        body: JSON.stringify({ session: { overrides, counts, additions, notes, resolvedGaps, factors, people: peoplePatch, deptMoves, labels: labelOverrides } }),
      })
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("idle"))
    }, 700)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides, counts, additions, notes, resolvedGaps, factors, peoplePatch, deptMoves, labelOverrides])

  // The Department Manager's dept-to-dept moves apply on top of the intake,
  // never mutating it — everything downstream (program math, seating, map,
  // drawers) reads this view so a move is consistent everywhere in the Studio.
  const viewResult = useMemo(() => (result ? applyDeptMoves(result, deptMoves) : null), [result, deptMoves])

  const d = useMemo(
    () => (viewResult ? buildDeliverable(viewResult, overrides, counts, additions, factors, peoplePatch, labelOverrides) : null),
    [viewResult, overrides, counts, additions, factors, peoplePatch, labelOverrides],
  )
  const baseline = d?.comp.lines ?? []
  const baseOf = (key: string) => baseline.find((l) => l.key === key)

  // ── Derived: who gets the seats — the one seating resolver (lib/survey/seating),
  // also used by the program map, so the Department Manager's moves and the
  // whiteboard never drift apart.
  const resolved = useMemo(
    () => (viewResult ? resolveSeating(viewResult, peoplePatch) : { byId: {}, byDept: {} }),
    [viewResult, peoplePatch],
  )
  const seats = useMemo(() => {
    const offices: SeatGroup[] = []
    const desks: SeatGroup[] = []
    if (!viewResult) return { byId: resolved.byId, offices, desks }
    for (const dep of viewResult.people.departments) {
      const rows = resolved.byDept[dep.id] ?? []
      const nOff = viewResult.spaces.privateOfficesByDept[dep.id] ?? 0
      const nDesk = viewResult.work.dedicatedByDept?.[dep.id] ?? 0
      const offNames = rows.filter((r) => r.placement === "office")
      const deskNames = rows.filter((r) => r.placement === "desk")
      if (nOff > 0 || offNames.length > 0)
        offices.push({ dept: dep.name, names: offNames.map((e) => e.name), extra: Math.max(0, nOff - offNames.length) })
      if (nDesk > 0 || deskNames.length > 0)
        desks.push({ dept: dep.name, names: deskNames.map((e) => e.name), extra: Math.max(0, nDesk - deskNames.length) })
    }
    return { byId: resolved.byId, offices, desks }
  }, [viewResult, resolved])

  // Move a person office ↔ desk ↔ flex. Snapshots everyone's CURRENT resolved
  // placement as the new explicit baseline before applying the one move — so
  // the first move ever made never silently un-seats everyone else who was
  // still riding the leaders-first convention.
  const moveSeat = (id: string, next: SeatPlacement) => {
    if (!viewResult) return
    const officeIds = new Set<string>()
    const deskIds = new Set<string>()
    for (const dep of viewResult.people.departments) {
      for (const row of resolved.byDept[dep.id] ?? []) {
        if (row.id === id) continue
        if (row.placement === "office") officeIds.add(row.id)
        else if (row.placement === "desk") deskIds.add(row.id)
      }
    }
    if (next === "office") officeIds.add(id)
    else if (next === "desk") deskIds.add(id)
    setPeoplePatch({ officeEmployeeIds: [...officeIds], deskEmployeeIds: [...deskIds] })
  }

  // Move a person to a different department — headcounts on both sides shift
  // with them (they drive the engine), logged as a decision, undoable.
  const moveDept = (personId: string, toDeptId: string) => {
    setDeptMoves((p) => ({ ...p, [personId]: toDeptId }))
  }

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
    // Planning-dial deviations ARE decisions — the honest levers, on the record.
    const dialLabel: Record<string, string> = {
      circIndividual: "Circulation — individual", circCollab: "Circulation — collaboration",
      circSupport: "Circulation — support", rentable: "Load factor",
    }
    for (const [k, v] of Object.entries(factors)) {
      const def = DEFAULT_FACTORS[k as keyof typeof DEFAULT_FACTORS]
      if (v !== undefined && v !== def) {
        out.push({
          id: `dial:${k}`,
          text: k === "rentable"
            ? `${dialLabel[k]} ×${(1 + def).toFixed(2)} → ×${(1 + v).toFixed(2)}`
            : `${dialLabel[k]} ${Math.round(def * 100)}% → ${Math.round(v * 100)}%`,
        })
      }
    }
    // Department Manager seat moves — the session's placement vs the intake's own.
    if (viewResult && Object.keys(peoplePatch).length > 0) {
      const before = resolveSeating(viewResult)
      for (const dep of viewResult.people.departments) {
        for (const row of resolved.byDept[dep.id] ?? []) {
          const was = before.byId[row.id] ?? "flex"
          if (was !== row.placement)
            out.push({ id: `seat:${row.id}`, text: `${row.name} (${dep.name}) — ${was} → ${row.placement}` })
        }
      }
    }
    // Department Manager reassignments — who moved departments, and where from.
    if (result && Object.keys(deptMoves).length > 0) {
      for (const [personId, toDeptId] of Object.entries(deptMoves)) {
        const to = viewResult?.people.departments.find((dep) => dep.id === toDeptId)
        const from = result.people.departments.find((dep) => (dep.employees ?? []).some((e) => e.id === personId))
        const person = from?.employees?.find((e) => e.id === personId)
        if (to && from && person)
          out.push({ id: `dept:${personId}`, text: `${person.name} — ${from.name} → ${to.name}` })
      }
    }
    // Renames — the session's label vs the engine's own.
    for (const [key, label] of Object.entries(labelOverrides)) {
      const orig = baseline.find((l) => l.key === key)
      if (orig && orig.label !== label)
        out.push({ id: `label:${key}`, text: `"${orig.label}" renamed to "${label}"` })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, overrides, counts, additions, resolvedGaps, factors, peoplePatch, deptMoves, labelOverrides, resolved, viewResult, result, baseline])

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
                {([["workbench", LayoutGrid, "Workbench"], ["focus", Table2, "Focus"], ["people", Users, "People"], ["briefing", Presentation, "Briefing"]] as const).map(([id, Icon, label]) => (
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
                <span className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    onClick={undo} disabled={history.current.past.length < 2} title="Undo (session edit)"
                    className="flex h-6 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-30"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={redo} disabled={history.current.future.length === 0} title="Redo"
                    className="flex h-6 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-30"
                  >
                    <Redo2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              <DrawerBtn active={showMap} onClick={() => setShowMap(!showMap)} icon={<MapIcon className="h-3.5 w-3.5" />}>
                Map
              </DrawerBtn>
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
              {sessionToken.current === source && source && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${saveState === "saved" ? "text-emerald-600" : "text-slate-400"}`}>
                  {saveState === "saving" ? (
                    <><RefreshCw className="h-3 w-3 animate-spin" /> saving…</>
                  ) : (
                    <><CheckCircle2 className="h-3 w-3" /> session saved</>
                  )}
                </span>
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
                onClick={() => viewResult && d && exportFitPlanningPackage(viewResult, d, {
                  decisions: decisions.map((x) => ({ text: x.text, note: notes[x.id] })),
                  gaps: gaps.map((g) => ({ line: g.line, message: g.message, resolved: !!resolvedGaps[g.id], note: notes[`gapnote:${g.id}`] })),
                })}
                disabled={!d}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0e1a2e] px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-40"
              >
                <FileSpreadsheet className="h-4 w-4" /> Fit-Planning Package
              </button>

              {/* Settings — display toggles + open-elsewhere links */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  title="Display & links"
                  aria-label="Display & links"
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                    menuOpen ? "border-[#00badc]/50 bg-[#00badc]/10 text-slate-900" : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800"
                  }`}
                >
                  <Settings2 className="h-4 w-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                      <p className="px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Display</p>
                      <MenuToggle on={showDeptChips} onClick={() => setShowDeptChips((v) => !v)}>Department chips</MenuToggle>
                      <MenuToggle on={showRatios} onClick={() => setShowRatios((v) => !v)}>Validation triangle (engine/survey/today)</MenuToggle>
                      <MenuToggle on={compactCards} onClick={() => setCompactCards((v) => !v)}>Compact cards</MenuToggle>
                      <div className="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-slate-700">
                        <span>Rail hero KPI</span>
                        <span className="flex overflow-hidden rounded-lg border border-slate-200 text-[11px] font-semibold">
                          {(["gross", "rentable"] as const).map((k) => (
                            <button
                              key={k}
                              onClick={() => setHeroKpi(k)}
                              className={`px-2 py-1 capitalize transition-colors ${heroKpi === k ? "bg-[#00badc]/15 text-[#0089a3]" : "text-slate-400 hover:bg-slate-50"}`}
                            >
                              {k}
                            </button>
                          ))}
                        </span>
                      </div>
                      <p className="mt-2 border-t border-slate-100 px-2 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Planning dials — logged as decisions</p>
                      <Dial label="Circulation · individual" pct value={factors.circIndividual ?? DEFAULT_FACTORS.circIndividual}
                        onChange={(v) => setFactors((p) => ({ ...p, circIndividual: v }))} />
                      <Dial label="Circulation · collaboration" pct value={factors.circCollab ?? DEFAULT_FACTORS.circCollab}
                        onChange={(v) => setFactors((p) => ({ ...p, circCollab: v }))} />
                      <Dial label="Circulation · support" pct value={factors.circSupport ?? DEFAULT_FACTORS.circSupport}
                        onChange={(v) => setFactors((p) => ({ ...p, circSupport: v }))} />
                      <Dial label="Load factor (rentable ×)" value={factors.rentable ?? DEFAULT_FACTORS.rentable}
                        onChange={(v) => setFactors((p) => ({ ...p, rentable: v }))} />
                      <p className="mt-2 border-t border-slate-100 px-2 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Open elsewhere</p>
                      {source !== "seed" && source !== "demo" && (
                        <>
                          <MenuLink href={`/command/${source}`}>Command Center</MenuLink>
                          <MenuLink href={`/d/${source}`}>Client deliverable</MenuLink>
                          <MenuLink href={`/brief/${source}`}>Designer brief</MenuLink>
                        </>
                      )}
                      <MenuLink href="/review">Program review</MenuLink>
                      <MenuLink href="/canvas">Legacy canvas (frozen)</MenuLink>
                      {editedCount > 0 && (
                        <div className="mt-2 border-t border-slate-100 pt-1">
                          <button
                            onClick={() => { setOverrides({}); setCounts({}); setAdditions([]); setFactors({}); setPeoplePatch({}); setDeptMoves({}); setLabelOverrides({}); setMenuOpen(false) }}
                            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                          >
                            <Undo2 className="h-3 w-3" /> Reset program edits
                          </button>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {!d || !result || !viewResult ? (
          <p className="p-16 text-center text-slate-400"><RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />Loading program…</p>
        ) : (
          <main className={`mx-auto grid max-w-[1900px] gap-6 px-6 py-6 ${
            briefing ? "grid-cols-[360px_minmax(0,1fr)]" : drawer ? "grid-cols-[280px_minmax(0,1fr)_360px]" : "grid-cols-[280px_minmax(0,1fr)]"
          }`}>
            {/* ── Left rail: docked, tabbed, one clear number hierarchy ──────── */}
            <aside className="sticky top-[57px] h-[calc(100vh-73px)] self-start overflow-y-auto rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className={briefing ? "text-xl font-bold" : "text-lg font-bold"}>{d.clientName}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="tabular-nums">{d.current} people today</span>
                  <ArrowRightLeft className="h-3 w-3 text-slate-300" />
                  <span className="tabular-nums">{d.future} at plan</span>
                  {d.future !== d.current && (
                    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${d.future > d.current ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {d.future > d.current ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {d.future > d.current ? "+" : ""}{Math.round(((d.future - d.current) / (d.current || 1)) * 100)}%
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{d.daysInOffice} days/wk</p>
              </div>

              {/* Rail tabs — KPIs (today's read) / Allocation (the chart) */}
              <div className="flex gap-1 border-b border-slate-100 px-3 py-2">
                {([["kpis", Gauge, "KPIs"], ["allocation", PieChart, "Allocation"]] as const).map(([id, Icon, label]) => (
                  <button
                    key={id}
                    onClick={() => setRailTab(id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      railTab === id ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>

              {railTab === "kpis" ? (
                <div className="p-5">
                  {(() => {
                    const primary = heroKpi === "gross" ? d.totals.grossUsableSF : d.totals.estimatedRentableSF
                    const secondary = heroKpi === "gross" ? d.totals.estimatedRentableSF : d.totals.grossUsableSF
                    const primaryLabel = heroKpi === "gross" ? "Gross usable" : "Est. rentable"
                    const secondaryLabel = heroKpi === "gross" ? "Est. rentable" : "Gross usable"
                    const grossDelta = d.totals.existingSF > 0 ? d.totals.grossUsableSF - d.totals.existingSF : null
                    return (
                      <>
                        {/* Tier 1 — the magic number, whichever the designer leads with */}
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0089a3]">{primaryLabel}</p>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <p className={`${briefing ? "text-5xl" : "text-4xl"} font-bold tabular-nums tracking-tight`}>
                            {primary.toLocaleString()}<span className="ml-1 text-base font-medium text-slate-400">SF</span>
                          </p>
                          {heroKpi === "gross" && grossDelta !== null && (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${grossDelta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-emerald-50 text-emerald-700"}`}>
                              {grossDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {grossDelta >= 0 ? "+" : ""}{grossDelta.toLocaleString()} vs today
                            </span>
                          )}
                        </div>
                        {/* right next to it — the counterpart KPI, not buried */}
                        <p className="mt-1.5 text-sm text-slate-500">
                          {secondaryLabel} <b className="tabular-nums text-slate-700">{secondary.toLocaleString()}</b> SF
                          {heroKpi === "gross" && <span className="text-slate-400"> · ×{(1 + d.totals.rentableFactor).toFixed(2)} load</span>}
                          {heroKpi === "rentable" && grossDelta !== null && (
                            <span className={`ml-1.5 font-semibold ${grossDelta >= 0 ? "text-emerald-600" : "text-emerald-600"}`}>
                              ({grossDelta >= 0 ? "+" : ""}{grossDelta.toLocaleString()} vs today)
                            </span>
                          )}
                        </p>

                        {result?.goals?.targetSF ? (
                          <p className="mt-3 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-800">
                            Their number: {result.goals.targetSF.toLocaleString()} SF
                            {result.goals.targetSource ? ` (${result.goals.targetSource})` : ""} ·{" "}
                            <span className={result.goals.targetSF - d.totals.grossUsableSF >= 0 ? "text-emerald-700" : "text-rose-700"}>
                              {result.goals.targetSF - d.totals.grossUsableSF >= 0 ? "+" : ""}
                              {(result.goals.targetSF - d.totals.grossUsableSF).toLocaleString()} SF
                            </span>
                          </p>
                        ) : null}

                        {/* Tier 2 — SF/person outranks circulation; it's the number a
                            client actually reasons about, so it gets real size. */}
                        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">SF / person</p>
                            <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{d.totals.sfPerPerson}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">People at plan</p>
                            <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{d.future}</p>
                          </div>
                        </div>

                        {/* Tier 3 — the technical breakdown, demoted to small rows */}
                        <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-[13px] tabular-nums text-slate-500">
                          <Row k="Net program" v={`${d.totals.proposedNetSF.toLocaleString()}`} />
                          <Row k="Circulation" v={`${d.totals.circulationSF.toLocaleString()}`} />
                          {Object.keys(factors).length > 0 && (
                            <p className="pt-1 text-[11px] font-medium text-[#0089a3]">planning dials tuned — on the decision log</p>
                          )}
                        </div>
                      </>
                    )
                  })()}
                </div>
              ) : (
                <div className="p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Space allocation</h3>
                  {(() => {
                    const target = result?.goals?.targetSF
                    const max = Math.max(d.totals.grossUsableSF, target ?? 0) || 1
                    return (
                      <div className="relative mt-3">
                        <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" style={{ width: `${(d.totals.grossUsableSF / max) * 100}%` }}>
                          {d.categories.filter((c) => c.proposedTotalSF > 0).map((c) => (
                            <span
                              key={c.name}
                              title={`${c.name} · ${c.proposedTotalSF.toLocaleString()} SF incl. circulation`}
                              className="h-full rounded-[2px] first:rounded-l-full last:rounded-r-full"
                              style={{
                                width: `${(c.proposedTotalSF / (d.totals.grossUsableSF || 1)) * 100}%`,
                                backgroundColor: CATEGORY_COLORS[c.name].accent,
                              }}
                            />
                          ))}
                        </div>
                        {target ? (
                          <span
                            title={`Their number · ${target.toLocaleString()} SF`}
                            className="absolute -inset-y-1 w-[2.5px] rounded-full bg-[#0e1a2e]"
                            style={{ left: `${Math.min(99.5, (target / max) * 100)}%` }}
                          />
                        ) : null}
                      </div>
                    )
                  })()}
                  <div className="mt-3 space-y-2 text-[13px] tabular-nums">
                    {d.categories.map((c) => (
                      <div key={c.name} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: CATEGORY_COLORS[c.name].accent }} />
                        <span className="text-slate-600">{c.name}</span>
                        <span className="ml-auto font-medium text-slate-800">{c.proposedTotalSF.toLocaleString()} SF</span>
                        <span className="w-9 shrink-0 text-right text-[11px] text-slate-400">
                          {Math.round((c.proposedTotalSF / (d.totals.grossUsableSF || 1)) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Briefing: the session's story rides the summary column */}
              {briefing && decisions.length > 0 && (
                <div className="border-t border-slate-100 p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Decided together, today</h3>
                  <div className="mt-3 space-y-2">
                    {decisions.slice(0, 5).map((x) => (
                      <p key={x.id} className="flex gap-2 text-[13px] leading-snug text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {x.text}
                      </p>
                    ))}
                    {decisions.length > 5 && <p className="text-xs text-slate-400">+ {decisions.length - 5} more on the record</p>}
                  </div>
                </div>
              )}
            </aside>

            {/* ── Center: the spaces (Workbench cards / Focus table / Briefing) ─ */}
            <section>
              {showMap && (
                <div className="mb-8">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <h2 className="text-xl font-bold tracking-tight">Program map</h2>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-slate-400">Live from intake + session edits.</p>
                      <button
                        onClick={() => mapRef.current?.requestFullscreen?.().catch(() => {})}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#00badc]/50 hover:text-[#0089a3]"
                        title="Full-screen for the room / Zoom share"
                      >
                        <Presentation className="h-3.5 w-3.5" /> Present
                      </button>
                    </div>
                  </div>
                  <div ref={mapRef} className="bg-white">
                    <ProgramMapView map={d.map} />
                  </div>
                </div>
              )}
              {view === "people" ? (
                <>
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="text-xl font-bold tracking-tight">People</h2>
                    <p className="text-xs text-slate-400">
                      Click a placement to move someone — offices and desks recompute live, and the move joins the decision log.
                    </p>
                  </div>
                  {viewResult && (
                    <DepartmentManager
                      result={viewResult} seating={resolved}
                      officesByDept={viewResult.spaces.privateOfficesByDept} desksByDept={viewResult.work.dedicatedByDept ?? {}}
                      onMove={moveSeat} onMoveDept={moveDept}
                    />
                  )}
                </>
              ) : (
              <>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className={briefing ? "text-2xl font-bold tracking-tight" : "text-xl font-bold tracking-tight"}>
                  {briefing ? "Your program" : "Spaces"}
                </h2>
                {!briefing && (
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1"><Dot c="#f43f5e" /> size changed</span>
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
                <FocusTable d={d} baseOf={baseOf} onSf={(k, n) => setSf(k, n)} onQty={(k, n) => setQty(k, n)} filter={filter} showRatios={showRatios} />
              ) : (
                d.categories.map((cat) => {
                  const visible = cat.lines.filter(
                    (l) => (l.proposedCount > 0 || l.existingCount > 0 || l.key.startsWith("studio:")) &&
                      l.label.toLowerCase().includes(filter.toLowerCase()),
                  )
                  if (!visible.length) return null
                  const cc = CATEGORY_COLORS[cat.name]
                  const asTable = !briefing && !!tableCats[cat.name]
                  return (
                    <div key={cat.name} className="mb-8">
                      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em]" style={{ color: cc.text }}>
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cc.accent }} />
                        {cat.name}
                        <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">
                          {cat.proposedTotalSF.toLocaleString()} SF incl. circulation
                        </span>
                        {!briefing && (
                          <button
                            onClick={() => setTableCats((p) => ({ ...p, [cat.name]: !asTable }))}
                            title={asTable ? "Back to cards" : "Pivot this category to a table"}
                            className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            {asTable ? <LayoutGrid className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </h3>
                      {asTable ? (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                          <table className="w-full text-sm">
                            <tbody className="divide-y divide-slate-100 tabular-nums">
                              <FocusRows
                                name={cat.name} colors={cc} circ={cat.circulationSF} lines={visible}
                                baseOf={baseOf} onSf={(k, n) => setSf(k, n)} onQty={(k, n) => setQty(k, n)} showRatios={showRatios}
                              />
                            </tbody>
                          </table>
                        </div>
                      ) : (
                      <div className={`grid gap-3.5 ${briefing ? "xl:grid-cols-2 2xl:grid-cols-3" : "xl:grid-cols-2 2xl:grid-cols-3"}`}>
                        {visible.map((l) => (
                          <SpaceCard
                            key={l.key} line={l} base={baseOf(l.key)} result={viewResult} briefing={briefing}
                            colors={cc} showChips={showDeptChips && !compactCards} showRatios={showRatios && !compactCards}
                            compact={compactCards}
                            people={l.key === "offices" ? seats.offices : l.key === "workstations" ? seats.desks : undefined}
                            onQty={(n) => setQty(l.key, n)}
                            onSf={(n) => setSf(l.key, n)}
                            onInfo={() => setDetail(detailFor(l))}
                            onDuplicate={() => duplicate(l)}
                            onDelete={l.key.startsWith("studio:") ? () => setAdditions((p) => p.filter((a) => a.key !== l.key)) : undefined}
                            onRename={
                              l.key.startsWith("studio:")
                                ? (name) => setAdditions((p) => p.map((a) => (a.key === l.key ? { ...a, label: name } : a)))
                                : (name) => setLabelOverrides((p) => ({ ...p, [l.key]: name }))
                            }
                            onCategory={
                              l.key.startsWith("studio:")
                                ? (category) => setAdditions((p) => p.map((a) => (a.key === l.key ? { ...a, category } : a)))
                                : undefined
                            }
                          />
                        ))}
                        {!briefing && (
                          <button
                            onClick={() => {
                              const key = `studio:custom:${Date.now().toString(36)}`
                              setAdditions((p) => [...p, {
                                key, label: "New space", category: cat.name, unitSF: 100, proposedCount: 1,
                              }])
                            }}
                            className="flex min-h-[104px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-400 transition-colors hover:border-[#00badc]/50 hover:text-[#0089a3]"
                          >
                            <Plus className="h-4 w-4" /> Add custom space
                          </button>
                        )}
                      </div>
                      )}
                    </div>
                  )
                })
              )}
              </>
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
                    <SurveyDrawer result={viewResult} tab={surveyTab} seatOf={seats.byId} />
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

/* ── Department Manager: every person, where they sit, one click to move ── */

function DepartmentManager({
  result, seating, officesByDept, desksByDept, onMove, onMoveDept,
}: {
  result: SurveyResult
  seating: ResolvedSeating
  officesByDept: Record<string, number>
  desksByDept: Record<string, number>
  onMove: (id: string, next: SeatPlacement) => void
  onMoveDept: (id: string, toDeptId: string) => void
}) {
  return (
    <div className="space-y-5">
      {result.people.departments.map((dep) => {
        const rows = seating.byDept[dep.id] ?? []
        const nOff = officesByDept[dep.id] ?? 0
        const nDesk = desksByDept[dep.id] ?? 0
        const offCount = rows.filter((r) => r.placement === "office").length
        const deskCount = rows.filter((r) => r.placement === "desk").length
        const flexCount = rows.filter((r) => r.placement === "flex").length
        const growth = dep.futureHeadcount !== undefined && dep.futureHeadcount !== dep.headcount
        const overOffice = offCount > nOff
        const overDesk = deskCount > nDesk
        return (
          <div key={dep.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{dep.name}</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {dep.headcount} people today
                  {growth && (
                    <> · <span className={dep.futureHeadcount! > dep.headcount ? "text-emerald-600" : "text-amber-600"}>
                      → {dep.futureHeadcount} at plan
                    </span></>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-medium">
                <span className={`rounded-full px-2.5 py-1 ${overOffice ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-600"}`} title="Offices assigned vs planned">
                  {offCount} / {nOff} offices
                </span>
                <span className={`rounded-full px-2.5 py-1 ${overDesk ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-600"}`} title="Dedicated desks assigned vs planned">
                  {deskCount} / {nDesk} desks
                </span>
                {flexCount > 0 && (
                  <span className="rounded-full bg-slate-50 px-2.5 py-1 text-slate-500">{flexCount} shared</span>
                )}
              </div>
            </div>
            {rows.length === 0 ? (
              <p className="mt-3 text-xs text-slate-400">
                No roster captured for this department — allocation is headcount-only ({nOff} offices, {nDesk} dedicated desks planned).
              </p>
            ) : (
              <div className="mt-4 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-1.5 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-sm text-slate-800">
                      {r.isLeader && <Crown className="h-3 w-3 shrink-0 text-amber-500" />}
                      <span className="truncate">{r.name}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <span className="flex overflow-hidden rounded-lg border border-slate-200 bg-white text-[10px] font-semibold">
                        {(["office", "desk", "flex"] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => onMove(r.id, p)}
                            title={`Move to ${p === "flex" ? "shared — no dedicated seat" : p}`}
                            className={`px-2 py-1 capitalize transition-colors ${
                              r.placement === p
                                ? p === "office"
                                  ? "bg-[#2563eb]/12 text-[#1d4ed8]"
                                  : p === "desk"
                                    ? "bg-[#00badc]/15 text-[#0089a3]"
                                    : "bg-slate-200 text-slate-600"
                                : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </span>
                      <span className="relative shrink-0">
                        <select
                          value=""
                          onChange={(e) => { if (e.target.value) onMoveDept(r.id, e.target.value) }}
                          title="Move to a different department"
                          aria-label={`Move ${r.name} to a different department`}
                          className="appearance-none rounded-lg border border-slate-200 bg-white p-1 text-slate-400 hover:border-[#00badc]/50 hover:text-[#0089a3] focus:border-[#00badc] focus:outline-none"
                        >
                          <option value="">···</option>
                          {result.people.departments.filter((other) => other.id !== dep.id).map((other) => (
                            <option key={other.id} value={other.id}>→ {other.name}</option>
                          ))}
                        </select>
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
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

const ADDITION_CATEGORIES: CompCategory[] = ["Workstations", "Offices", "Collaboration", "Support"]

function SpaceCard({
  line, base, result, briefing, colors, showChips, showRatios, compact, people, onQty, onSf, onInfo, onDuplicate, onDelete, onRename, onCategory,
}: {
  line: ComparisonLine
  base?: ComparisonLine
  result: SurveyResult
  briefing: boolean
  colors: { accent: string; text: string; tint: string }
  showChips: boolean
  showRatios: boolean
  /** Compact layer: just the name and the numbers — the fast read. */
  compact?: boolean
  /** Named seat assignments (offices/workstations only) — who actually sits here. */
  people?: SeatGroup[]
  onQty: (n: number) => void
  onSf: (n: number | null) => void
  onInfo: () => void
  onDuplicate: () => void
  onDelete?: () => void
  onRename?: (name: string) => void
  /** Custom (studio-added) cards only — which category's total this counts toward. */
  onCategory?: (category: CompCategory) => void
}) {
  const [who, setWho] = useState(false)
  const deptName = (id: string) => result.people.departments.find((x) => x.id === id)?.name ?? id
  const sfChanged = !!base && line.unitSF !== base.unitSF
  const qtyChanged = !!base && line.proposedCount !== base.proposedCount
  const isAddition = line.key.startsWith("studio:")
  const hasPeople = (people?.length ?? 0) > 0

  // The validation triangle: what the engine recommends, what the client
  // literally asked for, and what they have today — three independent
  // answers to "how many of these should exist?" (Advisory #6.4).
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
  // Support has no per-dept count in the survey — only a must-have flag.
  const supportFlagged = line.category === "Support" && result.spaces.support.includes(line.key.replace(/^support:/, ""))
  const engineCount = base?.proposedCount
  const configuredDelta = engineCount !== undefined ? line.proposedCount - engineCount : 0

  let alloc: [string, number][] = []
  if (line.key === "offices") alloc = Object.entries(result.spaces.privateOfficesByDept).filter(([, v]) => v > 0).map(([k, v]) => [deptName(k), v])
  else if (line.key === "workstations") alloc = Object.entries(result.work.dedicatedByDept ?? {}).filter(([, v]) => v > 0).map(([k, v]) => [deptName(k), v])
  else if (line.category === "Collaboration") {
    const item = result.spaces.collaboration.find((c) => c.type === line.key.replace(/^collab:/, ""))
    alloc = Object.entries(item?.byDept ?? {}).filter(([, v]) => v > 0).map(([k, v]) => [deptName(k), v])
  }

  return (
    <div
      className={`rounded-2xl border bg-white transition-shadow hover:shadow-md ${isAddition ? "border-[#00badc]/40" : "border-slate-200"}`}
      style={{ borderLeft: `3px solid ${colors.accent}` }}
    >
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
          {sfChanged && <Dot c="#f43f5e" title="Unit size changed from ratio baseline" />}
          {qtyChanged && <Dot c="#8b5cf6" title="Quantity changed from ratio baseline" />}
        </span>
        {!briefing && (
          <span className="flex shrink-0 items-center">
            {hasPeople && (
              <IconBtn title="Who gets these seats" onClick={() => setWho((v) => !v)}>
                <Users className={`h-3.5 w-3.5 ${who ? "text-[#0089a3]" : ""}`} />
              </IconBtn>
            )}
            <IconBtn title="About this space" onClick={onInfo}><Eye className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn title="Duplicate — e.g. a second size standard" onClick={onDuplicate}><Copy className="h-3.5 w-3.5" /></IconBtn>
            {onDelete && <IconBtn title="Remove this added line" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 text-red-400" /></IconBtn>}
          </span>
        )}
      </div>

      {/* Custom-card only: which category this counts toward — visible only
          when the card is a Studio addition, so a baseline line can never be
          silently recategorized out of the math it belongs to. */}
      {onCategory && !briefing && (
        <div className="px-4 pb-1">
          <select
            value={line.category}
            onChange={(e) => onCategory(e.target.value as CompCategory)}
            title="Which category's total this space counts toward"
            className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 focus:border-[#00badc] focus:outline-none"
          >
            {ADDITION_CATEGORIES.map((c) => <option key={c} value={c}>counts toward {c}</option>)}
          </select>
        </div>
      )}

      {/* The validation triangle — glanceable, colored, not a run-on line */}
      {showRatios && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2">
          {engineCount !== undefined ? (
            <Token label="Engine" value={engineCount} title="What the planning ratios recommend" />
          ) : (
            <span className="text-[11px] text-slate-400">added in studio</span>
          )}
          {surveyAsk !== null && <Token muted label="You asked" value={surveyAsk} title="What the client's intake literally requested" />}
          {supportFlagged && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700" title="The client flagged this space as must-have">
              flagged by client
            </span>
          )}
          {line.existingCount > 0 && <Token muted label="Today" value={line.existingCount} title="What they have right now" />}
          {engineCount !== undefined && configuredDelta !== 0 && (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700" title="Configured quantity vs. the engine's recommendation">
              {configuredDelta > 0 ? "+" : ""}{configuredDelta} vs engine
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 px-4 py-2.5">
        {briefing ? (
          <span className="text-sm text-slate-600 tabular-nums">{line.proposedCount} × {line.unitSF} SF{dims(line.unitSF) ? ` (${dims(line.unitSF)})` : ""}</span>
        ) : (
          <>
            {/* Qty leads — the count matters more than the unit size */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onQty(Math.max(0, line.proposedCount - 1))}
                aria-label="Decrease quantity"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00badc]/10 text-[#0089a3] transition-colors hover:bg-[#00badc]/20"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input
                type="number" min={0} value={line.proposedCount}
                onChange={(e) => onQty(Math.max(0, Number(e.target.value)))}
                className="w-11 rounded-md border-none bg-transparent text-center text-xl font-bold tabular-nums text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#00badc]/40"
              />
              <button
                onClick={() => onQty(line.proposedCount + 1)}
                aria-label="Increase quantity"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00badc]/10 text-[#0089a3] transition-colors hover:bg-[#00badc]/20"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <label className="flex items-center gap-1 text-[11px] text-slate-400">
              ×
              <input
                type="number" min={1} value={line.unitSF}
                onChange={(e) => onSf(e.target.value === "" ? null : Number(e.target.value))}
                className="w-14 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-right text-xs tabular-nums focus:border-[#00badc] focus:outline-none"
              />
              SF
            </label>
            {!compact && dims(line.unitSF) && <span className="text-[11px] font-medium text-[#0089a3]">{dims(line.unitSF)}</span>}
          </>
        )}
        <span className="ml-auto text-sm font-bold tabular-nums text-slate-900">
          {(line.proposedCount * line.unitSF).toLocaleString()} SF
        </span>
      </div>

      {showChips && alloc.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-4 py-2">
          {alloc.map(([name, n]) => (
            <span key={name} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: colors.tint, color: colors.text }}>
              {name} · {n}
            </span>
          ))}
        </div>
      )}

      {/* Who gets these seats — names by the survey's seating hierarchy */}
      {who && !briefing && !compact && hasPeople && (
        <div className="space-y-1 border-t border-slate-100 px-4 py-2.5">
          {people!.map((p) => (
            <p key={p.dept} className="text-[11px] leading-relaxed text-slate-600">
              <span className="font-semibold text-slate-800">{p.dept}</span>
              {" — "}
              {p.names.join(", ")}
              {p.extra > 0 && `${p.names.length ? " + " : ""}${p.extra} unnamed`}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

/** One validation-triangle token — a labeled, colored figure, not a grey run-on. */
function Token({ label, value, title, muted }: { label: string; value: number; title: string; muted?: boolean }) {
  return (
    <span
      title={title}
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${muted ? "bg-slate-100 text-slate-500" : "bg-[#00badc]/12 text-[#0089a3]"}`}
    >
      {label} <b className="tabular-nums">{value}</b>
    </span>
  )
}

/* ── Focus view: the dense table ───────────────────────────────────────── */

function FocusTable({
  d, baseOf, onSf, onQty, filter, showRatios,
}: {
  d: NonNullable<ReturnType<typeof buildDeliverable>>
  baseOf: (k: string) => ComparisonLine | undefined
  onSf: (k: string, n: number | null) => void
  onQty: (k: string, n: number) => void
  filter: string
  showRatios: boolean
}) {
  const cols = showRatios ? 7 : 6
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
            <th className="px-4 py-2.5 font-semibold">Space</th>
            {showRatios && <th className="px-3 py-2.5 font-semibold">Ratio</th>}
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
              <FocusRows key={c.name} name={c.name} colors={CATEGORY_COLORS[c.name]} circ={c.circulationSF} lines={visible} baseOf={baseOf} onSf={onSf} onQty={onQty} showRatios={showRatios} />
            )
          })}
          <tr className="bg-slate-50 font-semibold">
            <td className="px-4 py-2.5" colSpan={cols - 1}>Gross usable (net + circulation)</td>
            <td className="px-4 py-2.5 text-right">{d.totals.grossUsableSF.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function FocusRows({
  name, colors, circ, lines, baseOf, onSf, onQty, showRatios,
}: {
  name: string
  colors: { accent: string; text: string; tint: string }
  circ: number
  lines: ComparisonLine[]
  baseOf: (k: string) => ComparisonLine | undefined
  onSf: (k: string, n: number | null) => void
  onQty: (k: string, n: number) => void
  showRatios: boolean
}) {
  const cols = showRatios ? 7 : 6
  return (
    <>
      <tr style={{ backgroundColor: colors.tint }}>
        <td className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: colors.text }} colSpan={cols}>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: colors.accent }} />
          {name}
        </td>
      </tr>
      {lines.map((l) => {
        const b = baseOf(l.key)
        return (
          <tr key={l.key}>
            <td className="px-4 py-1.5 font-medium text-slate-900">
              <span className="mr-1.5 inline-flex gap-1 align-middle">
                {b && l.unitSF !== b.unitSF && <Dot c="#f43f5e" />}
                {b && l.proposedCount !== b.proposedCount && <Dot c="#8b5cf6" />}
              </span>
              {l.label}
            </td>
            {showRatios && <td className="px-3 py-1.5 text-xs text-slate-500">{l.ratio ?? "—"}</td>}
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
        <td className="px-4 py-1 text-xs" colSpan={cols - 1}>{name} circulation</td>
        <td className="px-4 py-1 text-right text-xs">{circ.toLocaleString()}</td>
      </tr>
    </>
  )
}

/* ── Survey drawer: everything from intake ─────────────────────────────── */

function SurveyDrawer({ result, tab, seatOf }: { result: SurveyResult; tab: "people" | "answers" | "existing"; seatOf: Record<string, SeatPlacement> }) {
  if (tab === "people") {
    return (
      <div className="space-y-3">
        <p className="text-[11px] leading-relaxed text-slate-400">
          Seats follow the survey hierarchy — private offices to the first names (leaders lead), dedicated desks next.
        </p>
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
                    {(seatOf[e.id] === "office" || seatOf[e.id] === "desk") && (
                      <span className="font-semibold" style={{ color: seatOf[e.id] === "office" ? CATEGORY_COLORS.Offices.text : CATEGORY_COLORS.Workstations.text }}>
                        · {seatOf[e.id]}
                      </span>
                    )}
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
            {g.targetSF && (
              <p className="mt-1.5 text-xs font-medium text-amber-700">
                Their number: {g.targetSF.toLocaleString()} SF{g.targetSource ? ` — ${g.targetSource}` : ""}
              </p>
            )}
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

/** A planning dial: % inputs for circulation, plain factor for load. */
function Dial({ label, value, pct, onChange }: { label: string; value: number; pct?: boolean; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-xs font-medium text-slate-600">
      {label}
      <span className="flex items-center gap-1 tabular-nums">
        <input
          type="number"
          step={pct ? 1 : 0.01}
          min={0}
          max={pct ? 100 : 2}
          value={pct ? Math.round(value * 100) : value.toFixed(2)}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (!Number.isFinite(n)) return
            onChange(pct ? Math.min(1, Math.max(0, n / 100)) : Math.min(1, Math.max(0, n)))
          }}
          className="w-16 rounded-md border border-slate-200 px-1.5 py-1 text-right focus:border-[#00badc] focus:outline-none"
        />
        {pct ? "%" : `×${(1 + value).toFixed(2)}`}
      </span>
    </label>
  )
}

function MenuToggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
      {children}
      <span className={`h-4 w-7 shrink-0 rounded-full p-0.5 transition-colors ${on ? "bg-[#00badc]" : "bg-slate-200"}`}>
        <span className={`block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-3" : ""}`} />
      </span>
    </button>
  )
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
      <ExternalLink className="h-3 w-3" /> {children}
    </a>
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
