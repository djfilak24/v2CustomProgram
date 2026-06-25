"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, ArrowRight, ArrowDown, Sparkles, MessageCircle, Check, Sun, Moon,
} from "lucide-react"
import {
  SURVEY_STEPS, computeProfile, buildSurveyResult, type Answer, type Lane,
} from "@/lib/survey/sections"
import { saveSurveySeed } from "@/lib/survey/seedStorage"
import { ProgressHeader } from "@/components/survey/progress-header"
import { WorkplaceProfile } from "@/components/survey/workplace-profile"
import { LaneToggle } from "@/components/survey/lane-toggle"
import { ChoiceCard } from "@/components/survey/choice-card"
import { ChoiceRow } from "@/components/survey/choice-row"

type Phase = "hero" | "survey" | "done"
type Theme = "light" | "dark"

export default function SurveyPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("hero")
  const [theme, setTheme] = useState<Theme>("light")
  const [stepIndex, setStepIndex] = useState(0)
  const [lane, setLane] = useState<Lane>("quick")
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [deferred, setDeferred] = useState<Set<string>>(new Set())

  const steps = SURVEY_STEPS
  const step = steps[stepIndex]
  const scores = useMemo(() => computeProfile(steps, answers), [steps, answers])
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"))

  const setAnswer = (id: string, a: Answer) => setAnswers((p) => ({ ...p, [id]: a }))

  const toggleCard = (optId: string) => {
    const current = (answers[step.id] as Extract<Answer, { kind: "cards" }>)?.selected ?? []
    const next = step.multi
      ? current.includes(optId) ? current.filter((x) => x !== optId) : [...current, optId]
      : [optId]
    setAnswer(step.id, { kind: "cards", selected: next })
    clearDefer(step.id)
  }
  const setRadio = (choice: string) => {
    const prev = answers[step.id] as Extract<Answer, { kind: "radio-number" }> | undefined
    setAnswer(step.id, { kind: "radio-number", choice, count: prev?.count ?? null })
    clearDefer(step.id)
  }
  const setCount = (count: number | null) => {
    const prev = answers[step.id] as Extract<Answer, { kind: "radio-number" }> | undefined
    setAnswer(step.id, { kind: "radio-number", choice: prev?.choice ?? null, count })
  }
  const setNumber = (value: number | null) => {
    setAnswer(step.id, { kind: "number", value })
    clearDefer(step.id)
  }

  const clearDefer = (id: string) =>
    setDeferred((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev); next.delete(id); return next
    })
  const deferStep = () => {
    setDeferred((prev) => new Set(prev).add(step.id))
    setAnswers((prev) => { const n = { ...prev }; delete n[step.id]; return n })
    goNext()
  }

  const finish = () => {
    // Build the structured result and hand it to the tool (zero-backend).
    saveSurveySeed(buildSurveyResult(answers, [...deferred]))
    setPhase("done")
  }
  const goNext = () => {
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1)
    else finish()
  }
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1))

  const wrap = (node: React.ReactNode) => (
    <div className={theme === "dark" ? "dark" : ""}>{node}</div>
  )

  if (phase === "hero")
    return wrap(<Hero onBegin={() => setPhase("survey")} theme={theme} onToggleTheme={toggleTheme} />)
  if (phase === "done")
    return wrap(<Done deferredCount={deferred.size} onSeeProgram={() => router.push("/")} />)

  const answer = answers[step.id]
  const cardSelected = (optId: string) => answer?.kind === "cards" && answer.selected.includes(optId)
  const radioChoice = answer?.kind === "radio-number" ? answer.choice : null
  const radioCount = answer?.kind === "radio-number" ? answer.count : null
  const numberValue = answer?.kind === "number" ? answer.value : null

  return wrap(
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1830] dark:bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(0,186,220,0.10),transparent)] dark:text-white">
      <ProgressHeader
        section={step.section}
        stepIndex={stepIndex}
        totalSteps={steps.length}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{step.title}</h1>
              <p className="mt-2 text-slate-500 dark:text-white/55">{step.subtitle}</p>
            </div>
            <LaneToggle lane={lane} onChange={setLane} />
          </div>

          {lane === "detailed" && step.detailedHint && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-[#00badc]/40 bg-[#00badc]/[0.08] px-4 py-3 text-sm text-slate-700 dark:text-white/75">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#0096b3] dark:text-[#00badc]" />
              <span><span className="font-semibold text-slate-900 dark:text-white">Go deeper:</span> {step.detailedHint}</span>
            </div>
          )}

          {step.kind === "cards" && (
            <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {step.options!.map((opt) => (
                <ChoiceCard
                  key={opt.id} icon={opt.icon} label={opt.label} description={opt.description}
                  stats={opt.stats} selected={cardSelected(opt.id)} onClick={() => toggleCard(opt.id)}
                />
              ))}
            </div>
          )}

          {step.kind === "radio-number" && (
            <div className="mt-7 space-y-3">
              {step.options!.map((opt) => (
                <ChoiceRow key={opt.id} label={opt.label} selected={radioChoice === opt.id} onClick={() => setRadio(opt.id)} />
              ))}
              {radioChoice === "yes" && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <label className="text-sm font-medium text-slate-600 dark:text-white/70">{step.followupLabel}</label>
                  <NumberInput value={radioCount} onChange={setCount} placeholder="Enter number" />
                </div>
              )}
            </div>
          )}

          {step.kind === "number" && (
            <div className="mt-7 max-w-sm">
              <label className="text-sm font-medium text-slate-600 dark:text-white/70">{step.numberLabel}</label>
              <NumberInput value={numberValue} onChange={setNumber} placeholder={step.numberPlaceholder} large />
            </div>
          )}

          <div className="mt-9 flex items-center justify-between border-t border-slate-200 pt-6 dark:border-white/10">
            <button
              type="button" onClick={goBack} disabled={stepIndex === 0}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 dark:text-white/60 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button" onClick={deferStep}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-700 dark:text-white/50 dark:hover:text-white/80"
                title="We'll cover this together in the live session"
              >
                <MessageCircle className="h-4 w-4" /> We'll talk live
              </button>
              <button
                type="button" onClick={goNext}
                className="inline-flex items-center gap-2 rounded-lg bg-[#00badc] px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#2fd0ee]"
              >
                {stepIndex === steps.length - 1 ? "Finish" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-32">
            <WorkplaceProfile scores={scores} dark={theme === "dark"} />
          </div>
        </aside>
      </main>
    </div>,
  )
}

