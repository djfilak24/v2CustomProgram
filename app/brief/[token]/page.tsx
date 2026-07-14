"use client"

import { use, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Printer, ArrowLeft, KeyRound, Target, Quote, AlertTriangle, ClipboardList } from "lucide-react"
import { buildDeliverable, type DeliverableAddition } from "@/lib/survey/deliverable"
import { lineGaps } from "@/lib/survey/comparison"
import { GOAL_MOTIVATORS, SURVEY_STEPS } from "@/lib/survey/sections"
import { isNelsonMode, nelsonCode } from "@/lib/nelsonMode"
import type { SurveyResult } from "@/lib/survey/types"

/**
 * The designer brief — the NELSON-side half of the prep pack. One printable
 * page the designer reads (or prints) before the session: the agenda with
 * every gap spelled out, the program's headlines, the client's own words,
 * the target, and the session record so far. The client prep sheet reassures;
 * this one arms.
 */

interface Eng {
  clientName: string
  result?: SurveyResult
  overrides?: Record<string, number>
  session?: {
    overrides?: Record<string, number>
    counts?: Record<string, number>
    additions?: DeliverableAddition[]
    notes?: Record<string, string>
    resolvedGaps?: Record<string, boolean>
    factors?: Record<string, number>
    people?: { officeEmployeeIds?: string[]; deskEmployeeIds?: string[] }
    labels?: Record<string, string>
  }
}

