"use client"

import type { Comparison, CompCategory, ComparisonLine } from "@/lib/survey/comparison"
import { lineGaps, spaceStrategy } from "@/lib/survey/comparison"
import { GOAL_MOTIVATORS, SPACE_POSTURES, SURVEY_STEPS } from "@/lib/survey/sections"
import { MAP_DEPT_COLORS } from "@/lib/survey/programMap"
import type { SurveyResult } from "@/lib/survey/types"

/**
 * The leave-behind. A print-only, light, NELSON-branded report of the whole
 * review: verdict → context → seat posture → by-type comparison → the full
 * program table → teams → the confirm-live agenda → narrative notes.
 *
 * Rendered always but hidden on screen (`hidden print:block`); the on-screen
 * app is `print:hidden`. Export = window.print() → "Save as PDF". Colors are
 * explicit (print never inherits the dark theme).
 */
export function PrintReport({
  result, comp, lines, existingTotal, proposedTotal, catTotals,
}: {
  result: SurveyResult
  comp: Comparison
  lines: ComparisonLine[]
  existingTotal: number
  proposedTotal: number
  catTotals: { cat: CompCategory; existing: number; proposed: number }[]
}) {
  const strategy = spaceStrategy(existingTotal, proposedTotal, result.goals)
  const delta = proposedTotal - existingTotal
  const deltaPct = existingTotal > 0 ? Math.round((delta / existingTotal) * 100) : 0

  const depts = result.people.departments
  const headcount = result.people.totalHeadcount
  const seatOffices = depts.reduce((s, d) => s + (result.spaces.privateOfficesByDept[d.id] ?? 0), 0)
  const seatDedicated = depts.reduce((s, d) => s + (result.work.dedicatedByDept?.[d.id] ?? 0), 0)
  const seatRemote = comp.fullyRemote
  const seatFlex = Math.max(0, headcount - seatOffices - seatDedicated - seatRemote)

  const labelOf = (list: { id: string; label: string }[], id?: string | null) =>
    list.find((o) => o.id === id)?.label ?? id ?? ""
  const stepTitle = (id: string) => SURVEY_STEPS.find((s) => s.id === id)?.title ?? id
  // Gaps: unknown sizes matter individually; missing baselines collapse to one line.
  const noBaseline = lines.filter((l) => lineGaps(l).some((g) => g.kind === "no-baseline")).map((l) => l.label)
  const unknownSize = lines.flatMap((l) =>
    lineGaps(l).filter((g) => g.kind === "unknown-size").map((g) => `${l.label}: ${g.message}`),
  )
  const confirmLive = [
    ...result.deferred.map(stepTitle),
    ...(result.work.daysUnsureDepts?.length ? [`In-office cadence: ${result.work.daysUnsureDepts.join(", ")}`] : []),
    ...unknownSize,
    ...(noBaseline.length ? [`No existing counts captured for: ${noBaseline.join(", ")} — we'll baseline these together.`] : []),
  ]

  const notes: [string, string][] = [
    ...(result.qualitative.loves ? [["What's working", result.qualitative.loves] as [string, string]] : []),
    ...(result.qualitative.painPoints ? [["Pain points", result.qualitative.painPoints] as [string, string]] : []),
    ...(result.qualitative.imbalances ? [["Over / under-used", result.qualitative.imbalances] as [string, string]] : []),
    ...(result.work.adjacencyNotes ? [["Adjacencies", result.work.adjacencyNotes] as [string, string]] : []),
    ...(result.spaces.officePlacement ? [["Office placement", result.spaces.officePlacement] as [string, string]] : []),
  ]

  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="hidden print:block bg-white text-slate-900" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
      <style>{`@page { size: letter; margin: 13mm; } @media print { html, body { background: #fff !important; } }`}</style>

      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
        <div>
          <div className="text-xl font-extrabold tracking-tight text-slate-900">NELSON</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Workplace Strategy Discovery</div>
        </div>
        <div className="text-right text-[11px] leading-relaxed text-slate-500">
          <div className="text-sm font-semibold text-slate-900">{comp.clientName}</div>
          <div>Program Review · {date}</div>
        </div>
      </div>

      {/* Verdict */}
      <div className="mt-5 flex items-end justify-between gap-6">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#0089a3]">Your program</div>
          <div className="mt-1 text-5xl font-bold tabular-nums tracking-tight">
            {Math.round(proposedTotal).toLocaleString()}<span className="ml-1.5 text-xl font-medium text-slate-400">SF</span>
          </div>
          <div className={`mt-1.5 text-sm font-semibold tabular-nums ${delta > 0 ? "text-emerald-700" : delta < 0 ? "text-amber-700" : "text-slate-500"}`}>
            {delta > 0 ? "+" : ""}{Math.round(delta).toLocaleString()} SF vs today{existingTotal > 0 ? ` (${deltaPct > 0 ? "+" : ""}${deltaPct}%)` : ""} · {Math.round(existingTotal).toLocaleString()} SF existing
          </div>
        </div>
        <div className="max-w-[46%] text-[11px] leading-relaxed text-slate-600">
          <div className="text-[12px] font-bold text-slate-900">{strategy.headline}</div>
          {strategy.note}
        </div>
      </div>

      {/* Context strip */}
      <div className="mt-4 grid grid-cols-4 gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px]">
        <div><span className="font-semibold text-slate-900">{comp.current} → {comp.future}</span> people{result.people.companyGrowthPct ? ` · ${result.people.companyGrowthPct}% growth` : ""}</div>
        <div><span className="font-semibold text-slate-900">{comp.daysInOffice}</span> days/wk in office · <span className="font-semibold text-slate-900">{comp.fullyRemote}</span> remote</div>
        <div>Seats: <span className="font-semibold text-slate-900">{seatOffices}</span> off · <span className="font-semibold text-slate-900">{seatDedicated}</span> ded · <span className="font-semibold text-slate-900">{seatFlex}</span> flex</div>
        <div className="truncate">
          {(result.goals?.motivators ?? []).map((m) => labelOf(GOAL_MOTIVATORS, m)).join(" · ")}
          {result.goals?.posture ? ` · ${labelOf(SPACE_POSTURES, result.goals.posture)}` : ""}
        </div>
      </div>

      {/* By type */}
      <div className="mt-5">
        <SectionTitle>Existing vs. proposed, by type</SectionTitle>
        <table className="mt-1.5 w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-slate-300 text-left text-[9px] uppercase tracking-wider text-slate-500">
              <th className="py-1 pr-2 font-semibold">Type</th>
              <th className="py-1 pr-2 text-right font-semibold">Existing SF</th>
              <th className="py-1 pr-2 text-right font-semibold">Proposed SF</th>
              <th className="py-1 text-right font-semibold">Difference</th>
            </tr>
          </thead>
          <tbody>
            {catTotals.map(({ cat, existing, proposed }) => {
              const d = proposed - existing
              return (
                <tr key={cat} className="border-b border-slate-100">
                  <td className="py-1.5 pr-2 font-medium text-slate-800">{cat}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-slate-500">{Math.round(existing).toLocaleString()}</td>
                  <td className="py-1.5 pr-2 text-right font-semibold tabular-nums text-slate-900">{Math.round(proposed).toLocaleString()}</td>
                  <td className={`py-1.5 text-right font-semibold tabular-nums ${d > 0 ? "text-emerald-700" : d < 0 ? "text-amber-700" : "text-slate-400"}`}>
                    {d === 0 ? "—" : `${d > 0 ? "+" : ""}${Math.round(d).toLocaleString()}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Teams */}
      <div className="mt-5">
        <SectionTitle>Your teams</SectionTitle>
        <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
          {depts.map((d, i) => {
            const fut = d.futureHeadcount ?? d.headcount
            return (
              <span key={d.id} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: MAP_DEPT_COLORS[i % MAP_DEPT_COLORS.length] }} />
                <span className="font-medium text-slate-800">{d.name}</span>
                <span className="tabular-nums text-slate-500">{d.headcount} → <b className="text-slate-900">{fut}</b></span>
              </span>
            )
          })}
        </div>
      </div>

      {/* Full program — page 2 territory */}
      <div className="mt-5" style={{ breakInside: "avoid-page" }}>
        <SectionTitle>The full program — every space, existing vs. proposed</SectionTitle>
        <table className="mt-1.5 w-full border-collapse text-[10.5px]">
          <thead>
            <tr className="border-b border-slate-300 text-left text-[9px] uppercase tracking-wider text-slate-500">
              <th className="py-1 pr-2 font-semibold">Space</th>
              <th className="py-1 pr-2 font-semibold">Basis</th>
              <th className="py-1 pr-2 text-right font-semibold">Existing</th>
              <th className="py-1 pr-2 text-right font-semibold">Proposed</th>
              <th className="py-1 pr-2 text-right font-semibold">Size</th>
              <th className="py-1 pr-2 text-right font-semibold">Total SF</th>
              <th className="py-1 text-right font-semibold">Δ SF</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const dSF = l.proposedCount * l.unitSF - l.existingCount * l.unitSF
              return (
                <tr key={l.key} className="border-b border-slate-100">
                  <td className="py-1 pr-2 font-medium text-slate-800">{l.label}</td>
                  <td className="py-1 pr-2 text-slate-400">{l.ratio ?? ""}</td>
                  <td className="py-1 pr-2 text-right tabular-nums text-slate-500">{l.existingCount}</td>
                  <td className="py-1 pr-2 text-right font-semibold tabular-nums text-slate-900">{l.proposedCount}</td>
                  <td className="py-1 pr-2 text-right tabular-nums text-slate-500">{l.unitSF} SF</td>
                  <td className="py-1 pr-2 text-right tabular-nums text-slate-700">{Math.round(l.proposedCount * l.unitSF).toLocaleString()}</td>
                  <td className={`py-1 text-right tabular-nums ${dSF > 0 ? "text-emerald-700" : dSF < 0 ? "text-amber-700" : "text-slate-300"}`}>
                    {dSF === 0 ? "—" : `${dSF > 0 ? "+" : ""}${Math.round(dSF).toLocaleString()}`}
                  </td>
                </tr>
              )
            })}
            <tr className="border-t-2 border-slate-900">
              <td className="py-1.5 pr-2 font-bold text-slate-900" colSpan={5}>Total</td>
              <td className="py-1.5 pr-2 text-right font-bold tabular-nums text-slate-900">{Math.round(proposedTotal).toLocaleString()}</td>
              <td className={`py-1.5 text-right font-bold tabular-nums ${delta > 0 ? "text-emerald-700" : "text-amber-700"}`}>
                {delta > 0 ? "+" : ""}{Math.round(delta).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Confirm live */}
      {confirmLive.length > 0 && (
        <div className="mt-5" style={{ breakInside: "avoid-page" }}>
          <SectionTitle>To confirm together in the live session</SectionTitle>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px] text-slate-600">
            {confirmLive.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      )}

      {/* Notes */}
      {notes.length > 0 && (
        <div className="mt-5" style={{ breakInside: "avoid-page" }}>
          <SectionTitle>In your words</SectionTitle>
          <div className="mt-1.5 space-y-1 text-[11px] text-slate-600">
            {notes.map(([k, v]) => (
              <p key={k}><b className="text-slate-800">{k}:</b> {v}</p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-slate-200 pt-2 text-[9px] text-slate-400">
        Prepared by NELSON · ratios are planning baselines, refined together in your validation session · {date}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#0089a3]">{children}</h3>
}
