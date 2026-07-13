"use client"

import { use, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft, KeyRound, RefreshCw, Users, Radar, Target, MonitorPlay, LayoutGrid, Map as MapIcon,
  FileText, ExternalLink, Send, Check, Clock, Quote, Copy, MessagesSquare, FileSpreadsheet, Share2,
} from "lucide-react"
import { buildDeliverable, CATEGORY_COLORS, type DeliverableAddition } from "@/lib/survey/deliverable"
import { lineGaps } from "@/lib/survey/comparison"
import { GOAL_MOTIVATORS, SURVEY_STEPS } from "@/lib/survey/sections"
import { isNelsonMode, nelsonCode } from "@/lib/nelsonMode"
import type { SurveyResult } from "@/lib/survey/types"

/**
 * The Command Center — one engagement, fetched, for the NELSON designer.
 * The lab comp (0.5), made real: the journey from the event log, which door
 * they used and how completely, what they said, what the system recommends
 * (session-aware), the live-session prep kit, and the push gate. When the
 * client chose "do it live", this is where the designer runs it from.
 */

interface Eng {
  token: string
  clientName: string
  status: string
  shared?: boolean
  result?: SurveyResult
  overrides?: Record<string, number>
  session?: {
    overrides?: Record<string, number>
    counts?: Record<string, number>
    additions?: DeliverableAddition[]
    notes?: Record<string, string>
    resolvedGaps?: Record<string, boolean>
    updatedAt?: string
  }
  progress?: { stage: string; step?: number; total?: number; updatedAt: string }
  submissions?: { source: string; at: string }[]
  events?: { kind: string; at: string; detail?: string }[]
  createdAt: string
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
  ", " + new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })

