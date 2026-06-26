"use client"

import { useState } from "react"
import {
  Plus, Trash2, TrendingUp, TrendingDown, Minus as MinusIcon, ChevronRight, X, UserPlus,
} from "lucide-react"
import { Stepper } from "./stepper"
import { makeDept, makeEmployee, type SpineDept, type Employee, type PeopleMode } from "@/lib/survey/sections"

/**
 * Department spine editor with the people decision tree:
 * - simple  → name + current/future headcount only.
 * - leaders → also expand a department to name its leaders (a subset).
 * - full    → name the whole team; headcount tracks the roster length.
 * Entered once, carried into every later step (offices, seating, work nest on it).
 */
export function DeptSpine({
  departments,
  mode,
  onChange,
}: {
  departments: SpineDept[]
  mode: PeopleMode
  onChange: (next: SpineDept[]) => void
}) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const named = mode !== "simple"

  const update = (id: string, patch: Partial<SpineDept>) =>
    onChange(departments.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  const remove = (id: string) => onChange(departments.filter((d) => d.id !== id))
  const add = () => onChange([...departments, makeDept()])
  const toggle = (id: string) =>
    setOpen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  const setRoster = (d: SpineDept, employees: Employee[]) =>
    update(d.id, mode === "full" ? { employees, headcount: employees.length } : { employees })

  const totalCurrent = departments.reduce((a, d) => a + (d.headcount || 0), 0)
  const totalFuture = departments.reduce((a, d) => a + (d.futureHeadcount ?? (d.headcount || 0)), 0)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-1 text-xs font-medium uppercase tracking-wide text-white/40">
        <span>Department</span>
        <span className="w-[120px] text-center">Current</span>
        <span className="w-[120px] text-center">3–5 yr</span>
        <span className="w-8" />
      </div>

      <div className="space-y-2">
        {departments.map((d) => {
          const future = d.futureHeadcount ?? d.headcount
          const delta = future - (d.headcount || 0)
          const roster = d.employees ?? []
          const isOpen = open.has(d.id)
          return (
            <div key={d.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02]">
              <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 p-1.5">
                <div className="flex items-center gap-1.5">
                  {named && (
                    <button
                      type="button"
                      onClick={() => toggle(d.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-white/80"
                      aria-label="Toggle roster"
                    >
                      <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    </button>
                  )}
                  <input
                    value={d.name}
                    onChange={(e) => update(d.id, { name: e.target.value })}
                    placeholder="Department name"
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#00badc] focus:outline-none"
                  />
                </div>

                {mode === "full" ? (
                  <span className="flex w-[120px] items-center justify-center gap-1 text-sm text-white/70" title="Headcount = roster size">
                    <span className="font-semibold text-white">{roster.length}</span> named
                  </span>
                ) : (
                  <Stepper value={d.headcount} onChange={(n) => update(d.id, { headcount: n })} />
                )}

                <div className="flex items-center gap-1.5">
                  <Stepper value={future} onChange={(n) => update(d.id, { futureHeadcount: n })} />
                  <span className="flex w-7 justify-center" title={`${delta >= 0 ? "+" : ""}${delta} vs today`}>
                    {delta > 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                      : delta < 0 ? <TrendingDown className="h-3.5 w-3.5 text-amber-400" />
                      : <MinusIcon className="h-3.5 w-3.5 text-white/25" />}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => remove(d.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/10 hover:text-white/80"
                  aria-label="Remove department"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {named && isOpen && (
                <div className="border-t border-white/[0.07] px-3 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-white/40">
                      {mode === "leaders" ? "Leaders" : "Team roster"}
                    </span>
                    {mode === "leaders" && roster.length > 0 && (
                      <span className="text-[11px] text-white/40">
                        {roster.length} named · {Math.max(0, (d.headcount || 0) - roster.length)} more by headcount
                      </span>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {roster.map((emp, i) => (
                      <div key={emp.id} className="flex items-center gap-1.5">
                        <input
                          value={emp.name}
                          onChange={(e) => setRoster(d, roster.map((x) => (x.id === emp.id ? { ...x, name: e.target.value } : x)))}
                          placeholder={`${mode === "leaders" ? "Leader" : "Person"} ${i + 1}`}
                          className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-[#00badc] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setRoster(d, roster.filter((x) => x.id !== emp.id))}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/30 hover:bg-white/10 hover:text-white/70"
                          aria-label="Remove person"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRoster(d, [...roster, makeEmployee()])}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[#00badc] transition-colors hover:bg-[#00badc]/10"
                  >
                    <UserPlus className="h-4 w-4" /> Add {mode === "leaders" ? "leader" : "person"}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[#00badc] transition-colors hover:bg-[#00badc]/10"
        >
          <Plus className="h-4 w-4" /> Add department
        </button>
        <div className="flex items-center gap-5 px-1 text-sm tabular-nums">
          <span className="text-white/60">Today <span className="font-semibold text-white">{totalCurrent}</span></span>
          <span className="text-white/60">Future <span className="font-semibold text-[#00badc]">{totalFuture}</span></span>
        </div>
      </div>
    </div>
  )
}
