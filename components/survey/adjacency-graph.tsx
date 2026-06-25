"use client"

import { useState } from "react"
import { X, ChevronUp, ChevronDown } from "lucide-react"
import { pairKey, adjacencyColor, type SpineDept } from "@/lib/survey/sections"

/**
 * Visual department-adjacency editor (SURVEY_SPEC §2, cross-functional work).
 * Departments from Section 1 sit in a ring; tap two to draw a connection. The
 * connections are then a PRIORITY STACK — ordered most → least important (the
 * array order), reorderable with the arrows, and colour-coded so the ranked list
 * on the right maps onto the lines on the left.
 */
export function AdjacencyGraph({
  departments,
  pairs,
  onChange,
}: {
  departments: SpineDept[]
  pairs: string[]
  onChange: (pairs: string[]) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const named = departments.filter((d) => d.name.trim())

  if (named.length < 2) {
    return (
      <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/45">
        Add at least two departments in the first step to map how they work together.
      </p>
    )
  }

  const linked = new Set(pairs)
  const toggle = (a: string, b: string) => {
    const k = pairKey(a, b)
    onChange(linked.has(k) ? pairs.filter((p) => p !== k) : [...pairs, k])
  }
  const tap = (id: string) => {
    if (selected === null) setSelected(id)
    else if (selected === id) setSelected(null)
    else { toggle(selected, id); setSelected(null) }
  }
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= pairs.length) return
    const next = [...pairs]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const nameOf = (id: string) => named.find((d) => d.id === id)?.name ?? id
  const rankOf = (k: string) => pairs.indexOf(k)

  // Ring geometry.
  const SIZE = 460
  const C = SIZE / 2
  const R = SIZE / 2 - 92
  const pos = (i: number) => {
    const a = (i / named.length) * 2 * Math.PI - Math.PI / 2
    return { x: C + R * Math.cos(a), y: C + R * Math.sin(a), a }
  }
  const idx = new Map(named.map((d, i) => [d.id, i]))

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto h-auto w-full max-w-[460px]">
          {/* connections, drawn low-priority first so the top ones sit on top */}
          {[...pairs].map((k, rank) => ({ k, rank })).reverse().map(({ k, rank }) => {
            const [a, b] = k.split("|")
            const ia = idx.get(a), ib = idx.get(b)
            if (ia === undefined || ib === undefined) return null
            const pa = pos(ia), pb = pos(ib)
            const color = adjacencyColor(rank, pairs.length)
            const t = pairs.length <= 1 ? 0 : rank / (pairs.length - 1)
            const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2
            return (
              <g key={k} style={{ pointerEvents: "none" }}>
                <line
                  x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                  stroke={color} strokeWidth={3 - 1.6 * t} strokeOpacity={0.85 - 0.4 * t} strokeLinecap="round"
                />
                <circle cx={mx} cy={my} r={9} fill={color} />
                <text x={mx} y={my} dominantBaseline="central" textAnchor="middle" className="fill-slate-900 text-[10px] font-bold">
                  {rank + 1}
                </text>
              </g>
            )
          })}

          {/* nodes */}
          {named.map((d, i) => {
            const p = pos(i)
            const isSel = selected === d.id
            const right = Math.cos(p.a) >= 0
            return (
              <g key={d.id} onClick={() => tap(d.id)} className="cursor-pointer">
                <circle
                  cx={p.x} cy={p.y} r={isSel ? 13 : 10}
                  fill={isSel ? "#00badc" : "#0e1f3a"}
                  stroke={isSel ? "#00badc" : "rgba(255,255,255,0.4)"}
                  strokeWidth={2}
                  className="transition-all"
                />
                <text
                  x={p.x + (right ? 18 : -18)} y={p.y}
                  dominantBaseline="middle" textAnchor={right ? "start" : "end"}
                  className="fill-white/80 text-[12px] font-medium"
                >
                  {d.name.length > 16 ? d.name.slice(0, 15) + "…" : d.name}
                </text>
              </g>
            )
          })}
        </svg>
        <p className="mt-1 text-center text-xs text-white/45">
          {selected
            ? `Tap another team to connect it to ${nameOf(selected)}`
            : "Tap two teams to connect the ones that work closely together."}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white">Priority</h4>
          {pairs.length > 0 && (
            <button
              type="button"
              onClick={() => { onChange([]); setSelected(null) }}
              className="text-xs text-white/40 transition-colors hover:text-white/70"
            >
              Clear all
            </button>
          )}
        </div>
        <p className="mt-0.5 text-xs text-white/40">Most → least important. Reorder with the arrows.</p>

        {pairs.length === 0 ? (
          <p className="mt-3 text-sm text-white/40">No connections yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pairs.map((k, i) => {
              const [a, b] = k.split("|")
              const color = adjacencyColor(i, pairs.length)
              return (
                <li
                  key={k}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-2 pr-2 text-sm"
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-slate-900"
                    style={{ backgroundColor: color }}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-white/85">
                    {nameOf(a)} <span style={{ color }}>↔</span> {nameOf(b)}
                  </span>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button" onClick={() => move(i, -1)} disabled={i === 0}
                      className="flex h-6 w-6 items-center justify-center rounded text-white/40 transition-colors hover:text-white disabled:opacity-20"
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button" onClick={() => move(i, 1)} disabled={i === pairs.length - 1}
                      className="flex h-6 w-6 items-center justify-center rounded text-white/40 transition-colors hover:text-white disabled:opacity-20"
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button" onClick={() => onChange(pairs.filter((p) => p !== k))}
                      className="flex h-6 w-6 items-center justify-center rounded text-white/35 transition-colors hover:text-white/80"
                      aria-label="Remove connection"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
