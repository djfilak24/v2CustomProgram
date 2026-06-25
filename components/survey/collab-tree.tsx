"use client"

import { Check, ChevronDown } from "lucide-react"
import { PerDeptRows } from "./per-dept-rows"
import { COLLAB_TYPES, type Lane, type SpineDept } from "@/lib/survey/sections"
import { ChoiceCard } from "./choice-card"

/**
 * The collaboration decision tree (SURVEY_SPEC §3b) — the showcase interaction.
 * Quick lane: tap the shared-space types you use. Go deeper: each selected type
 * expands into per-department count rows (departments pre-pulled from the spine),
 * so "Set a count per type, per department" is a real pathway, not a promise.
 */
export function CollabTree({
  lane,
  departments,
  selected,
  byDept,
  onToggleType,
  onChangeCounts,
}: {
  lane: Lane
  departments: SpineDept[]
  selected: string[]
  byDept: Record<string, Record<string, number>>
  onToggleType: (typeId: string) => void
  onChangeCounts: (typeId: string, counts: Record<string, number>) => void
}) {
  if (lane === "quick") {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {COLLAB_TYPES.map((t) => (
          <ChoiceCard
            key={t.id}
            icon={t.icon}
            label={t.label}
            description={t.description}
            selected={selected.includes(t.id)}
            onClick={() => onToggleType(t.id)}
          />
        ))}
      </div>
    )
  }

  // Detailed: selectable rows, each expanding to per-department count steppers.
  return (
    <div className="space-y-3">
      {COLLAB_TYPES.map((t) => {
        const isOn = selected.includes(t.id)
        const counts = byDept[t.id] ?? {}
        const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0)
        return (
          <div
            key={t.id}
            className={`overflow-hidden rounded-xl border transition-colors ${
              isOn ? "border-[#00badc]/40 bg-[#00badc]/[0.05]" : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <button
              type="button"
              onClick={() => onToggleType(t.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="flex items-center gap-3">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                    isOn ? "border-[#00badc] bg-[#00badc] text-slate-900" : "border-white/25"
                  }`}
                >
                  {isOn && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{t.label}</span>
                  {t.description && <span className="block text-xs text-white/45">{t.description}</span>}
                </span>
              </span>
              <span className="flex items-center gap-2">
                {isOn && total > 0 && (
                  <span className="rounded-full bg-[#00badc]/15 px-2 py-0.5 text-xs font-medium tabular-nums text-[#00badc]">
                    {total} total
                  </span>
                )}
                {isOn && <ChevronDown className="h-4 w-4 text-white/40" />}
              </span>
            </button>

            {isOn && (
              <div className="border-t border-white/10 px-4 py-3">
                <p className="mb-2 text-xs text-white/45">How many for each department?</p>
                <PerDeptRows
                  departments={departments}
                  values={counts}
                  onChange={(next) => onChangeCounts(t.id, next)}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
