"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { FileDown, FileSpreadsheet, MessagesSquare, MailCheck, Sparkles } from "lucide-react"

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

      <div className="mx-auto max-w-3xl px-8 pb-16 pt-6 print:max-w-none print:px-0 print:pt-0">
        {/* Brand header */}
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="text-2xl font-extrabold tracking-tight">NELSON</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            Workplace Strategy Discovery
          </div>
        </div>

        <h1 className="mt-8 text-3xl font-bold tracking-tight">
          Your Workplace Discovery Workbook
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
          {client ? <><span className="font-semibold text-slate-900">{client}</span> — a</>  : "A"}longside
          this guide you&apos;ve received an Excel workbook. It isn&apos;t a form for our files —
          <span className="font-semibold text-slate-900"> every cell feeds directly into your workplace program</span>:
          the seat counts, room mix, and square footage we&apos;ll design together.
        </p>

        {/* Why */}
        <Section icon={<Sparkles className="h-4 w-4" />} title="Why you're getting this">
          <p>
            Before we design anything, we capture how your organization actually works — teams,
            growth, seating culture, the rooms that matter. The workbook lets you do that on your
            own time, split it across department leaders, or hand it to whoever holds the answers.
            Most teams finish in <b>30–45 minutes</b>.
          </p>
        </Section>

        {/* What to do */}
        <Section icon={<FileSpreadsheet className="h-4 w-4" />} title="What to do — three steps">
          <ol className="space-y-3">
            <Step n={1} title="Open the workbook and start at the “Start here” tab.">
              Anything we already know is pre-filled — correct it freely. Work through the tabs
              left to right.
            </Step>
            <Step n={2} title="Fill the shaded cells. Mark checkboxes with an X.">
              <b>Leave anything you don&apos;t know blank.</b> Blanks aren&apos;t failures — they become
              agenda items we resolve together in your validation session. There are no wrong answers.
            </Step>
            <Step n={3} title="Send it back.">
              Reply to your NELSON contact with the finished file — or return to your NELSON link
              and use <i>“Upload completed workbook”</i> at the bottom of the page.
            </Step>
          </ol>
        </Section>

        {/* The tabs */}
        <Section icon={<FileSpreadsheet className="h-4 w-4" />} title="What's inside">
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              {[
                ["Company & Goals", "Who you are and what's driving the project — growth, optimization, flexibility."],
                ["Departments", "Each team: headcount today and in 3–5 years, private offices, dedicated desks."],
                ["Roster", "Name your people. Mark leaders — they're first in line for private offices."],
                ["Existing", "What's in place today: how many workstations, offices, and rooms, and their sizes."],
                ["Spaces", "The collaboration and support spaces that matter, and how they should be set up."],
                ["In your words", "What's working and what isn't — plain language, no jargon needed."],
              ].map(([tab, what]) => (
                <tr key={tab} className="border-b border-slate-200">
                  <td className="w-44 py-2.5 pr-4 align-top font-semibold text-[#0089a3]">{tab}</td>
                  <td className="py-2.5 text-slate-600">{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* What happens next */}
        <Section icon={<MessagesSquare className="h-4 w-4" />} title="What happens next">
          <p>
            Your answers generate a <b>starting program</b> — every space type, sized by planning
            ratios against what you have today. We&apos;ll walk it together in a working session:
            your teams on a whiteboard-style program map, the trade-offs live on screen, and every
            blank you left turned into a decision we make together. You leave with a program
            document your whole organization can react to.
          </p>
        </Section>

        <Section icon={<MailCheck className="h-4 w-4" />} title="Questions while filling it in?">
          <p>
            Send them to your NELSON contact as they come up — or just note them in the
            “In your words” tab and we&apos;ll cover them live.
          </p>
        </Section>

        <div className="mt-10 border-t border-slate-200 pt-3 text-[11px] text-slate-400">
          NELSON · Workplace Strategy Discovery · This workbook pairs with your discovery survey —
          use whichever is easier. Same questions, same program.
        </div>
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
