"use client"

import { Minus, Plus } from "lucide-react"

/**
 * Small ± number stepper used across the detailed-lane editors (per-dept days,
 * dedicated seats, office counts, collaboration counts). Shift-click steps by 10.
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  suffix,
}: {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  suffix?: string
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n))
  const step = (delta: number, e: React.MouseEvent) => {
    const mult = e.shiftKey ? 10 : 1
    onChange(clamp(value + delta * mult))
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={(e) => step(-1, e)}
        className="flex h-8 w-8 items-center justify-center rounded-l-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        aria-label="Decrease"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(clamp(e.target.value === "" ? min : Number(e.target.value)))}
        className="w-12 bg-transparent text-center text-sm font-medium tabular-nums text-slate-900 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && <span className="pr-1 text-xs text-slate-400">{suffix}</span>}
      <button
        type="button"
        onClick={(e) => step(1, e)}
        className="flex h-8 w-8 items-center justify-center rounded-r-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        aria-label="Increase"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
