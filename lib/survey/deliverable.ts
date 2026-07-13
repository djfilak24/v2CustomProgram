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

/**
 * The planning dials — the honest levers a designer pulls in session.
 * Defaults match the engine's constants; deviations are decisions and are
 * logged as such by the Studio.
 */
export interface DeliverableFactors {
  /** Circulation on Workstations + Offices (default 0.45). */
  circIndividual?: number
  /** Circulation on Collaboration (default 0.45). */
  circCollab?: number
  /** Circulation on Support (default 0.35). */
  circSupport?: number
  /** Rentable load add-on (default 0.22 → ×1.22). */
  rentable?: number
}

export const DEFAULT_FACTORS: Required<DeliverableFactors> = {
  circIndividual: CIRC.Workstations,
  circCollab: CIRC.Collaboration,
  circSupport: CIRC.Support,
  rentable: RENTABLE_FACTOR,
}

export function buildDeliverable(
  result: SurveyResult,
  overrides: DeliverableOverrides = {},
  /** Optional proposed-count overrides (line key → qty) — the Studio's second dial. */
  counts: Record<string, number> = {},
  /** Studio additions — duplicated/custom lines that participate fully in totals. */
  additions: DeliverableAddition[] = [],
  /** Planning dials — circulation + load factor, session-adjustable. */
  factors: DeliverableFactors = {},
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

  const circFor = (name: keyof typeof CIRC): number =>
    name === "Support"
      ? factors.circSupport ?? CIRC.Support
      : name === "Collaboration"
        ? factors.circCollab ?? CIRC.Collaboration
        : factors.circIndividual ?? CIRC[name]
  const rentableFactor = factors.rentable ?? RENTABLE_FACTOR

  const cats = (["Workstations", "Offices", "Collaboration", "Support"] as const).map((name) => {
    const ls = lines.filter((l) => l.category === name)
    const existingSF = ls.reduce((s, l) => s + l.existingCount * l.unitSF, 0)
    const proposedNetSF = ls.reduce((s, l) => s + l.proposedCount * l.unitSF, 0)
    const circulationSF = Math.round(proposedNetSF * circFor(name))
    return { name, lines: ls, existingSF, proposedNetSF, circulationSF, proposedTotalSF: proposedNetSF + circulationSF }
  })

  const existingSF = cats.reduce((s, c) => s + c.existingSF, 0)
  const proposedNetSF = cats.reduce((s, c) => s + c.proposedNetSF, 0)
  const circulationSF = cats.reduce((s, c) => s + c.circulationSF, 0)
  const grossUsableSF = proposedNetSF + circulationSF
  const rentableAddOnSF = Math.round(grossUsableSF * rentableFactor)
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
      rentableFactor,
      sfPerPerson: comp.future > 0 ? Math.round(grossUsableSF / comp.future) : 0,
    },
    strategy: spaceStrategy(existingSF, proposedNetSF, result.goals),
  }
}

/**
 * The category color language — one hue per use type, used everywhere a
 * category appears (Studio rails, cards, charts) so use-type reads at a glance.
 * CVD-validated as a set; deliberately avoids rose/violet, which the Studio
 * reserves for change dots. `accent` marks (bars, dots, borders), `text` is the
 * readable dark step of the same hue, `tint` is the chip/row wash.
 */
export const CATEGORY_COLORS: Record<keyof typeof CIRC, { accent: string; text: string; tint: string }> = {
  Workstations: { accent: "#00badc", text: "#0089a3", tint: "rgba(0,186,220,0.10)" },
  Offices: { accent: "#2563eb", text: "#1d4ed8", tint: "rgba(37,99,235,0.08)" },
  Collaboration: { accent: "#f59e0b", text: "#b45309", tint: "rgba(245,158,11,0.12)" },
  Support: { accent: "#10b981", text: "#047857", tint: "rgba(16,185,129,0.10)" },
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
