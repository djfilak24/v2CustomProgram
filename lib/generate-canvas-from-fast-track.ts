/**
 * Generates Advanced Canvas editableSpaces state directly from a Fast Track SpaceProgram.
 * This replaces the complex name-mapping approach with direct regeneration.
 */

import type { SpaceProgram, SpaceItem, SummaryInputs } from "./fast-track-calculations"

/** Canvas zone names matching the existing canvas structure */
type CanvasZone =
  | "Focus Open"
  | "Focus Enclosed"
  | "Collaborative Spaces"
  | "Support Spaces"
  | "Wellness Spaces"

/** Department allocation for tracking */
interface DepartmentAllocation {
  departmentId: string
  count: number
}

/** Mirrors the EditableSpace interface from page.tsx exactly */
export interface EditableSpace {
  id: string
  name: string
  zone: string
  quantity: number
  capacity: number
  sfEach: number
  totalArea: number
  isDedicated?: boolean
  workstationType?: "employee" | "private" | "flex" | null
  notes: string
  ratio: string
  departmentAllocations: DepartmentAllocation[]
  customName?: string
  isActive?: boolean
}

/** Maps Fast Track item names to canvas zones */
function getZoneForItem(item: SpaceItem, category: "individual" | "collaboration" | "support"): CanvasZone {
  const name = item.name.toLowerCase()

  if (category === "individual") {
    // Offices go to Focus Enclosed, workstations/touchdown to Focus Open
    if (name.includes("office")) return "Focus Enclosed"
    return "Focus Open"
  }

  if (category === "collaboration") {
    return "Collaborative Spaces"
  }

  if (category === "support") {
    // Wellness-related support spaces
    if (
      name.includes("wellness") ||
      name.includes("mother") ||
      name.includes("quiet") ||
      name.includes("meditation") ||
      name.includes("prayer")
    ) {
      return "Wellness Spaces"
    }
    return "Support Spaces"
  }

  return "Support Spaces"
}

/** Determines workspace type for configuration target tracking */
function getWorkspaceType(item: SpaceItem, category: "individual" | "collaboration" | "support"): "employee" | "private" | "flex" | null {
  if (category !== "individual") return null

  const name = item.name.toLowerCase()
  if (name.includes("office")) return "private"
  if (name.includes("workstation")) return "employee"
  if (name.includes("touch") || name.includes("hoteling") || name.includes("unassigned")) return "flex"
  return null
}

/** Generates a unique key for the canvas state */
function generateKey(index: number, name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
  return `ft_${index}_${slug}`
}

export interface GeneratedCanvasResult {
  /** The new editableSpaces state to replace the current one */
  spaces: Record<string, EditableSpace>
  /** Derived targets for Configuration Target cards */
  targets: {
    headcount: number
    officeCount: number
    workstationCount: number
    hybridWorkers: number
  }
  /** Total RSF from the program */
  totalRsf: number
}

/**
 * Converts a Fast Track SpaceProgram into canvas editableSpaces state.
 * This completely regenerates the canvas state from the FT program.
 */
export function generateCanvasFromFastTrack(
  program: SpaceProgram,
  inputs: SummaryInputs,
): GeneratedCanvasResult {
  const spaces: Record<string, EditableSpace> = {}
  let index = 0
  let totalRsf = 0

  // Derived target counters
  let officeCount = 0
  let workstationCount = 0

  // Process individual spaces (Focus Open / Focus Enclosed)
  for (const item of program.individual) {
    if (item.quantity === 0 && item.totalArea === 0) continue // Skip empty items

    const key = generateKey(index, item.name)
    const zone = getZoneForItem(item, "individual")
    const workspaceType = getWorkspaceType(item, "individual")

    spaces[key] = {
      id: key,
      name: item.name,
      zone,
      quantity: item.quantity,
      capacity: 1, // Individual spaces have capacity 1
      sfEach: item.areaSf,
      totalArea: item.totalArea,
      workspaceType,
      notes: "",
      ratio: item.ratioLabel || (item.ratio ? `1:${item.ratio}` : ""),
      departmentAllocations: [],
      isActive: item.quantity > 0,
    }

    totalRsf += item.totalArea
    index++

    // Count for configuration targets
    const nameLower = item.name.toLowerCase()
    if (nameLower.includes("office")) {
      officeCount += item.quantity
    } else if (nameLower.includes("workstation")) {
      workstationCount += item.quantity
    }
  }

  // Process collaborative spaces
  for (const item of program.collaborative) {
    if (item.quantity === 0 && item.totalArea === 0) continue

    const key = generateKey(index, item.name)
    const zone = getZoneForItem(item, "collaboration")

    // Estimate capacity from SF (rough heuristic)
    let capacity = 1
    if (item.areaSf >= 600) capacity = 20
    else if (item.areaSf >= 400) capacity = 12
    else if (item.areaSf >= 280) capacity = 8
    else if (item.areaSf >= 140) capacity = 4
    else if (item.areaSf >= 48) capacity = 1

    spaces[key] = {
      id: key,
      name: item.name,
      zone,
      quantity: item.quantity,
      capacity,
      sfEach: item.areaSf,
      totalArea: item.totalArea,
      notes: "",
      ratio: item.ratioLabel || (item.ratio ? `1:${item.ratio}` : ""),
      departmentAllocations: [],
      isActive: item.quantity > 0,
    }

    totalRsf += item.totalArea
    index++
  }

  // Process support spaces
  for (const item of program.support) {
    if (item.quantity === 0 && item.totalArea === 0) continue

    const key = generateKey(index, item.name)
    const zone = getZoneForItem(item, "support")

    spaces[key] = {
      id: key,
      name: item.name,
      zone,
      quantity: item.quantity,
      capacity: 0, // Support spaces don't have seating capacity
      sfEach: item.areaSf,
      totalArea: item.totalArea,
      notes: "",
      ratio: "",
      departmentAllocations: [],
      isActive: item.quantity > 0,
    }

    totalRsf += item.totalArea
    index++
  }

  // Calculate hybrid workers: headcount minus fully remote minus assigned private seats
  const hybridWorkers = Math.max(0, inputs.totalHeadcount - inputs.fullyRemote - officeCount)

  return {
    spaces,
    targets: {
      headcount: inputs.totalHeadcount,
      officeCount,
      workstationCount,
      hybridWorkers,
    },
    totalRsf,
  }
}
