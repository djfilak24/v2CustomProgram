"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, GitCompareArrows, AlertTriangle, Check, Minus } from "lucide-react"
import { buildDeliverable, CATEGORY_COLORS } from "@/lib/survey/deliverable"
import { demoResult } from "@/lib/survey/demo-scenarios"

/**
 * Lab 0.3 — the deeper cockpit, two ideas prototyped on real math:
 *
 * 1 · SCENARIOS — the session's working state saved under a name, compared
 *     side by side. Three columns here are three real buildDeliverable runs.
 * 2 · SEGMENT & AUDIT — the validation triangle (engine ratio · survey ask ·
 *     today) run down every line at once, with the implications written out.
 *     This is "compare the engine with the survey findings, then audit the
 *     implications of it all" as a single screen.
 */
export default function ScenariosLab() {
  const result = useMemo(() => demoResult("law")!, [])

  const scenarios = useMemo(() => {
    const baseline = buildDeliverable(result)
    const session = buildDeliverable(result, { offices: 120 }, {}, [
      { key: "studio:huddle:b", label: "Huddle Room (B)", category: "Collaboration", unitSF: 140, proposedCount: 2 },
    ])
    const ws = baseline.comp.lines.find((l) => l.key === "workstations")!
    const targetFit = buildDeliverable(
      result,
      { workstations: 36, offices: 120 },
      { workstations: Math.ceil(ws.proposedCount * 0.8), "collab:Phone Room / Focus Booth": 3 },
    )
    return [
      { id: "baseline", name: "Baseline", note: "pure ratio program — the engine untouched", d: baseline },
      { id: "session", name: "Session · Jul 13", note: "as adjusted live with the client", d: session },
      { id: "targetfit", name: "Target-fit 12,000", note: "levers from 0.4 applied — conditions attached", d: targetFit },
    ]
  }, [result])

  const base = scenarios[0].d
  const deptCount = result.people.departments.length

  // ── the audit rows: engine ratio vs survey ask vs today, per line ────────
  const audit = useMemo(() => {
    const rows: { label: string; cat: keyof typeof CATEGORY_COLORS; ratio: number; survey: number | null; today: number | null; note: string; flag: "ok" | "watch" | "gap" }[] = []
    for (const l of base.comp.lines) {
      if (l.proposedCount === 0 && l.existingCount === 0) continue
      let survey: number | null = null
      if (l.key === "offices") survey = Object.values(result.spaces.privateOfficesByDept).reduce((a, b) => a + b, 0) || null
      if (l.key === "workstations") survey = Object.values(result.work.dedicatedByDept ?? {}).reduce((a, b) => a + b, 0) || null
      if (l.category === "Collaboration") {
        const item = result.spaces.collaboration.find((c) => c.type === l.key.replace(/^collab:/, ""))
        survey = Object.values(item?.byDept ?? {}).reduce((a, b) => a + b, 0) || null
      }
      const today = l.existingCountKnown ? l.existingCount : null
      let flag: "ok" | "watch" | "gap" = "ok"
      let note = "aligned — ratio, ask, and reality agree."
      if (survey === null && today === null) { flag = "gap"; note = "intake never sized this — the engine is flying alone. Confirm live." }
      else if (survey !== null && Math.abs(survey - l.proposedCount) / Math.max(1, l.proposedCount) > 0.15) {
        flag = "watch"
        note = survey > l.proposedCount
          ? `the client asks for ${survey - l.proposedCount} more than the ratios support — culture or habit? Worth the conversation before we concede the SF.`
          : `the client asks for ${l.proposedCount - survey} fewer than the ratios say they'll need — check what the engine sees that they don't (growth, peaks).`
      } else if (today !== null && l.proposedCount > 0 && Math.abs(today - l.proposedCount) / l.proposedCount > 0.3) {
        flag = "watch"
        note = `a big move vs today (${today} → ${l.proposedCount}) — expect it to be felt; name it in the session.`
      }
      rows.push({ label: l.label, cat: l.category, ratio: l.proposedCount, survey, today, note, flag })
    }
    return rows.sort((a, b) => (a.flag === b.flag ? 0 : a.flag === "gap" ? -1 : a.flag === "watch" && b.flag === "ok" ? -1 : 1))
  }, [base, result])

  return (
    <div className="min-h-screen bg-[#f3f7fa] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/lab" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> The Lab
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">0.3 · Scenarios · segment &amp; audit — prototype</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* ── 1 · scenarios ─────────────────────────────────────────────── */}
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <GitCompareArrows className="h-6 w-6 text-[#0089a3]" /> Scenarios — the session, saved under a name
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
          Each column is a full engine run. The idea: a Studio session can be saved as a scenario,
          duplicated, and compared — Conservative vs Growth vs Target-fit — then any one of them
          presented or exported. Deltas read against Baseline.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {scenarios.map((s, i) => {
            const g = s.d.totals.grossUsableSF
            const delta = g - base.totals.grossUsableSF
            return (
              <div key={s.id} className={`rounded-2xl border bg-white p-5 ${i === 1 ? "border-[#00badc]/60 shadow-[0_0_0_3px_rgba(0,186,220,0.10)]" : "border-slate-200"}`}>
                <div className="flex items-baseline justify-between">
                  <h2 className="font-bold">{s.name}</h2>
                  {i === 1 && <span className="rounded-full bg-[#00badc]/10 px-2 py-0.5 text-[10px] font-bold text-[#0089a3]">ACTIVE</span>}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{s.note}</p>
                <p className="mt-3 text-3xl font-bold tabular-nums">
                  {g.toLocaleString()}<span className="ml-1 text-sm font-medium text-slate-400">SF</span>
                </p>
                <p className={`text-xs font-semibold tabular-nums ${delta === 0 ? "text-slate-400" : delta < 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  {delta === 0 ? "— the reference" : `${delta > 0 ? "+" : ""}${delta.toLocaleString()} SF vs baseline`}
                </p>
                <div className="mt-3 flex h-2.5 gap-[2px] overflow-hidden rounded-full">
                  {s.d.categories.map((c) => (
                    <span key={c.name} style={{ width: `${(c.proposedTotalSF / g) * 100}%`, backgroundColor: CATEGORY_COLORS[c.name].accent }} />
                  ))}
                </div>
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs tabular-nums text-slate-500">
                  <Row k="SF / person" v={`${s.d.totals.sfPerPerson}`} />
                  <Row k="Workstations" v={`${s.d.lines.find((l) => l.key === "workstations")?.proposedCount ?? 0} × ${s.d.lines.find((l) => l.key === "workstations")?.unitSF ?? 0} SF`} />
                  <Row k="Offices" v={`${s.d.lines.find((l) => l.key === "offices")?.proposedCount ?? 0} × ${s.d.lines.find((l) => l.key === "offices")?.unitSF ?? 0} SF`} />
                  <Row k="Rentable est." v={s.d.totals.estimatedRentableSF.toLocaleString()} />
                </div>
              </div>
            )
          })}
        </div>

        {/* ── 2 · segment & audit ───────────────────────────────────────── */}
        <h2 className="mt-14 text-2xl font-bold tracking-tight">Segment &amp; audit — the triangle, run down every line</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
          Engine ratio · survey ask · today, for all {audit.length} program lines across{" "}
          {deptCount} departments — with the implication written out where the three disagree.
          Sorted so the conversation starts at the top.
        </p>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5 font-semibold">Line</th>
                <th className="px-3 py-2.5 text-right font-semibold">Engine ratio</th>
                <th className="px-3 py-2.5 text-right font-semibold">Survey ask</th>
                <th className="px-3 py-2.5 text-right font-semibold">Today</th>
                <th className="px-4 py-2.5 font-semibold">The implication</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {audit.map((r) => (
                <tr key={r.label} className={r.flag === "gap" ? "bg-amber-50/40" : undefined}>
                  <td className="px-4 py-2 font-medium">
                    <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: CATEGORY_COLORS[r.cat].accent }} />
                    {r.label}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{r.ratio}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.survey ?? <Minus className="ml-auto h-3.5 w-3.5 text-slate-300" />}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.today ?? <Minus className="ml-auto h-3.5 w-3.5 text-slate-300" />}</td>
                  <td className="px-4 py-2 text-xs leading-relaxed text-slate-600">
                    <span className="mr-1.5 inline-block align-middle">
                      {r.flag === "ok" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className={`h-3.5 w-3.5 ${r.flag === "gap" ? "text-amber-500" : "text-amber-400"}`} />}
                    </span>
                    {r.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Prototype note: the implication copy is rule-generated from the deltas (±15% vs survey, ±30% vs
          today, no-data). In production these rules live beside the engine and the thresholds get
          NELSON&apos;s numbers, not ours.
        </p>
      </main>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span>{k}</span>
      <span className="font-medium text-slate-800">{v}</span>
    </div>
  )
}
