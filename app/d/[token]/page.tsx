"use client"

import { use, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import {
  ArrowLeft, ArrowRight, Printer, Share2, Undo2, Lock, Users, CalendarDays, TrendingUp, Target, ClipboardList,
  Layers, Check, PartyPopper,
} from "lucide-react"
import { WorkplaceProfile } from "@/components/survey/workplace-profile"
import { ProgramMapView } from "@/components/survey/program-map"
import { MAP_DEPT_COLORS } from "@/lib/survey/programMap"
import { SpaceDetailModal } from "@/components/survey/space-detail-modal"
import { COLLAB_CATALOG, SUPPORT_CATALOG, type CatalogSpace } from "@/lib/survey/catalog"
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
  factors?: Record<string, number>
  /** Seating moves from the Studio's Department Manager. */
  people?: { officeEmployeeIds?: string[]; deskEmployeeIds?: string[] }
  /** The beat composer: slide id → included (absent = included). */
  beats?: Record<string, boolean>
}

/** Slides the composer may drop; cover stays, always. */
const COMPOSABLE = ["who", "growth", "howwork", "profile", "map", "compare", "program", "next"] as const
const SLIDE_NAMES: Record<string, string> = {
  cover: "Cover", who: "Who you are", growth: "Where you're headed", howwork: "How you work",
  profile: "Workplace Profile", map: "Program map",
  verdict: "The verdict", target: "Your number", decided: "What we decided",
  compare: "Existing vs proposed", program: "The program", next: "What's next",
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
    () => (result ? buildDeliverable(result, overrides, session?.counts ?? {}, session?.additions ?? [], session?.factors ?? {}, session?.people) : null),
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

  // Situational beats — slides that exist only when the story calls for them.
  const hasGrowthStory = !!result && result.people.departments.some((x) => (x.futureHeadcount ?? x.headcount) !== x.headcount)

  const slides = d ? buildSlides() : []
  function buildSlides(): string[] {
    const out: string[] = ["cover", "who"]
    if (hasGrowthStory) out.push("growth")
    out.push("howwork", "profile", "map", "verdict")
    if (result?.goals?.targetSF) out.push("target")
    if (decisions.length > 0) out.push("decided")
    out.push("compare", "program", "next")
    // The composer: the designer curates which beats this engagement gets.
    return out.filter((s) => s === "cover" || session?.beats?.[s] !== false)
  }

  // The beat composer — NELSON curates the deck; the choice persists on the session.
  const [composer, setComposer] = useState(false)
  const toggleBeat = (s: string) => {
    const next = { ...(session?.beats ?? {}), [s]: session?.beats?.[s] === false }
    const nextSession = { ...(session ?? {}), beats: next }
    setSession(nextSession)
    setIdx(0)
    fetch(`/api/engagements/${token}`, {
      method: "PATCH",
      headers: { "x-nelson-code": nelsonCode() ?? "" },
      body: JSON.stringify({ session: nextSession }),
    }).catch(() => {})
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

  // Canva-style stage navigation: click the right half of the slide to advance,
  // the left half to go back. Anything interactive — buttons, links, inputs,
  // dialogs, the map (which pans and spotlights) — keeps its own clicks.
  const stageClick = (e: React.MouseEvent) => {
    const el = e.target as HTMLElement
    if (el.closest("button, a, input, textarea, select, label, [role='dialog'], [data-no-advance]")) return
    if (window.getSelection()?.toString()) return
    if (e.clientX > window.innerWidth / 2) setIdx((i) => Math.min(i + 1, slides.length - 1))
    else setIdx((i) => Math.max(i - 1, 0))
  }

  // The presenter's pointer, made visible: a soft NELSON-blue halo that trails
  // the mouse so a room following along on screen never loses it.
  const haloRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const move = (e: MouseEvent) => {
      const el = haloRef.current
      if (!el) return
      el.style.opacity = "1"
      el.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
    }
    const hide = () => { if (haloRef.current) haloRef.current.style.opacity = "0" }
    window.addEventListener("mousemove", move)
    document.documentElement.addEventListener("mouseleave", hide)
    return () => {
      window.removeEventListener("mousemove", move)
      document.documentElement.removeEventListener("mouseleave", hide)
    }
  }, [])

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
    <div className="min-h-screen bg-[#0e1a2e] text-slate-900" onClick={stageClick}>
      {/* The presenter's pointer halo — pure chrome, never printed */}
      <div
        ref={haloRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[60] -ml-4 -mt-4 h-8 w-8 rounded-full bg-[#00badc]/45 opacity-0 blur-md transition-opacity duration-300 print:hidden"
        style={{ willChange: "transform" }}
      />
      {/* NELSON presenter toolbar */}
      {nelson && (
        <div data-no-advance className="fixed left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-[#0e1a2e]/90 px-3 py-1.5 text-xs text-white/80 shadow-lg backdrop-blur print:hidden">
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
          <div className="relative">
            <button onClick={() => setComposer((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${composer ? "bg-white/25" : "bg-white/10 hover:bg-white/20"}`}>
              <Layers className="h-3.5 w-3.5" /> Slides · {slides.length}
            </button>
            {composer && (
              <div className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-xl border border-white/15 bg-[#0e1a2e] p-2 shadow-xl">
                <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-white/40">Compose this deck</p>
                {COMPOSABLE.map((s) => {
                  const on = session?.beats?.[s] !== false
                  return (
                    <button key={s} onClick={() => toggleBeat(s)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10">
                      {SLIDE_NAMES[s]}
                      <span className={`flex h-4 w-4 items-center justify-center rounded ${on ? "bg-[#00badc] text-slate-900" : "bg-white/15"}`}>
                        {on && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  )
                })}
                <p className="px-2 pt-1 text-[10px] leading-relaxed text-white/35">Verdict, target & decisions always ride; cover too.</p>
              </div>
            )}
          </div>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-full bg-[#00badc] px-2.5 py-1 font-semibold text-slate-900 hover:bg-[#2fd0ee]">
            <Printer className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      )}

      {/* Slides — all in the DOM; screen shows one, print shows all */}
      {slides.map((s, i) => (
        <section
          key={s}
          className={`slide relative ${i === idx ? "flex slide-in" : "hidden"} min-h-screen flex-col print:flex print:min-h-0 print:h-[7.5in] print:w-[13.333in] print:overflow-hidden`}
        >
          {s === "cover" && <CoverSlide clientName={meta.clientName} d={d} result={result!} />}
          {s === "who" && <WhoSlide d={d} result={result!} />}
          {s === "growth" && <GrowthSlide result={result!} />}
          {s === "howwork" && <HowWorkSlide d={d} result={result!} />}
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
            <div data-no-advance className="relative flex-1 overflow-hidden bg-white">
              {/* Immersive: the map IS the slide; the title floats on it */}
              <div className="absolute inset-0">
                <ProgramMapView map={d.map} heightClass="h-full" frameless />
              </div>
              <div className="pointer-events-none absolute left-8 top-8 z-10 rounded-2xl bg-white/85 px-5 py-4 shadow-sm ring-1 ring-slate-200/70 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0089a3]">Your Program Map</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">Your teams, as neighborhoods</h2>
              </div>
            </div>
          )}
          {s === "verdict" && <VerdictSlide d={d} />}
          {s === "target" && result?.goals?.targetSF && (
            <TargetSlide d={d} targetSF={result.goals.targetSF} source={result.goals.targetSource} />
          )}
          {s === "decided" && <DecidedSlide decisions={decisions} />}
          {s === "compare" && <CompareSlide d={d} />}
          {s === "program" && (
            <ProgramSlide d={d} nelson={nelson} keyed={KEYED} overrides={overrides} onOverride={setOverride} targetSF={result?.goals?.targetSF} />
          )}
          {s === "next" && <NextSlide d={d} result={result!} clientName={meta.clientName} />}
          {/* Print footer — quiet, consistent, the only mark on the page */}
          <div className="absolute bottom-3 left-0 right-0 hidden px-10 print:block">
            <div className="flex items-baseline justify-between text-[8px] uppercase tracking-[0.14em] text-slate-400">
              <span>{meta.clientName} · Workplace Program</span>
              <span>NELSON Worldwide · printed {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · {i + 1} / {slides.length}</span>
            </div>
          </div>
        </section>
      ))}

      {/* Deck chrome */}
      <div data-no-advance className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/15 bg-[#0e1a2e]/90 px-3 py-2 text-white shadow-lg backdrop-blur print:hidden">
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
        /* The take-home PDF is a true 16:9 deck — full bleed, zero browser
           chrome (margin: 0 removes the default header/footer marks), each
           slide exactly one page in the same fonts the screen uses. */
        @page { size: 13.333in 7.5in; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          .slide { break-after: page; break-inside: avoid; }
        }
        .slide-in { animation: slideIn 260ms ease-out; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .slide-in { animation: none; } }
      `}</style>
    </div>
  )
}

/* ── Slides ────────────────────────────────────────────────────────────────── */

function CoverSlide({ clientName, d, result }: { clientName: string; d: NonNullable<ReturnType<typeof buildDeliverable>>; result: SurveyResult }) {
  // The cover alone summarizes the engagement (Advisory #5).
  const oneLiner = [
    `${d.current} → ${d.future} people`,
    `~${(Math.round(d.totals.grossUsableSF / 100) * 100).toLocaleString()} SF usable`,
    `${d.daysInOffice} day${d.daysInOffice === 1 ? "" : "s"}/wk`,
    ...(result.goals?.targetSF ? [`target ${result.goals.targetSF.toLocaleString()} SF`] : []),
  ].join(" · ")
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[#0e1a2e] text-white">
      <Image src="/office-1.jpg" alt="" fill className="object-cover opacity-25" priority />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e1a2e] via-transparent to-[#0e1a2e]/60" />
      <div className="relative z-10 flex flex-1 flex-col justify-between p-10 sm:p-16">
        <Image src="/NELSON_whiteBlueFin.png" alt="NELSON" width={190} height={45} className="h-9 w-auto self-start" priority />
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#00badc]">Workplace Program</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">{clientName}</h1>
          <p className="mt-4 text-lg font-medium text-white/80">{oneLiner}</p>
          <p className="mt-3 text-white/50">
            {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} · Prepared by NELSON Worldwide
          </p>
        </div>
      </div>
    </div>
  )
}

/** Situational: the growth story — only when headcounts actually move. */
function GrowthSlide({ result }: { result: SurveyResult }) {
  const depts = result.people.departments
  const totalNow = depts.reduce((s, x) => s + x.headcount, 0)
  const totalFut = depts.reduce((s, x) => s + (x.futureHeadcount ?? x.headcount), 0)
  const max = Math.max(1, ...depts.map((x) => Math.max(x.headcount, x.futureHeadcount ?? x.headcount)))
  return (
    <div className="flex flex-1 flex-col justify-center bg-[#f3f7fa] p-8 sm:p-14">
      {/* The aggregate IS the headline — no hunting for the total. */}
      <div className="mx-auto mb-10 flex w-full max-w-6xl flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0089a3]">Where you&apos;re headed</p>
          <p className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl font-semibold tabular-nums text-slate-400">{totalNow}</span>
            <span className="text-2xl text-slate-300">→</span>
            <span className="text-7xl font-bold tabular-nums leading-none tracking-tight text-slate-900">{totalFut}</span>
            <span className="text-xl font-medium text-slate-500">people</span>
          </p>
        </div>
        <p className="max-w-xs text-right text-sm leading-relaxed text-slate-500">
          Every number in this program is sized to the <b className="text-slate-900">{totalFut}-person plan</b> —
          not to today. Pale band = today · solid band = the plan.
        </p>
      </div>
      <div className="mx-auto w-full max-w-6xl space-y-4">
        {depts.map((x, i) => {
          const fut = x.futureHeadcount ?? x.headcount
          const delta = fut - x.headcount
          const color = MAP_DEPT_COLORS[i % MAP_DEPT_COLORS.length]
          return (
            <div key={x.id} className="flex items-center gap-4">
              <span className="flex w-40 shrink-0 items-center gap-2 font-semibold text-slate-900">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                {x.name}
              </span>
              <div className="relative h-4 flex-1 rounded-full bg-slate-100">
                <div className="absolute inset-y-0 left-0 rounded-full opacity-30" style={{ width: `${(x.headcount / max) * 100}%`, backgroundColor: color }} />
                <div className="absolute inset-y-1 left-0 rounded-full" style={{ width: `${(fut / max) * 100}%`, backgroundColor: color }} />
              </div>
              <span className="w-28 shrink-0 text-right text-lg tabular-nums">
                <span className="text-slate-400">{x.headcount}</span>
                <span className="mx-1.5 text-slate-300">→</span>
                <b className="text-slate-900">{fut}</b>
              </span>
              <span className={`w-14 shrink-0 text-right text-sm font-bold tabular-nums ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-amber-600" : "text-slate-300"}`}>
                {delta === 0 ? "—" : `${delta > 0 ? "+" : ""}${delta}`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** The engine, made visible — why the policy drives the program. */
function HowWorkSlide({ d, result }: { d: NonNullable<ReturnType<typeof buildDeliverable>>; result: SurveyResult }) {
  const ws = d.lines.find((l) => l.key === "workstations")
  const off = d.lines.find((l) => l.key === "offices")
  const seats = (ws?.proposedCount ?? 0) + (off?.proposedCount ?? 0)
  const people = d.future
  const days = d.daysInOffice
  const sharing = seats < people - result.work.fullyRemote
  return (
    <div className="relative flex flex-1 flex-col justify-center overflow-hidden bg-[#0e1a2e] p-10 text-white sm:p-16">
      <Feather src="/office-3.jpg" />
      <div className="relative z-10 max-w-[58%]">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#00badc]">How you work</p>
      <h2 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight">
        {days >= 5 ? "An office-forward team — and a program that honors it."
          : days >= 4 ? "Four days in — the office is still the center of gravity."
          : "Hybrid by design — and the math follows the policy."}
      </h2>
      <div className="mt-10 grid max-w-3xl gap-6 sm:grid-cols-3">
        <DarkStat value={`${days}`} label="days/week in office" />
        <DarkStat value={`${people}`} label={`people at the planning horizon${result.work.fullyRemote ? ` · ${result.work.fullyRemote} fully remote` : ""}`} />
        <DarkStat value={`${seats}`} label={sharing ? "individual seats — shared by policy" : "individual seats — one per person"} />
      </div>
      <div className="mt-10 max-w-2xl rounded-2xl border border-white/15 bg-white/[0.05] p-6 backdrop-blur-sm">
        <p className="text-sm leading-relaxed text-white/75">
          {sharing ? (
            <>Seat sharing only works when the space gives something back: our planning ratios add{" "}
            <b className="text-white">more focus booths and huddle space</b> as desk sharing rises (1 booth per 10
            workstations at ≤3 days, vs 1 per 15 at five) — the program breathes where the desks tighten.</>
          ) : (
            <>With everyone anchored in the office, the program plans a seat per person and spends its
            flexibility on <b className="text-white">meeting variety</b> — the ratios ease on focus booths
            (1 per {days >= 5 ? 15 : 12} workstations) and invest in conference and collaboration instead.</>
          )}
        </p>
        <p className="mt-3 text-xs text-white/40">The engine behind every number — NELSON planning ratios, tuned by your policy.</p>
      </div>
      </div>
    </div>
  )
}

function DarkStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-6xl font-bold tabular-nums tracking-tight text-white">{value}</p>
      <p className="mt-1.5 text-sm leading-snug text-white/55">{label}</p>
    </div>
  )
}

/** Feathered imagery for dark slides — the right side is never dead space. */
function Feather({ src }: { src: string }) {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 w-[46%]">
      <Image src={src} alt="" fill className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0e1a2e] via-[#0e1a2e]/70 to-[#0e1a2e]/15" />
    </div>
  )
}

function WhoSlide({ d, result }: { d: NonNullable<ReturnType<typeof buildDeliverable>>; result: SurveyResult }) {
  const motivators = result.goals?.motivators ?? []
  return (
    <div className="flex flex-1 items-stretch bg-[#f3f7fa]">
      {/* Left: the statement */}
      <div className="flex w-[44%] flex-col justify-center border-r border-slate-200 p-10 sm:p-14">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0089a3]">Who you are</p>
        <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight">
          The organization we&apos;re designing for
        </h2>
        <p className="mt-4 max-w-md leading-relaxed text-slate-600">
          {result.people.departments.length} teams, one rhythm — everything on the next pages is
          sized to how <b className="text-slate-900">you</b> said you work, not to an industry average.
        </p>
        {motivators.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {motivators.map((m) => (
              <span key={m} className="rounded-full bg-[#00badc]/10 px-3 py-1 text-sm font-medium text-[#0089a3]">
                {m.replace(/^\w/, (c) => c.toUpperCase())}
              </span>
            ))}
          </div>
        )}
      </div>
      {/* Right: the facts, stacked and confident */}
      <div className="flex flex-1 flex-col justify-center gap-8 p-10 sm:p-14">
        <div className="grid grid-cols-3 gap-8">
          <Stat icon={<Users className="h-5 w-5" />} value={`${d.current} → ${d.future}`} label="people today → planning horizon" />
          <Stat icon={<CalendarDays className="h-5 w-5" />} value={`${d.daysInOffice}`} label="days in office / week" />
          <Stat icon={<TrendingUp className="h-5 w-5" />} value={`${result.people.departments.length}`} label="departments" />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-7">
          {result.people.departments.map((dept, i) => (
            <span key={dept.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MAP_DEPT_COLORS[i % MAP_DEPT_COLORS.length] }} />
              {dept.name} · {dept.headcount}{dept.futureHeadcount && dept.futureHeadcount !== dept.headcount ? ` → ${dept.futureHeadcount}` : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function VerdictSlide({ d }: { d: NonNullable<ReturnType<typeof buildDeliverable>> }) {
  const delta = d.totals.grossUsableSF - d.totals.existingSF
  return (
    <div className="relative flex flex-1 flex-col justify-center overflow-hidden bg-[#0e1a2e] p-10 text-white sm:p-16">
      <Feather src="/office-2.jpg" />
      <div className="relative z-10 max-w-[58%]">
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
  const gross = d.totals.grossUsableSF || 1
  return (
    <LightSlide eyebrow="Existing vs proposed" title="Where the space shifts">
      <div className="mx-auto w-full max-w-5xl">
        {/* the whole program in one band, by use type */}
        <div className="flex h-5 gap-[2px] overflow-hidden rounded-full">
          {d.categories.filter((c) => c.proposedTotalSF > 0).map((c) => (
            <span key={c.name} style={{ width: `${(c.proposedTotalSF / gross) * 100}%`, backgroundColor: CATEGORY_COLORS[c.name].accent }} />
          ))}
        </div>
        <div className="mt-8 space-y-5">
          {d.categories.map((c) => {
            const delta = c.proposedTotalSF - c.existingSF
            const cc = CATEGORY_COLORS[c.name]
            return (
              <div key={c.name} className="flex items-center gap-5">
                <span className="flex w-44 shrink-0 items-center gap-2.5 text-lg font-semibold" style={{ color: cc.text }}>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cc.accent }} />
                  {c.name}
                </span>
                <div className="relative h-4 flex-1 rounded-full bg-slate-100">
                  <div className="h-4 rounded-full" style={{ width: `${(c.proposedTotalSF / max) * 100}%`, backgroundColor: cc.accent }} />
                  {c.existingSF > 0 && (
                    <span className="absolute -inset-y-1 w-[3px] rounded-full bg-slate-800" style={{ left: `${Math.min(99.5, (c.existingSF / max) * 100)}%` }} />
                  )}
                </div>
                <span className="w-44 shrink-0 text-right tabular-nums text-slate-500">
                  {c.existingSF.toLocaleString()} → <b className="text-lg text-slate-900">{c.proposedTotalSF.toLocaleString()}</b>
                </span>
                <span className={`w-24 shrink-0 rounded-full px-2.5 py-1 text-center text-sm font-bold tabular-nums ${
                  delta > 0 ? "bg-emerald-50 text-emerald-700" : delta < 0 ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-400"
                }`}>
                  {delta === 0 ? "—" : `${delta > 0 ? "+" : ""}${delta.toLocaleString()}`}
                </span>
              </div>
            )
          })}
        </div>
        <p className="mt-8 flex gap-6 text-sm text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-4 w-[3px] rounded bg-slate-800" /> today</span>
          <span>colored bar = proposed, incl. circulation · SF</span>
        </p>
      </div>
    </LightSlide>
  )
}

/** SF → footprint, deck-side (36 SF reads 6′ × 6′; presets exact, others ≈). */
function feelsLike(sf: number): string | null {
  const preset = [...WORKSTATION_SIZES, ...OFFICE_SIZES].find((o) => o.sf === sf)
  if (preset) return preset.label
  if (sf < 16) return null
  const w = Math.ceil(Math.sqrt(sf))
  return `≈ ${w}′ × ${Math.round(sf / w)}′`
}

function ProgramSlide({
  d, nelson, keyed, overrides, onOverride, targetSF,
}: {
  d: NonNullable<ReturnType<typeof buildDeliverable>>
  nelson: boolean
  keyed: Set<string>
  overrides: DeliverableOverrides
  onOverride: (key: string, sf: number | null) => void
  targetSF?: number
}) {
  const line = (key: string) => d.lines.find((l) => l.key === key)
  const [detail, setDetail] = useState<CatalogSpace | null>(null)
  const infoFor = (l: ComparisonLine) => {
    const id = l.key.replace(/^studio:/, "").replace(/^(collab|support):/, "").replace(/:[a-z0-9]+$/, "")
    const hit = [...COLLAB_CATALOG, ...SUPPORT_CATALOG].find((c) => c.id === id || c.label === l.label.replace(/ \(B\)$/, ""))
    if (hit) { setDetail(hit); return }
    const ws = l.category === "Workstations"
    setDetail({
      id: l.key, label: l.label, icon: ws ? "users" : "building", sfEach: l.unitSF, ratio: l.ratio ?? "per program",
      photo: ws ? "/office-2.jpg" : "/office-1.jpg",
      description: ws
        ? "Open-plan assigned workstations — the desk footprint that anchors the individual-space program."
        : "Enclosed, assigned private offices — typically leadership and roles that need a door.",
      uses: ws
        ? ["Daily individual work for assigned-seat staff", "The unit that sets open-plan density"]
        : ["Leadership and door-required roles", "Doubles as a 2–3 person meeting point"],
    })
  }
  return (
    <div className="flex-1 bg-[#f3f7fa] p-8 sm:p-12">
      {detail && <SpaceDetailModal space={detail} onClose={() => setDetail(null)} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0089a3]">The program</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Every space, sized — the full readout</h2>
        </div>
        {/* The KPI never hides at the bottom of a table again */}
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0089a3]">Gross usable</p>
          <p className="text-4xl font-bold tabular-nums leading-none tracking-tight">
            {d.totals.grossUsableSF.toLocaleString()}<span className="ml-1 text-base font-medium text-slate-400">SF</span>
          </p>
          {targetSF ? (
            <p className={`mt-1 text-xs font-semibold tabular-nums ${targetSF - d.totals.grossUsableSF >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
              your number {targetSF.toLocaleString()} · {targetSF - d.totals.grossUsableSF >= 0 ? "+" : ""}{(targetSF - d.totals.grossUsableSF).toLocaleString()} SF
            </p>
          ) : null}
        </div>
      </div>

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
              <th className="px-3 py-2.5 font-semibold">Feels like</th>
              <th className="px-3 py-2.5 text-right font-semibold">Unit SF</th>
              <th className="px-4 py-2.5 text-right font-semibold">Total SF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {d.categories.map((c) => (
              <CategoryRows key={c.name} cat={c} nelson={nelson} keyed={keyed} onOverride={onOverride} onInfo={infoFor} />
            ))}
            <tr className="bg-slate-50 font-semibold">
              <td className="px-4 py-2.5" colSpan={5}>Gross usable (net + circulation)</td>
              <td className="px-4 py-2.5 text-right">{d.totals.grossUsableSF.toLocaleString()}</td>
            </tr>
            <tr className="text-slate-500">
              <td className="px-4 py-2" colSpan={5}>Rentable add-on (load factor ×{(1 + d.totals.rentableFactor).toFixed(2)})</td>
              <td className="px-4 py-2 text-right">{d.totals.rentableAddOnSF.toLocaleString()}</td>
            </tr>
            <tr className="bg-[#0e1a2e] font-bold text-white">
              <td className="rounded-bl-2xl px-4 py-3" colSpan={5}>Estimated rentable SF</td>
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
  cat, nelson, keyed, onOverride, onInfo,
}: {
  cat: NonNullable<ReturnType<typeof buildDeliverable>>["categories"][number]
  nelson: boolean
  keyed: Set<string>
  onOverride: (key: string, sf: number | null) => void
  onInfo: (l: ComparisonLine) => void
}) {
  const visible = cat.lines.filter((l) => l.proposedCount > 0 || l.existingCount > 0)
  if (visible.length === 0) return null
  return (
    <>
      <tr style={{ backgroundColor: CATEGORY_COLORS[cat.name].tint }}>
        <td className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: CATEGORY_COLORS[cat.name].text }} colSpan={6}>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: CATEGORY_COLORS[cat.name].accent }} />
          {cat.name}
        </td>
      </tr>
      {visible.map((l) => (
        <tr key={l.key}>
          <td className="px-4 py-2 font-medium text-slate-900">
            <button
              type="button"
              onClick={() => onInfo(l)}
              title="What this space is, and how it's used"
              className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 align-middle text-[9px] font-bold text-slate-500 hover:bg-[#00badc]/15 hover:text-[#0089a3] print:hidden"
            >
              i
            </button>
            {l.label}
            {keyed.has(l.key) && <span className="ml-2 rounded-full bg-[#00badc]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#0089a3]">key</span>}
          </td>
          <td className="px-3 py-2 text-slate-500">{l.ratio ?? "—"}</td>
          <td className="px-3 py-2 text-right text-slate-700">{l.proposedCount}</td>
          <td className="px-3 py-2 text-xs text-[#0089a3]">{feelsLike(l.unitSF) ?? ""}</td>
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
        <td className="px-4 py-1.5 text-xs" colSpan={5}>{cat.name} circulation</td>
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

function NextSlide({ d, result, clientName }: { d: NonNullable<ReturnType<typeof buildDeliverable>>; result: SurveyResult; clientName: string }) {
  const completed = [
    { q: "How much space do we need?", a: `${d.totals.grossUsableSF.toLocaleString()} SF usable — every line of it argued from how you actually work.` },
    { q: "How will our business look and feel?", a: "Your teams as neighborhoods, your rhythm in the ratios — the program map is your business, drawn." },
    { q: "What will we experience differently?", a: "More of what you asked for, by name — it's all in the program, sized and counted." },
  ]
  const upNext = [
    { title: "We test-fit your program", desc: "Concepts on your actual floor plate — the first time the numbers become a place." },
    { title: "We detail every space", desc: "Materials, finishes, the technical set — the program holds; the craft gets added." },
    { title: "You move in", desc: "Day one, ready for you — the whole reason we started.", celebrate: true },
  ]
  return (
    <div className="relative flex flex-1 flex-col justify-center overflow-hidden bg-[#0e1a2e] p-10 text-white sm:p-16">
      <Feather src="/office-1.jpg" />
      <div className="relative z-10 max-w-[64%]">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#00badc]">Get ready for design</p>
      <h2 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight">
        The hard work is done. Now comes the fun part.
      </h2>

      {/* What's done, greyed to recede; what's next, lit up to foreshadow. */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">What you&apos;ve completed</p>
          <div className="mt-3 space-y-2.5">
            {completed.map((c, i) => (
              <div key={c.q} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <span className="text-3xl font-black leading-none tabular-nums text-white/15">{i + 1}</span>
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/50">✓</span>
                    {c.q}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/60">{c.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00badc]">What&apos;s next</p>
          <div className="mt-3 space-y-2.5">
            {upNext.map((n, i) => (
              <div
                key={n.title}
                className={`flex gap-3 rounded-2xl border p-4 ${
                  n.celebrate ? "border-amber-300/40 bg-gradient-to-br from-amber-400/10 to-[#00badc]/10" : "border-[#00badc]/25 bg-[#00badc]/[0.07]"
                }`}
              >
                <span className={`text-3xl font-black leading-none tabular-nums ${n.celebrate ? "text-amber-300" : "text-[#00badc]"}`}>
                  {completed.length + i + 1}
                </span>
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-white">
                    {n.title}
                    {n.celebrate && <PartyPopper className="h-4 w-4 shrink-0 text-amber-300" />}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/70">{n.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The whole journey, drawn — you are HERE, and the fun part is next. */}
      <div className="mt-8">
        <JourneyTimeline />
        <p className="mt-3 text-xs text-white/40">
          The curve is your involvement — highest right now and through design, tapering as construction
          takes over. You&apos;ve just finished the part everything else is built on.
          {result.deferred.length > 0 && (
            <span className="ml-2 text-amber-300/90">{result.deferred.length} deferred item{result.deferred.length === 1 ? "" : "s"} on the session agenda.</span>
          )}
        </p>
      </div>
      <p className="mt-8 text-xs uppercase tracking-[0.14em] text-white/30">
        {clientName} · Workplace Program · NELSON Worldwide
      </p>
      </div>
    </div>
  )
}

/** Pre-design → move-in, with the client-effort curve as foreshadowing. */
function JourneyTimeline() {
  const phases = [
    { name: "Pre-design", note: "intake → your program", w: 20, here: true },
    { name: "Schematic design", note: "concepts · test fits — the fun part", w: 20 },
    { name: "Design development", note: "materials · details", w: 14 },
    { name: "Construction docs", note: "the technical set", w: 14 },
    { name: "Construction", note: "build-out", w: 22 },
    { name: "Move-in", note: "day one — welcome home", w: 10, celebrate: true },
  ]
  // The involvement curve: high through pre-design/SD, tapering, a lift at move-in.
  const curve = "M0,34 C80,6 160,4 240,14 C320,24 380,34 470,40 C560,46 620,47 700,47 C760,47 790,40 800,34"
  return (
    <div>
      <svg viewBox="0 0 800 52" className="h-12 w-full" preserveAspectRatio="none" aria-hidden>
        <path d={`${curve} L800,52 L0,52 Z`} fill="rgba(0,186,220,0.10)" />
        <path d={curve} fill="none" stroke="#00badc" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      </svg>
      <div className="mt-1 flex gap-1">
        {phases.map((p) => (
          <div
            key={p.name}
            style={{ width: `${p.w}%` }}
            className={`rounded-lg border px-3 py-2.5 ${
              p.here
                ? "border-[#00badc] bg-[#00badc]/15"
                : p.celebrate
                  ? "border-amber-300/50 bg-gradient-to-br from-amber-400/15 to-[#00badc]/10"
                  : "border-white/12 bg-white/[0.04]"
            }`}
          >
            <p className="flex items-center gap-1.5 text-[11px] font-bold leading-tight text-white sm:text-xs">
              {p.here && <span className="relative flex h-2 w-2 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00badc] opacity-75 motion-reduce:hidden" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#00badc]" /></span>}
              {p.name}
              {p.celebrate && <PartyPopper className="h-3 w-3 shrink-0 text-amber-300" />}
            </p>
            <p className="mt-0.5 hidden text-[10px] leading-tight text-white/45 lg:block">{p.note}</p>
            {p.here && <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00badc]">you are here</p>}
          </div>
        ))}
      </div>
    </div>
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
