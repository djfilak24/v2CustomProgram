"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import {
  RefreshCw,
  Grid3X3,
  BarChart3,
  GitCompare,
  Users,
  FileDown,
  FileSpreadsheet,
  Settings,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NumericSliderInput } from "@/components/numeric-slider-input"
import { DashboardSummary } from "@/components/dashboard-summary"
import { ProgramTable } from "@/components/program-table"
import { ComparisonView } from "@/components/comparison-view"
import { SeatDemandView } from "@/components/seat-demand-view"
import {
  SummaryInputs,
  SpaceProgram,
  SurveyBlock,
  computeAllSeatDemandBlocks,
  computeSpaceProgram,
  computeDashboard,
} from "@/lib/fast-track-calculations"

interface FastTrackInputs extends SummaryInputs {
  clientName: string
  programmedBy: string
}

interface FastTrackExplorerProps {
  inputs: FastTrackInputs
  metrics: {
    hybrid: SpaceProgram
    fullOcc: SpaceProgram
  }
  onRecalibrate?: (inputs: FastTrackInputs) => void
  onSwitchToAdvanced: (inputs: SummaryInputs, hybridProgram: SpaceProgram) => void
}

type TabId = "dashboard" | "hybrid" | "fullOcc" | "comparison" | "seatDemand"

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: Grid3X3 },
  { id: "hybrid", label: "Hybrid Program", icon: BarChart3 },
  { id: "fullOcc", label: "Full Occupancy", icon: BarChart3 },
  { id: "comparison", label: "Comparison", icon: GitCompare },
  { id: "seatDemand", label: "Seat Demand", icon: Users },
]

