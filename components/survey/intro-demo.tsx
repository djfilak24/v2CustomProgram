"use client"

import { Zap, SlidersHorizontal, MessageCircle, ArrowRight, X } from "lucide-react"

/**
 * Intro demo overlay — shown once when the respondent lands in the survey. It
 * explains the three lanes (SURVEY_SPEC §2 + §7) and, crucially, the IMPACT each
 * has on their experience and the resulting program, so "Quick vs. Go deeper vs.
 * We'll talk live" is a deliberate choice rather than a mystery toggle.
 */
export function IntroDemo({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060e1d]/80 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 text-slate-400 transition-colors hover:text-slate-900"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-slate-200 px-7 pb-5 pt-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#00badc]/30 bg-[#00badc]/10 px-3 py-1 text-xs font-medium text-[#0089a3]">
            How this works
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            Answer at the depth that suits you
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Every question gives you three ways to answer. The more you share now,
            the more accurate your starting program — and the faster the live session.
          </p>
        </div>

        <div className="space-y-3 px-7 py-6">
          <LaneRow
            icon={<Zap className="h-4 w-4" />}
            title="Quick"
            time="seconds"
            body="One tap or a single number, company-wide. Completes the whole survey in about 5 minutes."
          />
          <LaneRow
            icon={<SlidersHorizontal className="h-4 w-4" />}
            title="Go deeper"
            time="optional"
            body="Break an answer down by department — per-team headcount, seats, and collaboration counts. More homework, sharper program."
            accent
          />
          <LaneRow
            icon={<MessageCircle className="h-4 w-4" />}
            title="We'll talk live"
            time="anytime"
            body="Not sure yet? Defer any question and we'll cover it together. It's never a wrong answer."
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-7 py-5">
          <p className="text-xs text-slate-400">
            You can switch lanes on any question.
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center gap-2 rounded-xl bg-[#00badc] px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#2fd0ee]"
          >
            Got it, let&apos;s begin <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function LaneRow({
  icon,
  title,
  time,
  body,
  accent = false,
}: {
  icon: React.ReactNode
  title: string
  time: string
  body: string
  accent?: boolean
}) {
  return (
    <div
      className={`flex gap-3 rounded-xl border p-3.5 ${
        accent ? "border-[#00badc]/35 bg-[#00badc]/[0.06]" : "border-slate-200 bg-white"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          accent ? "bg-[#00badc]/20 text-[#0089a3]" : "bg-slate-100 text-slate-600"
        }`}
      >
        {icon}
      </span>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {time}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
      </div>
    </div>
  )
}
