/**
 * Workbook import — Door 3's return half. Parses a completed intake workbook
 * (the exact file exportIntakeWorkbook generates, filled in offline) back into
 * a SurveyResult. Deterministic because we authored the layout; parsing is
 * label-driven (scan for known row labels) rather than index-driven, so blank
 * rows, added rows, and reordered sections survive.
 *
 * Philosophy matches the anti-fatigue contract: anything unreadable or blank is
 * simply skipped — a partial workbook imports as a partial survey, and the gaps
 * surface in the review like any other skipped answer.
 */
import * as XLSX from "xlsx"
import type { SurveyResult, SurveyCollaborationItem } from "./types"
import { GOAL_MOTIVATORS, SPACE_POSTURES } from "./sections"
import { COLLAB_CATALOG, SUPPORT_CATALOG } from "./catalog"

type Row = (string | number | null | undefined)[]

const s = (v: unknown): string => (v == null ? "" : String(v).trim())
const marked = (v: unknown): boolean => /^x$/i.test(s(v))
const num = (v: unknown): number | undefined => {
  const n = Number(s(v).replace(/,/g, ""))
  return Number.isFinite(n) && s(v) !== "" ? n : undefined
}
const byLabel = <T extends { id: string; label: string }>(list: T[], label: string) =>
  list.find((o) => o.label.toLowerCase() === label.toLowerCase())

function rows(wb: XLSX.WorkBook, name: string): Row[] {
  const ws = wb.Sheets[name]
  return ws ? (XLSX.utils.sheet_to_json(ws, { header: 1 }) as Row[]) : []
}

/** First row whose col0 equals the label (case-insensitive) → col1. */
function valueOf(rs: Row[], label: string): unknown {
  const r = rs.find((r) => s(r[0]).toLowerCase() === label.toLowerCase())
  return r?.[1]
}

