"use client"

import { use, useEffect, useState } from "react"
import Image from "next/image"
import { ArrowDown, FileDown, FileSpreadsheet, Upload, CheckCircle2, Sparkles } from "lucide-react"
import { WorkplaceProfile } from "@/components/survey/workplace-profile"
import { importIntakeWorkbook } from "@/lib/survey/workbookImport"
import { exportIntakeWorkbook } from "@/lib/survey/excelExport"
import type { SurveyResult } from "@/lib/survey/types"
import type { ProfileScores } from "@/lib/survey/sections"

/**
 * The client landing — the ONLY link a client receives. A scroll story
 * (imagery → why this matters → how it works) ending at their kit: the intake
 * workbook + guide to fill, circulate, and return. Returning the workbook here
 * submits it to NELSON and pays off with their Workplace Profile — enough to
 * whet the appetite, never enough to skip the session.
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

  useEffect(() => {
    fetch(`/api/engagements/${token}`)
      .then(async (r) => (r.ok ? setMeta(await r.json()) : setMissing((await r.json()).error ?? "Unknown link")))
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
          <div>
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
          </div>
          <div>
            <WorkplaceProfile scores={profile} />
            <p className="mt-3 text-center text-xs text-slate-400">
              A first read of your workplace&apos;s character — we&apos;ll unpack it together.
            </p>
          </div>
        </main>
      </div>
    )
  }

  // ── The scroll story ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f3f7fa] text-slate-900">
      {/* Hero */}
      <section className="relative flex min-h-[88vh] flex-col overflow-hidden">
        <Image src="/office-1.jpg" alt="" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#0b1830]/80" />
        <header className="relative z-10 px-8 py-6"><Logo light /></header>
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center text-white">
          {meta?.clientName && (
            <span className="mb-6 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              Prepared for {meta.clientName}
            </span>
          )}
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Your workplace has a <span className="text-[#00badc]">next chapter</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/80">
            NELSON turns how your teams actually work into a space program you can see,
            question, and believe in — before a single wall moves.
          </p>
          <a href="#why" className="mt-10 inline-flex items-center gap-2 rounded-xl bg-[#00badc] px-7 py-3.5 text-base font-semibold text-slate-900 transition-all hover:bg-[#2fd0ee]">
            See how it works <ArrowDown className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Stats band — "you're in the right place" */}
      <section id="why" className="bg-[#0e1a2e] px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#00badc]">
            The workplace has changed
          </p>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {INDUSTRY_STATS.map((s) => (
              <div key={s.stat} className="text-center">
                <div className="text-5xl font-bold tabular-nums tracking-tight text-white">{s.stat}</div>
                <p className="mx-auto mt-2 max-w-[26ch] text-sm leading-relaxed text-white/60">{s.caption}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-[11px] text-white/30">
            Industry planning benchmarks — we&apos;ll replace these with your numbers.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold tracking-tight">Three steps to a program you can stand behind</h2>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <StoryCard img="/office-2.jpg" step="01" title="Tell us how you work">
              The workbook below captures your teams, growth, and the spaces that matter — on your
              own time, split across department leaders if that&apos;s easier. Most finish in 30–45 minutes.
            </StoryCard>
            <StoryCard img="/office-3.jpg" step="02" title="We turn it into a program">
              Planning ratios meet your reality: every space type counted and sized, your existing
              footprint compared side-by-side with what your future actually needs.
            </StoryCard>
            <StoryCard img="/office-1.jpg" step="03" title="We validate it together">
              A live working session — your teams mapped on a whiteboard, trade-offs moving in real
              time, every open question decided in the room. You leave with the plan.
            </StoryCard>
          </div>
        </div>
      </section>

      {/* The kit */}
      <section className="border-t border-slate-200 bg-white px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#00badc]/30 bg-[#00badc]/10 px-3.5 py-1.5 text-sm font-medium text-[#0089a3]">
            <Sparkles className="h-4 w-4" /> Get started
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-tight">Your discovery kit{meta?.clientName ? ` for ${meta.clientName}` : ""}</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Two files: a guide that explains everything, and the workbook itself. Fill it, pass it
            around, wrangle the answers — then bring it back here.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => exportIntakeWorkbook(emptyResultFor(meta?.clientName ?? ""))}
              className="flex items-center justify-center gap-2.5 rounded-xl bg-[#00badc] px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:bg-[#2fd0ee]"
            >
              <FileSpreadsheet className="h-5 w-5" /> Download the workbook
            </button>
            <a
              href={`/workbook-guide${meta?.clientName ? `?client=${encodeURIComponent(meta.clientName)}` : ""}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-6 py-4 text-base font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
            >
              <FileDown className="h-5 w-5" /> Read the guide
            </a>
          </div>

          {/* The return slot */}
          <div className="mt-10 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8">
            <Upload className="mx-auto h-6 w-6 text-slate-400" />
            <p className="mt-2 font-semibold text-slate-800">Finished? Return it here.</p>
            <p className="mt-1 text-sm text-slate-500">
              Upload the completed workbook and it flows straight into your program.
            </p>
            <label className={`mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 ${submitting ? "pointer-events-none opacity-60" : ""}`}>
              <input
                type="file" accept=".xlsx" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadWorkbook(f); e.target.value = "" }}
              />
              {submitting ? "Reading your workbook…" : "Upload completed workbook"}
            </label>
            {importError && (
              <p className="mx-auto mt-3 max-w-md rounded-lg border border-amber-400/60 bg-amber-50 px-3 py-2 text-xs text-amber-700">{importError}</p>
            )}
          </div>

          <p className="mt-8 text-xs text-slate-400">
            Questions while you fill it in? Email your NELSON contact — or note them in the
            workbook&apos;s “In your words” tab and we&apos;ll cover them together.
          </p>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-6 py-8 text-center text-xs text-slate-400">
        NELSON · Workplace Strategy Discovery
      </footer>
    </div>
  )
}

/* TODO(founder): replace with NELSON's preferred stats when provided. */
const INDUSTRY_STATS = [
  { stat: "~40%", caption: "of assigned desks sit unused on a typical day in hybrid workplaces" },
  { stat: "3.1", caption: "average in-office days per week — planning for peaks, not averages, wastes floors" },
  { stat: "1.5×", caption: "more collaborative space in high-performing workplaces than five years ago" },
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

function Logo({ light }: { light?: boolean }) {
  return (
    <Image
      src="/nelson-logo.png" alt="NELSON" width={110} height={28}
      className={`h-7 w-auto ${light ? "brightness-0 invert" : ""}`} priority
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

function StoryCard({ img, step, title, children }: { img: string; step: string; title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-44">
        <Image src={img} alt="" fill className="object-cover" />
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-900">{step}</span>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{children}</p>
      </div>
    </div>
  )
}
