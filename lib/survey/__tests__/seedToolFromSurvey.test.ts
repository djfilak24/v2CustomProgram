import { describe, it, expect } from "vitest"
import { seedToolFromSurvey, deptFutureHeadcount } from "../seedToolFromSurvey"
import type { SurveyResult } from "../types"

function baseSurvey(overrides: Partial<SurveyResult> = {}): SurveyResult {
  return {
    meta: { clientName: "Acme", completedBy: "Dana", completedAt: "2026-06-25T00:00:00Z" },
    people: {
      departments: [
        { id: "eng", name: "Engineering", headcount: 28, futureHeadcount: 40 },
        { id: "mkt", name: "Marketing", headcount: 12, futureHeadcount: 8 }, // shrinking
        { id: "hr", name: "HR", headcount: 6 }, // flat
      ],
      totalHeadcount: 46,
    },
    work: { daysInOffice: 4, fullyRemote: 2 },
    spaces: {
      privateOfficesByDept: { eng: 2, mkt: 1 },
      collaboration: [
        { type: "Huddle Room", byDept: { eng: 2, mkt: 1 } },
        { type: "Project Room", byDept: { eng: 1 } },
      ],
      support: ["Kitchenette / Pantry", "Mothers / Wellness Room"],
    },
    qualitative: { loves: "The light", painPoints: "Too few meeting rooms" },
    special: { security: "Badge access on 4th floor" },
    deferred: ["section5.wishlist"],
    ...overrides,
  }
}

