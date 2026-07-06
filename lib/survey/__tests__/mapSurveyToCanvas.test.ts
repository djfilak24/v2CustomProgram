import { describe, it, expect } from "vitest"
import { mapSurveyToCanvas } from "../mapSurveyToCanvas"
import type { SurveyResult } from "../types"

function survey(overrides: Partial<SurveyResult> = {}): SurveyResult {
  return {
    meta: { clientName: "Acme", completedBy: "Dana", completedAt: "2026-06-25T00:00:00Z" },
    people: {
      departments: [
        { id: "eng", name: "Engineering", headcount: 40, futureHeadcount: 55, employees: [{ id: "e1", name: "Ada" }, { id: "e2", name: "Linus" }] },
        { id: "ops", name: "Operations", headcount: 20, futureHeadcount: 20 },
      ],
      totalHeadcount: 60,
    },
    work: { daysInOffice: 3, fullyRemote: 4, dedicatedByDept: { eng: 30, ops: 10 } },
    spaces: {
      privateOfficesByDept: { ops: 3 },
      collaboration: [{ type: "Huddle Room / Flex", byDept: {} }],
      collabConfig: { "Huddle Room / Flex": { build: "built", monitor: "large", notes: "dual screens" } },
      support: ["Reception", "Podcast Studio"],
    },
    qualitative: { loves: "The café", painPoints: "No focus rooms" },
    special: {},
    existing: {
      furniture: "mixed", workstationSF: 42, officeSF: 144,
      existingWorkstations: 50, existingOffices: 4,
      existingCollab: { "Huddle Room / Flex": 3 },
      existingSupport: { Reception: 1 },
    },
    deferred: ["adjacency"],
    ...overrides,
  }
}

describe("mapSurveyToCanvas", () => {
  it("carries departments with their roster", () => {
    const out = mapSurveyToCanvas(survey())
    const eng = out.departments.find((d) => d.id === "eng")!
    expect(eng.employees?.map((e) => e.name)).toEqual(["Ada", "Linus"])
    expect(eng.futureHeadcount).toBe(55)
    expect(eng.color).toMatch(/^bg-/)
  })

  it("overlays dedicated-desk and office allocations onto the right spaces", () => {
    const out = mapSurveyToCanvas(survey())
    const ws = Object.values(out.spaces).find((s) => s.workstationType === "employee")
    expect(ws?.departmentAllocations).toEqual(expect.arrayContaining([
      { departmentId: "eng", count: 30 }, { departmentId: "ops", count: 10 },
    ]))
    const off = Object.values(out.spaces).find((s) => s.workstationType === "private")
    expect(off?.departmentAllocations).toEqual([{ departmentId: "ops", count: 3 }])
  })

  it("baselines workstation/office SF from existing sizes", () => {
    const out = mapSurveyToCanvas(survey())
    const ws = Object.values(out.spaces).find((s) => s.workstationType === "employee")!
    expect(ws.sfEach).toBe(42)
    expect(ws.totalArea).toBe(ws.quantity * 42)
    const off = Object.values(out.spaces).find((s) => s.workstationType === "private")!
    expect(off.sfEach).toBe(144)
  })

  it("writes collaboration room config into notes", () => {
    const out = mapSurveyToCanvas(survey())
    const huddle = Object.values(out.spaces).find((s) => s.name === "Huddle Room / Flex")
    expect(huddle?.notes).toContain("Setup: built")
    expect(huddle?.notes).toContain("Monitor: large")
    expect(huddle?.notes).toContain("dual screens")
  })

  it("adds custom / unlisted support spaces the engine didn't generate", () => {
    const out = mapSurveyToCanvas(survey())
    const custom = Object.values(out.spaces).find((s) => s.name === "Podcast Studio")
    expect(custom).toBeTruthy()
    expect(custom?.zone).toBe("Support")
    expect(custom?.isActive).toBe(true)
  })

  it("builds an independent existing-conditions baseline", () => {
    const out = mapSurveyToCanvas(survey())
    expect(out.existing.workstations).toEqual({ count: 50, sfEach: 42 })
    expect(out.existing.offices).toEqual({ count: 4, sfEach: 144 })
    expect(out.existing.collab).toContainEqual({ name: "Huddle Room / Flex", count: 3, sfEach: 140 })
    expect(out.existing.support).toContainEqual({ name: "Reception", count: 1, sfEach: 250 })
    // total = 50*42 (ws) + 4*144 (off) + 3*140 (huddle) + 1*250 (reception)
    expect(out.existing.totalSF).toBe(50 * 42 + 4 * 144 + 3 * 140 + 1 * 250)
  })

  it("assembles handoff notes from qualitative + deferred", () => {
    const out = mapSurveyToCanvas(survey())
    expect(out.notes).toContain("What's working: The café")
    expect(out.notes).toContain("Pain points: No focus rooms")
    expect(out.notes).toContain("Deferred to live session (1)")
    expect(out.planForGrowth).toBe(true)
  })
})
