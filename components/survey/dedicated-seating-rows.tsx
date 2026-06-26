"use client"

import { Stepper } from "./stepper"
import type { SpineDept } from "@/lib/survey/sections"

/**
 * Dedicated-seat editor for the seating step. Reworked per feedback:
 * - clusters the count with its total ("X of N people") right by the stepper so
 *   it reads at a glance,
 * - orders departments by headcount and scales emphasis so larger teams lead,
 * - shows a ratio bar of dedicated vs. shareable.
 */
export function DedicatedSeatingRows({
  departments,
  values,
  onChange,
}: {
  departments: SpineDept[]
  values: Record<string, number>
  onChange: (next: Record<string, number>) => void
}) {
  if (departments.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/45">
        Add departments in the first step to set dedicated seats here.
      </p>
    )
  }

  const set = (id: string, n: number) => onChange({ ...values, [id]: n })
  const sorted = [...departments].sort((a, b) => (b.headcount || 0) - (a.headcount || 0))
  const maxHc = Math.max(1, ...sorted.map((d) => d.headcount || 0))

  return (
    <div className="space-y-2.5">
      {sorted.map((d) => {
        const hc = d.headcount || 0
        const val = Math.min(values[d.id] ?? 0, hc)
        const ratio = hc > 0 ? val / hc : 0
        // Emphasis tier by share of the largest team — larger teams read bigger.
        const big = hc >= maxHc * 0.66
        const med = hc >= maxHc * 0.33
        return (
          <div
            key={d.id}
            className={`rounded-xl border border-white/10 bg-white/[0.03] ${big ? "px-5 py-4" : med ? "px-5 py-3.5" : "px-5 py-3"}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className={`truncate font-semibold text-white ${big ? "text-lg" : med ? "text-base" : "text-sm"}`}>
                  {d.name || "Untitled department"}
                </div>
                <div className="text-xs text-white/40">{hc} {hc === 1 ? "person" : "people"}</div>
              </div>

              {/* Clustered: stepper + "of N people" together for glanceability */}
              <div className="flex shrink-0 items-center gap-3">
                <Stepper value={val} onChange={(n) => set(d.id, Math.min(n, hc))} min={0} max={hc} />
                <span className="whitespace-nowrap text-sm text-white/50">
                  of <span className="font-semibold text-white/80">{hc}</span>
                </span>
              </div>
            </div>

            {/* Ratio bar: dedicated vs. shareable */}
            <div className="mt-2.5 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#00badc] transition-all" style={{ width: `${ratio * 100}%` }} />
              </div>
              <span className="w-28 shrink-0 text-right text-[11px] tabular-nums text-white/45">
                {val} dedicated · {Math.max(0, hc - val)} flex
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