describe("seedToolFromSurvey", () => {
  it("maps departments with derived office/workstation/hybrid counts", () => {
    const out = seedToolFromSurvey(baseSurvey())
    const eng = out.departments.find((d) => d.id === "eng")!
    expect(eng.headcount).toBe(28)
    expect(eng.officeCount).toBe(2) // from privateOfficesByDept
    expect(eng.workstations).toBe(26) // 28 - 2 offices
    expect(eng.hybridWorkers).toBe(Math.round(28 * (1 - 4 / 5))) // 6
    const hr = out.departments.find((d) => d.id === "hr")!
    expect(hr.officeCount).toBe(0) // no private offices flagged
    expect(hr.workstations).toBe(6)
  })

  it("honors dedicated-desk answers on the department cards (survey > formula)", () => {
    const out = seedToolFromSurvey(baseSurvey({
      work: { daysInOffice: 4, fullyRemote: 2, dedicatedByDept: { eng: 18, hr: 6 } },
    }))
    const eng = out.departments.find((d) => d.id === "eng")!
    // The client said 18 people keep a dedicated desk — the card says 18,
    // not the headcount-minus-offices formula (26).
    expect(eng.workstations).toBe(18)
    // Everyone else (28 − 2 offices − 18 dedicated) shares flex seats.
    expect(eng.hybridWorkers).toBe(8)
    const hr = out.departments.find((d) => d.id === "hr")!
    expect(hr.workstations).toBe(6)
    expect(hr.hybridWorkers).toBe(0) // fully dedicated team → no flex
    // Marketing gave no dedicated answer → formula fallback unchanged.
    const mkt = out.departments.find((d) => d.id === "mkt")!
    expect(mkt.workstations).toBe(11) // 12 − 1 office
  })

  it("caps dedicated desks at available seats (headcount − offices)", () => {
    const out = seedToolFromSurvey(baseSurvey({
      work: { daysInOffice: 4, fullyRemote: 2, dedicatedByDept: { mkt: 99 } },
    }))
    const mkt = out.departments.find((d) => d.id === "mkt")!
    expect(mkt.workstations).toBe(11) // capped at 12 − 1 office
    expect(mkt.hybridWorkers).toBe(0)
  })

  it("derives totals and percentOffices from the department spine", () => {
    const out = seedToolFromSurvey(baseSurvey())
    expect(out.inputs.totalHeadcount).toBe(46) // 28+12+6
    expect(out.inputs.fullyRemote).toBe(2)
    expect(out.inputs.daysInOffice).toBe(4)
    expect(out.inputs.percentOffices).toBe(Math.round((3 / 46) * 100)) // 3 offices / 46
  })

  it("treats growth as first-class: per-dept grow AND shrink", () => {
    const out = seedToolFromSurvey(baseSurvey())
    expect(out.planForGrowth).toBe(true)
    expect(out.departments.find((d) => d.id === "eng")!.futureHeadcount).toBe(40) // grow
    expect(out.departments.find((d) => d.id === "mkt")!.futureHeadcount).toBe(8) // shrink
    // HR is flat → no futureHeadcount set, but counted at current in planning HC.
    expect(out.departments.find((d) => d.id === "hr")!.futureHeadcount).toBeUndefined()
    expect(out.planningHeadcount).toBe(40 + 8 + 6) // 54 = fit-planning headcount
  })

  it("applies company growth % to departments without explicit future HC", () => {
    const survey = baseSurvey({
      people: {
        departments: [
          { id: "a", name: "A", headcount: 100 },
          { id: "b", name: "B", headcount: 50, futureHeadcount: 50 }, // explicit flat
        ],
        totalHeadcount: 150,
        companyGrowthPct: 10,
      },
    })
    const out = seedToolFromSurvey(survey)
    expect(out.departments.find((d) => d.id === "a")!.futureHeadcount).toBe(110) // 100 * 1.10
    // explicit future equals current → not flagged as growth for that dept
    expect(out.departments.find((d) => d.id === "b")!.futureHeadcount).toBeUndefined()
    expect(out.planningHeadcount).toBe(110 + 50)
  })

  it("emits private-office, collaboration, and support seed spaces with allocations", () => {
    const out = seedToolFromSurvey(baseSurvey())
    const offices = out.spaces.find((s) => s.presetName === "Private Office")!
    expect(offices.workstationType).toBe("private")
    expect(offices.quantity).toBe(3) // 2 eng + 1 mkt
    expect(offices.departmentAllocations).toEqual([
      { departmentId: "eng", count: 2 },
      { departmentId: "mkt", count: 1 },
    ])

    const huddle = out.spaces.find((s) => s.presetName === "Huddle Room")!
    expect(huddle.quantity).toBe(3)
    expect(huddle.departmentAllocations).toContainEqual({ departmentId: "mkt", count: 1 })

    const pantry = out.spaces.find((s) => s.presetName === "Kitchenette / Pantry")!
    expect(pantry.quantity).toBe(1)
    expect(pantry.departmentAllocations).toEqual([])
  })

  it("assembles narrative + deferred into handoff notes (no calc dependency)", () => {
    const out = seedToolFromSurvey(baseSurvey())
    expect(out.notes).toContain("What's working")
    expect(out.notes).toContain("The light")
    expect(out.notes).toContain("Pain points")
    expect(out.notes).toContain("Security / compliance")
    expect(out.notes).toContain("Deferred to live session (1)")
    expect(out.deferred).toEqual(["section5.wishlist"])
  })

  it("handles the Quick lane (no departments) with company growth", () => {
    const survey = baseSurvey({
      people: { departments: [], totalHeadcount: 200, companyGrowthPct: 15 },
      spaces: { privateOfficesByDept: {}, collaboration: [], support: [] },
    })
    const out = seedToolFromSurvey(survey)
    expect(out.inputs.totalHeadcount).toBe(200)
    expect(out.inputs.percentOffices).toBe(0)
    expect(out.departments).toHaveLength(0)
    expect(out.spaces).toHaveLength(0)
    expect(out.planningHeadcount).toBe(230) // 200 * 1.15
  })

  it("deptFutureHeadcount precedence: explicit > company growth > flat", () => {
    expect(deptFutureHeadcount(100, 120, 10)).toBe(120) // explicit wins
    expect(deptFutureHeadcount(100, undefined, 10)).toBe(110) // company growth
    expect(deptFutureHeadcount(100, undefined, undefined)).toBe(100) // flat
  })
})
