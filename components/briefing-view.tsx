"use client"

import Image from "next/image"
import type { EditableSpace } from "@/lib/convert-program-to-spaces"

interface BriefingTotals {
  totalRSF: number
  totalUSF: number
  assignableSeats: number
  focusOpenUSF: number
  focusEnclosedUSF: number
  collaborativeUSF: number
  supportUSF: number
  wellnessUSF: number
}

interface BriefingViewProps {
  spaces: Record<string, EditableSpace>
  totals: BriefingTotals
  headcount: number
  scenarioName?: string
  projectInfo: { projectName: string; client: string; date: string; designedBy?: string }
}

const ZONES = [
  { key: "Focus Open",     usfKey: "focusOpenUSF"     as const, hex: "#06b6d4", label: "Focus Open",     tw: "bg-cyan-500",  light: "bg-cyan-50  text-cyan-800  border-cyan-200" },
  { key: "Focus Enclosed", usfKey: "focusEnclosedUSF" as const, hex: "#0d9488", label: "Focus Enclosed", tw: "bg-teal-600",  light: "bg-teal-50  text-teal-800  border-teal-200" },
  { key: "Collaborative",  usfKey: "collaborativeUSF" as const, hex: "#22c55e", label: "Collaborative",  tw: "bg-green-500", light: "bg-green-50 text-green-800 border-green-200" },
  { key: "Support",        usfKey: "supportUSF"       as const, hex: "#f59e0b", label: "Support",        tw: "bg-amber-500", light: "bg-amber-50 text-amber-800 border-amber-200" },
  { key: "Wellness",       usfKey: "wellnessUSF"      as const, hex: "#a855f7", label: "Wellness",       tw: "bg-purple-500",light: "bg-purple-50 text-purple-800 border-purple-200" },
]

function fmt(n: number) {
  return Math.round(n).toLocaleString()
}

