"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, X, Minus, Plus, Info, Check, Users, CalendarDays, Building2, UserX, DollarSign, Percent, ArrowRight, Sparkles, HelpCircle, Compass, BarChart3, Grid3X3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  SummaryInputs,
  computeAllSeatDemandBlocks,
  computeSpaceProgram,
  SpaceItem,
} from "@/lib/fast-track-calculations"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface OnboardingInputs {
  clientName?: string
  programmedBy?: string
  totalHeadcount: number
  fullyRemote: number
  percentOffices: number
  grossRent: number
  daysInOffice: number
  rentableFactor: number
  isHybrid?: boolean
  viewMode?: "fast-track" | "canvas"
}

export interface GeneratedSpaceConfig {
  name: string
  zone: string
  quantity: number
  sfEach: number
  capacity: number
  workstationType?: "employee" | "private" | "flex" | null
}

export interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (spaces: GeneratedSpaceConfig[], inputs: OnboardingInputs, metrics: any) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Convert Fast-Track SpaceItem[] to GeneratedSpaceConfig[]
// ─────────────────────────────────────────────────────────────────────────────
function convertSpaceItemsToConfig(items: SpaceItem[]): GeneratedSpaceConfig[] {
  const getZone = (item: SpaceItem): string => {
    const name = item.name.toLowerCase()
    if (item.category === "individual") {
      return name.includes("office") ? "Focus Enclosed" : "Focus Open"
    }
    if (item.category === "collaborative") return "Collaborative"
    if (item.category === "support") {
      if (name.includes("wellness") || name.includes("mother") || name.includes("meditation")) {
        return "Wellness"
      }
      return "Support"
    }
    return "Support"
  }

  const getCapacity = (item: SpaceItem): number => {
    const name = item.name.toLowerCase()
    if (item.category === "individual") return 1
    if (name.includes("phone") || name.includes("focus booth")) return 1
    if (name.includes("huddle")) return 4
    if (name.includes("medium")) return 8
    if (name.includes("large")) return 12
    if (name.includes("training")) return 20
    if (name.includes("open collaboration")) return 6
    return 1
  }

  const getWorkstationType = (item: SpaceItem): "employee" | "private" | "flex" | null => {
    if (item.category !== "individual") return null
    const name = item.name.toLowerCase()
    if (name.includes("office")) {
      return name.includes("unassigned") || name.includes("day") ? "flex" : "private"
    }
    if (name.includes("workstation") || name.includes("hoteling") || name.includes("flex")) {
      return name.includes("resident") ? "employee" : "flex"
    }
    if (name.includes("touch") || name.includes("touchdown") || name.includes("workpoint")) return "flex"
    return null
  }

  return items
    .filter(item => item.quantity > 0)
    .map(item => ({
      name: item.name,
      zone: getZone(item),
      quantity: item.quantity,
      sfEach: item.areaSf,
      capacity: getCapacity(item),
      workstationType: getWorkstationType(item),
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  // Steps: intent -> inputs -> review -> choose-view
  const [step, setStep] = useState<"intent" | "inputs" | "review" | "choose-view">("intent")
  const [intent, setIntent] = useState<"know" | "help" | "explore" | null>(null)

  // 6 Primary Inputs
  const [inputs, setInputs] = useState<OnboardingInputs>({
    totalHeadcount: 113,
    fullyRemote: 0,
    percentOffices: 21,
    grossRent: 50,
    daysInOffice: 5,
    rentableFactor: 0.22,
  })

  const [generatedSpaces, setGeneratedSpaces] = useState<GeneratedSpaceConfig[]>([])
  const [metrics, setMetrics] = useState<any>(null)

  // Computed values
  const officeCount = Math.round((inputs.percentOffices / 100) * inputs.totalHeadcount)
  const isHybrid = inputs.daysInOffice < 5

  const handleGenerateProgram = (skipToExplorer = false) => {
    const allBlocks = computeAllSeatDemandBlocks(inputs.totalHeadcount, inputs.fullyRemote)
    const hybridProgram = computeSpaceProgram(inputs, allBlocks, inputs.daysInOffice)
    const fullOccProgram = computeSpaceProgram(inputs, allBlocks, 5)

    const allItems = [
      ...hybridProgram.individual,
      ...hybridProgram.collaborative,
      ...hybridProgram.support,
    ]

    const convertedSpaces = convertSpaceItemsToConfig(allItems)
    setGeneratedSpaces(convertedSpaces)
    setMetrics({ hybrid: hybridProgram, fullOcc: fullOccProgram })

    if (skipToExplorer) {
      // "Just Exploring" - skip directly to Fast-Track view
      onComplete(convertedSpaces, { ...inputs, isHybrid: true, viewMode: "fast-track" }, { hybrid: hybridProgram, fullOcc: fullOccProgram })
      resetState()
    } else {
      setStep("review")
    }
  }

  const handleChooseView = (viewMode: "fast-track" | "canvas") => {
    console.log("[v0] handleChooseView called with viewMode:", viewMode)
    console.log("[v0] Calling onComplete with:", { spacesCount: generatedSpaces.length, viewMode, hasMetrics: !!metrics })
    onComplete(generatedSpaces, { ...inputs, isHybrid, viewMode }, metrics)
    resetState()
  }

  const resetState = () => {
    setStep("intent")
    setIntent(null)
    setGeneratedSpaces([])
    setMetrics(null)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header with Nelson Logo */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-700 text-white px-8 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Image 
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/NELSON_whiteBlueFin-rQ50BrgfvCKoy7a4wu6aK3pMmmdMjg.png"
              alt="Nelson"
              width={120}
              height={28}
              className="h-7 w-auto"
              unoptimized
            />
            <span className="text-slate-500">|</span>
            <span className="text-slate-300 text-sm font-medium">Fast Track Program</span>
          </div>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-80px)]">
          
          {/* ════════════════════════════════════════════════���═══════════════════
              STEP 1: Intent Selection (3 paths)
          ════════════════════════════════════════════════════════════════════ */}
          {step === "intent" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Workplace Programming Calculator</h2>
                <p className="mt-1 text-slate-600">Configure your space requirements</p>
              </div>

              <p className="text-slate-700 font-medium">How would you like to start?</p>
              
              <div className="grid gap-4">
                {/* I Know My Needs */}
                <button
                  onClick={() => {
                    setIntent("know")
                    setStep("inputs")
                  }}
                  className="rounded-lg border-2 border-slate-200 p-5 text-left hover:border-teal-400 hover:bg-teal-50/50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                      <Users className="h-6 w-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">I Know My Needs</h3>
                      <p className="text-sm text-slate-600">Have headcount and space requirements</p>
                    </div>
                  </div>
                </button>

                {/* I Need Help */}
                <button
                  disabled
                  className="rounded-lg border-2 border-slate-200 p-5 text-left opacity-60 cursor-not-allowed"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <HelpCircle className="h-6 w-6 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-700">I Need Help</h3>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded">Coming Soon</span>
                    </div>
                  </div>
                </button>

                {/* Just Exploring */}
                <button
                  onClick={() => {
                    setIntent("explore")
                    handleGenerateProgram(true) // Skip to explorer with demo data
                  }}
                  className="rounded-lg border-2 border-slate-200 p-5 text-left hover:border-emerald-400 hover:bg-emerald-50/50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                      <Compass className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Just Exploring</h3>
                      <p className="text-sm text-slate-600">Skip to Fast-Track explorer with demo data</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              STEP 2: Primary Inputs with Sliders + +/- Controls
          ════════════════════════════════════════════════════════════════════ */}
          {step === "inputs" && (
            <div className="space-y-6">
              <button onClick={() => setStep("intent")} className="flex items-center gap-2 text-teal-600 hover:text-teal-700">
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>

              <div>
                <h2 className="text-2xl font-bold text-slate-900">Configure Your Program</h2>
                <p className="text-slate-600 mt-1">Adjust the primary inputs to match your organization</p>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                {/* Total Headcount */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-teal-600" />
                    <label className="text-sm font-medium text-slate-700">Total Headcount</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setInputs(p => ({ ...p, totalHeadcount: Math.max(1, p.totalHeadcount - 10) }))} className="w-8 h-8 flex items-center justify-center rounded border border-slate-300 hover:bg-slate-100"><Minus className="h-4 w-4" /></button>
                    <input type="number" value={inputs.totalHeadcount} onChange={(e) => setInputs({ ...inputs, totalHeadcount: Math.max(1, Number(e.target.value)) })} className="w-20 text-center px-2 py-1.5 border border-slate-300 rounded text-lg font-semibold" />
                    <button type="button" onClick={() => setInputs(p => ({ ...p, totalHeadcount: p.totalHeadcount + 10 }))} className="w-8 h-8 flex items-center justify-center rounded border border-slate-300 hover:bg-slate-100"><Plus className="h-4 w-4" /></button>
                  </div>
                  <Slider value={[inputs.totalHeadcount]} onValueChange={([v]) => setInputs({ ...inputs, totalHeadcount: v })} min={10} max={1000} step={1} className="w-full" />
                </div>

                {/* Days in Office */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-teal-600" />
                    <label className="text-sm font-medium text-slate-700">Days in Office / Week</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setInputs(p => ({ ...p, daysInOffice: Math.max(1, p.daysInOffice - 1) }))} className="w-8 h-8 flex items-center justify-center rounded border border-slate-300 hover:bg-slate-100"><Minus className="h-4 w-4" /></button>
                    <input type="number" value={inputs.daysInOffice} onChange={(e) => setInputs({ ...inputs, daysInOffice: Math.min(5, Math.max(1, Number(e.target.value))) })} className="w-20 text-center px-2 py-1.5 border border-slate-300 rounded text-lg font-semibold" />
                    <button type="button" onClick={() => setInputs(p => ({ ...p, daysInOffice: Math.min(5, p.daysInOffice + 1) }))} className="w-8 h-8 flex items-center justify-center rounded border border-slate-300 hover:bg-slate-100"><Plus className="h-4 w-4" /></button>
                  </div>
                  <Slider value={[inputs.daysInOffice]} onValueChange={([v]) => setInputs({ ...inputs, daysInOffice: v })} min={1} max={5} step={1} className="w-full" />
                  <p className="text-xs text-slate-500">{inputs.daysInOffice} day{inputs.daysInOffice > 1 ? 's' : ''} {inputs.daysInOffice < 5 ? '(Hybrid)' : '(Full Occupancy)'}</p>
                </div>

                {/* # Offices */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-teal-600" />
                    <label className="text-sm font-medium text-slate-700"># Offices</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setInputs(p => ({ ...p, percentOffices: Math.max(0, p.percentOffices - 5) }))} className="w-8 h-8 flex items-center justify-center rounded border border-slate-300 hover:bg-slate-100"><Minus className="h-4 w-4" /></button>
                    <input type="number" value={officeCount} onChange={(e) => setInputs({ ...inputs, percentOffices: Math.round((Number(e.target.value) / inputs.totalHeadcount) * 100) })} className="w-20 text-center px-2 py-1.5 border border-slate-300 rounded text-lg font-semibold" />
                    <button type="button" onClick={() => setInputs(p => ({ ...p, percentOffices: Math.min(100, p.percentOffices + 5) }))} className="w-8 h-8 flex items-center justify-center rounded border border-slate-300 hover:bg-slate-100"><Plus className="h-4 w-4" /></button>
                  </div>
                  <Slider value={[inputs.percentOffices]} onValueChange={([v]) => setInputs({ ...inputs, percentOffices: v })} min={0} max={100} step={1} className="w-full" />
                  <p className="text-xs text-slate-500">{inputs.percentOffices}% of headcount</p>
                </div>

                {/* # Fully Remote */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-teal-600" />
                    <label className="text-sm font-medium text-slate-700"># Fully Remote</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setInputs(p => ({ ...p, fullyRemote: Math.max(0, p.fullyRemote - 5) }))} className="w-8 h-8 flex items-center justify-center rounded border border-slate-300 hover:bg-slate-100"><Minus className="h-4 w-4" /></button>
                    <input type="number" value={inputs.fullyRemote} onChange={(e) => setInputs({ ...inputs, fullyRemote: Math.max(0, Number(e.target.value)) })} className="w-20 text-center px-2 py-1.5 border border-slate-300 rounded text-lg font-semibold" />
                    <button type="button" onClick={() => setInputs(p => ({ ...p, fullyRemote: p.fullyRemote + 5 }))} className="w-8 h-8 flex items-center justify-center rounded border border-slate-300 hover:bg-slate-100"><Plus className="h-4 w-4" /></button>
                  </div>
                  <Slider value={[inputs.fullyRemote]} onValueChange={([v]) => setInputs({ ...inputs, fullyRemote: v })} min={0} max={inputs.totalHeadcount} step={1} className="w-full" />
                  <p className="text-xs text-slate-500">{inputs.totalHeadcount > 0 ? Math.round((inputs.fullyRemote / inputs.totalHeadcount) * 100) : 0}% of headcount</p>
                </div>

                {/* Gross Rent */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                    <label className="text-sm font-medium text-slate-700">Gross Rent ($/SF/Year)</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setInputs(p => ({ ...p, grossRent: Math.max(10, p.grossRent - 5) }))} className="w-8 h-8 flex items-center justify-center rounded border border-slate-300 hover:bg-slate-100"><Minus className="h-4 w-4" /></button>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input type="number" value={inputs.grossRent} onChange={(e) => setInputs({ ...inputs, grossRent: Math.max(0, Number(e.target.value)) })} className="w-20 text-center pl-5 pr-2 py-1.5 border border-slate-300 rounded text-lg font-semibold" />
                    </div>
                    <button type="button" onClick={() => setInputs(p => ({ ...p, grossRent: p.grossRent + 5 }))} className="w-8 h-8 flex items-center justify-center rounded border border-slate-300 hover:bg-slate-100"><Plus className="h-4 w-4" /></button>
                  </div>
                  <Slider value={[inputs.grossRent]} onValueChange={([v]) => setInputs({ ...inputs, grossRent: v })} min={10} max={200} step={1} className="w-full" />
                </div>

                {/* Rentable Add-On Factor */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-teal-600" />
                    <label className="text-sm font-medium text-slate-700">Rentable Add-On Factor</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setInputs(p => ({ ...p, rentableFactor: Math.max(0.05, p.rentableFactor - 0.01) }))} className="w-8 h-8 flex items-center justify-center rounded border border-slate-300 hover:bg-slate-100"><Minus className="h-4 w-4" /></button>
                    <input type="text" value={`${Math.round(inputs.rentableFactor * 100)}%`} onChange={(e) => setInputs({ ...inputs, rentableFactor: Math.max(0, Math.min(0.5, Number(e.target.value.replace('%', '')) / 100)) })} className="w-20 text-center px-2 py-1.5 border border-slate-300 rounded text-lg font-semibold" />
                    <button type="button" onClick={() => setInputs(p => ({ ...p, rentableFactor: Math.min(0.5, p.rentableFactor + 0.01) }))} className="w-8 h-8 flex items-center justify-center rounded border border-slate-300 hover:bg-slate-100"><Plus className="h-4 w-4" /></button>
                  </div>
                  <Slider value={[inputs.rentableFactor * 100]} onValueChange={([v]) => setInputs({ ...inputs, rentableFactor: v / 100 })} min={5} max={50} step={1} className="w-full" />
                </div>
              </div>

              {/* Preview Summary */}
              <div className="rounded-lg bg-slate-100 p-4 border border-slate-200">
                <p className="text-sm font-medium text-slate-500 mb-3">Preview Summary</p>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{inputs.totalHeadcount}</p>
                    <p className="text-xs text-slate-500">Headcount</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{inputs.daysInOffice}</p>
                    <p className="text-xs text-slate-500">Days/Week</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{officeCount}</p>
                    <p className="text-xs text-slate-500">Offices</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-teal-600">{isHybrid ? 'Hybrid' : 'Full'}</p>
                    <p className="text-xs text-slate-500">Work Model</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" onClick={() => setStep("intent")} variant="outline">Cancel</Button>
                <Button type="button" onClick={() => handleGenerateProgram(false)} className="ml-auto bg-teal-600 hover:bg-teal-700">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate My Program
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════════�����════════════════════════════════════════════════
              STEP 3: Review Generated Program
          ════════════════════════════════════════════════════════════════════ */}
          {step === "review" && metrics && (
            <div className="space-y-6">
              <button type="button" onClick={() => setStep("inputs")} className="flex items-center gap-2 text-teal-600 hover:text-teal-700">
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Your Program is Ready</h2>
                  <p className="text-sm text-slate-600">{generatedSpaces.length} space types configured for {inputs.totalHeadcount} people</p>
                </div>
              </div>

              {/* Metrics Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <p className="text-xs font-medium text-slate-500 uppercase">Total Seats</p>
                  <p className="text-2xl font-bold text-slate-900">{metrics.hybrid?.totalSeatDemand || 0}</p>
                </div>
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200 text-center">
                  <p className="text-xs font-medium text-teal-600 uppercase">Hybrid RSF</p>
                  <p className="text-2xl font-bold text-teal-700">
                    {typeof metrics.hybrid?.estimatedRentable === 'number' 
                      ? metrics.hybrid.estimatedRentable.toLocaleString() 
                      : '—'}
                  </p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                  <p className="text-xs font-medium text-emerald-600 uppercase">RSF Savings</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {typeof metrics.fullOcc?.estimatedRentable === 'number' && 
                     typeof metrics.hybrid?.estimatedRentable === 'number'
                      ? (metrics.fullOcc.estimatedRentable - metrics.hybrid.estimatedRentable).toLocaleString()
                      : '0'}
                  </p>
                </div>
              </div>

              {/* Choose View Mode */}
              <div className="space-y-3 pt-4">
                <p className="text-sm font-medium text-slate-700">How would you like to explore your program?</p>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Fast-Track Explorer */}
                  <button
                    type="button"
                    onClick={() => handleChooseView("fast-track")}
                    className="p-5 rounded-lg border-2 border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 transition-all text-left group"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                        <BarChart3 className="h-5 w-5 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">Fast-Track Explorer</h3>
                        <p className="text-xs text-slate-600 mt-1">Treemap, seat demand, savings analysis</p>
                      </div>
                    </div>
                  </button>

                  {/* Advanced Canvas */}
                  <button
                    type="button"
                    onClick={() => handleChooseView("canvas")}
                    className="p-5 rounded-lg border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left group"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Grid3X3 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">Advanced Canvas</h3>
                        <p className="text-xs text-slate-600 mt-1">Departments, workspace types, granular config</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
