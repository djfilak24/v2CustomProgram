/**
 * Excel exports — the two workbooks of the artifact phase:
 *
 * 1. exportProgramXlsx — the PROGRAM: every space line (basis, existing,
 *    proposed, sizes, totals, deltas) + a summary sheet. The spreadsheet a
 *    client's facilities/finance team actually asks for.
 * 2. exportIntakeWorkbook — the INTAKE workbook (Door 3's export half): every
 *    question as structured sheets, pre-filled with what we know, blanks for
 *    the rest — circulates offline and round-trips later.
 */
import * as XLSX from "xlsx"
import type { SurveyResult } from "./types"
import type { Comparison, ComparisonLine } from "./comparison"
import { GOAL_MOTIVATORS, SPACE_POSTURES } from "./sections"
import { COLLAB_CATALOG, SUPPORT_CATALOG } from "./catalog"

const labelOf = (list: { id: string; label: string }[], id?: string | null) =>
  list.find((o) => o.id === id)?.label ?? id ?? ""

function sheet(rows: (string | number | null)[][], widths?: number[]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  if (widths) ws["!cols"] = widths.map((wch) => ({ wch }))
  return ws
}

export function exportProgramXlsx(
  result: SurveyResult,
  comp: Comparison,
  lines: ComparisonLine[],
  totals: { existing: number; proposed: number },
): void {
  const wb = XLSX.utils.book_new()

  const summary: (string | number | null)[][] = [
    ["NELSON · Workplace Program", null],
    ["Client", comp.clientName],
    ["Date", new Date().toLocaleDateString()],
    [null, null],
    ["People today", comp.current],
    ["Planning headcount", comp.future],
    ["Days in office / week", comp.daysInOffice],
    ["Fully remote", comp.fullyRemote],
    [null, null],
    ["Existing SF", Math.round(totals.existing)],
    ["Proposed SF", Math.round(totals.proposed)],
    ["Difference SF", Math.round(totals.proposed - totals.existing)],
    [null, null],
    ["Goals", (result.goals?.motivators ?? []).map((m) => labelOf(GOAL_MOTIVATORS, m)).join(", ")],
    ["Space posture", result.goals?.posture ? labelOf(SPACE_POSTURES, result.goals.posture) : ""],
  ]
  XLSX.utils.book_append_sheet(wb, sheet(summary, [24, 40]), "Summary")

  const program: (string | number | null)[][] = [
    ["Space", "Category", "Basis (ratio)", "Existing count", "Existing SF", "Proposed count", "Unit SF", "Proposed SF", "Δ SF"],
    ...lines.map((l) => [
      l.label, l.category, l.ratio ?? "",
      l.existingCount, Math.round(l.existingCount * l.unitSF),
      l.proposedCount, l.unitSF, Math.round(l.proposedCount * l.unitSF),
      Math.round((l.proposedCount - l.existingCount) * l.unitSF),
    ]),
    [],
    ["TOTAL", "", "", "", Math.round(totals.existing), "", "", Math.round(totals.proposed), Math.round(totals.proposed - totals.existing)],
  ]
  XLSX.utils.book_append_sheet(wb, sheet(program, [28, 14, 18, 14, 12, 14, 9, 12, 10]), "Program")

  XLSX.writeFile(wb, `${slug(comp.clientName)}-program.xlsx`)
}

export function exportIntakeWorkbook(result: SurveyResult): void {
  XLSX.writeFile(buildIntakeWorkbook(result), `${slug(result.meta.clientName || "intake")}-intake-workbook.xlsx`)
}

