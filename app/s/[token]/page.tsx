"use client"

import { use, useEffect, useState } from "react"
import Image from "next/image"
import { ArrowDown, ArrowRight, FileDown, FileSpreadsheet, Upload, CheckCircle2, Sparkles, MousePointerClick, MessagesSquare } from "lucide-react"
import { WorkplaceProfile } from "@/components/survey/workplace-profile"
import { HeroCarousel } from "@/components/landing/hero-carousel"
import { Reveal, CountUp, Highlight } from "@/components/landing/motion"
import { AggregationScene, RadarTeaser, MapTeaser, WorkbookVignette, ProgramVignette, SessionVignette } from "@/components/landing/scenes"
import { importIntakeWorkbook } from "@/lib/survey/workbookImport"
import { exportIntakeWorkbook } from "@/lib/survey/excelExport"
import type { SurveyResult } from "@/lib/survey/types"
import type { ProfileScores } from "@/lib/survey/sections"

/**
 * The client landing — the ONLY link a client receives. A cinematic scroll
 * story (rotating imagery → why this matters → what they'll see → how it
 * works) ending at their kit: the intake workbook + guide to fill, circulate,
 * and return. Returning the workbook here submits it to NELSON and pays off
 * with their Workplace Profile — enough to whet the appetite, never enough to
 * skip the session.
 *
 * TODO(imagery): swap office-1/2/3.jpg for the NELSON-provided photography and
 * update INDUSTRY_STATS with the firm's preferred stats when supplied.
 */