export default function CommandPage({ params }: { params: Promise<{ token: string }> }) {
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
        ? buildDeliverable(e.result, e.session?.overrides ?? e.overrides ?? {}, e.session?.counts ?? {}, e.session?.additions ?? [])
        : null,
    [e],
  )

  const gaps = useMemo(() => {
    if (!d || !e?.result) return { intake: [] as { line: string; message: string }[], deferred: [] as string[] }
    const intake = d.comp.lines.flatMap((l) => lineGaps(l).map((g) => ({ line: l.label, message: g.message })))
    const deferred = e.result.deferred.map((dq) => SURVEY_STEPS.find((s) => s.id === dq)?.title ?? dq)
    return { intake, deferred }
  }, [d, e])

  const moves = useMemo(
    () =>
      d
        ? [...d.lines]
            .filter((l) => l.existingCountKnown && l.proposedCount !== l.existingCount)
            .map((l) => ({ label: l.label, from: l.existingCount, to: l.proposedCount, sf: (l.proposedCount - l.existingCount) * l.unitSF }))
            .sort((a, b) => Math.abs(b.sf) - Math.abs(a.sf))
            .slice(0, 3)
        : [],
    [d],
  )

  const sessionEdits = e?.session
    ? Object.keys(e.session.overrides ?? {}).length +
      Object.keys(e.session.counts ?? {}).length +
      (e.session.additions?.length ?? 0) +
      Object.values(e.session.resolvedGaps ?? {}).filter(Boolean).length
    : 0

  const toggleShare = () => {
    if (!e) return
    const next = !e.shared
    setE({ ...e, shared: next })
    fetch(`/api/engagements/${token}`, {
      method: "PATCH",
      headers: { "x-nelson-code": nelsonCode() ?? "" },
      body: JSON.stringify({ shared: next }),
    }).catch(() => {})
  }

  if (nelson === false) {
    return (
      <Centered>
        <Image src="/NELSON_color.png" alt="NELSON" width={170} height={40} className="h-8 w-auto" />
        <span className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#00badc]/10 text-[#0089a3]"><KeyRound className="h-5 w-5" /></span>
        <h1 className="mt-4 text-2xl font-bold">NELSON only.</h1>
        <p className="mt-2 max-w-md text-slate-600">
          The Command Center is internal. Unlock presenter mode at{" "}
          <a href="/engagements" className="font-semibold text-[#0089a3] underline">/engagements</a> first.
        </p>
      </Centered>
    )
  }
  if (state === "loading" || nelson === null) {
    return <Centered><p className="text-slate-400"><RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />Fetching the engagement…</p></Centered>
  }
  if (state === "missing" || !e) {
    return <Centered><p className="text-slate-500">Unknown engagement. Back to the <a href="/engagements" className="font-semibold text-[#0089a3] underline">console</a>.</p></Centered>
  }

  const timeline = (e.events ?? []).map((ev) => ({
    label:
      ev.kind === "created" ? "Sent"
      : ev.kind === "submitted" ? `Returned (${ev.detail ?? "intake"})`
      : ev.kind === "shared" ? "Deliverable pushed"
      : ev.kind === "unshared" ? "Deliverable pulled back"
      : ev.detail === "landing" ? "Link opened"
      : ev.detail === "survey" ? "Survey started"
      : ev.detail === "workbook" ? "Workbook downloaded"
      : ev.detail === "live" ? "Asked to do it live"
      : ev.kind,
    at: ev.at,
  }))

  return (
    <div className="min-h-screen bg-[#f3f7fa] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/engagements" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" /> Console
            </Link>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-2 text-sm font-semibold"><MonitorPlay className="h-4 w-4 text-[#0089a3]" /> Command Center</span>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(`${location.origin}/s/${token}`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300"
          >
            <Copy className="h-3.5 w-3.5" /> Copy client link
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-6 py-6">
        {/* ── Identity + journey ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">{e.clientName}</h1>
              <p className="text-xs text-slate-400">/{e.token}{d ? ` · ${d.current} → ${d.future} people` : ""}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {timeline.slice(-6).map((t, i, arr) => (
                <div key={`${t.label}-${t.at}`} className="flex items-center gap-1.5 text-[11px]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00badc] text-white"><Check className="h-3 w-3" /></span>
                  <span>
                    <b className="text-slate-700">{t.label}</b>
                    <span className="ml-1 text-slate-400">{fmt(t.at)}</span>
                  </span>
                  {i < arr.length - 1 && <span className="ml-2 h-px w-4 bg-slate-200" />}
                </div>
              ))}
              {e.progress?.stage === "live" && e.status !== "submitted" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
                  <Clock className="h-3.5 w-3.5" /> Wants it live — schedule the session
                </span>
              )}
            </div>
          </div>
        </div>

        {!e.result ? (
          /* ── The do-it-live / not-returned state — run it from here ────── */
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold"><MessagesSquare className="h-5 w-5 text-[#0089a3]" /> No intake yet — and that&apos;s a plan, not a problem.</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {e.progress?.stage === "live"
                  ? "The client chose to do it live. The survey IS the live instrument: open it against this engagement, drive it on screen together, and Finish lands the result right back here."
                  : "Nothing has come back yet. You can run the intake live in the session — the survey is built for exactly that — or nudge them toward a door."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={`/survey?e=${token}`} className="inline-flex items-center gap-2 rounded-lg bg-[#0e1a2e] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  <Users className="h-4 w-4" /> Run the intake live
                </a>
                <a href={`/s/${token}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400">
                  <ExternalLink className="h-4 w-4" /> Their landing page
                </a>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                In the live session: presenter mode gives you the demo scenarios and per-step depth switches; every answer lands in the same record as any other door.
              </p>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-bold">The screen kit for a from-zero session</h3>
              <div className="mt-3 space-y-1.5 text-xs">
                <Screen icon={<Users className="h-3.5 w-3.5" />} what={`Survey, on this engagement`} why="the live instrument — main share" href={`/survey?e=${token}`} />
                <Screen icon={<LayoutGrid className="h-3.5 w-3.5" />} what="Studio" why="pivot here once the intake lands" href="/studio" />
                <Screen icon={<FileText className="h-3.5 w-3.5" />} what="Workbook guide" why="if they'd rather take homework" href="/workbook-guide" />
              </div>
            </section>
          </div>
        ) : (
          <>
            {/* ── Three columns ─────────────────────────────────────────── */}
            <div className="mt-5 grid gap-5 xl:grid-cols-[350px_minmax(0,1fr)_370px]">
              {/* What they said */}
              <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="flex items-center gap-2 text-sm font-bold"><Users className="h-4 w-4 text-[#0089a3]" /> What they said</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(e.result.goals?.motivators ?? []).map((m) => (
                    <span key={m} className="rounded-full bg-[#00badc]/10 px-2 py-0.5 text-[11px] font-medium text-[#0089a3]">
                      {GOAL_MOTIVATORS.find((x) => x.id === m)?.label ?? m}
                    </span>
                  ))}
                </div>
                <KV k="Cadence" v={`${e.result.work.daysInOffice} days/wk · ${e.result.work.fullyRemote} fully remote`} />
                <KV k="Teams" v={`${e.result.people.departments.length} departments`} />
                <KV k="Today" v={`${e.result.existing?.existingWorkstations ?? "—"} workstations · ${e.result.existing?.existingOffices ?? "—"} offices`} />
                {e.result.qualitative.painPoints && (
                  <blockquote className="rounded-xl border-l-[3px] border-[#00badc] bg-slate-50 p-3 text-xs italic leading-relaxed text-slate-600">
                    <Quote className="mb-1 h-3 w-3 text-[#00badc]" /> {e.result.qualitative.painPoints}
                  </blockquote>
                )}
                <p className="text-[11px] text-slate-400">Everything else: the Studio&apos;s survey drawer.</p>
              </section>

              {/* What the system recommends — session-aware */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="flex items-center gap-2 text-sm font-bold"><Radar className="h-4 w-4 text-[#0089a3]" /> What the system recommends</h3>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-bold tabular-nums tracking-tight">{d!.totals.grossUsableSF.toLocaleString()}<span className="ml-1 text-base font-medium text-slate-400">SF</span></p>
                    <p className="text-xs text-slate-500">
                      {d!.totals.grossUsableSF - d!.totals.existingSF >= 0 ? "+" : ""}
                      {(d!.totals.grossUsableSF - d!.totals.existingSF).toLocaleString()} SF vs today · {d!.totals.sfPerPerson} SF/person
                      {sessionEdits > 0 && <> · <b className="text-[#0089a3]">{sessionEdits} session edit{sessionEdits === 1 ? "" : "s"} applied</b></>}
                    </p>
                  </div>
                  <a href="/studio" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0e1a2e] px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                    <LayoutGrid className="h-4 w-4" /> Open in Studio
                  </a>
                </div>
                <div className="mt-3 flex h-3 gap-[2px] overflow-hidden rounded-full">
                  {d!.categories.map((c) => (
                    <span key={c.name} title={`${c.name} · ${c.proposedTotalSF.toLocaleString()} SF`} style={{ width: `${(c.proposedTotalSF / d!.totals.grossUsableSF) * 100}%`, backgroundColor: CATEGORY_COLORS[c.name].accent }} />
                  ))}
                </div>
                {e.result.goals?.targetSF ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                    <p className="flex items-center gap-2 text-xs font-bold text-amber-800">
                      <Target className="h-3.5 w-3.5" /> Their number: {e.result.goals.targetSF.toLocaleString()} SF
                      {e.result.goals.targetSource ? ` (${e.result.goals.targetSource})` : ""} ·{" "}
                      {e.result.goals.targetSF - d!.totals.grossUsableSF >= 0 ? "+" : ""}
                      {(e.result.goals.targetSF - d!.totals.grossUsableSF).toLocaleString()} SF
                    </p>
                    <p className="mt-1 text-xs text-amber-700/90">Verdict and levers reserved for the session.</p>
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                    No target captured — ask for their number in the session (lease · building · budget).
                  </p>
                )}
                {moves.length > 0 && (
                  <>
                    <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">The session&apos;s headlines — biggest moves vs today</p>
                    <div className="mt-2 space-y-1.5">
                      {moves.map((m) => (
                        <div key={m.label} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-1.5 text-sm">
                          <span className="font-medium">{m.label}</span>
                          <span className="tabular-nums text-slate-500">{m.from} → {m.to} <b className={m.sf >= 0 ? "text-amber-600" : "text-emerald-600"}>{m.sf >= 0 ? "+" : ""}{m.sf.toLocaleString()} SF</b></span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* The session */}
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="flex items-center gap-2 text-sm font-bold"><MonitorPlay className="h-4 w-4 text-[#0089a3]" /> The live session</h3>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Agenda — drafted from the gaps</p>
                  <ol className="mt-2 space-y-1.5 text-xs text-slate-700">
                    <li>1. Numbers to confirm — <b>{gaps.intake.length}</b> lines intake couldn&apos;t size or count</li>
                    <li>2. Deferred topics — <b>{gaps.deferred.length}</b>{gaps.deferred.length ? `: ${gaps.deferred.join(" · ")}` : ""}</li>
                    <li>3. {e.result.goals?.targetSF ? `The target conversation — ${e.result.goals.targetSF.toLocaleString()} SF vs ${d!.totals.grossUsableSF.toLocaleString()} SF` : "Ask for their number, then the target conversation"}</li>
                    <li>4. Shape the program live · close with next steps</li>
                  </ol>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Prep pack</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a href={`/prep/${token}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#00badc]/50 hover:text-[#0089a3]">
                      <FileText className="h-3.5 w-3.5" /> Client prep sheet
                    </a>
                    <a href="/studio" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#00badc]/50 hover:text-[#0089a3]">
                      <FileSpreadsheet className="h-3.5 w-3.5" /> Fit-planning package (via Studio)
                    </a>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">The screen kit — open before the call</p>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <Screen icon={<LayoutGrid className="h-3.5 w-3.5" />} what="Studio — Briefing view" why="main share" href="/studio" />
                    <Screen icon={<MapIcon className="h-3.5 w-3.5" />} what="Program map (Studio → Map)" why="the Zoom visual" href="/studio" />
                    <Screen icon={<Target className="h-3.5 w-3.5" />} what="Target page" why="the number conversation" href="/lab/target" />
                  </div>
                </div>
              </section>
            </div>

            {/* ── The deliverable — review → push ───────────────────────── */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold"><Share2 className="h-4 w-4 text-[#0089a3]" /> The deliverable</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {e.shared
                    ? "Live for the client — it renders the session's program, decisions included."
                    : "Private. Review it as the client will see it, then push — nothing reaches them until you do."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${e.shared ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {e.shared ? "Live for the client ✓" : "Draft — human review pending"}
                </span>
                <a href={`/d/${token}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400">
                  <ExternalLink className="h-3.5 w-3.5" /> Review the deck
                </a>
                <button
                  onClick={toggleShare}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    e.shared ? "border border-slate-300 text-slate-600 hover:border-slate-400" : "bg-[#0e1a2e] text-white hover:bg-slate-700"
                  }`}
                >
                  <Send className="h-3.5 w-3.5" /> {e.shared ? "Pull back" : "Push to client"}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3f7fa] px-6 text-center">{children}</div>
}

function KV({ k, v }: { k: string; v: string }) {
  return <p className="text-xs leading-relaxed text-slate-600"><b className="text-slate-400">{k}:</b> {v}</p>
}

function Screen({ icon, what, why, href }: { icon: React.ReactNode; what: string; why: string; href: string }) {
  return (
    <a href={href} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 hover:border-[#00badc]/50">
      <span className="flex items-center gap-2 font-medium text-slate-700">{icon} {what}</span>
      <span className="text-slate-400">{why} <ExternalLink className="ml-1 inline h-3 w-3" /></span>
    </a>
  )
}