export function importIntakeWorkbook(data: ArrayBuffer): SurveyResult {
  const wb = XLSX.read(data, { type: "array" })

  // ── Company & Goals ─────────────────────────────────────────────────────────
  const company = rows(wb, "Company & Goals")
  const clientName = s(valueOf(company, "Company"))
  const completedBy = s(valueOf(company, "Completed by"))
  const totalHC = num(valueOf(company, "Total headcount"))
  const growthPct = num(valueOf(company, "Company growth % (3–5 yr)"))
  const daysInOffice = num(valueOf(company, "Typical days in office / week")) ?? 3
  const fullyRemote = num(valueOf(company, "Fully remote people")) ?? 0
  const motivators = GOAL_MOTIVATORS.filter((g) =>
    company.some((r) => s(r[0]).toLowerCase() === g.label.toLowerCase() && marked(r[1])),
  ).map((g) => g.id)
  const posture = SPACE_POSTURES.find((p) =>
    company.some((r) => s(r[0]).toLowerCase() === p.label.toLowerCase() && marked(r[1])),
  )?.id as "expand" | "balance" | "optimize" | undefined

  // ── Departments ─────────────────────────────────────────────────────────────
  const deptRows = rows(wb, "Departments").slice(1).filter((r) => s(r[0]))
  const idOf = new Map<string, string>()
  const departments = deptRows.map((r, i) => {
    const id = `d${i + 1}`
    idOf.set(s(r[0]).toLowerCase(), id)
    return {
      id,
      name: s(r[0]),
      headcount: num(r[1]) ?? 0,
      ...(num(r[2]) !== undefined ? { futureHeadcount: num(r[2])! } : {}),
    }
  })
  const officesByDept: Record<string, number> = {}
  const dedicatedByDept: Record<string, number> = {}
  const perDeptDays: Record<string, number> = {}
  deptRows.forEach((r, i) => {
    const id = `d${i + 1}`
    const off = num(r[3]); if (off) officesByDept[id] = off
    const ded = num(r[4]); if (ded) dedicatedByDept[id] = ded
    const days = num(r[5]); if (days) perDeptDays[id] = days
  })

  // ── Roster (names + leader / office / desk marks) ───────────────────────────
  const rosterRows = rows(wb, "Roster").slice(1).filter((r) => s(r[1]))
  const roster = new Map<string, { id: string; name: string; isLeader?: boolean }[]>()
  const officeMarks: Record<string, number> = {}
  const deskMarks: Record<string, number> = {}
  rosterRows.forEach((r, i) => {
    const deptId = idOf.get(s(r[0]).toLowerCase())
    if (!deptId) return
    const list = roster.get(deptId) ?? []
    list.push({ id: `${deptId}e${i}`, name: s(r[1]), ...(marked(r[2]) ? { isLeader: true } : {}) })
    roster.set(deptId, list)
    if (marked(r[3])) officeMarks[deptId] = (officeMarks[deptId] ?? 0) + 1
    if (marked(r[4])) deskMarks[deptId] = (deskMarks[deptId] ?? 0) + 1
  })
  // Per-person marks refine the department counts (never reduce a stated total).
  for (const [id, n] of Object.entries(officeMarks)) officesByDept[id] = Math.max(officesByDept[id] ?? 0, n)
  for (const [id, n] of Object.entries(deskMarks)) dedicatedByDept[id] = Math.max(dedicatedByDept[id] ?? 0, n)
  const depts = departments.map((d) => {
    const emps = roster.get(d.id)
    return emps?.length ? { ...d, employees: emps } : d
  })

  // ── Existing conditions ─────────────────────────────────────────────────────
  const exRows = rows(wb, "Existing")
  const furnitureRaw = s(valueOf(exRows, "Furniture posture (reuse / mixed / new)")).toLowerCase()
  const furniture = (["reuse", "mixed", "new"] as const).find((f) => f === furnitureRaw)
  const existingCollab: Record<string, number> = {}
  const existingSupport: Record<string, number> = {}
  for (const r of exRows) {
    const c = byLabel(COLLAB_CATALOG, s(r[0])); if (c && num(r[1])) existingCollab[c.id] = num(r[1])!
    const sup = byLabel(SUPPORT_CATALOG, s(r[0])); if (sup && num(r[1])) existingSupport[sup.id] = num(r[1])!
  }
  const workstationSF = num(valueOf(exRows, "Workstation footprint (SF each)"))
  const officeSF = num(valueOf(exRows, "Private office footprint (SF each)"))
  const existingWorkstations = num(valueOf(exRows, "Existing workstations (count)"))
  const existingOffices = num(valueOf(exRows, "Existing private offices (count)"))

  // ── Wanted spaces + per-room config ─────────────────────────────────────────
  const spRows = rows(wb, "Spaces")
  const collaboration: SurveyCollaborationItem[] = []
  const collabConfig: Record<string, { build?: string; monitor?: string; notes?: string }> = {}
  const support: string[] = []
  for (const r of spRows) {
    const label = s(r[0])
    const c = byLabel(COLLAB_CATALOG, label)
    if (c) {
      if (marked(r[1])) collaboration.push({ type: c.id, byDept: {} })
      const cfg = { build: s(r[2]) || undefined, monitor: s(r[3]) || undefined, notes: s(r[4]) || undefined }
      if (cfg.build || cfg.monitor || cfg.notes) collabConfig[c.id] = cfg
      continue
    }
    const sup = byLabel(SUPPORT_CATALOG, label)
    if (sup) { if (marked(r[1])) support.push(sup.id); continue }
    // Custom support: an unrecognized name marked with X below the catalogs.
    if (label && marked(r[1]) && !/add any others/i.test(label)) support.push(label)
  }

  // ── Narrative ───────────────────────────────────────────────────────────────
  const words = rows(wb, "In your words")
  const loves = s(valueOf(words, "What's working well today?"))
  const painPoints = s(valueOf(words, "What are the pain points?"))
  const imbalances = s(valueOf(words, "What feels over- or under-used?"))
  const adjacencyNotes = s(valueOf(words, "Which teams should sit near each other?"))
  const placementRaw = s(valueOf(words, "Offices on the glass, interior, or a mix?")).toLowerCase()
  const officePlacement = (["exterior", "interior", "mixed"] as const).find((p) => p === placementRaw)

  return {
    meta: { clientName, completedBy, completedAt: new Date().toISOString() },
    ...(motivators.length || posture ? { goals: { motivators, ...(posture ? { posture } : {}) } } : {}),
    people: {
      departments: depts,
      totalHeadcount: depts.length ? depts.reduce((a, d) => a + d.headcount, 0) : totalHC ?? 0,
      ...(growthPct ? { companyGrowthPct: growthPct } : {}),
    },
    work: {
      daysInOffice,
      fullyRemote,
      ...(Object.keys(perDeptDays).length ? { perDeptDays } : {}),
      ...(Object.keys(dedicatedByDept).length ? { dedicatedByDept } : {}),
      ...(adjacencyNotes ? { adjacencyNotes } : {}),
    },
    spaces: {
      privateOfficesByDept: officesByDept,
      ...(officePlacement ? { officePlacement } : {}),
      collaboration,
      ...(Object.keys(collabConfig).length ? { collabConfig } : {}),
      support,
    },
    qualitative: {
      ...(loves ? { loves } : {}),
      ...(painPoints ? { painPoints } : {}),
      ...(imbalances ? { imbalances } : {}),
    },
    special: {},
    existing: {
      ...(furniture ? { furniture } : {}),
      ...(workstationSF !== undefined ? { workstationSF } : {}),
      ...(officeSF !== undefined ? { officeSF } : {}),
      ...(existingWorkstations !== undefined ? { existingWorkstations } : {}),
      ...(existingOffices !== undefined ? { existingOffices } : {}),
      ...(Object.keys(existingCollab).length ? { existingCollab } : {}),
      ...(Object.keys(existingSupport).length ? { existingSupport } : {}),
    },
    deferred: [],
  }
}
