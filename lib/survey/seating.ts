/**
 * Seating resolution — who sits where. One rule, used everywhere a bubble or
 * a roster row needs a name: explicit picks win (officeEmployeeIds /
 * deskEmployeeIds — real answers, not convention), falling back to the
 * leaders-first convention when the client never named names.
 *
 * A session can override the picks without touching the intake — the Studio's
 * Department Manager writes moves here, and the map/deck/review all resolve
 * through this one function so they never drift from what NELSON decided.
 */
import type { SurveyResult } from "./types"

export interface SeatingPatch {
  officeEmployeeIds?: string[]
  deskEmployeeIds?: string[]
}

export type SeatPlacement = "office" | "desk" | "flex"

export interface ResolvedSeating {
  /** employee id → where they sit. Flex (no dedicated seat) is left unset. */
  byId: Record<string, SeatPlacement>
  /** Per-department ordered roster, each holder tagged with their placement. */
  byDept: Record<string, { id: string; name: string; isLeader?: boolean; placement: SeatPlacement }[]>
}

/**
 * Resolves the whole org's seating in one pass. `patch` (typically
 * session.people) overrides the intake's explicit picks when present;
 * omitting both falls back to the leaders-first convention scaled to each
 * department's office/dedicated-desk counts.
 */
export function resolveSeating(result: SurveyResult, patch?: SeatingPatch): ResolvedSeating {
  const pickedOffice = new Set(patch?.officeEmployeeIds ?? result.spaces.officeEmployeeIds ?? [])
  const pickedDesk = new Set(patch?.deskEmployeeIds ?? result.work.deskEmployeeIds ?? [])
  const explicit = pickedOffice.size > 0 || pickedDesk.size > 0

  const byId: Record<string, SeatPlacement> = {}
  const byDept: ResolvedSeating["byDept"] = {}

  for (const dep of result.people.departments) {
    const roster = [...(dep.employees ?? [])].sort((a, b) => Number(!!b.isLeader) - Number(!!a.isLeader))
    const nOff = result.spaces.privateOfficesByDept[dep.id] ?? 0
    const nDesk = result.work.dedicatedByDept?.[dep.id] ?? 0

    const rows = roster.map((e) => {
      let placement: SeatPlacement
      if (explicit) {
        placement = pickedOffice.has(e.id) ? "office" : pickedDesk.has(e.id) ? "desk" : "flex"
      } else {
        placement = "flex"
      }
      return { id: e.id, name: e.name || "Unnamed", isLeader: e.isLeader, placement }
    })

    if (!explicit) {
      // Convention: offices to the first names (leaders first), then dedicated desks.
      for (let i = 0; i < rows.length; i++) {
        if (i < nOff) rows[i].placement = "office"
        else if (i < nOff + nDesk) rows[i].placement = "desk"
      }
    }

    for (const r of rows) byId[r.id] = r.placement
    byDept[dep.id] = rows
  }

  return { byId, byDept }
}

/**
 * Applies the Studio's department moves on top of the intake's own roster —
 * a person id → destination department id. Relocates the named employee and
 * shifts both departments' headcounts ±1; everything else about the intake
 * stays untouched. Pure: returns a new SurveyResult, never mutates the input,
 * so the intake stays immutable and a refresh always starts from the source
 * of truth. A no-op when there are no moves (identity, not a clone).
 */
export function applyDeptMoves(result: SurveyResult, moves?: Record<string, string>): SurveyResult {
  if (!moves || Object.keys(moves).length === 0) return result
  const departments = result.people.departments.map((d) => ({ ...d, employees: [...(d.employees ?? [])] }))
  const byId = new Map(departments.map((d) => [d.id, d]))

  for (const [personId, toDeptId] of Object.entries(moves)) {
    const to = byId.get(toDeptId)
    if (!to) continue
    let moved: NonNullable<(typeof departments)[number]["employees"]>[number] | undefined
    for (const dep of departments) {
      if (dep.id === toDeptId) continue
      const idx = dep.employees.findIndex((e) => e.id === personId)
      if (idx >= 0) {
        moved = dep.employees.splice(idx, 1)[0]
        dep.headcount = Math.max(0, dep.headcount - 1)
        break
      }
    }
    if (moved) {
      to.employees.push(moved)
      to.headcount += 1
    }
  }

  return { ...result, people: { ...result.people, departments } }
}

/** Named office-holders for a department, in placement order — what the map draws. */
export function officeHoldersFor(
  result: SurveyResult,
  deptId: string,
  officeCount: number,
  seating: ResolvedSeating,
): { id: string; name: string; isLeader?: boolean }[] {
  const rows = seating.byDept[deptId] ?? []
  const named = rows.filter((r) => r.placement === "office")
  if (named.length > 0) return named.slice(0, officeCount)
  // No one named for an office yet (e.g. offices exist but roster is headcount-only) —
  // leave unnamed; the map already renders a nameless "office" bubble for these.
  return []
}
