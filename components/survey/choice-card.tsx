"use client"

import {
  Briefcase, Building2, Lightbulb, Stethoscope, ShoppingBag, Wrench, Scale,
  Users, Calendar, Home, Phone, Presentation, Coffee, Sparkles, TrendingUp,
  Minus, Check, UserCheck, Shuffle, Printer, Box, Heart, Recycle, type LucideIcon,
} from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase, building: Building2, lightbulb: Lightbulb,
  stethoscope: Stethoscope, "shopping-bag": ShoppingBag, wrench: Wrench,
  scale: Scale, users: Users, calendar: Calendar, home: Home, phone: Phone,
  presentation: Presentation, coffee: Coffee, sparkles: Sparkles,
  "trending-up": TrendingUp, minus: Minus, "user-check": UserCheck,
  shuffle: Shuffle, printer: Printer, box: Box, heart: Heart, recycle: Recycle,
}

/**
 * Big chunky selectable card — the survey's primary choice affordance. Icon +
 * title + description (+ optional stat lines), with a clear cyan selected state.
 */
export function ChoiceCard({
  icon,
  label,
  description,
  stats,
  selected,
  onClick,
}: {
  icon?: string
  label: string
  description?: string
  stats?: string[]
  selected: boolean
  onClick: () => void
}) {
  const Icon = icon ? ICONS[icon] : undefined

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative flex w-full flex-col items-center gap-1.5 rounded-xl border p-3.5 text-center transition-all sm:gap-3 sm:rounded-2xl sm:p-6 ${
        selected
          ? "border-[#00badc] bg-[#00badc]/10 shadow-[0_0_0_1px_#00badc]"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100"
      }`}
    >
      {selected && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#00badc] text-slate-900">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}

      {Icon && (
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors sm:h-12 sm:w-12 ${
            selected ? "bg-[#00badc]/20 text-[#0089a3]" : "bg-slate-100 text-slate-600 group-hover:text-slate-700"
          }`}
        >
          <Icon className="h-4.5 w-4.5 sm:h-6 sm:w-6" />
        </span>
      )}

      <span className="text-sm font-semibold text-slate-900 sm:text-base">{label}</span>
      {description && <span className="text-xs text-slate-500 sm:text-sm">{description}</span>}

      {stats && stats.length > 0 && (
        <span className="mt-1 flex flex-col gap-0.5">
          {stats.map((s) => (
            <span key={s} className="text-[11px] text-slate-500 sm:text-xs">{s}</span>
          ))}
        </span>
      )}
    </button>
  )
}
