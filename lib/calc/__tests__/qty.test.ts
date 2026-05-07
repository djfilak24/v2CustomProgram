import { describe, it, expect } from "vitest"
import {
  roundUp,
  roundNearest,
  roundDown,
  minQty,
  zeroIfBelow,
  threshold01,
  suppressIfDays,
  unitPerHeadcount,
  unitBySeatThresholds,
} from "../qty"

describe("Quantity Helpers", () => {
  describe("rounding functions", () => {
    it("should round up correctly", () => {
      expect(roundUp(13.5)).toBe(14)
      expect(roundUp(13.1)).toBe(14)
      expect(roundUp(13.0)).toBe(13)
    })

    it("should round to nearest correctly", () => {
      expect(roundNearest(13.5)).toBe(14)
      expect(roundNearest(13.4)).toBe(13)
      expect(roundNearest(13.6)).toBe(14)
    })

    it("should round down correctly", () => {
      expect(roundDown(13.9)).toBe(13)
      expect(roundDown(13.1)).toBe(13)
      expect(roundDown(13.0)).toBe(13)
    })
  })

  describe("constraint functions", () => {
    it("should apply minimum quantity", () => {
      expect(minQty(0, 1)).toBe(1)
      expect(minQty(5, 1)).toBe(5)
      expect(minQty(0.5, 2)).toBe(2)
    })

    it("should zero if below threshold", () => {
      expect(zeroIfBelow(100, 250)).toBe(0)
      expect(zeroIfBelow(300, 250)).toBe(300)
      expect(zeroIfBelow(250, 250)).toBe(250)
    })

    it("should return 0 or 1 based on threshold", () => {
      expect(threshold01(50, 60)).toBe(0)
      expect(threshold01(60, 60)).toBe(1)
      expect(threshold01(70, 60)).toBe(1)
    })

    it("should suppress quantity on specific days", () => {
      expect(suppressIfDays(10, 5, 5)).toBe(0)
      expect(suppressIfDays(10, 3, 5)).toBe(10)
      expect(suppressIfDays(10, 4, 5)).toBe(10)
    })
  })

  describe("unit calculation functions", () => {
    it("should calculate unit per headcount", () => {
      expect(unitPerHeadcount(250, 6)).toBe(1500)
      expect(unitPerHeadcount(100, 6)).toBe(600)
    })

    it("should calculate unit by seat thresholds", () => {
      const thresholds = [
        { threshold: 0, unitSF: 450 },
        { threshold: 250, unitSF: 900 },
      ]
      expect(unitBySeatThresholds(100, thresholds)).toBe(450)
      expect(unitBySeatThresholds(250, thresholds)).toBe(900)
      expect(unitBySeatThresholds(300, thresholds)).toBe(900)
    })
  })
})
