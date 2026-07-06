/**
 * Existing vs. Proposed comparison — the heart of the live validation meeting.
 *
 * "Existing" is what the client has today (their survey counts × the sizes they
 * gave us). "Proposed" is what industry ratios suggest for their *future*
 * planning headcount (the Fast-Track engine). These are independent; the
 * comparison shows them side by side, biggest differences first, so the meeting
 * starts with the decisions that matter.
 */
import type { SurveyResult } from "./types"
import { seedToolFromSurvey } from "./seedToolFromSurvey"
import {
  computeAllSeatDemandBlocks, computeSpaceProgram, type SummaryInputs,
} from "../fast-track-calculations"
import { COLLAB_CATALOG, SUPPORT_CATALOG } from "./catalog"

export type CompCategory = "Workstations" | "Offices" | "Collaboration" | "Support"

export interface ComparisonLine {
  key: string
  label: string
  category: CompCategory
  /** SF per unit — used to recompute area when a count is adjusted in the review. */
  unitSF: number
  /** The planning ratio the engine used (e.g. "1 per 40 seats"). */
  ratio?: string
  existingCount: number
  proposedCount: number
  /** Did the client actually give us a count for this today? (vs. assumed 0) */
  existingCountKnown: boolean
  /** Do we know the client's real unit size today? (vs. a standard we assumed) */
  existingSizeKnown: boolean
}

/** A missing-info gap on a line that matters for porting existing → proposed. */
export interface LineGap {
  kind: "no-baseline" | "unknown-size"
  message: string
}

/** Gaps on a line — surfaced by the review's "Show gaps" toggle. */
export function lineGaps(l: ComparisonLine): LineGap[] {
  const gaps: LineGap[] = []
  if (l.proposedCount > 0 && !l.existingCountKnown) {
    gaps.push({ kind: "no-baseline", message: "No existing count captured — can't compare to today." })
  }
  if (l.existingCount > 0 && !l.existingSizeKnown) {
    gaps.push({
      kind: "unknown-size",
      message: `Existing size unknown — using a standard ${l.unitSF} SF to port into the proposal.`,
    })
  }
  return gaps
}

export interface Comparison {
  clientName: string
  current: number
  future: number
  daysInOffice: number
  fullyRemote: number
  planningHeadcount: number
  lines: ComparisonLine[]
}

/** The live, adjustable inputs behind the proposed program (the engine's dials). */
export interface CompInputs {
  clientName: string
  current: number
  /** Planning headcount — the engine designs the proposed program for this. */
  future: number
  daysInOffice: number
  fullyRemote: number
  percentOffices: number
}

export function defaultCompInputs(result: SurveyResult): CompInputs {
  const seeded = seedToolFromSurvey(result)
  return {
    clientName: result.meta.clientName || "Your organization",
    current: result.people.totalHeadcount,
    future: seeded.planningHeadcount,
    daysInOffice: seeded.inputs.daysInOffice,
    fullyRemote: seeded.inputs.fullyRemote,
    percentOffices: seeded.inputs.percentOffices,
  }
}

const sfById = (id: string, cat: typeof COLLAB_CATALOG | typeof SUPPORT_CATALOG) =>
  cat.find((c) => c.id === id)?.sfEach ?? 0

