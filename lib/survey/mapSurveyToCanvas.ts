/**
 * mapSurveyToCanvas — the complete port from a SurveyResult into the Advanced
 * Canvas schema. Nothing captured is wasted: departments + roster, dedicated
 * desk / private office allocations, workstation & office sizes, collaboration
 * room config, custom support spaces, existing conditions, and handoff notes all
 * land in the right slot. Pure + tested; the tool applies the result on load.
 */
import type { SurveyResult } from "./types"
import { seedToolFromSurvey } from "./seedToolFromSurvey"
import {
  computeAllSeatDemandBlocks, computeSpaceProgram, type SummaryInputs,
} from "../fast-track-calculations"
import { convertProgramToSpaces, type EditableSpace } from "../convert-program-to-spaces"
import { COLLAB_CATALOG, SUPPORT_CATALOG } from "./catalog"

const DEPT_COLOR_CLASSES = [
  "bg-cyan-500", "bg-blue-500", "bg-violet-500", "bg-pink-500", "bg-orange-500",
  "bg-emerald-500", "bg-amber-500", "bg-red-500", "bg-teal-500", "bg-purple-500",
]

export interface CanvasDept {
  id: string
  name: string
  color: string
  headcount: number
  futureHeadcount: number
  officeCount: number
  hybridWorkers: number
  workstations: number
  employees?: { id: string; name: string }[]
}

export interface ExistingSeed {
  workstations: { count: number; sfEach: number }
  offices: { count: number; sfEach: number }
  furniture?: "reuse" | "mixed" | "new"
  collab: { name: string; count: number; sfEach: number }[]
  support: { name: string; count: number; sfEach: number }[]
  totalSF: number
}

export interface CanvasSeed {
  inputs: { totalHeadcount: number; fullyRemote: number; percentOffices: number; daysInOffice: number }
  planningHeadcount: number
  planForGrowth: boolean
  departments: CanvasDept[]
  spaces: Record<string, EditableSpace>
  existing: ExistingSeed
  notes: string
}

const alloc = (m: Record<string, number>) =>
  Object.entries(m).filter(([, c]) => c > 0).map(([departmentId, count]) => ({ departmentId, count }))

const sfOf = (name: string) =>
  COLLAB_CATALOG.find((c) => c.id === name)?.sfEach ?? SUPPORT_CATALOG.find((c) => c.id === name)?.sfEach ?? 100

function collabNote(cfg: { build?: string; monitor?: string; notes?: string }): string {
  const parts: string[] = []
  if (cfg.build) parts.push(`Setup: ${cfg.build}`)
  if (cfg.monitor) parts.push(`Monitor: ${cfg.monitor}`)
  if (cfg.notes?.trim()) parts.push(cfg.notes.trim())
  return parts.join(" · ")
}

