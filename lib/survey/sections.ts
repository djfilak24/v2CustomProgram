/**
 * Survey model — the data-driven steps, the structured answer state, the live
 * "Workplace Profile" radar scoring, and the mapper into a SurveyResult.
 *
 * This implements SURVEY_SPEC.md §3–4: the department spine (entered once,
 * flows forward), the Quick / Detailed / Defer lanes, the collaboration
 * decision tree, and the qualitative section. Everything captured is typed —
 * narrative fields ride along to the handoff as notes, never driving a
 * calculation (the one rule, SURVEY_SPEC §1).
 */

import type { SurveyResult } from "./types"

// ── Profile radar ────────────────────────────────────────────────────────────

export type ProfileAxis =
  | "Collaboration"
  | "Flexibility"
  | "Growth"
  | "Density"
  | "Privacy"
  | "Amenity"

export const PROFILE_AXES: ProfileAxis[] = [
  "Collaboration",
  "Flexibility",
  "Growth",
  "Density",
  "Privacy",
  "Amenity",
]

export type ProfileScores = Record<ProfileAxis, number>

/** Everyone starts here; the radar fills out as answers come in. */
export const BASELINE_SCORE = 2.5

// ── Lanes ────────────────────────────────────────────────────────────────────

export type Lane = "quick" | "detailed"

// ── The department spine ─────────────────────────────────────────────────────

export interface Employee {
  id: string
  name: string
}

export interface SpineDept {
  /** Stable id; keys every downstream per-dept map. */
  id: string
  name: string
  /** Current in-office headcount. In "full" roster mode this tracks employees.length. */
  headcount: number
  /** Future (3–5 yr) headcount — set in the detailed growth lane. */
  futureHeadcount?: number
  /** Named roster (leaders or full team), used by the people decision tree. */
  employees?: Employee[]
}

export function makeEmployee(name = ""): Employee {
  return { id: newDeptId() + "e", name }
}

/**
 * People-detail decision tree: how granular the roster is. "full" derives
 * headcount from the named roster; "leaders"/"simple" keep manual headcount.
 */
export type PeopleMode = "simple" | "leaders" | "full"

export const PEOPLE_MODES: CardOption[] = [
  { id: "simple", label: "Keep it simple", description: "Headcount by department", icon: "users" },
  { id: "leaders", label: "Name your leaders", description: "Leaders named, rest by headcount", icon: "user-check" },
  { id: "full", label: "Full team roster", description: "Everyone named, by department", icon: "shuffle" },
]

let _seq = 0
export function newDeptId(): string {
  _seq += 1
  return `d${Date.now().toString(36)}${_seq}`
}

export function makeDept(name = "", headcount = 0): SpineDept {
  return { id: newDeptId(), name, headcount }
}

/** Reasonable starter rows so the spine isn't an empty void on first open. */
export function starterDepartments(): SpineDept[] {
  return [
    makeDept("Leadership", 8),
    makeDept("Operations", 24),
    makeDept("Sales & Marketing", 18),
  ]
}

// ── Catalog constants (reused by the page renderer) ──────────────────────────

export interface CardOption {
  id: string
  label: string
  description?: string
  icon?: string
  stats?: string[]
}

/** Section 2 — company-wide work pattern (Quick lane). */
export const WORK_PATTERNS: CardOption[] = [
  { id: "office", label: "Mostly in-office", description: "4–5 days / week", icon: "building", stats: ["Higher density", "Assigned seats"] },
  { id: "hybrid", label: "Balanced hybrid", description: "2–3 days / week", icon: "calendar", stats: ["Shared seats", "Flexible"] },
  { id: "remote", label: "Mostly remote", description: "0–1 days / week", icon: "home", stats: ["Touchdown-led", "Low density"] },
]

/** Map a work-pattern choice to in-office days/week. */
export const WORK_PATTERN_DAYS: Record<string, number> = { office: 5, hybrid: 3, remote: 1 }

/** Section 2 — dedicated vs. flex posture (Quick lane). */
export const SEATING_POSTURES: CardOption[] = [
  { id: "assigned", label: "Everyone assigned", description: "A desk for every person", icon: "user-check" },
  { id: "mixed", label: "A mix", description: "Some assigned, some shared", icon: "users" },
  { id: "shared", label: "Mostly shared", description: "Free-address / hot-desking", icon: "shuffle" },
]