/** The intake workbook as a WorkBook — separated so the importer can round-trip it in tests. */
export function buildIntakeWorkbook(result: SurveyResult): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const ex = result.existing ?? {}

  XLSX.utils.book_append_sheet(wb, sheet([
    ["NELSON · Workplace Strategy Discovery — Intake Workbook"],
    ["Fill anything blank; correct anything wrong. Every sheet feeds your program directly."],
    [],
    ["Company", result.meta.clientName || ""],
    ["Completed by", result.meta.completedBy || ""],
    ["Total headcount", result.people.totalHeadcount || ""],
    ["Company growth % (3–5 yr)", result.people.companyGrowthPct ?? ""],
    ["Typical days in office / week", result.work.daysInOffice],
    ["Fully remote people", result.work.fullyRemote],
    [],
    ["Goals (mark all that apply)"],
    ...GOAL_MOTIVATORS.map((g) => [g.label, (result.goals?.motivators ?? []).includes(g.id) ? "X" : ""]),
    [],
    ["Space posture (choose one)"],
    ...SPACE_POSTURES.map((p) => [p.label, result.goals?.posture === p.id ? "X" : ""]),
  ], [34, 24]), "Company & Goals")

  XLSX.utils.book_append_sheet(wb, sheet([
    ["Department", "Headcount today", "Headcount 3–5 yr", "Private offices", "Dedicated desks", "Days in office (if different)"],
    ...result.people.departments.map((d) => [
      d.name, d.headcount, d.futureHeadcount ?? "",
      result.spaces.privateOfficesByDept[d.id] ?? "",
      result.work.dedicatedByDept?.[d.id] ?? "",
      result.work.perDeptDays?.[d.id] ?? "",
    ]),
    ...Array.from({ length: 6 }, () => ["", "", "", "", "", ""]),
  ], [26, 16, 16, 15, 15, 24]), "Departments")

  XLSX.utils.book_append_sheet(wb, sheet([
    ["Department", "Person", "Leader? (X)", "Private office? (X)", "Dedicated desk? (X)"],
    ...result.people.departments.flatMap((d) =>
      (d.employees ?? []).map((e) => [d.name, e.name, e.isLeader ? "X" : "", "", ""]),
    ),
    ...Array.from({ length: 10 }, () => ["", "", "", "", ""]),
  ], [26, 26, 12, 16, 16]), "Roster")

  XLSX.utils.book_append_sheet(wb, sheet([
    ["Existing conditions", "Value"],
    ["Furniture posture (reuse / mixed / new)", ex.furniture ?? ""],
    ["Workstation footprint (SF each)", ex.workstationSF ?? ""],
    ["Private office footprint (SF each)", ex.officeSF ?? ""],
    ["Existing workstations (count)", ex.existingWorkstations ?? ""],
    ["Existing private offices (count)", ex.existingOffices ?? ""],
    [],
    ["Collaboration spaces today", "Count"],
    ...COLLAB_CATALOG.map((c) => [c.label, ex.existingCollab?.[c.id] ?? ""]),
    [],
    ["Support spaces today", "Count"],
    ...SUPPORT_CATALOG.map((c) => [c.label, ex.existingSupport?.[c.id] ?? ""]),
  ], [38, 12]), "Existing")

  XLSX.utils.book_append_sheet(wb, sheet([
    ["Collaboration space", "Wanted? (X)", "Setup (built-in / floating)", "Monitor (large / small / none)", "Notes"],
    ...COLLAB_CATALOG.map((c) => {
      const on = result.spaces.collaboration.some((x) => x.type === c.id)
      const cfg = result.spaces.collabConfig?.[c.id]
      return [c.label, on ? "X" : "", cfg?.build ?? "", cfg?.monitor ?? "", cfg?.notes ?? ""]
    }),
    [],
    ["Support space", "Must-have? (X)"],
    ...SUPPORT_CATALOG.map((c) => [c.label, result.spaces.support.includes(c.id) ? "X" : ""]),
    ["(add any others below)"],
    ...Array.from({ length: 4 }, () => ["", ""]),
  ], [30, 12, 24, 26, 30]), "Spaces")

  XLSX.utils.book_append_sheet(wb, sheet([
    ["Question", "Your answer"],
    ["What's working well today?", result.qualitative.loves ?? ""],
    ["What are the pain points?", result.qualitative.painPoints ?? ""],
    ["What feels over- or under-used?", result.qualitative.imbalances ?? ""],
    ["Which teams should sit near each other?", result.work.adjacencyNotes ?? ""],
    ["Offices on the glass, interior, or a mix?", result.spaces.officePlacement ?? ""],
  ], [38, 60]), "In your words")

  return wb
}

const slug = (s: string) => (s || "client").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
