"use client"

import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from "recharts"
import { PROFILE_AXES, type ProfileScores } from "@/lib/survey/sections"

/**
 * Live "Workplace Profile" radar — builds a profile unique to the respondent as
 * they answer. recharts needs explicit colors, so we switch them on `dark`.
 */
export function WorkplaceProfile({ scores, dark }: { scores: ProfileScores; dark: boolean }) {
  const data = PROFILE_AXES.map((axis) => ({ axis, value: scores[axis] }))
  const grid = dark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)"
  const tick = dark ? "rgba(255,255,255,0.65)" : "#64748b"

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none dark:backdrop-blur-sm">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">Workplace Profile</h3>

      <div className="mt-4 h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke={grid} />
            <PolarAngleAxis dataKey="axis" tick={{ fill: tick, fontSize: 11 }} />
            <Radar dataKey="value" stroke="#00badc" fill="#00badc" fillOpacity={0.35} isAnimationActive animationDuration={400} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-4 space-y-2">
        {PROFILE_AXES.map((axis) => (
          <li key={axis} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-600 dark:text-white/70">
              <span className="h-2 w-2 rounded-full bg-[#00badc]" />
              {axis}
            </span>
            <span className="tabular-nums font-medium text-slate-900 dark:text-white">{scores[axis].toFixed(1)}/10</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-slate-400 dark:text-white/45">
        This profile updates as you answer — it reflects the workplace strategy
        priorities we&apos;ll design your program around.
      </p>
    </div>
  )
}