/** Quick-lane share of people who keep a dedicated seat, by posture. */
export const POSTURE_DEDICATED_RATIO: Record<string, number> = { assigned: 1, mixed: 0.6, shared: 0.25 }

/** Section 3a — private office posture (Quick lane). */
export const OFFICE_POSTURES: CardOption[] = [
  { id: "leaders", label: "Leadership only", description: "Execs / directors", icon: "briefcase" },
  { id: "some", label: "Some roles", description: "Plus select roles", icon: "building" },
  { id: "none", label: "Open plan", description: "No private offices", icon: "users" },
]

/** Section 3b — collaboration space types (these names resolve to SPACE_PRESETS on import). */
export const COLLAB_TYPES: CardOption[] = [
  { id: "Huddle Room", label: "Huddle rooms", description: "2–4 people, quick syncs", icon: "users" },
  { id: "Project Room", label: "Project rooms", description: "Dedicated team space", icon: "presentation" },
  { id: "Phone Room", label: "Phone / focus rooms", description: "Heads-down, calls", icon: "phone" },
  { id: "Open Collaboration Lounge", label: "Open lounges", description: "Casual, social", icon: "coffee" },
  { id: "Conference Room", label: "Conference rooms", description: "Larger meetings", icon: "presentation" },
]

/** Section 3c — support spaces checklist (names resolve to SPACE_PRESETS). */
export const SUPPORT_TYPES: CardOption[] = [
  { id: "Copy/Print", label: "Copy / print", icon: "printer" },
  { id: "Storage", label: "Storage", icon: "box" },
  { id: "Break Room", label: "Break room", icon: "coffee" },
  { id: "Wellness Room", label: "Wellness / mother's room", icon: "heart" },
  { id: "Reception", label: "Reception / front of house", icon: "building" },
  { id: "Mail Room", label: "Mail room", icon: "box" },
]

/** Section 1 — company growth presets (Quick lane). */
export const GROWTH_PRESETS: CardOption[] = [
  { id: "stable", label: "Stable", description: "±5% headcount", icon: "minus" },
  { id: "growing", label: "Growing", description: "+10–25% headcount", icon: "trending-up" },
  { id: "rapid", label: "Rapid / reshaping", description: "+25% or shifting mix", icon: "sparkles" },
]

export const GROWTH_PRESET_PCT: Record<string, number> = { stable: 5, growing: 18, rapid: 30 }

// ── Existing conditions (current furniture + sizes) ──────────────────────────

export interface SizeOption { id: string; label: string; sf: number }

/** Standard workstation footprints (W × D). */
export const WORKSTATION_SIZES: SizeOption[] = [
  { id: "6x6", label: "6′ × 6′", sf: 36 },
  { id: "6x7", label: "6′ × 7′", sf: 42 },
  { id: "6x8", label: "6′ × 8′", sf: 48 },
  { id: "8x8", label: "8′ × 8′", sf: 64 },
  { id: "8x10", label: "8′ × 10′", sf: 80 },
]

/** Standard private-office footprints. */
export const OFFICE_SIZES: SizeOption[] = [
  { id: "10x10", label: "10′ × 10′", sf: 100 },
  { id: "10x12", label: "10′ × 12′", sf: 120 },
  { id: "12x12", label: "12′ × 12′", sf: 144 },
  { id: "12x15", label: "12′ × 15′", sf: 180 },
  { id: "15x15", label: "15′ × 15′", sf: 225 },
]

export const sizeSf = (catalog: SizeOption[], id: string | null): number | undefined =>
  id ? catalog.find((o) => o.id === id)?.sf : undefined

export type ReusePosture = "reuse" | "mixed" | "new"

export const REUSE_POSTURES: CardOption[] = [
  { id: "reuse", label: "Reusing most", description: "Keep existing furniture", icon: "recycle" },
  { id: "mixed", label: "A mix", description: "Some kept, some new", icon: "shuffle" },
  { id: "new", label: "All new", description: "Fresh furniture standard", icon: "sparkles" },
]

