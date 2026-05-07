/**
 * Maps a Fast Track SpaceProgram into updates for the Advanced Canvas
 * `editableSpaces` map AND the Configuration Target counters
 * (targetOfficeCount, targetWorkstations, targetHybridWorkers) so the canvas
 * mirrors Fast Track exactly when the user switches over.
 *
 * Fast Track produces a `SpaceProgram` with `individual`, `collaborative`, and
 * `support` arrays of `SpaceItem` objects. The Advanced Canvas keeps a flat
 * `Record<string, EditableSpace>` keyed by space ID (e.g. "workstation1",
 * "phonebooth1"). We map each Fast Track item to the closest matching canvas
 * space, sum where multiple FT items collapse into one canvas card, and zero
 * out canvas spaces that have no Fast Track equivalent so the totals match.
 */

import type {
  SpaceProgram,
  SpaceItem,
  SummaryInputs,
} from "./fast-track-calculations"

/** Subset of EditableSpace fields this helper updates. */
export interface CanvasSpaceUpdate {
  /** The Fast Track item name (e.g. "Resident Office", "Phone Room / Focus Booth") */
  name: string
  quantity: number
  sfEach: number
  totalArea: number
}

export interface DerivedTargets {
  /** Sum of Resident + Unassigned Office quantities from the FT program. */
  officeCount: number
  /**
   * Sum of Resident + Unassigned Workstation quantities (Touch Down Spots are
   * tracked separately as workpoints in the canvas).
   */
  workstationCount: number
  /**
   * Hybrid workers = Headcount − Fully Remote − Resident (assigned) seats.
   * Represents people without a dedicated seat.
   */
  hybridWorkers: number
}

export interface SeedResult {
  updates: Record<string, CanvasSpaceUpdate>
  derivedTargets: DerivedTargets
  totalSf: number
  unmappedItems: string[]
}

/**
 * Mapping of Fast Track SpaceItem.name → canvas editableSpaces key.
 * Multiple FT items can map to the same canvas key — totals get summed.
 *
 * Every FT item should appear here (or in INTENTIONALLY_SKIPPED below) so
 * canvas totals equal FT totals.
 */
const NAME_TO_CANVAS_KEY: Record<string, string> = {
  // ─── Individual / Focus spaces ───
  "Resident Office": "office1", // Private Office
  "Unassigned Office": "officeday1", // Office for the Day
  "Resident Workstation": "workstation1", // Employee Workstation
  "Unassigned Workstation": "hoteling1", // Hoteling / Flex Workstation
  "Touch Down Spot": "workpoint1", // Workpoint

  // ─── Collaborative spaces ───
  "Phone Room / Focus Booth": "phonebooth1",
  "Huddle Room / Flex": "huddle1",
  "Interview Room": "huddle1", // Same scale, sum into huddle
  "Medium Conference": "mediumconf1",
  "Large Conference": "largeconf1",
  "Multipurpose Room": "extralarge1", // Largest flex room
  "Training Room": "training1",
  "Open Collaboration Space": "project1", // Reservable Project Room

  // ─── Support: front of house ───
  Reception: "reception1",
  "Quiet Library": "library1",

  // ─── Support: amenity / wellness ───
  "Work Cafe": "kitchenette1", // Pantry/kitchenette bucket
  "Pantry / Kitchenette": "kitchenette1",
  "Kitchen Storage": "storage1",
  "Wellness Room Suite": "wellnesssuite1",
  "Mothers Room": "mothers1",

  // ─── Support: storage / lockers ───
  "Coats / Storage Closet": "coats1",
  "Workplace Lockers": "lockers1",
  "File Room": "storage1",
  "Facilities Storage": "storage1",

  // ─── Support: print / mail ───
  "Printer / Copy Area": "copymail1",
  "Mail Room": "copymail1",

  // ─── Support: IT / building ───
  "MDF / Server Room": "server1",
  IDF: "itcloset1",
  "IT / Tech Storage": "itcloset1",
  "IT Help Desk": "reception1", // Front-line tech assistance bucket
}

