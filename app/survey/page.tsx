"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  ArrowLeft, ArrowRight, ArrowDown, Sparkles, MessageCircle, Info, Wand2,
} from "lucide-react"
import {
  SURVEY_STEPS, computeProfile, emptyState, emptyLanes, allLanes, surveyStateFromResult,
  WORK_PATTERNS, SEATING_POSTURES, OFFICE_POSTURES,
  GROWTH_PRESETS, PEOPLE_MODES,
  type Lane, type LaneMap, type StepId, type SurveyState, type DayValue, type PeopleMode,
} from "@/lib/survey/sections"
import { DEMO_SCENARIOS } from "@/lib/survey/demo-scenarios"
import { ProgressHeader } from "@/components/survey/progress-header"
import { WorkplaceProfile } from "@/components/survey/workplace-profile"
import { LaneToggle } from "@/components/survey/lane-toggle"
import { ChoiceCard } from "@/components/survey/choice-card"
import { DeptSpine } from "@/components/survey/dept-spine"
import { PerDeptRows } from "@/components/survey/per-dept-rows"
import { DeptAllocationRows } from "@/components/survey/dept-allocation-rows"
import { SpaceListRow } from "@/components/survey/space-list-row"
import { ExistingConditionsStep } from "@/components/survey/existing-conditions"
import { SUPPORT_CATALOG } from "@/lib/survey/catalog"
import { DaysRows } from "@/components/survey/days-rows"
import { CollabTree } from "@/components/survey/collab-tree"
import { AdjacencyGraph } from "@/components/survey/adjacency-graph"
import { IntroDemo } from "@/components/survey/intro-demo"
import { Summary } from "@/components/survey/summary"

type Phase = "hero" | "survey" | "summary"