export interface ExistingConditions {
  /** Overall furniture posture (reuse vs. new). */
  furniture: ReusePosture | null
  /** WORKSTATION_SIZES id of today's (or planned) workstation footprint. */
  workstationSize: string | null
  /** OFFICE_SIZES id of today's (or planned) office footprint. */
  officeSize: string | null
  /** Re-using existing conference tables? */
  reuseConfTables: boolean | null
  /** Counts that exist today — optional, pulled forward into later steps. */
  existingWorkstations: number | null
  existingOffices: number | null
}

export function emptyExisting(): ExistingConditions {
  return {
    furniture: null,
    workstationSize: null,
    officeSize: null,
    reuseConfTables: null,
    existingWorkstations: null,
    existingOffices: null,
  }
}

// ── Steps ────────────────────────────────────────────────────────────────────

export type StepId =
  | "people"
  | "existing"
  | "work"
  | "seating"
  | "adjacency"
  | "offices"
  | "collaboration"
  | "support"
  | "feedback"

export interface SurveyStep {
  id: StepId
  /** Short label shown in the progress bar. */
  section: string
  title: string
  subtitle: string
  /** One-line explanation of what going deeper unlocks here. */
  detailedHint?: string
  /** Whether the Detailed lane has a distinct editor on this step. */
  hasDetailed: boolean
  /** Whether "We'll talk live" (defer) is offered. */
  canDefer: boolean
}

export const SURVEY_STEPS: SurveyStep[] = [
  {
    id: "people",
    section: "Your People",
    title: "Who's in your organization?",
    subtitle: "Your departments anchor everything — we ask once, then carry them forward.",
    detailedHint: "List each department with its current and 3–5 year headcount (some grow, some shrink).",
    hasDetailed: true,
    canDefer: false,
  },
  {
    id: "existing",
    section: "Existing Conditions",
    title: "What's in place today?",
    subtitle: "Your current furniture and sizes set our baseline — we'll show a before/after as we build.",
    detailedHint: "Add today's workstation and office counts so later steps start from real numbers.",
    hasDetailed: true,
    canDefer: true,
  },
  {
    id: "work",
    section: "How Teams Work",
    title: "How does your team work?",
    subtitle: "A typical week in the office sets how much we plan to share seats.",
    detailedHint: "Set in-office days per department instead of one company-wide number.",
    hasDetailed: true,
    canDefer: true,
  },
  {
    id: "seating",
    section: "How Teams Work",
    title: "Who needs a dedicated desk, who can share?",
    subtitle: "Dedicated seats vs. flexible, shared space — the core hybrid trade-off.",
    detailedHint: "Set how many people keep a dedicated seat per department.",
    hasDetailed: true,
    canDefer: true,
  },
  {
    id: "adjacency",
    section: "How Teams Work",
    title: "Which teams work closely together?",
    subtitle: "Cross-functional collaboration tells us who to seat near whom.",
    detailedHint: "Captured as adjacency notes for the live session — the tool plans the rest.",
    hasDetailed: false,
    canDefer: true,
  },
  {
    id: "offices",
    section: "Your Space",
    title: "Who needs private offices?",
    subtitle: "Enclosed, assigned space — for leadership or roles that require it.",
    detailedHint: "Assign a private-office count per department with ± steppers.",
    hasDetailed: true,
    canDefer: true,
  },
  {
    id: "collaboration",
    section: "Your Space",
    title: "What collaboration spaces matter most?",
    subtitle: "Spaces you have today or expect to use — pick what's relevant; SF and ratios are how we'll size them.",
    detailedHint: "Set a count per type, per department — the full decision tree.",
    hasDetailed: true,
    canDefer: true,
  },
  {
    id: "support",
    section: "Your Space",
    title: "Which support spaces are must-haves?",
    subtitle: "The shared infrastructure that keeps the floor running — what you have today or will need.",
    hasDetailed: false,
    canDefer: true,
  },
  {
    id: "feedback",
    section: "What's Working",
    title: "What's working, and what isn't?",
    subtitle: "The one place narrative is the point — it rides along to your live session.",
    hasDetailed: false,
    canDefer: true,
  },
]

// ── Structured survey state ──────────────────────────────────────────────────

