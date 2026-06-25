"use client"

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts"
import { PROFILE_AXES, type ProfileScores } from "@/lib/survey/sections"

/**
 * Live "Workplace Profile" radar — builds a profile unique to the respondent
 * as they answer. Mirrors the inspiration's right-rail visualization.
 */
export function WorkplaceProfile({ scores }: { scores: ProfileScores }) {
  const data = PROFILE_AXES.map((axis) => ({ axis, value: scores[axis] }))

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
      <h3 className="text-base font-semibold text-white">Workplace Profile</h3>

      <div className="mt-4 h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="rgba(255,255,255,0.12)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 11 }}
            />
            <Radar
              dataKey="value"
              stroke="#00badc"
              fill="#00badc"
              fillOpacity={0.35}
              isAnimationActive
              animationDuration={400}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-4 space-y-2">
        {PROFILE_AXES.map((axis) => (
          <li key={axis} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-white/70">
              <span className="h-2 w-2 rounded-full bg-[#00badc]" />
              {axis}
            </span>
            <span className="tabular-nums font-medium text-white">
              {scores[axis].toFixed(1)}/10
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-white/45">
        This profile updates as you answer — it reflects the workplace strategy
        priorities we'll design your program around.
      </p>
    </div>
  )
}