export default function BriefPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [nelson, setNelson] = useState<boolean | null>(null)
  const [e, setE] = useState<Eng | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading")

  useEffect(() => {
    const isN = isNelsonMode()
    setNelson(isN)
    if (!isN) return
    fetch(`/api/engagements/${token}`, { headers: { "x-nelson-code": nelsonCode() ?? "" } })
      .then(async (r) => {
        if (!r.ok) { setState("missing"); return }
        setE(await r.json()); setState("ready")
      })
      .catch(() => setState("missing"))
  }, [token])

  const d = useMemo(
    () =>
      e?.result
        ? buildDeliverable(e.result, e.session?.overrides ?? e.overrides ?? {}, e.session?.counts ?? {}, e.session?.additions ?? [], e.session?.factors ?? {}, e.session?.people, e.session?.labels)
        : null,
    [e],
  )

  if (nelson === false) {
    return (
      <Centered>
        <Image src="/NELSON_color.png" alt="NELSON" width={170} height={40} className="h-8 w-auto" />
        <span className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#00badc]/10 text-[#0089a3]"><KeyRound className="h-5 w-5" /></span>
        <h1 className="mt-4 text-2xl font-bold">NELSON only.</h1>
        <p className="mt-2 max-w-md text-slate-600">The designer brief is internal.</p>
      </Centered>
    )
  }
  if (state === "loading" || nelson === null) return <Centered><p className="text-slate-400">Preparing the brief…</p></Centered>
  if (state === "missing" || !e) return <Centered><p className="text-slate-500">Unknown engagement.</p></Centered>
  if (!e.result || !d) {
    return (
      <Centered>
        <p className="max-w-md text-slate-600">
          No intake yet — the brief writes itself once something returns. Run it from the{" "}
          <a href={`/command/${token}`} className="font-semibold text-[#0089a3] underline">Command Center</a>.
        </p>
      </Centered>
    )
  }

  const gaps = d.comp.lines.flatMap((l) => lineGaps(l).map((g) => ({ line: l.label, message: g.message })))
  const deferred = e.result.deferred.map((dq) => SURVEY_STEPS.find((s) => s.id === dq)?.title ?? dq)
  const target = e.result.goals?.targetSF
  const moves = [...d.lines]
    .filter((l) => l.existingCountKnown && l.proposedCount !== l.existingCount)
    .map((l) => ({ label: l.label, from: l.existingCount, to: l.proposedCount, sf: (l.proposedCount - l.existingCount) * l.unitSF }))
    .sort((a, b) => Math.abs(b.sf) - Math.abs(a.sf))
    .slice(0, 4)
  const notes = e.session?.notes ?? {}
  const resolved = Object.entries(e.session?.resolvedGaps ?? {}).filter(([, v]) => v).map(([k]) => k.split("::")[1] ?? k)

  return (
    <div className="min-h-screen bg-[#f3f7fa] text-slate-900 print:bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10 print:py-2">
        <div className="flex items-center justify-between print:hidden">
          <a href={`/command/${token}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Command Center
          </a>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>

        <div className="mt-6 flex items-baseline justify-between print:mt-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0089a3]">Designer brief · internal</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{e.clientName} — the working session</h1>
          </div>
          <Image src="/NELSON_color.png" alt="NELSON" width={110} height={26} className="h-5 w-auto" />
        </div>

        {/* the numbers that matter */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact k="Program" v={`${d.totals.grossUsableSF.toLocaleString()} SF`} />
          <Fact k="vs today" v={`${d.totals.grossUsableSF - d.totals.existingSF >= 0 ? "+" : ""}${(d.totals.grossUsableSF - d.totals.existingSF).toLocaleString()} SF`} />
          <Fact k="Their number" v={target ? `${target.toLocaleString()} SF` : "not captured — ASK"} warn={!target} />
          <Fact k="Gap to target" v={target ? `${target - d.totals.grossUsableSF >= 0 ? "+" : ""}${(target - d.totals.grossUsableSF).toLocaleString()} SF` : "—"} />
        </div>

        {/* agenda, armed */}
        <Section icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} title={`The gaps — ${gaps.length} to close, each with its question`}>
          {gaps.map((g, i) => (
            <p key={i} className="text-sm leading-relaxed text-slate-700">
              <b>{g.line}:</b> <span className="text-slate-600">{g.message}</span>
            </p>
          ))}
          {deferred.length > 0 && (
            <p className="mt-1 text-sm text-slate-700"><b>Deferred by the client:</b> {deferred.join(" · ")}</p>
          )}
          {resolved.length > 0 && (
            <p className="mt-1 text-sm text-emerald-700"><b>Already closed in session:</b> {resolved.join(" · ")}</p>
          )}
        </Section>

        <Section icon={<ClipboardList className="h-4 w-4 text-[#0089a3]" />} title="The headlines — lead with these">
          {moves.map((m) => (
            <p key={m.label} className="text-sm text-slate-700">
              <b>{m.label}</b> {m.from} → {m.to} ({m.sf >= 0 ? "+" : ""}{m.sf.toLocaleString()} SF)
            </p>
          ))}
          <p className="mt-1 text-xs text-slate-400">
            Goals: {(e.result.goals?.motivators ?? []).map((m) => GOAL_MOTIVATORS.find((x) => x.id === m)?.label ?? m).join(" · ") || "—"}
            {e.result.goals?.posture ? ` · posture: ${e.result.goals.posture}` : ""}
          </p>
        </Section>

        {(e.result.qualitative.painPoints || e.result.qualitative.loves) && (
          <Section icon={<Quote className="h-4 w-4 text-slate-400" />} title="Their words — quote these back">
            {e.result.qualitative.painPoints && <p className="text-sm italic text-slate-600">“{e.result.qualitative.painPoints}”</p>}
            {e.result.qualitative.loves && <p className="text-sm italic text-slate-600">“{e.result.qualitative.loves}”</p>}
          </Section>
        )}

        {target && (
          <Section icon={<Target className="h-4 w-4 text-amber-600" />} title="The target conversation — run it, don't drift into it">
            <p className="text-sm leading-relaxed text-slate-700">
              Their {e.result.goals?.targetSource ?? "number"}: <b>{target.toLocaleString()} SF</b> against a{" "}
              <b>{d.totals.grossUsableSF.toLocaleString()} SF</b> program. Open the target page when you&apos;re ready —
              verdict first, levers second, and every lever&apos;s condition read aloud before it&apos;s pulled.
            </p>
          </Section>
        )}

        {Object.keys(notes).length > 0 && (
          <Section icon={<ClipboardList className="h-4 w-4 text-slate-400" />} title="Session notes on the record">
            {Object.entries(notes).filter(([, v]) => v.trim()).map(([k, v]) => (
              <p key={k} className="text-sm text-slate-600">· {v}</p>
            ))}
          </Section>
        )}

        <p className="mt-8 text-center text-[10px] uppercase tracking-wide text-slate-300 print:mt-4">
          {e.clientName} · designer brief · NELSON internal — do not circulate
        </p>
      </div>
    </div>
  )
}

function Fact({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${warn ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{k}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${warn ? "text-amber-700" : ""}`}>{v}</p>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 print:border-slate-300">
      <h2 className="flex items-center gap-2 text-sm font-bold">{icon} {title}</h2>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3f7fa] px-6 text-center">{children}</div>
}
