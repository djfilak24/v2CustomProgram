"use client"

import Link from "next/link"
import { useMemo, useState, type ReactNode } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Eye,
  Gauge,
  Layers3,
  Minus,
  PanelLeft,
  Plus,
  Settings2,
  SlidersHorizontal,
  StickyNote,
  Target,
  Users,
} from "lucide-react"
import { buildDeliverable, CATEGORY_COLORS } from "@/lib/survey/deliverable"
import { demoResult } from "@/lib/survey/demo-scenarios"
import type { ComparisonLine } from "@/lib/survey/comparison"

type Section = "cards" | "rails"

const LAYERS = ["Plan", "Engine", "Survey", "Today", "Allocation", "Notes"]

export default function StudioHierarchyLab() {
  const result = useMemo(() => demoResult("law")!, [])
  const d = useMemo(() => buildDeliverable(result), [result])
  const [section, setSection] = useState<Section>("cards")
  const line = d.categories.flatMap((category) => category.lines).find((item) => item.key === "workstations")
    ?? d.categories[0].lines[0]
  const category = d.categories.find((item) => item.name === line.category) ?? d.categories[0]

  return (
    <div className="min-h-screen bg-[#edf2f6] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-5 px-6 py-3">
          <Link href="/lab" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> The Lab
          </Link>
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            <Tab active={section === "cards"} onClick={() => setSection("cards")}>5 card systems</Tab>
            <Tab active={section === "rails"} onClick={() => setSection("rails")}>5 summary systems</Tab>
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Studio hierarchy study</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1680px] px-6 py-8">
        <div className="mb-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_520px]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0089a3]">Design question</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-bold">How does a designer see every source of truth without making every source equally loud?</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Each study uses the same Law Firm program line and the same six visibility layers. The comparison is about hierarchy,
              evidence provenance, and what remains legible while the client is watching.
            </p>
          </div>
          <div className="border-l-4 border-[#00badc] bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Evaluation criteria</p>
            <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-xs text-slate-600">
              {["Configured plan is unmistakable", "Engine / survey / today stay independent", "Dimensions and total SF scan together", "Allocation gaps become actionable", "Layers can disappear without reflow", "Client-safe at presentation distance"].map((item) => (
                <p key={item} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{item}</p>
              ))}
            </div>
          </div>
        </div>

        {section === "cards" ? (
          <div className="space-y-7">
            <LayerBar />
            <Concept n="01" name="Evidence Stack" verdict="Best all-around hierarchy" idea="A strong plan header, an explicit evidence ledger, then operational detail. The collapsed state still tells the whole validation story.">
              <EvidenceStack line={line} accent={CATEGORY_COLORS[category.name].accent} />
            </Concept>
            <Concept n="02" name="Source Ladder" verdict="Best for the live validation conversation" idea="The four quantities become a left-to-right narrative: what exists, what they requested, what the engine recommends, and what the room configured.">
              <SourceLadder line={line} accent={CATEGORY_COLORS[category.name].accent} />
            </Concept>
            <Concept n="03" name="Specification Sheet" verdict="Best for fit-planning handoff" idea="A technical specification card with a fixed data grid. Dense and complete, with provenance handled as fields instead of badges.">
              <SpecificationSheet line={line} accent={CATEGORY_COLORS[category.name].accent} />
            </Concept>
            <Concept n="04" name="Decision Card" verdict="Best for facilitation" idea="The discrepancy is the headline. The card leads with the decision the room needs to make, then shows the evidence underneath it.">
              <DecisionCard line={line} accent={CATEGORY_COLORS[category.name].accent} />
            </Concept>
            <Concept n="05" name="Allocation Map" verdict="Best for seating-heavy programs" idea="Department ownership is promoted from a footer accordion into the visual center, while quantity and area become the frame around it.">
              <AllocationMap line={line} accent={CATEGORY_COLORS[category.name].accent} />
            </Concept>
          </div>
        ) : (
          <div className="grid gap-7 xl:grid-cols-2">
            <RailConcept n="01" name="Docked Command Spine" verdict="Best direct correction" idea="A flush, full-height rail with no floating-card silhouette. Identity, target, program, and session are fixed zones.">
              <DockedSpine d={d} />
            </RailConcept>
            <RailConcept n="02" name="Canvas Masthead + Tool Rail" verdict="Best canvas hierarchy" idea="The summary becomes a powerful top band spanning the work area; a thin edge rail holds navigation and display controls.">
              <MastheadRail d={d} />
            </RailConcept>
            <RailConcept n="03" name="Target Rail" verdict="Best for goal-driven sessions" idea="A narrow fixed rail is organized entirely around target, current program, and the levers that close the delta.">
              <TargetRail d={d} />
            </RailConcept>
            <RailConcept n="04" name="Category Navigator" verdict="Best for long programs" idea="The anchored summary doubles as a category table of contents, with total SF and completion status always visible.">
              <CategoryRail d={d} />
            </RailConcept>
            <RailConcept n="05" name="Session Split Rail" verdict="Best for meeting memory" idea="Stable program KPIs occupy the top; live decisions and unresolved gaps stream below without opening a competing drawer.">
              <SessionRail d={d} />
            </RailConcept>
          </div>
        )}
      </main>
    </div>
  )
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} className={`rounded-md px-4 py-1.5 text-xs font-bold ${active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{children}</button>
}

function LayerBar() {
  return (
    <div className="flex flex-wrap items-center gap-2 border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className="mr-2 inline-flex items-center gap-2 text-xs font-bold text-slate-700"><SlidersHorizontal className="h-4 w-4" /> Visible data</span>
      {LAYERS.map((layer, index) => (
        <span key={layer} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${index < 5 ? "border-[#00badc]/30 bg-[#00badc]/10 text-[#007c94]" : "border-slate-200 text-slate-400"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${index < 5 ? "bg-[#00badc]" : "bg-slate-300"}`} />{layer}
        </span>
      ))}
      <span className="ml-auto text-[11px] text-slate-400">Preset: Working session</span>
    </div>
  )
}

