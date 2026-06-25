"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft, ArrowRight, ArrowDown, Sparkles, MessageCircle, Check,
} from "lucide-react"
import {
  SURVEY_STEPS, computeProfile, type Answer, type Lane,
} from "@/lib/survey/sections"
import { ProgressHeader } from "@/components/survey/progress-header"
import { WorkplaceProfile } from "@/components/survey/workplace-profile"
import { LaneToggle } from "@/components/survey/lane-toggle"
import { ChoiceCard } from "@/components/survey/choice-card"
import { ChoiceRow } from "@/components/survey/choice-row"

type Phase = "hero" | "survey" | "done"

export default function SurveyPage() {
  const [phase, setPhase] = useState<Phase>("hero")
  const [stepIndex, setStepIndex] = useState(0)
  const [lane, setLane] = useState<Lane>("quick")
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [deferred, setDeferred] = useState<Set<string>>(new Set())

  const steps = SURVEY_STEPS
  const step = steps[stepIndex]
  const scores = useMemo(() => computeProfile(steps, answers), [steps, answers])

  const setAnswer = (id: string, a: Answer) =>
    setAnswers((prev) => ({ ...prev, [id]: a }))

  const toggleCard = (optId: string) => {
    const current = (answers[step.id] as Extract<Answer, { kind: "cards" }>)?.selected ?? []
    let next: string[]
    if (step.multi) {
      next = current.includes(optId) ? current.filter((x) => x !== optId) : [...current, optId]
    } else {
      next = [optId]
    }
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

  const clearDefer = (id: string) =>
    setDeferred((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })

  const deferStep = () => {
    setDeferred((prev) => new Set(prev).add(step.id))
    setAnswers((prev) => {
      const next = { ...prev }
      delete next[step.id]
      return next
    })
    goNext()
  }

  const goNext = () => {
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1)
    else setPhase("done")
  }
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1))

  if (phase === "hero") return <Hero onBegin={() => setPhase("survey")} />
  if (phase === "done") return <Done deferredCount={deferred.size} />

  const answer = answers[step.id]
  const cardSelected = (optId: string) =>
    answer?.kind === "cards" && answer.selected.includes(optId)
  const radioChoice = answer?.kind === "radio-number" ? answer.choice : null
  const radioCount = answer?.kind === "radio-number" ? answer.count : null

  return (
    <div className="min-h-screen bg-[#0b1830] bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(0,186,220,0.10),transparent)] text-white">
      <ProgressHeader section={step.section} stepIndex={stepIndex} totalSteps={steps.length} />

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1fr_360px]">
        {/* Question panel */}
        <div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{step.title}</h1>
              <p className="mt-2 text-white/55">{step.subtitle}</p>
            </div>
            <LaneToggle lane={lane} onChange={setLane} />
          </div>

          {lane === "detailed" && step.detailedHint && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-[#00badc]/30 bg-[#00badc]/[0.07] px-4 py-3 text-sm text-white/75">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#00badc]" />
              <span><span className="font-semibold text-white">Go deeper:</span> {step.detailedHint}</span>
            </div>
          )}

          {/* Card grid */}
          {step.kind === "cards" && (
            <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {step.options!.map((opt) => (
                <ChoiceCard
                  key={opt.id}
                  icon={opt.icon}
                  label={opt.label}
                  description={opt.description}
                  stats={opt.stats}
                  selected={cardSelected(opt.id)}
                  onClick={() => toggleCard(opt.id)}
                />
              ))}
            </div>
          )}

          {/* Radio + conditional number */}
          {step.kind === "radio-number" && (
            <div className="mt-7 space-y-3">
              {step.options!.map((opt) => (
                <ChoiceRow
                  key={opt.id}
                  label={opt.label}
                  selected={radioChoice === opt.id}
                  onClick={() => setRadio(opt.id)}
                />
              ))}
              {radioChoice === "yes" && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <label className="text-sm font-medium text-white/70">{step.followupLabel}</label>
                  <input
                    type="number"
                    min={0}
                    value={radioCount ?? ""}
                    onChange={(e) => setCount(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
                    placeholder="Enter number"
                    className="mt-2 w-full rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#00badc] focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Nav */}
          <div className="mt-9 flex items-center justify-between border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={deferStep}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:text-white/80"
                title="We'll cover this together in the live session"
              >
                <MessageCircle className="h-4 w-4" /> We'll talk live
              </button>
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-lg bg-[#00badc] px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#2fd0ee]"
              >
                {stepIndex === steps.length - 1 ? "Finish" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Live profile sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-32">
            <WorkplaceProfile scores={scores} />
          </div>
        </aside>
      </main>
    </div>
  )
}

function Hero({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1830] text-white">
      <Image src="/office-2.jpg" alt="" fill priority className="object-cover opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1830]/80 via-[#0b1830]/55 to-[#0b1830]/95" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-3">
            <Image src="/nelson-logo.svg" alt="NELSON" width={110} height={26} className="h-6 w-auto" priority />
            <span className="text-white/30">|</span>
            <span className="text-sm font-medium text-white/70">Workplace Strategy Discovery</span>
          </div>
          <button className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-sm transition-colors hover:bg-white/10">
            Save &amp; Continue Later
          </button>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/80 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-[#00badc]" /> 3–5 minutes
          </span>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Let&apos;s understand your{" "}
            <span className="text-[#00badc]">workplace vision</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/70">
            This short experience helps us understand your team&apos;s goals and
            realities. There are no wrong answers — just honest insights.
          </p>
          <button
            onClick={onBegin}
            className="mt-9 inline-flex items-center gap-2 rounded-xl bg-[#00badc] px-7 py-3.5 text-base font-semibold text-slate-900 shadow-lg shadow-[#00badc]/20 transition-all hover:bg-[#2fd0ee] hover:shadow-[#00badc]/30"
          >
            Let&apos;s begin <ArrowDown className="h-4 w-4" />
          </button>
          <p className="mt-6 text-xs text-white/40">
            Don&apos;t know an answer? Defer it — we&apos;ll cover it together live.
          </p>
        </div>
      </div>
    </div>
  )
}

function Done({ deferredCount }: { deferredCount: number }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b1830] bg-[radial-gradient(1000px_500px_at_50%_-10%,rgba(0,186,220,0.12),transparent)] px-6 text-center text-white">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00badc]/15 text-[#00badc]">
        <Check className="h-8 w-8" strokeWidth={2.5} />
      </span>
      <h1 className="mt-6 text-4xl font-bold tracking-tight">That&apos;s a great head start</h1>
      <p className="mt-4 max-w-lg text-white/65">
        Your answers will pre-populate your program so we walk into the live
        session validating a real starting point — not starting from zero.
        {deferredCount > 0 && (
          <> We flagged <span className="font-semibold text-white">{deferredCount}</span> item{deferredCount > 1 ? "s" : ""} to cover together.</>
        )}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-[#00badc] px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#2fd0ee]"
        >
          See your starting program <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <p className="mt-6 text-xs text-white/40">
        (Shell preview — seeding the tool from these answers is the next build step.)
      </p>
    </div>
  )
}
