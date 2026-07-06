"use client"

import { useState } from "react"
import { Check, ChevronRight, Crown } from "lucide-react"
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
  thisNoun,
  otherByDept,
  otherNoun,
  showFlex = false,
  employeeSelections,
  onToggleEmployee,
  excludedEmployees,
  excludedNoun,
}: {
  departments: SpineDept[]
  values: Record<string, number>
  onChange: (next: Record<string, number>) => void
  /** What this allocation is (e.g. "dedicated desks", "private offices"). */
  thisNoun: string
  /** The complementary allocation already made (e.g. offices when setting desks). */
  otherByDept?: Record<string, number>
  otherNoun?: string
  /** Show the remaining flex/shared seats (hc − this − other). */
  showFlex?: boolean
  /** Per-person selection (employee id → checked). Enables the nested roster. */
  employeeSelections?: Record<string, boolean>
  onToggleEmployee?: (empId: string) => void
  /**
   * People already assigned to the complementary seat type (office ⇄ desk).
   * They're locked out here — a person holds at most one assigned seat.
   */
  excludedEmployees?: Record<string, boolean>
  /** Short label for the exclusion (e.g. "office", "desk"). */
  excludedNoun?: string
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
        const checked = perPerson ? roster.filter((e) => employeeSelections![e.id]).length : 0
        // Full roster (everyone named) → count = checked. Partial roster ("leaders")
        // → keep a total stepper for the unnamed remainder, floored at the checked
        // named people. No roster → plain stepper.
        const fullRoster = perPerson && roster.length >= hc
        const showStepper = !perPerson || !fullRoster
        const val = perPerson
          ? (fullRoster ? checked : Math.max(values[d.id] ?? 0, checked))
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
                {showStepper ? (
                  <>
                    <Stepper
                      value={val}
                      onChange={(n) => set(d.id, Math.min(n, hc))}
                      min={perPerson ? checked : 0}
                      max={hc}
                    />
                    <span className="whitespace-nowrap text-sm text-white/50">
                      of <span className="font-semibold text-white/80">{hc}</span>
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-white/80">
                    <span className="font-semibold text-white">{val}</span>
                    <span className="text-white/50"> of {hc}</span>
                  </span>
                )}
              </div>
            </div>

            {(() => {
              const other = otherByDept?.[d.id] ?? 0
              const flex = Math.max(0, hc - val - other)
              return (
                <div className="mt-3">
                  {/* Segmented allocation bar: this · other · flex */}
                  <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="bg-[#00badc] transition-all" style={{ width: `${(val / Math.max(1, hc)) * 100}%` }} />
                    {otherByDept && <div className="bg-violet-400 transition-all" style={{ width: `${(other / Math.max(1, hc)) * 100}%` }} />}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#00badc]" />
                      <span className="font-bold tabular-nums text-white">{val}</span>
                      <span className="text-white/60">{thisNoun}</span>
                    </span>
                    {otherByDept && (
                      <>
                        <span className="text-white/20">·</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-violet-400" />
                          <span className="font-bold tabular-nums text-white">{other}</span>
                          <span className="text-white/60">{otherNoun}</span>
                        </span>
                      </>
                    )}
                    {showFlex && (
                      <>
                        <span className="text-white/20">·</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-white/25" />
                          <span className="font-bold tabular-nums text-white/80">{flex}</span>
                          <span className="text-white/50">flex {flex === 1 ? "seat" : "seats"}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Nested per-person assignment */}
            {perPerson && isOpen && (
              <div className="mt-3 grid gap-1.5 border-t border-white/[0.07] pt-3 sm:grid-cols-2">
                {roster.map((emp) => {
                  const on = !!employeeSelections![emp.id]
                  const locked = !on && !!excludedEmployees?.[emp.id]
                  const leader = !!emp.isLeader
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      disabled={locked}
                      onClick={() => !locked && onToggleEmployee?.(emp.id)}
                      title={locked ? `Already has ${excludedNoun ?? "the other seat"} — one assigned seat per person` : undefined}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        locked
                          ? "cursor-not-allowed border-white/[0.06] bg-white/[0.01] text-white/30"
                          : on
                            ? "border-[#00badc]/50 bg-[#00badc]/[0.08] text-white"
                            : leader
                              ? "border-amber-400/40 bg-amber-400/[0.06] text-white hover:border-amber-400/60"
                              : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          on ? "border-[#00badc] bg-[#00badc] text-slate-900" : locked ? "border-white/15" : "border-white/30"
                        }`}
                      >
                        {on && <Check className="h-3 w-3" strokeWidth={3} />}
                        {locked && <span className="h-2 w-2 rounded-[1px] bg-white/25" />}
                      </span>
                      {leader && <Crown className={`h-3.5 w-3.5 shrink-0 ${locked ? "text-amber-400/40" : "text-amber-300"}`} />}
                      <span className="truncate">{emp.name || "Unnamed"}</span>
                      {locked && excludedNoun && (
                        <span className="ml-auto shrink-0 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/40">
                          {excludedNoun}
                        </span>
                      )}
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
