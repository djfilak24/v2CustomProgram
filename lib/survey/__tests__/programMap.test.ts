import { describe, it, expect } from "vitest"
import { buildProgramMap, packCircles } from "../programMap"
import { buildComparison } from "../comparison"
import { demoResult } from "../demo-scenarios"

describe("packCircles", () => {
  it("places circles without overlap", () => {
    const items = [{ r: 40 }, { r: 30 }, { r: 30 }, { r: 22 }, { r: 18 }, { r: 14 }]
    const pos = packCircles(items)
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const d = Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y)
        expect(d).toBeGreaterThanOrEqual(items[i].r + items[j].r - 1)
      }
    }
  })
})

describe("buildProgramMap", () => {
  const make = (key: string) => {
    const result = demoResult(key)!
    return { result, map: buildProgramMap(result, buildComparison(result).lines) }
  }

  it("builds one cluster per department with the survey's seat mix", () => {
    const { result, map } = make("tech")
    expect(map.clusters).toHaveLength(result.people.departments.length)
    const eng = map.clusters.find((c) => c.name === "Engineering")!
    const offices = eng.bubbles.filter((b) => b.kind === "office")
    const desks = eng.bubbles.find((b) => b.kind === "desks")
    expect(offices).toHaveLength(4) // privateOfficesByDept.eng
    expect(desks?.count).toBe(22) // dedicatedByDept.eng
  })

  it("names office bubbles from the roster, leaders first and crowned", () => {
    const { map } = make("tech")
    const eng = map.clusters.find((c) => c.name === "Engineering")!
    const offices = eng.bubbles.filter((b) => b.kind === "office")
    expect(offices.every((b) => !!b.person)).toBe(true)
    expect(offices.every((b) => b.crowned)).toBe(true) // leaders take the offices
  })

  it("keeps clusters from severely overlapping and outside the shared band", () => {
    const { map } = make("enterprise") // 6 departments — the crowded case
    for (let i = 0; i < map.clusters.length; i++) {
      for (let j = i + 1; j < map.clusters.length; j++) {
        const a = map.clusters[i], b = map.clusters[j]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        expect(d).toBeGreaterThanOrEqual((a.r + b.r) * 0.9) // relaxation tolerance
      }
    }
    for (const c of map.clusters) {
      const d = Math.hypot(c.x - map.cx, c.y - map.cy)
      expect(d).toBeGreaterThanOrEqual(map.sharedR + c.r * 0.8)
    }
  })

  it("links come from ranked adjacency pairs and reference real clusters", () => {
    const { result, map } = make("law")
    expect(map.links).toHaveLength(result.work.adjacencyPairs!.length)
    const ids = new Set(map.clusters.map((c) => c.deptId))
    for (const l of map.links) {
      expect(ids.has(l.a)).toBe(true)
      expect(ids.has(l.b)).toBe(true)
    }
    expect(map.links[0].rank).toBe(0) // ranked, most important first
  })

  it("puts the proposed collaboration + support program in the shared band", () => {
    const { map } = make("tech")
    expect(map.shared.length).toBeGreaterThan(0)
    expect(map.shared.every((b) => b.kind === "shared-collab" || b.kind === "shared-support")).toBe(true)
  })
})