export function FastTrackExplorer({ inputs: initialInputs, metrics: initialMetrics, onSwitchToAdvanced }: FastTrackExplorerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard")
  // Capture → reveal → drill: the full tab set stays hidden until asked for.
  const [revealed, setRevealed] = useState(false)
  const [inputs, setInputs] = useState<SummaryInputs>(initialInputs)
  const [showInputPanel, setShowInputPanel] = useState(false)
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false)

  // Recompute metrics when inputs change
  const { metrics, dashboard, seatDemandBlocks } = useMemo(() => {
    const blocks = computeAllSeatDemandBlocks(inputs.totalHeadcount, inputs.fullyRemote)
    const hybridProgram = computeSpaceProgram(inputs, blocks)
    const fullOccProgram = computeSpaceProgram(inputs, blocks, 5)
    const dashboardMetrics = computeDashboard(inputs, hybridProgram, fullOccProgram)
    return {
      metrics: { hybrid: hybridProgram, fullOcc: fullOccProgram },
      dashboard: dashboardMetrics,
      seatDemandBlocks: blocks as SurveyBlock[],
    }
  }, [inputs])

  // Format day label for display
  const daysLabel = inputs.daysInOffice === 1 ? "1 day" : `${inputs.daysInOffice} days`
  const officeCount = Math.round(inputs.totalHeadcount * inputs.percentOffices / 100)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - matches canvas style */}
      <header className="bg-white/80 backdrop-blur border-b border-slate-200/70 px-6 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/nelson-logo.png"
              alt="Nelson"
              width={120}
              height={40}
              className="h-8 w-auto"
            />
            <span className="hidden sm:inline-block h-5 w-px bg-slate-200" aria-hidden="true" />
            <span className="hidden sm:inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
              Fast Track Program
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSwitchConfirm(true)}
              className="text-teal-600 hover:text-teal-700 border-teal-200 hover:border-teal-300 hover:bg-teal-50"
            >
              <Settings className="h-4 w-4 mr-2" />
              Customize Program
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">PDF</span>
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Excel</span>
            </Button>
            <div className="flex items-center gap-2 pl-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white shadow-sm">
                D
              </div>
              <span className="text-sm font-medium text-slate-700">David</span>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Controls Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 sticky top-[57px] z-20">
        <div className="flex items-center justify-between gap-4">
          {/* Quick Stats */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Headcount</span>
              <span className="font-bold text-slate-900">{inputs.totalHeadcount}</span>
            </div>
            <div className="w-px h-4 bg-slate-300" />
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Days in Office</span>
              <span className="font-bold text-slate-900">{daysLabel}</span>
            </div>
            <div className="w-px h-4 bg-slate-300" />
            <div className="flex items-center gap-2">
              <span className="text-slate-500"># Offices</span>
              <span className="font-bold text-slate-900">{officeCount} <span className="text-slate-400 font-normal">({inputs.percentOffices}%)</span></span>
            </div>
            <div className="w-px h-4 bg-slate-300" />
            <div className="flex items-center gap-2">
              <span className="text-slate-500"># Remote</span>
              <span className="font-bold text-slate-900">{inputs.fullyRemote}</span>
            </div>
            <div className="w-px h-4 bg-slate-300" />
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Rent</span>
              <span className="font-bold text-slate-900">${inputs.grossRent}/SF</span>
            </div>
            <div className="w-px h-4 bg-slate-300" />
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Factor</span>
              <span className="font-bold text-slate-900">{Math.round(inputs.rentableFactor * 100)}%</span>
            </div>
          </div>

          {/* Toggle Input Panel */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowInputPanel(!showInputPanel)}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Adjust Inputs
            {showInputPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Expandable Input Panel with Sliders */}
      {showInputPanel && (
        <div className="bg-white border-b border-slate-200 px-6 py-5 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            <NumericSliderInput
              label="Total Headcount"
              value={inputs.totalHeadcount}
              min={10}
              max={2000}
              step={1}
              onChange={(v) =>
                setInputs((prev) => ({
                  ...prev,
                  totalHeadcount: v,
                  fullyRemote: Math.min(prev.fullyRemote, v),
                }))
              }
            />

            <NumericSliderInput
              label="Days in Office / Week"
              value={inputs.daysInOffice}
              min={1}
              max={5}
              step={1}
              suffix={inputs.daysInOffice === 1 ? "day" : "days"}
              showTicks
              onChange={(v) => setInputs((prev) => ({ ...prev, daysInOffice: v }))}
            />

            <NumericSliderInput
              label="% Offices"
              value={inputs.percentOffices}
              displayValue={inputs.percentOffices}
              min={0}
              max={100}
              step={1}
              suffix="%"
              helperText={`${officeCount.toLocaleString()} offices`}
              onChange={(v) => setInputs((prev) => ({ ...prev, percentOffices: v }))}
            />

            <NumericSliderInput
              label="# Fully Remote"
              value={inputs.fullyRemote}
              min={0}
              max={Math.max(inputs.totalHeadcount, 1)}
              step={1}
              helperText={`${
                inputs.totalHeadcount > 0
                  ? Math.round((inputs.fullyRemote / inputs.totalHeadcount) * 100)
                  : 0
              }% of headcount`}
              onChange={(v) => setInputs((prev) => ({ ...prev, fullyRemote: v }))}
            />

            <NumericSliderInput
              label="Gross Rent / SF / Year"
              value={inputs.grossRent}
              min={20}
              max={200}
              step={1}
              prefix="$"
              onChange={(v) => setInputs((prev) => ({ ...prev, grossRent: v }))}
            />

            <NumericSliderInput
              label="Rentable Add-On Factor"
              value={Math.round(inputs.rentableFactor * 100)}
              min={5}
              max={40}
              step={1}
              suffix="%"
              onChange={(v) =>
                setInputs((prev) => ({ ...prev, rentableFactor: v / 100 }))
              }
            />
          </div>
        </div>
      )}

      {/* Tab Navigation — held back until the breakdown is intentionally requested.
          The reveal arc: land on the dashboard (the payoff), drill only on ask. */}
      {revealed ? (
        <div className="border-b border-slate-200 bg-white px-6">
          <div className="flex items-center">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === id
                    ? "border-teal-600 text-teal-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="border-b border-slate-200 bg-white px-6 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-500">
              Your program at a glance — the numbers behind it are ready when you are.
            </span>
            <Button
              size="sm"
              onClick={() => { setRevealed(true); setActiveTab("hybrid") }}
              className="bg-teal-600 text-white hover:bg-teal-700"
            >
              See the full breakdown <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex">
        <div className="flex-1 p-6">
          {activeTab === "dashboard" && (
            <DashboardSummary metrics={dashboard} inputs={inputs} hybridProgram={metrics.hybrid} />
          )}

          {activeTab === "hybrid" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Hybrid Program ({daysLabel}/week)</h2>
                  <p className="text-sm text-slate-500 mt-1">Total: {metrics.hybrid.estimatedRentable.toLocaleString()} RSF</p>
                </div>
              </div>
              <ProgramTable program={metrics.hybrid} title={`Hybrid Program (${inputs.daysInOffice} days/week)`} daysInOffice={inputs.daysInOffice} />
            </div>
          )}

          {activeTab === "fullOcc" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Full Occupancy (5 days/week)</h2>
                  <p className="text-sm text-slate-500 mt-1">Total: {metrics.fullOcc.estimatedRentable.toLocaleString()} RSF</p>
                </div>
              </div>
              <ProgramTable program={metrics.fullOcc} title="Full Occupancy (5 days/week)" daysInOffice={5} />
            </div>
          )}

          {activeTab === "comparison" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Program Comparison</h2>
              <ComparisonView fullOcc={metrics.fullOcc} hybrid={metrics.hybrid} daysInOffice={inputs.daysInOffice} />
            </div>
          )}

          {activeTab === "seatDemand" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Seat Demand Model</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Survey-driven attendance scenarios for 1—5 days/week
                </p>
              </div>
              <SeatDemandView
                blocks={seatDemandBlocks}
                activeBlockIndex={inputs.daysInOffice - 1}
              />
            </div>
          )}
        </div>
      </div>

      {/* Switch to Advanced Canvas Confirmation Dialog */}
      <Dialog open={showSwitchConfirm} onOpenChange={setShowSwitchConfirm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-teal-600" />
              Customize Program
            </DialogTitle>
            <DialogDescription>
              Your Explore configuration will become the starting point for your bespoke program.
              Sliders will lock — use the Recalibrate button to update quantities from there.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Configuration to transfer
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <ConfigRow label="Total Headcount" value={inputs.totalHeadcount.toLocaleString()} />
              <ConfigRow label="Days in Office / Week" value={`${inputs.daysInOffice} days`} />
              <ConfigRow label="% Offices" value={`${inputs.percentOffices}%`} />
              <ConfigRow label="Fully Remote" value={inputs.fullyRemote.toLocaleString()} />
              <ConfigRow label="Gross Rent" value={`$${inputs.grossRent}/SF/yr`} />
              <ConfigRow label="Rentable Factor" value={`${inputs.rentableFactor}%`} />
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-teal-600" />
              <div>
                Space quantities are generated from these inputs. Ratios stay active as
                industry-standard recommendations you can reference while customizing.
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowSwitchConfirm(false)}>
              Cancel
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => {
                setShowSwitchConfirm(false)
                onSwitchToAdvanced(inputs, metrics.hybrid)
              }}
            >
              Confirm & Switch
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </div>
  )
}
