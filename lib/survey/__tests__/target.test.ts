import { describe, it, expect } from "vitest"
import { emptyState, emptyLanes, buildSurveyResult, surveyStateFromResult } from "../sections"

describe("the target — their number, round-tripped", () => {
  it("survives buildSurveyResult and back", () => {
    const s = emptyState()
    s.totalHeadcount = 40
    s.targetSF = 12000
    s.targetSource = "lease"
    const r = buildSurveyResult(s, emptyLanes(), new Set(), { clientName: "Acme", completedBy: "Dana" })
    expect(r.goals?.targetSF).toBe(12000)
    expect(r.goals?.targetSource).toBe("lease")

    const back = surveyStateFromResult(r)
    expect(back.targetSF).toBe(12000)
    expect(back.targetSource).toBe("lease")
  })

  it("is absent when never answered (optional and light)", () => {
    const s = emptyState()
    s.totalHeadcount = 40
    const r = buildSurveyResult(s, emptyLanes(), new Set(), { clientName: "Acme", completedBy: "Dana" })
    expect(r.goals?.targetSF).toBeUndefined()
  })

  it("a source without an SF stays out of the contract", () => {
    const s = emptyState()
    s.totalHeadcount = 40
    s.targetSource = "budget" // picked a chip, never typed a number
    const r = buildSurveyResult(s, emptyLanes(), new Set(), { clientName: "Acme", completedBy: "Dana" })
    expect(r.goals?.targetSF).toBeUndefined()
    expect(r.goals?.targetSource).toBeUndefined()
  })
})
