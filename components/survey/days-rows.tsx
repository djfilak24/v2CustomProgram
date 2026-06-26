"use client"

import { HelpCircle, Plus, X } from "lucide-react"
import { Stepper } from "./stepper"
import { isUnsure, type DayRange, type DayValue, type SpineDept } from "@/lib/survey/sections"

/**
 * Per-department in-office cadence. Defaults to a single number (4 days) with one
 * stepper; "Add range" reveals a second stepper only when a team's pattern varies;
 * "Not sure" defers to the live session. Ranges/unsure are preserved so the end
 * evaluation can take min/max as appropriate.
 */
export function DaysRows({
  departments,
  values,
  onChange,
  defaultDay = 4,
}: {
  departments: SpineDept[]
  values: Record<string, DayValue>
  onChange: (next: Record<string, DayValue>) => void
  defaultDay?: number
}) {
  if (departments.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/45">
        Add departments in the first step to set per-department cadence here.
      </p>
    )
  }

  const set = (id: string, v: DayValue) => onChange({ ...values, [id]: v })
  const band = (id: string): DayRange => {
    const v = values[id]
    return v && v !== "unsure" ? v : { min: defaultDay, max: defaultDay }
  }

  return (
    <div className="space-y-2">
      <p className="px-1 text-xs text-white/40">
        Standard is 4 days a week — adjust any team, add a range if it varies, or defer.
      </p>
      {departments.map((d) => {
        const unsure = isUnsure(values[d.id])
        const { min, max } = band(d.id)
        const isRange = min !== max
        return (
          <div
            key={d.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white">{d.name || "Untitled department"}</div>
              <div className="text-xs text-white/40">{d.headcount} people</div>
            </div>

            <div className="flex items-center gap-3">
              {unsure ? (
                <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-300">
                  We&apos;ll confirm this live
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <Stepper
                    value={min}
                    min={0}
                    max={5}
                    suffix={isRange ? undefined : "days"}
                    onChange={(n) => set(d.id, { min: n, max: isRange ? Math.max(n, max) : n })}
                  />
                  {isRange && (
                    <>
                      <span className="text-xs text-white/40">to</span>
                      <Stepper
                        value={max}
                        min={0}
                        max={5}
                        suffix="days"
                        onChange={(n) => set(d.id, { min: Math.min(min, n), max: n })}
                      />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => set(d.id, isRange ? { min, max: min } : { min, max: Math.min(5, min + 1) })}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/12 px-2 py-1.5 text-xs font-medium text-white/45 transition-colors hover:border-white/25 hover:text-white/80"
                    title={isRange ? "Use a single number" : "Varies? Add a range"}
                  >
                    {isRange ? <><X className="h-3 w-3" /> Range</> : <><Plus className="h-3 w-3" /> Range</>}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => set(d.id, unsure ? { min: defaultDay, max: defaultDay } : "unsure")}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  unsure
                    ? "border-amber-400/40 bg-amber-400/15 text-amber-300"
                    : "border-white/12 text-white/45 hover:border-white/25 hover:text-white/80"
                }`}
                title="Not sure yet? We'll cover it together in the live session."
              >
                <HelpCircle className="h-3.5 w-3.5" /> Not sure
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