/** A per-department in-office cadence: an exact/range day band, or "not sure". */
export type DayRange = { min: number; max: number }
export type DayValue = DayRange | "unsure"

export function isUnsure(v: DayValue | undefined): v is "unsure" {
  return v === "unsure"
}

/** A connection between two departments, keyed "idA|idB" with idA < idB. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/**
 * Priority colour ramp for ranked adjacencies — index 0 is the highest priority
 * (bright cyan) fading toward muted slate for lower-priority connections. Shared
 * by the adjacency graph and the summary so list and lines stay in sync.
 */
export function adjacencyColor(index: number, total: number): string {
  const from = [34, 211, 238] // #22d3ee — top priority
  const to = [100, 116, 139] // #64748b — lowest priority
  const t = total <= 1 ? 0 : Math.min(1, index / (total - 1))
  const c = from.map((f, k) => Math.round(f + (to[k] - f) * t))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

export interface SurveyState {
  // Section 1 — people + growth
  totalHeadcount: number | null
  growthChoice: string | null
  departments: SpineDept[]
  /** People-detail decision tree (simple headcount / named leaders / full roster). */
  peopleMode: PeopleMode
  // Existing conditions — current furniture + sizes (baseline)
  existing: ExistingConditions
  // Section 2 — work patterns
  workChoice: string | null
  perDeptDays: Record<string, DayValue>
  // Section 2 — seating
  seatingChoice: string | null
  dedicatedByDept: Record<string, number>
  /** Per-person desk assignment (employee id → gets a dedicated desk). */
  deskByEmployee: Record<string, boolean>
  /** Per-person office assignment (employee id → gets a private office). */
  officeByEmployee: Record<string, boolean>
  // adjacency — connections between departments (visual graph)
  adjacencyPairs: string[]
  // Section 3a — offices
  officeChoice: string | null
  officesByDept: Record<string, number>
  // Section 3b — collaboration
  collabTypes: string[]
  /** type id -> dept id -> count (detailed lane). */
  collabByDept: Record<string, Record<string, number>>
  /** Collaboration spaces that exist today (type id -> current count). */
  existingCollab: Record<string, number>
  // Section 3c — support
  support: string[]
  /** Support spaces that exist today (type id -> current count). */
  existingSupport: Record<string, number>
  // Section 4 — qualitative
  loves: string
  painPoints: string
  imbalances: string
}

export function emptyState(): SurveyState {
  return {
    totalHeadcount: null,
    growthChoice: null,
    departments: starterDepartments(),
    peopleMode: "simple",
    existing: emptyExisting(),
    workChoice: null,
    perDeptDays: {},
    seatingChoice: null,
    dedicatedByDept: {},
    deskByEmployee: {},
    officeByEmployee: {},
    adjacencyPairs: [],
    officeChoice: null,
    officesByDept: {},
    collabTypes: [],
    collabByDept: {},
    existingCollab: {},
    support: [],
    existingSupport: {},
    loves: "",
    painPoints: "",
    imbalances: "",
  }
}

/** Per-question lanes — each step independently Quick or Go-deeper. */
export type LaneMap = Record<StepId, Lane>

/**
 * Lanes default to DETAILED — the client sees everything that's being asked, and
 * can choose to Simplify (which never compromises the output, only the time
 * spent). Steps without a deeper editor stay effectively simple.
 */
export function allLanes(lane: Lane): LaneMap {
  return SURVEY_STEPS.reduce((acc, s) => { acc[s.id] = lane; return acc }, {} as LaneMap)
}

export function emptyLanes(): LaneMap {
  return allLanes("detailed")
}

/**
 * Allocated count for a department — derived from per-person checks when the
 * department has a named roster, otherwise the numeric per-department value.
 */
export function deptAllocated(
  d: SpineDept,
  values: Record<string, number>,
  byEmployee: Record<string, boolean>,
): number {
  const roster = d.employees ?? []
  if (roster.length === 0) return values[d.id] ?? 0
  const checked = roster.filter((e) => byEmployee[e.id]).length
  const hc = d.headcount || 0
  // Full roster → exactly the checked people. Partial ("leaders") → the total
  // count (stepper), floored at the explicitly checked named people.
  if (roster.length >= hc) return checked
  return Math.max(values[d.id] ?? 0, checked)
}

/**
 * Reverse of buildSurveyResult (approximately) — pre-populate a SurveyState from
 * a demo SurveyResult so the presenter can click through a fully-filled survey.
 */
export function surveyStateFromResult(r: import("./types").SurveyResult): SurveyState {
  const s = emptyState()
  s.totalHeadcount = r.people.totalHeadcount
  s.departments = r.people.departments.map((d) => ({
    id: d.id, name: d.name, headcount: d.headcount,
    ...(d.futureHeadcount !== undefined ? { futureHeadcount: d.futureHeadcount } : {}),
  }))
  const pct = r.people.companyGrowthPct ?? 0
  s.growthChoice = pct >= 25 ? "rapid" : pct >= 10 ? "growing" : pct > 0 ? "stable" : null

  const days = r.work.daysInOffice
  s.workChoice = days >= 5 ? "office" : days <= 1 ? "remote" : "hybrid"
  if (r.work.perDeptDaysRange) {
    for (const [id, band] of Object.entries(r.work.perDeptDaysRange)) s.perDeptDays[id] = band
  }
  s.dedicatedByDept = { ...(r.work.dedicatedByDept ?? {}) }

  s.officesByDept = { ...(r.spaces.privateOfficesByDept ?? {}) }
  s.collabTypes = r.spaces.collaboration.map((c) => c.type)
  for (const c of r.spaces.collaboration) if (Object.keys(c.byDept).length) s.collabByDept[c.type] = { ...c.byDept }
  s.support = [...r.spaces.support]

  const ex = r.existing ?? {}
  s.existing = {
    furniture: ex.furniture ?? null,
    workstationSize: WORKSTATION_SIZES.find((o) => o.sf === ex.workstationSF)?.id ?? null,
    officeSize: OFFICE_SIZES.find((o) => o.sf === ex.officeSF)?.id ?? null,
    reuseConfTables: ex.reuseConfTables ?? null,
    existingWorkstations: ex.existingWorkstations ?? null,
    existingOffices: ex.existingOffices ?? null,
  }
  s.existingCollab = { ...(ex.existingCollab ?? {}) }
  s.existingSupport = { ...(ex.existingSupport ?? {}) }

  s.loves = r.qualitative.loves ?? ""
  s.painPoints = r.qualitative.painPoints ?? ""
  s.imbalances = r.qualitative.imbalances ?? ""
  return s
}

/** Σ of department headcounts, or the quick-lane single number when no depts. */
export function effectiveHeadcount(s: SurveyState, lane: Lane): number {
  if (lane === "detailed" && s.departments.length > 0) {
    return s.departments.reduce((sum, d) => sum + (d.headcount || 0), 0)
  }
  return s.totalHeadcount ?? s.departments.reduce((sum, d) => sum + (d.headcount || 0), 0)
}

// ── Live profile scoring (from the real, structured answers) ──────────────────

function clamp(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10))
}

