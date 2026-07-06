"use client"

import { COLLAB_BUILD_OPTIONS, COLLAB_MONITOR_OPTIONS, type Lane } from "@/lib/survey/sections"
import { COLLAB_CATALOG } from "@/lib/survey/catalog"
import { SpaceListRow } from "./space-list-row"

/**
 * Collaboration selection. Both lanes use the same chunky rows (icon + SF +
 * ratio) with a "how many today" count. The detailed lane adds per-type
 * CONFIGURATION — how the room is set up (built-in vs. floating furniture,
 * monitor) — rather than per-department counts (the engine derives counts from
 * ratios; how they're set up is what we actually need from the client).
 */
export function CollabTree({
  lane,
  selected,
  config,
  onToggleType,
  onChangeConfig,
  existing,
  onChangeExisting,
}: {
  lane: Lane
  selected: string[]
  config: Record<string, { build?: string; monitor?: string; notes?: string }>
  onToggleType: (typeId: string) => void
  onChangeConfig: (typeId: string, patch: { build?: string; monitor?: string; notes?: string }) => void
  existing: Record<string, number>
  onChangeExisting: (typeId: string, n: number) => void
}) {
  return (
    <div className={`grid gap-2.5 ${lane === "detailed" ? "" : "lg:grid-cols-2"}`}>
      {COLLAB_CATALOG.map((t) => {
        const isOn = selected.includes(t.id)
        const cfg = config[t.id] ?? {}
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
              <div className="space-y-3 border-t border-white/[0.07] px-5 py-3.5">
                <ChipRow
                  label="Setup"
                  options={COLLAB_BUILD_OPTIONS}
                  value={cfg.build}
                  onChange={(build) => onChangeConfig(t.id, { build })}
                />
                <ChipRow
                  label="Monitor"
                  options={COLLAB_MONITOR_OPTIONS}
                  value={cfg.monitor}
                  onChange={(monitor) => onChangeConfig(t.id, { monitor })}
                />
                <div className="flex items-start gap-2">
                  <span className="w-16 shrink-0 pt-1.5 text-xs font-medium uppercase tracking-wide text-white/40">Custom</span>
                  <input
                    value={cfg.notes ?? ""}
                    onChange={(e) => onChangeConfig(t.id, { notes: e.target.value })}
                    placeholder="Anything specific — AV, layout, furniture, criteria…"
                    className="w-full rounded-lg border border-white/12 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-[#00badc] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </SpaceListRow>
        )
      })}
    </div>
  )
}

function ChipRow({
  label, options, value, onChange,
}: {
  label: string
  options: { id: string; label: string }[]
  value?: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide text-white/40">{label}</span>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            value === o.id
              ? "border-[#00badc] bg-[#00badc]/15 text-white"
              : "border-white/12 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
