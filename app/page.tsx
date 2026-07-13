"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import {
  KeyRound, Sparkles, ArrowRight, RefreshCw, Rocket, Home, ClipboardCheck, FileText, Presentation,
  MonitorPlay, LayoutGrid, FileSpreadsheet, GitCompareArrows, FlaskConical, Map as MapIcon, Users,
  BookOpen, Layers, CheckCircle2,
} from "lucide-react"
import { isNelsonMode, unlockNelsonMode, nelsonCode } from "@/lib/nelsonMode"
import { demoResult } from "@/lib/survey/demo-scenarios"

/**
 * Mission Control — the internal front door. NELSON-gated: the screen the
 * founder demos from, reviews from, and gets feedback on. One click spins a
 * fully-loaded demo engagement; every surface in the product is one hop away,
 * organized as the two journeys the product actually is: the client's and
 * the designer's. Clients never land here — their world starts at /s/<token>.
 */

const MILESTONE = "Milestone · Command Center Demo · July 2026"

export default function MissionControl() {
  const [nelson, setNelson] = useState<boolean | null>(null)
  const [code, setCode] = useState("")
  const [codeError, setCodeError] = useState(false)
  const [demoToken, setDemoToken] = useState<string | null>(null)
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    setNelson(isNelsonMode())
    try { setDemoToken(localStorage.getItem("nelson:demoToken")) } catch { /* fine */ }
  }, [])

  /** One click → a returned engagement with a target, ready to demo end-to-end. */
  const spinUpDemo = async () => {
    setSpinning(true)
    try {
      const res = await fetch("/api/engagements", {
        method: "POST",
        headers: { "x-nelson-code": nelsonCode() ?? "", "content-type": "application/json" },
        body: JSON.stringify({ clientName: "Hartwell & Cross LLP (demo)" }),
      })
      if (!res.ok) throw new Error()
      const { token } = await res.json()
      const result = demoResult("law")!
      result.goals = { ...(result.goals ?? { motivators: [] }), targetSF: 12000, targetSource: "lease" }
      await fetch(`/api/engagements/${token}?source=survey`, { method: "POST", body: JSON.stringify(result) })
      localStorage.setItem("nelson:demoToken", token)
      setDemoToken(token)
    } catch { /* surfaces stay generic */ }
    setSpinning(false)
  }

  if (nelson === null) {
    return <Centered><p className="text-white/40"><RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />Loading…</p></Centered>
  }

  if (!nelson) {
    return (
      <Centered>
        <Image src="/NELSON_whiteBlueFin.png" alt="NELSON" width={190} height={45} className="h-9 w-auto" />
        <span className="mt-8 flex h-12 w-12 items-center justify-center rounded-full bg-[#00badc]/15 text-[#00badc]"><KeyRound className="h-5 w-5" /></span>
        <h1 className="mt-4 text-2xl font-bold text-white">Mission Control is NELSON-only.</h1>
        <p className="mt-2 max-w-md text-white/55">
          Clients start from their own engagement link. If you&apos;re NELSON, unlock this device:
        </p>
        <form
          className="mt-5 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault()
            const ok = await unlockNelsonMode(code)
            setCodeError(!ok)
            setNelson(ok)
          }}
        >
          <input
            type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Team passcode"
            className="w-56 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#00badc] focus:outline-none"
          />
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-[#00badc] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#2fd0ee]">
            Unlock
          </button>
        </form>
        {codeError && <p className="mt-2 text-xs text-amber-400">That passcode didn&apos;t verify.</p>}
      </Centered>
    )
  }

  const t = demoToken

  return (
    <div className="min-h-screen bg-[#0e1a2e] text-white">
      <div
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{ background: "radial-gradient(900px 500px at 80% -10%, rgba(0,186,220,0.14), transparent), radial-gradient(700px 400px at 0% 110%, rgba(37,99,235,0.10), transparent)" }}
      />
      <div className="relative mx-auto max-w-6xl px-6 py-14">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Image src="/NELSON_whiteBlueFin.png" alt="NELSON" width={170} height={40} className="h-8 w-auto" priority />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00badc]/40 bg-[#00badc]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#00badc]">
            <Sparkles className="h-3.5 w-3.5" /> {MILESTONE}
          </span>
        </div>

        <h1 className="mt-10 max-w-3xl text-5xl font-bold leading-[1.08] tracking-tight">
          A workplace-programming engagement <span className="text-[#00badc]">in a link.</span>
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/60">
          The client gets one URL and three easy doors to tell us how they work. Every answer feeds the
          engine — seat-sharing math, policy-tuned ratios — and lands in one record. NELSON gets a command
          center, a live-session studio, and a deliverable that is <i className="text-white/80">revealed, not dumped</i>.
          All of it converging on one number: the square footage that fits who they actually are.
        </p>

        {/* ── The demo engagement — one click, fully loaded ────────────────── */}
        <div className="mt-10 rounded-2xl border border-white/12 bg-white/[0.05] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold"><Rocket className="h-5 w-5 text-[#00badc]" /> The demo engagement</h2>
              <p className="mt-1 text-sm text-white/55">
                {t
                  ? <>Loaded and ready — a returned law-firm intake with a 12,000 SF lease target. Every card below is wired to it.</>
                  : <>One click creates a returned engagement (law firm, 60 → 67 people, 12,000 SF lease target) and wires every card below to it.</>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {t && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> /{t}
                </span>
              )}
              <button
                onClick={spinUpDemo}
                disabled={spinning}
                className="inline-flex items-center gap-2 rounded-xl bg-[#00badc] px-5 py-2.5 text-sm font-bold text-slate-900 transition-colors hover:bg-[#2fd0ee] disabled:opacity-50"
              >
                {spinning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                {t ? "Spin up a fresh one" : "Spin up the demo"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Journey 1: the client experience ─────────────────────────────── */}
        <JourneyTitle n={1} title="The client experience" note="what they see — friction engineered out, judgment kept in" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Card icon={Home} title="Their home page" note="the cinematic landing — three doors in" href={t ? `/s/${t}` : "/engagements"} step="1" />
          <Card icon={ClipboardCheck} title="The survey" note="never blocked · target question · autosaves across devices" href={t ? `/survey?e=${t}` : "/survey"} step="2" />
          <Card icon={FileText} title="The prep sheet" note="gaps as the agenda, printable" href={t ? `/prep/${t}` : "/engagements"} step="3" />
          <Card icon={Presentation} title="The deliverable" note="8–12 beats, gated until pushed" href={t ? `/d/${t}` : "/engagements"} step="4" />
          <Card icon={BookOpen} title="Workbook guide" note="the offline door's send-along" href="/workbook-guide" step="alt" />
        </div>

        {/* ── Journey 2: the designer cockpit ─────────────────────────────── */}
        <JourneyTitle n={2} title="The designer cockpit" note="the human in the loop — everything the survey asks, somewhere downstream" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Card icon={Users} title="Console" note="every engagement, live status" href="/engagements" step="1" />
          <Card icon={MonitorPlay} title="Command Center" note="one engagement, fetched — journey, program, prep, push" href={t ? `/command/${t}` : "/engagements"} step="2" featured />
          <Card icon={LayoutGrid} title="The Studio" note="the live-session cockpit — gaps, dials, decisions, map" href="/studio" step="3" featured />
          <Card icon={FileText} title="Designer brief" note="printable prep — armed, internal" href={t ? `/brief/${t}` : "/engagements"} step="4" />
          <Card icon={FileSpreadsheet} title="Program review" note="validation dashboard + program map" href="/review" step="5" />
        </div>

        {/* ── The engine room ──────────────────────────────────────────────── */}
        <JourneyTitle n={3} title="The engine room" note="where the math lives, and where new ideas audition" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card icon={GitCompareArrows} title="Target conversation" note="the delta map + compromise levers, live engine math" href="/lab/target" />
          <Card icon={FlaskConical} title="The Lab" note="Phase-0 explorations — comps and prototypes" href="/lab" />
          <Card icon={MapIcon} title="Legacy canvas" note="frozen — the original Advanced Canvas + Fast Track" href="/canvas" />
          <Card icon={Layers} title="Fit-planning package" note="7-sheet Excel handoff — export from the Studio" href="/studio" />
        </div>

        {/* ── Why it works ─────────────────────────────────────────────────── */}
        <div className="mt-14 grid gap-4 rounded-2xl border border-white/12 bg-white/[0.04] p-7 lg:grid-cols-3">
          {[
            ["One contract, many doors", "Survey, workbook, or live session — every door feeds the same record, and every screen downstream reads from it. No question is asked that doesn't appear somewhere a designer can use it."],
            ["The engine is the mastermind", "Seat-sharing formulas, attendance peaks, policy-tuned ratios — born in Fast Track, fed real evidence by the survey, steered by designer judgment in the Studio."],
            ["Human-in-the-loop, always", "The program is revealed in the working session and pushed when a designer says so. The deliverable carries the session's decisions — the client's fingerprints on the program."],
          ].map(([h, b]) => (
            <div key={h}>
              <h3 className="font-bold text-[#00badc]">{h}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">{b}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-white/30">
          NELSON Workplace Programming · internal demo environment · concept, roadmap & scorecard live in the repo
        </p>
      </div>
    </div>
  )
}

/* ── pieces ─────────────────────────────────────────────────────────────── */

function JourneyTitle({ n, title, note }: { n: number; title: string; note: string }) {
  return (
    <div className="mb-4 mt-12 flex flex-wrap items-baseline gap-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00badc] text-xs font-bold text-slate-900">{n}</span>
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <span className="text-sm text-white/40">{note}</span>
    </div>
  )
}

function Card({
  icon: Icon, title, note, href, step, featured,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  note: string
  href: string
  step?: string
  featured?: boolean
}) {
  return (
    <a
      href={href}
      className={`group rounded-2xl border p-4 transition-colors ${
        featured ? "border-[#00badc]/50 bg-[#00badc]/[0.08] hover:bg-[#00badc]/[0.14]" : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]"
      }`}
    >
      <div className="flex items-center justify-between">
        <Icon className={`h-5 w-5 ${featured ? "text-[#00badc]" : "text-white/60"}`} />
        {step && <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-bold text-white/40">{step}</span>}
      </div>
      <h3 className="mt-3 font-bold leading-snug">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-white/50">{note}</p>
      <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[#00badc] opacity-0 transition-opacity group-hover:opacity-100">
        open <ArrowRight className="h-3 w-3" />
      </span>
    </a>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center bg-[#0e1a2e] px-6 text-center">{children}</div>
}
