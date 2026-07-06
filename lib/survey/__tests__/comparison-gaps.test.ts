import { describe, it, expect } from "vitest"
import { buildComparison, lineGaps, spaceStrategy } from "../comparison"
import type { SurveyResult } from "../types"

function survey(overrides: Partial<SurveyResult> = {}): SurveyResult {
  return {
    meta: { clientName: "Acme", completedBy: "D", completedAt: "2026-06-25T00:00:00Z" },
    people: { departments: [{ id: "a", name: "A", headcount: 40, futureHeadcount: 40 }], totalHeadcount: 40 },
    work: { daysInOffice: 3, fullyRemote: 0 },
    spaces: { privateOfficesByDept: {}, collaboration: [], support: [] },
    qualitative: {}, special: {}, deferred: [],
    ...overrides,
  }
}

describe("lineGaps", () => {
  it("flags unknown existing size when a count is given without a size", () => {
    // Offices: count captured (4) but no officeSF → unknown-size gap.
    const comp = buildComparison(survey({
      existing: { existingOffices: 4 }, // no officeSF
      spaces: { privateOfficesByDept: { a: 4 }, collaboration: [], support: [] },
    }))
    const off = comp.lines.find((l) => l.key === "offices")!
    expect(off.existingCountKnown).toBe(true)
    expect(off.existingSizeKnown).toBe(false)
    expect(lineGaps(off).some((g) => g.kind === "unknown-size")).toBe(true)
  })

  it("flags no-baseline when a proposed space has no existing count captured", () => {
    const comp = buildComparison(survey())
    const ws = comp.lines.find((l) => l.key === "workstations")!
    expect(ws.existingCountKnown).toBe(false)
    expect(ws.proposedCount).toBeGreaterThan(0)
    expect(lineGaps(ws).some((g) => g.kind === "no-baseline")).toBe(true)
  })

  it("no gaps when both count and size are known", () => {
    const comp = buildComparison(survey({
      existing: { existingOffices: 4, officeSF: 144, existingWorkstations: 30, workstationSF: 48 },
      spaces: { privateOfficesByDept: { a: 4 }, collaboration: [], support: [] },
    }))
    const off = comp.lines.find((l) => l.key === "offices")!
    expect(lineGaps(off)).toHaveLength(0)
  })
})

describe("spaceStrategy", () => {
  it("flags a pull-apart when the client wants to optimize but ratios grow", () => {
    const s = spaceStrategy(10000, 14000, { motivators: ["optimize"], posture: "optimize" })
    expect(s.direction).toBe("grow")
    expect(s.headline).toMatch(/pull apart/i)
  })
  it("reads as aligned when expand posture meets more space", () => {
    const s = spaceStrategy(10000, 13000, { motivators: ["growth"], posture: "expand" })
    expect(s.direction).toBe("grow")
    expect(s.headline).toMatch(/aligned/i)
  })
  it("handles no goal posture", () => {
    const s = spaceStrategy(10000, 10000, undefined)
    expect(s.posture).toBe("unset")
    expect(s.direction).toBe("flat")
  })
})
