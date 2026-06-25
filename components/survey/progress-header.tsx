"use client"

import Image from "next/image"
import { Sun, Moon } from "lucide-react"

/**
 * Sticky survey chrome: NELSON brand, the discovery title, a light/dark toggle,
 * and the always-visible progress bar (section · Step X of N · %).
 */
export function ProgressHeader({
  section,
  stepIndex,
  totalSteps,
  theme,
  onToggleTheme,
}: {
  section: string
  stepIndex: number
  totalSteps: number
  theme: "light" | "dark"
  onToggleTheme: () => void
}) {
  const pct = Math.round(((stepIndex + 1) / totalSteps) * 100)

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur-md dark:border-white/10 dark:bg-[#0b1830]/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <Image
          src="/nelson-logo.svg" alt="NELSON" width={104} height={24}
          className="h-6 w-auto dark:brightness-0 dark:invert" priority
        />
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Workplace Strategy Discovery</div>
            <div className="text-xs text-slate-400 dark:text-white/50">Step {stepIndex + 1} of {totalSteps}</div>
          </div>
          <button
            type="button" onClick={onToggleTheme}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/70 dark:hover:text-white"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600 dark:text-white/70">{section}</span>
          <span className="tabular-nums text-slate-400 dark:text-white/50">{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div className="h-full rounded-full bg-[#00badc] transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </header>
  )
}
