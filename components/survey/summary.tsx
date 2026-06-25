"use client"

import { ArrowRight, ArrowLeft, MessageCircle, TrendingUp, TrendingDown } from "lucide-react"
import Link from "next/link"
import { WorkplaceProfile } from "./workplace-profile"
import {
  SURVEY_STEPS, WORK_PATTERNS, SEATING_POSTURES, OFFICE_POSTURES, GROWTH_PRESETS,
  COLLAB_TYPES, SUPPORT_TYPES,
  type SurveyState, type LaneMap, type StepId, type ProfileScores, type CardOption,
} from "@/lib/survey/sections"

const labelFor = (catalog: CardOption[], id: string | null) =>
  id ? catalog.find((c) => c.id === id)?.label ?? id : null

/**
 * Visual review screen shown after the last question and before handing off to
 * the tool — the client sees the program they just described, in one snapshot,
 * so the jump into the calculator feels earned rather than abrupt.
 */
export function Summary({
  state,
  lanes,
  deferred,
  scores,
  onBack,
}: {
  state: SurveyState
  lanes: LaneMap
  deferred: Set<StepId>
  scores: ProfileScores
  onBack: () => void
}) {
  const named = state.departments.filter((d) => d.name.trim())
  const nameOf = (id: string) => named.find((d) => d.id === id)?.name ?? id
  const useDepts = lanes.people === "detailed" && named.length > 0
  const totalCurrent = named.reduce((a, d) => a + (d.headcount || 0), 0)
  const totalFuture = named.reduce((a, d) => a + (d.futureHeadcount ?? (d.headcount || 0)), 0)

  const collab = state.collabTypes.map((id) => {
    const counts = state.collabByDept[id] ?? {}
    const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0)
    return { label: COLLAB_TYPES.find((c) => c.id === id)?.label ?? id, total }
  })

  const adjacencies = state.adjacencyPairs.map((k) => {
    const [a, b] = k.split("|")
    return `${nameOf(a)} ↔ ${nameOf(b)}`
  })

  const deferredTitles = SURVEY_STEPS.filter((s) => deferred.has(s.id)).map((s) => s.title)

  const daysSummary = (() => {
    if (lanes.work !== "detailed") return labelFor(WORK_PATTERNS, state.workChoice)
    const parts: string[] = []
    let unsure = 0
    for (const d of named) {
      const v = state.perDeptDays[d.id]
      if (!v) continue
      if (v === "unsure") { unsure++; continue }
      parts.push(`${d.name} ${v.min === v.max ? `${v.min}` : `${v.min}–${v.max}`}d`)
    }
    const s = parts.join(", ")
    return [s, unsure ? `${unsure} not sure` : ""].filter(Boolean).join(" · ") || "Per department"
  })()

  return (
    <div className="min-h-screen bg-[#0b1830] bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(0,186,220,0.10),transparent)] text-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#00badc]/30 bg-[#00badc]/10 px-4 py-1.5 text-sm font-medium text-[#00badc]">
            Your workplace snapshot
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Here&apos;s what you told us</h1>
          <p className="mx-auto mt-3 max-w-xl text-white/60">
            A quick review before we open your starting program. Everything here pre-populates the tool —
            nothing is locked in.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* People */}
            <Card title="Your people">
              {useDepts ? (
                <>
                  <div className="space-y-1.5">
                    {named.map((d) => {
                      const future = d.futureHeadcount ?? d.headcount
                      const delta = future - (d.headcount || 0)
                      return (
                        <div key={d.id} className="flex items-center justify-between text-sm">
                          <span className="text-white/80">{d.name}</span>
                          <span className="flex items-center gap-2 tabular-nums text-white/60">
                            {d.headcount}
                            <span className="text-white/30">→</span>
                            <span className="text-white">{future}</span>
                            {delta > 0 && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
                            {delta < 0 && <TrendingDown className="h-3.5 w-3.5 text-amber-400" />}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-sm font-medium">
                    <span className="text-white/60">Total headcount</span>
                    <span className="tabular-nums">
                      {totalCurrent} <span className="text-white/30">→</span>{" "}
                      <span className="text-[#00badc]">{totalFuture}</span>
                    </span>
                  </div>
                </>
              ) : (
                <Row label="Total headcount" value={state.totalHeadcount != null ? String(state.totalHeadcount) : "—"} />
              )}
              {labelFor(GROWTH_PRESETS, state.growthChoice) && (
                <Row label="Growth outlook" value={labelFor(GROWTH_PRESETS, state.growthChoice)!} />
              )}
            </Card>

            {/* Ways of working */}
            <Card title="Ways of working">
              <Row label="In-office cadence" value={daysSummary ?? "—"} />
              <Row label="Seats" value={labelFor(SEATING_POSTURES, state.seatingChoice) ?? "—"} />
              {adjacencies.length > 0 && (
                <div className="pt-1">
                  <div className="mb-1.5 text-sm text-white/50">Teams that work closely</div>
                  <div className="flex flex-wrap gap-2">
                    {adjacencies.map((a) => (
                      <span key={a} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/75">{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Space */}
            <Card title="Your space">
              <Row label="Private offices" value={labelFor(OFFICE_POSTURES, state.officeChoice) ?? "—"} />
              {collab.length > 0 && (
                <div className="pt-1">
                  <div className="mb-1.5 text-sm text-white/50">Collaboration spaces</div>
                  <div className="flex flex-wrap gap-2">
                    {collab.map((c) => (
                      <span key={c.label} className="rounded-full bg-[#00badc]/10 px-3 py-1 text-xs text-[#00badc]">
                        {c.label}{c.total > 0 ? ` · ${c.total}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {state.support.length > 0 && (
                <div className="pt-1">
                  <div className="mb-1.5 text-sm text-white/50">Support spaces</div>
                  <div className="flex flex-wrap gap-2">
                    {state.support.map((id) => (
                      <span key={id} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/75">
                        {SUPPORT_TYPES.find((s) => s.id === id)?.label ?? id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Notes */}
            {(state.loves.trim() || state.painPoints.trim() || state.imbalances.trim()) && (
              <Card title="What's working & what isn't">
                {state.loves.trim() && <Note label="Working well" value={state.loves} />}
                {state.painPoints.trim() && <Note label="Not working" value={state.painPoints} />}
                {state.imbalances.trim() && <Note label="Over / under-used" value={state.imbalances} />}
              </Card>
            )}
          </div>

          {/* Right rail */}
          <aside className="space-y-6">
            <WorkplaceProfile scores={scores} />
            {deferredTitles.length > 0 && (
              <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                  <MessageCircle className="h-4 w-4" /> To cover live ({deferredTitles.length})
                </div>
                <ul className="mt-2 space-y-1 text-sm text-white/65">
                  {deferredTitles.map((t) => <li key={t}>· {t}</li>)}
                </ul>
              </div>
            )}
          </aside>
        </div>

        {/* Actions */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-white/75 transition-colors hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to edit
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#00badc] px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#2fd0ee]"
          >
            See your starting program <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-4 text-center text-xs text-white/40">
          (Shell preview — seeding the tool from these answers is the next build step.)
        </p>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <h3 className="mb-3 text-base font-semibold text-white">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-white/50">{label}</span>
      <span className="text-right font-medium text-white">{value}</span>
    </div>
  )
}

function Note({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-white/50">{label}</div>
      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-white/80">{value}</p>
    </div>
  )
}
