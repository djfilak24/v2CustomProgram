"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { pairKey, type SpineDept } from "@/lib/survey/sections"

/**
 * Visual department-adjacency editor (SURVEY_SPEC §2, cross-functional work).
 * Departments from Section 1 are laid out in a ring; tap two of them to draw a
 * connection between them. Links are captured as adjacency hints for the live
 * session — the tool handles the actual stacking/adjacency planning.
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
  const nameOf = (id: string) => named.find((d) => d.id === id)?.name ?? id

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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto h-auto w-full max-w-[460px]">
          {/* connections */}
          {pairs.map((k) => {
            const [a, b] = k.split("|")
            const ia = idx.get(a), ib = idx.get(b)
            if (ia === undefined || ib === undefined) return null
            const pa = pos(ia), pb = pos(ib)
            return (
              <line
                key={k}
                x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                stroke="#00badc" strokeWidth={2} strokeOpacity={0.6} strokeLinecap="round"
              />
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
                  x={p.x + (right ? 18 : -18)}
                  y={p.y}
                  dominantBaseline="middle"
                  textAnchor={right ? "start" : "end"}
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
          <h4 className="text-sm font-semibold text-white">Connections</h4>
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
        {pairs.length === 0 ? (
          <p className="mt-3 text-sm text-white/40">No connections yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pairs.map((k) => {
              const [a, b] = k.split("|")
              return (
                <li
                  key={k}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/80"
                >
                  <span className="truncate">{nameOf(a)} <span className="text-[#00badc]">↔</span> {nameOf(b)}</span>
                  <button
                    type="button"
                    onClick={() => onChange(pairs.filter((p) => p !== k))}
                    className="shrink-0 text-white/35 transition-colors hover:text-white/80"
                    aria-label="Remove connection"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