export function buildComparison(result: SurveyResult, ci?: CompInputs): Comparison {
  const c = ci ?? defaultCompInputs(result)
  const inputs: SummaryInputs = {
    clientName: c.clientName,
    programmedBy: result.meta.completedBy || "",
    totalHeadcount: c.future, // proposed program designs for the planning headcount
    fullyRemote: c.fullyRemote,
    percentOffices: c.percentOffices,
    grossRent: 50,
    daysInOffice: c.daysInOffice,
    rentableFactor: 0.22,
  }
  const blocks = computeAllSeatDemandBlocks(inputs.totalHeadcount, inputs.fullyRemote)
  const program = computeSpaceProgram(inputs, blocks, inputs.daysInOffice)

  const ex = result.existing ?? {}
  const lines: ComparisonLine[] = []

  // Workstations (all individual desk types) ----------------------------------
  const wsItems = program.individual.filter((i) => /workstation|touch|workpoint/i.test(i.name))
  const wsProposed = wsItems.reduce((s, i) => s + i.quantity, 0)
  const wsUnitSF = ex.workstationSF ?? (wsItems[0]?.areaSf || 48)
  lines.push({
    key: "workstations", label: "Workstations", category: "Workstations", unitSF: wsUnitSF,
    ratio: "sized by seat demand", existingCount: ex.existingWorkstations ?? 0, proposedCount: wsProposed,
    existingCountKnown: ex.existingWorkstations !== undefined, existingSizeKnown: ex.workstationSF !== undefined,
  })

  // Private offices -----------------------------------------------------------
  const offItems = program.individual.filter((i) => /office/i.test(i.name))
  const offProposed = offItems.reduce((s, i) => s + i.quantity, 0)
  lines.push({
    key: "offices", label: "Private offices", category: "Offices",
    unitSF: ex.officeSF ?? (offItems[0]?.areaSf || 120),
    ratio: "leadership / by role", existingCount: ex.existingOffices ?? 0, proposedCount: offProposed,
    existingCountKnown: ex.existingOffices !== undefined, existingSizeKnown: ex.officeSF !== undefined,
  })

  // Collaboration — one line per engine type ----------------------------------
  // Collab/support use standard catalog sizes for "existing", so size is treated
  // as known (a defensible standard); only the count can be a gap.
  for (const item of program.collaborative) {
    lines.push({
      key: `collab:${item.name}`, label: item.name, category: "Collaboration", unitSF: item.areaSf,
      ratio: item.ratioLabel, existingCount: ex.existingCollab?.[item.name] ?? 0, proposedCount: item.quantity,
      existingCountKnown: ex.existingCollab?.[item.name] !== undefined, existingSizeKnown: true,
    })
  }
  // Existing collab types the engine didn't propose
  for (const [name, count] of Object.entries(ex.existingCollab ?? {})) {
    if (!program.collaborative.some((i) => i.name === name)) {
      lines.push({ key: `collab:${name}`, label: name, category: "Collaboration", unitSF: sfById(name, COLLAB_CATALOG), existingCount: count, proposedCount: 0, existingCountKnown: true, existingSizeKnown: true })
    }
  }

  // Support — proposed (qty>0) + any existing ---------------------------------
  for (const item of program.support) {
    const existing = ex.existingSupport?.[item.name] ?? 0
    if (item.quantity <= 0 && existing <= 0) continue
    lines.push({
      key: `support:${item.name}`, label: item.name, category: "Support", unitSF: item.areaSf,
      ratio: item.ratioLabel, existingCount: existing, proposedCount: item.quantity,
      existingCountKnown: ex.existingSupport?.[item.name] !== undefined, existingSizeKnown: true,
    })
  }
  for (const [name, count] of Object.entries(ex.existingSupport ?? {})) {
    if (!program.support.some((i) => i.name === name)) {
      lines.push({ key: `support:${name}`, label: name, category: "Support", unitSF: sfById(name, SUPPORT_CATALOG), existingCount: count, proposedCount: 0, existingCountKnown: true, existingSizeKnown: true })
    }
  }

  return {
    clientName: c.clientName,
    current: c.current,
    future: c.future,
    daysInOffice: c.daysInOffice,
    fullyRemote: c.fullyRemote,
    planningHeadcount: c.future,
    lines,
  }
}

/** SF for a line at a given count. */
export const lineSF = (l: ComparisonLine, count: number) => count * l.unitSF

export interface SpaceStrategy {
  posture: "expand" | "balance" | "optimize" | "unset"
  /** proposed vs existing direction. */
  direction: "grow" | "shrink" | "flat"
  headline: string
  note: string
}

/**
 * Reconcile the client's stated posture (expand / balanced / optimize) with what
 * the ratios actually propose vs. what they have today. This is the "how much
 * space do you really need" read — where goal and math agree, or pull apart.
 */
export function spaceStrategy(
  existingSF: number,
  proposedSF: number,
  goals?: SurveyResult["goals"],
): SpaceStrategy {
  const posture = goals?.posture ?? "unset"
  const delta = existingSF > 0 ? (proposedSF - existingSF) / existingSF : proposedSF > 0 ? 1 : 0
  const direction: SpaceStrategy["direction"] = delta > 0.05 ? "grow" : delta < -0.05 ? "shrink" : "flat"

  if (posture === "optimize") {
    if (direction === "grow")
      return { posture, direction, headline: "Goal and math pull apart", note: "You want to optimize, but the ratios point bigger than today — a chance to close the gap with sharing, hoteling, and tighter footprints rather than more floor." }
    return { posture, direction, headline: "On track to optimize", note: "The proposed program already trims toward your goal of making the most of the space you have." }
  }
  if (posture === "expand") {
    if (direction === "shrink")
      return { posture, direction, headline: "Room to invest", note: "You're open to more space, yet the ratios come in under today — headroom to reinvest in amenities, collaboration, or comfort." }
    return { posture, direction, headline: "Aligned on growth", note: "More space supports your growth and experience goals — the proposal leans into that." }
  }
  if (posture === "balance")
    return { posture, direction, headline: "Right-sizing", note: direction === "grow" ? "The ratios suggest growth to meet demand — balanced against efficiency." : "The proposal holds close to today, tuned to the real need." }

  return { posture, direction, headline: direction === "grow" ? "Ratios suggest more space" : direction === "shrink" ? "Ratios suggest less space" : "About the same footprint", note: "Add a goal posture in the survey to frame this as expand vs. optimize." }
}
