"use client"

import {
  Check, Users, Presentation, Phone, Coffee, Printer, Box, Heart, Building2,
  type LucideIcon,
} from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  users: Users, presentation: Presentation, phone: Phone, coffee: Coffee,
  printer: Printer, box: Box, heart: Heart, building: Building2,
}

/**
 * Chunky, list-view space row showing the engine's SF + planning ratio, with a
 * select toggle. Used for support + collaboration selection so respondents see
 * what each space costs and how we size it. Optional trailing slot (e.g. counts).
 */
export function SpaceListRow({
  icon,
  label,
  sfEach,
  capacity,
  ratio,
  selected,
  onToggle,
  today,
  onTodayChange,
  children,
}: {
  icon: string
  label: string
  sfEach: number
  capacity?: number
  ratio: string
  selected: boolean
  onToggle: () => void
  /** Optional "how many exist today" count, shown when selected. */
  today?: number
  onTodayChange?: (n: number) => void
  children?: React.ReactNode
}) {
  const Icon = ICONS[icon] ?? Box
  return (
    <div
      className={`rounded-xl border transition-colors ${
        selected ? "border-[#00badc]/50 bg-[#00badc]/[0.06]" : "border-white/10 bg-white/[0.03] hover:border-white/20"
      }`}
    >
      <button type="button" onClick={onToggle} aria-pressed={selected} className="flex w-full items-center gap-4 px-5 py-4 text-left">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
            selected ? "bg-[#00badc]/20 text-[#00badc]" : "bg-white/[0.06] text-white/55"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-white">{label}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/45">
            <span className="tabular-nums">{sfEach.toLocaleString()} SF{capacity ? ` · seats ${capacity}` : ""}</span>
            <span className="text-white/25">•</span>
            <span>{ratio}</span>
          </span>
        </span>

        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            selected ? "border-[#00badc] bg-[#00badc] text-slate-900" : "border-white/25"
          }`}
        >
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      </button>
      {selected && onTodayChange && (
        <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-5 py-2.5">
          <span className="text-xs text-white/50">How many do you have today?</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onTodayChange(Math.max(0, (today ?? 0) - 1))}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.06] text-white/70 hover:bg-white/10"
            >−</button>
            <span className="w-7 text-center text-sm font-semibold tabular-nums text-white">{today ?? 0}</span>
            <button
              type="button"
              onClick={() => onTodayChange((today ?? 0) + 1)}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.06] text-white/70 hover:bg-white/10"
            >+</button>
          </div>
        </div>
      )}
      {selected && children}
    </div>
  )
}
