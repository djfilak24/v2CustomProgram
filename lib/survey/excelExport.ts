/**
 * Excel exports — the two workbooks of the artifact phase, styled to feel like
 * NELSON sent them (navy title bands, cyan section heads, pale-cyan fillable
 * cells) rather than a generic dump:
 *
 * 1. exportProgramXlsx — the PROGRAM: every space line (basis, existing,
 *    proposed, sizes, totals, deltas) + a summary sheet.
 * 2. exportIntakeWorkbook — the INTAKE workbook (Door 3): a "Start here" guide
 *    sheet, then every question as structured sheets, pre-filled with what we
 *    know. Row LABELS are the import contract (workbookImport.ts is label-
 *    driven) — restyle freely, never rename a label.
 */
import * as XLSX from "xlsx-js-style"
import type { SurveyResult } from "./types"
import type { Comparison, ComparisonLine } from "./comparison"
import { GOAL_MOTIVATORS, SPACE_POSTURES } from "./sections"
import { COLLAB_CATALOG, SUPPORT_CATALOG } from "./catalog"

const labelOf = (list: { id: string; label: string }[], id?: string | null) =>
  list.find((o) => o.id === id)?.label ?? id ?? ""

/* ── The NELSON sheet language ────────────────────────────────────────────── */

const NAVY = "0E1A2E"
const CYAN_DARK = "0089A3"
const PALE_CYAN = "E9F7FB"
const INK = "0F172A"
const SLATE = "64748B"
const LINE = "D8E3EC"

type Cell = string | number | null
type Kind = "title" | "sub" | "header" | "section" | "input" | "note" | "total" | "row"
interface R { c: Cell[]; k?: Kind }

const S: Record<string, any> = {
  title: { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: NAVY } }, alignment: { vertical: "center" } },
  titlePad: { fill: { fgColor: { rgb: NAVY } } },
  sub: { font: { italic: true, sz: 9.5, color: { rgb: SLATE } } },
  header: { font: { bold: true, sz: 9.5, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "334155" } }, alignment: { vertical: "center" } },
  section: { font: { bold: true, sz: 11, color: { rgb: CYAN_DARK } } },
  label: { font: { sz: 10, color: { rgb: INK } }, border: { bottom: { style: "thin", color: { rgb: LINE } } } },
  input: {
    font: { sz: 10, color: { rgb: INK } }, fill: { fgColor: { rgb: PALE_CYAN } },
    border: { bottom: { style: "thin", color: { rgb: "BFE5EF" } } },
  },
  note: { font: { sz: 9.5, color: { rgb: SLATE } } },
  total: { font: { bold: true, sz: 10.5, color: { rgb: INK } }, border: { top: { style: "medium", color: { rgb: NAVY } } } },
  row: { font: { sz: 10, color: { rgb: INK } }, border: { bottom: { style: "thin", color: { rgb: LINE } } } },
}

/** Build a styled sheet: fillable cells get the pale-cyan treatment, bands span the width. */
function sheet(rows: R[], widths: number[]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(rows.map((r) => r.c))
  const width = widths.length
  rows.forEach((r, ri) => {
    const kind = r.k ?? "row"
    for (let ci = 0; ci < width; ci++) {
      const addr = XLSX.utils.encode_cell({ r: ri, c: ci })
      const exists = !!ws[addr]
      // Bands (title/header) and fillable input cells must exist even when empty.
      const force =
        (kind === "title" || kind === "header") ||
        (kind === "input" && ci >= 1 && ci < r.c.length)
      if (!exists && !force) continue
      if (!exists) ws[addr] = { t: "s", v: "" }
      const cell = ws[addr]
      if (kind === "title") cell.s = ci === 0 ? S.title : S.titlePad
      else if (kind === "header") cell.s = S.header
      else if (kind === "section") cell.s = ci === 0 ? S.section : undefined
      else if (kind === "sub") cell.s = S.sub
      else if (kind === "note") cell.s = S.note
      else if (kind === "total") cell.s = S.total
      else if (kind === "input") cell.s = ci === 0 ? S.label : S.input
      else cell.s = S.row
    }
  })
  ws["!cols"] = widths.map((wch) => ({ wch }))
  ws["!rows"] = rows.map((r) => ({ hpt: r.k === "title" ? 26 : r.k === "header" ? 18 : 15 }))
  return ws
}

const title = (text: string): R => ({ c: [text], k: "title" })
const sub = (text: string): R => ({ c: [text], k: "sub" })
const gap = (): R => ({ c: [null] })

/* ── The program spreadsheet ──────────────────────────────────────────────── */