function ZoneDonut({ totals, totalUSF }: { totals: BriefingTotals; totalUSF: number }) {
  const r = 52
  const cx = 64
  const cy = 64

  let cumulativeAngle = -Math.PI / 2
  const arcs = ZONES.map(({ usfKey, hex }) => {
    const val = totals[usfKey] || 0
    const pct = totalUSF > 0 ? val / totalUSF : 0
    const angle = pct * 2 * Math.PI
    const startAngle = cumulativeAngle
    cumulativeAngle += angle

    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(cumulativeAngle)
    const y2 = cy + r * Math.sin(cumulativeAngle)
    const largeArc = angle > Math.PI ? 1 : 0

    return { hex, x1, y1, x2, y2, largeArc, pct, angle }
  }).filter((a) => a.pct > 0.005)

  if (arcs.length === 0) return null

  return (
    <svg viewBox="0 0 128 128" className="w-full h-full drop-shadow-sm">
      {arcs.map((arc, i) => (
        <path
          key={i}
          d={`M ${cx} ${cy} L ${arc.x1} ${arc.y1} A ${r} ${r} 0 ${arc.largeArc} 1 ${arc.x2} ${arc.y2} Z`}
          fill={arc.hex}
        />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.56} fill="white" />
    </svg>
  )
}

export function BriefingView({ spaces, totals, headcount, scenarioName, projectInfo }: BriefingViewProps) {
  const rsf = totals.totalRSF || 0
  const usf = totals.totalUSF || 0
  const seats = totals.assignableSeats || 0
  const rsfPerPerson = headcount > 0 ? Math.round(rsf / headcount) : 0
  const usfPerPerson = headcount > 0 ? Math.round(usf / headcount) : 0

  const spaceList = Object.values(spaces)
    .filter((s) => s.isActive !== false && s.quantity > 0)
    .sort((a, b) => {
      const zoneOrder = ["Focus Open", "Focus Enclosed", "Collaborative", "Support", "Wellness"]
      const az = zoneOrder.indexOf(a.zone)
      const bz = zoneOrder.indexOf(b.zone)
      if (az !== bz) return az - bz
      return (b.totalArea || 0) - (a.totalArea || 0)
    })

  const totalSpaceArea = spaceList.reduce((s, sp) => s + (sp.totalArea || 0), 0)

  const formattedDate = projectInfo.date
    ? new Date(projectInfo.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : ""

  return (
    <div className="h-full bg-white flex flex-col">
      {/* ── Slim header ── */}
      <div className="flex items-center justify-between px-8 py-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 leading-none truncate">
              {projectInfo.projectName || "Program Summary"}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              {projectInfo.client && <span>{projectInfo.client}</span>}
              {projectInfo.client && formattedDate && <span className="text-slate-300">·</span>}
              {formattedDate && <span>{formattedDate}</span>}
              {scenarioName && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-teal-600 font-medium">{scenarioName}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Image src="/nelson-logo.png" alt="Nelson" width={90} height={28} className="h-6 w-auto shrink-0" />
      </div>

      {/* ── Body: left panel + right table ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: KPI + Chart (fixed width) ── */}
        <div className="w-[300px] xl:w-[340px] shrink-0 border-r border-slate-200 flex flex-col overflow-y-auto">

          {/* RSF hero */}
          <div className="m-5 mb-0 rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 p-5 shadow-sm">
            <p className="text-[9px] uppercase tracking-[0.22em] text-teal-300 font-bold mb-1.5">Total RSF</p>
            <p className="text-[3.25rem] font-black tabular-nums leading-none text-white">{fmt(rsf)}</p>
            <p className="text-teal-300 text-[11px] mt-2.5 font-semibold uppercase tracking-wider">Rentable Square Feet</p>
          </div>

          {/* KPI 2×2 — colored accents matching Config Targets */}
          <div className="grid grid-cols-2 gap-3 p-5 pb-0">
            {[
              { label: "RSF / Person", value: fmt(rsfPerPerson), sub: "Density",        border: "border-blue-200",    bg: "from-blue-50 to-blue-100",    text: "text-blue-900",    sub2: "text-blue-500" },
              { label: "Total Seats",  value: fmt(seats),         sub: "Workpoints",     border: "border-amber-200",   bg: "from-amber-50 to-amber-100",   text: "text-amber-900",   sub2: "text-amber-500" },
              { label: "Headcount",    value: fmt(headcount),     sub: "Total",          border: "border-slate-200",   bg: "from-slate-50 to-slate-100",   text: "text-slate-900",   sub2: "text-slate-400" },
              { label: "USF / Person", value: fmt(usfPerPerson),  sub: "Usable density", border: "border-teal-200",    bg: "from-teal-50 to-teal-100",     text: "text-teal-900",    sub2: "text-teal-500" },
            ].map(({ label, value, sub, border, bg, text, sub2 }) => (
              <div key={label} className={`rounded-xl border ${border} bg-gradient-to-br ${bg} p-3.5`}>
                <p className={`text-[9px] uppercase tracking-[0.16em] font-semibold mb-1 ${sub2}`}>{label}</p>
                <p className={`text-2xl font-black tabular-nums leading-none ${text}`}>{value}</p>
                <p className={`text-[10px] mt-1 ${sub2}`}>{sub}</p>
              </div>
            ))}
          </div>

          {/* Donut + zone legend */}
          <div className="p-5 flex-1">
            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-semibold mb-3">Zone Mix</p>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 shrink-0">
                <ZoneDonut totals={totals} totalUSF={usf} />
              </div>
              <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                {ZONES.map(({ key, usfKey, tw, label }) => {
                  const val = totals[usfKey] || 0
                  const pct = usf > 0 ? Math.round((val / usf) * 100) : 0
                  if (pct === 0 && val === 0) return null
                  return (
                    <div key={key} className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${tw} shrink-0`} />
                      <span className="text-[11px] text-slate-600 truncate flex-1">{label}</span>
                      <span className="text-[11px] font-bold text-slate-900 tabular-nums ml-auto">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* USF footer in left panel */}
          <div className="mx-5 mb-5 rounded-xl border border-slate-200 px-4 py-2.5 flex items-center justify-between bg-slate-50">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total USF</span>
            <span className="text-base font-bold tabular-nums text-slate-900">{fmt(usf)}</span>
          </div>
        </div>

        {/* ── RIGHT: Program table ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Table header */}
          <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">Program Summary</p>
            <span className="text-xs text-slate-400 tabular-nums">{spaceList.length} spaces</span>
          </div>

          {/* Scrollable table body */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Space</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Zone</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Qty</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">SF ea.</th>
                  <th className="px-6 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total SF</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">% Mix</th>
                </tr>
              </thead>
              <tbody>
                {spaceList.map((space, i) => {
                  const area = space.totalArea || 0
                  const pct = totalSpaceArea > 0 ? ((area / totalSpaceArea) * 100).toFixed(1) : "0.0"
                  const zone = ZONES.find((z) => z.key === space.zone)
                  const isEven = i % 2 === 0
                  return (
                    <tr key={space.id} className={`border-b border-slate-100 ${isEven ? "bg-slate-50/50" : "bg-white"}`}>
                      <td className="px-6 py-2.5 text-slate-800 font-medium">{space.customName || space.name}</td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1.5">
                          {zone && <span className={`w-2 h-2 rounded-full ${zone.tw} shrink-0`} />}
                          <span className="text-slate-500 text-xs">{space.zone}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600 tabular-nums">{space.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500 tabular-nums">{fmt(space.sfEach)}</td>
                      <td className="px-6 py-2.5 text-right font-semibold text-slate-800 tabular-nums">{fmt(area)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-400 tabular-nums text-xs">{pct}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Sticky footer totals */}
          <div className="border-t border-slate-300 shrink-0 bg-white">
            <div className="flex items-center px-6 py-2 bg-slate-50 border-b border-slate-200">
              <span className="flex-1 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider pr-6">Total Usable (USF)</span>
              <span className="w-28 text-right font-bold text-slate-900 tabular-nums text-sm">{fmt(usf)}</span>
              <span className="w-16 text-right text-slate-400 text-xs">100%</span>
            </div>
            <div className="flex items-center px-6 py-2.5 bg-teal-600">
              <span className="flex-1 text-right text-[10px] font-bold text-teal-100 uppercase tracking-wider pr-6">Total Rentable (RSF)</span>
              <span className="w-28 text-right font-black text-white tabular-nums text-base">{fmt(rsf)}</span>
              <span className="w-16" />
            </div>
          </div>

          {/* Attribution footer */}
          <div className="px-6 py-2 border-t border-slate-100 shrink-0 flex items-center justify-between bg-white">
            <span className="text-[10px] text-slate-400">Nelson Workplace Programming</span>
            {projectInfo.designedBy && <span className="text-[10px] text-slate-400">{projectInfo.designedBy}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
