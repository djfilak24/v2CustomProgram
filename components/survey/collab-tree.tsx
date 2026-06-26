"use client"

import { PerDeptRows } from "./per-dept-rows"
import { type Lane, type SpineDept } from "@/lib/survey/sections"
import { COLLAB_CATALOG } from "@/lib/survey/catalog"
import { SpaceListRow } from "./space-list-row"

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
  existing,
  onChangeExisting,
}: {
  lane: Lane
  departments: SpineDept[]
  selected: string[]
  byDept: Record<string, Record<string, number>>
  onToggleType: (typeId: string) => void
  onChangeCounts: (typeId: string, counts: Record<string, number>) => void
  existing: Record<string, number>
  onChangeExisting: (typeId: string, n: number) => void
}) {
  // Both lanes use the same chunky list rows (icon + SF + ratio). The detailed
  // lane additionally expands each selected type into per-department counts.
  return (
    <div className={`grid gap-2.5 ${lane === "detailed" ? "" : "lg:grid-cols-2"}`}>
      {COLLAB_CATALOG.map((t) => {
        const isOn = selected.includes(t.id)
        const counts = byDept[t.id] ?? {}
        const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0)
        return (
          <SpaceListRow
            key={t.id}
            icon={t.icon}
            label={t.label}
            sfEach={t.sfEach}
            capacity={t.capacity}
            ratio={t.ratio}
            selected={isOn}
            onToggle={() => onToggleType(t.id)}
            today={existing[t.id]}
            onTodayChange={(n) => onChangeExisting(t.id, n)}
          >
            {lane === "detailed" && (
              <div className="border-t border-white/10 px-5 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs text-white/45">How many for each department?</p>
                  {total > 0 && (
                    <span className="rounded-full bg-[#00badc]/15 px-2 py-0.5 text-xs font-medium tabular-nums text-[#00badc]">
                      {total} total
                    </span>
                  )}
                </div>
                <PerDeptRows
                  departments={departments}
                  values={counts}
                  onChange={(next) => onChangeCounts(t.id, next)}
                />
              </div>
            )}
          </SpaceListRow>
        )
      })}
    </div>
  )
}
