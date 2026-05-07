"use client"

import { SpaceProgram, SpaceItem } from "@/lib/fast-track-calculations"

interface ProgramTableProps {
  program: SpaceProgram
  title: string
  daysInOffice: number
}

function formatNumber(num: number): string {
  return Math.round(num).toLocaleString()
}

function SectionHeader({ label, section }: { label: string; section: "individual" | "collaborative" | "support" }) {
  const colors = {
    individual: "bg-teal-600",
    collaborative: "bg-blue-500", 
    support: "bg-purple-500"
  }
  
  return (
    <tr className="bg-slate-50">
      <td colSpan={5} className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${colors[section]}`} />
          <span className="font-semibold text-slate-700 uppercase text-xs tracking-wide">{label}</span>
        </div>
      </td>
    </tr>
  )
}

function SpaceRow({ item }: { item: SpaceItem }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50">
      <td className="px-4 py-2.5 text-slate-700">{item.name}</td>
      <td className="px-4 py-2.5 text-right text-slate-600">{formatNumber(item.areaSf)}</td>
      <td className="px-4 py-2.5 text-right text-slate-700 font-medium">{item.quantity}</td>
      <td className="px-4 py-2.5 text-right text-slate-700 font-semibold">{formatNumber(item.totalArea)}</td>
      <td className="px-4 py-2.5 text-right text-slate-500 text-sm">{item.ratioLabel || (item.ratio !== null ? `${(item.ratio * 100).toFixed(0)}%` : "-")}</td>
    </tr>
  )
}

function SubtotalRow({ label, area, section, isTotal = false }: { label: string; area: number; section: string; isTotal?: boolean }) {
  const bgClass = isTotal ? "bg-slate-100" : ""
  const textClass = isTotal ? "font-bold text-slate-900" : "font-medium text-slate-600"
  
  return (
    <tr className={bgClass}>
      <td colSpan={3} className={`px-4 py-2 text-right ${textClass}`}>{label}</td>
      <td className={`px-4 py-2 text-right ${textClass}`}>{formatNumber(area)} SF</td>
      <td className="px-4 py-2"></td>
    </tr>
  )
}

function GrandTotalRow({ label, area, highlight = false }: { label: string; area: number; highlight?: boolean }) {
  const bgClass = highlight ? "bg-teal-600 text-white" : "bg-slate-200"
  const textClass = highlight ? "text-white" : "text-slate-900"
  
  return (
    <tr className={bgClass}>
      <td colSpan={3} className={`px-4 py-3 text-right font-bold ${textClass}`}>{label}</td>
      <td className={`px-4 py-3 text-right font-bold ${textClass}`}>{formatNumber(area)} SF</td>
      <td className="px-4 py-3"></td>
    </tr>
  )
}

export function ProgramTable({ program, title, daysInOffice }: ProgramTableProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">{title} ({daysInOffice} days/week)</h2>
        <span className="text-teal-600 font-semibold">Total: {formatNumber(program.estimatedRentable)} RSF</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Space Type</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">SF Each</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total SF</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Ratio</th>
            </tr>
          </thead>
          <tbody>
            {/* Individual Spaces */}
            <SectionHeader label="Individual Space" section="individual" />
            {program.individual.map((item, i) => (
              <SpaceRow key={`ind-${i}`} item={item} />
            ))}
            <SubtotalRow label="Subtotal" area={program.individualSubtotal} section="individual" />
            <SubtotalRow label={`Circulation (${Math.round(program.circulationMultiplierIndividual * 100)}%)`} area={program.individualCirculation} section="individual" />
            <SubtotalRow label="Total" area={program.individualTotal} section="individual" isTotal />

            {/* Collaborative Spaces */}
            <SectionHeader label="Collaborative Space" section="collaborative" />
            {program.collaborative.map((item, i) => (
              <SpaceRow key={`coll-${i}`} item={item} />
            ))}
            <SubtotalRow label="Subtotal" area={program.collaborativeSubtotal} section="collaborative" />
            <SubtotalRow label={`Circulation (${Math.round(program.circulationMultiplierCollaborative * 100)}%)`} area={program.collaborativeCirculation} section="collaborative" />
            <SubtotalRow label="Total" area={program.collaborativeTotal} section="collaborative" isTotal />

            {/* Support Spaces */}
            <SectionHeader label="Support Space" section="support" />
            {program.support.map((item, i) => (
              <SpaceRow key={`sup-${i}`} item={item} />
            ))}
            <SubtotalRow label="Subtotal" area={program.supportSubtotal} section="support" />
            <SubtotalRow label={`Circulation (${Math.round(program.circulationMultiplierSupport * 100)}%)`} area={program.supportCirculation} section="support" />
            <SubtotalRow label="Total" area={program.supportTotal} section="support" isTotal />

            {/* Grand Totals */}
            <GrandTotalRow label="Net Assignable Total" area={program.netAssignableTotal} />
            <GrandTotalRow label="Circulation Total" area={program.circulationTotal} />
            <GrandTotalRow label="Gross Total Usable (USF)" area={program.grossUsable} highlight />
            <SubtotalRow label={`Rentable Add-On (${Math.round(program.rentableFactor * 100)}%)`} area={program.rentableAddOn} section="support" />
            <GrandTotalRow label="Estimated Total Rentable (RSF)" area={program.estimatedRentable} highlight />
          </tbody>
        </table>
      </div>
    </div>
  )
}
