/**
 * Program Map — the whiteboard bubble diagram (the discipline's own artifact,
 * finally drawn). Pure, deterministic layout: department clusters with packed
 * space bubbles, a shared-program band in the center, adjacency links that both
 * pull clusters together and render as weighted lines.
 *
 * No dependencies: a small greedy circle-packer for bubbles inside a cluster,
 * and a fixed-iteration force relaxation for cluster centers (repulsion +
 * adjacency springs + ring centering). Deterministic — same input, same map.
 */
import type { SurveyResult } from "./types"
import type { ComparisonLine } from "./comparison"
import { resolveSeating, officeHoldersFor, type SeatingPatch } from "./seating"

// Hex palette mirrors the canvas dept colors (index-aligned with DEPT_COLOR_CLASSES).
export const MAP_DEPT_COLORS = [
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316",
  "#10b981", "#f59e0b", "#ef4444", "#14b8a6", "#a855f7",
]

export type BubbleKind = "office" | "desks" | "flex" | "collab" | "shared-collab" | "shared-support"

export interface MapBubble {
  id: string
  kind: BubbleKind
  label: string
  sublabel?: string
  /** Named person (office bubbles). */
  person?: string
  crowned?: boolean
  count?: number
  sf: number
  r: number
  /** Position relative to the cluster center (clusters) or absolute (shared). */
  x: number
  y: number
}

export interface MapCluster {
  deptId: string
  name: string
  color: string
  headcount: number
  x: number
  y: number
  r: number
  bubbles: MapBubble[]
}

export interface MapLink {
  a: string
  b: string
  /** 0 = highest priority. */
  rank: number
  total: number
}

export interface ProgramMap {
  clusters: MapCluster[]
  /** Shared bubbles, positioned relative to the shared-band center (cx, cy). */
  shared: MapBubble[]
  /** Radius of the reserved shared band at the center. */
  sharedR: number
  /** Absolute center of the shared band in map coordinates. */
  cx: number
  cy: number
  links: MapLink[]
  width: number
  height: number
}

/** Bubble radius from square footage — √ scale so area tracks SF. */
const rOf = (sf: number) => Math.max(14, Math.min(90, 3.2 * Math.sqrt(Math.max(1, sf))))

const PAD = 6

/**
 * Greedy circle packing: biggest first at the origin, each next bubble tried at
 * candidate spots around already-placed ones, keeping the position closest to
 * the centroid that doesn't overlap. Deterministic. Good enough for ≤ ~20 items.
 */
export function packCircles(items: { r: number }[]): { x: number; y: number }[] {
  const placed: { x: number; y: number; r: number }[] = []
  const out: { x: number; y: number }[] = new Array(items.length)
  const order = items.map((it, i) => ({ ...it, i })).sort((a, b) => b.r - a.r)

  for (const item of order) {
    if (placed.length === 0) {
      placed.push({ x: 0, y: 0, r: item.r })
      out[item.i] = { x: 0, y: 0 }
      continue
    }
    let best: { x: number; y: number } | null = null
    let bestD = Infinity
    for (const p of placed) {
      const dist = p.r + item.r + PAD
      for (let k = 0; k < 24; k++) {
        const ang = (k / 24) * Math.PI * 2
        const x = p.x + dist * Math.cos(ang)
        const y = p.y + dist * Math.sin(ang)
        const ok = placed.every((q) => Math.hypot(q.x - x, q.y - y) >= q.r + item.r + PAD - 0.5)
        if (!ok) continue
        const d = Math.hypot(x, y)
        if (d < bestD) { bestD = d; best = { x, y } }
      }
    }
    const pos = best ?? { x: 0, y: (placed[placed.length - 1].y + placed[placed.length - 1].r + item.r + PAD) }
    placed.push({ ...pos, r: item.r })
    out[item.i] = pos
  }
  return out
}

const contentRadius = (bubbles: MapBubble[]): number =>
  Math.max(30, ...bubbles.map((b) => Math.hypot(b.x, b.y) + b.r)) + 18

