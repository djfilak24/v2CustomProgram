import { describe, it, expect } from "vitest"
import {
  emptyState, emptyLanes, makeEmployee, assignSeatHierarchy, deptAllocated,
  buildSurveyResult, rosterForMode, type SurveyState,
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
    // The office-holders are flagged as leaders; desk-holders are not.
    expect(office.every((e) => e.isLeader)).toBe(true)
    expect(desk.some((e) => e.isLeader)).toBe(false)
  })

  it("law demo (leaders mode) flags every named person as a leader", () => {
    const s = demoState("law")!
    const named = s.departments.flatMap((d) => d.employees ?? [])
    expect(named.length).toBeGreaterThan(0)
    expect(named.every((e) => e.isLeader)).toBe(true)
  })

  it("tech demo (full mode) names everyone but flags only a subset as leaders", () => {
    const eng = demoState("tech")!.departments.find((d) => d.name === "Engineering")!
    const roster = eng.employees ?? []
    const leaders = roster.filter((e) => e.isLeader)
    expect(roster.length).toBe(48)          // everyone named
    expect(leaders.length).toBeGreaterThan(0)
    expect(leaders.length).toBeLessThan(roster.length) // but not everyone leads
    // Offices (4) go to leaders, so every office-holder is a leader.
    expect(leaders.length).toBeGreaterThanOrEqual(4)
  })
})

describe("rosterForMode", () => {
  const withRoster = (): SurveyState => ({
    ...emptyState(),
    departments: [{
      id: "eng", name: "Eng", headcount: 10,
      employees: [
        makeEmployee("Lead A", true), makeEmployee("Lead B", true),
        makeEmployee("IC 1"), makeEmployee("IC 2"), makeEmployee("IC 3"),
      ],
    }],
  })

  it("→ leaders keeps only the flagged leaders named", () => {
    const out = rosterForMode(withRoster().departments, "leaders")
    expect(out[0].employees?.map((e) => e.name)).toEqual(["Lead A", "Lead B"])
    expect(out[0].headcount).toBe(10) // total preserved
  })

  it("→ full keeps everyone and never drops headcount below who's named", () => {
    const depts = withRoster().departments.map((d) => ({ ...d, headcount: 2 }))
    const out = rosterForMode(depts, "full")
    expect(out[0].employees).toHaveLength(5)
    expect(out[0].headcount).toBe(5) // bumped up to the named count
  })
})

describe("per-person seat picks in the contract (C12)", () => {
  it("round-trips the literal picks through SurveyResult", async () => {
    const { buildSurveyResult, surveyStateFromResult } = await import("../sections")
    const s = emptyState()
    s.departments = [
      { id: "d1", name: "Partners", headcount: 3, employees: [makeEmployee("Ada", true), makeEmployee("Ben"), makeEmployee("Cy")] },
    ]
    const [ada, ben, cy] = s.departments[0].employees!
    s.officesByDept = { d1: 1 }
    s.dedicatedByDept = { d1: 1 }
    s.officeByEmployee = { [ada.id]: true }
    s.deskByEmployee = { [ben.id]: true }
    const r = buildSurveyResult(s, emptyLanes(), new Set(), { clientName: "Acme", completedBy: "Dana" })
    expect(r.spaces.officeEmployeeIds).toEqual([ada.id])
    expect(r.work.deskEmployeeIds).toEqual([ben.id])
    expect(r.work.deskEmployeeIds).not.toContain(cy.id)

    const back = surveyStateFromResult(r)
    expect(back.officeByEmployee[ada.id]).toBe(true)
    expect(back.deskByEmployee[ben.id]).toBe(true)
  })

  it("a desk pick shadowed by an office pick never leaks (XOR holds)", async () => {
    const { buildSurveyResult } = await import("../sections")
    const s = emptyState()
    s.departments = [{ id: "d1", name: "Ops", headcount: 1, employees: [makeEmployee("Ada", true)] }]
    const ada = s.departments[0].employees![0]
    s.officeByEmployee = { [ada.id]: true }
    s.deskByEmployee = { [ada.id]: true } // stale double-assignment
    const r = buildSurveyResult(s, emptyLanes(), new Set(), { clientName: "Acme", completedBy: "Dana" })
    expect(r.spaces.officeEmployeeIds).toEqual([ada.id])
    expect(r.work.deskEmployeeIds).toBeUndefined()
  })
})
