/**
 * The Fit-Planning Package — the Studio's handoff. One Excel with everything
 * NELSON's fit-planning team needs to test the validated program on real floor
 * plates: the sized program (with circulation and load factor), department
 * headcounts + seat allocations, ranked adjacencies, existing conditions and
 * the size-mix inventory, and the client's own words.
 */
import * as XLSX from "xlsx-js-style"
import type { SurveyResult } from "./types"
import type { Deliverable } from "./deliverable"

const NAVY = "0E1A2E"
const CYAN_DARK = "0089A3"

type Cell = XLSX.CellObject

const title = (v: string): Cell => ({
  t: "s", v,
  s: { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: NAVY } }, alignment: { vertical: "center" } },
})
const header = (v: string): Cell => ({
  t: "s", v,
  s: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "475569" } } },
})
const section = (v: string): Cell => ({
  t: "s", v,
  s: { font: { bold: true, sz: 10, color: { rgb: CYAN_DARK } } },
})
const bold = (v: string | number): Cell =>
  typeof v === "number" ? { t: "n", v, s: { font: { bold: true } } } : { t: "s", v, s: { font: { bold: true } } }
const cell = (v: string | number | undefined | null): Cell =>
  typeof v === "number" ? { t: "n", v } : { t: "s", v: v ?? "" }

function sheet(rows: Cell[][], widths: number[]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(rows as unknown as (string | number)[][])
  ws["!cols"] = widths.map((wch) => ({ wch }))
  return ws
}