export default function SurveyPage() {
  const [phase, setPhase] = useState<Phase>("hero")
  const [showIntro, setShowIntro] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [lanes, setLanes] = useState<LaneMap>(emptyLanes)
  const [state, setState] = useState<SurveyState>(emptyState)
  const [deferred, setDeferred] = useState<Set<StepId>>(new Set())

  const steps = SURVEY_STEPS
  const step = steps[stepIndex]
  const scores = useMemo(() => computeProfile(state), [state])

  const patch = (p: Partial<SurveyState>) => setState((prev) => ({ ...prev, ...p }))

  const clearDefer = (id: StepId) =>
    setDeferred((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })

  const deferStep = () => {
    setDeferred((prev) => new Set(prev).add(step.id))
    goNext()
  }

  const goNext = () => {
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1)
    else setPhase("summary")
  }
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1))

  const beginSurvey = () => {
    setPhase("survey")
    setShowIntro(true)
  }

  // Presenter demo: pre-populate every answer from a scenario and open the survey
  // fully expanded, so you click through a filled-in survey and adjust live.
  const startDemo = (key: string) => {
    const scenario = DEMO_SCENARIOS[key]
    if (!scenario) return
    setState(surveyStateFromResult(scenario.result))
    setLanes(allLanes("detailed"))
    setDeferred(new Set())
    setStepIndex(0)
    setShowIntro(false)
    setPhase("survey")
  }
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("demo")
    if (key && DEMO_SCENARIOS[key]) startDemo(key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const anyDetailed = Object.values(lanes).some((l) => l === "detailed")
  const toggleSimplifyAll = () => setLanes(allLanes(anyDetailed ? "quick" : "detailed"))

  if (phase === "hero") return <Hero onBegin={beginSurvey} onDemo={startDemo} />
  if (phase === "summary")
    return (
      <Summary
        state={state}
        lanes={lanes}
        deferred={deferred}
        scores={scores}
        onBack={() => { setPhase("survey"); setStepIndex(steps.length - 1) }}
      />
    )

  // Detailed lane is per-question, and only meaningful where the step defines a
  // deeper editor.
  const effectiveLane: Lane = step.hasDetailed ? lanes[step.id] : "quick"
  // The adjacency graph wants room to breathe — give it the full width (no radar
  // rail) so department names don't get truncated.
  const wide = step.id === "adjacency"

  return (
    <div className="min-h-screen bg-[#0b1830] bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(0,186,220,0.10),transparent)] text-white">
      {showIntro && <IntroDemo onDismiss={() => setShowIntro(false)} />}

      <ProgressHeader stepIndex={stepIndex} onJump={(i) => setStepIndex(i)} />

      <main
        className={`mx-auto grid max-w-[1760px] grid-cols-1 gap-8 px-6 py-10 lg:gap-10 lg:px-10 xl:gap-14 ${
          wide ? "" : "lg:grid-cols-[minmax(0,1fr)_380px]"
        }`}
      >
        <div>
          {/* Global depth control — everything is shown in full by default; the
              client can Simplify to save time without compromising the program. */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm text-white/60">
              <Wand2 className="h-4 w-4 text-[#00badc]" />
              {anyDetailed
                ? "You're seeing every question in full — answer what you can."
                : "Simplified path — a complete program, just quicker."}
            </span>
            <button
              type="button"
              onClick={toggleSimplifyAll}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-[#00badc]/50 hover:text-white"
            >
              {anyDetailed ? "Simplify to save time" : "Show full detail"}
            </button>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{step.title}</h1>
              <p className="mt-2 text-white/55">{step.subtitle}</p>
            </div>
            {step.hasDetailed && (
              <LaneToggle
                lane={lanes[step.id]}
                onChange={(l) => setLanes((prev) => ({ ...prev, [step.id]: l }))}
              />
            )}
          </div>

          {step.hasDetailed && effectiveLane === "quick" && step.detailedHint && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/55">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
              <span>
                Simplified for speed. The detailed view lets you {step.detailedHint.replace(/\.$/, "")} —
                it won&apos;t change your final program, only how much you specify now.
              </span>
            </div>
          )}

          <div className="mt-7">
            <StepBody
              step={step}
              lane={effectiveLane}
              state={state}
              patch={patch}
            />
          </div>

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
              {step.canDefer && (
                <button
                  type="button"
                  onClick={deferStep}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:text-white/80"
                  title="We'll cover this together in the live session"
                >
                  <MessageCircle className="h-4 w-4" /> We&apos;ll talk live
                </button>
              )}
              <button
                type="button"
                onClick={() => { clearDefer(step.id); goNext() }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#00badc] px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#2fd0ee]"
              >
                {stepIndex === steps.length - 1 ? "Finish" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Live profile sidebar (hidden where the step needs full width) */}
        {!wide && (
          <aside className="hidden lg:block">
            <div className="sticky top-32">
              <WorkplaceProfile scores={scores} />
            </div>
          </aside>
        )}
      </main>
    </div>
  )
}

// ── Per-step bodies ──────────────────────────────────────────────────────────

function StepBody({
  step,
  lane,
  state,
  patch,
}: {
  step: (typeof SURVEY_STEPS)[number]
  lane: Lane
  state: SurveyState
  patch: (p: Partial<SurveyState>) => void
}) {
  switch (step.id) {
    case "people":
      return lane === "detailed" ? (
        <div className="space-y-6">
          <div>
            <p className="mb-3 text-sm font-medium text-white/70">How much detail do you want on your people?</p>
            <CardGrid
              options={PEOPLE_MODES}
              selected={[state.peopleMode]}
              onToggle={(id) => patch({ peopleMode: id as PeopleMode })}
              cols={3}
            />
            <p className="mt-2 text-xs text-white/40">
              Naming people once here lets later steps assign desks, offices, and in-office days down to the person.
            </p>
          </div>
          <DeptSpine
            departments={state.departments}
            mode={state.peopleMode}
            onChange={(d) => patch({ departments: d })}
          />
        </div>
      ) : (
        <div className="space-y-7">
          <div className="max-w-sm">
            <label className="text-sm font-medium text-white/70">Roughly how many people, total?</label>
            <input
              type="number"
              min={0}
              value={state.totalHeadcount ?? ""}
              onChange={(e) => patch({ totalHeadcount: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
              placeholder="e.g. 120"
              className="mt-2 w-full rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#00badc] focus:outline-none"
            />
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-white/70">Expected growth over the next 3–5 years?</p>
            <CardGrid
              options={GROWTH_PRESETS}
              selected={state.growthChoice ? [state.growthChoice] : []}
              onToggle={(id) => patch({ growthChoice: id })}
              cols={3}
            />
          </div>
        </div>
      )

    case "existing":
      return (
        <ExistingConditionsStep
          value={state.existing}
          onChange={(v) => patch({ existing: v })}
          lane={lane}
        />
      )

    case "work":
      return lane === "detailed" ? (
        <DaysRows
          departments={state.departments}
          values={state.perDeptDays}
          onChange={(v: Record<string, DayValue>) => patch({ perDeptDays: v })}
        />
      ) : (
        <CardGrid
          options={WORK_PATTERNS}
          selected={state.workChoice ? [state.workChoice] : []}
          onToggle={(id) => patch({ workChoice: id })}
          cols={3}
        />
      )

    case "seating":
      return (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3 text-sm text-white/80">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>
              <span className="font-semibold text-white">This isn&apos;t about offices.</span> A dedicated
              desk is an <span className="font-medium text-white">assigned workstation</span> in the open plan —
              not an enclosed room. Private offices are a separate question on the next screen.
            </span>
          </div>
          {lane === "detailed" ? (
            <DeptAllocationRows
              departments={state.departments}
              values={state.dedicatedByDept}
              onChange={(v) => patch({ dedicatedByDept: v })}
              summarize={(v, hc) => `${v} dedicated · ${Math.max(0, hc - v)} flex`}
              employeeSelections={state.deskByEmployee}
              onToggleEmployee={(id) =>
                patch({ deskByEmployee: { ...state.deskByEmployee, [id]: !state.deskByEmployee[id] } })
              }
            />
          ) : (
            <CardGrid
              options={SEATING_POSTURES}
              selected={state.seatingChoice ? [state.seatingChoice] : []}
              onToggle={(id) => patch({ seatingChoice: id })}
              cols={3}
            />
          )}
        </div>
      )

    case "adjacency":
      return (
        <AdjacencyGraph
          departments={state.departments}
          pairs={state.adjacencyPairs}
          onChange={(pairs) => patch({ adjacencyPairs: pairs })}
        />
      )

    case "offices":
      return (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/65">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
            <span>
              Enclosed, assigned <span className="font-medium text-white">private offices</span> — typically for
              leadership or roles that need them. How many per team?
            </span>
          </div>
          {lane === "detailed" ? (
            <DeptAllocationRows
              departments={state.departments}
              values={state.officesByDept}
              onChange={(v) => patch({ officesByDept: v })}
              summarize={(v, hc) => `${v} ${v === 1 ? "office" : "offices"} of ${hc}`}
              employeeSelections={state.officeByEmployee}
              onToggleEmployee={(id) =>
                patch({ officeByEmployee: { ...state.officeByEmployee, [id]: !state.officeByEmployee[id] } })
              }
            />
          ) : (
            <CardGrid
              options={OFFICE_POSTURES}
              selected={state.officeChoice ? [state.officeChoice] : []}
              onToggle={(id) => patch({ officeChoice: id })}
              cols={3}
            />
          )}
        </div>
      )

    case "collaboration":
      return (
        <CollabTree
          lane={lane}
          departments={state.departments}
          selected={state.collabTypes}
          byDept={state.collabByDept}
          onToggleType={(id) =>
            patch({
              collabTypes: state.collabTypes.includes(id)
                ? state.collabTypes.filter((x) => x !== id)
                : [...state.collabTypes, id],
            })
          }
          onChangeCounts={(id, counts) =>
            patch({ collabByDept: { ...state.collabByDept, [id]: counts } })
          }
          existing={state.existingCollab}
          onChangeExisting={(id, n) =>
            patch({ existingCollab: { ...state.existingCollab, [id]: n } })
          }
        />
      )

    case "support":
      return (
        <div className="grid gap-2.5 lg:grid-cols-2">
          {SUPPORT_CATALOG.map((sp) => (
            <SpaceListRow
              key={sp.id}
              icon={sp.icon}
              label={sp.label}
              sfEach={sp.sfEach}
              capacity={sp.capacity}
              ratio={sp.ratio}
              selected={state.support.includes(sp.id)}
              onToggle={() =>
                patch({
                  support: state.support.includes(sp.id)
                    ? state.support.filter((x) => x !== sp.id)
                    : [...state.support, sp.id],
                })
              }
              today={state.existingSupport[sp.id]}
              onTodayChange={(n) => patch({ existingSupport: { ...state.existingSupport, [sp.id]: n } })}
            />
          ))}
        </div>
      )

    case "feedback":
      return (
        <div className="grid max-w-2xl gap-5">
          <TextField
            label="What's working well today?"
            value={state.loves}
            onChange={(v) => patch({ loves: v })}
            placeholder="Spaces or rituals your team loves and we should protect."
          />
          <TextField
            label="What isn't working?"
            value={state.painPoints}
            onChange={(v) => patch({ painPoints: v })}
            placeholder="Daily frustrations — not enough focus rooms, noisy open areas, etc."
          />
          <TextField
            label="Anything over- or under-used?"
            value={state.imbalances}
            onChange={(v) => patch({ imbalances: v })}
            placeholder="Spaces that sit empty, or are always booked."
          />
        </div>
      )

    default:
      return null
  }
}

function CardGrid({
  options,
  selected,
  onToggle,
  cols,
}: {
  options: { id: string; label: string; description?: string; icon?: string; stats?: string[] }[]
  selected: string[]
  onToggle: (id: string) => void
  cols: 2 | 3
  multi?: boolean
}) {
  return (
    <div className={`grid grid-cols-2 gap-4 ${cols === 3 ? "sm:grid-cols-3" : ""}`}>
      {options.map((opt) => (
        <ChoiceCard
          key={opt.id}
          icon={opt.icon}
          label={opt.label}
          description={opt.description}
          stats={opt.stats}
          selected={selected.includes(opt.id)}
          onClick={() => onToggle(opt.id)}
        />
      ))}
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-sm font-medium text-white/70">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="mt-2 w-full resize-y rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-white placeholder:text-white/30 focus:border-[#00badc] focus:outline-none"
      />
    </div>
  )
}

// ── Hero + Done ──────────────────────────────────────────────────────────────

function Hero({ onBegin, onDemo }: { onBegin: () => void; onDemo: (key: string) => void }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1830] text-white">
      {/* Let the office image speak — a neutral (non-blue) scrim, dark enough to
          keep the headline crisp without burying the space's own palette. */}
      <Image src="/office-2.jpg" alt="" fill priority className="pointer-events-none object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-black/25" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/80" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-3">
            <Image src="/nelson-logo.png" alt="NELSON" width={110} height={28} className="h-7 w-auto brightness-0 invert" priority />
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

          {/* Presenter demo — seat a full scenario and click through a filled survey */}
          <div className="mt-12 flex flex-col items-center gap-3">
            <span className="text-[11px] font-medium uppercase tracking-wide text-white/35">Presenter demo · seat a full scenario</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {Object.entries(DEMO_SCENARIOS).map(([key, s]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onDemo(key)}
                  title={s.blurb}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm transition-colors hover:border-[#00badc]/60 hover:text-white"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