export function mapSurveyToCanvas(survey: SurveyResult): CanvasSeed {
  const seeded = seedToolFromSurvey(survey)
  const inputs: SummaryInputs = {
    clientName: survey.meta.clientName || "",
    programmedBy: survey.meta.completedBy || "",
    totalHeadcount: seeded.inputs.totalHeadcount,
    fullyRemote: seeded.inputs.fullyRemote,
    percentOffices: seeded.inputs.percentOffices,
    grossRent: 50,
    daysInOffice: seeded.inputs.daysInOffice,
    rentableFactor: 0.22,
  }
  const blocks = computeAllSeatDemandBlocks(inputs.totalHeadcount, inputs.fullyRemote)
  const program = computeSpaceProgram(inputs, blocks, inputs.daysInOffice)
  const spaces = convertProgramToSpaces(program, inputs).spaces

  const ex = survey.existing ?? {}
  const wsSF = ex.workstationSF
  const offSF = ex.officeSF
  const dedicatedByDept = survey.work.dedicatedByDept ?? {}
  const officesByDept = survey.spaces.privateOfficesByDept ?? {}
  const collabConfig = survey.spaces.collabConfig ?? {}

  // ── Overlay survey intent onto the engine baseline ──────────────────────────
  for (const sp of Object.values(spaces)) {
    // Sizes from existing conditions
    if (wsSF && (sp.workstationType === "employee" || sp.workstationType === "flex")) {
      sp.sfEach = wsSF; sp.totalArea = sp.quantity * wsSF
    }
    if (offSF && sp.workstationType === "private") {
      sp.sfEach = offSF; sp.totalArea = sp.quantity * offSF
    }
    // Collaboration room config → notes
    const cfg = collabConfig[sp.name]
    if (cfg) sp.notes = collabNote(cfg)
  }

  // Dedicated desks → the primary employee workstation; offices → the private office.
  const wsKey = Object.keys(spaces).find((k) => spaces[k].workstationType === "employee")
  if (wsKey && Object.keys(dedicatedByDept).length) spaces[wsKey].departmentAllocations = alloc(dedicatedByDept)
  const offKey = Object.keys(spaces).find((k) => spaces[k].workstationType === "private")
  if (offKey && Object.keys(officesByDept).length) spaces[offKey].departmentAllocations = alloc(officesByDept)

  // Custom / selected support the engine didn't generate → add as spaces.
  const existingNames = new Set(Object.values(spaces).map((s) => s.name))
  for (const name of survey.spaces.support) {
    if (existingNames.has(name)) continue
    const key = `custom_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`
    spaces[key] = {
      id: key, name, customName: name, zone: "Support", quantity: 1, capacity: 0,
      sfEach: sfOf(name), totalArea: sfOf(name), workstationType: null, notes: "",
      ratio: "", departmentAllocations: [], isActive: true,
    }
  }

  // ── Departments (+ roster) ──────────────────────────────────────────────────
  const empById = new Map(survey.people.departments.map((d) => [d.id, d.employees]))
  const departments: CanvasDept[] = seeded.departments.map((d, i) => ({
    id: d.id,
    name: d.name,
    color: DEPT_COLOR_CLASSES[i % DEPT_COLOR_CLASSES.length],
    headcount: d.headcount,
    futureHeadcount: d.futureHeadcount ?? d.headcount,
    officeCount: d.officeCount,
    hybridWorkers: d.hybridWorkers,
    workstations: d.workstations,
    ...(empById.get(d.id)?.length ? { employees: empById.get(d.id) } : {}),
  }))

  // ── Existing conditions (independent baseline) ──────────────────────────────
  const exCollab = Object.entries(ex.existingCollab ?? {}).map(([name, count]) => ({ name, count, sfEach: sfOf(name) }))
  const exSupport = Object.entries(ex.existingSupport ?? {}).map(([name, count]) => ({ name, count, sfEach: sfOf(name) }))
  const exWs = { count: ex.existingWorkstations ?? 0, sfEach: ex.workstationSF ?? 48 }
  const exOff = { count: ex.existingOffices ?? 0, sfEach: ex.officeSF ?? 120 }
  const existing: ExistingSeed = {
    workstations: exWs,
    offices: exOff,
    furniture: ex.furniture,
    collab: exCollab,
    support: exSupport,
    totalSF:
      exWs.count * exWs.sfEach + exOff.count * exOff.sfEach +
      exCollab.reduce((s, c) => s + c.count * c.sfEach, 0) +
      exSupport.reduce((s, c) => s + c.count * c.sfEach, 0),
  }

  return {
    inputs: {
      totalHeadcount: inputs.totalHeadcount,
      fullyRemote: inputs.fullyRemote,
      percentOffices: inputs.percentOffices,
      daysInOffice: inputs.daysInOffice,
    },
    planningHeadcount: seeded.planningHeadcount,
    planForGrowth: seeded.planForGrowth,
    departments,
    spaces,
    existing,
    notes: assembleNotes(survey),
  }
}

function assembleNotes(survey: SurveyResult): string {
  const out: string[] = []
  const add = (label: string, v?: string) => { if (v?.trim()) out.push(`${label}: ${v.trim()}`) }
  add("What's working", survey.qualitative.loves)
  add("Pain points", survey.qualitative.painPoints)
  add("Over/under-used", survey.qualitative.imbalances)
  add("Adjacencies", survey.work.adjacencyNotes)
  if (survey.existing?.furniture) out.push(`Furniture: ${survey.existing.furniture}`)
  if (survey.deferred.length) out.push(`Deferred to live session (${survey.deferred.length}): ${survey.deferred.join(", ")}`)
  return out.join("\n")
}