export function buildFitPlanningWorkbook(result: SurveyResult, d: Deliverable): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const deptName = (id: string) => result.people.departments.find((x) => x.id === id)?.name ?? id

  // ── Program ────────────────────────────────────────────────────────────────
  const prog: Cell[][] = [
    [title(`Fit-Planning Package — ${d.clientName}`)],
    [cell(`Planning headcount ${d.future} · generated ${new Date().toLocaleDateString()} · NELSON Workplace Strategy`)],
    [],
    [header("Category"), header("Space"), header("Planning ratio"), header("Qty"), header("Unit SF"), header("Total SF")],
  ]
  for (const c of d.categories) {
    const visible = c.lines.filter((l) => l.proposedCount > 0 || l.existingCount > 0)
    if (!visible.length) continue
    prog.push([section(c.name)])
    for (const l of visible) {
      prog.push([cell(""), cell(l.label), cell(l.ratio ?? ""), cell(l.proposedCount), cell(l.unitSF), cell(l.proposedCount * l.unitSF)])
    }
    prog.push([cell(""), cell(`${c.name} circulation`), cell(""), cell(""), cell(""), cell(c.circulationSF)])
  }
  prog.push(
    [],
    [bold("Gross usable SF"), cell(""), cell(""), cell(""), cell(""), bold(d.totals.grossUsableSF)],
    [cell(`Rentable add-on (load factor ×${(1 + d.totals.rentableFactor).toFixed(2)})`), cell(""), cell(""), cell(""), cell(""), cell(d.totals.rentableAddOnSF)],
    [bold("Estimated rentable SF"), cell(""), cell(""), cell(""), cell(""), bold(d.totals.estimatedRentableSF)],
    [bold("SF / person"), cell(""), cell(""), cell(""), cell(""), bold(d.totals.sfPerPerson)],
  )
  XLSX.utils.book_append_sheet(wb, sheet(prog, [22, 34, 26, 8, 10, 12]), "Program")

  // ── Departments ────────────────────────────────────────────────────────────
  const deptRows: Cell[][] = [
    [title("Departments & seat allocations")],
    [],
    [header("Department"), header("Headcount today"), header("3–5 yr"), header("Private offices"), header("Dedicated desks")],
    ...result.people.departments.map((dep) => [
      cell(dep.name),
      cell(dep.headcount),
      cell(dep.futureHeadcount ?? dep.headcount),
      cell(result.spaces.privateOfficesByDept[dep.id] ?? 0),
      cell(result.work.dedicatedByDept?.[dep.id] ?? 0),
    ]),
  ]
  XLSX.utils.book_append_sheet(wb, sheet(deptRows, [28, 16, 10, 16, 16]), "Departments")

  // ── Adjacencies ────────────────────────────────────────────────────────────
  const adjRows: Cell[][] = [
    [title("Adjacencies — ranked, most important first")],
    [],
    [header("Rank"), header("Departments")],
    ...(result.work.adjacencyPairs ?? []).map((p, i) => [cell(i + 1), cell(`${deptName(p.a)} ↔ ${deptName(p.b)}`)]),
  ]
  if (result.work.adjacencyNotes) adjRows.push([], [section("Notes")], [cell(result.work.adjacencyNotes)])
  XLSX.utils.book_append_sheet(wb, sheet(adjRows, [8, 44]), "Adjacencies")

  // ── Existing & size mix ────────────────────────────────────────────────────
  const ex = result.existing ?? {}
  const exRows: Cell[][] = [
    [title("Existing conditions & size-mix inventory")],
    [],
    [header("Item"), header("Value")],
    [cell("Furniture posture"), cell(ex.furniture ?? "—")],
    [cell("Workstations today"), cell(ex.existingWorkstations ?? "—")],
    [cell("Private offices today"), cell(ex.existingOffices ?? "—")],
    [cell("Standard workstation SF"), cell(ex.workstationSF ?? "—")],
    [cell("Standard office SF"), cell(ex.officeSF ?? "—")],
    [cell("Re-using conference tables"), cell(ex.reuseConfTables === undefined ? "—" : ex.reuseConfTables ? "Yes" : "No")],
  ]
  const mix = (label: string, rows?: { sf: number; count: number; note?: string }[]) => {
    if (!rows?.length) return
    exRows.push([], [section(label)], [header("SF"), header("Count"), header("Where / note")])
    for (const m of rows) exRows.push([cell(m.sf), cell(m.count), cell(m.note ?? "")])
  }
  mix("Workstation sizes in place today", ex.workstationMix)
  mix("Office sizes in place today", ex.officeMix)
  const inv = (label: string, rec?: Record<string, number>) => {
    const entries = Object.entries(rec ?? {}).filter(([, v]) => v > 0)
    if (!entries.length) return
    exRows.push([], [section(label)], [header("Space"), header("Count today")])
    for (const [k, v] of entries) exRows.push([cell(k), cell(v)])
  }
  inv("Collaboration in place today", ex.existingCollab)
  inv("Support in place today", ex.existingSupport)
  XLSX.utils.book_append_sheet(wb, sheet(exRows, [34, 12, 30]), "Existing")

  // ── Notes ──────────────────────────────────────────────────────────────────
  const q = result.qualitative
  const sp = result.special
  const noteRows: Cell[][] = [
    [title("In the client's words")],
    [],
    ...([
      ["What's working", q.loves], ["Pain points", q.painPoints], ["Imbalances", q.imbalances],
      ["Equipment", sp.equipment], ["Security", sp.security], ["Storage", sp.storage], ["Wishlist", sp.wishlist],
      ["Office placement", result.spaces.officePlacement],
    ] as const)
      .filter(([, v]) => !!v)
      .flatMap(([k, v]) => [[section(k)], [cell(v as string)], []]),
  ]
  XLSX.utils.book_append_sheet(wb, sheet(noteRows.length > 2 ? noteRows : [...noteRows, [cell("(none captured)")]], [80]), "Notes")

  return wb
}

export function exportFitPlanningPackage(result: SurveyResult, d: Deliverable): void {
  const wb = buildFitPlanningWorkbook(result, d)
  const name = (d.clientName || "client").replace(/[^\w]+/g, "-")
  XLSX.writeFile(wb, `NELSON-fit-planning-${name}.xlsx`)
}
