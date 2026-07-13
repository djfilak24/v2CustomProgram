"use client"

import { ArrowRight, ArrowLeft, MessageCircle, TrendingUp, TrendingDown, CheckCircle2, Home, Sparkles } from "lucide-react"
import { WorkplaceProfile } from "./workplace-profile"
import {
  SURVEY_STEPS, WORK_PATTERNS, SEATING_POSTURES, OFFICE_POSTURES, GROWTH_PRESETS,
  adjacencyColor, buildSurveyResult,
  type SurveyState, type LaneMap, type StepId, type ProfileScores, type CardOption,
} from "@/lib/survey/sections"
import { buildComparison, lineGaps } from "@/lib/survey/comparison"
import { COLLAB_CATALOG, SUPPORT_CATALOG } from "@/lib/survey/catalog"
import { saveSurveySeed } from "@/lib/survey/seedStorage"
import { clearSurveyDraft } from "@/lib/survey/draftStorage"

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
  engagementHome,
  prepHref,
  sentToNelson,
}: {
  state: SurveyState
  lanes: LaneMap
  deferred: Set<StepId>
  scores: ProfileScores
  onBack: () => void
  /** The client's engagement home page (/s/<token>) when this run belongs to one. */
  engagementHome?: string | null
  /** The session-prep debrief (/prep/<token>) — the client's next step when on an engagement. */
  prepHref?: string | null
  /** True once the result has landed with NELSON automatically. */
  sentToNelson?: boolean
}) {
  const named = state.departments.filter((d) => d.name.trim())
  const nameOf = (id: string) => named.find((d) => d.id === id)?.name ?? id
  const useDepts = lanes.people === "detailed" && named.length > 0
  const totalCurrent = named.reduce((a, d) => a + (d.headcount || 0), 0)
  const totalFuture = named.reduce((a, d) => a + (d.futureHeadcount ?? (d.headcount || 0)), 0)

  const collab = state.collabTypes.map((id) => {
    const counts = state.collabByDept[id] ?? {}
    const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0)
    return { label: COLLAB_CATALOG.find((c) => c.id === id)?.label ?? id, total }
  })

  const adjacencies = state.adjacencyPairs.map((k, i) => {
    const [a, b] = k.split("|")
    return { label: `${nameOf(a)} ↔ ${nameOf(b)}`, color: adjacencyColor(i, state.adjacencyPairs.length), rank: i + 1 }
  })

  const deferredTitles = SURVEY_STEPS.filter((s) => deferred.has(s.id)).map((s) => s.title)

  // The session agenda, previewed: what intake couldn't answer, framed as the
  // meeting's job — never as the client's failure. Benchmarks are illustrative
  // until real engagement averages exist (TODO(founder)).
  const openItems = (() => {
    const r = buildSurveyResult(state, lanes, deferred, { clientName: "", completedBy: "" })
    const lines = buildComparison(r).lines.flatMap((l) => lineGaps(l).map(() => l.label))
    return { lines: [...new Set(lines)], count: lines.length + deferredTitles.length }
  })()
  const TYPICAL_GAPS = 12

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
    <div className="min-h-screen bg-[#f3f7fa] bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(0,186,220,0.10),transparent)] text-slate-900">
      <div className="mx-auto w-full max-w-[1700px] px-6 py-7 lg:px-10">
        {/* Engagement acknowledgment — their answers are home, and so is this link */}
        {engagementHome && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-50 px-5 py-4">
            <span className="flex items-center gap-2.5 text-sm text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>
                <span className="font-semibold">
                  {sentToNelson ? "Your responses are with NELSON." : "Sending your responses to NELSON…"}
                </span>{" "}
                Your NELSON contact will reach out to schedule your working session.
              </span>
            </span>
            <a
              href={engagementHome}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <Home className="h-4 w-4" /> Go to your home page
            </a>
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#00badc]/30 bg-[#00badc]/10 px-3 py-1 text-xs font-medium text-[#0089a3]">
              Your workplace snapshot
            </span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Here&apos;s what you told us</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              A quick review before we open your starting program. Everything here pre-populates the tool — nothing is locked in.
            </p>
          </div>
        </div>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_360px]">
          <div className="space-y-5">
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
                          <span className="text-slate-700">{d.name}</span>
                          <span className="flex items-center gap-2 tabular-nums text-slate-600">
                            {d.headcount}
                            <span className="text-slate-400">→</span>
                            <span className="text-slate-900">{future}</span>
                            {delta > 0 && <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />}
                            {delta < 0 && <TrendingDown className="h-3.5 w-3.5 text-amber-600" />}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm font-medium">
                    <span className="text-slate-600">Total headcount</span>
                    <span className="tabular-nums">
                      {totalCurrent} <span className="text-slate-400">→</span>{" "}
                      <span className="text-[#0089a3]">{totalFuture}</span>
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

            {/* Notes */}
            {(state.loves.trim() || state.painPoints.trim() || state.imbalances.trim()) && (
              <Card title="What's working & what isn't">
                {state.loves.trim() && <Note label="Working well" value={state.loves} />}
                {state.painPoints.trim() && <Note label="Not working" value={state.painPoints} />}
                {state.imbalances.trim() && <Note label="Over / under-used" value={state.imbalances} />}
              </Card>
            )}
          </div>

          <div className="space-y-5">
            {/* Ways of working */}
            <Card title="Ways of working">
              <Row label="In-office cadence" value={daysSummary ?? "—"} />
              <Row label="Seats" value={labelFor(SEATING_POSTURES, state.seatingChoice) ?? "—"} />
              {adjacencies.length > 0 && (
                <div className="pt-1">
                  <div className="mb-1.5 text-sm text-slate-500">
                    Teams that work closely <span className="text-slate-400">· ranked by priority</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {adjacencies.map((a) => (
                      <span key={a.label} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                        <span
                          className="flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold text-slate-900"
                          style={{ backgroundColor: a.color }}
                        >
                          {a.rank}
                        </span>
                        {a.label}
                      </span>
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
                  <div className="mb-1.5 text-sm text-slate-500">Collaboration spaces</div>
                  <div className="flex flex-wrap gap-2">
                    {collab.map((c) => (
                      <span key={c.label} className="rounded-full bg-[#00badc]/10 px-3 py-1 text-xs text-[#0089a3]">
                        {c.label}{c.total > 0 ? ` · ${c.total}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {state.support.length > 0 && (
                <div className="pt-1">
                  <div className="mb-1.5 text-sm text-slate-500">Support spaces</div>
                  <div className="flex flex-wrap gap-2">
                    {state.support.map((id) => (
                      <span key={id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                        {SUPPORT_CATALOG.find((s) => s.id === id)?.label ?? id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Right rail */}
          <aside className="space-y-5">
            <WorkplaceProfile scores={scores} />
            {/* Going into the session — effort honored, gaps framed as the agenda */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <Sparkles className="h-3.5 w-3.5" />
                {openItems.count <= TYPICAL_GAPS ? "Strong intake — above average" : "Solid intake — you gave us what you could"}
              </span>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                Most teams leave around {TYPICAL_GAPS} open items; you left <b>{openItems.count}</b>.
                {" "}Open items aren&apos;t homework — they&apos;re exactly what the working session is for.
              </p>
              {(openItems.lines.length > 0 || deferredTitles.length > 0) && (
                <>
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                    <MessageCircle className="h-3.5 w-3.5" /> We&apos;ll focus on these together
                  </p>
                  <ul className="mt-1.5 space-y-1 text-sm text-slate-600">
                    {[...openItems.lines.slice(0, 4), ...deferredTitles].slice(0, 5).map((t) => <li key={t}>· {t}</li>)}
                    {openItems.count > 5 && <li className="text-slate-400">· and a few more — all covered in your prep sheet</li>}
                  </ul>
                </>
              )}
              {prepHref && (
                <a
                  href={prepHref}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e1a2e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                >
                  Prep for the live session <ArrowRight className="h-4 w-4" />
                </a>
              )}
            </div>
          </aside>
        </div>

        {/* Actions */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100/80"
          >
            <ArrowLeft className="h-4 w-4" /> Back to edit
          </button>
          {prepHref ? (
            // Engagement clients don't self-serve the recommended program —
            // the program is revealed in the session, then pushed (Phase 0
            // ruling: recommended program is NELSON-first). Their next step
            // is the prep sheet.
            <a
              href={prepHref}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00badc] px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#2fd0ee]"
            >
              Prep for the live session <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <button
              type="button"
              onClick={() => {
                // Hand the structured answers forward and open the validation review
                // (existing vs. proposed) before the deep canvas. The in-progress
                // draft is done its job — clear it so the next visit starts clean.
                saveSurveySeed(buildSurveyResult(state, lanes, deferred, { clientName: "", completedBy: "" }))
                clearSurveyDraft()
                try { localStorage.removeItem("nelson:seedSource") } catch { /* fine */ }
                window.location.href = "/review"
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00badc] px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#2fd0ee]"
            >
              See your program comparison <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          {prepHref
            ? "Your program is being reviewed by your NELSON team — you'll walk it together in the session."
            : "Everything you entered pre-populates the tool — nothing is locked in."}
        </p>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-3 text-base font-semibold text-slate-900">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  )
}

function Note({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-slate-500">{label}</div>
      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{value}</p>
    </div>
  )
}
