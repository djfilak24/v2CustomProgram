import { describe, it, expect } from "vitest"
import { computeTotalSeats, PRESENCE_WEIGHTS, POPULATION_SHARES } from "../presence"

describe("Presence Model", () => {
  it("should have correct presence weights", () => {
    expect(PRESENCE_WEIGHTS.resident).toBe(1.0)
    expect(PRESENCE_WEIGHTS.d3).toBe(0.6)
    expect(PRESENCE_WEIGHTS.d2).toBe(0.4)
    expect(PRESENCE_WEIGHTS.d1).toBe(0.2)
    expect(PRESENCE_WEIGHTS.remote).toBe(0.0)
  })

  it("should have correct population shares for each policy", () => {
    expect(POPULATION_SHARES[2]).toEqual({ resident: 0.25, d3: 0.3, d2: 0.4, d1: 0.05 })
    expect(POPULATION_SHARES[3]).toEqual({ resident: 0.35, d3: 0.4, d2: 0.2, d1: 0.05 })
    expect(POPULATION_SHARES[4]).toEqual({ resident: 0.65, d3: 0.2, d2: 0.1, d1: 0.05 })
    expect(POPULATION_SHARES[5]).toEqual({ resident: 1.0, d3: 0, d2: 0, d1: 0 })
  })

  it("should compute total seats correctly for 3-day policy", () => {
    // Seed A test case
    const totalSeats = computeTotalSeats(250, 30, 3)
    expect(totalSeats).toBe(150)
  })

  it("should compute total seats correctly for 2-day policy", () => {
    // Seed B test case
    const totalSeats = computeTotalSeats(250, 30, 2)
    expect(totalSeats).toBe(131)
  })

  it("should compute total seats correctly for 4-day policy", () => {
    // Seed C test case
    const totalSeats = computeTotalSeats(250, 30, 4)
    expect(totalSeats).toBe(181)
  })

  it("should compute total seats correctly for 5-day policy", () => {
    const totalSeats = computeTotalSeats(250, 30, 5)
    expect(totalSeats).toBe(220)
  })

  it("should handle edge case where fully remote equals headcount", () => {
    const totalSeats = computeTotalSeats(100, 100, 3)
    expect(totalSeats).toBe(0)
  })

  it("should handle edge case where fully remote exceeds headcount", () => {
    const totalSeats = computeTotalSeats(100, 150, 3)
    expect(totalSeats).toBe(0)
  })
})
