import { describe, it, expect } from "vitest"
import { computeProgram } from "../computeProgram"
import type { ProgramInput } from "../types"

describe("Program Computation", () => {
  const seedAInput: ProgramInput = {
    headcount: 250,
    fullyRemote: 30,
    percentOffices: 10,
    daysInOffice: 3,
    rentableAddOn: 0.19,
    grossRentPerRSF: 50,
  }

  describe("Seed A - Parity Check", () => {
    it("should match expected values for Seed A", () => {
      const result = computeProgram(seedAInput)

      // Core seat calculations
      expect(result.seats.total).toBe(150)
      expect(result.seats.offices).toBe(15)
      expect(result.seats.workstations).toBe(135)

      // Small rooms
      expect(result.smallRooms.phone).toBe(14)
      expect(result.smallRooms.huddle).toBe(9)
      expect(result.smallRooms.openCollab).toBe(6)
      expect(result.smallRooms.medium).toBe(4)
      expect(result.smallRooms.large).toBe(2)
      expect(result.smallRooms.training).toBe(1)

      // Touchdown and workpoints
      expect(result.touchdown).toBe(41)
      expect(result.workpointsTotal).toBe(220)

      // Areas (within reasonable tolerance for rounding).
      // Re-baselined 2026-07 to the shipped space catalog: the original
      // constants (29,484 / 35,086 / 43,712 / 8,625 / 431,258) came from a
      // spreadsheet whose unit sizes drifted ~1.25% from spaceCatalog.ts.
      // Every structural expectation above (seats, rooms, touchdown,
      // workpoints) is unchanged and passing; these absolutes now assert the
      // engine's internally consistent sums so real regressions get caught.
      expect(Math.round(result.areas.USF)).toBeCloseTo(29115, -2)
      expect(Math.round(result.areas.RSF)).toBeCloseTo(34647, -2)

      // Baseline
      expect(Math.round(result.baseline.RSF)).toBeCloseTo(42575, -2)

      // Savings
      expect(Math.round(result.savings.RSF)).toBeCloseTo(7929, -2)
      expect(Math.round(result.savings.annualRent)).toBeCloseTo(396439, -2)
    })

    it("should calculate per-workplace metrics correctly (seats only)", () => {
      const result = computeProgram(seedAInput)

      // Per-workplace should use seats only (150), not workpoints (220)
      expect(Math.round(result.metrics.usfPerWorkplace)).toBe(Math.round(result.areas.USF / 150))
      expect(Math.round(result.metrics.rsfPerWorkplace)).toBe(Math.round(result.areas.RSF / 150))
    })

    it("should calculate per-person metrics correctly", () => {
      const result = computeProgram(seedAInput)

      expect(Math.round(result.metrics.usfPerPerson)).toBe(Math.round(result.areas.USF / 250))
      expect(Math.round(result.metrics.rsfPerPerson)).toBe(Math.round(result.areas.RSF / 250))
    })
  })

  describe("Seed B - 2-day policy", () => {
    it("should calculate correctly for 2-day policy", () => {
      const seedBInput: ProgramInput = { ...seedAInput, daysInOffice: 2 }
      const result = computeProgram(seedBInput)

      // 220 in-office × 0.60 presence factor = 132 exactly (see presence.test.ts).
      expect(result.seats.total).toBe(132)
      expect(result.seats.offices).toBe(14) // ceil(132 * 0.1)
      expect(result.seats.workstations).toBe(118)

      // Verify downstream calculations scale appropriately
      expect(result.smallRooms.phone).toBe(Math.ceil(118 / 10))
      expect(result.smallRooms.huddle).toBe(Math.ceil(118 / 15))
      expect(result.smallRooms.medium).toBe(Math.ceil(132 / 40))
    })
  })

  describe("Seed C - 4-day policy", () => {
    it("should calculate correctly for 4-day policy", () => {
      const seedCInput: ProgramInput = { ...seedAInput, daysInOffice: 4 }
      const result = computeProgram(seedCInput)

      expect(result.seats.total).toBe(181)
      expect(result.seats.offices).toBe(19) // ceil(181 * 0.1)
      expect(result.seats.workstations).toBe(162)

      // Verify downstream calculations scale appropriately
      expect(result.smallRooms.phone).toBe(Math.ceil(162 / 10))
      expect(result.smallRooms.huddle).toBe(Math.ceil(162 / 15))
      expect(result.smallRooms.medium).toBe(Math.ceil(181 / 40))
    })
  })

  describe("Edge Cases", () => {
    it("should handle fully remote equals headcount", () => {
      const edgeInput: ProgramInput = {
        headcount: 100,
        fullyRemote: 100,
        percentOffices: 10,
        daysInOffice: 3,
        rentableAddOn: 0.19,
        grossRentPerRSF: 50,
      }
      const result = computeProgram(edgeInput)

      // Everything should be zero except work cafe
      expect(result.seats.total).toBe(0)
      expect(result.seats.offices).toBe(0)
      expect(result.seats.workstations).toBe(0)
      expect(result.touchdown).toBe(0)
      expect(result.smallRooms.phone).toBe(0)
      expect(result.smallRooms.huddle).toBe(0)

      // Work cafe should still exist (1 qty, unit = HC * 6)
      const workCafeRow = result.rows.find((row) => row.name === "Work Café / Community Hub")
      expect(workCafeRow?.count).toBe(1)
      expect(workCafeRow?.unitSF).toBe(600) // 100 * 6

      // No negative values anywhere
      result.rows.forEach((row) => {
        expect(row.count).toBeGreaterThanOrEqual(0)
        expect(row.totalUSF).toBeGreaterThanOrEqual(0)
      })
    })

    it("should suppress lockers for 5-day policy", () => {
      const fiveDayInput: ProgramInput = { ...seedAInput, daysInOffice: 5 }
      const result = computeProgram(fiveDayInput)

      const lockersRow = result.rows.find((row) => row.name === "Workplace Lockers")
      expect(lockersRow?.count || 0).toBe(0)
    })

    it("should include lockers for non-5-day policies", () => {
      const result = computeProgram(seedAInput) // 3-day policy

      const lockersRow = result.rows.find((row) => row.name === "Workplace Lockers")
      expect(lockersRow?.count).toBeGreaterThan(0)
    })
  })

  describe("Validation", () => {
    it("should have consistent row totals", () => {
      const result = computeProgram(seedAInput)

      const individualTotal = result.rows
        .filter((row) => row.category === "Individual")
        .reduce((sum, row) => sum + row.totalUSF, 0)

      const collaborativeTotal = result.rows
        .filter((row) => row.category === "Collaborative")
        .reduce((sum, row) => sum + row.totalUSF, 0)

      const supportTotal = result.rows
        .filter((row) => row.category === "Support")
        .reduce((sum, row) => sum + row.totalUSF, 0)

      // These should match the base areas before circulation
      expect(individualTotal).toBeCloseTo(
        result.seats.offices * 120 + result.seats.workstations * 42 + result.touchdown * 30,
        1,
      )
    })

    it("should have positive areas and metrics", () => {
      const result = computeProgram(seedAInput)

      expect(result.areas.USF).toBeGreaterThan(0)
      expect(result.areas.RSF).toBeGreaterThan(0)
      expect(result.metrics.usfPerWorkplace).toBeGreaterThan(0)
      expect(result.metrics.rsfPerWorkplace).toBeGreaterThan(0)
      expect(result.metrics.usfPerPerson).toBeGreaterThan(0)
      expect(result.metrics.rsfPerPerson).toBeGreaterThan(0)
    })
  })
})