export function buildProgramMap(result: SurveyResult, lines: ComparisonLine[], seatingPatch?: SeatingPatch): ProgramMap {
  const ex = result.existing ?? {}
  const wsSF = ex.workstationSF ?? 48
  const offSF = ex.officeSF ?? 120
  const seating = resolveSeating(result, seatingPatch)

  // ── Department clusters ─────────────────────────────────────────────────────
  const clusters: MapCluster[] = result.people.departments.map((d, i) => {
    const bubbles: MapBubble[] = []
    const offices = result.spaces.privateOfficesByDept[d.id] ?? 0
    const dedicated = result.work.dedicatedByDept?.[d.id] ?? 0
    const flex = Math.max(0, d.headcount - offices - dedicated)

    // Private offices — one bubble per office, named through the one seating
    // resolver (explicit picks, session moves, or leaders-first convention).
    const holders = officeHoldersFor(result, d.id, offices, seating)
    for (let k = 0; k < offices; k++) {
      const person = holders[k]
      bubbles.push({
        id: `${d.id}:office:${k}`, kind: "office", label: "Office", sf: offSF, r: rOf(offSF),
        ...(person ? { person: person.name, crowned: !!person.isLeader } : {}),
        x: 0, y: 0,
      })
    }
    if (dedicated > 0) {
      bubbles.push({
        id: `${d.id}:desks`, kind: "desks", label: `×${dedicated}`, sublabel: "dedicated desks",
        count: dedicated, sf: dedicated * wsSF, r: rOf(dedicated * wsSF), x: 0, y: 0,
      })
    }
    if (flex > 0) {
      bubbles.push({
        id: `${d.id}:flex`, kind: "flex", label: `×${flex}`, sublabel: "flex seats",
        count: flex, sf: flex * wsSF * 0.6, r: rOf(flex * wsSF * 0.6), x: 0, y: 0,
      })
    }
    // Department-declared collaboration (byDept counts from the survey).
    for (const c of result.spaces.collaboration) {
      const n = c.byDept[d.id] ?? 0
      if (n <= 0) continue
      const unit = lines.find((l) => l.label === c.type)?.unitSF ?? 150
      bubbles.push({
        id: `${d.id}:collab:${c.type}`, kind: "collab", label: `×${n}`, sublabel: c.type,
        count: n, sf: n * unit, r: rOf(n * unit), x: 0, y: 0,
      })
    }

    const pos = packCircles(bubbles)
    bubbles.forEach((b, k) => { b.x = pos[k].x; b.y = pos[k].y })

    return {
      deptId: d.id, name: d.name, color: MAP_DEPT_COLORS[i % MAP_DEPT_COLORS.length],
      headcount: d.headcount, x: 0, y: 0, r: contentRadius(bubbles), bubbles,
    }
  })

  // ── Shared program band (engine-proposed collab + support) ─────────────────
  const shared: MapBubble[] = lines
    .filter((l) => (l.category === "Collaboration" || l.category === "Support") && l.proposedCount > 0)
    .map((l) => ({
      id: `shared:${l.key}`,
      kind: (l.category === "Collaboration" ? "shared-collab" : "shared-support") as BubbleKind,
      label: `×${l.proposedCount}`, sublabel: l.label,
      count: l.proposedCount, sf: l.proposedCount * l.unitSF,
      r: rOf(l.proposedCount * l.unitSF) * 0.85, x: 0, y: 0,
    }))
  const sharedPos = packCircles(shared)
  shared.forEach((b, k) => { b.x = sharedPos[k].x; b.y = sharedPos[k].y })
  const sharedR = shared.length ? contentRadius(shared) : 60

  // ── Links from ranked adjacency pairs ───────────────────────────────────────
  const pairs = result.work.adjacencyPairs ?? []
  const ids = new Set(clusters.map((c) => c.deptId))
  const links: MapLink[] = pairs
    .filter((p) => ids.has(p.a) && ids.has(p.b))
    .map((p, rank) => ({ a: p.a, b: p.b, rank, total: pairs.length }))

  // ── Cluster placement: ring init + fixed-iteration force relaxation ─────────
  const N = clusters.length
  const ringR = sharedR + 60 + Math.max(...clusters.map((c) => c.r), 60)
  clusters.forEach((c, i) => {
    const ang = (i / Math.max(1, N)) * Math.PI * 2 - Math.PI / 2
    c.x = (ringR + c.r) * Math.cos(ang)
    c.y = (ringR + c.r) * Math.sin(ang)
  })

  const GAP = 36
  for (let iter = 0; iter < 260; iter++) {
    // Repulsion between clusters (only when too close).
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const a = clusters[i], b = clusters[j]
        const dx = b.x - a.x, dy = b.y - a.y
        const d = Math.max(1, Math.hypot(dx, dy))
        const min = a.r + b.r + GAP
        if (d < min) {
          const push = (min - d) / 2 / d
          a.x -= dx * push; a.y -= dy * push
          b.x += dx * push; b.y += dy * push
        }
      }
    }
    // Adjacency springs — higher-ranked pairs pull harder.
    for (const l of links) {
      const a = clusters.find((c) => c.deptId === l.a)!
      const b = clusters.find((c) => c.deptId === l.b)!
      const dx = b.x - a.x, dy = b.y - a.y
      const d = Math.max(1, Math.hypot(dx, dy))
      const target = a.r + b.r + GAP
      const strength = 0.02 * (1 - l.rank / Math.max(1, l.total)) + 0.005
      const pull = (d - target) * strength / d
      a.x += dx * pull; a.y += dy * pull
      b.x -= dx * pull; b.y -= dy * pull
    }
    // Keep clusters outside the shared band, but drawn gently toward it.
    for (const c of clusters) {
      const d = Math.max(1, Math.hypot(c.x, c.y))
      const min = sharedR + c.r + GAP * 0.75
      if (d < min) {
        const push = (min - d) / d
        c.x += c.x * push; c.y += c.y * push
      } else {
        const pull = 0.012 * (d - min) / d
        c.x -= c.x * pull; c.y -= c.y * pull
      }
    }
  }

  // ── Canvas bounds — shift everything into positive space ────────────────────
  const xs = [...clusters.map((c) => c.x - c.r), -sharedR, ...clusters.map((c) => c.x + c.r), sharedR]
  const ys = [...clusters.map((c) => c.y - c.r), -sharedR, ...clusters.map((c) => c.y + c.r), sharedR]
  const M = 60
  const minX = Math.min(...xs) - M, maxX = Math.max(...xs) + M
  const minY = Math.min(...ys) - M, maxY = Math.max(...ys) + M
  for (const c of clusters) { c.x -= minX; c.y -= minY }
  // The shared band sat at the origin during layout; its absolute center is:
  const cx = -minX, cy = -minY

  return { clusters, shared, sharedR, cx, cy, links, width: maxX - minX, height: maxY - minY }
}
