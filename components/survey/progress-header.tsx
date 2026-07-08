"use client"

import Image from "next/image"
import { Check } from "lucide-react"
import { SURVEY_STEPS } from "@/lib/survey/sections"

/**
 * Sticky survey chrome: NELSON brand + a sectioned step tracker. Steps are
 * grouped by section, each rendered as a dot (done / current / upcoming) so the
 * respondent always sees where they are and what's ahead. Past steps are
 * clickable to jump back. Full-bleed on large screens.
 */
export function ProgressHeader({
  stepIndex,
  onJump,
}: {
  stepIndex: number
  onJump?: (index: number) => void
}) {
  const total = SURVEY_STEPS.length
  const pct = Math.round(((stepIndex + 1) / total) * 100)

  // Group consecutive steps by section, preserving each step's global index.
  const groups: { section: string; steps: { index: number }[] }[] = []
  SURVEY_STEPS.forEach((s, i) => {
    const last = groups[groups.length - 1]
    if (last && last.section === s.section) last.steps.push({ index: i })
    else groups.push({ section: s.section, steps: [{ index: i }] })
  })

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1760px] items-center justify-between gap-6 px-6 py-3.5 lg:px-10">
        <Image src="/nelson-logo.png" alt="NELSON" width={104} height={28} className="h-6 w-auto" priority />
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-900">Workplace Strategy Discovery</div>
          <div className="text-xs text-slate-500">Step {stepIndex + 1} of {total} · {pct}%</div>
        </div>
      </div>

      {/* Sectioned step tracker */}
      <div className="mx-auto max-w-[1760px] px-6 pb-3 lg:px-10">
        <div className="flex items-center gap-3 overflow-x-auto">
          {groups.map((g, gi) => {
            const groupActive = g.steps.some((s) => s.index === stepIndex)
            const groupDone = g.steps.every((s) => s.index < stepIndex)
            return (
              <div key={g.section} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                      groupActive ? "text-[#0089a3]" : groupDone ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    {g.section}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {g.steps.map(({ index }) => {
                      const done = index < stepIndex
                      const current = index === stepIndex
                      const clickable = onJump && index <= stepIndex
                      return (
                        <button
                          key={index}
                          type="button"
                          disabled={!clickable}
                          onClick={() => clickable && onJump?.(index)}
                          aria-label={`Step ${index + 1}: ${SURVEY_STEPS[index].title}`}
                          title={SURVEY_STEPS[index].title}
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                            current
                              ? "bg-[#00badc] text-slate-900 ring-4 ring-[#00badc]/20"
                              : done
                                ? "bg-[#00badc]/80 text-slate-900 hover:bg-[#00badc]"
                                : "bg-slate-100 text-slate-400"
                          } ${clickable ? "cursor-pointer" : "cursor-default"}`}
                        >
                          {done ? <Check className="h-3 w-3" strokeWidth={3} /> : index + 1}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {gi < groups.length - 1 && (
                  <span className={`h-px w-5 shrink-0 ${groupDone ? "bg-[#00badc]/50" : "bg-slate-100"}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </header>
  )
}