function Concept({ n, name, verdict, idea, children }: { n: string; name: string; verdict: string; idea: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-slate-300 pt-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div>
        <span className="text-xs font-bold text-[#0089a3]">{n}</span>
        <h2 className="mt-1 text-xl font-bold">{name}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{idea}</p>
        <p className="mt-3 inline-flex border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700">{verdict}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function RailConcept({ n, name, verdict, idea, children }: { n: string; name: string; verdict: string; idea: string; children: ReactNode }) {
  return (
    <section className="border-t-4 border-slate-900 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div><span className="text-xs font-bold text-[#0089a3]">{n}</span><h2 className="mt-1 text-lg font-bold">{name}</h2></div>
        <span className="border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-500">{verdict}</span>
      </div>
      <p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{idea}</p>
      <div className="mt-4 h-[390px] overflow-hidden border border-slate-200 bg-[#edf2f6]">{children}</div>
    </section>
  )
}

function EvidenceStack({ line, accent }: CardProps) {
  return (
    <div className="max-w-[760px] border border-slate-300 bg-white shadow-sm" style={{ borderTop: `4px solid ${accent}` }}>
      <div className="flex items-start justify-between gap-5 px-5 py-4">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Workstations / primary standard</p><h3 className="mt-1 text-lg font-bold">{line.label}</h3></div>
        <div className="flex items-center gap-1 text-slate-400"><Eye className="h-4 w-4" /><Settings2 className="h-4 w-4" /></div>
      </div>
      <div className="grid grid-cols-[1fr_1fr_1.15fr] border-y border-slate-200">
        <Metric label="Configured quantity" value={line.proposedCount} controls />
        <Metric label="Unit area" value={`${line.unitSF} SF`} detail="6' x 8'" />
        <Metric label="Planned area" value={`${(line.proposedCount * line.unitSF).toLocaleString()} SF`} strong />
      </div>
      <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-200 bg-slate-50">
        <Evidence label="Engine" value="28" status="matched" />
        <Evidence label="Survey ask" value="12" status="16 below" warn />
        <Evidence label="Today" value="22" status="6 more" />
        <Evidence label="Configured" value="28" status="session truth" active />
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3">
        <div className="flex flex-wrap gap-2"><Tag>Paralegals 8</Tag><Tag>Administration 4</Tag><Tag muted>16 unassigned</Tag></div>
        <button className="inline-flex items-center gap-1 text-xs font-bold text-slate-600"><ChevronRight className="h-3.5 w-3.5" /> Allocation & notes</button>
      </div>
    </div>
  )
}

function SourceLadder({ line, accent }: CardProps) {
  const steps = [["Today", 22, "1,056 SF"], ["Survey", 12, "576 SF"], ["Engine", 28, "1,344 SF"], ["Plan", line.proposedCount, `${(line.proposedCount * line.unitSF).toLocaleString()} SF`]] as const
  return (
    <div className="max-w-[920px] border border-slate-300 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <div><span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>Workstations</span><h3 className="text-lg font-bold">{line.label}</h3></div>
        <div className="text-right"><p className="text-[10px] font-bold uppercase text-slate-400">Unit standard</p><p className="font-bold">{line.unitSF} SF <span className="font-medium text-slate-400">6' x 8'</span></p></div>
      </div>
      <div className="grid grid-cols-4">
        {steps.map(([label, value, sf], index) => (
          <div key={label} className={`relative px-5 py-4 ${index < 3 ? "border-r border-slate-200" : "bg-[#e8f8fb]"}`}>
            {index < 3 && <ChevronRight className="absolute -right-2.5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 rounded-full border border-slate-200 bg-white p-1 text-slate-400" />}
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-slate-500">{sf}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 border-t border-slate-200 px-5 py-3 text-xs">
        <span className="font-bold text-amber-700">Survey asked for 16 fewer than the engine</span>
        <span className="text-slate-400">Plan follows engine recommendation</span>
        <span className="ml-auto font-semibold text-slate-600">12 / 28 allocated</span>
      </div>
    </div>
  )
}

function SpecificationSheet({ line, accent }: CardProps) {
  const rows = [["Quantity", `${line.proposedCount}`, "Engine", "28"], ["Unit area", `${line.unitSF} SF`, "Survey", "12"], ["Dimensions", "6' x 8'", "Existing", "22"], ["Net area", `${(line.proposedCount * line.unitSF).toLocaleString()} SF`, "Variance", "Matched"]]
  return (
    <div className="max-w-[720px] bg-white shadow-sm">
      <div className="grid grid-cols-[8px_220px_minmax(0,1fr)] border border-slate-300">
        <div style={{ backgroundColor: accent }} />
        <div className="border-r border-slate-200 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Space specification</p>
          <h3 className="mt-1 text-xl font-bold">{line.label}</h3>
          <p className="mt-2 text-xs leading-5 text-slate-500">Primary workstation standard for shared and dedicated seating.</p>
          <div className="mt-5 flex gap-2"><Tag>12 allocated</Tag><Tag muted>16 open</Tag></div>
        </div>
        <div>
          {rows.map(([a, b, c, d]) => (
            <div key={a} className="grid grid-cols-[1fr_90px_1fr_90px] border-b border-slate-100 px-4 py-2.5 text-xs last:border-b-0">
              <span className="text-slate-400">{a}</span><b className="tabular-nums">{b}</b><span className="text-slate-400">{c}</span><b className="tabular-nums">{d}</b>
            </div>
          ))}
        </div>
      </div>
      <div className="flex border-x border-b border-slate-300 bg-slate-50 px-4 py-2.5 text-xs text-slate-500"><span>Departments: Paralegals 8, Administration 4</span><span className="ml-auto">Notes 1</span></div>
    </div>
  )
}

function DecisionCard({ line, accent }: CardProps) {
  return (
    <div className="max-w-[780px] border border-slate-300 bg-white shadow-sm">
      <div className="grid grid-cols-[1fr_230px]">
        <div className="p-5">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> Decision needed</p>
          <h3 className="mt-2 text-xl font-bold">Where should the remaining 16 workstations go?</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">The plan matches the engine at 28, but only 12 are connected to departments in the survey.</p>
          <div className="mt-4 flex gap-2"><button className="bg-slate-900 px-3 py-2 text-xs font-bold text-white">Allocate now</button><button className="border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600">Add session note</button></div>
        </div>
        <div className="border-l border-slate-200 bg-slate-50 p-5">
          <p className="text-[10px] font-bold uppercase text-slate-400">{line.label}</p>
          <p className="mt-1 text-4xl font-bold tabular-nums" style={{ color: accent }}>{line.proposedCount}</p>
          <p className="text-xs text-slate-500">x {line.unitSF} SF / 6' x 8'</p>
          <p className="mt-4 text-lg font-bold">{(line.proposedCount * line.unitSF).toLocaleString()} SF</p>
          <div className="mt-3 h-2 bg-slate-200"><div className="h-2" style={{ width: "43%", backgroundColor: accent }} /></div>
          <p className="mt-1 text-[10px] text-slate-400">12 assigned / 28 configured</p>
        </div>
      </div>
      <div className="grid grid-cols-4 divide-x divide-slate-200 border-t border-slate-200 text-center text-xs"><Mini label="Today" value="22" /><Mini label="Survey" value="12" /><Mini label="Engine" value="28" /><Mini label="Plan" value="28" strong /></div>
    </div>
  )
}

function AllocationMap({ line, accent }: CardProps) {
  return (
    <div className="max-w-[860px] border border-slate-300 bg-white shadow-sm">
      <div className="flex items-center gap-6 border-b border-slate-200 px-5 py-4">
        <div className="min-w-[190px]"><p className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: accent }}>Workstations</p><h3 className="text-lg font-bold">{line.label}</h3></div>
        <div><p className="text-[10px] font-bold uppercase text-slate-400">Plan</p><p className="text-2xl font-bold">{line.proposedCount}</p></div>
        <div><p className="text-[10px] font-bold uppercase text-slate-400">Standard</p><p className="font-bold">{line.unitSF} SF <span className="text-xs font-medium text-slate-400">6' x 8'</span></p></div>
        <div className="ml-auto text-right"><p className="text-[10px] font-bold uppercase text-slate-400">Net area</p><p className="text-xl font-bold">{(line.proposedCount * line.unitSF).toLocaleString()} SF</p></div>
      </div>
      <div className="grid grid-cols-[1fr_180px]">
        <div className="p-5">
          <div className="flex h-12 overflow-hidden border border-slate-200">
            <div className="flex w-[29%] items-center justify-center bg-[#dff6fa] text-xs font-bold text-[#007c94]">Paralegals 8</div>
            <div className="flex w-[14%] items-center justify-center bg-blue-100 text-xs font-bold text-blue-700">Admin 4</div>
            <div className="flex flex-1 items-center justify-center bg-slate-100 text-xs font-bold text-slate-500">Unassigned 16</div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Department allocation is the primary read; drag boundaries or use steppers to rebalance.</p>
        </div>
        <div className="border-l border-slate-200 bg-slate-50 p-4 text-xs">
          <p className="font-bold text-slate-500">Evidence</p>
          <p className="mt-2 flex justify-between"><span>Engine</span><b>28</b></p><p className="mt-1 flex justify-between"><span>Survey</span><b>12</b></p><p className="mt-1 flex justify-between"><span>Today</span><b>22</b></p>
        </div>
      </div>
    </div>
  )
}

type CardProps = { line: ComparisonLine; accent: string }

function Metric({ label, value, detail, controls, strong }: { label: string; value: string | number; detail?: string; controls?: boolean; strong?: boolean }) {
  return <div className={`px-5 py-4 ${strong ? "bg-[#e8f8fb]" : "bg-white"}`}><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p><div className="mt-1 flex items-center gap-2">{controls && <Minus className="h-5 w-5 rounded-full bg-slate-100 p-1 text-slate-500" />}<p className="text-2xl font-bold tabular-nums">{value}</p>{controls && <Plus className="h-5 w-5 rounded-full bg-slate-100 p-1 text-slate-500" />}</div>{detail && <p className="text-[11px] font-semibold text-[#0089a3]">{detail}</p>}</div>
}

function Evidence({ label, value, status, active, warn }: { label: string; value: string; status: string; active?: boolean; warn?: boolean }) {
  return <div className={`px-4 py-3 ${active ? "bg-[#e8f8fb]" : ""}`}><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p><p className={`text-[10px] ${warn ? "font-semibold text-amber-700" : "text-slate-400"}`}>{status}</p></div>
}

function Tag({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${muted ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{children}</span>
}

function Mini({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`px-3 py-2.5 ${strong ? "bg-[#e8f8fb]" : ""}`}><span className="text-slate-400">{label}</span><b className="ml-2 tabular-nums">{value}</b></div>
}

type Deliverable = ReturnType<typeof buildDeliverable>

function DockedSpine({ d }: { d: Deliverable }) {
  return <div className="grid h-full grid-cols-[190px_1fr]"><RailShell d={d} /><FakeCanvas /></div>
}

function MastheadRail({ d }: { d: Deliverable }) {
  return <div className="grid h-full grid-cols-[46px_1fr]"><div className="flex flex-col items-center gap-4 bg-[#0e1a2e] py-4 text-white"><PanelLeft className="h-4 w-4" /><Gauge className="h-4 w-4 text-[#00badc]" /><Layers3 className="h-4 w-4 text-white/40" /><Users className="h-4 w-4 text-white/40" /></div><div><SummaryBand d={d} /><FakeCanvas /></div></div>
}

function TargetRail({ d }: { d: Deliverable }) {
  const target = 15000
  const gap = target - d.totals.grossUsableSF
  return <div className="grid h-full grid-cols-[170px_1fr]"><aside className="bg-white p-4"><p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">Target</p><p className="mt-1 text-2xl font-bold">{target.toLocaleString()}</p><p className="text-[10px] text-slate-400">SF / lease</p><div className="my-4 h-px bg-slate-200" /><p className="text-[9px] font-bold uppercase text-slate-400">Program</p><p className="text-xl font-bold">{d.totals.grossUsableSF.toLocaleString()}</p><span className="mt-2 inline-block bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">+{gap.toLocaleString()} SF room</span><p className="mt-5 text-[9px] font-bold uppercase text-slate-400">Levers</p>{["Seats", "Office sizes", "Circulation", "Load factor"].map(x => <p key={x} className="mt-2 flex items-center justify-between border-b border-slate-100 pb-2 text-[10px]"><span>{x}</span><ChevronRight className="h-3 w-3" /></p>)}</aside><FakeCanvas /></div>
}

function CategoryRail({ d }: { d: Deliverable }) {
  return <div className="grid h-full grid-cols-[210px_1fr]"><aside className="bg-white p-4"><p className="text-xs font-bold">{d.clientName}</p><p className="mt-1 text-[10px] text-slate-400">Program navigator</p><div className="mt-4">{d.categories.map((cat) => <div key={cat.name} className="mb-1.5 grid grid-cols-[8px_1fr_auto] items-center gap-2 border-b border-slate-100 py-2 text-[10px]"><span className="h-2 w-2" style={{ backgroundColor: CATEGORY_COLORS[cat.name].accent }} /><span className="font-semibold">{cat.name}</span><span className="tabular-nums text-slate-400">{cat.proposedTotalSF.toLocaleString()}</span></div>)}</div><p className="mt-4 text-[9px] font-bold uppercase text-slate-400">Gross usable</p><p className="text-xl font-bold">{d.totals.grossUsableSF.toLocaleString()} <span className="text-xs text-slate-400">SF</span></p></aside><FakeCanvas /></div>
}

function SessionRail({ d }: { d: Deliverable }) {
  return <div className="grid h-full grid-cols-[210px_1fr]"><aside className="flex flex-col bg-white"><div className="border-b border-slate-200 p-4"><p className="text-xs font-bold">{d.clientName}</p><p className="mt-2 text-2xl font-bold">{d.totals.grossUsableSF.toLocaleString()} <span className="text-xs text-slate-400">SF</span></p><p className="text-[10px] text-emerald-700">+6,420 SF vs today</p></div><div className="p-4"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Session record</p>{[["Office size", "144 to 120 SF"], ["Gap closed", "Office count"], ["Open", "16 seats unassigned"]].map(([a,b], i) => <div key={a} className="mt-3 border-l-2 pl-3" style={{ borderColor: i === 2 ? "#f59e0b" : "#00badc" }}><p className="text-[10px] font-bold">{a}</p><p className="text-[10px] text-slate-500">{b}</p></div>)}</div></aside><FakeCanvas /></div>
}

function RailShell({ d }: { d: Deliverable }) {
  return <aside className="flex h-full flex-col bg-white"><div className="border-b border-slate-200 p-4"><p className="text-xs font-bold">{d.clientName}</p><p className="text-[10px] text-slate-400">60 today / 67 at plan</p></div><div className="p-4"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#0089a3]">Gross usable</p><p className="mt-1 text-2xl font-bold">{d.totals.grossUsableSF.toLocaleString()}</p><p className="text-[10px] text-emerald-700">+6,420 SF vs today</p><div className="mt-4 border-t border-slate-100 pt-3"><p className="text-[9px] font-bold uppercase text-slate-400">Program status</p><p className="mt-2 text-[10px]">Workstations <b className="float-right">28 / 28</b></p><p className="mt-2 text-[10px]">Offices <b className="float-right">37 / 37</b></p></div></div><div className="mt-auto border-t border-slate-200 p-4 text-[10px]"><p className="font-bold">0 edits / 10 gaps</p></div></aside>
}

function SummaryBand({ d }: { d: Deliverable }) {
  return <div className="grid h-[92px] grid-cols-[1.2fr_1fr_1fr] border-b border-slate-200 bg-white"><div className="bg-[#0e1a2e] px-4 py-3 text-white"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#00badc]">{d.clientName} / session program</p><p className="mt-1 text-2xl font-bold">{d.totals.grossUsableSF.toLocaleString()} <span className="text-xs text-white/50">SF</span></p><p className="text-[10px] text-emerald-300">+6,420 vs today</p></div><div className="px-4 py-3"><p className="text-[9px] font-bold uppercase text-slate-400">Target</p><p className="mt-1 text-xl font-bold">15,000 SF</p><p className="text-[10px] text-emerald-700">618 SF room</p></div><div className="px-4 py-3"><p className="text-[9px] font-bold uppercase text-slate-400">Session</p><p className="mt-1 text-xl font-bold">0 edits</p><p className="text-[10px] text-amber-700">10 gaps open</p></div></div>
}

function FakeCanvas() {
  return <div className="h-full p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold">Spaces</p><div className="flex gap-1"><span className="h-5 w-16 bg-white" /><span className="h-5 w-7 bg-white" /></div></div>{["Workstations", "Offices", "Collaboration"].map((name, index) => <div key={name} className="mt-4"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{name}</p><div className="mt-1 grid grid-cols-2 gap-2"><div className="h-16 border border-slate-200 bg-white" style={{ borderLeft: `3px solid ${["#00badc", "#2563eb", "#8b5cf6"][index]}` }} /><div className="h-16 border border-dashed border-slate-300" /></div></div>)}</div>
}
