"use client"

import {
  Check, Users, Presentation, Phone, Coffee, Printer, Box, Heart, Building2, Info,
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
  onInfo,
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
  /** Opens the space drill-down (photo + how it's used). */
  onInfo?: () => void
  children?: React.ReactNode
}) {
  const Icon = ICONS[icon] ?? Box
  return (
    <div
      className={`rounded-xl border transition-colors ${
        selected ? "border-[#00badc]/50 bg-[#00badc]/[0.06]" : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <button type="button" onClick={onToggle} aria-pressed={selected} className="flex w-full items-center gap-4 px-5 py-4 text-left">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
            selected ? "bg-[#00badc]/20 text-[#0089a3]" : "bg-slate-100 text-slate-500"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-slate-900">{label}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
            <span className="tabular-nums">{sfEach.toLocaleString()} SF{capacity ? ` · seats ${capacity}` : ""}</span>
            <span className="text-slate-300">•</span>
            <span>{ratio}</span>
          </span>
        </span>

        {onInfo && (
          <span
            role="button"
            tabIndex={0}
            title={`Learn more about ${label}`}
            aria-label={`Learn more about ${label}`}
            onClick={(e) => { e.stopPropagation(); onInfo() }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onInfo() } }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-[#00badc]/10 hover:text-[#0089a3]"
          >
            <Info className="h-4 w-4" />
          </span>
        )}

        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            selected ? "border-[#00badc] bg-[#00badc] text-slate-900" : "border-slate-300"
          }`}
        >
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      </button>
      {selected && onTodayChange && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-2.5">
          <span className="text-xs text-slate-500">How many do you have today?</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onTodayChange(Math.max(0, (today ?? 0) - 1))}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-100"
            >−</button>
            <span className="w-7 text-center text-sm font-semibold tabular-nums text-slate-900">{today ?? 0}</span>
            <button
              type="button"
              onClick={() => onTodayChange((today ?? 0) + 1)}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-100"
            >+</button>
          </div>
        </div>
      )}
      {selected && children}
    </div>
  )
}
