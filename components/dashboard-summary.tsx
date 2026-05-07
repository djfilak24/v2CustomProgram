"use client"

import { useState, useEffect } from "react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import type { DashboardMetrics, SummaryInputs, SpaceProgram } from "@/lib/fast-track-calculations"
import { TreemapChart } from "@/components/treemap-view"
import {
  ArrowDownRight,
  TrendingDown,
  Building,
  Monitor,
  LayoutGrid,
  Armchair,
  BarChart3,
  Grid3X3,
  Info,
} from "lucide-react"
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function formatNumber(num: number): string {
  if (!isFinite(num)) return "0"
  return Math.round(num).toLocaleString()
}

function formatCurrency(num: number): string {
  if (!isFinite(num)) return "$0"
  return `$${Math.round(num).toLocaleString()}`
}

function formatSf(num: number): string {
  if (!isFinite(num)) return "0 SF"
  return `${Math.round(num).toLocaleString()} SF`
}

function formatCompactCurrency(n: number): string {
  if (!isFinite(n) || n === 0) return "$0"
  const abs = Math.abs(n)
  const sign = n < 0 ? "-" : ""
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`
  return `${sign}$${Math.round(abs)}`
}

function InfoIconTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <UITooltip>
        <TooltipTrigger asChild>
          <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help shrink-0" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-sm">{text}</TooltipContent>
      </UITooltip>
    </TooltipProvider>
  )
}

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [breakpoint])
  return isMobile
}

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const CHART_COLORS = [
  "hsl(160, 60%, 45%)", // Individual - emerald
  "hsl(175, 55%, 42%)", // Collaborative - teal
  "hsl(260, 50%, 55%)", // Support - violet
  "hsl(189, 100%, 43%)", // Rentable add-on - cyan
]

const STAT_TOOLTIPS: Record<string, string> = {
  "Total Seats":
    "Resident Offices + Unassigned Offices + Resident Workstations + Unassigned Workstations",
  "Total Workpoints":
    "Total Seats + Touch Down Spots + Phone Rooms + Huddle Rooms + Open Collaboration Spaces",
  "Annual Rent Savings":
    "Gross Rent ($/SF/Year) × Rentable Area savings (Full Occupancy RSF − Hybrid RSF)",
}

const RENT_TERMS: number[] = [1, 2, 3, 5, 7, 10]

interface DashboardSummaryProps {
  metrics: DashboardMetrics
  inputs: SummaryInputs
  hybridProgram: SpaceProgram
  fullOccProgram?: SpaceProgram
}

// ----------------------------------------------------------------------------
// StatCard - reusable card with label, big number, sub text
// ----------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  subValue,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  sub?: string
  subValue?: string
  icon?: React.ElementType
  accent?: boolean
}) {
  const tooltip = STAT_TOOLTIPS[label]
  return (
    <div
      className={`rounded-xl border overflow-hidden h-full flex flex-col ${
        accent
          ? "bg-emerald-50 border-emerald-200"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="p-4 flex flex-col gap-1 flex-1 justify-center">
        <div className="flex items-center gap-2">
          {Icon && (
            <Icon
              className={`w-4 h-4 shrink-0 ${
                accent ? "text-emerald-600" : "text-teal-600"
              }`}
            />
          )}
          <span
            className={`font-medium tracking-wide text-[11px] uppercase ${
              accent ? "text-emerald-700/80" : "text-slate-500"
            }`}
          >
            {label}
          </span>
          {tooltip && <InfoIconTooltip text={tooltip} />}
        </div>
        <span
          className={`font-bold tabular-nums text-[26px] sm:text-[30px] leading-tight mt-1 ${
            accent ? "text-emerald-700" : "text-slate-900"
          }`}
        >
          {value}
        </span>
        {sub && (
          <span
            className={`italic text-[12px] ${
              accent ? "text-emerald-600/70" : "text-slate-500"
            }`}
          >
            {sub}
          </span>
        )}
        {subValue && (
          <span className="text-[11px] tabular-nums text-slate-400 mt-0.5 flex items-center gap-1">
            <Armchair className="w-3 h-3" />
            {subValue}
          </span>
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// AreaSavingsRow - Full Occ / Hybrid / Savings comparison
// ----------------------------------------------------------------------------

function AreaSavingsRow({
  label,
  fullOcc,
  hybrid,
  savings,
  unit,
  large,
}: {
  label: string
  fullOcc: number
  hybrid: number
  savings: number
  unit: string
  large?: boolean
}) {
  const savingsPercent = fullOcc > 0 ? Math.round((savings / fullOcc) * 100) : 0
  const fontSize = large ? "text-[18px] sm:text-[22px]" : "text-[14px] sm:text-[16px]"
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <TrendingDown
          className={`shrink-0 text-teal-600 ${large ? "w-4 h-4" : "w-3.5 h-3.5"}`}
        />
        <span
          className={`font-medium tracking-wide text-slate-500 uppercase ${
            large ? "text-[12px]" : "text-[11px]"
          }`}
        >
          {label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <span className="text-[10px] italic text-slate-500 block">Full Occupancy</span>
          <span className={`font-bold tabular-nums ${fontSize} leading-tight text-slate-900`}>
            {formatNumber(fullOcc)} {unit}
          </span>
        </div>
        <div>
          <span className="text-[10px] italic text-slate-500 block">Hybrid</span>
          <span className={`font-bold tabular-nums ${fontSize} leading-tight text-teal-700`}>
            {formatNumber(hybrid)} {unit}
          </span>
        </div>
        <div>
          <span className="text-[10px] italic text-slate-500 block">Savings</span>
          <div className="flex items-center gap-1">
            {savings > 0 && <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
            <span className="text-xs sm:text-sm font-bold tabular-nums text-emerald-500">
              {formatNumber(savings)} {unit}
            </span>
          </div>
          {savingsPercent > 0 && (
            <div className="mt-1">
              <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(savingsPercent, 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-semibold text-emerald-500 mt-0.5 block">
                {savingsPercent}% reduction
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// CombinedAreaCard - RSF + USF + Efficiency stacked (matches Fast Track repo)
// ----------------------------------------------------------------------------

function CombinedAreaCard({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 h-full">
      <AreaSavingsRow
        label="Rentable Area (RSF)"
        fullOcc={metrics.fullOccRentableArea}
        hybrid={metrics.hybridRentableArea}
        savings={metrics.rsfSavings}
        unit="SF"
        large
      />
      <div className="border-t border-slate-200" />
      <AreaSavingsRow
        label="Usable Area (USF)"
        fullOcc={metrics.fullOccUsableArea}
        hybrid={metrics.hybridUsableArea}
        savings={metrics.usfSavings}
        unit="SF"
      />
      <div className="border-t border-slate-200" />
      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <div>
          <span className="italic text-slate-500 block mb-1 text-[10px] uppercase tracking-wide">
            Efficiency — Full Occupancy
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-slate-500">Per Workplace</span>
            <span className="font-semibold tabular-nums text-[12px] text-slate-900">
              {formatNumber(metrics.rentableAreaPerWorkplace)} RSF
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-slate-500">Per Person</span>
            <span className="font-semibold tabular-nums text-[12px] text-slate-900">
              {formatNumber(metrics.rentableAreaPerPerson)} RSF
            </span>
          </div>
        </div>
        <div>
          <span className="italic text-slate-500 block mb-1 text-[10px] uppercase tracking-wide">
            Efficiency — Hybrid
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-slate-500">Per Workplace</span>
            <span className="font-semibold tabular-nums text-[12px] text-slate-900">
              {formatNumber(metrics.usableAreaPerWorkplace)} USF
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-slate-500">Per Person</span>
            <span className="font-semibold tabular-nums text-[12px] text-slate-900">
              {formatNumber(metrics.usableAreaPerPerson)} USF
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// RentProjectionCard - rent projection with year tabs + savings highlight
// ----------------------------------------------------------------------------

function RentProjectionCard({
  metrics,
  inputs,
}: {
  metrics: DashboardMetrics
  inputs: SummaryInputs
}) {
  const [term, setTerm] = useState<number>(3)

  const annualFullOccRent = inputs.grossRent * metrics.fullOccRentableArea
  const annualHybridRent = inputs.grossRent * metrics.hybridRentableArea
  const annualSavings = metrics.annualRentSavings

  const totalFullOccRent = annualFullOccRent * term
  const totalHybridRent = annualHybridRent * term
  const totalSavings = annualSavings * term

  const hasSavings = annualSavings > 0

  return (
    <div
      className={`rounded-xl border overflow-hidden h-full ${
        hasSavings ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"
      }`}
    >
      <div className="p-4 flex flex-col gap-3 h-full">
        <div className="flex items-center gap-2">
          <Building
            className={`w-4 h-4 shrink-0 ${
              hasSavings ? "text-emerald-600" : "text-teal-600"
            }`}
          />
          <span
            className={`font-medium tracking-wide text-[11px] uppercase ${
              hasSavings ? "text-emerald-700/80" : "text-slate-500"
            }`}
          >
            Rent Projection
          </span>
          <InfoIconTooltip text="Projected gross rent over the selected term. Full Occupancy = rent if everyone came in 5 days/week. Hybrid = rent for the planned days/week. Savings = the difference." />
        </div>

        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Lease term">
          {RENT_TERMS.map((y) => {
            const active = term === y
            return (
              <button
                key={y}
                type="button"
                onClick={() => setTerm(y)}
                className={`flex-1 min-w-[34px] px-1.5 py-1 rounded-md text-[11px] font-semibold tabular-nums transition-colors border ${
                  active
                    ? hasSavings
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-700"
                      : "bg-teal-500/15 border-teal-500/40 text-teal-700"
                    : "bg-transparent border-slate-200 text-slate-500 hover:text-slate-700"
                }`}
              >
                {y}yr
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <span className="block text-[10px] italic text-slate-500 leading-tight">
              Full Occ. Rent
            </span>
            <span className="block font-bold tabular-nums text-[16px] sm:text-[18px] leading-tight mt-1 break-words text-slate-900">
              {formatCompactCurrency(totalFullOccRent)}
            </span>
            <span className="block text-[10px] tabular-nums text-slate-400 mt-0.5">
              {formatCompactCurrency(annualFullOccRent)}/yr
            </span>
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] italic text-slate-500 leading-tight">
              Hybrid Rent
            </span>
            <span className="block font-bold tabular-nums text-[16px] sm:text-[18px] leading-tight mt-1 break-words text-slate-900">
              {formatCompactCurrency(totalHybridRent)}
            </span>
            <span className="block text-[10px] tabular-nums text-slate-400 mt-0.5">
              {formatCompactCurrency(annualHybridRent)}/yr
            </span>
          </div>
        </div>

        <div
          className={`rounded-lg px-3 py-2.5 ${
            hasSavings ? "bg-emerald-100/60" : "bg-slate-100"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[12px] font-medium tracking-wide ${
                hasSavings ? "text-emerald-700/90" : "text-slate-500"
              }`}
            >
              Total Savings
            </span>
            <span
              className={`text-[10px] tabular-nums ${
                hasSavings ? "text-emerald-600/80" : "text-slate-400"
              }`}
            >
              {formatCompactCurrency(annualSavings)}/yr
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {hasSavings && <ArrowDownRight className="w-5 h-5 text-emerald-500 shrink-0" />}
            <span
              className={`font-bold tabular-nums text-[22px] sm:text-[26px] leading-tight ${
                hasSavings ? "text-emerald-600" : "text-slate-900"
              }`}
            >
              {formatCompactCurrency(totalSavings)}
            </span>
          </div>
        </div>

        <div
          className={`mt-auto pt-2 border-t text-[10px] leading-snug ${
            hasSavings
              ? "border-emerald-200 text-emerald-700/70"
              : "border-slate-200 text-slate-500"
          }`}
        >
          <div className="tabular-nums">
            {formatCurrency(annualSavings)}/yr × {term} {term === 1 ? "year" : "years"} at{" "}
            {formatCurrency(inputs.grossRent)}/RSF
          </div>
          <div className="italic mt-0.5">
            Based on {inputs.daysInOffice} {inputs.daysInOffice === 1 ? "day" : "days"}/week in office
          </div>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Custom tooltip for charts
// ----------------------------------------------------------------------------

const ChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]
    const name = data.name || data.payload?.name
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm shadow-lg">
        <p className="font-semibold text-slate-900">{name}</p>
        <p className="tabular-nums text-slate-500 italic text-xs">{formatSf(data.value)}</p>
      </div>
    )
  }
  return null
}

// ----------------------------------------------------------------------------
// Main DashboardSummary
// ----------------------------------------------------------------------------

export function DashboardSummary({ metrics, inputs, hybridProgram }: DashboardSummaryProps) {
  const [chartView, setChartView] = useState<"treemap" | "bar">("treemap")
  const isMobile = useIsMobile()

  const barData = [
    { name: "Individual", value: hybridProgram.individualTotal, fill: CHART_COLORS[0] },
    { name: "Collaborative", value: hybridProgram.collaborativeTotal, fill: CHART_COLORS[1] },
    { name: "Support", value: hybridProgram.supportTotal, fill: CHART_COLORS[2] },
    {
      name: "Rentable Add-On",
      value: Math.max(0, (hybridProgram.estimatedRentable || 0) - (hybridProgram.grossUsable || 0)),
      fill: CHART_COLORS[3],
    },
  ]

  const pieData =
    metrics.pieChartData && metrics.pieChartData.length > 0
      ? metrics.pieChartData
      : barData.map((b) => ({ name: b.name, value: b.value }))

  return (
    <div className="flex flex-col gap-3">
      {/* Top row: 3-column bento layout matching Fast Track repo */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(200px,1fr)_minmax(360px,3fr)_minmax(240px,1fr)] gap-3 lg:items-stretch">
        {/* Left: Stacked Total Seats + Total Workpoints */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
          <StatCard
            label="Total Seats"
            value={formatNumber(metrics.totalSeatCount)}
            sub={`${metrics.offices} offices, ${metrics.workstations} workstations`}
            subValue={`${formatNumber(metrics.conferenceSeats)} conf. seats`}
            icon={Monitor}
          />
          <StatCard
            label="Total Workpoints"
            value={formatNumber(metrics.totalWorkpoints)}
            sub={`Including ${metrics.touchDownSpaces} touchdown spots`}
            icon={LayoutGrid}
          />
        </div>

        {/* Middle: Combined Area Card (RSF + USF + Efficiency) */}
        <CombinedAreaCard metrics={metrics} />

        {/* Right: Rent Projection (full height) */}
        <RentProjectionCard metrics={metrics} inputs={inputs} />
      </div>

      {/* Bottom row: Hybrid Space Allocation + Space Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
        {/* Hybrid Space Allocation - treemap or bar chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3 sm:mb-4">
            <h3 className="text-sm font-bold tracking-wide text-slate-900">
              Hybrid Space Allocation
            </h3>
            <div className="flex items-center gap-1 bg-slate-100 rounded-md p-1">
              <button
                onClick={() => setChartView("treemap")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  chartView === "treemap"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                aria-pressed={chartView === "treemap"}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>Treemap</span>
              </button>
              <button
                onClick={() => setChartView("bar")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  chartView === "bar"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                aria-pressed={chartView === "bar"}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Bar Chart</span>
              </button>
            </div>
          </div>

          {chartView === "treemap" ? (
            <TreemapChart program={hybridProgram} />
          ) : (
            <div className="h-[280px] sm:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(20, 184, 166, 0.05)" }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Space Breakdown - donut chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col min-h-[320px]">
          <h3 className="text-sm font-bold tracking-wide mb-3 text-slate-900">Space Breakdown</h3>
          <div className="flex flex-col gap-1.5 mb-3">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <span className="text-xs text-slate-700">{entry.name}</span>
                <span className="text-[10px] text-slate-500 tabular-nums ml-auto">
                  {formatSf(entry.value)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 40 : 55}
                  outerRadius={isMobile ? 65 : 90}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