export function exportProgramXlsx(
  result: SurveyResult,
  comp: Comparison,
  lines: ComparisonLine[],
  totals: { existing: number; proposed: number },
): void {
  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(wb, sheet([
    title("NELSON · Workplace Program"),
    sub(`${comp.clientName} · ${new Date().toLocaleDateString()}`),
    gap(),
    { c: ["People today", comp.current] },
    { c: ["Planning headcount", comp.future] },
    { c: ["Days in office / week", comp.daysInOffice] },
    { c: ["Fully remote", comp.fullyRemote] },
    gap(),
    { c: ["Existing SF", Math.round(totals.existing)] },
    { c: ["Proposed SF", Math.round(totals.proposed)] },
    { c: ["Difference SF", Math.round(totals.proposed - totals.existing)], k: "total" },
    gap(),
    { c: ["Goals", (result.goals?.motivators ?? []).map((m) => labelOf(GOAL_MOTIVATORS, m)).join(", ")] },
    { c: ["Space posture", result.goals?.posture ? labelOf(SPACE_POSTURES, result.goals.posture) : ""] },
  ], [24, 44]), "Summary")

  XLSX.utils.book_append_sheet(wb, sheet([
    title("The Program — every space, existing vs. proposed"),
    { c: ["Space", "Category", "Basis (ratio)", "Existing count", "Existing SF", "Proposed count", "Unit SF", "Proposed SF", "Δ SF"], k: "header" },
    ...lines.map((l): R => ({
      c: [
        l.label, l.category, l.ratio ?? "",
        l.existingCount, Math.round(l.existingCount * l.unitSF),
        l.proposedCount, l.unitSF, Math.round(l.proposedCount * l.unitSF),
        Math.round((l.proposedCount - l.existingCount) * l.unitSF),
      ],
    })),
    { c: ["TOTAL", "", "", "", Math.round(totals.existing), "", "", Math.round(totals.proposed), Math.round(totals.proposed - totals.existing)], k: "total" },
  ], [28, 14, 18, 14, 12, 15, 9, 12, 10]), "Program")

  XLSX.writeFile(wb, `${slug(comp.clientName)}-program.xlsx`)
}

/* ── The intake workbook ──────────────────────────────────────────────────── */

export function exportIntakeWorkbook(result: SurveyResult): void {
  XLSX.writeFile(buildIntakeWorkbook(result), `${slug(result.meta.clientName || "intake")}-intake-workbook.xlsx`)
}

