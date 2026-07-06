import { describe, it, expect } from "vitest"
import {
  emptyState, emptyLanes, makeEmployee, assignSeatHierarchy, deptAllocated,
  buildSurveyResult, type SurveyState,
} from "../sections"
import { demoState } from "../demo-scenarios"

function roster(n: number) {
  return Array.from({ length: n }, (_, i) => makeEmployee(`P${i}`))
}

function stateWith(overrides: Partial<SurveyState>): SurveyState {
  return { ...emptyState(), ...overrides }
}

describe("assignSeatHierarchy", () => {
  it("gives offices to the first names (leaders) and desks to the next — never both", () => {
    const emps = roster(10)
    const s = stateWith({
      departments: [{ id: "eng", name: "Engineering", headcount: 10, employees: emps }],
      officesByDept: { eng: 2 },
      dedicatedByDept: { eng: 5 },
    })
    assignSeatHierarchy(s)
    const officeIds = emps.filter((e) => s.officeByEmployee[e.id]).map((e) => e.id)
    const deskIds = emps.filter((e) => s.deskByEmployee[e.id]).map((e) => e.id)
    expect(officeIds).toEqual([emps[0].id, emps[1].id]) // leaders
    expect(deskIds).toEqual([emps[2].id, emps[3].id, emps[4].id, emps[5].id, emps[6].id])
    // No overlap: a person never holds both a desk and an office.
    expect(officeIds.some((id) => deskIds.includes(id))).toBe(false)
  })

  it("never assigns more seats than the roster has people", () => {
    const emps = roster(3)
    const s = stateWith({
      departments: [{ id: "x", name: "X", headcount: 3, employees: emps }],
      officesByDept: { x: 2 },
      dedicatedByDept: { x: 10 },
    })
    assignSeatHierarchy(s)
    const office = emps.filter((e) => s.officeByEmployee[e.id]).length
    const desk = emps.filter((e) => s.deskByEmployee[e.id]).length
    expect(office).toBe(2)
    expect(desk).toBe(1) // only 1 person left after 2 offices
    expect(office + desk).toBeLessThanOrEqual(emps.length)
  })
})

describe("XOR carries through buildSurveyResult", () => {
  it("does not double-count a person who holds an office as also having a desk", () => {
    const emps = roster(10)
    const s = stateWith({
      departments: [{ id: "eng", name: "Engineering", headcount: 10, employees: emps }],
      officesByDept: { eng: 2 },
      dedicatedByDept: { eng: 5 },
    })
    assignSeatHierarchy(s)
    // Deliberately corrupt: mark a leader as also desk-checked. Offices must win.
    s.deskByEmployee[emps[0].id] = true
    const lanes = emptyLanes()
    const r = buildSurveyResult(s, lanes, new Set(), { clientName: "Acme", completedBy: "Dana" })
    expect(r.spaces.privateOfficesByDept.eng).toBe(2)
    // Full roster → desks = checked minus office-holders = the 5 real desk people,
    // NOT 6 (the corrupt overlap is excluded).
    expect(r.work.dedicatedByDept?.eng).toBe(5)
  })
})

describe("demos seed real hierarchy", () => {
  it("tech demo assigns Engineering leaders to offices and ICs to desks, disjoint", () => {
    const s = demoState("tech")!
    const eng = s.departments.find((d) => d.name === "Engineering")!
    const roster = eng.employees ?? []
    const office = roster.filter((e) => s.officeByEmployee[e.id])
    const desk = roster.filter((e) => s.deskByEmployee[e.id])
    expect(office.length).toBe(4)
    expect(desk.length).toBe(22)
    expect(office.some((e) => s.deskByEmployee[e.id])).toBe(false)
  })
})
