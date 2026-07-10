"use client"

import { useState } from "react"
import { Check, ChevronRight, Crown, X, CheckCheck, Eraser } from "lucide-react"
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
  onBulkEmployees,
  onReleaseExcluded,
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
  /** Bulk set a list of people to checked/unchecked in one update (select all / clear). */
  onBulkEmployees?: (empIds: string[], value: boolean) => void
  /**
   * Release a person from the complementary seat (office ⇄ desk) so they can be
   * assigned here instead — powers the "× office" undo in the desk step and the
   * reverse. When omitted, complementary holders stay hard-locked.
   */
  onReleaseExcluded?: (empId: string) => void
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
      <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
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
            className={`rounded-xl border border-slate-200 bg-white ${big ? "px-5 py-4" : med ? "px-5 py-3.5" : "px-5 py-3"}`}
          >
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => perPerson && toggle(d.id)}
                className={`flex min-w-0 items-center gap-2 text-left ${perPerson ? "cursor-pointer" : "cursor-default"}`}
              >
                {perPerson && (
                  <ChevronRight className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                )}
                <span className="min-w-0">
                  <span className={`block truncate font-semibold text-slate-900 ${big ? "text-lg" : med ? "text-base" : "text-sm"}`}>
                    {d.name || "Untitled department"}
                  </span>
                  <span className="block text-xs text-slate-400">
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
                    <span className="whitespace-nowrap text-sm text-slate-500">
                      of <span className="font-semibold text-slate-700">{hc}</span>
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">{val}</span>
                    <span className="text-slate-500"> of {hc}</span>
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
                  <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="bg-[#00badc] transition-all" style={{ width: `${(val / Math.max(1, hc)) * 100}%` }} />
                    {otherByDept && <div className="bg-violet-400 transition-all" style={{ width: `${(other / Math.max(1, hc)) * 100}%` }} />}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#00badc]" />
                      <span className="font-bold tabular-nums text-slate-900">{val}</span>
                      <span className="text-slate-600">{thisNoun}</span>
                    </span>
                    {otherByDept && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-violet-400" />
                          <span className="font-bold tabular-nums text-slate-900">{other}</span>
                          <span className="text-slate-600">{otherNoun}</span>
                        </span>
                      </>
                    )}
                    {showFlex && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-white/25" />
                          <span className="font-bold tabular-nums text-slate-700">{flex}</span>
                          <span className="text-slate-500">flex {flex === 1 ? "seat" : "seats"}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Nested per-person assignment */}
            {perPerson && isOpen && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                {/* Bulk controls — assign or clear the whole team at once */}
                {onBulkEmployees && (() => {
                  const eligible = roster.filter((e) => !excludedEmployees?.[e.id])
                  const checkedIds = roster.filter((e) => employeeSelections![e.id]).map((e) => e.id)
                  const allEligibleOn = eligible.length > 0 && eligible.every((e) => employeeSelections![e.id])
                  return (
                    <div className="mb-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={allEligibleOn || eligible.length === 0}
                        onClick={() => onBulkEmployees(eligible.map((e) => e.id), true)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#00badc]/40 bg-[#00badc]/[0.08] px-2.5 py-1 text-xs font-medium text-[#0089a3] transition-colors hover:bg-[#00badc]/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <CheckCheck className="h-3.5 w-3.5" /> Select all
                      </button>
                      <button
                        type="button"
                        disabled={checkedIds.length === 0}
                        onClick={() => onBulkEmployees(checkedIds, false)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Eraser className="h-3.5 w-3.5" /> Clear
                      </button>
                      <span className="ml-auto text-xs text-slate-400">
                        {checked} of {roster.length} assigned
                      </span>
                    </div>
                  )
                })()}

                <div className="grid gap-1.5 sm:grid-cols-2">
                  {[...roster].sort((a, b) => Number(!!b.isLeader) - Number(!!a.isLeader)).map((emp) => {
                    const on = !!employeeSelections![emp.id]
                    const excluded = !on && !!excludedEmployees?.[emp.id]
                    // A complementary-seat holder is releasable (× to free them) when the
                    // parent supplies onReleaseExcluded; otherwise hard-locked.
                    const releasable = excluded && !!onReleaseExcluded
                    const locked = excluded && !releasable
                    const leader = !!emp.isLeader

                    // Releasable row: not a selection button — carries its own × control.
                    if (releasable) {
                      return (
                        <div
                          key={emp.id}
                          className="flex items-center gap-2.5 rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2 text-sm text-slate-500"
                        >
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-violet-300 bg-white">
                            <span className="h-2 w-2 rounded-[1px] bg-violet-400" />
                          </span>
                          {leader && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500/60" />}
                          <span className="truncate">{emp.name || "Unnamed"}</span>
                          <span className="ml-auto flex shrink-0 items-center gap-1.5">
                            <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-500">
                              {excludedNoun}
                            </span>
                            <button
                              type="button"
                              onClick={() => onReleaseExcluded!(emp.id)}
                              title={`Remove their ${excludedNoun ?? "other seat"} to free them for a ${thisNoun}`}
                              className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            >
                              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </button>
                          </span>
                        </div>
                      )
                    }

                    return (
                      <button
                        key={emp.id}
                        type="button"
                        disabled={locked}
                        onClick={() => !locked && onToggleEmployee?.(emp.id)}
                        title={locked ? `Already has ${excludedNoun ?? "the other seat"} — one assigned seat per person` : undefined}
                        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                          locked
                            ? "cursor-not-allowed border-slate-100 bg-slate-50/60 text-slate-400"
                            : on
                              ? "border-[#00badc]/50 bg-[#00badc]/[0.08] text-slate-900"
                              : leader
                                ? "border-amber-400/70 bg-amber-50 text-slate-900 hover:border-amber-500/70"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            on ? "border-[#00badc] bg-[#00badc] text-slate-900" : "border-slate-300"
                          }`}
                        >
                          {on && <Check className="h-3 w-3" strokeWidth={3} />}
                          {locked && <span className="h-2 w-2 rounded-[1px] bg-white/25" />}
                        </span>
                        {leader && <Crown className={`h-3.5 w-3.5 shrink-0 ${locked ? "text-amber-600/40" : "text-amber-500"}`} />}
                        <span className="truncate">{emp.name || "Unnamed"}</span>
                        {locked && excludedNoun && (
                          <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            {excludedNoun}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
