/**
 * Presenter demo scenarios — complete SurveyResult fixtures the presenter can
 * seed to show a full end-to-end product on any path, regardless of what a given
 * prospect filled in. Entry: /review?demo=<key> or /survey (demo control), or
 * the demo button. Add a scenario = add a fixture here; no code changes.
 */
import type { SurveyResult } from "./types"
import { surveyStateFromResult, makeEmployee, assignSeatHierarchy, type SurveyState, type PeopleMode } from "./sections"

export interface DemoScenario {
  label: string
  blurb: string
  /** People-detail mode the demo showcases (fills a named roster to match). */
  peopleMode: PeopleMode
  result: SurveyResult
}

// Deterministic name pool so full/leader rosters look real in the demo.
const FIRST = ["Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Avery", "Quinn", "Drew", "Skyler", "Reese", "Cameron", "Devin", "Harper", "Rowan", "Emerson", "Parker", "Sage", "Blake", "Hayden", "Kendall", "Logan", "Marley"]
const LAST = ["Rivera", "Chen", "Patel", "Nguyen", "Kim", "Garcia", "Okafor", "Silva", "Brooks", "Hayes", "Ford", "Nash", "Reyes", "Cole", "Bennett", "Wu", "Diaz", "Flynn", "Grant", "Shah", "Park", "Lowe", "Reid", "Vance", "Ellis"]
const genName = (i: number) => `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`
const leadersFor = (hc: number) => (hc <= 6 ? 1 : hc <= 20 ? 2 : 3)

/** Full SurveyState for a demo — answers pre-filled, plus a named roster. */
export function demoState(key: string): SurveyState | null {
  const sc = DEMO_SCENARIOS[key]
  if (!sc) return null
  const s = surveyStateFromResult(sc.result)
  s.peopleMode = sc.peopleMode
  if (sc.peopleMode !== "simple") {
    let n = 0
    s.departments = s.departments.map((d) => {
      const isFull = sc.peopleMode === "full"
      const count = isFull ? d.headcount : Math.min(d.headcount, leadersFor(d.headcount))
      const employees = Array.from({ length: count }, () => makeEmployee(genName(n++)))
      // Leaders are an explicit subset, listed first. In "leaders" mode everyone
      // named is a leader; in "full" mode a handful lead the team (at least as
      // many as get offices, so offices ⊆ leaders).
      const nLead = sc.peopleMode === "leaders"
        ? employees.length
        : Math.min(employees.length, Math.max(leadersFor(d.headcount), s.officesByDept[d.id] ?? 0))
      employees.forEach((e, i) => { if (i < nLead) e.isLeader = true })
      return isFull ? { ...d, employees, headcount: employees.length } : { ...d, employees }
    })
    // Offices go to the leaders first (they lead the roster), dedicated desks to
    // the next names — mutually exclusive.
    assignSeatHierarchy(s)
  }
  return s
}

/**
 * A demo as a SurveyResult with its generated named roster + leaders grafted on
 * (rosters live in demo state, not the hand-authored fixture). Keeps every
 * curated fixture value intact and only adds the per-person roster, so the
 * review shows leaders, rosters, placement, and goals for demos.
 */
export function demoResult(key: string): SurveyResult | null {
  const sc = DEMO_SCENARIOS[key]
  const st = demoState(key)
  if (!sc || !st) return null
  const rosterById = new Map(st.departments.map((d) => [d.id, d.employees]))
  return {
    ...sc.result,
    people: {
      ...sc.result.people,
      departments: sc.result.people.departments.map((d) => {
        const emps = rosterById.get(d.id)
        return emps && emps.length
          ? { ...d, employees: emps.map((e) => ({ id: e.id, name: e.name, ...(e.isLeader ? { isLeader: true } : {}) })) }
          : d
      }),
    },
  }
}

const now = "2026-06-25T00:00:00Z"

const tech: SurveyResult = {
  meta: { clientName: "Northwind Labs", completedBy: "Demo", completedAt: now },
  goals: { motivators: ["growth", "flexibility", "amenity"], posture: "expand" },
  people: {
    departments: [
      { id: "eng", name: "Engineering", headcount: 48, futureHeadcount: 70 },
      { id: "prod", name: "Product & Design", headcount: 22, futureHeadcount: 30 },
      { id: "gtm", name: "Sales & Marketing", headcount: 30, futureHeadcount: 40 },
      { id: "ops", name: "Operations & People", headcount: 12, futureHeadcount: 15 },
      { id: "lead", name: "Leadership", headcount: 8, futureHeadcount: 10 },
    ],
    totalHeadcount: 120,
    companyGrowthPct: 25,
  },
  work: {
    daysInOffice: 3, fullyRemote: 14, dedicatedByDept: { eng: 22, prod: 10 },
    adjacencyNotes: "Engineering ↔ Product & Design; Product & Design ↔ Sales & Marketing; Operations & People ↔ Leadership",
    adjacencyPairs: [{ a: "eng", b: "prod" }, { a: "prod", b: "gtm" }, { a: "ops", b: "lead" }],
  },
  spaces: {
    // Leaders take offices; senior ICs take dedicated desks (mutually exclusive).
    privateOfficesByDept: { lead: 6, ops: 2, eng: 4, prod: 3 },
    officePlacement: "interior",
    collaboration: [
      { type: "Huddle Room / Flex", byDept: { eng: 3, prod: 2 } },
      { type: "Phone Room / Focus Booth", byDept: { eng: 4 } },
      { type: "Medium Conference", byDept: { gtm: 2 } },
    ],
    support: ["Reception", "Work Cafe", "Pantry / Kitchenette", "Wellness Room Suite", "Mothers Room"],
  },
  qualitative: {
    loves: "The open café — it's where the whole company actually mixes.",
    painPoints: "Never enough focus rooms; calls happen in stairwells.",
  },
  special: {},
  existing: {
    furniture: "mixed", workstationSF: 36, officeSF: 120,
    existingWorkstations: 96, existingOffices: 6,
    existingCollab: { "Huddle Room / Flex": 3, "Medium Conference": 2, "Open Collaboration Space": 1 },
    existingSupport: { Reception: 1, "Work Cafe": 1, "Pantry / Kitchenette": 1 },
  },
  deferred: [],
}

