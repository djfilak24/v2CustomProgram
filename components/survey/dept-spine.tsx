"use client"

import { Plus, Trash2, TrendingUp, TrendingDown, Minus as MinusIcon } from "lucide-react"
import { Stepper } from "./stepper"
import { makeDept, type SpineDept } from "@/lib/survey/sections"

/**
 * The department spine editor (SURVEY_SPEC §3) — entered once in Section 1 and
 * carried into every later step. Each row is name + current headcount + future
 * (3–5 yr) headcount, so growth is captured per department: some grow, some
 * shrink. This is what makes "Go deeper" actually do something.
 */
export function DeptSpine({
  departments,
  onChange,
}: {
  departments: SpineDept[]
  onChange: (next: SpineDept[]) => void
}) {
  const update = (id: string, patch: Partial<SpineDept>) =>
    onChange(departments.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  const remove = (id: string) => onChange(departments.filter((d) => d.id !== id))
  const add = () => onChange([...departments, makeDept()])

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
          return (
            <div key={d.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
              <input
                value={d.name}
                onChange={(e) => update(d.id, { name: e.target.value })}
                placeholder="Department name"
                className="rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#00badc] focus:outline-none"
              />
              <Stepper value={d.headcount} onChange={(n) => update(d.id, { headcount: n })} />
              <div className="flex items-center gap-1.5">
                <Stepper
                  value={future}
                  onChange={(n) => update(d.id, { futureHeadcount: n })}
                />
                <span className="flex w-7 justify-center" title={`${delta >= 0 ? "+" : ""}${delta} vs today`}>
                  {delta > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  ) : delta < 0 ? (
                    <TrendingDown className="h-3.5 w-3.5 text-amber-400" />
                  ) : (
                    <MinusIcon className="h-3.5 w-3.5 text-white/25" />
                  )}
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
          <span className="text-white/60">
            Today <span className="font-semibold text-white">{totalCurrent}</span>
          </span>
          <span className="text-white/60">
            Future <span className="font-semibold text-[#00badc]">{totalFuture}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
