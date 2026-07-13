"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { KeyRound, Target, LayoutGrid, GitCompareArrows, Presentation, ArrowRight, FlaskConical, MonitorPlay } from "lucide-react"
import { isNelsonMode } from "@/lib/nelsonMode"

/**
 * The Lab — Phase 0 design discovery (ROADMAP.md). Prototype-style
 * explorations, deliberately throwaway: breadth over polish, decisions
 * recorded. Nothing here is production; everything here is a question with
 * real numbers behind it. NELSON-only.
 */
const EXPLORATIONS = [
  {
    href: "/lab/target",
    icon: Target,
    tag: "0.4 · start here",
    title: "The target conversation",
    question:
      "Four questions answered together — today · how you're designing work · what the ratios say · your number — with live compromise levers powered by the real engine.",
    accent: "#00badc",
  },
  {
    href: "/lab/studio",
    icon: LayoutGrid,
    tag: "0.1",
    title: "Studio UI directions",
    question:
      "Two layout studies for the cockpit — the Delta Cockpit (target-first mission control) and the Ledger (calm session document) — with the target line designed in, not bolted on.",
    accent: "#2563eb",
  },
  {
    href: "/lab/scenarios",
    icon: GitCompareArrows,
    tag: "0.3",
    title: "Scenarios · segment & audit",
    question:
      "Save-and-compare named scenarios side by side, and the segment view: engine ratio vs survey ask vs today on every line, with the implications called out.",
    accent: "#f59e0b",
  },
  {
    href: "/lab/deliverable",
    icon: Presentation,
    tag: "0.2",
    title: "The deliverable arc",
    question:
      "The deck as a designed presentation: pacing storyboard, the new verdict-vs-target beat, the decisions & compromises slide, dark/light rhythm, print parity.",
    accent: "#10b981",
  },
  {
    href: "/lab/command",
    icon: MonitorPlay,
    tag: "0.5 · founder brief",
    title: "The Command Center",
    question:
      "Fetching an engagement from the designer's chair: what they said · what the system recommends · which door, how completely · the deliverable's review → push state · and the live-session prep kit.",
    accent: "#8b5cf6",
  },
]

export default function LabPage() {
  const [nelson, setNelson] = useState<boolean | null>(null)
  useEffect(() => { setNelson(isNelsonMode()) }, [])

  if (nelson === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3f7fa] px-6 text-center">
        <Image src="/NELSON_color.png" alt="NELSON" width={170} height={40} className="h-8 w-auto" />
        <span className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#00badc]/10 text-[#0089a3]"><KeyRound className="h-5 w-5" /></span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">NELSON only.</h1>
        <p className="mt-2 max-w-md text-slate-600">
          The Lab is internal design discovery. Unlock presenter mode at{" "}
          <a href="/engagements" className="font-semibold text-[#0089a3] underline">/engagements</a> first.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0e1a2e] text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="flex items-center gap-3">
          <Image src="/NELSON_whiteBlueFin.png" alt="NELSON" width={150} height={35} className="h-7 w-auto" />
          <span className="text-white/30">·</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70"><FlaskConical className="h-4 w-4 text-[#00badc]" /> The Lab</span>
        </div>
        <h1 className="mt-8 text-4xl font-bold tracking-tight">Phase 0 — design discovery.</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-white/60">
          Prototype-style explorations ahead of the hardening phases. Everything below runs on real
          demo data and the real engine — but none of it is production. React hard; we throw away
          freely. Exit criteria: founder-approved comps for the Studio, the deliverable, and the
          target conversation.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {EXPLORATIONS.map((x) => (
            <Link
              key={x.href}
              href={x.href}
              className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-white/25 hover:bg-white/[0.07]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${x.accent}22`, color: x.accent }}>
                  <x.icon className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">{x.tag}</span>
              </div>
              <h2 className="mt-4 text-lg font-bold">{x.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">{x.question}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: x.accent }}>
                Open the exploration <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-xs text-white/35">
          Demo data: Law Firm · 60 → 67 people. The engine behind every number:{" "}
          <span className="font-mono">lib/fast-track-calculations.ts</span> — seat-sharing formula,
          days/week policy, attendance peaks, policy-flexed collaboration ratios.
        </p>
      </div>
    </div>
  )
}