const law: SurveyResult = {
  meta: { clientName: "Hartwell & Cross LLP", completedBy: "Demo", completedAt: now },
  goals: { motivators: ["optimize", "focus"], posture: "optimize" },
  people: {
    departments: [
      { id: "ptr", name: "Partners", headcount: 14, futureHeadcount: 16 },
      { id: "assoc", name: "Associates", headcount: 26, futureHeadcount: 30 },
      { id: "para", name: "Paralegals", headcount: 12, futureHeadcount: 13 },
      { id: "admin", name: "Administration", headcount: 8, futureHeadcount: 8 },
    ],
    totalHeadcount: 60,
    companyGrowthPct: 8,
  },
  work: {
    daysInOffice: 5, fullyRemote: 2, dedicatedByDept: { para: 8, admin: 4 },
    adjacencyNotes: "Partners ↔ Associates; Associates ↔ Paralegals",
    adjacencyPairs: [{ a: "ptr", b: "assoc" }, { a: "assoc", b: "para" }],
  },
  spaces: {
    privateOfficesByDept: { ptr: 14, assoc: 20 },
    officePlacement: "exterior",
    collaboration: [
      { type: "Medium Conference", byDept: { ptr: 2 } },
      { type: "Large Conference", byDept: { ptr: 1 } },
      { type: "Phone Room / Focus Booth", byDept: { assoc: 3 } },
    ],
    support: ["Reception", "Pantry / Kitchenette", "File Room", "Mail Room", "Interview Room"],
  },
  qualitative: { painPoints: "Records storage is overflowing; not enough conference rooms for client meetings." },
  special: {},
  existing: {
    furniture: "reuse", workstationSF: 48, officeSF: 144,
    existingWorkstations: 22, existingOffices: 34,
    existingCollab: { "Medium Conference": 2, "Large Conference": 1 },
    existingSupport: { Reception: 1, "File Room": 2, "Mail Room": 1, "Pantry / Kitchenette": 1 },
  },
  deferred: [],
}

const enterprise: SurveyResult = {
  meta: { clientName: "Meridian Financial", completedBy: "Demo", completedAt: now },
  goals: { motivators: ["optimize", "density", "growth"], posture: "balance" },
  people: {
    departments: [
      { id: "fin", name: "Finance", headcount: 90, futureHeadcount: 96 },
      { id: "risk", name: "Risk & Compliance", headcount: 70, futureHeadcount: 85 },
      { id: "tech", name: "Technology", headcount: 110, futureHeadcount: 130 },
      { id: "ops", name: "Operations", headcount: 85, futureHeadcount: 80 },
      { id: "corp", name: "Corporate & Legal", headcount: 35, futureHeadcount: 38 },
      { id: "exec", name: "Executive", headcount: 10, futureHeadcount: 11 },
    ],
    totalHeadcount: 400,
    companyGrowthPct: 8,
  },
  work: {
    daysInOffice: 4, fullyRemote: 24, dedicatedByDept: { tech: 40, ops: 30, fin: 10 },
    adjacencyNotes: "Finance ↔ Risk & Compliance; Technology ↔ Operations; Corporate & Legal ↔ Executive",
    adjacencyPairs: [{ a: "fin", b: "risk" }, { a: "tech", b: "ops" }, { a: "corp", b: "exec" }],
  },
  spaces: {
    // Executives/corporate/finance leaders take offices; ICs take dedicated desks.
    privateOfficesByDept: { exec: 10, corp: 8, fin: 6 },
    officePlacement: "mixed",
    collaboration: [
      { type: "Huddle Room / Flex", byDept: { tech: 6, fin: 4 } },
      { type: "Medium Conference", byDept: { risk: 4 } },
      { type: "Large Conference", byDept: { exec: 2 } },
      { type: "Training Room", byDept: { risk: 1 } },
    ],
    support: ["Reception", "Work Cafe", "Pantry / Kitchenette", "Quiet Library", "Wellness Room Suite", "Mail Room", "File Room", "Multipurpose Room"],
  },
  qualitative: {},
  special: {},
  existing: {
    // A big firm that knows its counts but not a single standard office size —
    // exactly the kind of gap the review's "Show gaps" toggle surfaces.
    furniture: "mixed", workstationSF: 42,
    existingWorkstations: 360, existingOffices: 30,
    existingCollab: { "Huddle Room / Flex": 8, "Medium Conference": 6, "Large Conference": 2 },
    existingSupport: { Reception: 1, "Work Cafe": 1, "Pantry / Kitchenette": 4, "Mail Room": 1 },
  },
  deferred: [],
}

export const DEMO_SCENARIOS: Record<string, DemoScenario> = {
  tech: { label: "Tech Startup · 120", blurb: "High collaboration, hybrid, fast growth", peopleMode: "full", result: tech },
  law: { label: "Law Firm · 60", blurb: "Office-dense, privacy, stable", peopleMode: "leaders", result: law },
  enterprise: { label: "Enterprise · 400", blurb: "Mixed hybrid, large floorplate", peopleMode: "full", result: enterprise },
}
