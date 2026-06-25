"use client"

import { Check } from "lucide-react"

/** Radio-style pill row — used for single-choice questions (e.g. private offices). */
export function ChoiceRow({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-xl border px-5 py-4 text-left transition-all ${
        selected
          ? "border-[#00badc] bg-[#00badc]/10"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/25 dark:hover:bg-white/[0.06]"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          selected ? "border-[#00badc] bg-[#00badc] text-slate-900" : "border-slate-300 dark:border-white/30"
        }`}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="text-[15px] font-medium text-slate-800 dark:text-white/90">{label}</span>
    </button>
  )
}