function NumberInput({
  value, onChange, placeholder, large,
}: {
  value: number | null
  onChange: (n: number | null) => void
  placeholder?: string
  large?: boolean
}) {
  return (
    <input
      type="number" min={0} value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
      placeholder={placeholder}
      className={`mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-[#00badc] focus:outline-none focus:ring-2 focus:ring-[#00badc]/30 dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/30 ${
        large ? "py-3 text-2xl font-semibold tabular-nums" : "py-2.5"
      }`}
    />
  )
}

function ThemeToggle({ theme, onToggle, light }: { theme: Theme; onToggle: () => void; light?: boolean }) {
  return (
    <button
      type="button" onClick={onToggle} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
        light
          ? "border-white/20 bg-white/10 text-white/80 hover:bg-white/20"
          : "border-slate-200 bg-white text-slate-500 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/70 dark:hover:text-white"
      }`}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

function Hero({ onBegin, theme, onToggleTheme }: { onBegin: () => void; theme: Theme; onToggleTheme: () => void }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-900 text-white">
      {/* Office image speaks — a neutral (non-blue) scrim keeps text legible
          without diluting the space's own palette. */}
      <Image src="/office-2.jpg" alt="" fill priority className="pointer-events-none object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/75" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-3">
            <Image src="/nelson-logo.svg" alt="NELSON" width={110} height={26} className="h-6 w-auto brightness-0 invert" priority />
            <span className="text-white/30">|</span>
            <span className="text-sm font-medium text-white/80">Workplace Strategy Discovery</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} light />
            <button className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-white/20">
              Save &amp; Continue Later
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
          <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-[#00badc]" /> 3–5 minutes
          </span>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight drop-shadow-sm sm:text-6xl">
            Let&apos;s understand your <span className="text-[#22d3ee]">workplace vision</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/85 drop-shadow-sm">
            This short experience helps us understand your team&apos;s goals and realities.
            There are no wrong answers — just honest insights.
          </p>
          <button
            onClick={onBegin}
            className="mt-9 inline-flex items-center gap-2 rounded-xl bg-[#00badc] px-7 py-3.5 text-base font-semibold text-slate-900 shadow-lg shadow-[#00badc]/25 transition-all hover:bg-[#2fd0ee]"
          >
            Let&apos;s begin <ArrowDown className="h-4 w-4" />
          </button>
          <p className="mt-6 text-xs text-white/60">
            Don&apos;t know an answer? Defer it — we&apos;ll cover it together live.
          </p>
        </div>
      </div>
    </div>
  )
}

function Done({ deferredCount, onSeeProgram }: { deferredCount: number; onSeeProgram: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center text-slate-900 dark:bg-[#0b1830] dark:bg-[radial-gradient(1000px_500px_at_50%_-10%,rgba(0,186,220,0.12),transparent)] dark:text-white">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00badc]/15 text-[#0096b3] dark:text-[#00badc]">
        <Check className="h-8 w-8" strokeWidth={2.5} />
      </span>
      <h1 className="mt-6 text-4xl font-bold tracking-tight">That&apos;s a great head start</h1>
      <p className="mt-4 max-w-lg text-slate-600 dark:text-white/65">
        Your answers will pre-populate your program so we walk into the live session
        validating a real starting point — not starting from zero.
        {deferredCount > 0 && (
          <> We flagged <span className="font-semibold text-slate-900 dark:text-white">{deferredCount}</span> item{deferredCount > 1 ? "s" : ""} to cover together.</>
        )}
      </p>
      <button
        onClick={onSeeProgram}
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#00badc] px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#2fd0ee]"
      >
        See your starting program <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}
