"use client"

import { use, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import {
  ArrowLeft, ArrowRight, Printer, Share2, Undo2, Lock, Users, CalendarDays, TrendingUp, Target, ClipboardList,
} from "lucide-react"
import { WorkplaceProfile } from "@/components/survey/workplace-profile"
import { ProgramMapView } from "@/components/survey/program-map"
import { buildDeliverable, KEY_DECISION_KEYS, CATEGORY_COLORS, type DeliverableOverrides, type DeliverableAddition } from "@/lib/survey/deliverable"
import { WORKSTATION_SIZES, OFFICE_SIZES } from "@/lib/survey/sections"
import { isNelsonMode, nelsonCode } from "@/lib/nelsonMode"
import type { SurveyResult } from "@/lib/survey/types"
import type { ComparisonLine } from "@/lib/survey/comparison"

/**
 * The deliverable — a slide-style presentation of the client's program, and its
 * own take-home PDF (print renders every slide, one per page). Gated: clients
 * see it only after NELSON audits the intake and flips Share; NELSON always
 * can, and can edit the key unit sizes live — edits recompute the whole program
 * and persist, so the printed document matches what was presented.
 */
/** The Studio session riding on the engagement — the deck renders ITS program. */
interface DeckSession {
  overrides?: DeliverableOverrides
  counts?: Record<string, number>
  additions?: DeliverableAddition[]
  notes?: Record<string, string>
  resolvedGaps?: Record<string, boolean>
}

export default function DeliverablePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [nelson, setNelson] = useState(false)
  const [meta, setMeta] = useState<{ clientName: string; shared: boolean } | null>(null)
  const [result, setResult] = useState<SurveyResult | null>(null)
  const [overrides, setOverrides] = useState<DeliverableOverrides>({})
  const [session, setSession] = useState<DeckSession | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "gated" | "missing">("loading")
  const [idx, setIdx] = useState(0)
  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    const isN = isNelsonMode()
    setNelson(isN)
    fetch(`/api/engagements/${token}`, isN ? { headers: { "x-nelson-code": nelsonCode() ?? "" } } : undefined)
      .then(async (r) => {
        if (!r.ok) { setState("missing"); return }
        const e = await r.json()
        setMeta({ clientName: e.clientName, shared: !!e.shared })
        if (e.result) {
          setResult(e.result)
          setSession(e.session ?? null)
          // The session's overrides are the meeting's truth; legacy engagement
          // overrides are the fallback for pre-session engagements.
          setOverrides(e.session?.overrides ?? e.overrides ?? {})
          setState("ready")
        } else {
          setState("gated")
        }
      })
      .catch(() => setState("missing"))
  }, [token])

  const d = useMemo(
    () => (result ? buildDeliverable(result, overrides, session?.counts ?? {}, session?.additions ?? []) : null),
    [result, overrides, session],
  )

  // The session's decisions — derived exactly like the Studio derives them,
  // so the "what we decided together" slide is the meeting's own record.
  const decisions = useMemo(() => {
    if (!d || !session) return []
    const out: { text: string; note?: string }[] = []
    const note = (id: string) => (session.notes?.[id] ? { note: session.notes[id] } : {})
    for (const b of d.comp.lines) {
      const sf = session.overrides?.[b.key] ?? overrides[b.key]
      if (sf && sf > 0 && sf !== b.unitSF) out.push({ text: `${b.label} — unit size ${b.unitSF} → ${sf} SF`, ...note(`${b.key}:sf`) })
      const q = session.counts?.[b.key]
      if (q !== undefined && q !== b.proposedCount) out.push({ text: `${b.label} — quantity ${b.proposedCount} → ${q}`, ...note(`${b.key}:qty`) })
    }
    for (const a of session.additions ?? [])
      out.push({ text: `Added ${a.label} — ${a.proposedCount} × ${a.unitSF} SF`, ...note(`add:${a.key}`) })
    for (const [gid, on] of Object.entries(session.resolvedGaps ?? {}))
      if (on) out.push({ text: `Confirmed live — ${gid.split("::")[1] ?? gid}`, ...note(`gapnote:${gid}`) })
    return out
  }, [d, session, overrides])

  // NELSON edits persist (debounced) — the record matches the presentation.
  // When a Studio session exists, edits land IN the session (one truth).
  const setOverride = (key: string, sf: number | null) => {
    if (!nelson) return
    setOverrides((prev) => {
      const next = { ...prev }
      if (sf && sf > 0) next[key] = sf
      else delete next[key]
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        fetch(`/api/engagements/${token}`, {
          method: "PATCH",
          headers: { "x-nelson-code": nelsonCode() ?? "" },
          body: JSON.stringify(session ? { session: { ...session, overrides: next } } : { overrides: next }),
        }).catch(() => {})
      }, 600)
      if (session) setSession({ ...session, overrides: next })
      return next
    })
  }

  const toggleShare = async () => {
    if (!meta) return
    const next = !meta.shared
    setMeta({ ...meta, shared: next })
    fetch(`/api/engagements/${token}`, {
      method: "PATCH",
      headers: { "x-nelson-code": nelsonCode() ?? "" },
      body: JSON.stringify({ shared: next }),
    }).catch(() => {})
  }

  const slides = d ? buildSlides() : []
  function buildSlides(): string[] {
    const out: string[] = ["cover", "who", "profile", "map", "verdict"]
    if (result?.goals?.targetSF) out.push("target")
    if (decisions.length > 0) out.push("decided")
    out.push("compare", "program", "next")
    return out
  }

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") setIdx((i) => Math.min(i + 1, slides.length - 1))
      if (e.key === "ArrowLeft" || e.key === "PageUp") setIdx((i) => Math.max(i - 1, 0))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [slides.length])

  if (state === "loading") {
    return <Shell><p className="text-slate-400">Preparing your presentation…</p></Shell>
  }
  if (state === "missing") {
    return (
      <Shell>
        <Image src="/NELSON_color.png" alt="NELSON" width={170} height={40} className="h-8 w-auto" />
        <p className="mt-5 max-w-md text-slate-600">This link isn&apos;t active. Check it with your NELSON contact.</p>
      </Shell>
    )
  }
  if (state === "gated" || (!nelson && meta && !meta.shared)) {
    return (
      <Shell>
        <Image src="/NELSON_color.png" alt="NELSON" width={170} height={40} className="h-8 w-auto" />
        <span className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#00badc]/10 text-[#0089a3]"><Lock className="h-5 w-5" /></span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Your program is still in the studio.</h1>
        <p className="mt-2 max-w-md text-slate-600">
          Our team is reviewing what you shared and layering in the thinking that isn&apos;t math.
          Your NELSON contact will walk you through it — then it lives here.
        </p>
      </Shell>
    )
  }
  if (!d || !meta) return null

  const KEYED = new Set<string>(KEY_DECISION_KEYS)

  return (
    <div className="min-h-screen bg-[#0e1a2e] text-slate-900">
      {/* NELSON presenter toolbar */}
      {nelson && (
        <div className="fixed left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-[#0e1a2e]/90 px-3 py-1.5 text-xs text-white/80 shadow-lg backdrop-blur print:hidden">
          <span className="font-semibold text-white">{meta.clientName}</span>
          <span className="text-white/25">·</span>
          <button onClick={toggleShare} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-colors ${meta.shared ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 hover:bg-white/20"}`}>
            <Share2 className="h-3.5 w-3.5" /> {meta.shared ? "Shared with client" : "Not shared — private"}
          </button>
          {Object.keys(overrides).length > 0 && (
            <button onClick={() => { setOverrides({}); fetch(`/api/engagements/${token}`, { method: "PATCH", headers: { "x-nelson-code": nelsonCode() ?? "" }, body: JSON.stringify({ overrides: {} }) }).catch(() => {}) }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-medium hover:bg-white/20">
              <Undo2 className="h-3.5 w-3.5" /> Reset edits
            </button>
          )}
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-full bg-[#00badc] px-2.5 py-1 font-semibold text-slate-900 hover:bg-[#2fd0ee]">
            <Printer className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      )}

      {/* Slides — all in the DOM; screen shows one, print shows all */}
      {slides.map((s, i) => (
        <section
          key={s}
          className={`slide relative ${i === idx ? "flex slide-in" : "hidden"} min-h-screen flex-col print:flex print:min-h-0 print:h-[7.25in] print:overflow-hidden`}
        >
          {s === "cover" && <CoverSlide clientName={meta.clientName} />}
          {s === "who" && <WhoSlide d={d} result={result!} />}
          {s === "profile" && (
            <LightSlide eyebrow="Your Workplace Profile" title="How your organization wants to work">
              <div className="mx-auto grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
                <WorkplaceProfile scores={d.profile} />
                <p className="text-lg leading-relaxed text-slate-600">
                  Six axes, drawn from your own answers — the strategy priorities we design your
                  program around. We&apos;ll unpack what each one means for your space together.
                </p>
              </div>
            </LightSlide>
          )}
          {s === "map" && (
            <LightSlide eyebrow="Your Program Map" title="Your teams, as neighborhoods">
              <div className="mx-auto w-full max-w-6xl">
                <ProgramMapView map={d.map} />
              </div>
            </LightSlide>
          )}
          {s === "verdict" && <VerdictSlide d={d} />}
          {s === "target" && result?.goals?.targetSF && (
            <TargetSlide d={d} targetSF={result.goals.targetSF} source={result.goals.targetSource} />
          )}
          {s === "decided" && <DecidedSlide decisions={decisions} />}
          {s === "compare" && <CompareSlide d={d} />}
          {s === "program" && (
            <ProgramSlide d={d} nelson={nelson} keyed={KEYED} overrides={overrides} onOverride={setOverride} />
          )}
          {s === "next" && <NextSlide d={d} result={result!} />}
          {/* Print footer — the take-home is paginated like a document */}
          <div className="absolute bottom-2 left-0 right-0 hidden text-center text-[9px] tracking-wide text-slate-400 print:block">
            {meta.clientName} · Workplace Program · NELSON · {i + 1} / {slides.length}
          </div>
        </section>
      ))}

      {/* Deck chrome */}
      <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/15 bg-[#0e1a2e]/90 px-3 py-2 text-white shadow-lg backdrop-blur print:hidden">
        <button onClick={() => setIdx((i) => Math.max(i - 1, 0))} disabled={idx === 0} aria-label="Previous slide"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-30">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5">
          {slides.map((s, i) => (
            <button key={s} onClick={() => setIdx(i)} aria-label={`Slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${i === idx ? "w-6 bg-[#00badc]" : "w-2 bg-white/25 hover:bg-white/50"}`} />
          ))}
        </div>
        <button onClick={() => setIdx((i) => Math.min(i + 1, slides.length - 1))} disabled={idx === slides.length - 1} aria-label="Next slide"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-30">
          <ArrowRight className="h-4 w-4" />
        </button>
        <span className="ml-1 text-xs tabular-nums text-white/50">{idx + 1} / {slides.length}</span>
      </div>

      <style>{`
        @page { size: letter landscape; margin: 0.4in; }
        @media print { .slide { break-after: page; } }
        .slide-in { animation: slideIn 260ms ease-out; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .slide-in { animation: none; } }
      `}</style>
    </div>
  )
}

/* ── Slides ────────────────────────────────────────────────────────────────── */

function CoverSlide({ clientName }: { clientName: string }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[#0e1a2e] text-white">
      <Image src="/office-1.jpg" alt="" fill className="object-cover opacity-25" priority />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e1a2e] via-transparent to-[#0e1a2e]/60" />
      <div className="relative z-10 flex flex-1 flex-col justify-between p-10 sm:p-16">
        <Image src="/NELSON_whiteBlueFin.png" alt="NELSON" width={190} height={45} className="h-9 w-auto self-start" priority />
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#00badc]">Workplace Program</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">{clientName}</h1>
          <p className="mt-5 text-white/60">
            {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} · Prepared by NELSON Worldwide
          </p>
        </div>
      </div>
    </div>
  )
}

function WhoSlide({ d, result }: { d: NonNullable<ReturnType<typeof buildDeliverable>>; result: SurveyResult }) {
  return (
    <LightSlide eyebrow="Who you are" title="The organization we're designing for">
      <div className="mx-auto grid w-full max-w-5xl gap-6 sm:grid-cols-3">
        <Stat icon={<Users className="h-5 w-5" />} value={`${d.current} → ${d.future}`} label="people today → planning horizon" />
        <Stat icon={<CalendarDays className="h-5 w-5" />} value={`${d.daysInOffice}`} label="days in office / week (avg)" />
        <Stat icon={<TrendingUp className="h-5 w-5" />} value={`${result.people.departments.length}`} label="departments" />
      </div>
      <div className="mx-auto mt-8 flex w-full max-w-5xl flex-wrap gap-2">
        {result.people.departments.map((dept) => (
          <span key={dept.id} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-700">
            {dept.name} · {dept.headcount}{dept.futureHeadcount && dept.futureHeadcount !== dept.headcount ? ` → ${dept.futureHeadcount}` : ""}
          </span>
        ))}
      </div>
    </LightSlide>
  )
}

function VerdictSlide({ d }: { d: NonNullable<ReturnType<typeof buildDeliverable>> }) {
  const delta = d.totals.grossUsableSF - d.totals.existingSF
  return (
    <div className="flex flex-1 flex-col justify-center bg-[#0e1a2e] p-10 text-white sm:p-16">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#00badc]">The verdict</p>
      <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <span className="text-7xl font-bold tabular-nums tracking-tight sm:text-8xl">{d.totals.grossUsableSF.toLocaleString()}</span>
        <span className="text-2xl text-white/60">usable SF proposed</span>
      </div>
      {d.totals.existingSF > 0 && (
        <p className="mt-3 text-lg text-white/70">
          {delta >= 0 ? "+" : ""}{delta.toLocaleString()} SF vs. today&apos;s program ({d.totals.existingSF.toLocaleString()} SF)
        </p>
      )}
      <div className="mt-8 max-w-2xl rounded-2xl border border-[#00badc]/30 bg-[#00badc]/10 p-6">
        <p className="text-xl font-semibold text-[#7fe3f5]">{d.strategy.headline}</p>
        <p className="mt-2 leading-relaxed text-white/75">{d.strategy.note}</p>
      </div>
      <div className="mt-8 flex flex-wrap gap-8 text-sm text-white/60">
        <span><b className="text-white">{d.totals.sfPerPerson}</b> SF / person</span>
        <span><b className="text-white">{d.totals.estimatedRentableSF.toLocaleString()}</b> est. rentable SF (×{(1 + d.totals.rentableFactor).toFixed(2)} load)</span>
        <span><b className="text-white">{d.totals.circulationSF.toLocaleString()}</b> SF circulation</span>
      </div>
    </div>
  )
}

function TargetSlide({
  d, targetSF, source,
}: {
  d: NonNullable<ReturnType<typeof buildDeliverable>>
  targetSF: number
  source?: string
}) {
  const gross = d.totals.grossUsableSF
  const gap = targetSF - gross
  const state: "spare" | "inline" | "compromise" =
    targetSF >= gross * 1.05 ? "spare" : targetSF >= gross * 0.98 ? "inline" : "compromise"
  const copy = {
    spare: {
      title: "Room to spare.",
      body: `Your footprint carries ${gap.toLocaleString()} SF beyond what your program needs — headroom for growth, amenity, or simply a lighter lease.`,
    },
    inline: {
      title: "Your number holds.",
      body: "The program your team's answers call for and the footprint you hold agree — the comfortable verdict.",
    },
    compromise: {
      title: "Reachable — and we chose the trades together.",
      body: `Closing ${Math.abs(gap).toLocaleString()} SF took real decisions, not wishful math. The next page is the record of what we decided — and what we protected.`,
    },
  }[state]
  const max = Math.max(gross, targetSF) * 1.06
  return (
    <div className="flex flex-1 flex-col justify-center bg-[#0e1a2e] p-10 text-white sm:p-16">
      <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-[#00badc]">
        <Target className="h-4 w-4" /> Your number
      </p>
      <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <span className="text-7xl font-bold tabular-nums tracking-tight sm:text-8xl">{targetSF.toLocaleString()}</span>
        <span className="text-2xl text-white/60">SF{source ? ` · your ${source}` : ""}</span>
      </div>
      <div className="relative mt-10 max-w-3xl">
        <div className="flex h-5 gap-[2px] overflow-hidden rounded-full" style={{ width: `${(gross / max) * 100}%` }}>
          {d.categories.filter((c) => c.proposedTotalSF > 0).map((c) => (
            <span key={c.name} style={{ width: `${(c.proposedTotalSF / gross) * 100}%`, backgroundColor: CATEGORY_COLORS[c.name].accent }} />
          ))}
        </div>
        <div className="absolute -inset-y-1.5 w-[3px] rounded-full bg-white" style={{ left: `${(targetSF / max) * 100}%` }} />
        <p className="mt-3 text-sm text-white/60">
          your program {gross.toLocaleString()} SF · your number {targetSF.toLocaleString()} SF ·{" "}
          <b className={gap >= 0 ? "text-emerald-300" : "text-amber-300"}>{gap >= 0 ? "+" : ""}{gap.toLocaleString()} SF</b>
        </p>
      </div>
      <div className="mt-8 max-w-2xl rounded-2xl border border-[#00badc]/30 bg-[#00badc]/10 p-6">
        <p className="text-xl font-semibold text-[#7fe3f5]">{copy.title}</p>
        <p className="mt-2 leading-relaxed text-white/75">{copy.body}</p>
      </div>
    </div>
  )
}

function DecidedSlide({ decisions }: { decisions: { text: string; note?: string }[] }) {
  return (
    <LightSlide eyebrow="What we decided together" title="The session's record — your fingerprints on the program">
      <div className="mx-auto w-full max-w-4xl space-y-3">
        {decisions.slice(0, 8).map((x, i) => (
          <div key={i} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00badc]/10 text-[#0089a3]">
              <ClipboardList className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="font-semibold text-slate-900">{x.text}</p>
              {x.note && <p className="mt-0.5 text-sm italic text-slate-500">“{x.note}”</p>}
            </div>
          </div>
        ))}
        {decisions.length > 8 && (
          <p className="text-center text-sm text-slate-400">+ {decisions.length - 8} more in the technical appendix</p>
        )}
      </div>
    </LightSlide>
  )
}

function CompareSlide({ d }: { d: NonNullable<ReturnType<typeof buildDeliverable>> }) {
  const max = Math.max(1, ...d.categories.map((c) => Math.max(c.existingSF, c.proposedTotalSF)))
  return (
    <LightSlide eyebrow="Existing vs proposed" title="Where the space shifts">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {d.categories.map((c) => (
          <div key={c.name}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="font-semibold text-slate-900">{c.name}</span>
              <span className="text-sm tabular-nums text-slate-500">
                {c.existingSF.toLocaleString()} SF today → <b className="text-slate-900">{c.proposedTotalSF.toLocaleString()} SF</b> proposed
              </span>
            </div>
            <div className="space-y-1">
              <div className="h-3 rounded-full bg-slate-100">
                <div className="h-3 rounded-full bg-slate-300" style={{ width: `${(c.existingSF / max) * 100}%` }} />
              </div>
              <div className="h-3 rounded-full bg-slate-100">
                <div className="h-3 rounded-full bg-[#00badc]" style={{ width: `${(c.proposedTotalSF / max) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
        <div className="flex gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Today</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#00badc]" /> Proposed (incl. circulation)</span>
        </div>
      </div>
    </LightSlide>
  )
}

function ProgramSlide({
  d, nelson, keyed, overrides, onOverride,
}: {
  d: NonNullable<ReturnType<typeof buildDeliverable>>
  nelson: boolean
  keyed: Set<string>
  overrides: DeliverableOverrides
  onOverride: (key: string, sf: number | null) => void
}) {
  const line = (key: string) => d.lines.find((l) => l.key === key)
  return (
    <div className="flex-1 bg-[#f3f7fa] p-8 sm:p-12">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0089a3]">The program</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight">Every space, sized — the full readout</h2>

      {/* Key decisions — the sizes that move the number most */}
      {nelson && (
        <div className="mt-5 rounded-2xl border border-[#00badc]/30 bg-white p-4 print:hidden">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0089a3]">Key decisions — live</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <SizeChips label="Workstation" options={WORKSTATION_SIZES} line={line("workstations")} overrides={overrides} onOverride={onOverride} />
            <SizeChips label="Office" options={OFFICE_SIZES} line={line("offices")} overrides={overrides} onOverride={onOverride} />
          </div>
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-4 py-2.5 font-semibold">Space</th>
              <th className="px-3 py-2.5 font-semibold">Planning ratio</th>
              <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
              <th className="px-3 py-2.5 text-right font-semibold">Unit SF</th>
              <th className="px-4 py-2.5 text-right font-semibold">Total SF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {d.categories.map((c) => (
              <CategoryRows key={c.name} cat={c} nelson={nelson} keyed={keyed} onOverride={onOverride} />
            ))}
            <tr className="bg-slate-50 font-semibold">
              <td className="px-4 py-2.5" colSpan={4}>Gross usable (net + circulation)</td>
              <td className="px-4 py-2.5 text-right">{d.totals.grossUsableSF.toLocaleString()}</td>
            </tr>
            <tr className="text-slate-500">
              <td className="px-4 py-2" colSpan={4}>Rentable add-on (load factor ×{(1 + d.totals.rentableFactor).toFixed(2)})</td>
              <td className="px-4 py-2 text-right">{d.totals.rentableAddOnSF.toLocaleString()}</td>
            </tr>
            <tr className="bg-[#0e1a2e] font-bold text-white">
              <td className="rounded-bl-2xl px-4 py-3" colSpan={4}>Estimated rentable SF</td>
              <td className="rounded-br-2xl px-4 py-3 text-right">{d.totals.estimatedRentableSF.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {nelson && <p className="mt-2 text-xs text-slate-400 print:hidden">Unit sizes are editable (cyan) — the whole program recomputes and your edits are saved to the engagement.</p>}
    </div>
  )
}

function CategoryRows({
  cat, nelson, keyed, onOverride,
}: {
  cat: NonNullable<ReturnType<typeof buildDeliverable>>["categories"][number]
  nelson: boolean
  keyed: Set<string>
  onOverride: (key: string, sf: number | null) => void
}) {
  const visible = cat.lines.filter((l) => l.proposedCount > 0 || l.existingCount > 0)
  if (visible.length === 0) return null
  return (
    <>
      <tr className="bg-[#00badc]/[0.06]">
        <td className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-[#0089a3]" colSpan={5}>{cat.name}</td>
      </tr>
      {visible.map((l) => (
        <tr key={l.key}>
          <td className="px-4 py-2 font-medium text-slate-900">
            {l.label}
            {keyed.has(l.key) && <span className="ml-2 rounded-full bg-[#00badc]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#0089a3]">key</span>}
          </td>
          <td className="px-3 py-2 text-slate-500">{l.ratio ?? "—"}</td>
          <td className="px-3 py-2 text-right text-slate-700">{l.proposedCount}</td>
          <td className="px-3 py-2 text-right">
            {nelson ? (
              <input
                type="number" min={1} value={l.unitSF}
                onChange={(e) => onOverride(l.key, e.target.value === "" ? null : Number(e.target.value))}
                className="w-20 rounded-md border border-[#00badc]/40 bg-[#e9f7fb]/60 px-2 py-1 text-right text-sm tabular-nums text-slate-900 focus:border-[#00badc] focus:outline-none print:border-0 print:bg-transparent"
              />
            ) : (
              <span className="text-slate-700">{l.unitSF}</span>
            )}
          </td>
          <td className="px-4 py-2 text-right text-slate-900">{(l.proposedCount * l.unitSF).toLocaleString()}</td>
        </tr>
      ))}
      <tr className="text-slate-500">
        <td className="px-4 py-1.5 text-xs" colSpan={4}>{cat.name} circulation</td>
        <td className="px-4 py-1.5 text-right text-xs">{cat.circulationSF.toLocaleString()}</td>
      </tr>
    </>
  )
}

function SizeChips({
  label, options, line, overrides, onOverride,
}: {
  label: string
  options: { id: string; label: string; sf: number }[]
  line?: ComparisonLine
  overrides: DeliverableOverrides
  onOverride: (key: string, sf: number | null) => void
}) {
  if (!line) return null
  const active = overrides[line.key] ?? line.unitSF
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onOverride(line.key, o.sf)}
          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
            active === o.sf ? "border-[#00badc] bg-[#00badc]/15 text-slate-900" : "border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function NextSlide({ d, result }: { d: NonNullable<ReturnType<typeof buildDeliverable>>; result: SurveyResult }) {
  return (
    <LightSlide eyebrow="What's next" title="From program to plan">
      <div className="mx-auto w-full max-w-4xl">
        <ol className="space-y-5">
          {[
            ["Validate together", "Your working session — every number in this document walked live, every open question decided in the room."],
            ["Refine the program", "Adjustments from the session flow straight back into this document."],
            ["Hand off to fit planning", "The validated program goes to NELSON's fit-planning team to test on real floor plates."],
          ].map(([t, b], i) => (
            <li key={t} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0e1a2e] font-bold text-white">{i + 1}</span>
              <span>
                <span className="block text-lg font-semibold text-slate-900">{t}</span>
                <span className="text-slate-600">{b}</span>
              </span>
            </li>
          ))}
        </ol>
        {result.deferred.length > 0 && (
          <p className="mt-8 rounded-xl border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm text-slate-600">
            <b className="text-slate-900">{result.deferred.length} question{result.deferred.length === 1 ? "" : "s"}</b> you
            deferred to the live session — they&apos;re on the agenda.
          </p>
        )}
        <p className="mt-10 text-sm text-slate-400">
          {d.clientName} · Workplace Program · NELSON Worldwide
        </p>
      </div>
    </LightSlide>
  )
}

/* ── Chrome ────────────────────────────────────────────────────────────────── */

function LightSlide({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col justify-center bg-[#f3f7fa] p-8 sm:p-14">
      <div className="mx-auto mb-8 w-full max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0089a3]">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00badc]/12 text-[#0089a3]">{icon}</span>
      <div className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3f7fa] px-6 text-center">
      {children}
    </div>
  )
}
