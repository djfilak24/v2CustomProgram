/**
 * Converts a Fast Track SpaceProgram directly into the EditableSpace record
 * used by the Customize canvas. Replaces the old seed/mapping approach:
 * no fixed key schema, no NAME_TO_CANVAS_KEY dictionary, no rounding from
 * averaging merged items. FT output IS the initial canvas state.
 *
 * Keys are deterministic slugs so Recalibrate can match by name later.
 */

import type { SpaceProgram, SpaceItem, SummaryInputs } from "./fast-track-calculations"

export interface EditableSpace {
  id: string
  name: string
  zone: string
  quantity: number
  capacity: number
  sfEach: number
  totalArea: number
  workstationType?: "employee" | "private" | "flex" | null
  notes: string
  ratio: string
  departmentAllocations: { departmentId: string; count: number }[]
  customName?: string
  isActive?: boolean
}

export interface ConvertedProgram {
  spaces: Record<string, EditableSpace>
  targets: {
    headcount: number
    officeCount: number
    workstationCount: number
    hybridWorkers: number
  }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
}

function zoneForIndividual(name: string): string {
  return name.toLowerCase().includes("office") ? "Focus Enclosed" : "Focus Open"
}

const WELLNESS_KEYWORDS = ["wellness", "mother", "meditation", "prayer", "quiet", "fitness"]
function zoneForSupport(name: string): string {
  const lower = name.toLowerCase()
  return WELLNESS_KEYWORDS.some((kw) => lower.includes(kw)) ? "Wellness" : "Support"
}

function workspaceType(name: string): "employee" | "private" | "flex" | null {
  const lower = name.toLowerCase()
  if (lower.includes("office")) {
    return lower.includes("unassigned") || lower.includes("day") ? "flex" : "private"
  }
  if (lower.includes("workstation") || lower.includes("hoteling") || lower.includes("flex")) {
    return lower.includes("resident") ? "employee" : "flex"
  }
  if (lower.includes("touch") || lower.includes("touchdown") || lower.includes("workpoint")) return "flex"
  return null
}

function capacityForCollaborative(areaSf: number): number {
  if (areaSf >= 600) return 20
  if (areaSf >= 400) return 12
  if (areaSf >= 280) return 8
  if (areaSf >= 140) return 4
  return 1
}

function makeSpace(
  key: string,
  item: SpaceItem,
  zone: string,
  wsType: "employee" | "private" | "flex" | null,
  capacity: number,
): EditableSpace {
  return {
    id: key,
    name: item.name,
    customName: item.name,
    zone,
    quantity: item.quantity,
    capacity,
    sfEach: item.areaSf,
    totalArea: item.totalArea,
    workstationType: wsType,
    notes: "",
    ratio: item.ratioLabel ?? (item.ratio != null ? `1:${item.ratio}` : ""),
    departmentAllocations: [],
    isActive: item.quantity > 0,
  }
}

export function convertProgramToSpaces(
  program: SpaceProgram,
  inputs: SummaryInputs,
): ConvertedProgram {
  const spaces: Record<string, EditableSpace> = {}
  const usedKeys = new Set<string>()

  function uniqueKey(base: string): string {
    let key = base
    let n = 2
    while (usedKeys.has(key)) key = `${base}_${n++}`
    usedKeys.add(key)
    return key
  }

  let officeCount = 0
  let workstationCount = 0

  for (const item of program.individual) {
    if (item.quantity === 0 && item.totalArea === 0) continue
    const zone = zoneForIndividual(item.name)
    const wsType = workspaceType(item.name)
    const key = uniqueKey(slugify(item.name))
    spaces[key] = makeSpace(key, item, zone, wsType, 1)

    const lower = item.name.toLowerCase()
    if (lower.includes("office")) officeCount += item.quantity
    else if (lower.includes("workstation")) workstationCount += item.quantity
  }

  for (const item of program.collaborative) {
    if (item.quantity === 0 && item.totalArea === 0) continue
    const key = uniqueKey(slugify(item.name))
    spaces[key] = makeSpace(key, item, "Collaborative", null, capacityForCollaborative(item.areaSf))
  }

  for (const item of program.support) {
    if (item.quantity === 0 && item.totalArea === 0) continue
    const zone = zoneForSupport(item.name)
    const key = uniqueKey(slugify(item.name))
    spaces[key] = makeSpace(key, item, zone, null, 0)
  }

  // For full-occupancy programs (5 days/week) everyone has a dedicated resident
  // desk — flex/hoteling seats are not needed, so the hybrid target is 0.
  // For hybrid schedules (< 5 days) the non-office, non-remote workers need
  // shared flex seats and the count is meaningful.
  const hybridWorkers =
    inputs.daysInOffice >= 5
      ? 0
      : Math.max(0, inputs.totalHeadcount - inputs.fullyRemote - officeCount)

  return {
    spaces,
    targets: {
      headcount: inputs.totalHeadcount,
      officeCount,
      workstationCount,
      hybridWorkers,
    },
  }
}
