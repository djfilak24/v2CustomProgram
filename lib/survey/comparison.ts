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
  })

  // Private offices -----------------------------------------------------------
  const offItems = program.individual.filter((i) => /office/i.test(i.name))
  const offProposed = offItems.reduce((s, i) => s + i.quantity, 0)
  lines.push({
    key: "offices", label: "Private offices", category: "Offices",
    unitSF: ex.officeSF ?? (offItems[0]?.areaSf || 120),
    ratio: "leadership / by role", existingCount: ex.existingOffices ?? 0, proposedCount: offProposed,
  })

  // Collaboration — one line per engine type ----------------------------------
  for (const item of program.collaborative) {
    lines.push({
      key: `collab:${item.name}`, label: item.name, category: "Collaboration", unitSF: item.areaSf,
      ratio: item.ratioLabel, existingCount: ex.existingCollab?.[item.name] ?? 0, proposedCount: item.quantity,
    })
  }
  // Existing collab types the engine didn't propose
  for (const [name, count] of Object.entries(ex.existingCollab ?? {})) {
    if (!program.collaborative.some((i) => i.name === name)) {
      lines.push({ key: `collab:${name}`, label: name, category: "Collaboration", unitSF: sfById(name, COLLAB_CATALOG), existingCount: count, proposedCount: 0 })
    }
  }

  // Support — proposed (qty>0) + any existing ---------------------------------
  for (const item of program.support) {
    const existing = ex.existingSupport?.[item.name] ?? 0
    if (item.quantity <= 0 && existing <= 0) continue
    lines.push({
      key: `support:${item.name}`, label: item.name, category: "Support", unitSF: item.areaSf,
      ratio: item.ratioLabel, existingCount: existing, proposedCount: item.quantity,
    })
  }
  for (const [name, count] of Object.entries(ex.existingSupport ?? {})) {
    if (!program.support.some((i) => i.name === name)) {
      lines.push({ key: `support:${name}`, label: name, category: "Support", unitSF: sfById(name, SUPPORT_CATALOG), existingCount: count, proposedCount: 0 })
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
