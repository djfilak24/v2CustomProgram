"use client"

import {
  Briefcase, Building2, Lightbulb, Stethoscope, ShoppingBag, Wrench, Scale,
  Users, Calendar, Home, Phone, Presentation, Coffee, Sparkles, TrendingUp,
  Minus, Check, UserCheck, Shuffle, Printer, Box, Heart, type LucideIcon,
} from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase, building: Building2, lightbulb: Lightbulb,
  stethoscope: Stethoscope, "shopping-bag": ShoppingBag, wrench: Wrench,
  scale: Scale, users: Users, calendar: Calendar, home: Home, phone: Phone,
  presentation: Presentation, coffee: Coffee, sparkles: Sparkles,
  "trending-up": TrendingUp, minus: Minus, "user-check": UserCheck,
  shuffle: Shuffle, printer: Printer, box: Box, heart: Heart,
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
      className={`group relative flex w-full flex-col items-center gap-3 rounded-2xl border p-6 text-center transition-all ${
        selected
          ? "border-[#00badc] bg-[#00badc]/10 shadow-[0_0_0_1px_#00badc]"
          : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
      }`}
    >
      {selected && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#00badc] text-slate-900">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}

      {Icon && (
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
            selected ? "bg-[#00badc]/20 text-[#00badc]" : "bg-white/[0.06] text-white/60 group-hover:text-white/80"
          }`}
        >
          <Icon className="h-6 w-6" />
        </span>
      )}

      <span className="text-base font-semibold text-white">{label}</span>
      {description && <span className="text-sm text-white/55">{description}</span>}

      {stats && stats.length > 0 && (
        <span className="mt-1 flex flex-col gap-0.5">
          {stats.map((s) => (
            <span key={s} className="text-xs text-white/45">{s}</span>
          ))}
        </span>
      )}
    </button>
  )
}
