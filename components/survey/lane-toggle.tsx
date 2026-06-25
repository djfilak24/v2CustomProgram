"use client"

import { Zap, SlidersHorizontal } from "lucide-react"
import type { Lane } from "@/lib/survey/sections"

/**
 * Quick Setup / Detailed Config segmented control — the survey's expression of
 * the Quick / Detailed lanes (SURVEY_SPEC §2). Everyone starts in Quick; the
 * Detailed lane is always visibly offered, never hidden.
 */
export function LaneToggle({
  lane,
  onChange,
}: {
  lane: Lane
  onChange: (lane: Lane) => void
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1">
      <LaneButton active={lane === "quick"} onClick={() => onChange("quick")} icon={<Zap className="h-3.5 w-3.5" />}>
        Quick
      </LaneButton>
      <LaneButton active={lane === "detailed"} onClick={() => onChange("detailed")} icon={<SlidersHorizontal className="h-3.5 w-3.5" />}>
        Go deeper
      </LaneButton>
    </div>
  )
}

function LaneButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-[#00badc] text-slate-900" : "text-white/60 hover:text-white"
      }`}
    >
      {icon}
      {children}
    </button>
  )
}
