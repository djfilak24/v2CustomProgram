/**
 * seedToolFromSurvey — pure mapper from a SurveyResult into a tool-shaped
 * SeededProgram. No UI, no side effects: this is the deterministic bridge that
 * lets the survey pre-populate the calculator. See SURVEY_SPEC.md §5.
 *
 * Design choice: spaces are emitted by PRESET NAME (resolved to full specs —
 * sfEach/capacity/zone — on import via the canvas's existing SPACE_PRESETS),
 * rather than re-declaring a space catalog here. That keeps this module free of
 * catalog drift; the structural mapping (departments, inputs, allocations,
 * growth, notes) is what's deterministic and tested.
 */
import type { SurveyResult } from "./types"

const DEPT_COLORS = [
  "#2563eb", "#0891b2", "#7c3aed", "#db2777", "#ea580c",
  "#16a34a", "#ca8a04", "#dc2626", "#0d9488", "#9333ea",
]

export interface SeededDepartment {
  id: string
  name: string
  color: string
  headcount: number
  officeCount: number
  hybridWorkers: number
  workstations: number
  /** Only set when growth was captured for this dept (drives planForGrowth). */
  futureHeadcount?: number
}

export interface SeededSpace {
  /** Resolves to a SPACE_PRESETS entry on import (sfEach/capacity/zone). */
  presetName: string
  workstationType?: "employee" | "private" | "flex" | null
  quantity: number
  departmentAllocations: { departmentId: string; count: number }[]
}

export interface SeededProgram {
  inputs: {
    clientName: string
    programmedBy: string
    totalHeadcount: number
    fullyRemote: number
    percentOffices: number
    daysInOffice: number
  }
  departments: SeededDepartment[]
  spaces: SeededSpace[]
  /** True when any department's future headcount differs from its current. */
  planForGrowth: boolean
  /** Σ future headcount (per-dept future, else company growth, else current). */
  planningHeadcount: number
  /** Assembled narrative for the fit-planning handoff. */
  notes: string
  /** Question ids the client chose to confirm live. */
  deferred: string[]
}

/** Future headcount for a department: explicit → company growth → flat. */
export function deptFutureHeadcount(
  headcount: number,
  explicitFuture: number | undefined,
  companyGrowthPct: number | undefined,
): number {
  if (explicitFuture !== undefined) return Math.max(0, Math.round(explicitFuture))
  if (companyGrowthPct) return Math.max(0, Math.round(headcount * (1 + companyGrowthPct / 100)))
  return headcount
}

/** Hybrid (flex-seat) workers for a dept given its in-office days/week. */
function hybridWorkers(headcount: number, daysInOffice: number): number {
  const days = Math.min(5, Math.max(1, daysInOffice))
  return Math.max(0, Math.round(headcount * (1 - days / 5)))
}

export function seedToolFromSurvey(survey: SurveyResult): SeededProgram {
  const { people, work, spaces, qualitative, special, meta, deferred } = survey

  // ── Departments ───────────────────────────────────────────────────────────
  const departments: SeededDepartment[] = people.departments.map((d, i) => {
    const officeCount = Math.max(0, spaces.privateOfficesByDept[d.id] ?? 0)
    const days = work.perDeptDays?.[d.id] ?? work.daysInOffice
    const future = deptFutureHeadcount(d.headcount, d.futureHeadcount, people.companyGrowthPct)
    const hasGrowth = future !== d.headcount
    return {
      id: d.id,
      name: d.name,
      color: DEPT_COLORS[i % DEPT_COLORS.length],
      headcount: d.headcount,
      officeCount,
      hybridWorkers: hybridWorkers(d.headcount, days),
      workstations: Math.max(0, d.headcount - officeCount),
      ...(hasGrowth ? { futureHeadcount: future } : {}),
    }
  })

  const totalHeadcount =
    departments.length > 0
      ? departments.reduce((s, d) => s + d.headcount, 0)
      : people.totalHeadcount
  const totalOffices = departments.reduce((s, d) => s + d.officeCount, 0)
  const percentOffices =
    totalHeadcount > 0 ? Math.round((totalOffices / totalHeadcount) * 100) : 0

  // ── Seed spaces (by preset name) ──────────────────────────────────────────
  const seedSpaces: SeededSpace[] = []

  // Private offices → one "Private Office" card allocated per department.
  const officeAllocations = departments
    .filter((d) => d.officeCount > 0)
    .map((d) => ({ departmentId: d.id, count: d.officeCount }))
  if (officeAllocations.length > 0) {
    seedSpaces.push({
      presetName: "Private Office",
      workstationType: "private",
      quantity: officeAllocations.reduce((s, a) => s + a.count, 0),
      departmentAllocations: officeAllocations,
    })
  }

  // Collaboration → one card per type, allocated per department.
  for (const item of spaces.collaboration) {
    const allocations = Object.entries(item.byDept)
      .filter(([, count]) => count > 0)
      .map(([departmentId, count]) => ({ departmentId, count }))
    const quantity = allocations.reduce((s, a) => s + a.count, 0)
    if (quantity > 0) {
      seedSpaces.push({ presetName: item.type, quantity, departmentAllocations: allocations })
    }
  }

  // Support → one of each flagged must-have (company-level, qty 1).
  for (const name of spaces.support) {
    seedSpaces.push({ presetName: name, quantity: 1, departmentAllocations: [] })
  }

  // ── Growth / planning headcount ───────────────────────────────────────────
  const planForGrowth = departments.some((d) => d.futureHeadcount !== undefined)
  const planningHeadcount =
    departments.length > 0
      ? departments.reduce((s, d) => s + (d.futureHeadcount ?? d.headcount), 0)
      : deptFutureHeadcount(totalHeadcount, undefined, people.companyGrowthPct)

  return {
    inputs: {
      clientName: meta.clientName,
      programmedBy: meta.completedBy,
      totalHeadcount,
      fullyRemote: work.fullyRemote,
      percentOffices,
      daysInOffice: work.daysInOffice,
    },
    departments,
    spaces: seedSpaces,
    planForGrowth,
    planningHeadcount,
    notes: assembleNotes(qualitative, special, work.adjacencyNotes, deferred),
    deferred,
  }
}

function assembleNotes(
  qualitative: SurveyResult["qualitative"],
  special: SurveyResult["special"],
  adjacencyNotes: string | undefined,
  deferred: string[],
): string {
  const sections: string[] = []
  const add = (label: string, value?: string) => {
    if (value && value.trim()) sections.push(`${label}:\n${value.trim()}`)
  }
  add("What's working", qualitative.loves)
  add("Pain points", qualitative.painPoints)
  add("Space imbalances", qualitative.imbalances)
  add("Cross-functional adjacencies", adjacencyNotes)
  add("Specialized equipment / infrastructure", special.equipment)
  add("Security / compliance / visitor needs", special.security)
  add("Wish list", special.wishlist)
  add("Storage today vs. future", special.storage)
  if (deferred.length > 0) {
    sections.push(`Deferred to live session (${deferred.length}): ${deferred.join(", ")}`)
  }
  return sections.join("\n\n")
}
