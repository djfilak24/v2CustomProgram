"use client"

import { useState } from "react"
import { Check, ChevronRight } from "lucide-react"
import { Stepper } from "./stepper"
import type { SpineDept } from "@/lib/survey/sections"

/**
 * Per-department allocation editor used by the dedicated-desk and private-office
 * steps. Clusters the count with its total ("X of N") by the stepper, orders by
 * headcount, and shows a ratio bar. When a department has a named roster and
 * `employeeSelections` is supplied, it nests per-person checkboxes ("who gets a
 * desk/office") and derives the count from those checks.
 */
export function DeptAllocationRows({
  departments,
  values,
  onChange,
  summarize,
  employeeSelections,
  onToggleEmployee,
}: {
  departments: SpineDept[]
  values: Record<string, number>
  onChange: (next: Record<string, number>) => void
  summarize: (allocated: number, headcount: number) => string
  /** Per-person selection (employee id → checked). Enables the nested roster. */
  employeeSelections?: Record<string, boolean>
  onToggleEmployee?: (empId: string) => void
}) {
  const [open, setOpen] = useState<Set<string>>(new Set())

  if (departments.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/45">
        Add departments in the first step to set per-department values here.
      </p>
    )
  }

  const set = (id: string, n: number) => onChange({ ...values, [id]: n })
  const toggle = (id: string) =>
    setOpen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const sorted = [...departments].sort((a, b) => (b.headcount || 0) - (a.headcount || 0))
  const maxHc = Math.max(1, ...sorted.map((d) => d.headcount || 0))

  return (
    <div className="space-y-2.5">
      {sorted.map((d) => {
        const hc = d.headcount || 0
        const roster = d.employees ?? []
        const perPerson = roster.length > 0 && !!employeeSelections
        const val = perPerson
          ? roster.filter((e) => employeeSelections![e.id]).length
          : Math.min(values[d.id] ?? 0, hc)
        const ratio = hc > 0 ? val / hc : 0
        const big = hc >= maxHc * 0.66
        const med = hc >= maxHc * 0.33
        const isOpen = open.has(d.id)
        return (
          <div
            key={d.id}
            className={`rounded-xl border border-white/10 bg-white/[0.03] ${big ? "px-5 py-4" : med ? "px-5 py-3.5" : "px-5 py-3"}`}
          >
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => perPerson && toggle(d.id)}
                className={`flex min-w-0 items-center gap-2 text-left ${perPerson ? "cursor-pointer" : "cursor-default"}`}
              >
                {perPerson && (
                  <ChevronRight className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                )}
                <span className="min-w-0">
                  <span className={`block truncate font-semibold text-white ${big ? "text-lg" : med ? "text-base" : "text-sm"}`}>
                    {d.name || "Untitled department"}
                  </span>
                  <span className="block text-xs text-white/40">
                    {hc} {hc === 1 ? "person" : "people"}{perPerson ? " · tap to assign by name" : ""}
                  </span>
                </span>
              </button>

              <div className="flex shrink-0 items-center gap-3">
                {perPerson ? (
                  <span className="text-sm text-white/80">
                    <span className="font-semibold text-white">{val}</span>
                    <span className="text-white/50"> of {hc}</span>
                  </span>
                ) : (
                  <>
                    <Stepper value={val} onChange={(n) => set(d.id, Math.min(n, hc))} min={0} max={hc} />
                    <span className="whitespace-nowrap text-sm text-white/50">
                      of <span className="font-semibold text-white/80">{hc}</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#00badc] transition-all" style={{ width: `${ratio * 100}%` }} />
              </div>
              <span className="w-32 shrink-0 text-right text-[11px] tabular-nums text-white/45">
                {summarize(val, hc)}
              </span>
            </div>

            {/* Nested per-person assignment */}
            {perPerson && isOpen && (
              <div className="mt-3 grid gap-1.5 border-t border-white/[0.07] pt-3 sm:grid-cols-2">
                {roster.map((emp) => {
                  const on = !!employeeSelections![emp.id]
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => onToggleEmployee?.(emp.id)}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        on ? "border-[#00badc]/50 bg-[#00badc]/[0.08] text-white" : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          on ? "border-[#00badc] bg-[#00badc] text-slate-900" : "border-white/30"
                        }`}
                      >
                        {on && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="truncate">{emp.name || "Unnamed"}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
