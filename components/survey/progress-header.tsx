"use client"

import Image from "next/image"

/**
 * Sticky survey chrome: NELSON brand, the discovery title, and the always-visible
 * progress bar (section label + Step X of N + %). Respondents always know where
 * they are relative to done.
 */
export function ProgressHeader({
  section,
  stepIndex,
  totalSteps,
}: {
  section: string
  stepIndex: number
  totalSteps: number
}) {
  const pct = Math.round(((stepIndex + 1) / totalSteps) * 100)

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b1830]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-3">
          <Image src="/nelson-logo.svg" alt="NELSON" width={104} height={24} className="h-6 w-auto" priority />
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-white">Workplace Strategy Discovery</div>
          <div className="text-xs text-white/50">
            Step {stepIndex + 1} of {totalSteps}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-white/70">{section}</span>
          <span className="tabular-nums text-white/50">{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#00badc] transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </header>
  )
}
