"use client"

import { useEffect, useState } from "react"
import { Minus, Plus } from "lucide-react"
import { Slider } from "@/components/ui/slider"

interface NumericSliderInputProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  /** What to display in the editable number input. Defaults to value. */
  displayValue?: number
  /** Suffix appended to the displayed value, e.g. "%" or "days". */
  suffix?: string
  /** Prefix prepended to the displayed value, e.g. "$". */
  prefix?: string
  /** Optional helper text shown below the slider. */
  helperText?: string
  /** When true, render integer ticks for each value between min and max. */
  showTicks?: boolean
  onChange: (value: number) => void
}

/**
 * Numeric input combining a slider, an editable number field with +/- buttons,
 * and an optional helper line. Designed for the Fast Track adjust-inputs panel.
 */
export function NumericSliderInput({
  label,
  value,
  min,
  max,
  step = 1,
  displayValue,
  suffix,
  prefix,
  helperText,
  showTicks,
  onChange,
}: NumericSliderInputProps) {
  const numeric = displayValue ?? value
  const [draft, setDraft] = useState<string>(String(numeric))

  // Keep the draft text in sync with external value changes (e.g. slider drag).
  useEffect(() => {
    setDraft(String(numeric))
  }, [numeric])

  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  const commitDraft = () => {
    const parsed = Number.parseFloat(draft)
    if (Number.isFinite(parsed)) {
      onChange(clamp(parsed))
    } else {
      setDraft(String(numeric))
    }
  }

  const decrement = () => onChange(clamp(numeric - step))
  const increment = () => onChange(clamp(numeric + step))

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block">
        {label}
      </label>

      {/* Editable value with stepper buttons (left-aligned) */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={decrement}
          disabled={numeric <= min}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center gap-0.5 px-2 py-1 rounded-md border border-slate-200 bg-white focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100">
          {prefix ? (
            <span className="text-sm font-semibold text-slate-500">{prefix}</span>
          ) : null}
          <input
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur()
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                increment()
              } else if (e.key === "ArrowDown") {
                e.preventDefault()
                decrement()
              }
            }}
            className="w-12 text-sm font-bold text-slate-900 bg-transparent outline-none text-center tabular-nums"
            aria-label={label}
          />
          {suffix ? (
            <span className="text-xs font-medium text-slate-500">{suffix}</span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={increment}
          disabled={numeric >= max}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Slider */}
      <div className="pt-1">
        <Slider
          value={[clamp(numeric)]}
          onValueChange={([v]) => onChange(v)}
          min={min}
          max={max}
          step={step}
          className="w-full"
        />
        {showTicks ? (
          <div className="flex justify-between text-[10px] text-slate-400 px-0.5 mt-1">
            {Array.from({ length: max - min + 1 }).map((_, i) => {
              const tick = min + i
              return (
                <span
                  key={tick}
                  className={tick === numeric ? "font-bold text-teal-600" : ""}
                >
                  {tick}
                </span>
              )
            })}
          </div>
        ) : null}
        {helperText ? (
          <div className="text-[10px] text-slate-400 mt-1 px-0.5">{helperText}</div>
        ) : null}
      </div>
    </div>
  )
}