export default function ClientLanding({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [meta, setMeta] = useState<{ clientName: string; status: string; profile?: ProfileScores } | null>(null)
  const [missing, setMissing] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<ProfileScores | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    fetch(`/api/engagements/${token}`)
      .then(async (r) => {
        if (!r.ok) { setMissing((await r.json()).error ?? "Unknown link"); return }
        const m = await r.json()
        setMeta(m)
        // Console pulse: the client opened their link. Never overwrite a
        // deeper stage (survey/workbook) or a submitted engagement.
        if (m.status !== "submitted" && !m.profile) {
          fetch(`/api/engagements/${token}`, { method: "PATCH", body: JSON.stringify({ stage: "landing" }) }).catch(() => {})
        }
      })
      .catch(() => setMissing("We couldn't reach the server — try again shortly."))
  }, [token])

  const uploadWorkbook = async (file: File) => {
    setImportError(null)
    setSubmitting(true)
    try {
      const result: SurveyResult = importIntakeWorkbook(await file.arrayBuffer())
      if (meta?.clientName && !result.meta.clientName) result.meta.clientName = meta.clientName
      const res = await fetch(`/api/engagements/${token}`, { method: "POST", body: JSON.stringify(result) })
      if (!res.ok) throw new Error()
      const { profile } = await res.json()
      setSubmitted(profile)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch {
      setImportError("That file didn't read as your intake workbook — download a fresh copy below, or email it to your NELSON contact instead.")
    } finally {
      setSubmitting(false)
    }
  }

  if (missing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f7fa] px-6 text-center">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900">NELSON</div>
          <p className="mt-4 max-w-md text-slate-600">{missing}</p>
          <p className="mt-2 text-sm text-slate-400">Check the link with your NELSON contact.</p>
        </div>
      </div>
    )
  }

  // ── Thank-you + radar: the minimum effective dose ─────────────────────────
  const profile = submitted ?? (meta?.status === "submitted" ? meta.profile : undefined)
  if (profile) {
    return (
      <div className="min-h-screen bg-[#f3f7fa] bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(0,186,220,0.10),transparent)] text-slate-900">
        <header className="px-8 py-6"><Logo /></header>
        <main className="mx-auto grid max-w-5xl gap-10 px-6 py-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 px-3.5 py-1.5 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> We got it{meta?.clientName ? `, ${meta.clientName}` : ""}.
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight">
              Thank you — we&apos;ll take it from here.
            </h1>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-slate-600">
              Your answers are already becoming a workplace program. Here&apos;s what happens next:
            </p>
            <ol className="mt-6 space-y-4">
              <NextStep n={1} title="We build your starting program">
                Every space type, sized against how your teams actually work.
              </NextStep>
              <NextStep n={2} title="We walk it together">
                A working session — your teams on the whiteboard, the trade-offs live, every open
                question resolved in the room.
              </NextStep>
              <NextStep n={3} title="You leave with the plan">
                A program document your whole organization can react to.
              </NextStep>
            </ol>
            <p className="mt-6 text-sm text-slate-500">
              Your NELSON contact will reach out to schedule the session.
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Bookmark this page — it stays your home for the whole process, and we&apos;ll point you
              back here whenever there&apos;s something new to see.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <WorkplaceProfile scores={profile} />
            <p className="mt-3 text-center text-xs text-slate-400">
              A first read of your workplace&apos;s character — we&apos;ll unpack it together.
            </p>
          </Reveal>
        </main>
      </div>
    )
  }

  // ── The scroll story ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f3f7fa] text-slate-900">
      {/* 1 · Hero — rotating imagery, minimal words */}
      <HeroCarousel images={["/office-1.jpg", "/office-2.jpg", "/office-3.jpg"]}>
        <header className="relative z-10 px-8 py-6"><Logo light /></header>
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center text-white">
          {meta?.clientName && (
            <span className="mb-6 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              Prepared for {meta.clientName}
            </span>
          )}
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
            Your workplace has a<br /><span className="text-[#00badc]">next chapter</span>.
          </h1>
          <a
            href="#stage"
            className="group mt-12 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold backdrop-blur-sm transition-all hover:border-white/60 hover:bg-white/20"
          >
            See how it works
            <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
          </a>
        </div>
      </HeroCarousel>

      {/* 2 · Setting the stage */}
      <section
        id="stage"
        className="relative overflow-hidden bg-[radial-gradient(900px_460px_at_50%_-10%,rgba(0,186,220,0.14),transparent),radial-gradient(700px_420px_at_92%_110%,rgba(0,186,220,0.10),transparent)] px-6 py-24 sm:py-32"
      >
        {/* Oversized fin watermark */}
        <svg viewBox="0 0 20 20" aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 opacity-[0.07]">
          <path d="M 0 0 L 20 0 L 0 20 Z" fill="#00badc" />
        </svg>
        <div className="relative mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="flex items-center justify-center gap-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#0089a3]">
              <span className="h-px w-10 bg-[#00badc]/50" />
              A guided discovery, prepared for you
              <span className="h-px w-10 bg-[#00badc]/50" />
            </p>
            <h2 className="mt-6 text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl">
              You&apos;re about to see your organization{" "}
              <Highlight>the way workplace designers do</Highlight>.
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-slate-600">
              NELSON turns how your teams actually work into a space program you can see, question,
              and believe in — before a single wall moves. No forms into the void: every answer you
              give becomes something you&apos;ll recognize on screen.
            </p>
          </Reveal>
          <Reveal delay={280}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-sm font-medium text-slate-700 sm:gap-3">
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">The workbook</span>
              <ArrowRight className="h-4 w-4 text-[#0089a3]" />
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">Your program, drawn</span>
              <ArrowRight className="h-4 w-4 text-[#0089a3]" />
              <span className="rounded-full border border-[#00badc]/40 bg-[#e9f7fb] px-4 py-2 text-[#0089a3] shadow-sm">One working session</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3 · Stats — the world changed; the numbers say so */}
      <section className="bg-[#0e1a2e] py-16 text-white sm:py-20">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#00badc]">
            The workplace has changed
          </p>
        </Reveal>
        <div className="mx-auto mt-12 grid max-w-none gap-10 px-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-16">
          {INDUSTRY_STATS.map((s, i) => (
            <Reveal key={s.caption} delay={i * 110} className="text-center">
              <div className="text-6xl font-bold tracking-tight text-white">
                <CountUp value={s.value} decimals={s.decimals} prefix={s.prefix} suffix={s.suffix} />
              </div>
              <div className="mx-auto mt-3 h-0.5 w-10 rounded-full bg-[#00badc]" />
              <p className="mx-auto mt-3 max-w-[26ch] text-sm leading-relaxed text-white/60">{s.caption}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 4 · The aggregation — what's actually happening here */}
      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0089a3]">How it comes together</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Every voice, one picture.</h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Your workbook circulates — each department leader answers for their own team, someone
              wrangles it home — and every response streams into a single living program. Nobody
              has to know everything; together, you already do.
            </p>
          </Reveal>
          <Reveal delay={150} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <AggregationScene />
          </Reveal>
        </div>
      </section>

      {/* 5 · What you'll see on the other side */}
      <section className="border-y border-slate-200 bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0089a3]">The reveal</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">What you&apos;ll see on the other side</h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Your answers come back as pictures your whole organization can point at.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <TeaserCard title="Your Workplace Profile" caption="Six axes of how your organization wants to work — drawn from your own answers." delay={0}>
              <RadarTeaser />
            </TeaserCard>
            <TeaserCard title="Your Program Map" caption="Teams as neighborhoods on a designer's whiteboard — sized, named, and pulled together by who needs whom." delay={140}>
              <MapTeaser />
            </TeaserCard>
          </div>
        </div>
      </section>

      {/* 6 · Three steps, shown not told */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Three steps to a program you can stand behind</h2>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <StepCard step="01" title="Tell us how you work" delay={0} vignette={<WorkbookVignette />}>
              The workbook below captures your teams, growth, and the spaces that matter — on your
              own time, split across department leaders if that&apos;s easier. Most finish in 30–45 minutes.
            </StepCard>
            <StepCard step="02" title="We turn it into a program" delay={140} vignette={<ProgramVignette />}>
              Planning ratios meet your reality: every space type counted and sized, your existing
              footprint compared side-by-side with what your future actually needs.
            </StepCard>
            <StepCard step="03" title="We validate it together" delay={280} vignette={<SessionVignette />}>
              A live working session — your teams mapped on a whiteboard, trade-offs moving in real
              time, every open question decided in the room. You leave with the plan.
            </StepCard>
          </div>
        </div>
      </section>

      {/* 7 · Choose your path — three doors, one program */}
      <section id="start" className="border-t border-slate-200 bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#00badc]/30 bg-[#00badc]/10 px-3.5 py-1.5 text-sm font-medium text-[#0089a3]">
              <Sparkles className="h-4 w-4" /> Get started
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              How would you like to begin{meta?.clientName ? `, ${meta.clientName}` : ""}?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Three ways in — all of them land at the same working session. The more you bring
              upfront, the faster we get to validating; how engaged you want to be is up to you.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <PathCard
              delay={0}
              featured
              icon={<MousePointerClick className="h-5 w-5" />}
              title="Take the survey"
              blurb="Interactive and quick — about 5 minutes. Your answers flow straight to your NELSON team the moment you finish."
            >
              <a
                href={`/survey?e=${token}`}
                className="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00badc] px-6 py-3.5 text-base font-semibold text-slate-900 shadow-lg shadow-[#00badc]/25 transition-all hover:-translate-y-0.5 hover:bg-[#2fd0ee] hover:shadow-xl hover:shadow-[#00badc]/30 active:translate-y-0"
              >
                Start the survey <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </PathCard>

            <PathCard
              delay={130}
              icon={<FileSpreadsheet className="h-5 w-5" />}
              title="Fill the workbook"
              blurb="Download the Excel, split it across department leaders, wrangle the answers on your own time — then return it below."
            >
              <div className="mt-5 grid gap-2">
                <button
                  onClick={() => {
                    exportIntakeWorkbook(emptyResultFor(meta?.clientName ?? ""))
                    fetch(`/api/engagements/${token}`, { method: "PATCH", body: JSON.stringify({ stage: "workbook" }) }).catch(() => {})
                  }}
                  className="group flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-700 hover:shadow-md active:translate-y-0"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Download the workbook
                </button>
                <a
                  href={`/workbook-guide${meta?.clientName ? `?client=${encodeURIComponent(meta.clientName)}` : ""}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:text-slate-900 hover:shadow-md active:translate-y-0"
                >
                  <FileDown className="h-4 w-4" /> Read the guide
                </a>
              </div>
            </PathCard>

            <PathCard
              delay={260}
              icon={<MessagesSquare className="h-5 w-5" />}
              title="Do it live with us"
              blurb="No homework required. Bring what you know and we'll capture everything together, live in your working session."
            >
              <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Nothing to click — your NELSON contact will schedule the session.
              </p>
            </PathCard>
          </div>

          {/* The return slot — also a drop target */}
          <Reveal delay={220}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragging(false)
                const f = e.dataTransfer.files?.[0]
                if (f) uploadWorkbook(f)
              }}
              className={`mt-10 rounded-2xl border-2 border-dashed px-6 py-8 transition-all ${
                dragging ? "scale-[1.01] border-[#00badc] bg-[#e9f7fb]" : "border-slate-300 bg-slate-50"
              }`}
            >
              <Upload className={`mx-auto h-6 w-6 transition-colors ${dragging ? "text-[#0089a3]" : "text-slate-400"}`} />
              <p className="mt-2 font-semibold text-slate-800">Finished the workbook? Return it here.</p>
              <p className="mt-1 text-sm text-slate-500">
                Drop the completed workbook anywhere in this box — it flows straight into your program.
              </p>
              <label className={`mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-700 hover:shadow-md ${submitting ? "pointer-events-none opacity-60" : ""}`}>
                <input
                  type="file" accept=".xlsx" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadWorkbook(f); e.target.value = "" }}
                />
                {submitting ? "Reading your workbook…" : "Upload completed workbook"}
                {!submitting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
              </label>
              {importError && (
                <p className="mx-auto mt-3 max-w-md rounded-lg border border-amber-400/60 bg-amber-50 px-3 py-2 text-xs text-amber-700">{importError}</p>
              )}
            </div>
          </Reveal>

          <p className="mt-8 text-xs text-slate-400">
            Questions while you fill it in? Email your NELSON contact — or note them in the
            workbook&apos;s “In your words” tab and we&apos;ll cover them together.
          </p>
        </div>
      </section>

      <footer className="bg-[#0e1a2e] px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <Logo light />
            <p className="text-sm text-white/60">
              Workplace Strategy <span className="text-[#00badc]">·</span> Discovery
            </p>
          </div>
          <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center">
            <p>© {new Date().getFullYear()} NELSON Worldwide. All rights reserved.</p>
            <p>
              {meta?.clientName ? <>Prepared exclusively for <span className="text-white/70">{meta.clientName}</span> · </> : null}
              Questions? Your NELSON contact is one email away.
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        .ticker-track { animation: ticker 36s linear infinite; }
      `}</style>
    </div>
  )
}

/* TODO(founder): replace with NELSON's preferred stats when provided. */
const INDUSTRY_STATS = [
  { value: 40, decimals: 0, prefix: "~", suffix: "%", caption: "of assigned desks sit unused on a typical day in hybrid workplaces" },
  { value: 3.1, decimals: 1, prefix: "", suffix: "", caption: "average in-office days per week — planning for peaks, not averages, wastes floors" },
  { value: 1.5, decimals: 1, prefix: "", suffix: "×", caption: "more collaborative space in high-performing workplaces than five years ago" },
  { value: 20, decimals: 0, prefix: "", suffix: "%", caption: "average footprint reduction when a program is rightsized to real usage" },
]

function emptyResultFor(clientName: string): import("@/lib/survey/types").SurveyResult {
  return {
    meta: { clientName, completedBy: "", completedAt: new Date().toISOString() },
    people: { departments: [], totalHeadcount: 0 },
    work: { daysInOffice: 3, fullyRemote: 0 },
    spaces: { privateOfficesByDept: {}, collaboration: [], support: [] },
    qualitative: {}, special: {}, existing: {}, deferred: [],
  }
}

/** Official NELSON marks: white+fin on dark surfaces, color on light. */
function Logo({ light }: { light?: boolean }) {
  return (
    <Image
      src={light ? "/NELSON_whiteBlueFin.png" : "/NELSON_color.png"}
      alt="NELSON" width={170} height={40} className="h-8 w-auto" priority
    />
  )
}

function NextStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{n}</span>
      <span>
        <span className="block font-semibold text-slate-900">{title}</span>
        <span className="text-sm text-slate-600">{children}</span>
      </span>
    </li>
  )
}

