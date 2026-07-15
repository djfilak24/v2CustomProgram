"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import {
  Monitor, KeyRound, FileSpreadsheet, RefreshCw, Undo2, Redo2, Search, ExternalLink, Eye, Copy, Trash2,
  Crown, AlertTriangle, ClipboardList, Users, LayoutGrid, Table2, Presentation, CheckCircle2, X,
  Map as MapIcon, Settings2, Plus, Minus, TrendingUp, TrendingDown, PieChart, Gauge,
  ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, Check, StickyNote, Upload, Image as ImageIcon,
  Activity, GripVertical, ClipboardCheck, Sparkles, UserRound, ChevronLeft,
} from "lucide-react"
import {
  Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, Radar, RadarChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import { buildDeliverable, CATEGORY_COLORS, DEFAULT_FACTORS, type Deliverable, type DeliverableOverrides, type DeliverableAddition, type DeliverableFactors, type DeliverableCategory } from "@/lib/survey/deliverable"
import { ProgramMapView } from "@/components/survey/program-map"
import { exportFitPlanningPackage } from "@/lib/survey/fitPlanning"
import { lineGaps, type ComparisonLine, type CompCategory } from "@/lib/survey/comparison"
import { COLLAB_CATALOG, SUPPORT_CATALOG, type CatalogSpace } from "@/lib/survey/catalog"
import { SpaceDetailModal } from "@/components/survey/space-detail-modal"
import { WORKSTATION_SIZES, OFFICE_SIZES, SURVEY_STEPS, GOAL_MOTIVATORS, SPACE_POSTURES, PROFILE_AXES, type ProfileScores } from "@/lib/survey/sections"
import { resolveSeating, applyDeptMoves, type SeatPlacement, type SeatingPatch, type ResolvedSeating } from "@/lib/survey/seating"
import { MAP_DEPT_COLORS } from "@/lib/survey/programMap"
import { isNelsonMode, nelsonCode } from "@/lib/nelsonMode"
import { loadSurveySeed } from "@/lib/survey/seedStorage"
import { demoResult } from "@/lib/survey/demo-scenarios"
import type { SurveyResult } from "@/lib/survey/types"

interface EngRow { token: string; clientName: string; status: string; hasResult: boolean }
interface SeatGroup { dept: string; names: string[]; extra: number }
type View = "workbench" | "focus" | "briefing" | "people"
type Drawer = "gaps" | "decisions" | "survey" | null
type LayerPreset = "working" | "client" | "numbers"
type LayerKey = "engine" | "survey" | "today" | "departments" | "allocations" | "dimensions" | "notes"
type RailTab = "dashboard" | "kpis" | "allocation" | "profile" | "session"
type CardMode = "program" | "allocation" | "roster" | "alignment"
type SeatAssignments = Record<string, string | "flex">

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
  /** Per-dept seat allocation — comparison line key → dept id → count. Workstations/Offices only. */
  const [deptAlloc, setDeptAlloc] = useState<Record<string, Record<string, number>>>({})
  /** Per-card notes from the room — comparison line key → text. */
  const [lineNotes, setLineNotes] = useState<Record<string, string>>({})
  /** Named person → exact workstation/office card key. Supports multiple standards. */
  const [seatAssignments, setSeatAssignments] = useState<SeatAssignments>({})
  /** Cards the facilitator has deliberately put on the team alignment path. */
  const [alignmentQueue, setAlignmentQueue] = useState<string[]>([])
  /** The client's mark — a small data URL. */
  const [logo, setLogo] = useState<string | undefined>(undefined)

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
  /** Independent evidence layers: the room controls what is visible without changing the program. */
  const [showRatios, setShowRatios] = useState(true)
  const [showSurveyEvidence, setShowSurveyEvidence] = useState(true)
  const [showTodayEvidence, setShowTodayEvidence] = useState(true)
  const [showAllocations, setShowAllocations] = useState(true)
  const [showDimensions, setShowDimensions] = useState(true)
  const [showNotesLayer, setShowNotesLayer] = useState(true)
  /** Workbench detail layers: full = every connected data point; compact = the numbers. */
  const [compactCards, setCompactCards] = useState(false)
  /** Per-category card ↔ table pivot in the Workbench. */
  const [tableCats, setTableCats] = useState<Record<string, boolean>>({})
  /** Left rail: which readout leads the hero — designers vary on this. */
  const [heroKpi, setHeroKpi] = useState<"gross" | "rentable">("gross")
  /** Left rail tab — the docked Studio summary system. */
  const [railTab, setRailTab] = useState<RailTab>("dashboard")
  const [allocationView, setAllocationView] = useState<"mix" | "departments" | "types">("mix")
  const [profileView, setProfileView] = useState<"movement" | "balance">("movement")
  const [sessionView, setSessionView] = useState<"impact" | "log">("impact")
  /** Left rail collapse — a slim icon strip when the room needs the width back. */
  const [railCollapsed, setRailCollapsed] = useState(false)
  /** Which cards have their notes field open. */
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>({})
  const [cardMode, setCardMode] = useState<CardMode>("program")
  const [activeAlignment, setActiveAlignment] = useState(0)
  const [railWidth, setRailWidth] = useState(300)

  // ── Undo / redo — the session's working state, time-travelable ────────────
  type Snap = {
    overrides: DeliverableOverrides; counts: Record<string, number>; additions: DeliverableAddition[]
    notes: Record<string, string>; resolvedGaps: Record<string, boolean>; factors: DeliverableFactors
    peoplePatch: SeatingPatch; deptMoves: Record<string, string>; labelOverrides: Record<string, string>
    deptAlloc: Record<string, Record<string, number>>; lineNotes: Record<string, string>
    seatAssignments: SeatAssignments; alignmentQueue: string[]
  }
  const history = useRef<{ past: Snap[]; future: Snap[]; skip: boolean }>({ past: [], future: [], skip: false })
  const [histVer, setHistVer] = useState(0) // re-render hook for disabled states
  useEffect(() => {
    const h = history.current
    if (h.skip) { h.skip = false; return }
    const snap: Snap = { overrides, counts, additions, notes, resolvedGaps, factors, peoplePatch, deptMoves, labelOverrides, deptAlloc, lineNotes, seatAssignments, alignmentQueue }
    const last = h.past[h.past.length - 1]
    if (last && JSON.stringify(last) === JSON.stringify(snap)) return
    h.past.push(snap)
    if (h.past.length > 60) h.past.shift()
    h.future = []
    setHistVer((v) => v + 1)
  }, [overrides, counts, additions, notes, resolvedGaps, factors, peoplePatch, deptMoves, labelOverrides, deptAlloc, lineNotes])
  const applySnap = (s: Snap) => {
    history.current.skip = true
    setOverrides(s.overrides); setCounts(s.counts); setAdditions(s.additions)
    setNotes(s.notes); setResolvedGaps(s.resolvedGaps); setFactors(s.factors)
    setPeoplePatch(s.peoplePatch ?? {})
    setDeptMoves(s.deptMoves ?? {}); setLabelOverrides(s.labelOverrides ?? {})
    setDeptAlloc(s.deptAlloc ?? {}); setLineNotes(s.lineNotes ?? {})
    setSeatAssignments(s.seatAssignments ?? {}); setAlignmentQueue(s.alignmentQueue ?? [])
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
  // Rail collapse is a personal viewing preference, not engagement data — kept locally.
  useEffect(() => { setRailCollapsed(localStorage.getItem("nelson:studioRailCollapsed") === "1") }, [])
  useEffect(() => {
    const saved = Number(localStorage.getItem("nelson:studioRailWidth"))
    if (Number.isFinite(saved) && saved >= 260) setRailWidth(Math.min(420, saved))
  }, [])
  const toggleRailCollapsed = () => {
    setRailCollapsed((v) => {
      localStorage.setItem("nelson:studioRailCollapsed", v ? "0" : "1")
      return !v
    })
  }
  const resizeRail = (next: number) => {
    const viewportMax = Math.max(280, Math.min(420, window.innerWidth * 0.34))
    const width = Math.round(Math.max(260, Math.min(viewportMax, next)))
    setRailWidth(width)
    localStorage.setItem("nelson:studioRailWidth", String(width))
  }
  const startRailResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = railWidth
    const move = (e: PointerEvent) => resizeRail(startWidth + e.clientX - startX)
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  const applyLayerPreset = (preset: LayerPreset) => {
    if (preset === "working") {
      setShowRatios(true); setShowSurveyEvidence(true); setShowTodayEvidence(true)
      setShowDeptChips(true); setShowAllocations(true); setShowDimensions(true); setShowNotesLayer(true)
      setCompactCards(false)
      return
    }
    if (preset === "client") {
      setShowRatios(true); setShowSurveyEvidence(true); setShowTodayEvidence(true)
      setShowDeptChips(true); setShowAllocations(false); setShowDimensions(true); setShowNotesLayer(false)
      setCompactCards(false)
      return
    }
    setShowRatios(false); setShowSurveyEvidence(false); setShowTodayEvidence(false)
    setShowDeptChips(false); setShowAllocations(false); setShowDimensions(false); setShowNotesLayer(false)
    setCompactCards(true)
  }

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
    setDeptMoves({}); setLabelOverrides({}); setDeptAlloc({}); setLineNotes({}); setSeatAssignments({}); setAlignmentQueue([]); setLogo(undefined)
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
          setDeptAlloc(s?.deptAlloc ?? {})
          setLineNotes(s?.lineNotes ?? {})
          setSeatAssignments(s?.seatAssignments ?? {})
          setAlignmentQueue(s?.alignmentQueue ?? [])
          setLogo(s?.logo)
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
        body: JSON.stringify({
          session: {
            overrides, counts, additions, notes, resolvedGaps, factors, people: peoplePatch, deptMoves,
            labels: labelOverrides, deptAlloc, lineNotes, seatAssignments, alignmentQueue, logo,
          },
        }),
      })
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("idle"))
    }, 700)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides, counts, additions, notes, resolvedGaps, factors, peoplePatch, deptMoves, labelOverrides, deptAlloc, lineNotes, seatAssignments, alignmentQueue, logo])

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

  // Dept-allocation cross-check: across every card in a category, how many
  // seats are allocated to a department vs. how many are actually configured
  // — the family-level answer, not just one card's.
  const categoryAllocTotals = useMemo(() => {
    const out: Record<string, { allocated: number; qty: number }> = {}
    if (!d) return out
    for (const cat of d.categories) {
      let allocated = 0
      let qty = 0
      for (const l of cat.lines) {
        const row = deptAlloc[l.key]
        if (row) allocated += Object.values(row).reduce((a, b) => a + b, 0)
        qty += l.proposedCount
      }
      out[cat.name] = { allocated, qty }
    }
    return out
  }, [d, deptAlloc])

  // The per-dept "ask" a seat-count line should reconcile against — the
  // survey's own per-dept numbers for offices/workstations, keyed by dept id.
  const surveyAskByDept = (line: ComparisonLine): Record<string, number> | null => {
    if (!viewResult) return null
    if (line.key === "offices") return viewResult.spaces.privateOfficesByDept
    if (line.key === "workstations") return viewResult.work.dedicatedByDept ?? null
    return null
  }

  // The rail's Program status block — configured vs. engine, at the whole-
  // program level, so the aggregate answer is a glance away without opening
  // a single card.
  const programStatusBars = useMemo(() => {
    if (!d) return [] as { label: string; configured: number; goal: number }[]
    const out: { label: string; configured: number; goal: number }[] = []
    for (const catName of ["Workstations", "Offices"] as const) {
      const cat = d.categories.find((c) => c.name === catName)
      if (!cat) continue
      const engineQty = cat.lines.reduce((s, l) => s + (baseOf(l.key)?.proposedCount ?? 0), 0)
      const configuredQty = cat.lines.reduce((s, l) => s + l.proposedCount, 0)
      if (engineQty > 0 || configuredQty > 0) out.push({ label: catName, configured: configuredQty, goal: engineQty })
    }
    return out
  }, [d, baseline])

  // Logo upload — downscaled client-side to a small square PNG so the
  // session record stays light; shows on the rail, the donut, and the deck.
  const logoInputRef = useRef<HTMLInputElement>(null)
  const handleLogoFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new window.Image()
      img.onload = () => {
        const size = 256
        const canvas = document.createElement("canvas")
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const scale = Math.min(size / img.width, size / img.height)
        const w = img.width * scale, h = img.height * scale
        ctx.clearRect(0, 0, size, size)
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        setLogo(canvas.toDataURL("image/png"))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

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

  const seatCardOptions = useMemo(() => {
    if (!d) return [] as { key: string; label: string; category: "Workstations" | "Offices" }[]
    return d.categories.flatMap((category) =>
      category.name === "Workstations" || category.name === "Offices"
        ? category.lines.filter((line) => line.proposedCount > 0 || line.existingCount > 0).map((line) => ({ key: line.key, label: line.label, category: category.name as "Workstations" | "Offices" }))
        : [],
    )
  }, [d])

  const rosterPeople = useMemo(() => {
    if (!viewResult) return [] as { id: string; name: string; department: string; assignment: string | "flex" }[]
    const firstOffice = seatCardOptions.find((line) => line.category === "Offices")?.key
    const firstWorkstation = seatCardOptions.find((line) => line.category === "Workstations")?.key
    return viewResult.people.departments.flatMap((department) =>
      (department.employees ?? []).map((person) => {
        const placement = resolved.byId[person.id] ?? "flex"
        const fallback = placement === "office" ? firstOffice : placement === "desk" ? firstWorkstation : undefined
        return {
          id: person.id,
          name: person.name,
          department: department.name,
          assignment: seatAssignments[person.id] ?? fallback ?? "flex",
        }
      }),
    )
  }, [viewResult, resolved, seatAssignments, seatCardOptions])

  const engineDeliverable = useMemo(() => (viewResult ? buildDeliverable(viewResult) : null), [viewResult])
  const configuredProfile = useMemo(
    () => (d && engineDeliverable ? programExpressionProfile(d, engineDeliverable) : d?.profile),
    [d, engineDeliverable],
  )
  const sessionImpact = useMemo(() => {
    if (!d || !engineDeliverable) return []
    return d.categories.map((category) => {
      const engine = engineDeliverable.categories.find((row) => row.name === category.name)?.proposedTotalSF ?? 0
      return { category: category.name, delta: category.proposedTotalSF - engine }
    })
  }, [d, engineDeliverable])
  const activeAlignmentKey = alignmentQueue[activeAlignment]
  const navigateAlignment = (direction: -1 | 1) => {
    if (!alignmentQueue.length) return
    const next = (activeAlignment + direction + alignmentQueue.length) % alignmentQueue.length
    setActiveAlignment(next)
    window.requestAnimationFrame(() => document.getElementById(`space-${alignmentQueue[next]}`)?.scrollIntoView({ behavior: "smooth", block: "center" }))
  }
  const toggleAlignment = (key: string) => {
    setAlignmentQueue((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key)
      return [...current, key]
    })
  }
  const assignPerson = (personId: string, target: string | "flex") => {
    setSeatAssignments((current) => ({ ...current, [personId]: target }))
    if (!viewResult) return
    const officeIds = new Set<string>()
    const deskIds = new Set<string>()
    for (const department of viewResult.people.departments) {
      for (const person of resolved.byDept[department.id] ?? []) {
        if (person.id === personId) continue
        if (person.placement === "office") officeIds.add(person.id)
        if (person.placement === "desk") deskIds.add(person.id)
      }
    }
    const targetCategory = seatCardOptions.find((option) => option.key === target)?.category
    if (targetCategory === "Offices") officeIds.add(personId)
    if (targetCategory === "Workstations") deskIds.add(personId)
    setPeoplePatch({ officeEmployeeIds: [...officeIds], deskEmployeeIds: [...deskIds] })
  }
  useEffect(() => {
    if (!alignmentQueue.length) setActiveAlignment(0)
    else if (activeAlignment >= alignmentQueue.length) setActiveAlignment(alignmentQueue.length - 1)
  }, [alignmentQueue, activeAlignment])

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
          if (was !== row.placement && !seatAssignments[row.id])
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
    for (const [personId, lineKey] of Object.entries(seatAssignments)) {
      const person = rosterPeople.find((row) => row.id === personId)
      const line = seatCardOptions.find((row) => row.key === lineKey)
      if (person) out.push({
        id: `assignment:${personId}`,
        text: `${person.name} (${person.department}) assigned to ${line?.label ?? "flex seating"}`,
      })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, overrides, counts, additions, resolvedGaps, factors, peoplePatch, deptMoves, labelOverrides, resolved, viewResult, result, baseline, seatAssignments, rosterPeople, seatCardOptions])

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
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur-md 2xl:px-6">
          <div className="mx-auto flex max-w-[1900px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 2xl:gap-3">
              <Image src="/NELSON_color.png" alt="NELSON" width={140} height={33} className="h-5 w-auto 2xl:h-6" priority />
              <span className="text-sm text-slate-400">·</span>
              <span className="text-sm font-medium text-slate-700">Studio</span>
              {/* View presets — Advisory #6.10 */}
              <div className="ml-3 flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {([["workbench", LayoutGrid, "Workbench"], ["focus", Table2, "Focus"], ["people", Users, "People"], ["briefing", Presentation, "Briefing"]] as const).map(([id, Icon, label]) => (
                  <button
                    key={id}
                    onClick={() => { setView(id); if (id === "briefing") setDrawer(null) }}
                    title={label}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      view === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> <span className={id === "workbench" ? "" : "hidden 2xl:inline"}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 2xl:gap-2">
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
              <DrawerBtn label="Program map" active={showMap} onClick={() => setShowMap(!showMap)} icon={<MapIcon className="h-3.5 w-3.5" />}>
                <span className="hidden 2xl:inline">Map</span>
              </DrawerBtn>
              {!briefing && (
                <>
                  <DrawerBtn label="Gaps" active={drawer === "gaps"} onClick={() => setDrawer(drawer === "gaps" ? null : "gaps")} icon={<AlertTriangle className="h-3.5 w-3.5" />}>
                    <span className="hidden 2xl:inline">Gaps</span>{openGaps > 0 && <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">{openGaps}</span>}
                  </DrawerBtn>
                  <DrawerBtn label="Decisions" active={drawer === "decisions"} onClick={() => setDrawer(drawer === "decisions" ? null : "decisions")} icon={<ClipboardList className="h-3.5 w-3.5" />}>
                    <span className="hidden 2xl:inline">Decisions</span>{editedCount > 0 && <span className="ml-1 rounded-full bg-[#00badc]/15 px-1.5 text-[10px] font-bold text-[#0089a3]">{editedCount}</span>}
                  </DrawerBtn>
                  <DrawerBtn label="Survey" active={drawer === "survey"} onClick={() => setDrawer(drawer === "survey" ? null : "survey")} icon={<Users className="h-3.5 w-3.5" />}>
                    <span className="hidden 2xl:inline">Survey</span>
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
                className="w-44 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-[#00badc] focus:outline-none 2xl:w-56"
              >
                <option value="seed">Local seed / last reviewed</option>
                <option value="demo">Demo — Law Firm</option>
                {rows.map((r) => <option key={r.token} value={r.token}>{r.clientName}</option>)}
              </select>
              <button
                onClick={() => viewResult && d && exportFitPlanningPackage(viewResult, d, {
                  decisions: decisions.map((x) => ({ text: x.text, note: notes[x.id] })),
                  gaps: gaps.map((g) => ({ line: g.line, message: g.message, resolved: !!resolvedGaps[g.id], note: notes[`gapnote:${g.id}`] })),
                  spaceNotes: Object.entries(lineNotes).filter(([, n]) => n.trim()).map(([key, note]) => ({
                    line: baseline.find((l) => l.key === key)?.label ?? additions.find((a) => a.key === key)?.label ?? key,
                    note,
                  })),
                })}
                disabled={!d}
                title="Export the Fit-Planning Package"
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-[#0e1a2e] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-40 2xl:px-3.5"
              >
                <FileSpreadsheet className="h-4 w-4" /> <span className="hidden 2xl:inline">Fit-Planning Package</span><span className="2xl:hidden">Export</span>
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
                      <MenuToggle on={showRatios} onClick={() => setShowRatios((v) => !v)}>Engine recommendation</MenuToggle>
                      <MenuToggle on={showSurveyEvidence} onClick={() => setShowSurveyEvidence((v) => !v)}>Survey ask</MenuToggle>
                      <MenuToggle on={showTodayEvidence} onClick={() => setShowTodayEvidence((v) => !v)}>Existing / today</MenuToggle>
                      <MenuToggle on={showDeptChips} onClick={() => setShowDeptChips((v) => !v)}>Department evidence</MenuToggle>
                      <MenuToggle on={showAllocations} onClick={() => setShowAllocations((v) => !v)}>Allocation controls</MenuToggle>
                      <MenuToggle on={showDimensions} onClick={() => setShowDimensions((v) => !v)}>Dimension language</MenuToggle>
                      <MenuToggle on={showNotesLayer} onClick={() => setShowNotesLayer((v) => !v)}>Space notes</MenuToggle>
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
                            onClick={() => { setOverrides({}); setCounts({}); setAdditions([]); setFactors({}); setPeoplePatch({}); setDeptMoves({}); setLabelOverrides({}); setDeptAlloc({}); setLineNotes({}); setSeatAssignments({}); setAlignmentQueue([]); setMenuOpen(false) }}
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
          <main
            className="grid min-h-[calc(100vh-57px)] w-full gap-0"
            style={{ gridTemplateColumns: `${railCollapsed ? 56 : railWidth}px minmax(0,1fr)${drawer && !briefing ? " 360px" : ""}` }}
          >
            {/* ── Left rail: docked, collapsible, one clear number hierarchy ── */}
            <aside className="sticky top-[57px] z-10 h-[calc(100vh-57px)] self-start overflow-y-auto overflow-x-hidden border-r border-slate-200 bg-white">
              {railCollapsed ? (
                /* Collapsed — a slim icon strip; the room gets its width back. */
                <div className="flex flex-col items-center gap-3 px-2 py-4">
                  <button
                    onClick={toggleRailCollapsed}
                    title="Expand"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                  {logo && <img src={logo} alt="" className="h-8 w-8 rounded-lg object-contain" />}
                  <div className="flex flex-col items-center rounded-lg bg-[#00badc]/10 px-1.5 py-2 text-center" title={`${(heroKpi === "gross" ? d.totals.grossUsableSF : d.totals.estimatedRentableSF).toLocaleString()} SF`}>
                    <span className="text-[8px] font-bold uppercase text-[#0089a3]">SF</span>
                    <span className="text-[11px] font-bold tabular-nums text-slate-900">
                      {Math.round((heroKpi === "gross" ? d.totals.grossUsableSF : d.totals.estimatedRentableSF) / 1000)}k
                    </span>
                  </div>
                  {openGaps > 0 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700" title={`${openGaps} open gaps`}>
                      {openGaps}
                    </span>
                  )}
                  {editedCount > 0 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00badc]/15 text-[10px] font-bold text-[#0089a3]" title={`${editedCount} decisions`}>
                      {editedCount}
                    </span>
                  )}
                </div>
              ) : (
              <>
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">Studio summary</p>
                    <div className="mt-1 flex min-w-0 items-center gap-2">
                    {logo && <img src={logo} alt="" className="h-7 w-7 shrink-0 rounded-lg object-contain" />}
                    <h2 className={`truncate ${briefing ? "text-xl font-bold" : "text-lg font-bold"}`}>{d.clientName}</h2>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-0.5">
                    <button onClick={() => logoInputRef.current?.click()} title={logo ? "Replace client logo" : "Upload client logo"} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600"><Upload className="h-3.5 w-3.5" /></button>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleLogoFile(file); e.target.value = "" }} />
                    <button
                      onClick={toggleRailCollapsed}
                      title="Collapse"
                      className="flex h-6 w-6 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
                {/* Identity as stat cells, not a sentence */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Today</p>
                    <p className="text-lg font-bold tabular-nums leading-tight text-slate-900">{d.current}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">At plan</p>
                    <p className="flex items-baseline gap-1 text-lg font-bold tabular-nums leading-tight text-slate-900">
                      {d.future}
                      {d.future !== d.current && (
                        <span className="text-[10px] font-bold text-[#0089a3]">
                          {d.future > d.current ? "+" : ""}{Math.round(((d.future - d.current) / (d.current || 1)) * 100)}%
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">{d.daysInOffice} days/wk</p>
              </div>

              <div className="grid grid-cols-5 border-b border-slate-100 text-[10px] font-bold text-slate-400">
                {([
                  ["dashboard", LayoutGrid, "Dashboard"],
                  ["kpis", Gauge, "KPIs"],
                  ["allocation", PieChart, "Allocation"],
                  ["profile", Activity, "Profile"],
                  ["session", ClipboardList, "Session"],
                ] as const).map(([id, Icon, label]) => (
                  <button
                    key={id}
                    onClick={() => setRailTab(id)}
                    className={`flex min-h-12 flex-col items-center justify-center gap-1 border-r border-slate-100 px-1 transition-colors last:border-r-0 ${
                      railTab === id ? "bg-slate-50 text-slate-900" : "hover:bg-slate-50 hover:text-slate-700"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {(() => {
                  const primary = heroKpi === "gross" ? d.totals.grossUsableSF : d.totals.estimatedRentableSF
                  const primaryLabel = heroKpi === "gross" ? "Gross usable area" : "Estimated rentable area"
                  const hasToday = d.totals.existingSF > 0
                  const grossDelta = hasToday ? d.totals.grossUsableSF - d.totals.existingSF : 0
                  const grossPct = hasToday ? Math.round((grossDelta / d.totals.existingSF) * 100) : 0
                  const barMax = Math.max(d.totals.existingSF, primary) || 1

                  if (railTab === "allocation") {
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Allocation</h3>
                          <span className="text-[9px] font-semibold text-slate-400">Live configuration</span>
                        </div>
                        <RailSubTabs
                          value={allocationView}
                          options={[{ id: "mix", label: "Mix" }, { id: "departments", label: "Departments" }, { id: "types", label: "Types" }]}
                          onChange={setAllocationView}
                        />
                        {allocationView === "mix" && (
                          <>
                            <DonutChart categories={d.categories} total={d.totals.grossUsableSF} logo={logo} />
                            <div className="mt-3 space-y-2 text-[13px] tabular-nums">
                              {d.categories.map((category) => (
                                <CategoryDistributionRow key={category.name} category={category} total={d.totals.grossUsableSF} />
                              ))}
                            </div>
                          </>
                        )}
                        {allocationView === "departments" && viewResult && (
                          <DepartmentDistribution
                            result={viewResult}
                            rosterPeople={rosterPeople}
                            seatOptions={seatCardOptions}
                            deptAlloc={deptAlloc}
                          />
                        )}
                        {allocationView === "types" && <SpaceTypeDistribution categories={d.categories} />}
                      </>
                    )
                  }

                  if (railTab === "profile") {
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">People + place profile</h3>
                          <span className="text-[9px] font-semibold text-[#0089a3]">Profile movement</span>
                        </div>
                        <RailSubTabs
                          value={profileView}
                          options={[{ id: "movement", label: "Movement" }, { id: "balance", label: "Balance" }]}
                          onChange={setProfileView}
                        />
                        {profileView === "movement" && configuredProfile && (
                          <>
                            <StudioProfileRadar scores={d.profile} configured={configuredProfile} />
                            <div className="flex items-center justify-center gap-4 text-[9px] font-semibold text-slate-500">
                              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-slate-400" /> Survey profile</span>
                              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-[#00badc]" /> Program expression</span>
                            </div>
                            <p className="mt-3 text-[10px] leading-4 text-slate-400">The second shape reflects how the current configuration expresses the survey profile. It is descriptive, not a score.</p>
                          </>
                        )}
                        {profileView === "balance" && (
                          <PeoplePlaceBalance
                            deliverable={d}
                            engine={engineDeliverable}
                            rosterPeople={rosterPeople}
                            status={programStatusBars}
                          />
                        )}
                      </>
                    )
                  }

                  if (railTab === "session") {
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Session record</h3>
                          <span className="text-[9px] font-bold text-[#0089a3]">Live</span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-slate-200">
                          <button onClick={() => setDrawer("decisions")} className="bg-slate-50 p-3 text-left">
                            <p className="text-2xl font-bold tabular-nums text-slate-900">{editedCount}</p>
                            <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Edits</p>
                          </button>
                          <button onClick={() => setDrawer("gaps")} className="bg-slate-50 p-3 text-left">
                            <p className="text-2xl font-bold tabular-nums text-slate-900">{gaps.filter((g) => resolvedGaps[g.id]).length}/{gaps.length}</p>
                            <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Gaps closed</p>
                          </button>
                          <button onClick={() => setView("people")} className="bg-slate-50 p-3 text-left">
                            <p className="text-2xl font-bold tabular-nums text-slate-900">{decisions.filter((x) => x.id.startsWith("seat:") || x.id.startsWith("dept:") || x.id.startsWith("assignment:")).length}</p>
                            <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">People moved</p>
                          </button>
                        </div>
                        <RailSubTabs
                          value={sessionView}
                          options={[{ id: "impact", label: "Impact" }, { id: "log", label: "Change log" }]}
                          onChange={setSessionView}
                        />
                        {sessionView === "impact" && (
                          <>
                            <SessionImpactChart data={sessionImpact} />
                            <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-slate-200">
                              <div className="bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase text-slate-400">Net movement</p><p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{d.totals.proposedNetSF - (engineDeliverable?.totals.proposedNetSF ?? d.totals.proposedNetSF) > 0 ? "+" : ""}{(d.totals.proposedNetSF - (engineDeliverable?.totals.proposedNetSF ?? d.totals.proposedNetSF)).toLocaleString()} SF</p></div>
                              <div className="bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase text-slate-400">Density movement</p><p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{d.totals.sfPerPerson - (engineDeliverable?.totals.sfPerPerson ?? d.totals.sfPerPerson) > 0 ? "+" : ""}{d.totals.sfPerPerson - (engineDeliverable?.totals.sfPerPerson ?? d.totals.sfPerPerson)} <span className="text-[10px] text-slate-400">SF/person</span></p></div>
                            </div>
                          </>
                        )}
                        {sessionView === "log" && (
                          <div className="mt-3 space-y-2">
                            {(decisions.length ? decisions : [{ id: "empty", text: "No session changes yet. Adjust counts, area, allocation, or gaps and they will appear here." }]).map((item, index) => (
                              <div key={item.id} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[9px] font-bold text-slate-400">{index + 1}</span>
                                <p className="text-[11px] leading-4 text-slate-600">{item.text}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )
                  }

                  if (railTab === "kpis") {
                    const loadFactor = 1 + d.totals.rentableFactor
                    const engineSfPerPerson = engineDeliverable?.totals.sfPerPerson ?? d.totals.sfPerPerson
                    return (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Planning KPIs</h3>
                          <div className="flex rounded-md bg-slate-100 p-0.5 text-[9px] font-bold">
                            {(["gross", "rentable"] as const).map((mode) => <button key={mode} onClick={() => setHeroKpi(mode)} className={`rounded px-2 py-1 capitalize ${heroKpi === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>{mode}</button>)}
                          </div>
                        </div>
                        <div className="mt-3 border-b border-slate-100 pb-4">
                          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#0089a3]">{primaryLabel}</p>
                          <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-slate-900">{primary.toLocaleString()}<span className="ml-1 text-sm font-semibold text-slate-400">SF</span></p>
                          {hasToday && <p className="mt-1 text-[11px] font-medium text-slate-500">{grossDelta > 0 ? "+" : ""}{grossDelta.toLocaleString()} SF from today</p>}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-slate-200">
                          <RailMetric label="Net program" value={d.totals.proposedNetSF.toLocaleString()} unit="SF" />
                          <RailMetric label="Circulation" value={d.totals.circulationSF.toLocaleString()} unit="SF" />
                          <RailMetric label="SF / person" value={String(d.totals.sfPerPerson)} detail={`${d.totals.sfPerPerson - engineSfPerPerson >= 0 ? "+" : ""}${d.totals.sfPerPerson - engineSfPerPerson} from engine`} />
                          <RailMetric label="People at plan" value={String(d.future)} detail={`${d.daysInOffice} days / week`} />
                          <RailMetric label="Rentable load" value={`×${loadFactor.toFixed(2)}`} detail="editable in settings" />
                          <RailMetric label="Est. rentable" value={d.totals.estimatedRentableSF.toLocaleString()} unit="SF" />
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between"><h4 className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Configured / engine</h4><span className="text-[9px] text-slate-400">Reference only</span></div>
                          <div className="mt-2 space-y-3">
                            {programStatusBars.map((row) => <ProgramStatusRow key={row.label} {...row} />)}
                          </div>
                        </div>
                      </>
                    )
                  }

                  return (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0089a3]">{primaryLabel}</p>
                          {hasToday && <p className="mt-0.5 text-xs text-slate-400">Today {d.totals.existingSF.toLocaleString()} SF</p>}
                        </div>
                        <div className="flex rounded-lg bg-slate-100 p-0.5 text-[9px] font-bold">
                          {(["gross", "rentable"] as const).map((mode) => (
                            <button key={mode} onClick={() => setHeroKpi(mode)} className={`rounded-md px-2 py-1 capitalize ${heroKpi === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>{mode}</button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-2 flex items-end justify-between gap-3">
                        <p className="text-4xl font-bold tabular-nums tracking-tight text-slate-900">
                          {primary.toLocaleString()}<span className="ml-1 text-base font-medium text-slate-400">SF</span>
                        </p>
                        <p className="text-right text-2xl font-bold tabular-nums text-slate-900">
                          {d.totals.sfPerPerson}
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">SF / person</span>
                        </p>
                      </div>
                      {heroKpi === "gross" && hasToday && (
                        <p className="mt-1.5 text-[11px] font-bold text-[#0089a3]">
                          {grossDelta >= 0 ? "+" : ""}{grossDelta.toLocaleString()} SF ({grossPct >= 0 ? "+" : ""}{grossPct}%) vs today
                        </p>
                      )}
                      {hasToday && (
                        <div className="mt-4 space-y-1">
                          <div className="h-2 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-slate-300" style={{ width: `${(d.totals.existingSF / barMax) * 100}%` }} />
                          </div>
                          <div className="h-2 rounded-full bg-[#00badc]/10">
                            <div className="h-2 rounded-full bg-[#00badc]" style={{ width: `${(primary / barMax) * 100}%` }} />
                          </div>
                        </div>
                      )}
                      <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-slate-200">
                        <button onClick={() => setRailTab("session")} className="bg-slate-50 p-3 text-left">
                          <p className="text-xl font-bold tabular-nums text-slate-900">{editedCount}</p>
                          <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Edits</p>
                        </button>
                        <button onClick={() => setDrawer("gaps")} className="bg-slate-50 p-3 text-left">
                          <p className="text-xl font-bold tabular-nums text-slate-900">{gaps.filter((g) => resolvedGaps[g.id]).length}/{gaps.length}</p>
                          <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Gaps</p>
                        </button>
                        <button onClick={() => setView("people")} className="bg-slate-50 p-3 text-left">
                          <p className="text-xl font-bold tabular-nums text-slate-900">{decisions.filter((x) => x.id.startsWith("seat:") || x.id.startsWith("dept:") || x.id.startsWith("assignment:")).length}</p>
                          <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Moves</p>
                        </button>
                      </div>
                      {railTab === "dashboard" && (
                        <>
                          <div className="mt-5">
                            <div className="flex items-center justify-between">
                              <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Program balance</h3>
                              <button onClick={() => setRailTab("allocation")} className="text-[10px] font-bold text-[#0089a3]">View distribution</button>
                            </div>
                            <div className="mt-3 space-y-2">
                              {d.categories.map((c) => (
                                <div key={c.name} className="grid grid-cols-[86px_minmax(0,1fr)_34px] items-center gap-2 text-[10px]">
                                  <span className="truncate text-slate-500">{c.name}</span>
                                  <div className="h-2 rounded-full bg-slate-100">
                                    <div className="h-2 rounded-full" style={{ width: `${Math.round((c.proposedTotalSF / (d.totals.grossUsableSF || 1)) * 100)}%`, backgroundColor: CATEGORY_COLORS[c.name].accent }} />
                                  </div>
                                  <span className="text-right tabular-nums text-slate-400">{Math.round((c.proposedTotalSF / (d.totals.grossUsableSF || 1)) * 100)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <button onClick={() => { setRailTab("session"); setSessionView("impact") }} className="mt-4 flex w-full items-center justify-between border-t border-slate-100 pt-3 text-left">
                            <span><span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Session impact</span><span className="mt-0.5 block text-[10px] text-slate-500">Current configuration from engine</span></span>
                            <span className="text-sm font-bold tabular-nums text-slate-800">{sessionImpact.reduce((sum, row) => sum + row.delta, 0) > 0 ? "+" : ""}{Math.round(sessionImpact.reduce((sum, row) => sum + row.delta, 0)).toLocaleString()} SF</span>
                          </button>
                          {Object.keys(factors).length > 0 && <p className="mt-4 rounded-lg bg-[#00badc]/10 px-3 py-2 text-[11px] font-medium text-[#0089a3]">Planning dials tuned on the session record.</p>}
                        </>
                      )}
                    </>
                  )
                })()}
              </div>

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
              </>
              )}
              {!railCollapsed && (
                <button
                  type="button"
                  onPointerDown={startRailResize}
                  onDoubleClick={() => resizeRail(300)}
                  aria-label="Resize Studio summary rail"
                  title="Drag left or right to resize. Double-click to reset."
                  className="group absolute right-0 top-0 z-20 flex h-full w-3 cursor-col-resize items-center justify-center border-0 bg-transparent"
                >
                  <span className="sticky top-1/2 flex h-14 w-3 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-slate-200 bg-white text-slate-300 shadow-sm transition-colors group-hover:border-[#00badc]/50 group-hover:text-[#0089a3]">
                    <GripVertical className="h-4 w-4" />
                  </span>
                </button>
              )}
            </aside>

            {/* ── Center: the spaces (Workbench cards / Focus table / Briefing) ─ */}
            <section className="min-w-0 bg-[#f3f7fa]">
              {briefing && <StudioSummaryMasthead d={d} result={viewResult} openGaps={openGaps} editedCount={editedCount} />}
              <div className="px-6 py-5">
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
                      Assign each named person to the exact workstation or office type they will occupy.
                    </p>
                  </div>
                  {viewResult && (
                    <DepartmentManager
                      result={viewResult} seating={resolved}
                      rosterPeople={rosterPeople} seatOptions={seatCardOptions}
                      onAssign={assignPerson}
                      onMoveDept={moveDept}
                    />
                  )}
                </>
              ) : (
              <>
              {!briefing && (
                <LayerVisibilityBar
                  layers={{
                    engine: showRatios,
                    survey: showSurveyEvidence,
                    today: showTodayEvidence,
                    departments: showDeptChips,
                    allocations: showAllocations,
                    dimensions: showDimensions,
                    notes: showNotesLayer,
                  }}
                  onToggle={(layer) => {
                    if (layer === "engine") setShowRatios((v) => !v)
                    else if (layer === "survey") setShowSurveyEvidence((v) => !v)
                    else if (layer === "today") setShowTodayEvidence((v) => !v)
                    else if (layer === "departments") setShowDeptChips((v) => !v)
                    else if (layer === "allocations") setShowAllocations((v) => !v)
                    else if (layer === "dimensions") setShowDimensions((v) => !v)
                    else setShowNotesLayer((v) => !v)
                  }}
                  onPreset={applyLayerPreset}
                  cardMode={cardMode}
                  onCardMode={setCardMode}
                />
              )}
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

              {!briefing && cardMode === "alignment" && (
                <div className="mb-4 flex items-center gap-3 bg-[#0e1a2e] px-3 py-2 text-white shadow-sm">
                  <ClipboardCheck className="h-4 w-4 text-[#00badc]" />
                  <span className="text-xs font-bold">Alignment queue</span>
                  <span className="text-[11px] text-white/55">{alignmentQueue.length ? `${activeAlignment + 1} of ${alignmentQueue.length}` : "No cards queued"}</span>
                  <span className="ml-auto flex items-center gap-1">
                    <button onClick={() => navigateAlignment(-1)} disabled={!alignmentQueue.length} className="flex h-6 w-6 items-center justify-center text-white/60 hover:text-white disabled:opacity-25" title="Previous alignment point"><ChevronLeft className="h-4 w-4" /></button>
                    <button onClick={() => navigateAlignment(1)} disabled={!alignmentQueue.length} className="flex h-6 w-6 items-center justify-center text-white/60 hover:text-white disabled:opacity-25" title="Next alignment point"><ChevronRight className="h-4 w-4" /></button>
                  </span>
                </div>
              )}

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
                  // Configured vs. what the engine recommends, at the category level —
                  // the same triangle the cards show, aggregated to a glance.
                  const engineQty = cat.lines.reduce((s, l) => s + (baseOf(l.key)?.proposedCount ?? 0), 0)
                  const configuredQty = cat.lines.reduce((s, l) => s + l.proposedCount, 0)
                  const toGo = engineQty - configuredQty
                  return (
                    <div key={cat.name} className="mb-8">
                      <h3 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em]" style={{ color: cc.text }}>
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
                      {!briefing && engineQty > 0 && (
                        <div className="mb-3 flex items-center gap-2.5">
                          <div className="h-1.5 max-w-xs flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, (configuredQty / engineQty) * 100)}%`, backgroundColor: cc.accent }}
                            />
                          </div>
                          <span className="whitespace-nowrap text-[11px] font-medium tabular-nums text-slate-400">
                            configured <b className="text-slate-600">{configuredQty}</b> / engine <b className="text-slate-600">{engineQty}</b>
                            {toGo > 0 ? ` · ${toGo} to go` : toGo < 0 ? ` · ${-toGo} over` : " · matched"}
                          </span>
                        </div>
                      )}
                      {asTable ? (
                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                      <div className="grid justify-start gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,520px),640px))]">
                        {visible.map((l) => (
                          <SpaceCard
                            key={l.key} line={l} base={baseOf(l.key)} result={viewResult} briefing={briefing}
                            colors={cc} showChips={showDeptChips && !compactCards} showRatios={showRatios && !compactCards}
                            showSurvey={showSurveyEvidence && !compactCards} showToday={showTodayEvidence && !compactCards}
                            showAllocations={showAllocations && !compactCards} showDimensions={showDimensions && !compactCards}
                            showNotes={showNotesLayer && !compactCards}
                            compact={compactCards}
                            mode={cardMode}
                            rosterPeople={rosterPeople}
                            seatOptions={seatCardOptions}
                            onAssign={assignPerson}
                            inAlignmentQueue={alignmentQueue.includes(l.key)}
                            alignmentActive={activeAlignmentKey === l.key}
                            onToggleAlignment={() => toggleAlignment(l.key)}
                            onQty={(n) => setQty(l.key, n)}
                            onSf={(n) => setSf(l.key, n)}
                            onInfo={() => setDetail(detailFor(l))}
                            onDuplicate={() => duplicate(l)}
                            onDelete={l.key.startsWith("studio:") ? () => {
                              setAdditions((current) => current.filter((addition) => addition.key !== l.key))
                              setSeatAssignments((current) => Object.fromEntries(Object.entries(current).map(([personId, target]) => [personId, target === l.key ? "flex" : target])))
                              setAlignmentQueue((current) => current.filter((key) => key !== l.key))
                            } : undefined}
                            onRename={
                              l.key.startsWith("studio:")
                                ? (name) => setAdditions((p) => p.map((a) => (a.key === l.key ? { ...a, label: name } : a)))
                                : (name) => setLabelOverrides((p) => ({ ...p, [l.key]: name }))
                            }
                            onCategory={
                              l.key.startsWith("studio:")
                                ? (category) => {
                                  setAdditions((current) => current.map((addition) => (addition.key === l.key ? { ...addition, category } : addition)))
                                  if (category !== "Workstations" && category !== "Offices") {
                                    setSeatAssignments((current) => Object.fromEntries(Object.entries(current).map(([personId, target]) => [personId, target === l.key ? "flex" : target])))
                                  }
                                }
                                : undefined
                            }
                            departments={viewResult.people.departments.map((dep, i) => ({ id: dep.id, name: dep.name, color: MAP_DEPT_COLORS[i % MAP_DEPT_COLORS.length] }))}
                            deptAlloc={deptAlloc[l.key] ?? {}}
                            onAllocChange={(deptId, n) => setDeptAlloc((p) => ({ ...p, [l.key]: { ...p[l.key], [deptId]: Math.max(0, n) } }))}
                            surveyAskByDept={surveyAskByDept(l)}
                            categoryAllocated={categoryAllocTotals[cat.name]?.allocated ?? 0}
                            categoryQty={categoryAllocTotals[cat.name]?.qty ?? 0}
                            note={lineNotes[l.key] ?? ""}
                            onNote={(text) => setLineNotes((p) => ({ ...p, [l.key]: text }))}
                            notesOpen={!!notesOpen[l.key]}
                            onToggleNotes={() => setNotesOpen((p) => ({ ...p, [l.key]: !p[l.key] }))}
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
                            className="flex min-h-[104px] items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-400 transition-colors hover:border-[#00badc]/50 hover:text-[#0089a3]"
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
              </div>
            </section>

            {/* ── Right drawer ──────────────────────────────────────────────── */}
            {drawer && !briefing && (
              <aside className="sticky top-[57px] h-[calc(100vh-57px)] space-y-3 overflow-y-auto border-l border-slate-200 bg-white p-5">
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

/* ── Canvas chrome: fixed summary + explicit data-layer controls ─────────── */

function StudioSummaryMasthead({
  d, result, openGaps, editedCount,
}: {
  d: NonNullable<ReturnType<typeof buildDeliverable>>
  result: SurveyResult
  openGaps: number
  editedCount: number
}) {
  const gross = d.totals.grossUsableSF
  const existing = d.totals.existingSF
  const delta = existing > 0 ? gross - existing : null
  const target = result.goals?.targetSF
  const targetGap = target ? target - gross : null

  return (
    <div className="sticky top-[57px] z-20 border-b border-slate-200 bg-white shadow-sm">
      <div className="grid min-h-[104px] grid-cols-[minmax(300px,1.4fr)_repeat(3,minmax(150px,1fr))]">
        <div className="bg-[#0e1a2e] px-6 py-4 text-white">
          <p className="truncate text-[9px] font-bold uppercase tracking-[0.15em] text-[#00badc]">{d.clientName} / session program</p>
          <p className="mt-1.5 text-3xl font-bold tabular-nums tracking-tight">
            {gross.toLocaleString()} <span className="text-sm font-semibold text-white/45">SF gross usable</span>
          </p>
          {delta !== null ? (
            <p className={`mt-1 text-[11px] font-semibold ${delta >= 0 ? "text-emerald-300" : "text-amber-300"}`}>
              {delta >= 0 ? "+" : ""}{delta.toLocaleString()} SF vs today ({existing.toLocaleString()} SF)
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-white/40">No existing footprint captured</p>
          )}
        </div>
        <SummaryStat
          label="Client target"
          value={target ? `${target.toLocaleString()} SF` : "Not captured"}
          detail={targetGap === null ? "Set in intake or live" : `${targetGap >= 0 ? "+" : ""}${targetGap.toLocaleString()} SF ${targetGap >= 0 ? "room" : "over"}`}
          tone={targetGap === null ? "muted" : targetGap >= 0 ? "good" : "warn"}
        />
        <SummaryStat label="Planning density" value={`${d.totals.sfPerPerson} SF / person`} detail={`${d.future} people at plan / ${d.daysInOffice} days in`} />
        <SummaryStat
          label="Session record"
          value={`${editedCount} edit${editedCount === 1 ? "" : "s"}`}
          detail={`${openGaps} gap${openGaps === 1 ? "" : "s"} open`}
          tone={openGaps > 0 ? "warn" : "good"}
        />
      </div>
      <div className="flex h-1.5 w-full overflow-hidden bg-slate-100" aria-label="Program area by category">
        {d.categories.map((category) => (
          <span
            key={category.name}
            title={`${category.name}: ${category.proposedTotalSF.toLocaleString()} SF`}
            style={{ width: `${(category.proposedTotalSF / (gross || 1)) * 100}%`, backgroundColor: CATEGORY_COLORS[category.name].accent }}
          />
        ))}
      </div>
    </div>
  )
}

function SummaryStat({
  label, value, detail, tone = "muted",
}: {
  label: string
  value: string
  detail: string
  tone?: "muted" | "good" | "warn"
}) {
  return (
    <div className="border-r border-slate-200 px-5 py-4 last:border-r-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className={`mt-1 text-[11px] font-medium ${tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-slate-400"}`}>{detail}</p>
    </div>
  )
}

function LayerVisibilityBar({
  layers, onToggle, onPreset, cardMode, onCardMode,
}: {
  layers: Record<LayerKey, boolean>
  onToggle: (layer: LayerKey) => void
  onPreset: (preset: LayerPreset) => void
  cardMode: CardMode
  onCardMode: (mode: CardMode) => void
}) {
  const labels: Record<LayerKey, string> = {
    engine: "Engine",
    survey: "Survey",
    today: "Today",
    departments: "Departments",
    allocations: "Allocation",
    dimensions: "Dimensions",
    notes: "Notes",
  }

  return (
    <div className="mb-5 border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
        <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-bold text-slate-700"><LayoutGrid className="h-3.5 w-3.5" /> Card view</span>
        <span className="flex overflow-hidden rounded-md border border-slate-200 text-[10px] font-bold">
          {(["program", "allocation", "roster", "alignment"] as CardMode[]).map((mode) => (
            <button key={mode} onClick={() => onCardMode(mode)} className={`px-2.5 py-1.5 capitalize ${cardMode === mode ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>{mode}</button>
          ))}
        </span>
        <span className="ml-auto text-[10px] text-slate-400">One configuration, four working views</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
      <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-bold text-slate-700"><Settings2 className="h-3.5 w-3.5" /> Visible data</span>
      {(Object.keys(labels) as LayerKey[]).map((layer) => (
        <button
          key={layer}
          onClick={() => onToggle(layer)}
          aria-pressed={layers[layer]}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            layers[layer]
              ? "border-[#00badc]/35 bg-[#00badc]/10 text-[#007c94]"
              : "border-slate-200 bg-white text-slate-400 hover:text-slate-600"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${layers[layer] ? "bg-[#00badc]" : "bg-slate-300"}`} />
          {labels[layer]}
        </button>
      ))}
      <div className="ml-auto flex overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500">
        <button onClick={() => onPreset("working")} className="px-2.5 py-1.5 hover:bg-white hover:text-slate-900">Working session</button>
        <button onClick={() => onPreset("client")} className="border-l border-slate-200 px-2.5 py-1.5 hover:bg-white hover:text-slate-900">Client review</button>
        <button onClick={() => onPreset("numbers")} className="border-l border-slate-200 px-2.5 py-1.5 hover:bg-white hover:text-slate-900">Numbers only</button>
      </div>
      </div>
    </div>
  )
}

/* ── Department Manager: every person, where they sit, one click to move ── */

function DepartmentManager({
  result, seating, rosterPeople, seatOptions, onAssign, onMoveDept,
}: {
  result: SurveyResult
  seating: ResolvedSeating
  rosterPeople: { id: string; name: string; department: string; assignment: string | "flex" }[]
  seatOptions: { key: string; label: string; category: "Workstations" | "Offices" }[]
  onAssign: (id: string, target: string | "flex") => void
  onMoveDept: (id: string, toDeptId: string) => void
}) {
  return (
    <div className="space-y-5">
      {result.people.departments.map((dep) => {
        const rows = seating.byDept[dep.id] ?? []
        const depPeople = rosterPeople.filter((person) => person.department === dep.name)
        const categoryOf = (assignment: string) => seatOptions.find((option) => option.key === assignment)?.category
        const offCount = depPeople.filter((person) => categoryOf(person.assignment) === "Offices").length
        const deskCount = depPeople.filter((person) => categoryOf(person.assignment) === "Workstations").length
        const flexCount = depPeople.filter((person) => person.assignment === "flex").length
        const growth = dep.futureHeadcount !== undefined && dep.futureHeadcount !== dep.headcount
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
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700" title="Named people assigned to an office type">
                  {offCount} offices
                </span>
                <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-cyan-700" title="Named people assigned to a workstation type">
                  {deskCount} workstations
                </span>
                {flexCount > 0 && (
                  <span className="rounded-full bg-slate-50 px-2.5 py-1 text-slate-500">{flexCount} shared</span>
                )}
              </div>
            </div>
            {rows.length === 0 ? (
              <p className="mt-3 text-xs text-slate-400">
                No roster captured for this department. Its program remains managed through department allocation counts.
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
                      <select
                        value={rosterPeople.find((person) => person.id === r.id)?.assignment ?? "flex"}
                        onChange={(e) => onAssign(r.id, e.target.value)}
                        aria-label={`Assign ${r.name} to a space type`}
                        className="max-w-44 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 focus:border-[#00badc] focus:outline-none"
                      >
                        <option value="flex">Flexible / unassigned</option>
                        <optgroup label="Workstations">
                          {seatOptions.filter((option) => option.category === "Workstations").map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                        </optgroup>
                        <optgroup label="Offices">
                          {seatOptions.filter((option) => option.category === "Offices").map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                        </optgroup>
                      </select>
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
  line, base, result, briefing, colors, showChips, showRatios, showSurvey, showToday, showAllocations, showDimensions, showNotes, compact, onQty, onSf, onInfo, onDuplicate, onDelete, onRename, onCategory,
  departments, deptAlloc, onAllocChange, surveyAskByDept, categoryAllocated, categoryQty,
  note, onNote, notesOpen, onToggleNotes, mode, rosterPeople, seatOptions, onAssign,
  inAlignmentQueue, alignmentActive, onToggleAlignment,
}: {
  line: ComparisonLine
  base?: ComparisonLine
  result: SurveyResult
  briefing: boolean
  colors: { accent: string; text: string; tint: string }
  showChips: boolean
  showRatios: boolean
  showSurvey: boolean
  showToday: boolean
  showAllocations: boolean
  showDimensions: boolean
  showNotes: boolean
  /** Compact layer: just the name and the numbers — the fast read. */
  compact?: boolean
  mode: CardMode
  rosterPeople: { id: string; name: string; department: string; assignment: string | "flex" }[]
  seatOptions: { key: string; label: string; category: "Workstations" | "Offices" }[]
  onAssign: (personId: string, target: string | "flex") => void
  inAlignmentQueue: boolean
  alignmentActive: boolean
  onToggleAlignment: () => void
  onQty: (n: number) => void
  onSf: (n: number | null) => void
  onInfo: () => void
  onDuplicate: () => void
  onDelete?: () => void
  onRename?: (name: string) => void
  /** Custom (studio-added) cards only — which category's total this counts toward. */
  onCategory?: (category: CompCategory) => void
  /** Dept-allocation panel — Workstations/Offices only (collab/support skip it by design). */
  departments: { id: string; name: string; color: string }[]
  deptAlloc: Record<string, number>
  onAllocChange: (deptId: string, n: number) => void
  surveyAskByDept: Record<string, number> | null
  categoryAllocated: number
  categoryQty: number
  note: string
  onNote: (text: string) => void
  notesOpen: boolean
  onToggleNotes: () => void
}) {
  const [rotated, setRotated] = useState(false)
  const deptName = (id: string) => result.people.departments.find((x) => x.id === id)?.name ?? id
  const sfChanged = !!base && line.unitSF !== base.unitSF
  const qtyChanged = !!base && line.proposedCount !== base.proposedCount
  const isAddition = line.key.startsWith("studio:")

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

  // Seat accounting — where every configured seat goes, by department.
  // Scoped to Workstations/Offices only; collab/support share space by design
  // and don't map one-to-one to a person.
  const seatAccounted = line.category === "Workstations" || line.category === "Offices"
  const allocatedTotal = Object.values(deptAlloc).reduce((a, b) => a + b, 0)
  const unassigned = Math.max(0, line.proposedCount - allocatedTotal)
  const over = Math.max(0, allocatedTotal - line.proposedCount)
  const assignedPeople = rosterPeople.filter((person) => person.assignment === line.key)
  const sizeOptions = line.category === "Workstations" ? WORKSTATION_SIZES : line.category === "Offices" ? OFFICE_SIZES : []
  const dimensionLabel = dims(line.unitSF)
  const shownDimension = rotated && dimensionLabel?.includes("×")
    ? dimensionLabel.split("×").map((part) => part.trim()).reverse().join(" × ")
    : dimensionLabel

  return (
    <div
      id={`space-${line.key}`}
      className={`overflow-hidden rounded-lg border bg-white transition-all hover:shadow-md ${alignmentActive ? "ring-2 ring-[#00badc] ring-offset-2" : ""} ${qtyChanged || sfChanged ? "shadow-[0_0_0_1px_rgba(0,186,220,0.18)]" : ""} ${isAddition ? "border-[#00badc]/40" : "border-slate-200"}`}
      style={{ borderTop: `3px solid ${colors.accent}` }}
    >
      <div className="flex items-start gap-3 px-5 pb-3 pt-4">
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: colors.text }}>
            {line.category}{isAddition ? " / Studio addition" : " / Program standard"}
          </p>
          <div className="flex items-center gap-2">
            {onRename ? (
              <input
                value={line.label}
                onChange={(e) => onRename(e.target.value)}
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent text-base font-bold text-slate-900 hover:border-slate-200 focus:border-[#00badc] focus:outline-none"
              />
            ) : (
              <span className="min-w-0 flex-1 truncate text-base font-bold text-slate-900">{line.label}</span>
            )}
            <span className="flex shrink-0 items-center gap-1">
              {sfChanged && <Dot c="#f43f5e" title="Unit size changed from ratio baseline" />}
              {qtyChanged && <Dot c="#8b5cf6" title="Quantity changed from ratio baseline" />}
            </span>
          </div>
        </div>
        {!briefing && (
          <span className="flex shrink-0 items-center">
            {seatAccounted && <span className="mr-1 text-[10px] font-semibold tabular-nums text-slate-400" title="Named occupants assigned to this exact space type">{assignedPeople.length} named</span>}
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

      {briefing ? (
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="text-sm text-slate-600 tabular-nums">{line.proposedCount} × {line.unitSF} SF{dims(line.unitSF) ? ` (${dims(line.unitSF)})` : ""}</span>
          <span className="ml-auto text-sm font-bold tabular-nums text-slate-900">{(line.proposedCount * line.unitSF).toLocaleString()} SF</span>
        </div>
      ) : (
        /* Number grid — QTY / SF EA / TOTAL SF as labeled cells, the same
           anatomy everywhere in the Studio; qty gets width to spare so a
           3-digit count never clips. */
        <div className="grid grid-cols-[1.15fr_1fr_1fr] gap-px border-y border-slate-200 bg-slate-200">
          <div className="relative px-5 py-3.5" style={{ backgroundColor: colors.tint }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Configured quantity</p>
            <div className="mt-1 flex items-center gap-0.5">
              <button
                onClick={() => onQty(Math.max(0, line.proposedCount - 1))}
                aria-label="Decrease quantity"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00badc]/10 text-[#0089a3] transition-colors hover:bg-[#00badc]/20"
              >
                <Minus className="h-3 w-3" />
              </button>
              <input
                type="number" min={0} value={line.proposedCount}
                onChange={(e) => onQty(Math.max(0, Number(e.target.value)))}
                className="w-full min-w-0 rounded-md border-none bg-transparent text-center text-xl font-bold tabular-nums text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#00badc]/40"
              />
              <button
                onClick={() => onQty(line.proposedCount + 1)}
                aria-label="Increase quantity"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00badc]/10 text-[#0089a3] transition-colors hover:bg-[#00badc]/20"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            {seatAccounted && line.proposedCount > 0 && (
              <div className="mt-2">
                <div className="flex h-1.5 overflow-hidden rounded-full bg-white/80">
                  {departments.map((department) => {
                    const value = deptAlloc[department.id] ?? 0
                    return value > 0 ? <span key={department.id} style={{ width: `${Math.min(100, (value / line.proposedCount) * 100)}%`, backgroundColor: department.color }} /> : null
                  })}
                </div>
                <p className="mt-1 text-[9px] font-medium text-slate-500">{allocatedTotal} allocated · {unassigned} flexible</p>
              </div>
            )}
          </div>
          <div className="bg-white px-5 py-3.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Unit area</p>
            <input
              type="number" min={1} value={line.unitSF}
              onChange={(e) => onSf(e.target.value === "" ? null : Number(e.target.value))}
              className="mt-1 w-full min-w-0 rounded-md border-none bg-transparent text-center text-xl font-bold tabular-nums text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#00badc]/40"
            />
            {showDimensions && shownDimension && <p className="text-center text-[10px] font-semibold text-[#0089a3]">{shownDimension}</p>}
          </div>
          <div className="bg-slate-50 px-5 py-3.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Planned area</p>
            <p className="mt-2 text-center text-xl font-bold tabular-nums text-slate-900">{(line.proposedCount * line.unitSF).toLocaleString()} <span className="text-xs font-semibold text-slate-400">SF</span></p>
          </div>
        </div>
      )}

      {!briefing && mode === "program" && sizeOptions.length > 0 && !compact && (
        <div className="border-b border-slate-100 px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">Common standards</p>
            <button onClick={() => setRotated((value) => !value)} className="text-[9px] font-bold text-[#0089a3]">Swap orientation</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sizeOptions.map((option) => (
              <button key={option.id} onClick={() => onSf(option.sf)} className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${line.unitSF === option.sf ? "border-[#00badc] bg-[#00badc]/10 text-[#007c94]" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                {rotated ? option.label.split("×").map((part) => part.trim()).reverse().join(" × ") : option.label} <span className="text-slate-400">{option.sf}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!briefing && mode === "program" && (showRatios || showSurvey || showToday) && (
        <div
          className="grid divide-x divide-slate-100 border-b border-slate-200 bg-slate-50"
          style={{ gridTemplateColumns: `repeat(${[showToday, showSurvey, showRatios, true].filter(Boolean).length}, minmax(0, 1fr))` }}
        >
          {showToday && (
            <EvidenceCell
              label="Today"
              value={line.existingCountKnown ? line.existingCount : "—"}
              detail={line.existingCountKnown ? `${line.existingCount - line.proposedCount >= 0 ? "+" : ""}${line.existingCount - line.proposedCount} vs plan` : "not captured"}
            />
          )}
          {showSurvey && (
            <EvidenceCell
              label="Survey ask"
              value={surveyAsk ?? (supportFlagged ? "Yes" : "—")}
              detail={supportFlagged ? "client must-have" : surveyAsk !== null && engineCount !== undefined ? `${surveyAsk - engineCount >= 0 ? "+" : ""}${surveyAsk - engineCount} vs engine` : "no count requested"}
              warning={supportFlagged || (surveyAsk !== null && engineCount !== undefined && surveyAsk !== engineCount)}
            />
          )}
          {showRatios && (
            <EvidenceCell
              label="Engine"
              value={engineCount ?? "—"}
              detail={line.ratio ?? (isAddition ? "added in Studio" : "ratio baseline")}
            />
          )}
          <EvidenceCell
            label="Configured plan"
            value={line.proposedCount}
            detail={engineCount === undefined ? "session truth" : configuredDelta === 0 ? "matches engine" : `${configuredDelta > 0 ? "+" : ""}${configuredDelta} vs engine`}
            active
            warning={configuredDelta !== 0}
          />
        </div>
      )}

      {mode === "program" && showChips && alloc.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-5 py-3">
          {alloc.map(([name, n]) => (
            <span key={name} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: colors.tint, color: colors.text }}>
              {name} · {n}
            </span>
          ))}
          {seatAccounted && unassigned > 0 && <span className="ml-auto text-[11px] font-bold text-amber-700">{unassigned} unassigned</span>}
          {seatAccounted && over > 0 && <span className="ml-auto text-[11px] font-bold text-rose-700">{over} over plan</span>}
        </div>
      )}

      {/* Dept allocation — collapsible, seat-accounted lines only. Answers
          "we added two, where did they go" and "we cut one, who loses a
          seat" with real per-department numbers instead of a silent total. */}
      {!briefing && mode === "allocation" && showAllocations && seatAccounted && (
        <div className="border-t border-slate-100">
          <div className="flex w-full items-center justify-between px-4 py-2 text-left">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <ChevronDown className="h-3 w-3" />
              Dept allocation
            </span>
            {unassigned > 0 ? (
              <span className="text-[11px] font-bold text-orange-600">{unassigned} unassigned</span>
            ) : over > 0 ? (
              <span className="text-[11px] font-bold text-rose-600">{over} over</span>
            ) : allocatedTotal > 0 ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600"><Check className="h-3 w-3" /> fully seated</span>
            ) : (
              <span className="text-[11px] text-slate-300">not allocated</span>
            )}
          </div>
          {(
            <div className="px-4 pb-3">
              {categoryQty > 0 && (
                <p className="mb-2 text-[10px] leading-relaxed text-slate-400">
                  Across all {line.category} cards: <b className="text-slate-600">{categoryAllocated} / {categoryQty}</b> planned
                </p>
              )}
              <div className="space-y-1">
                {departments.map((dep) => {
                  const val = deptAlloc[dep.id] ?? 0
                  const ask = surveyAskByDept?.[dep.id]
                  const matches = ask !== undefined && val === ask
                  const diverges = ask !== undefined && ask > 0 && !matches
                  return (
                    <div key={dep.id} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-slate-700">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dep.color }} />
                        <span className="truncate">{dep.name}</span>
                        {matches && <Check className="h-3 w-3 shrink-0 text-emerald-500" aria-label="Matches what the survey asked for this department" />}
                        {diverges && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" title={`Survey asked ${ask} for this department`} />}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => onAllocChange(dep.id, val - 1)}
                          aria-label={`Decrease ${dep.name} allocation`}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <span className="w-5 text-center text-xs font-semibold tabular-nums text-slate-800">{val}</span>
                        <button
                          onClick={() => onAllocChange(dep.id, val + 1)}
                          aria-label={`Increase ${dep.name} allocation`}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-2.5 border-t border-slate-100 pt-2">
                {unassigned > 0 && (
                  <p className="text-[11px] font-medium text-orange-600">{unassigned} configured but not yet given to a department.</p>
                )}
                {over > 0 && (
                  <p className="text-[11px] font-medium text-rose-600">{over} more allocated than configured — trim a department below, or raise the qty above.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!briefing && mode === "allocation" && !seatAccounted && (
        <div className="px-4 py-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Shared-space allocation</p>
          <div className="mt-3 flex h-7 overflow-hidden border border-slate-200">
            {alloc.length ? alloc.map(([name, value], index) => (
              <span key={name} className="flex items-center justify-center text-[9px] font-bold" style={{ width: `${Math.max(12, (value / Math.max(1, alloc.reduce((sum, [, count]) => sum + count, 0))) * 100)}%`, backgroundColor: index % 2 ? "#dbeafe" : colors.tint, color: index % 2 ? "#1d4ed8" : colors.text }}>{name} {value}</span>
            )) : <span className="flex flex-1 items-center justify-center bg-slate-50 text-[10px] text-slate-400">Shared program space · no named-seat allocation needed</span>}
          </div>
        </div>
      )}

      {!briefing && mode === "roster" && (
        <div className="border-t border-slate-100">
          {seatAccounted ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <div><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Named roster assignment</p><p className="mt-0.5 text-[10px] text-slate-500">People selected here occupy this exact space type.</p></div>
                <span className="text-[10px] font-bold text-[#0089a3]">{assignedPeople.length} assigned</span>
              </div>
              <div className="max-h-56 overflow-y-auto p-4">
                <div className="flex flex-wrap gap-1.5">
                  {rosterPeople.map((person) => {
                    const selected = person.assignment === line.key
                    const elsewhere = person.assignment !== "flex" && !selected
                    const target = seatOptions.find((option) => option.key === person.assignment)?.label
                    return (
                      <button key={person.id} onClick={() => onAssign(person.id, selected ? "flex" : line.key)} title={`${person.department}${elsewhere ? ` · currently ${target}` : ""}`} className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-medium ${selected ? "border-[#00badc] bg-[#e8f8fb] text-[#007c94]" : elsewhere ? "border-slate-200 bg-slate-50 text-slate-400" : "border-slate-200 bg-white text-slate-600"}`}>
                        <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${selected ? "bg-[#00badc] text-white" : "bg-slate-100 text-slate-400"}`}>{selected ? <Check className="h-2.5 w-2.5" /> : <UserRound className="h-2.5 w-2.5" />}</span>
                        {person.name}
                      </button>
                    )
                  })}
                </div>
                {!rosterPeople.length && <p className="text-xs text-slate-400">No named roster was captured. Department allocation remains available by headcount.</p>}
              </div>
            </>
          ) : (
            <div className="px-4 py-4 text-xs text-slate-500">This is shared program space, so named-seat assignment is intentionally not used here. Use allocation, notes, or alignment instead.</div>
          )}
        </div>
      )}

      {!briefing && mode === "alignment" && (
        <div className="grid grid-cols-[minmax(0,1fr)_170px] border-t border-slate-100">
          <div className="p-4">
            <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#0089a3]"><Sparkles className="h-3.5 w-3.5" /> {inAlignmentQueue ? "Team alignment point" : "Suggested review"}</p>
            <h4 className="mt-1.5 text-sm font-bold text-slate-900">{seatAccounted && unassigned > 0 ? `Review how ${unassigned} flexible ${line.category === "Offices" ? "offices" : "seats"} should be distributed.` : configuredDelta !== 0 ? `Confirm the configured quantity relative to the engine reference.` : `Confirm this space supports the team conversation.`}</h4>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">A review point is context for the room, not a warning. The configured plan remains the working truth.</p>
          </div>
          <div className="border-l border-slate-100 bg-slate-50 p-3">
            <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">Facilitation</p>
            <button onClick={onToggleAlignment} className={`mt-2 w-full px-2 py-2 text-[9px] font-bold ${inAlignmentQueue ? "border border-[#00badc] bg-[#e8f8fb] text-[#007c94]" : "bg-slate-900 text-white"}`}>{inAlignmentQueue ? "Remove from queue" : "Add to alignment queue"}</button>
            <button onClick={onInfo} className="mt-2 w-full border border-slate-200 bg-white px-2 py-2 text-[9px] font-bold text-slate-500">Review space reference</button>
          </div>
        </div>
      )}

      {/* Notes — what the room said, riding into the brief and the fit-planning package. */}
      {!briefing && showNotes && (
        <div className="border-t border-slate-100">
          <button
            onClick={onToggleNotes}
            className="flex w-full items-center gap-1.5 px-4 py-2 text-left text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          >
            <StickyNote className="h-3 w-3" />
            Notes
            {note.trim() && <span className="h-1.5 w-1.5 rounded-full bg-[#00badc]" />}
            <span className="ml-auto">{notesOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}</span>
          </button>
          {notesOpen && (
            <div className="px-4 pb-3">
              <textarea
                value={note}
                onChange={(e) => onNote(e.target.value)}
                placeholder="Add notes about this space…"
                rows={2}
                className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#00badc] focus:outline-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** One source-of-truth cell in the card's evidence ledger. */
function EvidenceCell({
  label, value, detail, active, warning,
}: {
  label: string
  value: string | number
  detail: string
  active?: boolean
  warning?: boolean
}) {
  return (
    <div className={`min-w-0 px-4 py-3 ${active ? "bg-[#e9f7fb]" : ""}`}>
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{value}</p>
      <p className={`truncate text-[10px] ${warning ? "font-semibold text-amber-700" : "text-slate-400"}`} title={detail}>{detail}</p>
    </div>
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

function DrawerBtn({ label, active, onClick, icon, children }: { label: string; active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label}
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

/** The category mix, drawn — the client's own mark at the center when uploaded. */
function programExpressionProfile(deliverable: Deliverable, engine: Deliverable): ProfileScores {
  const next = { ...deliverable.profile }
  const ratio = (category: DeliverableCategory["name"]) => {
    const current = deliverable.categories.find((row) => row.name === category)?.proposedNetSF ?? 0
    const baseline = engine.categories.find((row) => row.name === category)?.proposedNetSF ?? 0
    return baseline > 0 ? current / baseline : 1
  }
  const clamp = (value: number) => Math.max(0, Math.min(10, Math.round(value * 10) / 10))
  next.Collaboration = clamp(next.Collaboration + (ratio("Collaboration") - 1) * 2.4)
  next.Amenity = clamp(next.Amenity + (ratio("Support") - 1) * 2.2)
  next.Privacy = clamp(next.Privacy + (ratio("Offices") - 1) * 2.5)
  next.Flexibility = clamp(next.Flexibility + ((ratio("Collaboration") + ratio("Support")) / 2 - 1) * 1.8)
  const densityRatio = deliverable.totals.sfPerPerson > 0 ? engine.totals.sfPerPerson / deliverable.totals.sfPerPerson : 1
  next.Density = clamp(next.Density + (densityRatio - 1) * 3)
  return next
}

function RailSubTabs<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div className="mt-3 flex overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-0.5 text-[9px] font-bold">
      {options.map((option) => <button key={option.id} onClick={() => onChange(option.id)} className={`flex-1 rounded px-2 py-1.5 ${value === option.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>{option.label}</button>)}
    </div>
  )
}

function RailMetric({ label, value, unit, detail }: { label: string; value: string; unit?: string; detail?: string }) {
  return (
    <div className="bg-slate-50 p-3">
      <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{value}{unit && <span className="ml-1 text-[9px] font-semibold text-slate-400">{unit}</span>}</p>
      {detail && <p className="mt-0.5 truncate text-[9px] text-slate-400">{detail}</p>}
    </div>
  )
}

function ProgramStatusRow({ label, configured, goal }: { label: string; configured: number; goal: number }) {
  const max = Math.max(configured, goal, 1)
  const delta = configured - goal
  return (
    <div>
      <div className="flex items-center justify-between text-[10px]"><span className="font-semibold text-slate-600">{label}</span><span className="tabular-nums text-slate-500">{configured} configured · {goal} engine</span></div>
      <div className="mt-1.5 space-y-1">
        <div className="h-1.5 bg-slate-100"><div className="h-1.5 bg-slate-300" style={{ width: `${(goal / max) * 100}%` }} /></div>
        <div className="h-1.5 bg-[#00badc]/10"><div className="h-1.5 bg-[#00badc]" style={{ width: `${(configured / max) * 100}%` }} /></div>
      </div>
      <p className="mt-1 text-[9px] text-slate-400">{delta === 0 ? "No movement" : `${delta > 0 ? "+" : ""}${delta} from engine`}</p>
    </div>
  )
}

function CategoryDistributionRow({ category, total }: { category: DeliverableCategory; total: number }) {
  const percent = Math.round((category.proposedTotalSF / (total || 1)) * 100)
  return (
    <div>
      <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: CATEGORY_COLORS[category.name].accent }} /><span className="text-slate-600">{category.name}</span><span className="ml-auto font-medium text-slate-800">{category.proposedTotalSF.toLocaleString()} SF</span><span className="w-8 text-right text-[10px] text-slate-400">{percent}%</span></div>
      <div className="mt-1 h-1.5 bg-slate-100"><div className="h-1.5" style={{ width: `${percent}%`, backgroundColor: CATEGORY_COLORS[category.name].accent }} /></div>
    </div>
  )
}

function DepartmentDistribution({ result, rosterPeople, seatOptions, deptAlloc }: {
  result: SurveyResult
  rosterPeople: { id: string; name: string; department: string; assignment: string | "flex" }[]
  seatOptions: { key: string; label: string; category: "Workstations" | "Offices" }[]
  deptAlloc: Record<string, Record<string, number>>
}) {
  const rows = result.people.departments.map((department) => {
    const named = rosterPeople.filter((person) => person.department === department.name)
    const categoryFor = (assignment: string) => seatOptions.find((option) => option.key === assignment)?.category
    const namedWorkstations = named.filter((person) => categoryFor(person.assignment) === "Workstations").length
    const namedOffices = named.filter((person) => categoryFor(person.assignment) === "Offices").length
    const allocated = (category: "Workstations" | "Offices") => seatOptions.filter((option) => option.category === category).reduce((sum, option) => sum + (deptAlloc[option.key]?.[department.id] ?? 0), 0)
    const workstationPlan = allocated("Workstations") || result.work.dedicatedByDept?.[department.id] || 0
    const officePlan = allocated("Offices") || result.spaces.privateOfficesByDept[department.id] || 0
    return { name: department.name, headcount: department.futureHeadcount ?? department.headcount, workstationPlan, officePlan, namedWorkstations, namedOffices }
  })
  const max = Math.max(1, ...rows.map((row) => row.workstationPlan + row.officePlan))
  return (
    <div className="mt-4 divide-y divide-slate-100">
      {rows.map((row) => (
        <div key={row.name} className="py-3 first:pt-0">
          <div className="flex items-center justify-between gap-2"><span className="truncate text-[11px] font-semibold text-slate-700">{row.name}</span><span className="shrink-0 text-[9px] tabular-nums text-slate-400">{row.headcount} people</span></div>
          <div className="mt-1.5 flex h-2 overflow-hidden bg-slate-100"><span className="bg-[#00badc]" style={{ width: `${(row.workstationPlan / max) * 100}%` }} /><span className="bg-[#2563eb]" style={{ width: `${(row.officePlan / max) * 100}%` }} /></div>
          <div className="mt-1 flex items-center gap-3 text-[9px] text-slate-400"><span><b className="text-[#0089a3]">{row.workstationPlan}</b> workstations · {row.namedWorkstations} named</span><span><b className="text-blue-600">{row.officePlan}</b> offices · {row.namedOffices} named</span></div>
        </div>
      ))}
      {!rows.length && <p className="py-4 text-xs text-slate-400">No department allocation is available.</p>}
    </div>
  )
}

function SpaceTypeDistribution({ categories }: { categories: DeliverableCategory[] }) {
  const rows = categories.flatMap((category) => category.lines.map((line) => ({ ...line, total: line.proposedCount * line.unitSF, accent: CATEGORY_COLORS[category.name].accent }))).filter((line) => line.total > 0).sort((a, b) => b.total - a.total)
  const max = Math.max(1, ...rows.map((row) => row.total))
  return (
    <div className="mt-4 space-y-3">
      {rows.map((row) => <div key={row.key}><div className="flex items-center justify-between gap-2 text-[10px]"><span className="truncate font-medium text-slate-600">{row.label}</span><span className="shrink-0 tabular-nums text-slate-400">{row.proposedCount} × {row.unitSF} · <b className="text-slate-600">{row.total.toLocaleString()} SF</b></span></div><div className="mt-1 h-1.5 bg-slate-100"><div className="h-1.5" style={{ width: `${(row.total / max) * 100}%`, backgroundColor: row.accent }} /></div></div>)}
    </div>
  )
}

function PeoplePlaceBalance({ deliverable, engine, rosterPeople, status }: { deliverable: Deliverable; engine: Deliverable | null; rosterPeople: { assignment: string | "flex" }[]; status: { label: string; configured: number; goal: number }[] }) {
  const namedAssigned = rosterPeople.filter((person) => person.assignment !== "flex").length
  const peoplePct = rosterPeople.length ? Math.round((namedAssigned / rosterPeople.length) * 100) : 0
  const engineGross = engine?.totals.grossUsableSF ?? deliverable.totals.grossUsableSF
  const placePct = engineGross ? Math.max(0, Math.round((1 - Math.abs(deliverable.totals.grossUsableSF - engineGross) / engineGross) * 100)) : 100
  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-slate-200">
        <RailMetric label="People connected" value={`${peoplePct}%`} detail={`${namedAssigned} of ${rosterPeople.length} named`} />
        <RailMetric label="Place reference" value={`${placePct}%`} detail="proximity to engine area" />
      </div>
      <div className="mt-4 space-y-4">
        <div><div className="flex justify-between text-[10px]"><span className="font-semibold text-slate-600">People</span><span className="text-slate-400">named assignment</span></div><div className="mt-1 h-2 bg-slate-100"><div className="h-2 bg-[#00badc]" style={{ width: `${peoplePct}%` }} /></div></div>
        <div><div className="flex justify-between text-[10px]"><span className="font-semibold text-slate-600">Place</span><span className="text-slate-400">configured / engine reference</span></div><div className="mt-1 h-2 bg-slate-100"><div className="h-2 bg-[#2563eb]" style={{ width: `${placePct}%` }} /></div></div>
      </div>
      <div className="mt-5 border-t border-slate-100 pt-4"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Program expression</p><div className="mt-3 space-y-3">{status.map((row) => <ProgramStatusRow key={row.label} {...row} />)}</div></div>
    </div>
  )
}

function StudioProfileRadar({ scores, configured }: { scores: ProfileScores; configured?: ProfileScores }) {
  const data = PROFILE_AXES.map((axis) => ({ axis, value: scores[axis], configured: configured?.[axis] }))
  return (
    <div className="my-2 h-[190px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="62%">
          <PolarGrid stroke="#dbe3ea" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "#64748b", fontSize: 9 }} />
          <Radar dataKey="value" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.08} isAnimationActive={false} />
          {configured && <Radar dataKey="configured" stroke="#00badc" fill="#00badc" fillOpacity={0.16} isAnimationActive animationDuration={300} />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

function SessionImpactChart({ data }: { data: { category: string; delta: number }[] }) {
  const total = data.reduce((sum, row) => sum + row.delta, 0)
  const max = Math.max(1, ...data.map((row) => Math.abs(row.delta)))
  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Area movement</p>
        <p className="text-[11px] font-bold tabular-nums text-slate-700">{total > 0 ? "+" : ""}{Math.round(total).toLocaleString()} SF <span className="font-medium text-slate-400">from engine</span></p>
      </div>
      <div className="mt-2 h-[145px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 2, right: 8, bottom: 2, left: 2 }}>
            <CartesianGrid horizontal={false} stroke="#eef2f6" />
            <XAxis type="number" domain={[-max, max]} hide />
            <YAxis type="category" dataKey="category" width={74} tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
            <ReferenceLine x={0} stroke="#94a3b8" />
            <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} SF`, "From engine"]} cursor={{ fill: "#f8fafc" }} />
            <Bar dataKey="delta" radius={2}>
              {data.map((row) => <Cell key={row.category} fill={CATEGORY_COLORS[row.category as keyof typeof CATEGORY_COLORS].accent} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function DonutChart({ categories, total, logo }: { categories: DeliverableCategory[]; total: number; logo?: string }) {
  const R = 38
  const C = 2 * Math.PI * R
  let offset = 0
  const segments = categories.filter((c) => c.proposedTotalSF > 0)
  return (
    <div className="relative mx-auto mt-3 h-32 w-32">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#f1f5f9" strokeWidth="13" />
        {segments.map((c) => {
          const frac = c.proposedTotalSF / (total || 1)
          const dash = frac * C
          const el = (
            <circle
              key={c.name} cx="50" cy="50" r={R} fill="none" stroke={CATEGORY_COLORS[c.name].accent} strokeWidth="13"
              strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset} strokeLinecap="butt"
            >
              <title>{`${c.name} · ${c.proposedTotalSF.toLocaleString()} SF · ${Math.round(frac * 100)}%`}</title>
            </circle>
          )
          offset += dash
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {logo ? (
          <img src={logo} alt="" className="h-14 w-14 rounded-full object-contain" />
        ) : (
          <Image src="/NELSON_color.png" alt="" width={56} height={56} className="h-8 w-auto opacity-40" />
        )}
      </div>
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