/** The intake workbook as a WorkBook — separated so the importer can round-trip it in tests. */
export function buildIntakeWorkbook(result: SurveyResult): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const ex = result.existing ?? {}

  // Start here — the in-file guide (the send-along PDF covers the "why").
  XLSX.utils.book_append_sheet(wb, sheet([
    title("NELSON · Workplace Strategy Discovery — Intake Workbook"),
    sub(result.meta.clientName ? `Prepared for ${result.meta.clientName}` : "Prepared for your team"),
    gap(),
    { c: ["START HERE"], k: "section" },
    { c: ["This workbook feeds your workplace program directly — every cell lands in the plan we review together."], k: "note" },
    gap(),
    { c: ["1.", "Work through the tabs left to right. Anything we already know is pre-filled — correct it freely."], k: "note" },
    { c: ["2.", "Shaded cells are yours to fill. Mark checkboxes with an X. Leave anything you don't know blank —"], k: "note" },
    { c: ["", "blanks simply become agenda items for the live session. There are no wrong answers."], k: "note" },
    { c: ["3.", "Send the finished file back to your NELSON contact (or import it at your survey link)."], k: "note" },
    gap(),
    { c: ["THE TABS"], k: "section" },
    { c: ["Company & Goals", "Who you are and what's driving the project"], k: "row" },
    { c: ["Departments", "Each team: headcount today and 3–5 years out, offices, dedicated desks"], k: "row" },
    { c: ["Roster", "Name your people — mark leaders, offices, and dedicated desks with an X"], k: "row" },
    { c: ["Existing", "What's in place today: counts and sizes"], k: "row" },
    { c: ["Spaces", "The rooms that matter to you, and how they should be set up"], k: "row" },
    { c: ["In your words", "What's working, what isn't — in plain language"], k: "row" },
    gap(),
    { c: ["Most teams finish in 30–45 minutes. It can also be split — each department leader can fill their own rows."], k: "note" },
  ], [18, 92]), "Start here")

  XLSX.utils.book_append_sheet(wb, sheet([
    title("Company & Goals"),
    sub("Fill anything blank; correct anything wrong. Every sheet feeds your program directly."),
    gap(),
    { c: ["Company", result.meta.clientName || ""], k: "input" },
    { c: ["Completed by", result.meta.completedBy || ""], k: "input" },
    { c: ["Total headcount", result.people.totalHeadcount || ""], k: "input" },
    { c: ["Company growth % (3–5 yr)", result.people.companyGrowthPct ?? ""], k: "input" },
    { c: ["Typical days in office / week", result.work.daysInOffice], k: "input" },
    { c: ["Fully remote people", result.work.fullyRemote], k: "input" },
    gap(),
    { c: ["Goals (mark all that apply)"], k: "section" },
    ...GOAL_MOTIVATORS.map((g): R => ({ c: [g.label, (result.goals?.motivators ?? []).includes(g.id) ? "X" : ""], k: "input" })),
    gap(),
    { c: ["Space posture (choose one)"], k: "section" },
    ...SPACE_POSTURES.map((p): R => ({ c: [p.label, result.goals?.posture === p.id ? "X" : ""], k: "input" })),
  ], [34, 26]), "Company & Goals")

  XLSX.utils.book_append_sheet(wb, sheet([
    title("Departments"),
    { c: ["Department", "Headcount today", "Headcount 3–5 yr", "Private offices", "Dedicated desks", "Days in office (if different)"], k: "header" },
    ...result.people.departments.map((d): R => ({
      c: [
        d.name, d.headcount, d.futureHeadcount ?? "",
        result.spaces.privateOfficesByDept[d.id] ?? "",
        result.work.dedicatedByDept?.[d.id] ?? "",
        result.work.perDeptDays?.[d.id] ?? "",
      ],
      k: "input",
    })),
    ...Array.from({ length: 6 }, (): R => ({ c: ["", "", "", "", "", ""], k: "input" })),
  ], [26, 16, 16, 15, 15, 24]), "Departments")

  XLSX.utils.book_append_sheet(wb, sheet([
    title("Roster"),
    { c: ["Department", "Person", "Leader? (X)", "Private office? (X)", "Dedicated desk? (X)"], k: "header" },
    ...result.people.departments.flatMap((d) =>
      (d.employees ?? []).map((e): R => ({ c: [d.name, e.name, e.isLeader ? "X" : "", "", ""], k: "input" })),
    ),
    ...Array.from({ length: 10 }, (): R => ({ c: ["", "", "", "", ""], k: "input" })),
  ], [26, 26, 12, 16, 16]), "Roster")

  XLSX.utils.book_append_sheet(wb, sheet([
    title("Existing conditions"),
    { c: ["Existing conditions", "Value"], k: "header" },
    { c: ["Furniture posture (reuse / mixed / new)", ex.furniture ?? ""], k: "input" },
    { c: ["Workstation footprint (SF each)", ex.workstationSF ?? ""], k: "input" },
    { c: ["Private office footprint (SF each)", ex.officeSF ?? ""], k: "input" },
    { c: ["Existing workstations (count)", ex.existingWorkstations ?? ""], k: "input" },
    { c: ["Existing private offices (count)", ex.existingOffices ?? ""], k: "input" },
    gap(),
    { c: ["Collaboration spaces today", "Count"], k: "section" },
    ...COLLAB_CATALOG.map((c): R => ({ c: [c.label, ex.existingCollab?.[c.id] ?? ""], k: "input" })),
    gap(),
    { c: ["Support spaces today", "Count"], k: "section" },
    ...SUPPORT_CATALOG.map((c): R => ({ c: [c.label, ex.existingSupport?.[c.id] ?? ""], k: "input" })),
  ], [38, 14]), "Existing")

  XLSX.utils.book_append_sheet(wb, sheet([
    title("Spaces"),
    { c: ["Collaboration space", "Wanted? (X)", "Setup (built-in / floating)", "Monitor (large / small / none)", "Notes"], k: "header" },
    ...COLLAB_CATALOG.map((c): R => {
      const on = result.spaces.collaboration.some((x) => x.type === c.id)
      const cfg = result.spaces.collabConfig?.[c.id]
      return { c: [c.label, on ? "X" : "", cfg?.build ?? "", cfg?.monitor ?? "", cfg?.notes ?? ""], k: "input" }
    }),
    gap(),
    { c: ["Support space", "Must-have? (X)"], k: "section" },
    ...SUPPORT_CATALOG.map((c): R => ({ c: [c.label, result.spaces.support.includes(c.id) ? "X" : ""], k: "input" })),
    { c: ["(add any others below)"], k: "note" },
    ...Array.from({ length: 4 }, (): R => ({ c: ["", ""], k: "input" })),
  ], [30, 12, 24, 26, 30]), "Spaces")

  XLSX.utils.book_append_sheet(wb, sheet([
    title("In your words"),
    { c: ["Question", "Your answer"], k: "header" },
    { c: ["What's working well today?", result.qualitative.loves ?? ""], k: "input" },
    { c: ["What are the pain points?", result.qualitative.painPoints ?? ""], k: "input" },
    { c: ["What feels over- or under-used?", result.qualitative.imbalances ?? ""], k: "input" },
    { c: ["Which teams should sit near each other?", result.work.adjacencyNotes ?? ""], k: "input" },
    { c: ["Offices on the glass, interior, or a mix?", result.spaces.officePlacement ?? ""], k: "input" },
  ], [38, 64]), "In your words")

  return wb
}

const slug = (s: string) => (s || "client").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