export function computeProfile(s: SurveyState): ProfileScores {
  const scores: ProfileScores = {
    Collaboration: BASELINE_SCORE,
    Flexibility: BASELINE_SCORE,
    Growth: BASELINE_SCORE,
    Density: BASELINE_SCORE,
    Privacy: BASELINE_SCORE,
    Amenity: BASELINE_SCORE,
  }

  // Work pattern → density / flexibility. Quick choice, or the average of the
  // per-department day bands when the detailed lane was used instead.
  let avgDays: number | null = s.workChoice ? WORK_PATTERN_DAYS[s.workChoice] ?? null : null
  if (avgDays === null) {
    const bands = Object.values(s.perDeptDays).filter((v): v is DayRange => v !== "unsure" && v !== undefined)
    if (bands.length) avgDays = bands.reduce((a, b) => a + (b.min + b.max) / 2, 0) / bands.length
  }
  if (avgDays !== null) {
    if (avgDays >= 4) { scores.Density += 4; scores.Privacy += 1 }
    else if (avgDays >= 2) { scores.Flexibility += 3.5; scores.Collaboration += 1.5; scores.Density += 1 }
    else { scores.Flexibility += 5.5; scores.Density -= 1 }
  }

  // Department adjacencies → collaboration intensity.
  if (s.adjacencyPairs.length) scores.Collaboration += Math.min(3, s.adjacencyPairs.length * 0.75)

  // Seating posture → flexibility vs privacy/density.
  if (s.seatingChoice === "assigned") { scores.Privacy += 2.5; scores.Density += 1.5 }
  else if (s.seatingChoice === "mixed") { scores.Flexibility += 1.5 }
  else if (s.seatingChoice === "shared") { scores.Flexibility += 3; scores.Density += 1.5; scores.Privacy -= 0.5 }

  // Growth → company preset or per-dept deltas.
  if (s.growthChoice === "stable") scores.Growth += 1
  else if (s.growthChoice === "growing") { scores.Growth += 4; scores.Density += 1 }
  else if (s.growthChoice === "rapid") { scores.Growth += 6.5; scores.Flexibility += 1.5 }
  const withFuture = s.departments.filter((d) => d.futureHeadcount !== undefined)
  if (withFuture.length > 0) {
    const cur = withFuture.reduce((a, d) => a + d.headcount, 0) || 1
    const fut = withFuture.reduce((a, d) => a + (d.futureHeadcount ?? d.headcount), 0)
    const pct = ((fut - cur) / cur) * 100
    scores.Growth += Math.max(0, Math.min(6.5, pct / 5))
  }

  // Offices → privacy.
  if (s.officeChoice === "leaders") scores.Privacy += 2
  else if (s.officeChoice === "some") scores.Privacy += 3.5
  else if (s.officeChoice === "none") { scores.Collaboration += 2; scores.Density += 1.5 }
  const officeTotal = Object.values(s.officesByDept).reduce((a, b) => a + (b || 0), 0)
  if (officeTotal > 0) scores.Privacy += Math.min(3, officeTotal / 5)

  // Collaboration selections → collaboration / privacy / amenity (tolerant of
  // the engine-mirrored catalog ids).
  for (const t of s.collabTypes) {
    if (/conference|huddle|project|training/i.test(t)) scores.Collaboration += 1.5
    if (/phone|focus/i.test(t)) scores.Privacy += 1.5
    if (/open collab|lounge/i.test(t)) { scores.Amenity += 2; scores.Collaboration += 1 }
  }

  // Support spaces → amenity.
  for (const t of s.support) {
    if (/wellness|mother|caf|pantry|library/i.test(t)) scores.Amenity += 1.5
    else scores.Amenity += 0.5
  }

  for (const axis of PROFILE_AXES) scores[axis] = clamp(scores[axis])
  return scores
}

