"use client"

import { useState } from "react"
import {
  Plus, Trash2, TrendingUp, TrendingDown, Minus as MinusIcon, ChevronRight, X, UserPlus, Crown,
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
    update(d.id, mode === "full" ? { employees, headcount: Math.max(d.headcount || 0, employees.length) } : { employees })

  const totalCurrent = departments.reduce((a, d) => a + (d.headcount || 0), 0)
  const totalFuture = departments.reduce((a, d) => a + (d.futureHeadcount ?? (d.headcount || 0)), 0)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      {/* Column labels — desktop only; the stacked phone layout labels inline */}
      <div className="mb-2 hidden grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-1 text-xs font-medium uppercase tracking-wide text-slate-400 sm:grid">
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
            <div key={d.id} className="rounded-xl border border-slate-100 bg-white">
              {/* Phone: name row + labeled stepper row. ≥sm: the classic 4-col grid
                  (the stepper wrapper dissolves into the grid via sm:contents). */}
              <div className="p-2 sm:grid sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-3 sm:p-1.5">
                <div className="flex items-center gap-1.5">
                  {named && (
                    <button
                      type="button"
                      onClick={() => toggle(d.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Toggle roster"
                    >
                      <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    </button>
                  )}
                  <input
                    value={d.name}
                    onChange={(e) => update(d.id, { name: e.target.value })}
                    placeholder="Department name"
                    className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#00badc] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => remove(d.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:hidden"
                    aria-label="Remove department"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-2.5 flex items-end justify-between gap-3 sm:mt-0 sm:contents">
                  <div className="flex flex-col gap-1">
                    <span className="pl-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Today</span>
                    <Stepper value={d.headcount} onChange={(n) => update(d.id, { headcount: Math.max(n, mode === "full" ? roster.length : 0) })} />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="pl-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">3–5 yr</span>
                    <div className="flex items-center gap-1.5">
                      <Stepper value={future} onChange={(n) => update(d.id, { futureHeadcount: n })} />
                      <span className="flex w-7 justify-center" title={`${delta >= 0 ? "+" : ""}${delta} vs today`}>
                        {delta > 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                          : delta < 0 ? <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
                          : <MinusIcon className="h-3.5 w-3.5 text-slate-300" />}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => remove(d.id)}
                  className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:flex"
                  aria-label="Remove department"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {named && isOpen && (() => {
                const leaderCount = roster.filter((e) => e.isLeader).length
                return (
                <div className="border-t border-slate-100 px-3 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {mode === "leaders" ? "Leaders" : "Team roster"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {mode === "leaders"
                        ? `${roster.length} leader${roster.length === 1 ? "" : "s"} · ${Math.max(0, (d.headcount || 0) - roster.length)} more by headcount`
                        : `${roster.length} of ${d.headcount || 0} named · ${leaderCount} leader${leaderCount === 1 ? "" : "s"}`}
                    </span>
                  </div>
                  {mode === "full" && (
                    <p className="mb-2.5 text-[11px] text-slate-400">
                      Tap the <Crown className="mx-0.5 inline h-3 w-3 -translate-y-px text-amber-500/80" /> to mark someone a leader — leaders are first in line for private offices.
                    </p>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {roster.map((emp, i) => {
                      const leader = !!emp.isLeader
                      const toggleLeader = () => setRoster(d, roster.map((x) => (x.id === emp.id ? { ...x, isLeader: !x.isLeader } : x)))
                      return (
                        <div
                          key={emp.id}
                          className={`flex items-center gap-1.5 rounded-lg ${leader ? "bg-amber-50 ring-1 ring-inset ring-amber-400/50" : ""} p-0.5`}
                        >
                          {/* Leader marker: toggle in full mode; static in leaders mode. */}
                          <button
                            type="button"
                            onClick={mode === "full" ? toggleLeader : undefined}
                            aria-label={leader ? "Leader" : "Mark as leader"}
                            title={mode === "leaders" ? "Leader" : leader ? "Leader — click to unset" : "Mark as leader"}
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                              leader ? "text-amber-500" : "text-slate-300"
                            } ${mode === "full" ? "hover:bg-slate-100 hover:text-amber-700" : "cursor-default"}`}
                          >
                            <Crown className="h-4 w-4" />
                          </button>
                          <input
                            value={emp.name}
                            onChange={(e) => setRoster(d, roster.map((x) => (x.id === emp.id ? { ...x, name: e.target.value } : x)))}
                            placeholder={`${mode === "leaders" ? "Leader" : "Person"} ${i + 1}`}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#00badc] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setRoster(d, roster.filter((x) => x.id !== emp.id))}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            aria-label="Remove person"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRoster(d, [...roster, makeEmployee("", mode === "leaders")])}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[#0089a3] transition-colors hover:bg-[#00badc]/10"
                  >
                    <UserPlus className="h-4 w-4" /> Add {mode === "leaders" ? "leader" : "person"}
                  </button>
                </div>
                )
              })()}
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[#0089a3] transition-colors hover:bg-[#00badc]/10"
        >
          <Plus className="h-4 w-4" /> Add department
        </button>
        <div className="flex items-center gap-5 px-1 text-sm tabular-nums">
          <span className="text-slate-600">Today <span className="font-semibold text-slate-900">{totalCurrent}</span></span>
          <span className="text-slate-600">Future <span className="font-semibold text-[#0089a3]">{totalFuture}</span></span>
        </div>
      </div>
    </div>
  )
}