/**
 * FT items intentionally not mapped — they're not real rooms in the canvas
 * model (e.g. circulation infrastructure). Their SF still flows through the
 * FT total via the rentable factor, so we don't try to reproduce them card-side.
 */
const INTENTIONALLY_SKIPPED = new Set<string>(["Internal Stair"])

/**
 * Canvas spaces that have no direct Fast Track counterpart. Zeroed out so the
 * canvas grand total mirrors the Fast Track grand total. The user can re-add
 * quantity manually in the canvas if desired.
 */
const CANVAS_KEYS_TO_ZERO = [
  "workstation2", // Large Employee Workstation
  "sharedoffice1", // Shared Private Office
  "immersive1", // Immersive Work Room
  "outdoor1", // Outdoor Terrace
  "charette1", // Charette / Pin-up
  "ada1", // ADA Single User Restroom
  "meditation1", // Meditation Room
  "prayer1", // Prayer Room
]

/** Computes a partial update to apply to the Advanced Canvas. */
export function seedCanvasFromFastTrack(
  program: SpaceProgram,
  inputs: SummaryInputs,
): SeedResult {
  const updates: Record<string, CanvasSpaceUpdate> = {}
  const unmappedItems: string[] = []
  let totalSf = 0

  // Helper to apply (and sum) updates by canvas key.
  // We use the FT item.name as the key for name-based matching on the canvas side.
  const apply = (canvasKey: string, item: SpaceItem) => {
    totalSf += item.totalArea
    const existing = updates[canvasKey]
    if (existing) {
      const newQty = existing.quantity + item.quantity
      const newTotal = existing.totalArea + item.totalArea
      updates[canvasKey] = {
        name: existing.name, // Keep first name for matching
        quantity: newQty,
        sfEach: newQty > 0 ? Math.round(newTotal / newQty) : item.areaSf,
        totalArea: newTotal,
      }
    } else {
      updates[canvasKey] = {
        name: item.name, // Use FT item name for matching
        quantity: item.quantity,
        sfEach: item.areaSf,
        totalArea: item.totalArea,
      }
    }
  }

  const allItems: SpaceItem[] = [
    ...program.individual,
    ...program.collaborative,
    ...program.support,
  ]

  // ── Compute derived Configuration Target counters from FT items ──
  let officeCount = 0
  let workstationCount = 0

  for (const item of allItems) {
    if (item.name === "Resident Office" || item.name === "Unassigned Office") {
      officeCount += item.quantity
    }
    if (
      item.name === "Resident Workstation" ||
      item.name === "Unassigned Workstation"
    ) {
      workstationCount += item.quantity
    }
  }

  // Hybrid workers = HC − fully remote − assigned (resident) seats.
  const residentSeats = allItems
    .filter(
      (i) => i.name === "Resident Office" || i.name === "Resident Workstation",
    )
    .reduce((sum, i) => sum + i.quantity, 0)

  const hybridWorkers = Math.max(
    0,
    inputs.totalHeadcount - inputs.fullyRemote - residentSeats,
  )

  // ── Map FT items into canvas keys ──
  for (const item of allItems) {
    if (INTENTIONALLY_SKIPPED.has(item.name)) continue
    const canvasKey = NAME_TO_CANVAS_KEY[item.name]
    if (canvasKey) {
      apply(canvasKey, item)
    } else {
      unmappedItems.push(item.name)
    }
  }

  // Zero out canvas-only spaces so totals match
  // These don't exist in FT, so we create placeholder names
  const zeroNames: Record<string, string> = {
    workstation2: "Large Employee Workstation",
    sharedoffice1: "Shared Private Office",
    immersive1: "Immersive Work Room",
    outdoor1: "Outdoor Terrace",
    charette1: "Charette / Pin-up",
    ada1: "ADA Single User Restroom",
    meditation1: "Meditation Room",
    prayer1: "Prayer Room",
  }
  for (const key of CANVAS_KEYS_TO_ZERO) {
    if (!(key in updates)) {
      updates[key] = { name: zeroNames[key] || key, quantity: 0, sfEach: 0, totalArea: 0 }
    }
  }

  return {
    updates,
    derivedTargets: { officeCount, workstationCount, hybridWorkers },
    totalSf,
    unmappedItems,
  }
}
