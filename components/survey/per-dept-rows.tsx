"use client"

import { Stepper } from "./stepper"
import type { SpineDept } from "@/lib/survey/sections"

/**
 * Generic per-department number editor — one pre-filled row per department from
 * the spine, the client only adjusts the count (SURVEY_SPEC §3, "ask once, flow
 * forward"). Reused by the detailed lanes for in-office days, dedicated seats,
 * and private-office counts.
 */
export function PerDeptRows({
  departments,
  values,
  onChange,
  defaultValue = 0,
  min = 0,
  capToHeadcount = false,
  max = 9999,
  suffix,
  showHeadcount = false,
}: {
  departments: SpineDept[]
  values: Record<string, number>
  onChange: (next: Record<string, number>) => void
  defaultValue?: number
  min?: number
  /** Clamp each row's max to that department's headcount (dedicated seats, offices). */
  capToHeadcount?: boolean
  max?: number
  suffix?: string
  showHeadcount?: boolean
}) {
  const set = (id: string, n: number) => onChange({ ...values, [id]: n })

  if (departments.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/45">
        Add departments in the first step to set per-department values here.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {departments.map((d) => (
        <div
          key={d.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">{d.name || "Untitled department"}</div>
            {showHeadcount && (
              <div className="text-xs text-white/40">{d.headcount} people</div>
            )}
          </div>
          <Stepper
            value={values[d.id] ?? defaultValue}
            onChange={(n) => set(d.id, n)}
            min={min}
            max={capToHeadcount ? Math.max(min, d.headcount) : max}
            suffix={suffix}
          />
        </div>
      ))}
    </div>
  )
}
