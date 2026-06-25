"use client"

import {
  Briefcase, Building2, Lightbulb, Stethoscope, ShoppingBag, Wrench, Scale,
  Users, Calendar, Home, Phone, Presentation, Coffee, Sparkles, TrendingUp,
  Minus, Check, type LucideIcon,
} from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase, building: Building2, lightbulb: Lightbulb,
  stethoscope: Stethoscope, "shopping-bag": ShoppingBag, wrench: Wrench,
  scale: Scale, users: Users, calendar: Calendar, home: Home, phone: Phone,
  presentation: Presentation, coffee: Coffee, sparkles: Sparkles,
  "trending-up": TrendingUp, minus: Minus,
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
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/25 dark:hover:bg-white/[0.06]"
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
            selected
              ? "bg-[#00badc]/20 text-[#0096b3] dark:text-[#00badc]"
              : "bg-slate-100 text-slate-500 group-hover:text-slate-700 dark:bg-white/[0.06] dark:text-white/60 dark:group-hover:text-white/80"
          }`}
        >
          <Icon className="h-6 w-6" />
        </span>
      )}

      <span className="text-base font-semibold text-slate-900 dark:text-white">{label}</span>
      {description && <span className="text-sm text-slate-500 dark:text-white/55">{description}</span>}

      {stats && stats.length > 0 && (
        <span className="mt-1 flex flex-col gap-0.5">
          {stats.map((s) => (
            <span key={s} className="text-xs text-slate-400 dark:text-white/45">{s}</span>
          ))}
        </span>
      )}
    </button>
  )
}