// ── Build a SurveyResult from state (the handoff payload, SURVEY_SPEC §5) ─────

export function buildSurveyResult(
  s: SurveyState,
  lanes: LaneMap,
  deferred: Set<StepId>,
  meta: { clientName: string; completedBy: string },
): SurveyResult {
  const namedDepts = s.departments.filter((d) => d.name.trim())
  const useDepts = lanes.people === "detailed" && namedDepts.length > 0

  const departments = useDepts
    ? namedDepts.map((d) => ({
        id: d.id,
        name: d.name.trim(),
        headcount: Math.max(0, Math.round(d.headcount || 0)),
        ...(d.futureHeadcount !== undefined ? { futureHeadcount: Math.max(0, Math.round(d.futureHeadcount)) } : {}),
      }))
    : []

  const totalHeadcount = useDepts
    ? departments.reduce((a, d) => a + d.headcount, 0)
    : s.totalHeadcount ?? 0

  // Per-dept maps are keyed by spine id (matching SurveyDepartment.id, which is
  // what seedToolFromSurvey looks up). Only departments with names are kept.
  const valid = new Set(namedDepts.map((d) => d.id))
  const byId = (m: Record<string, number>): Record<string, number> => {
    const out: Record<string, number> = {}
    for (const [id, v] of Object.entries(m)) if (v && valid.has(id)) out[id] = v
    return out
  }
  const nameOf = (id: string) => namedDepts.find((d) => d.id === id)?.name.trim() ?? id

  // Days: pick a single representative (the band minimum — the conservative,
  // most-sharing case) for the tool seed, but preserve full ranges + "not sure"
  // so the end-of-survey evaluation can take min/max as it sees fit.
  const perDeptDays: Record<string, number> = {}
  const perDeptDaysRange: Record<string, DayRange> = {}
  const daysUnsure: string[] = []
  if (lanes.work === "detailed") {
    for (const d of namedDepts) {
      const v = s.perDeptDays[d.id]
      if (v === undefined) continue
      if (v === "unsure") { daysUnsure.push(nameOf(d.id)); continue }
      perDeptDays[d.id] = v.min
      perDeptDaysRange[d.id] = v
    }
  }

  const daysInOffice = s.workChoice ? WORK_PATTERN_DAYS[s.workChoice] ?? 3 : 3

  const collaboration = s.collabTypes.map((type) => ({
    type,
    byDept: lanes.collaboration === "detailed" ? byId(s.collabByDept[type] ?? {}) : {},
  }))

  const adjacencyNotes = s.adjacencyPairs
    .map((k) => { const [a, b] = k.split("|"); return `${nameOf(a)} ↔ ${nameOf(b)}` })
    .join("; ")

  // Dedicated desks / private offices — per-person checks when a roster exists,
  // else the per-department numeric value.
  const dedicatedByDept: Record<string, number> = {}
  const officesByDept: Record<string, number> = {}
  for (const d of namedDepts) {
    const ded = deptAllocated(d, s.dedicatedByDept, s.deskByEmployee)
    if (ded > 0) dedicatedByDept[d.id] = ded
    const off = deptAllocated(d, s.officesByDept, s.officeByEmployee)
    if (off > 0) officesByDept[d.id] = off
  }

  return {
    meta: { clientName: meta.clientName, completedBy: meta.completedBy, completedAt: new Date().toISOString() },
    people: {
      departments,
      totalHeadcount,
      ...(s.growthChoice ? { companyGrowthPct: GROWTH_PRESET_PCT[s.growthChoice] } : {}),
    },
    work: {
      daysInOffice,
      ...(Object.keys(perDeptDays).length ? { perDeptDays } : {}),
      ...(Object.keys(perDeptDaysRange).length ? { perDeptDaysRange } : {}),
      ...(daysUnsure.length ? { daysUnsureDepts: daysUnsure } : {}),
      fullyRemote: 0,
      ...(lanes.seating === "detailed" && Object.keys(dedicatedByDept).length ? { dedicatedByDept } : {}),
      ...(adjacencyNotes ? { adjacencyNotes } : {}),
    },
    spaces: {
      privateOfficesByDept: lanes.offices === "detailed" ? officesByDept : {},
      collaboration,
      support: s.support,
    },
    qualitative: {
      ...(s.loves.trim() ? { loves: s.loves.trim() } : {}),
      ...(s.painPoints.trim() ? { painPoints: s.painPoints.trim() } : {}),
      ...(s.imbalances.trim() ? { imbalances: s.imbalances.trim() } : {}),
    },
    special: {},
    existing: {
      ...(s.existing.furniture ? { furniture: s.existing.furniture } : {}),
      ...(sizeSf(WORKSTATION_SIZES, s.existing.workstationSize) !== undefined
        ? { workstationSF: sizeSf(WORKSTATION_SIZES, s.existing.workstationSize) }
        : {}),
      ...(sizeSf(OFFICE_SIZES, s.existing.officeSize) !== undefined
        ? { officeSF: sizeSf(OFFICE_SIZES, s.existing.officeSize) }
        : {}),
      ...(s.existing.reuseConfTables !== null ? { reuseConfTables: s.existing.reuseConfTables } : {}),
      ...(s.existing.existingWorkstations !== null ? { existingWorkstations: s.existing.existingWorkstations } : {}),
      ...(s.existing.existingOffices !== null ? { existingOffices: s.existing.existingOffices } : {}),
      ...(Object.values(s.existingCollab).some((v) => v > 0)
        ? { existingCollab: Object.fromEntries(Object.entries(s.existingCollab).filter(([, v]) => v > 0)) }
        : {}),
      ...(Object.values(s.existingSupport).some((v) => v > 0)
        ? { existingSupport: Object.fromEntries(Object.entries(s.existingSupport).filter(([, v]) => v > 0)) }
        : {}),
    },
    deferred: [...deferred],
  }
}
