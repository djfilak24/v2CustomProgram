import { describe, it, expect } from "vitest"
import * as XLSX from "xlsx"
import { buildIntakeWorkbook } from "../excelExport"
import { importIntakeWorkbook } from "../workbookImport"
import { demoResult } from "../demo-scenarios"

/** Export → import round-trip: the workbook we generate must parse back losslessly. */
function roundTrip(key: string) {
  const original = demoResult(key)!
  const wb = buildIntakeWorkbook(original)
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
  return { original, imported: importIntakeWorkbook(buf) }
}

describe("workbook round-trip (Door 3)", () => {
  it("carries company, people, and growth", () => {
    const { original, imported } = roundTrip("law")
    expect(imported.meta.clientName).toBe(original.meta.clientName)
    expect(imported.people.totalHeadcount).toBe(original.people.totalHeadcount)
    expect(imported.people.departments.map((d) => d.name)).toEqual(original.people.departments.map((d) => d.name))
    expect(imported.people.departments.map((d) => d.headcount)).toEqual(original.people.departments.map((d) => d.headcount))
    expect(imported.people.companyGrowthPct).toBe(original.people.companyGrowthPct)
  })

  it("carries seats: offices, dedicated desks, cadence, remote", () => {
    const { original, imported } = roundTrip("law")
    // Ids are regenerated on import — compare by department name.
    const byName = (r: typeof imported, m: Record<string, number>) =>
      Object.fromEntries(Object.entries(m).map(([id, n]) => [r.people.departments.find((d) => d.id === id)?.name, n]))
    expect(byName(imported, imported.spaces.privateOfficesByDept)).toEqual(byName(original as any, original.spaces.privateOfficesByDept))
    expect(byName(imported, imported.work.dedicatedByDept ?? {})).toEqual(byName(original as any, original.work.dedicatedByDept ?? {}))
    expect(imported.work.daysInOffice).toBe(original.work.daysInOffice)
    expect(imported.work.fullyRemote).toBe(original.work.fullyRemote)
  })

  it("carries the roster with leaders flagged", () => {
    const { original, imported } = roundTrip("law")
    const origNames = original.people.departments.flatMap((d) => d.employees ?? [])
    const impNames = imported.people.departments.flatMap((d) => d.employees ?? [])
    expect(impNames.map((e) => e.name)).toEqual(origNames.map((e) => e.name))
    expect(impNames.map((e) => !!e.isLeader)).toEqual(origNames.map((e) => !!e.isLeader))
  })

  it("carries goals, posture, placement, and narrative", () => {
    const { original, imported } = roundTrip("law")
    expect(imported.goals?.motivators.sort()).toEqual(original.goals?.motivators.sort())
    expect(imported.goals?.posture).toBe(original.goals?.posture)
    expect(imported.spaces.officePlacement).toBe(original.spaces.officePlacement)
    expect(imported.qualitative.painPoints).toBe(original.qualitative.painPoints)
  })

  it("carries wanted spaces + existing conditions", () => {
    const { original, imported } = roundTrip("law")
    expect(imported.spaces.collaboration.map((c) => c.type).sort())
      .toEqual(original.spaces.collaboration.map((c) => c.type).sort())
    expect(imported.spaces.support.sort()).toEqual(original.spaces.support.sort())
    expect(imported.existing?.officeSF).toBe(original.existing?.officeSF)
    expect(imported.existing?.existingOffices).toBe(original.existing?.existingOffices)
    expect(imported.existing?.existingCollab).toEqual(original.existing?.existingCollab)
    expect(imported.existing?.furniture).toBe(original.existing?.furniture)
  })

  it("a hand-edit survives: bump a headcount and mark a new goal", () => {
    const original = demoResult("law")!
    const wb = buildIntakeWorkbook(original)
    // Simulate the client editing the returned file.
    const dept = XLSX.utils.sheet_to_json(wb.Sheets["Departments"], { header: 1 }) as any[][]
    const partners = dept.find((r) => String(r?.[0]) === "Partners")!
    partners[1] = 99 // Partners headcount → 99
    wb.Sheets["Departments"] = XLSX.utils.aoa_to_sheet(dept)
    const comp = XLSX.utils.sheet_to_json(wb.Sheets["Company & Goals"], { header: 1 }) as any[][]
    const row = comp.find((r) => String(r?.[0]) === "Higher density")!
    row[1] = "X"
    wb.Sheets["Company & Goals"] = XLSX.utils.aoa_to_sheet(comp)

    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
    const imported = importIntakeWorkbook(buf)
    expect(imported.people.departments.find((d) => d.name === "Partners")?.headcount).toBe(99)
    expect(imported.goals?.motivators).toContain("density")
  })
})
