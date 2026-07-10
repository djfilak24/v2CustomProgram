"use client"

import { Suspense } from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { FileDown, FileSpreadsheet, MessagesSquare, MailCheck, Sparkles, Clock, LayoutGrid, FileType } from "lucide-react"

/**
 * The send-along guide for the intake workbook — what you're getting, why, and
 * exactly what to do. Sent as a PDF beside the .xlsx so the onboarding is
 * self-explanatory. Screen and print share one layout; "Save as PDF" is just
 * the browser's print. Personalize with ?client=Acme.
 */
export default function WorkbookGuidePage() {
  return (
    <Suspense>
      <Guide />
    </Suspense>
  )
}

function Guide() {
  const client = useSearchParams().get("client")

  return (
    <div className="min-h-screen bg-[#f3f7fa] text-slate-900 print:bg-white">
      <style>{`@page { size: letter; margin: 14mm; }`}</style>

      {/* Screen-only chrome */}
      <div className="flex items-center justify-end gap-2 px-8 pt-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#00badc] px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#2fd0ee]"
        >
          <FileDown className="h-4 w-4" /> Save as PDF
        </button>
      </div>

      <div className="mx-auto max-w-5xl px-8 pb-16 pt-6 lg:px-14 print:max-w-none print:px-0 print:pt-0">
        {/* Brand header */}
        <div className="flex items-end justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <Image
              src="/NELSON_color.png" alt="NELSON" width={170} height={40}
              className="h-8 w-auto" priority
            />
            <div className="mt-1.5 text-[11px] uppercase tracking-[0.2em] text-slate-500">
              Workplace Strategy Discovery
            </div>
          </div>
          <div className="hidden text-right text-[11px] uppercase tracking-[0.2em] text-slate-400 sm:block">
            Discovery guide
          </div>
        </div>

        {/* Hero: intro + at-a-glance facts, side by side once there's room */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_248px] lg:items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
              Your Workplace Discovery Workbook
            </h1>
            <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-slate-600">
              {client ? <><span className="font-semibold text-slate-900">{client}</span> — a</> : "A"}longside
              this guide you&apos;ve received an Excel workbook. It isn&apos;t a form for our files —
              <span className="font-semibold text-slate-900"> every cell feeds directly into your workplace program</span>:
              the seat counts, room mix, and square footage we&apos;ll design together.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-1 print:hidden">
            <Fact icon={<Clock className="h-3.5 w-3.5" />} label="Time" value="30–45 min" />
            <Fact icon={<LayoutGrid className="h-3.5 w-3.5" />} label="Tabs" value="6 sections" />
            <Fact icon={<FileType className="h-3.5 w-3.5" />} label="Format" value="Excel (.xlsx)" />
          </dl>
        </div>

        {/* Main narrative (left) + reference rail (right) once there's room to breathe */}
        <div className="mt-10 lg:grid lg:grid-cols-[1fr_296px] lg:items-start lg:gap-x-14">
          <div>
            <Section icon={<Sparkles className="h-4 w-4" />} title="Why you're getting this">
              <p className="max-w-[68ch]">
                Before we design anything, we capture how your organization actually works — teams,
                growth, seating culture, the rooms that matter. The workbook lets you do that on your
                own time, split it across department leaders, or hand it to whoever holds the answers.
                Most teams finish in <b>30–45 minutes</b>.
              </p>
            </Section>

            <Section icon={<FileSpreadsheet className="h-4 w-4" />} title="What to do — three steps">
              <ol className="space-y-3">
                <Step n={1} title="Open the workbook and start at the “Start here” tab.">
                  Anything we already know is pre-filled — correct it freely. Work through the tabs
                  left to right.
                </Step>
                <Step n={2} title="Fill the shaded cells. Mark checkboxes with an X.">
                  <b>Leave anything you don&apos;t know blank.</b>{" "}
                  Blanks aren&apos;t failures — they become agenda items we resolve together in your
                  validation session. There are no wrong answers.
                </Step>
                <Step n={3} title="Send it back.">
                  Reply to your NELSON contact with the finished file — or return to your NELSON link
                  and use <i>“Upload completed workbook”</i> at the bottom of the page.
                </Step>
              </ol>
            </Section>

            <Section icon={<MessagesSquare className="h-4 w-4" />} title="What happens next">
              <p className="max-w-[68ch]">
                Your answers generate a <b>starting program</b> — every space type, sized by planning
                ratios against what you have today. We&apos;ll walk it together in a working session:
                your teams on a whiteboard-style program map, the trade-offs live on screen, and every
                blank you left turned into a decision we make together. You leave with a program
                document your whole organization can react to.
              </p>
            </Section>

            <Section icon={<MailCheck className="h-4 w-4" />} title="Questions while filling it in?">
              <p className="max-w-[68ch]">
                Send them to your NELSON contact as they come up — or just note them in the
                “In your words” tab and we&apos;ll cover them live.
              </p>
            </Section>
          </div>

          {/* Reference rail — the tab legend, as a standing quick-reference card */}
          <aside className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-8 lg:mt-0 print:mt-8 print:rounded-none print:border-0 print:border-t print:border-slate-200 print:p-0 print:pt-4" style={{ breakInside: "avoid" }}>
            <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#0089a3]">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#00badc]/12 text-[#0089a3]">
                <FileSpreadsheet className="h-4 w-4" />
              </span>
              What&apos;s inside
            </h2>
            <dl className="mt-4 space-y-4">
              {[
                ["Company & Goals", "Who you are and what's driving the project — growth, optimization, flexibility."],
                ["Departments", "Each team: headcount today and in 3–5 years, private offices, dedicated desks."],
                ["Roster", "Name your people. Mark leaders — they're first in line for private offices."],
                ["Existing", "What's in place today: how many workstations, offices, and rooms, and their sizes."],
                ["Spaces", "The collaboration and support spaces that matter, and how they should be set up."],
                ["In your words", "What's working and what isn't — plain language, no jargon needed."],
              ].map(([tab, what]) => (
                <div key={tab}>
                  <dt className="text-[13px] font-semibold text-[#0089a3]">{tab}</dt>
                  <dd className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{what}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-3 text-[11px] text-slate-400">
          NELSON · Workplace Strategy Discovery · This workbook pairs with your discovery survey —
          use whichever is easier. Same questions, same program.
        </div>
      </div>
    </div>
  )
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center lg:flex-row lg:items-center lg:gap-2.5 lg:text-left">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#00badc]/12 text-[#0089a3]">{icon}</span>
      <div className="lg:leading-tight">
        <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
        <div className="text-[13px] font-semibold text-slate-800">{value}</div>
      </div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8" style={{ breakInside: "avoid" }}>
      <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#0089a3]">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#00badc]/12 text-[#0089a3]">{icon}</span>
        {title}
      </h2>
      <div className="mt-3 text-[14px] leading-relaxed text-slate-600">{children}</div>
    </section>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[12px] font-bold text-white">{n}</span>
      <span>
        <span className="font-semibold text-slate-900">{title}</span>{" "}
        <span className="text-slate-600">{children}</span>
      </span>
    </li>
  )
}
