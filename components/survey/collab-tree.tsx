"use client"

import { useState } from "react"
import { COLLAB_BUILD_OPTIONS, COLLAB_MONITOR_OPTIONS, type Lane } from "@/lib/survey/sections"
import { COLLAB_CATALOG, type CatalogSpace } from "@/lib/survey/catalog"
import { SpaceListRow } from "./space-list-row"
import { SpaceDetailModal } from "./space-detail-modal"

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
  const [detail, setDetail] = useState<CatalogSpace | null>(null)
  return (
    <div className={`grid gap-2.5 ${lane === "detailed" ? "" : "lg:grid-cols-2"}`}>
      {detail && <SpaceDetailModal space={detail} onClose={() => setDetail(null)} />}
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
            onInfo={() => setDetail(t)}
          >
            {lane === "detailed" && (
              <div className="space-y-3 border-t border-slate-100 px-5 py-3.5">
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
                  <span className="w-16 shrink-0 pt-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Custom</span>
                  <input
                    value={cfg.notes ?? ""}
                    onChange={(e) => onChangeConfig(t.id, { notes: e.target.value })}
                    placeholder="Anything specific — AV, layout, furniture, criteria…"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#00badc] focus:outline-none"
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
      <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            value === o.id
              ? "border-[#00badc] bg-[#00badc]/15 text-slate-900"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
