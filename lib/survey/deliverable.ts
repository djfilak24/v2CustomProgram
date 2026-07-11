/**
 * The deliverable model — a pure function of the engagement.
 *
 * buildDeliverable(result, overrides) composes everything the slide deck and
 * its printed PDF render: the profile radar, the program map, the existing-vs-
 * proposed comparison, and the full technical program (net → circulation →
 * gross usable → rentable) — with NELSON's presentation edits (unit-size
 * overrides, keyed by comparison line) applied before any math. The same model
 * feeds the interactive deck and the print pass, so the take-home PDF always
 * matches what was presented.
 */
import type { SurveyResult } from "./types"
import { buildComparison, spaceStrategy, type Comparison, type ComparisonLine, type CompCategory, type SpaceStrategy } from "./comparison"
import { buildProgramMap, type ProgramMap } from "./programMap"
import { computeProfile, surveyStateFromResult, type ProfileScores } from "./sections"

/** Presentation edits: comparison line key → unit SF. */
export type DeliverableOverrides = Record<string, number>

// Engine circulation multipliers (lib/fast-track-calculations defaults) applied
// to the edited nets so the technical readout stays consistent under edits.
const CIRC = { Workstations: 0.45, Offices: 0.45, Collaboration: 0.45, Support: 0.35 } as const
const RENTABLE_FACTOR = 0.22

export interface DeliverableCategory {
  name: keyof typeof CIRC
  lines: ComparisonLine[]
  existingSF: number
  proposedNetSF: number
  circulationSF: number
  proposedTotalSF: number
}

export interface Deliverable {
  clientName: string
  current: number
  future: number
  daysInOffice: number
  profile: ProfileScores
  map: ProgramMap
  comp: Comparison
  /** All lines with overrides applied, sorted by program impact. */
  lines: ComparisonLine[]
  categories: DeliverableCategory[]
  totals: {
    existingSF: number
    proposedNetSF: number
    circulationSF: number
    grossUsableSF: number
    rentableAddOnSF: number
    estimatedRentableSF: number
    rentableFactor: number
    sfPerPerson: number
  }
  strategy: SpaceStrategy
}

/** A Studio-added line (e.g. a duplicated card for a second office size). */
export interface DeliverableAddition {
  key: string
  label: string
  category: CompCategory
  unitSF: number
  proposedCount: number
  ratio?: string
}

export function buildDeliverable(
  result: SurveyResult,
  overrides: DeliverableOverrides = {},
  /** Optional proposed-count overrides (line key → qty) — the Studio's second dial. */
  counts: Record<string, number> = {},
  /** Studio additions — duplicated/custom lines that participate fully in totals. */
  additions: DeliverableAddition[] = [],
): Deliverable {
  const comp = buildComparison(result)
  const lines: ComparisonLine[] = [
    ...comp.lines.map((l) => ({
      ...l,
      unitSF: overrides[l.key] && overrides[l.key] > 0 ? overrides[l.key] : l.unitSF,
      proposedCount: counts[l.key] !== undefined && counts[l.key] >= 0 ? counts[l.key] : l.proposedCount,
    })),
    ...additions.map((a) => ({
      key: a.key, label: a.label, category: a.category, unitSF: a.unitSF,
      ...(a.ratio ? { ratio: a.ratio } : {}),
      existingCount: 0, proposedCount: a.proposedCount,
      existingCountKnown: true, existingSizeKnown: true,
    })),
  ]

  const cats = (["Workstations", "Offices", "Collaboration", "Support"] as const).map((name) => {
    const ls = lines.filter((l) => l.category === name)
    const existingSF = ls.reduce((s, l) => s + l.existingCount * l.unitSF, 0)
    const proposedNetSF = ls.reduce((s, l) => s + l.proposedCount * l.unitSF, 0)
    const circulationSF = Math.round(proposedNetSF * CIRC[name])
    return { name, lines: ls, existingSF, proposedNetSF, circulationSF, proposedTotalSF: proposedNetSF + circulationSF }
  })

  const existingSF = cats.reduce((s, c) => s + c.existingSF, 0)
  const proposedNetSF = cats.reduce((s, c) => s + c.proposedNetSF, 0)
  const circulationSF = cats.reduce((s, c) => s + c.circulationSF, 0)
  const grossUsableSF = proposedNetSF + circulationSF
  const rentableAddOnSF = Math.round(grossUsableSF * RENTABLE_FACTOR)
  const estimatedRentableSF = grossUsableSF + rentableAddOnSF

  return {
    clientName: comp.clientName,
    current: comp.current,
    future: comp.future,
    daysInOffice: comp.daysInOffice,
    profile: computeProfile(surveyStateFromResult(result)),
    map: buildProgramMap(result, lines),
    comp,
    lines: [...lines].sort(
      (a, b) => Math.abs((b.proposedCount - b.existingCount) * b.unitSF) - Math.abs((a.proposedCount - a.existingCount) * a.unitSF),
    ),
    categories: cats,
    totals: {
      existingSF,
      proposedNetSF,
      circulationSF,
      grossUsableSF,
      rentableAddOnSF,
      estimatedRentableSF,
      rentableFactor: RENTABLE_FACTOR,
      sfPerPerson: comp.future > 0 ? Math.round(grossUsableSF / comp.future) : 0,
    },
    strategy: spaceStrategy(existingSF, proposedNetSF, result.goals),
  }
}

/** The big, most-frequent presentation decisions — surfaced as chips on the program slide. */
export const KEY_DECISION_KEYS = [
  "workstations",
  "offices",
  "collab:Medium Conference",
  "collab:Huddle Room / Flex",
  "collab:Phone Room / Focus Booth",
  "support:Work Cafe",
  "support:Reception",
] as const