/** One of the three engagement doors — featured gets the cyan halo. */
function PathCard({ icon, title, blurb, featured, delay, children }: {
  icon: React.ReactNode; title: string; blurb: string; featured?: boolean; delay: number; children: React.ReactNode
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className={`flex h-full flex-col rounded-3xl border p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        featured
          ? "border-[#00badc]/50 bg-[#e9f7fb]/60 shadow-lg shadow-[#00badc]/10 hover:shadow-[#00badc]/20"
          : "border-slate-200 bg-white shadow-sm hover:shadow-slate-200/60"
      }`}>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          featured ? "bg-[#00badc] text-slate-900" : "bg-[#00badc]/12 text-[#0089a3]"
        }`}>
          {icon}
        </span>
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-600">{blurb}</p>
        {children}
      </div>
    </Reveal>
  )
}

function TeaserCard({ title, caption, delay, children }: { title: string; caption: string; delay: number; children: React.ReactNode }) {
  return (
    <Reveal delay={delay}>
      <div className="group h-full rounded-3xl border border-slate-200 bg-[#f8fafc] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#00badc]/40 hover:shadow-xl hover:shadow-slate-200/60">
        <div className="mx-auto max-w-sm">{children}</div>
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{caption}</p>
      </div>
    </Reveal>
  )
}

function StepCard({ step, title, delay, vignette, children }: { step: string; title: string; delay: number; vignette: React.ReactNode; children: React.ReactNode }) {
  return (
    <Reveal delay={delay}>
      <div className="group h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div className="relative border-b border-slate-100 bg-[#f8fafc] px-3 pt-3">
          {vignette}
          <span className="absolute left-4 top-4 rounded-full bg-white px-2.5 py-1 text-xs font-bold tabular-nums text-slate-900 shadow-sm">{step}</span>
        </div>
        <div className="p-5">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{children}</p>
        </div>
      </div>
    </Reveal>
  )
}
