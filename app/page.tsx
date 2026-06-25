"use client"

import type React from "react"

  import { useState, useMemo, useEffect, useRef } from "react"
  import {
  Building2,
  Info,
  Users,
  ChevronDown,
  ChevronUp,
  Plus,
  Settings,
  TrendingUp,
  Building,
  Home,
  RefreshCw,
  Table2,
  LayoutGrid,
  Check,
  Save,
  Copy,
  Trash2,
  Pencil,
  GitCompare,
  Layers,
  BarChart3,
  PanelRightOpen,
  PanelRightClose,
  Eye,
  Presentation,
  Wrench,
  Focus,
} from "lucide-react"
import Image from "next/image"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"

import { computeKpis } from "@/utils/kpi"

import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button" // Import Button component
import { X, AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { BriefingView } from "@/components/briefing-view"
  import { OnboardingModal, type GeneratedSpaceConfig, type OnboardingInputs } from "@/components/onboarding-modal"
  import { FastTrackExplorer } from "@/components/fast-track-explorer"
  import { convertProgramToSpaces } from "@/lib/convert-program-to-spaces"
  import {
    computeSpaceProgram,
    computeAllSeatDemandBlocks,
  } from "@/lib/fast-track-calculations"
  import type { SummaryInputs, RatioConfig } from "@/lib/fast-track-calculations"

const DragDropContext = ({ children }: { children: React.ReactNode; [key: string]: any }) => <>{children}</>
const Droppable = ({ children }: { children: (provided: any) => React.ReactNode; [key: string]: any }) => (
  <>
    {children({
      droppableProps: {},
      innerRef: undefined,
      placeholder: null,
    })}
  </>
)
const Draggable = ({ children }: { children: (provided: any) => React.ReactNode; [key: string]: any }) => (
  <>
    {children({
      draggableProps: {},
      dragHandleProps: {},
      innerRef: undefined,
    })}
  </>
)

// -----------------------------------------------------------------------------
// NumberField: module-scope stable component for number input.
// - Uses a local string "draft" so users can freely type multi-digit numbers
//   without controlled-input cursor/clamping issues.
// - Commits to the parent on every valid change and on blur (with clamping).
// - Stable identity (defined at module scope) so parent re-renders don't
//   unmount the input and steal focus mid-typing.
// -----------------------------------------------------------------------------
function NumberField({
  value,
  onChange,
  min = 0,
  max,
  className,
  ariaLabel,
}: {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  className?: string
  ariaLabel?: string
}) {
  const [draft, setDraft] = useState<string>(String(value))
  const focusedRef = useRef(false)

  // Sync from parent only when not focused (don't clobber user typing).
  useEffect(() => {
    if (!focusedRef.current) setDraft(String(value))
  }, [value])

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={draft}
      aria-label={ariaLabel}
      onFocus={(e) => {
        focusedRef.current = true
        e.currentTarget.select()
      }}
      onBlur={() => {
        focusedRef.current = false
        const parsed = draft === "" ? min : parseInt(draft, 10)
        const safe = Number.isFinite(parsed) ? parsed : min
        const clamped = Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, safe))
        setDraft(String(clamped))
        if (clamped !== value) onChange(clamped)
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, "")
        setDraft(raw)
        if (raw === "") return
        const n = parseInt(raw, 10)
        if (!Number.isFinite(n)) return
        const clamped = Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, n))
        if (clamped !== value) onChange(clamped)
      }}
      className={className}
    />
  )
}

// -----------------------------------------------------------------------------
// TargetTile: module-scope stable component for Configuration Targets.
// Defining outside the parent's render tree is critical so that the input's
// focus is not destroyed on every parent re-render.
// -----------------------------------------------------------------------------
type TargetAccent = "blue" | "slate" | "emerald" | "amber"
const TARGET_ACCENT_MAP: Record<TargetAccent, { border: string; bg: string; text: string; btn: string }> = {
  blue: {
    border: "border-blue-200",
    bg: "from-blue-50 to-blue-100",
    text: "text-blue-900",
    btn: "bg-white/80 hover:bg-white text-blue-800 border border-blue-200",
  },
  slate: {
    border: "border-slate-200",
    bg: "from-slate-50 to-slate-100",
    text: "text-slate-900",
    btn: "bg-white/80 hover:bg-white text-slate-800 border border-slate-200",
  },
  emerald: {
    border: "border-emerald-200",
    bg: "from-emerald-50 to-emerald-100",
    text: "text-emerald-900",
    btn: "bg-white/80 hover:bg-white text-emerald-800 border border-emerald-200",
  },
  amber: {
    border: "border-amber-200",
    bg: "from-amber-50 to-amber-100",
    text: "text-amber-900",
    btn: "bg-white/80 hover:bg-white text-amber-800 border border-amber-200",
  },
}

function TargetTile({
  label,
  value,
  onChange,
  allocated,
  configured,
  configuredLabel,
  accent,
  icon,
  // Growth mode props (optional)
  growthMode = false,
  futureValue,
  futureAllocated,
  // Visibility control
  showAllocations = true,
}: {
  label: string
  value: number
  onChange: (next: number) => void
  allocated: number
  configured?: number
  configuredLabel?: string
  accent: TargetAccent
  icon: React.ReactNode
  // When growthMode is true, displays Current → Future with a delta chip.
  growthMode?: boolean
  futureValue?: number
  futureAllocated?: number
  showAllocations?: boolean
}) {
  const styles = TARGET_ACCENT_MAP[accent]
  // In growth mode, status compares against futureValue; otherwise current.
  const effectiveTarget = growthMode && futureValue !== undefined ? futureValue : value
  const compareTo = configured ?? (growthMode && futureAllocated !== undefined ? futureAllocated : allocated)
  const delta = compareTo - effectiveTarget
  const status =
    effectiveTarget === 0
      ? { dot: "bg-slate-300", label: "—", color: "text-slate-500" }
      : delta === 0
        ? { dot: "bg-emerald-500", label: "On track", color: "text-emerald-700" }
        : delta > 0
          ? { dot: "bg-amber-500", label: `+${delta} over`, color: "text-amber-700" }
          : { dot: "bg-slate-400", label: `${Math.abs(delta)} to go`, color: "text-slate-600" }
  const allocLeft = Math.max(0, value - allocated)

  // Growth delta (future - current)
  const growthDelta =
    growthMode && futureValue !== undefined ? futureValue - value : 0

  return (
    <div className={`rounded-xl border ${styles.border} bg-gradient-to-br ${styles.bg} p-4 flex flex-col`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className={`text-[10px] font-semibold uppercase tracking-widest ${styles.text}`}>{label}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
          <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
        </div>
      </div>

      {growthMode && futureValue !== undefined ? (
        // Growth mode: editable Current stepper on the left, read-only Future on the right.
        // Future is derived from per-department futureHeadcount in the table below.
        <div className="flex items-center justify-center gap-2">
          {/* Current — compact editable stepper */}
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-medium mb-1">
              Current
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onChange(Math.max(0, value - 1))}
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${styles.btn}`}
                aria-label={`Decrease ${label}`}
              >
                −
              </button>
              <NumberField
                value={value}
                onChange={onChange}
                ariaLabel={`${label} current`}
                className={`w-12 text-xl font-bold tabular-nums bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-center ${styles.text}`}
              />
              <button
                type="button"
                onClick={() => onChange(value + 1)}
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${styles.btn}`}
                aria-label={`Increase ${label}`}
              >
                +
              </button>
            </div>
          </div>
          <span className="text-slate-400 text-base font-medium pt-4">→</span>
          {/* Future — derived from dept future headcount */}
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[9px] uppercase tracking-wider text-emerald-600 font-medium mb-1">
              Future
            </span>
            <div className="flex items-center gap-1.5 h-6">
              <span className={`text-xl font-bold tabular-nums ${styles.text}`}>
                {futureValue.toLocaleString()}
              </span>
              {growthDelta !== 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-semibold tabular-nums ${
                    growthDelta > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {growthDelta > 0 ? "+" : ""}
                  {growthDelta}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Standard mode: editable stepper
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(Math.max(0, value - 1))}
            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base font-semibold transition-colors ${styles.btn}`}
            aria-label={`Decrease ${label}`}
          >
            −
          </button>
          <NumberField
            value={value}
            onChange={onChange}
            ariaLabel={label}
            className={`flex-1 min-w-0 text-3xl font-bold tabular-nums bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-center ${styles.text}`}
          />
          <button
            type="button"
            onClick={() => onChange(value + 1)}
            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base font-semibold transition-colors ${styles.btn}`}
            aria-label={`Increase ${label}`}
          >
            +
          </button>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-white/70 space-y-1.5 text-[11px]">
        {showAllocations && (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-slate-600">
                {growthMode ? "Allocated (future)" : "Allocated to depts"}
              </span>
              <span className="tabular-nums font-semibold text-slate-900">
                {growthMode && futureAllocated !== undefined ? futureAllocated : allocated}
                <span className="text-slate-400 font-normal"> / {effectiveTarget}</span>
              </span>
            </div>
            {configured !== undefined && (
              <div className="flex items-baseline justify-between">
                <span className="text-slate-600">{configuredLabel ?? "Configured"}</span>
                <span className="tabular-nums font-semibold text-slate-900">
                  {configured}
                  <span className="text-slate-400 font-normal"> / {effectiveTarget}</span>
                </span>
              </div>
            )}
            {!growthMode && configured === undefined && allocLeft > 0 && (
              <div className="text-[10px] text-slate-500">{allocLeft} left to allocate</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// ProgramIsland: a premium floating summary / HUD for the programming tool.
//   - Two orientations: top-horizontal pill or right-side vertical rail.
//   - Light glass surface that matches the rest of the app's aesthetic.
//   - Hover (or focus) reveals a secondary layer with a stacked bar chart
//     of category USF composition and a donut showing USF/RSF efficiency.
//   - Position is persisted per session via component state.
// -----------------------------------------------------------------------------
type IslandMetric = { label: string; value: number; color: string }

function ProgramDonut({
  ratio,
  segments,
  size = 120,
  thickness = 12,
  logoSrc,
  logoAlt = "Logo",
  centerLabel,
  centerSubLabel,
}: {
  ratio: number // 0..1 — rendered as a single arc if no segments supplied
  segments?: IslandMetric[]
  size?: number
  thickness?: number
  // When provided, displays a circular logo in the donut center instead of text.
  logoSrc?: string
  logoAlt?: string
  // Optional fallback text center (used only when no logo is provided).
  centerLabel?: string
  centerSubLabel?: string
}) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const total = segments?.reduce((s, m) => s + m.value, 0) || 0

  // Inner circle (logo area) is smaller than the donut hole to give the logo
  // comfortable breathing room inside the ring.
  const innerDiameter = size - thickness * 2 - 6

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-hidden={logoSrc ? undefined : true}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(226 232 240)" // slate-200
          strokeWidth={thickness}
        />
        {segments && total > 0 ? (
          (() => {
            let offset = 0
            return segments.map((seg) => {
              const frac = seg.value / total
              const len = c * frac
              const node = (
                <circle
                  key={seg.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  className="transition-[stroke-dasharray] duration-500 ease-out"
                />
              )
              offset += len
              return node
            })
          })()
        ) : (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgb(6 182 212)"
            strokeWidth={thickness}
            strokeDasharray={`${c * ratio} ${c}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="transition-[stroke-dasharray] duration-500 ease-out"
          />
        )}
        {!logoSrc && centerLabel && (
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-900 font-semibold tabular-nums"
            style={{ fontSize: size * 0.2 }}
          >
            {centerLabel}
          </text>
        )}
        {!logoSrc && centerSubLabel && (
          <text
            x="50%"
            y="50%"
            dy={size * 0.16}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-500 uppercase tracking-wider"
            style={{ fontSize: size * 0.09, letterSpacing: "0.08em" }}
          >
            {centerSubLabel}
          </text>
        )}
      </svg>

      {logoSrc && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="rounded-full bg-white/95 ring-1 ring-slate-200/70 shadow-[inset_0_0_0_1px_rgb(255_255_255)] flex items-center justify-center overflow-hidden"
            style={{ width: innerDiameter, height: innerDiameter }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc || "/placeholder.svg"}
              alt={logoAlt}
              className="max-w-[78%] max-h-[78%] object-contain select-none"
              draggable={false}
            />
          </div>
        </div>
      )}
    </div>
  )
}

type IslandDock = "top" | "right" | "bottom" | "left"

// Small dock-toggle glyphs rendered inline (no extra icon deps).
function DockGlyph({ position, active }: { position: IslandDock; active: boolean }) {
  const fill = active ? "currentColor" : "currentColor"
  const dim = active ? 1 : 0.35
  const strong = active ? 1 : 0.6
  const common = { fill, rx: 0.6 } as const
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      {position === "top" && (
        <>
          <rect x="1" y="1.5" width="10" height="2.5" {...common} opacity={strong} />
          <rect x="1" y="6" width="10" height="4.5" {...common} opacity={dim} />
        </>
      )}
      {position === "bottom" && (
        <>
          <rect x="1" y="1.5" width="10" height="4.5" {...common} opacity={dim} />
          <rect x="1" y="8" width="10" height="2.5" {...common} opacity={strong} />
        </>
      )}
      {position === "left" && (
        <>
          <rect x="1" y="1" width="3" height="10" {...common} opacity={strong} />
          <rect x="5" y="1" width="6" height="10" {...common} opacity={dim} />
        </>
      )}
      {position === "right" && (
        <>
          <rect x="1" y="1" width="6" height="10" {...common} opacity={dim} />
          <rect x="8" y="1" width="3" height="10" {...common} opacity={strong} />
        </>
      )}
    </svg>
  )
}

function ProgramIsland({
  totalRSF,
  totalUSF,
  metrics,
  clientLogoUrl,
  defaultLogoUrl = "/nelson-logo.png",
  onUploadLogo,
  onRemoveLogo,
  variant = "floating",
  dock = "top",
  onDockChange,
  headcount,
  seatCount,
  rsfPerPerson: rsfPerPersonProp,
  usfPerPerson,
  scenarioName,
}: {
  totalRSF: number
  totalUSF: number
  metrics: (IslandMetric & { count?: number })[]
  clientLogoUrl?: string | null
  defaultLogoUrl?: string
  onUploadLogo?: (dataUrl: string, fileName: string) => void
  onRemoveLogo?: () => void
  // "embedded" = no fixed wrapper, horizontal only, no dock toggle.
  // "floating" = no fixed wrapper (parent positions), dock toggle shown.
  variant?: "embedded" | "floating"
  // Controlled dock position (only meaningful for floating variant).
  dock?: IslandDock
  onDockChange?: (dock: IslandDock) => void
  headcount?: number
  seatCount?: number
  rsfPerPerson?: number
  usfPerPerson?: number
  scenarioName?: string
}) {
  const [hovering, setHovering] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const usfRatio = totalRSF > 0 ? Math.min(1, totalUSF / totalRSF) : 0
  const totalMetricUSF = metrics.reduce((s, m) => s + m.value, 0) || 1
  // Embedded always horizontal; floating respects the dock prop.
  const isVertical =
    variant === "floating" && (dock === "left" || dock === "right")
  const showDockToggle = variant === "floating"
  const activeLogo = clientLogoUrl || defaultLogoUrl

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : ""
      if (dataUrl && onUploadLogo) onUploadLogo(dataUrl, file.name)
    }
    reader.readAsDataURL(file)
    // allow re-selecting the same file
    e.target.value = ""
  }

  const DockToggle = showDockToggle ? (
    <div
      className="inline-flex items-center gap-0.5 rounded-full bg-slate-100/80 p-0.5"
      role="group"
      aria-label="Dock position"
    >
      {(["top", "right", "bottom", "left"] as IslandDock[]).map((pos) => (
        <button
          key={pos}
          type="button"
          onClick={() => onDockChange?.(pos)}
          aria-label={`Dock to ${pos}`}
          aria-pressed={dock === pos}
          className={`p-1 rounded-full transition-colors ${
            dock === pos
              ? "bg-white shadow-sm text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <DockGlyph position={pos} active={dock === pos} />
        </button>
      ))}
    </div>
  ) : null

  const LogoActions = (
    <div className="inline-flex items-center gap-1">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-1 rounded-full bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 hover:text-slate-800 px-2 py-1 text-[10px] uppercase tracking-[0.12em] font-semibold transition-colors"
        title={clientLogoUrl ? "Replace client logo" : "Upload client logo"}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M6 2v6M3 5l3-3 3 3M2 10h8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Logo
      </button>
      {clientLogoUrl && onRemoveLogo && (
        <button
          type="button"
          onClick={onRemoveLogo}
          aria-label="Remove client logo"
          title="Remove client logo"
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100/80 hover:bg-slate-200/80 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M3 3l6 6M9 3l-6 6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  )

  // Primary KPIs — 2×2 grid: RSF | RSF/person | Seats | Headcount
  const KPIBlock = (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 shrink-0">
      {/* Top-left: Total RSF (primary) */}
      <div className="flex flex-col leading-none">
        <span className="text-[9px] uppercase tracking-[0.14em] text-slate-400 font-semibold mb-0.5">RSF</span>
        <span className="text-xl font-semibold tabular-nums text-slate-900">
          {Math.round(totalRSF).toLocaleString()}
        </span>
      </div>
      {/* Top-right: RSF/person */}
      <div className="flex flex-col leading-none">
        <span className="text-[9px] uppercase tracking-[0.14em] text-slate-400 font-semibold mb-0.5">RSF/person</span>
        <span className="text-xl font-semibold tabular-nums text-slate-700">
          {rsfPerPersonProp ? rsfPerPersonProp.toLocaleString() : Math.round(totalRSF / Math.max(headcount || 1, 1)).toLocaleString()}
        </span>
      </div>
      {/* Bottom-left: Total Seats */}
      <div className="flex flex-col leading-none">
        <span className="text-[9px] uppercase tracking-[0.14em] text-slate-400 font-semibold mb-0.5">Seats</span>
        <span className="text-sm tabular-nums text-slate-600 font-medium">
          {(seatCount ?? Math.round(totalUSF / 42)).toLocaleString()}
        </span>
      </div>
      {/* Bottom-right: Headcount */}
      <div className="flex flex-col leading-none">
        <span className="text-[9px] uppercase tracking-[0.14em] text-slate-400 font-semibold mb-0.5">Headcount</span>
        <span className="text-sm tabular-nums text-slate-600 font-medium">
          {(headcount ?? 0).toLocaleString()}
        </span>
      </div>
      {/* Scenario label if active */}
      {scenarioName && (
        <div className="col-span-2">
          <span className="text-[9px] text-teal-600 font-medium truncate">{scenarioName}</span>
        </div>
      )}
    </div>
  )

  // Category chips (label / USF / count)
  const CategoryGroup = (
    <div
      className={
        isVertical
          ? "flex flex-col gap-3 w-full"
          : "flex items-stretch gap-4"
      }
    >
      {metrics.map((m) => (
        <div
          key={m.label}
          className={isVertical ? "flex items-center gap-2 w-full" : "flex items-start gap-2"}
        >
          <span
            className={`${isVertical ? "" : "mt-1"} w-1.5 h-1.5 rounded-full shrink-0`}
            style={{ backgroundColor: m.color }}
            aria-hidden="true"
          />
          <div className={`flex flex-col leading-none ${isVertical ? "flex-1 min-w-0" : ""}`}>
            <span className="text-[9px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
              {m.label}
            </span>
            <span className="text-sm font-semibold tabular-nums text-slate-900 mt-1">
              {Math.round(m.value).toLocaleString()}
              <span className="text-[9px] uppercase tracking-[0.14em] text-slate-400 font-medium ml-1">
                USF
              </span>
            </span>
            {typeof m.count === "number" && (
              <span className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
                {m.count} {m.count === 1 ? "space" : "spaces"}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  // Hover composition bar — adapts to orientation
  const CompositionReveal = (
    <div
      className={`grid transition-[grid-template-rows,grid-template-columns,opacity] duration-300 ease-out ${
        hovering
          ? isVertical
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[1fr] opacity-100"
          : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        <div
          className={`border-t border-slate-200/70 ${
            isVertical ? "px-4 py-3" : "px-5 py-3"
          } flex ${isVertical ? "flex-col gap-2" : "items-center gap-3"}`}
        >
          <span className="text-[9px] uppercase tracking-[0.14em] text-slate-500 font-semibold shrink-0">
            Composition
          </span>
          <div
            className={`${
              isVertical ? "w-full" : "flex-1"
            } flex h-1.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/60`}
          >
            {metrics.map((m) => {
              const pct = (m.value / totalMetricUSF) * 100
              return (
                <div
                  key={m.label}
                  className="h-full transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: m.color }}
                  title={`${m.label}: ${Math.round(m.value).toLocaleString()} USF (${pct.toFixed(0)}%)`}
                />
              )
            })}
          </div>
          <div
            className={`${
              isVertical ? "grid grid-cols-2 gap-x-3 gap-y-1 w-full" : "flex items-center gap-3"
            } shrink-0`}
          >
            {metrics.map((m) => {
              const pct = totalMetricUSF > 0 ? (m.value / totalMetricUSF) * 100 : 0
              return (
                <div key={m.label} className="flex items-center gap-1 text-[10px]">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="tabular-nums font-medium text-slate-600">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div
      className="pointer-events-auto"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="rounded-[20px] p-[1px] bg-gradient-to-br from-slate-200 via-white to-slate-300/70 shadow-[0_16px_40px_-16px_rgb(15_23_42_/_0.28)]">
        <div className="rounded-[19px] bg-gradient-to-b from-white to-slate-50/80 backdrop-blur-xl ring-1 ring-black/[0.02] overflow-hidden">
          {isVertical ? (
            <div className="flex flex-col gap-4 px-4 py-4 w-[220px]">
              <div className="flex items-center justify-between">
                <ProgramDonut
                  ratio={usfRatio}
                  segments={metrics}
                  size={72}
                  thickness={8}
                  logoSrc={activeLogo}
                  logoAlt={clientLogoUrl ? "Client logo" : "Nelson"}
                />
                {KPIBlock}
              </div>
              <div className="h-px w-full bg-slate-200/70" />
              {CategoryGroup}
              <div className="flex items-center justify-between pt-2 mt-auto">
                {DockToggle}
                {LogoActions}
              </div>
              {CompositionReveal}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-5 pl-4 pr-4 py-3">
                <ProgramDonut
                  ratio={usfRatio}
                  segments={metrics}
                  size={64}
                  thickness={7}
                  logoSrc={activeLogo}
                  logoAlt={clientLogoUrl ? "Client logo" : "Nelson"}
                />
                {KPIBlock}
                <div className="h-12 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent shrink-0" />
                {CategoryGroup}
                {(DockToggle || LogoActions) && (
                  <>
                    <div className="h-12 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent shrink-0" />
                    <div className="flex items-center gap-2">
                      {LogoActions}
                      {DockToggle}
                    </div>
                  </>
                )}
              </div>
              {CompositionReveal}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Space presets for the "Add Space" picker in Advanced Canvas.
// Each entry defines a space type with default SF and capacity for its zone.
const SPACE_PRESETS: Record<string, Array<{
  name: string
  sfEach: number
  capacity: number
  workspaceType?: "employee" | "private" | "flex" | null
}>> = {
  "Focus Open": [
    { name: "Employee Workstation", sfEach: 42, capacity: 1, workspaceType: "employee" },
    { name: "Large Workstation", sfEach: 64, capacity: 1, workspaceType: "employee" },
    { name: "Hoteling / Flex Workstation", sfEach: 42, capacity: 1, workspaceType: "flex" },
    { name: "Workpoint / Touchdown", sfEach: 30, capacity: 1, workspaceType: "flex" },
    { name: "Open Collaboration Lounge", sfEach: 150, capacity: 6 },
  ],
  "Focus Enclosed": [
    { name: "Private Office", sfEach: 140, capacity: 1, workspaceType: "private" },
    { name: "Shared Office (2-person)", sfEach: 150, capacity: 2, workspaceType: "flex" },
    { name: "Office for the Day", sfEach: 140, capacity: 1, workspaceType: "flex" },
    { name: "Focus Studio", sfEach: 200, capacity: 2 },
    { name: "Phone Booth / Focus Room", sfEach: 48, capacity: 1 },
  ],
  "Collaborative": [
    { name: "Huddle Room", sfEach: 140, capacity: 4 },
    { name: "Interview Room", sfEach: 140, capacity: 4 },
    { name: "Medium Conference Room", sfEach: 280, capacity: 8 },
    { name: "Large Conference Room", sfEach: 400, capacity: 12 },
    { name: "Board Room", sfEach: 600, capacity: 20 },
    { name: "Training Room", sfEach: 600, capacity: 20 },
    { name: "Charette / Pin-up Room", sfEach: 200, capacity: 8 },
    { name: "Project Room", sfEach: 150, capacity: 4 },
    { name: "Outdoor Terrace", sfEach: 300, capacity: 12 },
  ],
  "Support": [
    { name: "Kitchenette / Pantry", sfEach: 100, capacity: 4 },
    { name: "Work Café", sfEach: 400, capacity: 20 },
    { name: "Copy / Mail Area", sfEach: 80, capacity: 2 },
    { name: "Lockers", sfEach: 150, capacity: 50 },
    { name: "Coat Room", sfEach: 40, capacity: 20 },
    { name: "Storage Room", sfEach: 150, capacity: 0 },
    { name: "File Room", sfEach: 200, capacity: 0 },
    { name: "Multipurpose Room", sfEach: 1200, capacity: 50 },
    { name: "Server / MDF Room", sfEach: 150, capacity: 0 },
    { name: "IT Closet / IDF", sfEach: 80, capacity: 0 },
    { name: "ADA Restroom", sfEach: 60, capacity: 1 },
  ],
  "Wellness": [
    { name: "Wellness Suite", sfEach: 300, capacity: 2 },
    { name: "Mothers / Wellness Room", sfEach: 80, capacity: 1 },
    { name: "Meditation Room", sfEach: 150, capacity: 4 },
    { name: "Prayer Room", sfEach: 100, capacity: 6 },
    { name: "Fitness Area", sfEach: 500, capacity: 10 },
    { name: "Quiet / Nap Room", sfEach: 80, capacity: 1 },
  ],
}

function FeatureToggle({
  active,
  onClick,
  label,
  title,
  suffix,
}: {
  active: boolean
  onClick: () => void
  label: string
  title?: string
  suffix?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
        active
          ? "bg-white border-slate-300 text-slate-900 hover:bg-slate-50 shadow-sm"
          : "bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
      }`}
    >
      {label}
      {suffix}
    </button>
  )
}

const WorkplaceProgrammingTool = () => {
  const [hasMounted, setHasMounted] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [viewMode, setViewMode] = useState<"dashboard" | "hybrid" | "fullOccupancy" | "comparison" | "seatDemand">("dashboard")
  // Initialize with null - set when onboarding completes
  const [programMetrics, setProgramMetrics] = useState<any>(null)
  // Track if user chose hybrid mode - shows Fast Track Explorer instead of canvas
  const [showFastTrackExplorer, setShowFastTrackExplorer] = useState(false)
  // Warning dialog for switching back to Fast Track from Advanced Canvas
  const [showFastTrackWarning, setShowFastTrackWarning] = useState(false)
  const [onboardingInputs, setOnboardingInputs] = useState<OnboardingInputs | null>(null)
  const [adminPinInput, setAdminPinInput] = useState("")
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [ratioConfig, setRatioConfig] = useState<RatioConfig>({})
  const [rsfPerPerson, setRsfPerPerson] = useState(233)

  const handleAdminAccess = () => {
    if (adminPinInput === "1201") {
      setIsAdminAuthenticated(true)
      setAdminPinInput("")
    } else {
      alert("Invalid PIN")
      setAdminPinInput("")
    }
  }

  // import { CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible" // Removed redundant imports

  interface Department {
    id: string
    name: string
    color: string
    headcount: number
    officeCount: number
    hybridWorkers: number
    workstations: number
    // Growth planning: optional future-state headcount per department.
    // When planForGrowth is enabled, this drives computed future KPIs.
    futureHeadcount?: number
  }

  interface Space {
    id: string
    name: string
    zone: string
    quantity: number
    capacity: number
    sfEach: number
    totalArea: number
  }

  interface EditableSpace extends Space {
    isDedicated?: boolean // Keep for backward compatibility during transition
    workstationType?: "employee" | "private" | "flex" | null // New tagging system
    notes: string
    ratio: string
    departmentAllocations: DepartmentAllocation[]
    customName?: string // Added for editable space names
    isActive?: boolean // Added for filtering active spaces
  }

  interface DepartmentAllocation {
    departmentId: string
    count: number
  }

  interface SpaceCardProps {
    space: EditableSpace
    spaceKey: string
    updateSpace: (spaceKey: string, updates: Partial<EditableSpace>) => void
    toggleDedicatedStatus: (spaceKey: string) => void
    departments: Department[]
    departmentExpansionState: { [key: string]: boolean }
    setDepartmentExpansionState: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>
    // Cross-card rollup: sum of each dept's allocation across all cards with this workstation type.
    configuredByDeptAndType: Record<"employee" | "private" | "flex", Record<string, number>>
    // Planned totals for each workspace type (company target). Used for the card's summary readout.
    plannedByType: Record<"employee" | "private" | "flex", number>
    // UI visibility controls
    visibility?: VisibilitySettings
  }


  const initialConfig = {
    businessName: "Acme Corporation",
    growthGoals: true,
    headcount3Year: 650,
    headcount5Year: 800,
    hybrid: true,
    daysInOffice: 3,
    dateConfigured: new Date().toLocaleDateString(),
    configuredBy: "John Smith",
    growthType: "moderate",
  }

  const DepartmentRow = ({
    department,
    isEditing,
    onEdit,
    onSave,
    onCancel,
    onDuplicate,
    onDelete,
  }: {
    department: Department
    isEditing: boolean
    onEdit: () => void
    onSave: (name: string) => void
    onCancel: () => void
    onDuplicate: () => void
    onDelete: () => void
  }) => {
    const [tempName, setTempName] = useState(department.name)

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
          <div className={`w-3 h-3 rounded-full ${department.color}`}></div>
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave(tempName)
              if (e.key === "Escape") onCancel()
            }}
            autoFocus
          />
          <button onClick={() => onSave(tempName)} className="text-green-600 hover:text-green-700 text-xs">
            ✓
          </button>
          <button onClick={onCancel} className="text-red-600 hover:text-red-700 text-xs">
            ✕
          </button>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded group">
        <div className={`w-2.5 h-2.5 rounded-full ${department.color} shrink-0`}></div>
        <button onClick={onEdit} className="flex-1 text-sm text-gray-700 text-left hover:text-gray-900 truncate" title="Click to rename">
          {department.name}
        </button>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onDuplicate} className="p-1 text-gray-400 hover:text-gray-600 rounded" title="Duplicate">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2"/><path strokeWidth="2" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500 rounded" title="Delete">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
    )
  }

  const [configExpanded, setConfigExpanded] = useState(true)

  const [config, setConfig] = useState({
    ...initialConfig,
    growthType: "moderate",
    growthGoal: "moderate", // Added default for growthGoal
    fullyRemoteEmployees: 0, // Added default for fullyRemoteEmployees
    percentOffices: 80, // Added default for percentOffices
  })
  const [editableSpaces, setEditableSpaces] = useState<Record<string, EditableSpace>>({})

  // Compute whether we have data to show view tabs (either from onboarding or existing spaces)
  const hasConfiguredProgram = programMetrics !== null || Object.keys(editableSpaces).length > 0

  // Handler for onboarding modal completion - converts generated spaces to editableSpaces format
  const handleOnboardingComplete = (spaces: GeneratedSpaceConfig[], inputs: OnboardingInputs, metrics: any) => {
    const newEditableSpaces: Record<string, EditableSpace> = {}
    
    spaces.forEach((space, index) => {
      const key = `generated_${index}_${space.name.toLowerCase().replace(/\s+/g, '_')}`
      newEditableSpaces[key] = {
        id: key,
        name: space.name,
        zone: space.zone,
        quantity: space.quantity,
        capacity: space.capacity,
        sfEach: space.sfEach,
        totalArea: space.quantity * space.sfEach,
        workstationType: space.workstationType || null,
        notes: "",
        ratio: "1:1",
        departmentAllocations: [],
        customName: space.name,
        isActive: true,
      }
    })
    
    setEditableSpaces(newEditableSpaces)

    // Update load factor from inputs (rentableFactor is 0.22 = 22%, so 1 + 0.22 = 1.22)
    if (inputs.rentableFactor) {
      setLoadFactor(1 + inputs.rentableFactor)
    }

    // ── Sync config with onboarding inputs so Recalibrate uses matching parameters ──
    // Without this, buildRecalibratePreview uses stale defaults (e.g. percentOffices=80)
    // which produces wildly different quantities than what the engine generated on onboarding.
    setConfig((prev) => ({
      ...prev,
      percentOffices: inputs.percentOffices,
      daysInOffice: inputs.daysInOffice,
      fullyRemoteEmployees:
        inputs.totalHeadcount > 0
          ? Math.round((inputs.fullyRemote / inputs.totalHeadcount) * 100)
          : 0,
    }))

    // ── Sync Config Targets from engine inputs (perfect match, no gaps) ──
    try {
      const summaryInputs: SummaryInputs = {
        clientName: inputs.clientName || "",
        programmedBy: inputs.programmedBy || "",
        totalHeadcount: inputs.totalHeadcount,
        fullyRemote: inputs.fullyRemote ?? 0,
        percentOffices: inputs.percentOffices ?? 15,
        grossRent: inputs.grossRent ?? 50,
        daysInOffice: inputs.daysInOffice ?? 3,
        rentableFactor: inputs.rentableFactor ?? 0.22,
      }
      const blocks = computeAllSeatDemandBlocks(summaryInputs.totalHeadcount, summaryInputs.fullyRemote)
      const program = computeSpaceProgram(summaryInputs, blocks, undefined, ratioConfig)
      const result = convertProgramToSpaces(program, summaryInputs)

      setTargetHeadcount(summaryInputs.totalHeadcount)
      setTargetOfficeCount(result.targets.officeCount)
      setTargetWorkstations(result.targets.workstationCount)
      setTargetHybridWorkers(result.targets.hybridWorkers)

      // Pre-populate department headcounts + space allocations by distributing
      // evenly across departments based on their proportional headcount share.
      // Only runs if all departments currently have 0 headcount (fresh state).
      setDepartments((prev) => {
        const totalAllocated = prev.reduce((s, d) => s + (d.headcount || 0), 0)
        if (totalAllocated > 0) return prev // user already set some HCs — don't overwrite
        const hc = summaryInputs.totalHeadcount
        const n = prev.length
        return prev.map((d, i) => {
          // Distribute headcount: first dept gets remainder so total is exact
          const base = Math.floor(hc / n)
          const extra = i === 0 ? hc - base * n : 0
          const deptHC = base + extra
          // Proportionally distribute office/workstation/hybrid from engine targets
          // so that Growth mode FUTURE columns start from meaningful non-zero values
          const share = hc > 0 ? deptHC / hc : 1 / n
          const deptOffices = Math.round(result.targets.officeCount * share)
          const deptWorkstations = Math.round(result.targets.workstationCount * share)
          const deptHybrid = Math.round(result.targets.hybridWorkers * share)
          return {
            ...d,
            headcount: deptHC,
            futureHeadcount: deptHC,
            officeCount: deptOffices,
            workstations: deptWorkstations,
            hybridWorkers: deptHybrid,
          }
        })
      })
    } catch (err) {
      // Fallback: simple computation from inputs
      const hc = inputs.totalHeadcount
      const officeCount = Math.round(hc * (inputs.percentOffices / 100))
      setTargetHeadcount(hc)
      setTargetOfficeCount(officeCount)
      setTargetWorkstations(Math.max(0, hc - officeCount - (inputs.fullyRemote ?? 0)))
      setTargetHybridWorkers(Math.round((hc - (inputs.fullyRemote ?? 0)) * (1 - (inputs.daysInOffice ?? 3) / 5)))
    }

    // Sync project info from onboarding
    if (inputs.clientName) {
      setProjectInfo((prev) => ({ ...prev, client: inputs.clientName! }))
    }
    if (inputs.programmedBy) {
      setProjectInfo((prev) => ({ ...prev, designedBy: inputs.programmedBy! }))
    }

    // Store metrics for Hybrid vs Full Occupancy comparison
    setProgramMetrics(metrics)
    setOnboardingInputs(inputs)

    // Show Fast Track Explorer if user chose that view mode
    if (inputs.viewMode === "fast-track") {
      setShowFastTrackExplorer(true)
    } else {
      setShowFastTrackExplorer(false)
    }

    setShowOnboarding(false)
  }

  const [departments, setDepartments] = useState<Department[]>([
    { id: "1", name: "Engineering", color: "bg-blue-500", headcount: 0, officeCount: 0, hybridWorkers: 0, workstations: 0 },
    { id: "2", name: "Design", color: "bg-purple-500", headcount: 0, officeCount: 0, hybridWorkers: 0, workstations: 0 },
    { id: "3", name: "Marketing", color: "bg-green-500", headcount: 0, officeCount: 0, hybridWorkers: 0, workstations: 0 },
    { id: "4", name: "Sales", color: "bg-orange-500", headcount: 0, officeCount: 0, hybridWorkers: 0, workstations: 0 },
    { id: "5", name: "Operations", color: "bg-red-500", headcount: 0, officeCount: 0, hybridWorkers: 0, workstations: 0 },
  ])

  const [editingDepartment, setEditingDepartment] = useState<string | null>(null)
  // Circulation factors aligned with Fast-Track engine:
  // Individual (Focus) & Collaborative: 45%, Support & Wellness: 35%
  const [zoneCirculation, setZoneCirculation] = useState({
    "Focus Open": 45,
    "Focus Enclosed": 45,
    Collaborative: 45,
    Support: 35,
    Wellness: 35,
  })

  // Rentable factor aligned with Fast-Track (22% add-on = 1.22 multiplier)
  const [loadFactor, setLoadFactor] = useState(1.22)
  const [departmentExpansionState, setDepartmentExpansionState] = useState<{ [key: string]: boolean }>({})

  const [projectInfo, setProjectInfo] = useState({
    projectName: "Untitled Project", // Default project name
    client: "",
    designedBy: "",
    date: new Date().toISOString().split("T")[0], // Use ISO format for date input
  })

  const [showSaveSuccess, setShowSaveSuccess] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(true)

  // Add Space picker dialog (Phase 3)
  const [addSpaceDialog, setAddSpaceDialog] = useState<{ open: boolean; zone: string }>({ open: false, zone: "" })

  // Quick-generate state for start-from-scratch path (Phase 4)
  const [quickGen, setQuickGen] = useState<{ headcount: string; daysInOffice: number }>({ headcount: "", daysInOffice: 3 })
  const [quickGenOpen, setQuickGenOpen] = useState(false)

  const [targetHeadcount, setTargetHeadcount] = useState(170)
  const [targetOfficeCount, setTargetOfficeCount] = useState(() => Math.round(170 * 0.2)) // 34 for 170 employees
  const [targetHybridWorkers, setTargetHybridWorkers] = useState(85)
  const [targetWorkstations, setTargetWorkstations] = useState(() => 170 - Math.round(170 * 0.2)) // headcount - offices
  const [deptBreakdownExpanded, setDeptBreakdownExpanded] = useState(false)

  const saveProject = () => {
    const projectData = {
      projectInfo,
      config,
      editableSpaces,
      departments,
      zoneCirculation,
      loadFactor,
      savedAt: new Date().toISOString(),
    }

    const savedProjects = JSON.parse(localStorage.getItem("workplaceProjects") || "[]")
    const existingIndex = savedProjects.findIndex((p: any) => p.projectInfo.projectName === projectInfo.projectName)

    if (existingIndex >= 0) {
      savedProjects[existingIndex] = projectData
    } else {
      savedProjects.push(projectData)
    }

    localStorage.setItem("workplaceProjects", JSON.JSON.stringify(savedProjects))
    setShowSaveSuccess(true)
    setTimeout(() => setShowSaveSuccess(false), 2000)
  }

  const loadProject = (projectData: any) => {
    setProjectInfo(projectData.projectInfo)
    setConfig(projectData.config)
    setEditableSpaces(projectData.editableSpaces)
    setDepartments(projectData.departments)
    setZoneCirculation(projectData.zoneCirculation)
    setLoadFactor(projectData.loadFactor)
    // Ensure the date input is correctly formatted
    setProjectInfo((prev) => ({
      ...prev,
      date: projectData.projectInfo.date || new Date().toISOString().split("T")[0],
    }))
  }

  const getSavedProjects = () => {
    try {
      return JSON.parse(localStorage.getItem("workplaceProjects") || "[]")
    } catch (error) {
      console.error("Error parsing saved projects:", error)
      return []
    }
  }

  const deleteProject = (projectName: string) => {
    const savedProjects = getSavedProjects()
    const filtered = savedProjects.filter((p: any) => p.projectInfo.projectName !== projectName)
    localStorage.setItem("workplaceProjects", JSON.stringify(filtered))
    setShowProjectManager(false)
    // Force re-render by toggling state
    setShowProjectManager(true)
    setTimeout(() => setShowProjectManager(false), 10)
  }

  const [showProjectManager, setShowProjectManager] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  const configTargets = {
    fullyRemoteEmployees: config.fullyRemoteEmployees || 0,
    percentOffices: config.percentOffices || 80, // Default to 80% if not set
  }

  const getWorkspaceTypeDistribution = (workspaceType: "employee" | "private" | "flex") => {
    const activeSpaces = Object.values(editableSpaces).filter(
      (space) => space.workstationType === workspaceType && space.isActive !== false,
    )

    const configuredTotal = activeSpaces.reduce((sum, space) => sum + (space.quantity || 0), 0)

    let plannedTotal = 0
    if (workspaceType === "employee") {
      plannedTotal = Math.max(0, targetHeadcount - targetOfficeCount)
    } else if (workspaceType === "flex") {
      plannedTotal = targetHybridWorkers
    } else if (workspaceType === "private") {
      plannedTotal = targetOfficeCount
    }

    const delta = configuredTotal - plannedTotal

    return {
      planned: plannedTotal,
      configured: configuredTotal,
      delta,
      activeSpaces: activeSpaces.length,
    }
  }

  // Rollup map: for each workspace type, sum each department's allocation
  // across ALL cards of that type. Used by the cascade indicators on each card.
  const configuredByDeptAndType = useMemo(() => {
    const out: Record<"employee" | "private" | "flex", Record<string, number>> = {
      employee: {},
      private: {},
      flex: {},
    }
    Object.values(editableSpaces).forEach((sp: any) => {
      const t = sp?.workstationType as "employee" | "private" | "flex" | undefined
      if (!t || !(t in out) || sp.isActive === false) return
      ;(sp.departmentAllocations || []).forEach((alloc: { departmentId: string; count: number }) => {
        out[t][alloc.departmentId] = (out[t][alloc.departmentId] || 0) + alloc.count
      })
    })
    return out
  }, [editableSpaces])

  const newEditableTotals = useMemo(() => {
    const focusOpenSpaces = Object.values(editableSpaces).filter((space) => space.zone === "Focus Open")
    const focusEnclosedSpaces = Object.values(editableSpaces).filter((space) => space.zone === "Focus Enclosed")
    const collaborativeSpaces = Object.values(editableSpaces).filter((space) => space.zone === "Collaborative")
    const supportSpaces = Object.values(editableSpaces).filter((space) => space.zone === "Support")
    const wellnessSpaces = Object.values(editableSpaces).filter((space) => space.zone === "Wellness")

    const calculateZoneRSF = (spaces: EditableSpace[]) =>
      spaces.reduce((sum, space) => sum + (space.totalArea || 0), 0)

    const focusOpenRSF = calculateZoneRSF(focusOpenSpaces)
    const focusEnclosedRSF = calculateZoneRSF(focusEnclosedSpaces)
    const collaborativeRSF = calculateZoneRSF(collaborativeSpaces)
    const supportRSF = calculateZoneRSF(supportSpaces)
    const wellnessRSF = calculateZoneRSF(wellnessSpaces)

    const totalRSF = focusOpenRSF + focusEnclosedRSF + collaborativeRSF + supportRSF + wellnessRSF

    // Calculate USF with circulation per zone using admin ratios
    const focusOpenUSF = focusOpenRSF * (1 + (zoneCirculation["Focus Open"] || 45) / 100)
    const focusEnclosedUSF = focusEnclosedRSF * (1 + (zoneCirculation["Focus Enclosed"] || 45) / 100)
    const collaborativeUSF = collaborativeRSF * (1 + (zoneCirculation["Collaborative"] || 45) / 100)
    const supportUSF = supportRSF * (1 + (zoneCirculation["Support"] || 35) / 100)
    const wellnessUSF = wellnessRSF * (1 + (zoneCirculation["Wellness"] || 35) / 100)

    const totalUSF = focusOpenUSF + focusEnclosedUSF + collaborativeUSF + supportUSF + wellnessUSF
    const focusUSF = focusOpenUSF + focusEnclosedUSF
    const calculatedRSF = totalUSF * loadFactor

    const spaces = Object.values(editableSpaces).map((space) => ({
      name: space.name,
      capacity: (space.quantity || 0) * (space.capacity || 0),
      workstationType: space.workstationType,
      quantity: space.quantity,
    }))

    const kpis = computeKpis(spaces, {
      hybridEnabled: config.hybrid,
      daysInOffice: config.daysInOffice,
    })

    const dedicatedSeats = Object.values(editableSpaces)
      .filter((space) => (space.zone === "Focus Open" || space.zone === "Focus Enclosed") && space.isDedicated)
      .reduce((sum, space) => sum + (space.quantity || 0) * (space.capacity || 0), 0)

    const privateOffices = focusEnclosedSpaces.reduce((sum, space) => sum + (space.quantity || 0), 0)
    const totalSpaces = Object.values(editableSpaces).reduce((sum, space) => sum + (space.quantity || 0), 0)
    const rsfPerPerson = dedicatedSeats > 0 ? Math.round(calculatedRSF / dedicatedSeats) : 0

    const assignableSeats = kpis.desks + kpis.offices + kpis.flex
    const primaryInOfficeHeadcount = Math.round((targetHeadcount * (100 - configTargets.fullyRemoteEmployees)) / 100)
    const peakInOffice = assignableSeats
    const vsPeakSeats = peakInOffice - primaryInOfficeHeadcount

    // Pass these calculated values to the return object
    return {
      focusOpenRSF: focusOpenRSF || 0,
      focusEnclosedRSF: focusEnclosedRSF || 0,
      collaborativeRSF: collaborativeRSF || 0,
      supportRSF: supportRSF || 0,
      wellnessRSF: wellnessRSF || 0,
      focusOpenUSF: focusOpenUSF || 0,
      focusEnclosedUSF: focusEnclosedUSF || 0,
      collaborativeUSF: collaborativeUSF || 0,
      supportUSF: supportUSF || 0,
      wellnessUSF: wellnessUSF || 0,
      focusUSF: focusUSF || 0,
      totalRSF: calculatedRSF || 0,
      totalUSF: totalUSF || 0,
      totalEmployees: kpis.planningHeadcount || 0,
      peakInOffice: peakInOffice || 0, // Use the newly calculated peakInOffice
      assignableWorkpoints: kpis.assignableWorkpoints || 0,
      peakSeatCoverage: kpis.peakSeatCoverage || 0,
      dedicatedSeats: dedicatedSeats || 0,
      privateOffices: privateOffices || 0,
      totalSpaces: totalSpaces || 0,
      rsfPerPerson: rsfPerPerson || 0,
      desks: kpis.desks || 0,
      offices: kpis.offices || 0,
      flex: kpis.flex || 0,
      meetingSeats: kpis.meetingSeats || 0,
      phoneBooths: kpis.phoneBooths || 0,
      totalWorkpoints: kpis.totalWorkpoints || 0, // Added for Workpoints card
      totalDesks: kpis.desks || 0, // Added for Workpoints card
      totalOffices: kpis.offices || 0, // Added for Workpoints card
      totalFlex: kpis.flex || 0, // Added for Workpoints card
      assignableSeats,
      peakInOffice, // Use the newly calculated peakInOffice
      vsPeakSeats,
      recommendedRSF: targetHeadcount * rsfPerPerson,
      rsfDifference: calculatedRSF - targetHeadcount * rsfPerPerson,
      rsfVariancePercent:
        targetHeadcount * rsfPerPerson !== 0
          ? (Math.abs(calculatedRSF - targetHeadcount * rsfPerPerson) /
              (targetHeadcount * rsfPerPerson)) *
            100
          : 0,
      totalSpaceStatus: { text: "", color: "", bg: "" }, // Placeholder, will be calculated below
    }
  }, [editableSpaces, loadFactor, rsfPerPerson, config.hybrid, config.daysInOffice, targetHeadcount])

  const totalSpaceStatus = useMemo(() => {
    const recommendedRSF = targetHeadcount * rsfPerPerson
    const rsfDifference = newEditableTotals.totalRSF - recommendedRSF
    const rsfVariancePercent = recommendedRSF !== 0 ? Math.abs(rsfDifference / recommendedRSF) * 100 : 0

    if (rsfVariancePercent <= 10) return { text: "On Track", color: "text-green-600", bg: "bg-green-100" }
    if (rsfVariancePercent <= 20) return { text: "Review", color: "text-yellow-600", bg: "bg-yellow-100" }
    return { text: "Over Target", color: "text-red-600", bg: "bg-red-100" }
  }, [newEditableTotals.totalRSF, targetHeadcount, rsfPerPerson])

  // Update newEditableTotals with the calculated totalSpaceStatus
  const finalEditableTotals = useMemo(
    () => ({
      ...newEditableTotals,
      totalSpaceStatus,
    }),
    [newEditableTotals, totalSpaceStatus],
  )

  const zoneColors = {
    "Focus Open": {
      bg: "bg-cyan-50",
      border: "border-cyan-200",
      dot: "bg-cyan-400",
      text: "text-cyan-700",
      total: "bg-cyan-100",
    },
    "Focus Enclosed": {
      bg: "bg-teal-50",
      border: "border-teal-200",
      dot: "bg-teal-600",
      text: "text-teal-700",
      total: "bg-teal-100",
    },
    Collaborative: {
      bg: "bg-green-50",
      border: "border-green-200",
      dot: "bg-green-500",
      text: "text-green-700",
      total: "bg-green-100",
    },
    Support: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      dot: "bg-amber-500",
      text: "text-amber-700",
      total: "bg-amber-100",
    },
    Wellness: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      dot: "bg-purple-500",
      text: "text-purple-700",
      total: "bg-purple-100",
    },
  }

  const addDepartment = () => {
    const newId = (departments.length + 1).toString()
    const colors = ["bg-indigo-500", "bg-pink-500", "bg-yellow-500", "bg-cyan-500", "bg-lime-500"]
    const newDept: Department = {
      id: newId,
      name: `Department ${newId}`,
      color: colors[Math.floor(Math.random() * colors.length)],
      headcount: 0,
      officeCount: 0,
      hybridWorkers: 0,
      workstations: 0,
    }
    setDepartments([...departments, newDept])
  }

  type DeptField = "headcount" | "officeCount" | "hybridWorkers" | "workstations" | "futureHeadcount"

  const updateDepartmentTarget = (deptId: string, field: DeptField, change: number) => {
    setDepartments((prev) =>
      prev.map((d) => {
        if (d.id !== deptId) return d
        // For futureHeadcount, default to current headcount if not set yet.
        const current =
          field === "futureHeadcount"
            ? d.futureHeadcount ?? d.headcount ?? 0
            : d[field] ?? 0
        const nextValue = Math.max(0, current + change)
        return { ...d, [field]: nextValue }
      }),
    )
  }

  const setDepartmentTarget = (deptId: string, field: DeptField, value: number) => {
    setDepartments((prev) =>
      prev.map((d) => {
        if (d.id !== deptId) return d
        const clamped = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0))
        return { ...d, [field]: clamped }
      }),
    )
  }

  const duplicateDepartment = (deptId: string) => {
    const dept = departments.find((d) => d.id === deptId)
    if (dept) {
      const newId = (departments.length + 1).toString()
      const newDept: Department = {
        ...dept,
        id: newId,
        name: `${dept.name} Copy`,
      }
      setDepartments([...departments, newDept])
    }
  }

  const deleteDepartment = (deptId: string) => {
    setDepartments(departments.filter((d) => d.id !== deptId))
    const updatedSpaces = { ...editableSpaces }
    Object.keys(updatedSpaces).forEach((spaceKey) => {
      updatedSpaces[spaceKey] = {
        ...updatedSpaces[spaceKey],
        departmentAllocations: (updatedSpaces[spaceKey].departmentAllocations || []).filter(
          (alloc) => alloc.departmentId !== deptId,
        ),
      }
    })
    setEditableSpaces(updatedSpaces)
  }

  const updateDepartmentName = (deptId: string, newName: string) => {
    setDepartments(departments.map((d) => (d.id === deptId ? { ...d, name: newName } : d)))
  }

  const updateSpace = (spaceKey: string, updates: Partial<EditableSpace>) => {
    setEditableSpaces((prev) => ({
      ...prev,
      [spaceKey]: {
        ...prev[spaceKey],
        ...updates,
      },
    }))
  }

  /**
   * Recalibrate: walks every space and computes a recommended quantity from
   * the active Configuration Targets, then opens a preview modal so the user
   * can review (and selectively apply) the changes.
   *
   * - Honors the same recommendation rules used by individual SpaceCards
   *   (workspaceType-based for employee/private/flex, ratio-based otherwise).
   * - When growth planning is on, recalibration aims at FUTURE state by
   *   substituting future-derived totals computed from per-department
   *   futureHeadcount values (same math the KPI tiles use).
   * - Smart-zero: if effective hybrid workers is 0, recommend 0 for any
   *   "flex" / hoteling / workpoint card so we don't fight a zero brief.
   */
  const buildRecalibratePreview = (): RecalibrateChange[] => {
    // When growth planning is on, use sum of per-department future headcounts.
    const futureAllocHeadcount = departments.reduce(
      (s, d) => s + (d.futureHeadcount ?? d.headcount ?? 0),
      0
    )
    const effHeadcount = planForGrowth ? futureAllocHeadcount : targetHeadcount
    if (effHeadcount === 0) return []

    // Build SummaryInputs from current canvas state and run the FT engine.
    const effInputs: SummaryInputs = {
      clientName: projectInfo.client || "",
      programmedBy: projectInfo.designedBy || "",
      totalHeadcount: effHeadcount,
      fullyRemote: Math.round(effHeadcount * ((config.fullyRemoteEmployees || 0) / 100)),
      percentOffices: config.percentOffices ?? 15,
      grossRent: 50,
      daysInOffice: config.daysInOffice ?? 4,
      rentableFactor: loadFactor - 1,
    }
    const blocks = computeAllSeatDemandBlocks(effInputs.totalHeadcount, effInputs.fullyRemote)
    const program = computeSpaceProgram(effInputs, blocks, undefined, ratioConfig)

    // Build a name → FT quantity map so we can match by space name.
    const ftByName = new Map(
      [...program.individual, ...program.collaborative, ...program.support].map(
        (item) => [item.name, item.quantity]
      )
    )

    const changes: RecalibrateChange[] = []
    Object.entries(editableSpaces).forEach(([spaceKey, space]) => {
      const spaceName = space.customName || space.name
      const ftQty = ftByName.get(spaceName)
      if (ftQty === undefined) return // no FT counterpart — leave untouched
      if (ftQty !== space.quantity) {
        changes.push({
          spaceKey,
          name: spaceName,
          zone: space.zone,
          workspaceType: space.workstationType,
          currentQty: space.quantity,
          recommendedQty: ftQty,
          selected: true,
        })
      }
    })
    return changes
  }

  const openRecalibratePreview = () => {
    const changes = buildRecalibratePreview()
    setRecalibratePreview(changes)
  }

  const applyRecalibration = () => {
    if (!recalibratePreview) return
    const selected = recalibratePreview.filter((c) => c.selected)
    if (selected.length === 0) {
      setRecalibratePreview(null)
      return
    }
    setEditableSpaces((prev) => {
      const next = { ...prev }
      selected.forEach((c) => {
        if (next[c.spaceKey]) {
          const sf = next[c.spaceKey].sfEach || 0
          next[c.spaceKey] = {
            ...next[c.spaceKey],
            quantity: c.recommendedQty,
            totalArea: c.recommendedQty * sf,
          }
        }
      })
      // Reset divergence baseline so dots clear after Recalibrate
      ftBaselineRef.current = new Map(
        Object.values(next).map((s) => [s.name, { quantity: s.quantity, sfEach: s.sfEach }])
      )
      return next
    })
    setRecalibratePreview(null)
  }

  const toggleRecalibrateRow = (spaceKey: string) => {
    setRecalibratePreview((prev) =>
      prev
        ? prev.map((c) => (c.spaceKey === spaceKey ? { ...c, selected: !c.selected } : c))
        : prev
    )
  }

  const toggleAllRecalibrateRows = (selected: boolean) => {
    setRecalibratePreview((prev) =>
      prev ? prev.map((c) => ({ ...c, selected })) : prev
    )
  }

  // -------- Scenario helpers --------

  // Capture current state into a serializable snapshot. Uses JSON-clone to
  // ensure the snapshot is fully decoupled from live state mutations.
  const captureSnapshot = (): ScenarioSnapshot => ({
    departments: JSON.parse(JSON.stringify(departments)),
    targetHeadcount,
    targetOfficeCount,
    targetWorkstations,
    targetHybridWorkers,
    editableSpaces: JSON.parse(JSON.stringify(editableSpaces)),
    zoneCirculation: JSON.parse(JSON.stringify(zoneCirculation)),
    planForGrowth,
    ratioConfig: { ...ratioConfig },
  })

  // Apply a snapshot back into live state.
  const applySnapshot = (snap: ScenarioSnapshot) => {
    setDepartments(JSON.parse(JSON.stringify(snap.departments)))
    setTargetHeadcount(snap.targetHeadcount)
    setTargetOfficeCount(snap.targetOfficeCount)
    setTargetWorkstations(snap.targetWorkstations)
    setTargetHybridWorkers(snap.targetHybridWorkers)
    setEditableSpaces(JSON.parse(JSON.stringify(snap.editableSpaces)))
    setZoneCirculation(JSON.parse(JSON.stringify(snap.zoneCirculation)))
    setPlanForGrowth(snap.planForGrowth)
    if (snap.ratioConfig) setRatioConfig(snap.ratioConfig)
  }

  const saveCurrentAsNewScenario = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const id = `scn_${Date.now()}`
    const scenario: Scenario = {
      id,
      name: trimmed,
      createdAt: new Date().toISOString(),
      snapshot: captureSnapshot(),
    }
    setScenarios((prev) => [...prev, scenario])
    setActiveScenarioId(id)
    setSavingNewScenario(false)
    setNewScenarioName("")
  }

  // Overwrite the active scenario with the current live state.
  const overwriteActiveScenario = () => {
    if (!activeScenarioId) return
    const snap = captureSnapshot()
    setScenarios((prev) =>
      prev.map((s) => (s.id === activeScenarioId ? { ...s, snapshot: snap } : s))
    )
  }

  const switchToScenario = (id: string) => {
    const target = scenarios.find((s) => s.id === id)
    if (!target) return
    applySnapshot(target.snapshot)
    setActiveScenarioId(id)
    setScenarioMenuOpen(false)
    // Don't auto-clear comparison — user may be intentionally comparing the
    // newly active scenario against the same baseline. But if they're the
    // same, clear it to avoid a useless 0-delta readout.
    if (comparisonScenarioId === id) setComparisonScenarioId(null)
  }

  const duplicateScenario = (id: string) => {
    const orig = scenarios.find((s) => s.id === id)
    if (!orig) return
    const newId = `scn_${Date.now()}`
    setScenarios((prev) => [
      ...prev,
      {
        id: newId,
        name: `${orig.name} copy`,
        createdAt: new Date().toISOString(),
        snapshot: JSON.parse(JSON.stringify(orig.snapshot)),
      },
    ])
  }

  const renameScenario = (id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, name: trimmed } : s)))
    setRenamingScenarioId(null)
    setRenameValue("")
  }

  const deleteScenario = (id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id))
    if (activeScenarioId === id) setActiveScenarioId(null)
    if (comparisonScenarioId === id) setComparisonScenarioId(null)
  }

  // Compute aggregate metrics from a snapshot for comparison readouts.
  const snapshotMetrics = (snap: ScenarioSnapshot) => {
    const totalUSF = Object.values(snap.editableSpaces).reduce(
      (sum, sp) => sum + (sp.totalArea || 0),
      0
    )
    const totalHeadcount = snap.targetHeadcount
    return { totalUSF, totalHeadcount }
  }

  const toggleDedicatedStatus = (spaceKey: string) => {
    setEditableSpaces((prev) => ({
      ...prev,
      [spaceKey]: {
        ...prev[spaceKey],
        isDedicated: !prev[spaceKey].isDedicated,
      },
    }))
  }

  const duplicateSpace = (spaceKey: string) => {
    const space = editableSpaces[spaceKey]
    if (!space) return

    const newKey = `${spaceKey}_copy_${Date.now()}`
    setEditableSpaces((prev) => ({
      ...prev,
      [newKey]: {
        ...space,
        quantity: 1,
        notes: `${space.notes} (Copy)`.trim(),
        customName: `${space.customName || space.name} Copy`, // Also copy custom name
      },
    }))
  }

  const deleteSpace = (spaceKey: string) => {
    setEditableSpaces((prev) => {
      const newSpaces = { ...prev }
      delete newSpaces[spaceKey]
      return newSpaces
    })
  }

  // Phase 3: Add a new space from a preset into the given zone.
  const addSpace = (
    zone: string,
    preset: { name: string; sfEach: number; capacity: number; workspaceType?: "employee" | "private" | "flex" | null },
  ) => {
    const slug = preset.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
    const key = `custom_${Date.now()}_${slug}`
    setEditableSpaces((prev) => ({
      ...prev,
      [key]: {
        id: key,
        name: preset.name,
        zone,
        quantity: 1,
        capacity: preset.capacity,
        sfEach: preset.sfEach,
        totalArea: preset.sfEach,
        workspaceType: preset.workspaceType ?? null,
        notes: "",
        ratio: "1:1",
        departmentAllocations: [],
        customName: preset.name,
        isActive: true,
      },
    }))
    setAddSpaceDialog({ open: false, zone: "" })
  }

  // Phase 4: Zero out all spaces (start blank).
  const clearAllSpaces = () => {
    setEditableSpaces((prev) => {
      const cleared: Record<string, EditableSpace> = {}
      Object.entries(prev).forEach(([key, space]) => {
        cleared[key] = { ...space, quantity: 0, totalArea: 0, isActive: false }
      })
      return cleared
    })
    setQuickGenOpen(false)
  }

  // Phase 4: Run the Fast Track engine with minimal inputs and seed the canvas.
  const handleQuickGenerate = () => {
    const hc = parseInt(quickGen.headcount, 10)
    if (!hc || hc < 1) return

    const inputs: SummaryInputs = {
      clientName: projectInfo.client || "",
      programmedBy: projectInfo.designedBy || "",
      totalHeadcount: hc,
      fullyRemote: 0,
      percentOffices: 15,
      grossRent: 50,
      daysInOffice: quickGen.daysInOffice,
      rentableFactor: loadFactor - 1,
    }

    try {
      const blocks = computeAllSeatDemandBlocks(hc, 0)
      const program = computeSpaceProgram(inputs, blocks, undefined, ratioConfig)
      const result = convertProgramToSpaces(program, inputs)

      setTargetHeadcount(hc)
      setTargetOfficeCount(result.targets.officeCount)
      setTargetWorkstations(result.targets.workstationCount)
      setTargetHybridWorkers(result.targets.hybridWorkers)
      setEditableSpaces(result.spaces as Record<string, EditableSpace>)
      setProgramMetrics({ generated: true })
    } catch (err) {
      console.error("[quickGen] Failed to generate program:", err)
    }
    setQuickGenOpen(false)
  }

  const onDragEnd = (result: any) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result

    if (source.droppableId !== destination.droppableId) {
      setEditableSpaces((prev) => {
        const updatedSpaces = { ...prev }
        const spaceToMove = updatedSpaces[draggableId]
        if (spaceToMove) {
          spaceToMove.zone = destination.droppableId
        }
        return updatedSpaces
      })
    }
  }

  const SpaceCard = ({
    space,
    spaceKey,
    updateSpace,
    toggleDedicatedStatus,
    departments,
    departmentExpansionState,
    setDepartmentExpansionState,
    configuredByDeptAndType,
    plannedByType,
  }: SpaceCardProps) => {
    const [isNotesExpanded, setIsNotesExpanded] = useState(false)
    const [notes, setNotes] = useState(space.notes || "")
    const [departmentAllocations, setDepartmentAllocations] = useState<DepartmentAllocation[]>(
      space.departmentAllocations || [],
    )
    const isDepartmentExpanded = departmentExpansionState[spaceKey] || false

    const zone = space.zone || "Focus Open"
    const zoneColor = zoneColors[zone]
    const [editingName, setEditingName] = useState(false)
    const [tempName, setTempName] = useState(space.customName || space.name)

    const totalAllocated = departmentAllocations.reduce((sum, alloc) => sum + alloc.count, 0)
    const unassigned = Math.max(0, space.quantity - totalAllocated)

    const updateDepartmentAllocation = (departmentId: string, change: number) => {
      const currentAlloc = departmentAllocations.find((a) => a.departmentId === departmentId)
      const currentCount = currentAlloc?.count || 0
      const newCount = Math.max(0, Math.min(space.quantity, currentCount + change))

      let newAllocations: DepartmentAllocation[]
      if (newCount === 0) {
        newAllocations = departmentAllocations.filter((a) => a.departmentId !== departmentId)
      } else {
        if (currentAlloc) {
          newAllocations = departmentAllocations.map((a) =>
            a.departmentId === departmentId ? { ...a, count: newCount } : a,
          )
        } else {
          newAllocations = [...departmentAllocations, { departmentId, count: newCount }]
        }
      }

      setDepartmentAllocations(newAllocations)
      updateSpace(spaceKey, { departmentAllocations: newAllocations })
    }

    const setWorkstationType = (spaceKey: string, type: "employee" | "private" | "flex" | null) => {
      setEditableSpaces((prev) => ({
        ...prev,
        [spaceKey]: {
          ...prev[spaceKey],
          workstationType: type,
        },
      }))
    }

    const getRecommendationRatio = (spaceName: string) => {
      const name = spaceName.toLowerCase()
      if (name.includes("phone booth") || name.includes("focus booth")) return ratioConfig.phoneBoothRatio ?? 10
      return 50
    }

    const getTargetBasedRecommendation = (space: EditableSpace) => {
      const workspaceType = space.workstationType

      if (workspaceType === "employee") {
        // Workstations: Target Headcount - Target Office Count = Target Workstations
        return Math.max(0, targetHeadcount - targetOfficeCount)
      } else if (workspaceType === "flex") {
        // Hoteling Flex: Target Hybrid Workers = Target Hoteling Flex Stations
        return targetHybridWorkers
      } else if (workspaceType === "private") {
        // Private Offices: Target Office Count = Required Private Offices
        return targetOfficeCount
      } else {
        // For other space types (conference rooms, phone booths, etc.), use ratio-based calculation
        const ratioValue = getRecommendationRatio(space.name)
        return Math.ceil(targetHeadcount / ratioValue)
      }
    }

    const recommendedQuantity = getTargetBasedRecommendation(space)

    // FT engine divergence indicators (teal = qty, amber = sfEach)
    const ftBaselineEntry = ftBaseline.get(space.customName || space.name)
    const qtyDiverged = !!ftBaselineEntry && space.quantity !== ftBaselineEntry.quantity
    const sfDiverged = !!ftBaselineEntry && space.sfEach !== ftBaselineEntry.sfEach

    const delta = space.quantity - recommendedQuantity
    const percentDiff = recommendedQuantity !== 0 ? Math.abs(delta / recommendedQuantity) * 100 : 0

    let status = "on-track"
    let statusColor = "text-green-600"
    let statusBgColor = "bg-green-100"
    let statusIcon = "●"

    if (percentDiff > 20) {
      status = delta > 0 ? "over-target" : "under-target"
      statusColor = "text-red-600"
      statusBgColor = "bg-red-100"
      statusIcon = "●"
    } else if (percentDiff > 10) {
      status = "near-threshold"
      statusColor = "text-yellow-600"
      statusBgColor = "bg-yellow-100"
      statusIcon = "●"
    }

    const statusText =
      status === "on-track"
        ? "On Track"
        : status === "over-target"
          ? "Over Target"
          : status === "under-target"
            ? "Under Target"
            : "Near Threshold"

    // ── Compact premium SpaceCard ──
    const totalSF = (space.quantity || 0) * (space.sfEach || 0)
    const isCompact = canvasMode === "focus"

    return (
      <div className={`bg-white rounded-xl border overflow-hidden transition-shadow ${isCompact ? "border-slate-200 shadow-sm hover:shadow-md" : "border-slate-200 shadow-sm hover:shadow-md"}`}>
        {/* Coloured accent bar */}
        <div className={`h-1 w-full ${zoneColor.dot}`} />

        {/* Header row: name + actions */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {editingName ? (
              <input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={() => {
                  setEditingName(false)
                  updateSpace(spaceKey, { customName: tempName })
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setEditingName(false)
                    updateSpace(spaceKey, { customName: tempName })
                  } else if (e.key === "Escape") {
                    setTempName(space.customName || space.name)
                    setEditingName(false)
                  }
                }}
                className="flex-1 text-sm font-semibold text-slate-900 bg-transparent border-b border-slate-300 outline-none"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <h4
                  className="text-sm font-semibold text-slate-900 cursor-pointer hover:text-teal-700 truncate leading-tight"
                  onClick={() => setEditingName(true)}
                  title="Click to rename"
                >
                  {space.customName || space.name}
                </h4>
                {visibility.recommendations && (qtyDiverged || sfDiverged) && (
                  <span className="flex items-center gap-0.5 shrink-0" title={[
                    qtyDiverged && `Qty: ${space.quantity} (rec: ${ftBaselineEntry?.quantity})`,
                    sfDiverged && `SF: ${space.sfEach} (rec: ${ftBaselineEntry?.sfEach})`,
                  ].filter(Boolean).join(" · ")}>
                    {qtyDiverged && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block shrink-0" />}
                    {sfDiverged && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block shrink-0" />}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0 ml-1 opacity-0 hover:opacity-100 group-hover:opacity-100 [.bg-white:hover_&]:opacity-100">
            <button
              onClick={() => duplicateSpace(spaceKey)}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              title="Duplicate"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2"/>
                <path strokeWidth="2" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <button onClick={() => deleteSpace(spaceKey)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500" title="Delete">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Metrics row: Qty | SF ea | Total SF */}
        <div className="flex divide-x divide-slate-100 border-t border-slate-100">
          {/* Qty */}
          <div className="flex-1 px-2 py-2 min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">Qty</div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => { const q = Math.max(1, space.quantity - 1); updateSpace(spaceKey, { quantity: q, totalArea: q * space.sfEach }) }}
                className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0"
              >−</button>
              <input
                type="number"
                value={space.quantity}
                onChange={(e) => {
                  const q = Math.max(1, Number.parseInt(e.target.value) || 1)
                  updateSpace(spaceKey, { quantity: q, totalArea: q * space.sfEach })
                }}
                className="w-0 flex-1 text-center text-sm font-bold text-slate-900 tabular-nums bg-transparent border-none outline-none"
              />
              <button
                onClick={() => { const q = space.quantity + 1; updateSpace(spaceKey, { quantity: q, totalArea: q * space.sfEach }) }}
                className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0"
              >+</button>
            </div>
          </div>

          {/* SF ea */}
          <div className="flex-1 px-2 py-2 min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">SF ea</div>
            <div className="flex items-center gap-0.5">
              <button
                title="Shift-click for ±10"
                onClick={(e) => { const sf = Math.max(1, space.sfEach - (e.shiftKey ? 10 : 1)); updateSpace(spaceKey, { sfEach: sf, totalArea: space.quantity * sf }) }}
                className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0"
              >−</button>
              <input
                type="number"
                value={space.sfEach}
                onChange={(e) => { const sf = Math.max(1, Number.parseInt(e.target.value) || 1); updateSpace(spaceKey, { sfEach: sf, totalArea: space.quantity * sf }) }}
                className="w-0 flex-1 text-center text-sm font-semibold text-slate-900 tabular-nums bg-transparent border-none outline-none"
              />
              <button
                title="Shift-click for ±10"
                onClick={(e) => { const sf = space.sfEach + (e.shiftKey ? 10 : 1); updateSpace(spaceKey, { sfEach: sf, totalArea: space.quantity * sf }) }}
                className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0"
              >+</button>
            </div>
          </div>

          {/* Total SF — wider, zone-tinted */}
          <div className={`flex-[1.4] px-2 py-2 ${zoneColor.bg} min-w-0`}>
            <div className={`text-[9px] font-semibold uppercase tracking-[0.12em] mb-1 ${zoneColor.text} opacity-70`}>Total SF</div>
            <div className={`text-sm font-bold tabular-nums ${zoneColor.text} truncate`}>
              {totalSF.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Capacity row — only when visibility.capacity is on */}
        {visibility?.capacity && (
          <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Capacity</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateSpace(spaceKey, { capacity: Math.max(1, space.capacity - 1) })}
                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600"
              >−</button>
              <input
                type="number"
                value={space.capacity}
                onChange={(e) => updateSpace(spaceKey, { capacity: Math.max(1, Number.parseInt(e.target.value) || 1) })}
                className="w-10 text-center text-sm font-semibold text-slate-900 bg-transparent border-none outline-none"
              />
              <button
                onClick={() => updateSpace(spaceKey, { capacity: space.capacity + 1 })}
                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600"
              >+</button>
            </div>
          </div>
        )}

        {/* Workspace type chips — only in Workbench mode when visibility.workspaceType is on */}
        {visibility?.workspaceType && canvasMode !== "focus" && (
          <div className="px-3 py-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mr-0.5">Type</span>
              {(["employee", "private", "flex"] as const).map((type) => {
                const labels = { employee: "Workstation", private: "Private Office", flex: "Hoteling/Flex" }
                const targets = { employee: "Workstations", private: "Offices", flex: "Hybrid" }
                const chipColors = {
                  employee: { on: "bg-blue-100 text-blue-700 border-blue-200", off: "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100" },
                  private: { on: "bg-purple-100 text-purple-700 border-purple-200", off: "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100" },
                  flex: { on: "bg-green-100 text-green-700 border-green-200", off: "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100" },
                }
                const isSelected = space.workstationType === type
                return (
                  <button
                    key={type}
                    onClick={() => updateSpace(spaceKey, { workstationType: isSelected ? null : type })}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${isSelected ? chipColors[type].on : chipColors[type].off}`}
                    title={isSelected ? `Remove ${targets[type]} mapping` : `Map to ${targets[type]} target`}
                  >
                    {labels[type]}
                    {isSelected && <span className="opacity-60">×</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Department allocation — shown when allocations toggle is on */}
        <div className={visibility?.allocations && canvasMode !== "focus" ? "px-3 py-2 border-t border-slate-100" : ""}>
          {visibility?.departmentManagement && canvasMode !== "focus" && !visibility?.allocations && (
            <button
              onClick={() => setDepartmentExpansionState((prev) => ({ ...prev, [spaceKey]: !isDepartmentExpanded }))}
              className="flex items-center justify-between w-full text-left px-3 py-2 border-t border-slate-100"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Dept Allocation</div>
              <svg
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDepartmentExpanded ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          {visibility?.allocations && canvasMode !== "focus" && (
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Dept Allocation</div>
          )}

            {canvasMode !== "focus" && ((isDepartmentExpanded && visibility?.departmentManagement) || visibility?.allocations) && (() => {
              // Cascade bridge: show how this card's allocations relate to
              // the department-level plan and the company target.
              const wsType = space.workstationType as "employee" | "private" | "flex" | undefined
              // Per-department planned values for this workspace type come directly
              // from the Department Manager (headcount is used as a fallback when
              // there's no workspace type yet, since card quantity is the unit here).
              const plannedField: keyof Department | null =
                wsType === "private"
                  ? "officeCount"
                  : wsType === "employee"
                    ? "workstations"
                    : wsType === "flex"
                      ? "hybridWorkers"
                      : null
              const configuredForType = wsType ? configuredByDeptAndType[wsType] : undefined
              const configuredTotalForType = configuredForType
                ? Object.values(configuredForType).reduce((s, n) => s + n, 0)
                : 0
              const plannedTotalForType = wsType ? plannedByType[wsType] : 0
              const typeLabel =
                wsType === "employee"
                  ? "Employee Workstation"
                  : wsType === "private"
                    ? "Private Office"
                    : wsType === "flex"
                      ? "Hoteling/Flex"
                      : null
              return (
                <div className="mt-2 space-y-2">
                  {wsType && typeLabel && (
                    <div className="flex items-center justify-between rounded-md bg-gray-50 border border-gray-200 px-2.5 py-1.5 text-[11px]">
                      <span className="text-gray-600">
                        Across all <span className="font-medium text-gray-800">{typeLabel}</span> cards
                      </span>
                      <span className="tabular-nums font-semibold text-gray-900">
                        {configuredTotalForType}
                        <span className="text-gray-400 font-normal"> / {plannedTotalForType} planned</span>
                      </span>
                    </div>
                  )}
                  {departments.map((dept) => {
                    const allocation = departmentAllocations.find((a) => a.departmentId === dept.id)
                    const count = allocation?.count || 0
                    const deptConfigured = configuredForType ? configuredForType[dept.id] || 0 : 0
                    const deptPlanned = plannedField ? (dept[plannedField] as number) : 0

                    return (
                      <div key={dept.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-3 h-3 rounded-full ${dept.color} shrink-0`}></div>
                          <span className="text-sm text-gray-700 truncate">{dept.name}</span>
                          {wsType && deptPlanned > 0 && (
                            <span
                              className="text-[10px] text-gray-400 tabular-nums"
                              title={`Planned for ${dept.name}: ${deptPlanned}. Configured across all ${typeLabel} cards: ${deptConfigured}.`}
                            >
                              {deptConfigured}/{deptPlanned}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateDepartmentAllocation(dept.id, -1)}
                            className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium"
                            disabled={count === 0}
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{count}</span>
                          <button
                            onClick={() => updateDepartmentAllocation(dept.id, 1)}
                            className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium"
                            disabled={totalAllocated >= space.quantity}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {unassigned > 0 && (
                    <div className="text-sm text-orange-600 font-medium">{unassigned} unassigned</div>
                  )}
                </div>
              )
            })()}
          </div>

        {/* Recommendation badge — compact, shown when Recommendations toggle is on */}
        {visibility?.recommendations && recommendedQuantity > 0 && (
          <div className="px-3 py-1.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Rec: <span className="font-semibold text-slate-600">{recommendedQuantity}</span></span>
            {space.quantity !== recommendedQuantity && (
              <span className={`text-[10px] font-semibold tabular-nums ${space.quantity > recommendedQuantity ? "text-amber-600" : "text-blue-600"}`}>
                {space.quantity > recommendedQuantity ? "+" : ""}{space.quantity - recommendedQuantity}
              </span>
            )}
          </div>
        )}

        {/* Notes — Workbench only */}
        {canvasMode !== "focus" && (
          <div className="border-t border-slate-100">
            <button
              onClick={() => setIsNotesExpanded(!isNotesExpanded)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 w-full text-left"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Notes {isNotesExpanded ? "▲" : "▼"}
            </button>
            {isNotesExpanded && (
              <div className="px-3 pb-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => updateSpace(spaceKey, { notes })}
                  placeholder="Add notes about this space..."
                  className="w-full p-2 text-xs border border-slate-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-teal-400"
                  rows={2}
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const ZoneHeader = ({
    title,
    usf,
    totalUSF,
    color,
    circulation,
    onCirculationChange,
    viewMode,
    onViewModeChange,
    onAddSpace,
    gapBadges,
  }: {
    title: string
    usf: number
    totalUSF: number
    color: string
    circulation: number
    onCirculationChange: (value: number) => void
    viewMode?: ZoneViewMode
    onViewModeChange?: (mode: ZoneViewMode) => void
    onAddSpace?: () => void
    gapBadges?: { label: string; configured: number; target: number }[]
  }) => {
    const percentage = totalUSF > 0 ? Math.round((usf / totalUSF) * 100) : 0

    return (
      <div className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`}></div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
              <span>
                {title}
                <span className="text-gray-400 font-normal">{" \u00B7 "}</span>
                <span className="tabular-nums text-gray-700">{usf.toLocaleString()}</span>
                <span className="text-gray-400 font-normal text-sm ml-1">USF</span>
                <span className="text-gray-400 font-normal text-sm ml-2">({percentage}%)</span>
              </span>
              {gapBadges && gapBadges.map(({ label, configured, target }) => {
                if (target === 0) return null
                const gap = target - configured
                const met = gap <= 0
                return (
                  <span
                    key={label}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${
                      met ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                    title={`${label}: ${configured} configured of ${target} target`}
                  >
                    {met ? "\u2713" : "\u26A0"} {configured}/{target} {label}
                  </span>
                )
              })}
            </h3>
          </div>

          <div className="flex items-center gap-3">

            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">Circulation</span>
              <div className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-1 py-0.5 shadow-sm">
                <button
                  onClick={() => onCirculationChange(Math.max(0, circulation - 5))}
                  className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-700"
                  aria-label="Decrease circulation"
                >
                  −
                </button>
                <span className="text-sm font-semibold w-10 text-center tabular-nums text-gray-900">
                  {circulation}%
                </span>
                <button
                  onClick={() => onCirculationChange(Math.min(100, circulation + 5))}
                  className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-700"
                  aria-label="Increase circulation"
                >
                  +
                </button>
              </div>
            </div>

            {onAddSpace && (
              <button
                onClick={onAddSpace}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Space
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  /**
   * ZoneTable: high-density, inline-editable alternative to the card masonry.
   *
   * Designed to show MORE data than cards, not less. Includes everything the
   * card surfaces (name, type, quantity, capacity, sf each, total, status) plus
   * a column for every department so allocations can be edited in-line. The
   * whole table scrolls horizontally inside its zone container; the "Space"
   * column is sticky-left so you don't lose orientation while scrolling.
   *
   * Lives inside Home so it has direct access to editableSpaces, departments,
   * targets, and the same recommendation rules used elsewhere.
   */
  const ZoneTable = ({
    zoneSpaceEntries,
    focusMode = false,
    visibility: visibilitySettings = {
      allocations: true,
      departmentManagement: true,
      workspaceType: true,
      capacity: true,
      recommendations: true,
      growth: true,
    },
  }: {
    zoneSpaceEntries: [string, EditableSpace][]
    focusMode?: boolean
    visibility?: VisibilitySettings
  }) => {
    const ratioFor = (name: string) => {
      const n = name.toLowerCase()
      if (n.includes("phone booth") || n.includes("focus booth")) return ratioConfig.phoneBoothRatio ?? 10
      return 50
    }
    const recommendQty = (space: EditableSpace) => {
      const wt = space.workstationType
      if (wt === "employee") return Math.max(0, targetHeadcount - targetOfficeCount)
      if (wt === "flex") return targetHybridWorkers
      if (wt === "private") return targetOfficeCount
      const ratio = ratioFor(space.customName || space.name)
      if (!ratio || targetHeadcount === 0) return 0
      return Math.ceil(targetHeadcount / ratio)
    }

    // Mirrors SpaceCard's updateDepartmentAllocation merge semantics:
    //  - 0 removes the alloc entry
    //  - existing entry: update count
    //  - new entry: append
    // Clamped to [0, space.quantity] so total allocated never exceeds quantity.
    const updateDeptAlloc = (
      spaceKey: string,
      space: EditableSpace,
      deptId: string,
      change: number
    ) => {
      const allocations = space.departmentAllocations || []
      const current = allocations.find((a) => a.departmentId === deptId)
      const currentCount = current?.count || 0
      const totalAllocated = allocations.reduce((s, a) => s + a.count, 0)
      const remaining = Math.max(0, space.quantity - totalAllocated)
      // Cap upward change by remaining capacity for this card.
      const maxIncrease = remaining
      const clampedChange =
        change > 0 ? Math.min(change, maxIncrease) : Math.max(change, -currentCount)
      const newCount = currentCount + clampedChange
      let next: typeof allocations
      if (newCount === 0) {
        next = allocations.filter((a) => a.departmentId !== deptId)
      } else if (current) {
        next = allocations.map((a) =>
          a.departmentId === deptId ? { ...a, count: newCount } : a
        )
      } else {
        next = [...allocations, { departmentId: deptId, count: newCount }]
      }
      updateSpace(spaceKey, { departmentAllocations: next })
    }

    const typePill = (wt?: "employee" | "private" | "flex" | null) => {
      if (!wt)
        return (
          <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-medium uppercase tracking-wider">
            —
          </span>
        )
      const styles =
        wt === "employee"
          ? "bg-amber-100 text-amber-700"
          : wt === "private"
            ? "bg-slate-200 text-slate-700"
            : "bg-emerald-100 text-emerald-700"
      const label = wt === "employee" ? "Employee" : wt === "private" ? "Private" : "Flex"
      return (
        <span className={`inline-block px-1.5 py-0.5 rounded ${styles} text-[10px] font-semibold uppercase tracking-wider`}>
          {label}
        </span>
      )
    }

    // In Focus mode only show Space / Qty / SF Each / Total SF
    const focusCols = focusMode
    const deptCols = !focusCols && departments

    return (
      <div className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr className="bg-slate-50">
                {/* Sticky-left so Space name stays visible while scrolling right */}
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 min-w-[220px]">
                  Space
                </th>
                {!focusCols && (
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    Type
                  </th>
                )}
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center">
                  Qty
                </th>
                {!focusCols && (
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center">
                    Cap.
                  </th>
                )}
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center">
                  SF Each
                </th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-right">
                  Total SF
                </th>
                {!focusCols && (
                  <>
                    <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center">
                      Alloc.
                    </th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center">
                      Status
                    </th>
                  </>
                )}
                {/* One column per department — Workbench only */}
                {deptCols && departments.map((dept) => (
                  <th
                    key={dept.id}
                    className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center min-w-[110px]"
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${dept.color}`} />
                      <span className="truncate max-w-[80px]" title={dept.name}>
                        {dept.name}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2.5 border-b border-slate-200 w-8" />
              </tr>
            </thead>
            <tbody>
              {zoneSpaceEntries.length === 0 && (
                <tr>
                  <td
                    colSpan={focusCols ? 4 : 9 + departments.length}
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    No spaces in this zone yet.
                  </td>
                </tr>
              )}
              {zoneSpaceEntries.map(([spaceKey, space]) => {
                const recQty = recommendQty(space)
                const delta = space.quantity - recQty
                const variance = recQty > 0 ? Math.abs(delta) / recQty : 0

                // FT engine divergence indicators
                const ftEntry = ftBaseline.get(space.customName || space.name)
                const rowQtyDiverged = !!ftEntry && space.quantity !== ftEntry.quantity
                const rowSfDiverged = !!ftEntry && space.sfEach !== ftEntry.sfEach
                const rowDiverged = visibilitySettings.recommendations && (rowQtyDiverged || rowSfDiverged)

                const status =
                  recQty === 0 && space.quantity === 0
                    ? { label: "Idle", color: "bg-slate-100 text-slate-500" }
                    : variance <= 0.1
                      ? { label: "On track", color: "bg-emerald-100 text-emerald-700" }
                      : variance <= 0.2
                        ? { label: "Near", color: "bg-amber-100 text-amber-700" }
                        : {
                            label: delta > 0 ? "Over" : "Under",
                            color: "bg-red-100 text-red-700",
                          }

                const totalAllocated = (space.departmentAllocations || []).reduce(
                  (s, a) => s + a.count,
                  0
                )
                const allocStatus =
                  space.quantity === 0
                    ? "text-slate-400"
                    : totalAllocated === space.quantity
                      ? "text-emerald-700"
                      : totalAllocated > space.quantity
                        ? "text-red-700"
                        : "text-amber-700"

                return (
                  <tr
                    key={spaceKey}
                    className={`hover:bg-slate-50/60 transition-colors group ${rowDiverged ? "bg-amber-50/30" : ""}`}
                  >
                    {/* Space name — sticky left */}
                    <td className={`sticky left-0 z-10 px-4 py-2 border-b border-slate-100 min-w-[220px] ${rowDiverged ? "bg-amber-50/40 group-hover:bg-amber-50/60" : "bg-white group-hover:bg-slate-50/60"}`}>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={space.customName || space.name}
                          onChange={(e) =>
                            updateSpace(spaceKey, { customName: e.target.value })
                          }
                          className="text-sm font-medium text-slate-900 bg-transparent border-none focus:outline-none focus:bg-slate-100 rounded px-1 py-0.5 flex-1 min-w-0"
                        />
                        {rowDiverged && (
                          <span className="flex items-center gap-0.5 shrink-0" title={[
                            rowQtyDiverged && `Qty: ${space.quantity} (recommended: ${ftEntry?.quantity})`,
                            rowSfDiverged && `SF: ${space.sfEach} (recommended: ${ftEntry?.sfEach})`,
                          ].filter(Boolean).join(" · ")}>
                            {rowQtyDiverged && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />}
                            {rowSfDiverged && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
                          </span>
                        )}
                      </div>
                    </td>
                    {!focusCols && (
                      <td className="px-3 py-2 border-b border-slate-100">
                        {visibilitySettings.workspaceType && typePill(space.workstationType)}
                      </td>
                    )}
                    {/* Quantity */}
                    <td className="px-3 py-2 border-b border-slate-100">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateSpace(spaceKey, {
                              quantity: Math.max(0, space.quantity - 1),
                              totalArea:
                                Math.max(0, space.quantity - 1) * (space.sfEach || 0),
                            })
                          }
                          className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <NumberField
                          value={space.quantity}
                          onChange={(n) =>
                            updateSpace(spaceKey, {
                              quantity: n,
                              totalArea: n * (space.sfEach || 0),
                            })
                          }
                          ariaLabel={`${space.customName || space.name} quantity`}
                          className="w-10 text-sm font-semibold tabular-nums text-center bg-transparent border-none focus:outline-none focus:bg-slate-50 rounded p-0"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateSpace(spaceKey, {
                              quantity: space.quantity + 1,
                              totalArea: (space.quantity + 1) * (space.sfEach || 0),
                            })
                          }
                          className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    {/* Capacity — Workbench only */}
                    {!focusCols && (
                      <td className="px-3 py-2 border-b border-slate-100">
                        <div className="flex items-center justify-center">
                          <NumberField
                            value={space.capacity}
                            onChange={(n) => updateSpace(spaceKey, { capacity: n })}
                            ariaLabel={`${space.customName || space.name} capacity`}
                            className="w-12 text-sm tabular-nums text-center bg-transparent border-none focus:outline-none focus:bg-slate-50 rounded px-1 py-0.5"
                          />
                        </div>
                      </td>
                    )}
                    {/* SF Each — editable with step controls */}
                    <td className="px-3 py-2 border-b border-slate-100">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          title="Shift-click for ±10"
                          onClick={(e) => {
                            const n = Math.max(1, space.sfEach - (e.shiftKey ? 10 : 1))
                            updateSpace(spaceKey, { sfEach: n, totalArea: space.quantity * n })
                          }}
                          className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs"
                          aria-label="Decrease SF"
                        >−</button>
                        <NumberField
                          value={space.sfEach}
                          onChange={(n) =>
                            updateSpace(spaceKey, {
                              sfEach: n,
                              totalArea: space.quantity * n,
                            })
                          }
                          ariaLabel={`${space.customName || space.name} SF each`}
                          className="w-14 text-sm tabular-nums text-center bg-transparent border-none focus:outline-none focus:bg-slate-50 rounded px-1 py-0.5"
                        />
                        <button
                          type="button"
                          title="Shift-click for ±10"
                          onClick={(e) => {
                            const n = space.sfEach + (e.shiftKey ? 10 : 1)
                            updateSpace(spaceKey, { sfEach: n, totalArea: space.quantity * n })
                          }}
                          className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs"
                          aria-label="Increase SF"
                        >+</button>
                      </div>
                    </td>
                    {/* Total SF */}
                    <td className="px-3 py-2 border-b border-slate-100 text-right text-sm font-semibold tabular-nums text-slate-900">
                      {(space.quantity * space.sfEach).toLocaleString()}
                    </td>
                    {/* Allocated rollup — Workbench only */}
                    {!focusCols && (
                      <td className="px-3 py-2 border-b border-slate-100 text-center">
                        <span
                          className={`text-sm font-semibold tabular-nums ${allocStatus}`}
                          title={`${totalAllocated} allocated of ${space.quantity}`}
                        >
                          {totalAllocated}
                          <span className="text-slate-400 font-normal">/{space.quantity}</span>
                        </span>
                      </td>
                    )}
                    {/* Status — Workbench only */}
                    {!focusCols && (
                      <td className="px-3 py-2 border-b border-slate-100 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${status.color}`}
                          title={recQty > 0 ? `Recommended: ${recQty}` : ""}
                        >
                          {status.label}
                        </span>
                      </td>
                    )}
                    {/* Per-department allocation steppers — Workbench only */}
                    {!focusCols && departments.map((dept) => {
                      const alloc = (space.departmentAllocations || []).find(
                        (a) => a.departmentId === dept.id
                      )
                      const count = alloc?.count || 0
                      const remaining = space.quantity - totalAllocated
                      const canIncrement = remaining > 0
                      return (
                        <td
                          key={dept.id}
                          className="px-3 py-2 border-b border-slate-100"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateDeptAlloc(spaceKey, space, dept.id, -1)}
                              className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={count === 0}
                              aria-label={`Decrease ${dept.name} allocation`}
                            >
                              −
                            </button>
                            <span
                              className={`w-7 text-center text-sm font-semibold tabular-nums ${
                                count > 0 ? "text-slate-900" : "text-slate-300"
                              }`}
                            >
                              {count}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateDeptAlloc(spaceKey, space, dept.id, 1)}
                              className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={!canIncrement}
                              aria-label={`Increase ${dept.name} allocation`}
                            >
                              +
                            </button>
                          </div>
                        </td>
                      )
                    })}
                    {/* Delete */}
                    <td className="px-3 py-2 border-b border-slate-100 text-center">
                      <button
                        type="button"
                        onClick={() => deleteSpace(spaceKey)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded"
                        aria-label={`Delete ${space.customName || space.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result

    if (source.droppableId !== destination.droppableId) {
      setEditableSpaces((prev) => {
        const updatedSpaces = { ...prev }
        const spaceToMove = updatedSpaces[draggableId]
        if (spaceToMove) {
          spaceToMove.zone = destination.droppableId
        }
        return updatedSpaces
      })
    }
  }

  const kpiData = {
    meetingSeats: finalEditableTotals.meetingSeats,
    phoneBooths: finalEditableTotals.phoneBooths,
    desks: finalEditableTotals.desks,
    offices: finalEditableTotals.offices,
    flex: finalEditableTotals.flex,
  }

  const zoneBreakdown = {
    "Focus Open": {
      usf: finalEditableTotals.focusOpenUSF,
      percentage: Math.round((finalEditableTotals.focusOpenUSF / finalEditableTotals.totalUSF) * 100),
      color: "#22d3ee", // Tailwind cyan-400
    },
    "Focus Enclosed": {
      usf: finalEditableTotals.focusEnclosedUSF,
      percentage: Math.round((finalEditableTotals.focusEnclosedUSF / finalEditableTotals.totalUSF) * 100),
      color: "#0d9488", // Tailwind teal-600
    },
    Collaborative: {
      usf: finalEditableTotals.collaborativeUSF,
      percentage: Math.round((finalEditableTotals.collaborativeUSF / finalEditableTotals.totalUSF) * 100),
      color: "#84cc16", // Tailwind green-400
    },
    Support: {
      usf: finalEditableTotals.supportUSF,
      percentage: Math.round((finalEditableTotals.supportUSF / finalEditableTotals.totalUSF) * 100),
      color: "#fbbf24", // Tailwind amber-400
    },
    Wellness: {
      usf: finalEditableTotals.wellnessUSF,
      percentage: Math.round((finalEditableTotals.wellnessUSF / finalEditableTotals.totalUSF) * 100),
      color: "#c084fc", // Tailwind purple-400
    },
  }

  // Client logo for the ProgramIsland donut center (data URL, client-uploaded).
  // Falls back to the Nelson logo when not set.
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(null)

  // Growth planning toggle: when enabled, departments show a "Future" headcount
  // column and the Configuration Targets KPIs display Current → Future with deltas.
  const [planForGrowth, setPlanForGrowth] = useState(false)

  // Recalibrate: holds the staged diff list while the user reviews changes
  // in the confirm modal. Null when the modal is closed.
  type RecalibrateChange = {
    spaceKey: string
    name: string
    zone: string
    workspaceType: "employee" | "private" | "flex" | null | undefined
    currentQty: number
    recommendedQty: number
    selected: boolean
  }
  const [recalibratePreview, setRecalibratePreview] = useState<
    RecalibrateChange[] | null
  >(null)

  // Per-zone view mode toggle: cards (default) or dense table.
  type ZoneViewMode = "cards" | "table"
  const [zoneViewMode, setZoneViewMode] = useState<Record<string, ZoneViewMode>>({
    "Focus Open": "cards",
    "Focus Enclosed": "cards",
    Collaborative: "cards",
    Support: "cards",
    Wellness: "cards",
  })

  // ============================================================
  // Scenario planning
  // ------------------------------------------------------------
  // A scenario is a named snapshot of *configurable* state — the things you
  // adjust while solving the brief: department allocations, targets, growth,
  // editable spaces, and zone circulation. Headcount targets stay shared
  // across scenarios because you're comparing how to *solve* for the same
  // brief, not different briefs.
  //
  // The live state is what you're editing. "Save" overwrites the active
  // scenario; "Save as new" creates a new scenario and switches to it.
  // Switching loads the snapshot. A second "comparison" scenario can be
  // selected for read-only diff readouts in the header.
  // ============================================================
  type ScenarioSnapshot = {
    departments: Department[]
    targetHeadcount: number
    targetOfficeCount: number
    targetWorkstations: number
    targetHybridWorkers: number
    editableSpaces: Record<string, EditableSpace>
    zoneCirculation: Record<string, number>
    planForGrowth: boolean
    ratioConfig: RatioConfig
  }
  type Scenario = {
    id: string
    name: string
    createdAt: string
    snapshot: ScenarioSnapshot
  }

  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [comparisonScenarioId, setComparisonScenarioId] = useState<string | null>(null)
  const [scenarioMenuOpen, setScenarioMenuOpen] = useState(false)
  const [compareMenuOpen, setCompareMenuOpen] = useState(false)
  // Inline rename: holds the scenario being renamed
  const [renamingScenarioId, setRenamingScenarioId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  // "Save as new" prompt
  const [savingNewScenario, setSavingNewScenario] = useState(false)
  const [newScenarioName, setNewScenarioName] = useState("")

  // Derived: active and comparison scenario lookups. Defined here (after the
  // useState calls) so they don't hit the temporal dead zone of `scenarios`.
  // The helper functions above (captureSnapshot, switchToScenario, etc.) close
  // over `scenarios` at call time, so their position relative to the useState
  // declarations doesn't matter — only these top-level expressions do.
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || null
  const comparisonScenario = scenarios.find((s) => s.id === comparisonScenarioId) || null

  // ============================================================
  // UI Visibility Controls
  // ============================================================
  // Data-layer visibility toggles: all data remains in calculations, but
  // certain UI elements are shown/hidden based on these flags. Eventually
  // these can be bundled into "presets" (e.g., "Client View", "Admin View").
  type VisibilitySettings = {
    allocations: boolean
    departmentManagement: boolean
    workspaceType: boolean
    capacity: boolean
    recommendations: boolean
    growth: boolean
  }
  const [visibility, setVisibility] = useState<VisibilitySettings>({
    allocations: true,
    departmentManagement: true,
    workspaceType: true,
    capacity: true,
    recommendations: true,
    growth: true,
  })

  // Toggle a single visibility setting
  const toggleVisibility = (key: keyof VisibilitySettings) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Presets for common UI configurations (future)
  const presets = {
    clientPresentation: {
      allocations: false,
      departmentManagement: false,
      workspaceType: false,
      capacity: false,
      recommendations: false,
      growth: false,
    },
    planning: {
      allocations: true,
      departmentManagement: true,
      workspaceType: true,
      capacity: true,
      recommendations: true,
      growth: true,
    },
  }

  // Canvas mode: Focus (minimal, table-first), Workbench (all features), Briefing (read-only)
  type CanvasMode = "focus" | "workbench" | "briefing"
  const [canvasMode, setCanvasMode] = useState<CanvasMode>("workbench")

  // Targets sidebar toggle (shown in Workbench, hidden in Focus/Briefing)
  const [showTargetsSidebar, setShowTargetsSidebar] = useState(true)

  // Global card/table master toggle — overrides all zone view modes when changed
  const [globalViewMode, setGlobalViewMode] = useState<"cards" | "table">("cards")

  // Set hasMounted after first client render to avoid SSR/DnD hydration mismatch
  useEffect(() => { setHasMounted(true) }, [])

  // React to mode changes: update sidebar + view mode defaults
  useEffect(() => {
    if (canvasMode === "workbench") {
      setShowTargetsSidebar(true)
    } else {
      setShowTargetsSidebar(false)
    }
    if (canvasMode === "focus") {
      // Focus mode: switch all zones to table view
      setZoneViewMode({ "Focus Open": "table", "Focus Enclosed": "table", Collaborative: "table", Support: "table", Wellness: "table" })
      setGlobalViewMode("table")
    } else if (canvasMode === "workbench") {
      setZoneViewMode({ "Focus Open": "cards", "Focus Enclosed": "cards", Collaborative: "cards", Support: "cards", Wellness: "cards" })
      setGlobalViewMode("cards")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasMode])

  // ProgramIsland orchestration:
  //  - `islandDock` is lifted here so the position persists across the
  //     embedded -> floating transition on scroll.
  //  - `isHeaderInView` drives a crossfade between the island embedded in the
  //    project header card (at rest / near top of page) and a sticky floating
  //    island that appears once you scroll past the header.
  const [islandDock, setIslandDock] = useState<IslandDock>("top")
  const headerCardRef = useRef<HTMLDivElement>(null)
  const [isHeaderInView, setIsHeaderInView] = useState(true)

  useEffect(() => {
    const check = () => {
      const el = headerCardRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      // Consider the header "in view" until its bottom rises above the
      // sticky page header (~64px). Small buffer keeps things from flipping
      // during the subtle fade.
      setIsHeaderInView(rect.bottom > 72)
    }
    check()
    window.addEventListener("scroll", check, { passive: true })
    window.addEventListener("resize", check)
    return () => {
      window.removeEventListener("scroll", check)
      window.removeEventListener("resize", check)
    }
  }, [])

  // Count of active space cards per category for the ProgramIsland
  const islandCounts = useMemo(() => {
    const c = { Focus: 0, Collaborative: 0, Support: 0, Wellness: 0 }
    Object.values(editableSpaces).forEach((sp: any) => {
      if (sp?.isActive === false) return
      if (sp?.zone === "Focus Open" || sp?.zone === "Focus Enclosed") c.Focus += 1
      else if (sp?.zone === "Collaborative") c.Collaborative += 1
      else if (sp?.zone === "Support") c.Support += 1
      else if (sp?.zone === "Wellness") c.Wellness += 1
    })
    return c
  }, [editableSpaces])

  const islandMetrics = [
    {
      label: "Focus",
      value:
        (finalEditableTotals.focusOpenUSF || 0) + (finalEditableTotals.focusEnclosedUSF || 0),
      color: "#06b6d4", // cyan-500
      count: islandCounts.Focus,
    },
    {
      label: "Collaborative",
      value: finalEditableTotals.collaborativeUSF || 0,
      color: "#84cc16", // lime-500
      count: islandCounts.Collaborative,
    },
    {
      label: "Support",
      value: finalEditableTotals.supportUSF || 0,
      color: "#f59e0b", // amber-500
      count: islandCounts.Support,
    },
    {
      label: "Wellness",
      value: finalEditableTotals.wellnessUSF || 0,
      color: "#a855f7", // purple-500
      count: islandCounts.Wellness,
    },
  ]

  // Live FT engine baseline for divergence indicators.
  // Computes what the engine would recommend for the current config, and exposes
  // it as a name-keyed Map so SpaceCard + ZoneTable can flag qty/SF divergence.
  // Divergence baseline: snapshot of space values at canvas load time (or after Recalibrate).
  // Compares the USER's current edits against the engine's output — only shows dots when something
  // has actually been manually changed, not on every render due to config drift.
  const ftBaselineRef = useRef<Map<string, { quantity: number; sfEach: number }> | null>(null)
  if (
    ftBaselineRef.current === null ||
    (ftBaselineRef.current.size === 0 && Object.keys(editableSpaces).length > 0)
  ) {
    ftBaselineRef.current = new Map(
      Object.values(editableSpaces).map((s) => [
        s.name,
        { quantity: s.quantity, sfEach: s.sfEach },
      ])
    )
  }
  const ftBaseline = visibility.recommendations
    ? ftBaselineRef.current
    : new Map<string, { quantity: number; sfEach: number }>()

  // Count actual divergences from baseline to drive the Edits indicator dots.
  const divergenceCount = (() => {
    const baseline = ftBaselineRef.current
    if (!baseline || baseline.size === 0) return { qty: 0, sf: 0 }
    let qty = 0, sf = 0
    for (const space of Object.values(editableSpaces)) {
      if (space.isActive === false) continue
      const entry = baseline.get(space.name)
      if (!entry) continue
      if (space.quantity !== entry.quantity) qty++
      if (space.sfEach !== entry.sfEach) sf++
    }
    return { qty, sf }
  })()

  // Floating island position classes per dock, kept outside JSX for clarity.
  const floatingDockClasses: Record<IslandDock, string> = {
    top: "top-16 left-1/2 -translate-x-1/2",
    bottom: "bottom-6 left-1/2 -translate-x-1/2",
    left: "left-6 top-1/2 -translate-y-1/2",
    right: "right-6 top-1/2 -translate-y-1/2",
  }

  // Handler for recalibrating from Fast Track Explorer
  const handleRecalibrate = (newInputs: OnboardingInputs) => {
    setOnboardingInputs(newInputs)
    // Trigger recalculation - would need to re-run the calculation engine
    // For now, just update the inputs state
  }

  // If showing Fast Track Explorer, render that instead
  if (showFastTrackExplorer && programMetrics && onboardingInputs) {
    return (
      <>
        {/* Onboarding Modal */}
        <OnboardingModal
          key={showOnboarding ? "open" : "closed"}
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={handleOnboardingComplete}
        />
        <FastTrackExplorer
          inputs={{ clientName: "", programmedBy: "", ...onboardingInputs }}
          metrics={programMetrics}
          onRecalibrate={handleRecalibrate}
          onSwitchToAdvanced={(inputs, hybridProgram) => {
            // Persist FT inputs for potential recalibration
            setOnboardingInputs(inputs as typeof onboardingInputs)

            // Sync configuration state
            setTargetHeadcount(inputs.totalHeadcount)
            setLoadFactor(1 + inputs.rentableFactor)
            setConfig((prev) => ({
              ...prev,
              fullyRemoteEmployees: inputs.fullyRemote,
              percentOffices: inputs.percentOffices,
              grossRent: inputs.grossRent,
              daysInOffice: inputs.daysInOffice,
              rentableFactor: inputs.rentableFactor,
              clientName: inputs.clientName,
              programmedBy: inputs.programmedBy,
            }))

            // Convert FT program directly to editable spaces — no key mapping needed
            const result = convertProgramToSpaces(hybridProgram, inputs)
            setEditableSpaces(result.spaces as Record<string, EditableSpace>)
            setTargetOfficeCount(result.targets.officeCount)
            setTargetWorkstations(result.targets.workstationCount)
            setTargetHybridWorkers(result.targets.hybridWorkers)

            setShowFastTrackExplorer(false)
          }}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Onboarding Modal - key forces re-mount when opened */}
      <OnboardingModal
        key={showOnboarding ? "open" : "closed"}
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />

      {/* ── Add Space picker dialog (Phase 3) ── */}
      <Dialog open={addSpaceDialog.open} onOpenChange={(open) => !open && setAddSpaceDialog({ open: false, zone: "" })}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Space — {addSpaceDialog.zone}</DialogTitle>
            <DialogDescription>
              Select a space type to add to this zone. You can edit quantity, SF, and name after adding.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2 max-h-[60vh] overflow-y-auto pr-1">
            {(SPACE_PRESETS[addSpaceDialog.zone] ?? []).map((preset) => (
              <button
                key={preset.name}
                onClick={() => addSpace(addSpaceDialog.zone, preset)}
                className="text-left p-3 rounded-lg border border-gray-200 hover:border-slate-400 hover:bg-slate-50 transition-colors group"
              >
                <div className="font-medium text-sm text-gray-900 group-hover:text-slate-800 leading-tight mb-1">
                  {preset.name}
                </div>
                <div className="text-xs text-gray-500">
                  {preset.sfEach.toLocaleString()} SF each
                  {preset.capacity > 0 && ` · ${preset.capacity} seat${preset.capacity !== 1 ? "s" : ""}`}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Quick-generate / start-from-scratch dialog (Phase 4) ── */}
      <Dialog open={quickGenOpen} onOpenChange={setQuickGenOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate Program from Headcount</DialogTitle>
            <DialogDescription>
              Enter your headcount and in-office policy. The Fast Track engine will populate the canvas with a ratio-based starting point you can then customize.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Headcount</label>
              <input
                type="number"
                min={1}
                max={5000}
                value={quickGen.headcount}
                onChange={(e) => setQuickGen((p) => ({ ...p, headcount: e.target.value }))}
                placeholder="e.g. 150"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Days in Office / Week</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((d) => (
                  <button
                    key={d}
                    onClick={() => setQuickGen((p) => ({ ...p, daysInOffice: d }))}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                      quickGen.daysInOffice === d
                        ? "bg-slate-900 text-white border-slate-900"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleQuickGenerate}
                disabled={!quickGen.headcount || parseInt(quickGen.headcount) < 1}
                className="flex-1 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                Generate Program
              </button>
              <button
                onClick={clearAllSpaces}
                className="px-4 py-2 rounded-md border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
              >
                Start Blank
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warning dialog for switching back to Fast Track */}
      <Dialog open={showFastTrackWarning} onOpenChange={setShowFastTrackWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Switch to Fast Track?
            </DialogTitle>
            <DialogDescription className="text-left pt-2">
              <strong className="text-slate-700">Your Advanced Canvas customizations will not transfer back to Fast Track.</strong>
              <br /><br />
              Fast Track uses fixed ratios and a simplified space program. Any custom spaces, adjusted quantities, or unique room types you&apos;ve added will not appear in Fast Track.
              <br /><br />
              <span className="text-amber-600 font-medium">
                We recommend staying in Advanced Canvas if you&apos;ve made significant customizations.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowFastTrackWarning(false)}
            >
              Stay in Advanced Canvas
            </Button>
            <Button
              variant="default"
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => {
                setShowFastTrackWarning(false)
                setShowFastTrackExplorer(true)
              }}
            >
              Switch to Fast Track
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/*
        Floating program summary island — crossfades in once the user scrolls
        past the project header card. Dock position is controlled by the
        parent so it persists across the embedded -> floating transition.
      */}
      <div
        className={`fixed ${floatingDockClasses[islandDock]} z-40 transition-opacity duration-300 ease-out ${
          isHeaderInView ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-hidden={isHeaderInView}
      >
        <ProgramIsland
          totalRSF={finalEditableTotals.totalRSF || 0}
          totalUSF={finalEditableTotals.totalUSF || 0}
          metrics={islandMetrics}
          clientLogoUrl={clientLogoUrl}
          defaultLogoUrl="/nelson-logo.png"
          onUploadLogo={(dataUrl) => setClientLogoUrl(dataUrl)}
          onRemoveLogo={() => setClientLogoUrl(null)}
          variant="floating"
          dock={islandDock}
          onDockChange={setIslandDock}
          headcount={targetHeadcount}
          seatCount={finalEditableTotals.assignableSeats}
          rsfPerPerson={targetHeadcount > 0 ? Math.round((finalEditableTotals.totalRSF || 0) / targetHeadcount) : 0}
          usfPerPerson={targetHeadcount > 0 ? Math.round((finalEditableTotals.totalUSF || 0) / targetHeadcount) : 0}
          scenarioName={activeScenario?.name}
        />
      </div>

      <DragDropContext key={hasMounted ? 'client' : 'ssr'} onDragEnd={handleDragEnd}>
        {/* ============================================================
            HEADER — 3 tiers
            Row 1: Logo · Project identity · Actions · Avatar
            Row 2: Mode tabs with subtitles
            Row 3: Feature toggles (mode-adaptive) — hidden in Briefing
            ============================================================ */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">

          {/* Row 1 — Brand + Project + Actions */}
          <div className="flex items-center justify-between gap-4 px-6 h-14 border-b border-slate-100">
            <div className="flex items-center gap-3 shrink-0 min-w-0">
              <Image src="/nelson-logo.png" alt="Nelson" width={100} height={32} className="h-7 w-auto shrink-0" />
              <span className="h-5 w-px bg-slate-200 shrink-0" aria-hidden="true" />
              {/* Inline-editable project name */}
              <input
                value={projectInfo.projectName}
                onChange={(e) => setProjectInfo((p) => ({ ...p, projectName: e.target.value }))}
                placeholder="Untitled Project"
                className="text-sm font-semibold text-slate-800 bg-transparent border-none outline-none focus:bg-slate-50 rounded px-1 py-0.5 max-w-[220px] truncate placeholder:text-slate-400"
              />
              {projectInfo.client && (
                <>
                  <span className="text-slate-300 text-xs">·</span>
                  <input
                    value={projectInfo.client}
                    onChange={(e) => setProjectInfo((p) => ({ ...p, client: e.target.value }))}
                    placeholder="Client"
                    className="text-xs text-slate-500 bg-transparent border-none outline-none focus:bg-slate-50 rounded px-1 py-0.5 max-w-[140px] truncate placeholder:text-slate-300"
                  />
                </>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setShowFastTrackWarning(true)}
                className="text-teal-600 hover:text-teal-700 border-teal-200 hover:border-teal-300 hover:bg-teal-50 gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" /> Explore
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAdminPanel(true)}
                className="text-slate-500 hover:text-slate-700 gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white shadow-sm shrink-0">
                D
              </div>
            </div>
          </div>

          {/* Row 2 — Mode tabs (right-aligned under Explore/Admin) */}
          <div className="flex items-stretch justify-end border-b border-slate-100 px-6">
            {(
              [
                { id: "focus" as CanvasMode, label: "Focus", icon: Focus, sub: "Quantities & SF · Clean table" },
                { id: "workbench" as CanvasMode, label: "Workbench", icon: Wrench, sub: "Full toolbox · All columns" },
                { id: "briefing" as CanvasMode, label: "Briefing", icon: Presentation, sub: "Presentation · Read-only" },
              ] as { id: CanvasMode; label: string; icon: React.ElementType; sub: string }[]
            ).map(({ id, label, icon: Icon, sub }) => (
              <button
                key={id}
                onClick={() => setCanvasMode(id)}
                className={`flex flex-col items-start px-4 py-2.5 border-b-2 transition-all gap-0.5 ${
                  canvasMode === id
                    ? "border-teal-600 text-teal-700"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-sm font-semibold">{label}</span>
                </div>
                <span className={`text-[10px] font-normal leading-none ${canvasMode === id ? "text-teal-500" : "text-slate-400"}`}>{sub}</span>
              </button>
            ))}
          </div>

          {/* Row 3 — Feature toggles (mode-adaptive, hidden in Briefing) */}
          {canvasMode !== "briefing" && (
            <div className="flex items-center gap-0.5 px-4 py-1.5 bg-slate-50/80">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mr-2 shrink-0">Show</span>

              {/* Global Cards / Table toggle */}
              <div className="inline-flex items-center rounded-md border border-slate-200 bg-white overflow-hidden mr-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    setGlobalViewMode("cards")
                    setZoneViewMode(Object.fromEntries(
                      ["Focus Open","Focus Enclosed","Collaborative","Support","Wellness"].map(z => [z, "cards"])
                    ) as Record<string, ZoneViewMode>)
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
                    globalViewMode === "cards" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                  title="Cards view"
                >
                  <LayoutGrid className="w-3 h-3" />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGlobalViewMode("table")
                    setZoneViewMode(Object.fromEntries(
                      ["Focus Open","Focus Enclosed","Collaborative","Support","Wellness"].map(z => [z, "table"])
                    ) as Record<string, ZoneViewMode>)
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
                    globalViewMode === "table" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                  title="Table view"
                >
                  <Table2 className="w-3 h-3" />
                  Table
                </button>
              </div>

              <span className="w-px h-4 bg-slate-200 mx-1 shrink-0" />

              {/* Workspace Type + Capacity (Workbench only) */}
              {canvasMode === "workbench" && (
                <>
                  <FeatureToggle active={visibility.workspaceType} onClick={() => toggleVisibility("workspaceType")} label="Type" title="Workspace type (Employee / Private / Flex)" />
                  <FeatureToggle active={visibility.capacity} onClick={() => toggleVisibility("capacity")} label="Capacity" title="Seats per space" />
                  <span className="w-px h-4 bg-slate-200 mx-1.5 shrink-0" />
                </>
              )}

              {/* Recommendations / Edits */}
              <FeatureToggle
                active={visibility.recommendations}
                onClick={() => toggleVisibility("recommendations")}
                label="Edits"
                title="Highlight spaces manually changed from the engine baseline (● qty  ● SF)"
                suffix={visibility.recommendations && (divergenceCount.qty > 0 || divergenceCount.sf > 0) ? (
                  <span className="flex items-center gap-0.5 ml-1">
                    {divergenceCount.qty > 0 && <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" title={`${divergenceCount.qty} qty changes`} />}
                    {divergenceCount.sf > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title={`${divergenceCount.sf} SF changes`} />}
                  </span>
                ) : undefined}
              />

              {/* Allocations + Departments (Workbench only) */}
              {canvasMode === "workbench" && (
                <>
                  <span className="w-px h-4 bg-slate-200 mx-1.5 shrink-0" />
                  <FeatureToggle active={visibility.allocations} onClick={() => toggleVisibility("allocations")} label="Allocations" title="Department allocation indicators" />
                  <FeatureToggle active={visibility.departmentManagement} onClick={() => toggleVisibility("departmentManagement")} label="Departments" title="Per-department columns" />
                  <span className="w-px h-4 bg-slate-200 mx-1.5 shrink-0" />
                  <FeatureToggle active={visibility.growth} onClick={() => toggleVisibility("growth")} label="Growth" title="Growth planning" />
                </>
              )}

              {/* Targets toggle (Workbench only, right-aligned) */}
              {canvasMode === "workbench" && (
                <>
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={() => setShowTargetsSidebar((v) => !v)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                      showTargetsSidebar
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    {showTargetsSidebar ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
                    Targets
                  </button>
                </>
              )}
            </div>
          )}
        </header>

        {/* ============================================================
            Briefing Mode — read-only KPI presentation, replaces canvas
            ============================================================ */}
        {canvasMode === "briefing" && (
          <div className="overflow-y-auto" style={{ height: "calc(100vh - 106px)" }}>
            <BriefingView
              spaces={editableSpaces}
              totals={{
                totalRSF: finalEditableTotals.totalRSF || 0,
                totalUSF: finalEditableTotals.totalUSF || 0,
                assignableSeats: finalEditableTotals.assignableSeats || 0,
                focusOpenUSF: finalEditableTotals.focusOpenUSF || 0,
                focusEnclosedUSF: finalEditableTotals.focusEnclosedUSF || 0,
                collaborativeUSF: finalEditableTotals.collaborativeUSF || 0,
                supportUSF: finalEditableTotals.supportUSF || 0,
                wellnessUSF: finalEditableTotals.wellnessUSF || 0,
              }}
              headcount={targetHeadcount}
              scenarioName={activeScenario?.name}
              projectInfo={{
                projectName: projectInfo.projectName,
                client: projectInfo.client,
                date: projectInfo.date,
                designedBy: projectInfo.designedBy,
              }}
            />
          </div>
        )}

        {/* ============================================================
            Main layout: ResizablePanelGroup with optional Config sidebar
            ============================================================ */}
        {canvasMode !== "briefing" && (
        <ResizablePanelGroup direction="horizontal" className="overflow-hidden" style={{ height: "calc(100vh - 140px)" }}>
          {/* Main scrollable content area */}
          <ResizablePanel defaultSize={showTargetsSidebar && canvasMode === "workbench" ? 68 : 100} minSize={50}>
          <div className="h-full overflow-y-auto">
          {/* ── Focus mode: sticky KPI bar ── */}
          {canvasMode === "focus" && (
            <div className="sticky top-0 z-20 bg-white border-b-2 border-teal-600 px-6 py-3.5 flex items-center gap-0 shadow-sm">
              {/* RSF — primary hero metric */}
              <div className="flex flex-col pr-6 border-r border-slate-200 mr-6">
                <span className="text-[9px] uppercase tracking-[0.18em] text-slate-400 font-semibold mb-0.5">Total RSF</span>
                <span className="text-4xl font-black tabular-nums leading-none text-teal-600">
                  {Math.round(finalEditableTotals.totalRSF || 0).toLocaleString()}
                </span>
              </div>
              {/* Secondary KPIs */}
              <div className="flex items-center gap-5 mr-6">
                {[
                  { label: "USF",        value: Math.round(finalEditableTotals.totalUSF || 0).toLocaleString() },
                  { label: "RSF/person", value: targetHeadcount > 0 ? Math.round((finalEditableTotals.totalRSF || 0) / targetHeadcount).toLocaleString() : "—" },
                  { label: "Seats",      value: (finalEditableTotals.assignableSeats || 0).toLocaleString() },
                  { label: "Headcount",  value: targetHeadcount.toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-[0.14em] text-slate-400 font-semibold mb-0.5">{label}</span>
                    <span className="text-2xl font-bold tabular-nums leading-none text-slate-800">{value}</span>
                  </div>
                ))}
              </div>
              {/* Zone mix chips */}
              <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
                {[
                  { label: "FO", usf: finalEditableTotals.focusOpenUSF,     color: "bg-cyan-500" },
                  { label: "FE", usf: finalEditableTotals.focusEnclosedUSF, color: "bg-teal-600" },
                  { label: "CO", usf: finalEditableTotals.collaborativeUSF, color: "bg-green-500" },
                  { label: "SP", usf: finalEditableTotals.supportUSF,       color: "bg-amber-500" },
                  { label: "WE", usf: finalEditableTotals.wellnessUSF,      color: "bg-purple-500" },
                ].map(({ label, usf, color }) => {
                  const total = finalEditableTotals.totalUSF || 1
                  const pct = Math.round(((usf || 0) / total) * 100)
                  if (pct === 0) return null
                  return (
                    <div key={label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="text-sm font-bold text-slate-700 tabular-nums">{pct}%</span>
                      <span className="text-[10px] text-slate-400 font-medium">{label}</span>
                    </div>
                  )
                })}
              </div>
              {/* Scenario picker — right side of focus bar */}
              <div className="ml-auto pl-4 flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setScenarioMenuOpen((o) => !o); setCompareMenuOpen(false) }}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                    aria-expanded={scenarioMenuOpen}
                  >
                    <Layers className="w-3 h-3" />
                    <span className="normal-case tracking-normal text-xs font-semibold">{activeScenario ? activeScenario.name : "Unsaved"}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {scenarioMenuOpen && (
                    <div className="absolute top-full right-0 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white shadow-xl z-40 overflow-hidden" role="menu">
                      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Scenarios</span>
                        <span className="text-[10px] text-slate-400 tabular-nums">{scenarios.length} saved</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {scenarios.length === 0 && (
                          <div className="px-3 py-4 text-center text-xs text-slate-500">No scenarios saved yet.</div>
                        )}
                        {scenarios.map((s) => {
                          const isActive = s.id === activeScenarioId
                          const m = snapshotMetrics(s.snapshot)
                          return (
                            <div key={s.id} className={`group px-3 py-2 border-b border-slate-50 last:border-b-0 ${isActive ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}>
                              <div className="flex items-center gap-2">
                                {isActive && <Check className="w-3 h-3 text-indigo-600 shrink-0" />}
                                <button type="button" onClick={() => switchToScenario(s.id)} className="flex-1 text-left text-sm font-medium text-slate-900 truncate" disabled={isActive}>{s.name}</button>
                                <button type="button" onClick={() => deleteScenario(s.id)} className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
                              </div>
                              <div className="flex gap-3 mt-0.5 text-[10px] text-slate-500 tabular-nums pl-5">
                                <span>{m.totalUSF.toLocaleString()} USF</span><span>{m.totalHeadcount} HC</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="border-t border-slate-100 p-2 flex gap-1.5">
                        {activeScenarioId && <button type="button" onClick={overwriteActiveScenario} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"><Save className="w-3 h-3" />Save</button>}
                        <button type="button" onClick={() => { setSavingNewScenario(true); setNewScenarioName(scenarios.length === 0 ? "Baseline" : `Scenario ${scenarios.length + 1}`) }} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"><Plus className="w-3 h-3" />Save as new</button>
                      </div>
                      {savingNewScenario && (
                        <div className="border-t border-slate-100 p-2 bg-slate-50/60 flex items-center gap-1.5">
                          <input autoFocus value={newScenarioName} onChange={(e) => setNewScenarioName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveCurrentAsNewScenario(newScenarioName); if (e.key === "Escape") { setSavingNewScenario(false); setNewScenarioName("") } }} placeholder="Scenario name" className="flex-1 text-sm bg-white border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <button type="button" onClick={() => saveCurrentAsNewScenario(newScenarioName)} className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">Save</button>
                          <button type="button" onClick={() => { setSavingNewScenario(false); setNewScenarioName("") }} className="px-2 py-1 rounded text-slate-600 hover:bg-slate-200 text-xs">Cancel</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Workbench mode: sticky ProgramIsland header ── */}
          {canvasMode === "workbench" && (
          <div
            ref={headerCardRef}
            className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm"
          >
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 min-w-0">
                  {/* Plan for growth toggle (visibility-controlled) */}
                    {visibility.growth && (
                      <>
                        <button
                          type="button"
                          onClick={() => setPlanForGrowth((p) => !p)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] font-semibold transition-colors ${
                            planForGrowth
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                          aria-pressed={planForGrowth}
                          title="Enable growth planning to set future headcount targets per department"
                        >
                          <TrendingUp className="w-3 h-3" />
                          {planForGrowth ? "Growth On" : "Plan Growth"}
                        </button>

                        <span className="text-slate-200" aria-hidden="true">
                          |
                        </span>
                      </>
                    )}

                    {/* ============================================
                        Scenario picker
                        ============================================ */}
                    <div className="relative inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setScenarioMenuOpen((o) => !o)
                          setCompareMenuOpen(false)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                        aria-expanded={scenarioMenuOpen}
                        aria-haspopup="menu"
                        title="Manage scenarios"
                      >
                        <Layers className="w-3 h-3" />
                        <span className="normal-case tracking-normal text-xs font-semibold">
                          {activeScenario ? activeScenario.name : "Unsaved"}
                        </span>
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {scenarioMenuOpen && (
                        <div
                          className="absolute top-full left-0 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white shadow-xl z-40 overflow-hidden"
                          role="menu"
                        >
                          {/* Header */}
                          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                              Scenarios
                            </span>
                            <span className="text-[10px] text-slate-400 tabular-nums">
                              {scenarios.length} saved
                            </span>
                          </div>

                          {/* Scenario list */}
                          <div className="max-h-72 overflow-y-auto">
                            {scenarios.length === 0 && (
                              <div className="px-3 py-4 text-center text-xs text-slate-500">
                                No scenarios saved yet.
                                <br />
                                Save the current configuration to compare versions.
                              </div>
                            )}
                            {scenarios.map((s) => {
                              const isActive = s.id === activeScenarioId
                              const isRenaming = renamingScenarioId === s.id
                              const m = snapshotMetrics(s.snapshot)
                              return (
                                <div
                                  key={s.id}
                                  className={`group px-3 py-2 border-b border-slate-50 last:border-b-0 ${
                                    isActive ? "bg-indigo-50/60" : "hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {isActive && (
                                      <Check className="w-3 h-3 text-indigo-600 shrink-0" />
                                    )}
                                    {isRenaming ? (
                                      <input
                                        type="text"
                                        autoFocus
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") renameScenario(s.id, renameValue)
                                          if (e.key === "Escape") {
                                            setRenamingScenarioId(null)
                                            setRenameValue("")
                                          }
                                        }}
                                        onBlur={() => renameScenario(s.id, renameValue)}
                                        className="flex-1 text-sm font-medium bg-white border border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      />
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => switchToScenario(s.id)}
                                        className="flex-1 text-left text-sm font-medium text-slate-900 truncate"
                                        disabled={isActive}
                                      >
                                        {s.name}
                                      </button>
                                    )}
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRenamingScenarioId(s.id)
                                          setRenameValue(s.name)
                                        }}
                                        className="p-1 rounded hover:bg-slate-200 text-slate-500"
                                        title="Rename"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => duplicateScenario(s.id)}
                                        className="p-1 rounded hover:bg-slate-200 text-slate-500"
                                        title="Duplicate"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteScenario(s.id)}
                                        className="p-1 rounded hover:bg-red-100 text-slate-500 hover:text-red-600"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-500 tabular-nums pl-5">
                                    <span>{m.totalUSF.toLocaleString()} USF</span>
                                    <span>{m.totalHeadcount} HC</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {/* Footer actions */}
                          <div className="border-t border-slate-100 p-2 flex items-center gap-1.5">
                            {activeScenarioId ? (
                              <button
                                type="button"
                                onClick={overwriteActiveScenario}
                                className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                                title={`Overwrite "${activeScenario?.name}" with current state`}
                              >
                                <Save className="w-3 h-3" />
                                Save
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                setSavingNewScenario(true)
                                setNewScenarioName(
                                  scenarios.length === 0
                                    ? "Baseline"
                                    : `Scenario ${scenarios.length + 1}`
                                )
                              }}
                              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              Save as new
                            </button>
                          </div>

                          {/* "Save as new" inline form */}
                          {savingNewScenario && (
                            <div className="border-t border-slate-100 p-2 bg-slate-50/60 flex items-center gap-1.5">
                              <input
                                type="text"
                                autoFocus
                                value={newScenarioName}
                                onChange={(e) => setNewScenarioName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    saveCurrentAsNewScenario(newScenarioName)
                                  if (e.key === "Escape") {
                                    setSavingNewScenario(false)
                                    setNewScenarioName("")
                                  }
                                }}
                                placeholder="Scenario name"
                                className="flex-1 text-sm bg-white border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => saveCurrentAsNewScenario(newScenarioName)}
                                className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSavingNewScenario(false)
                                  setNewScenarioName("")
                                }}
                                className="px-2 py-1 rounded text-slate-600 hover:bg-slate-200 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ============================================
                        Compare picker (only when 2+ scenarios)
                        ============================================ */}
                    {scenarios.length >= 2 && (
                      <div className="relative inline-flex items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setCompareMenuOpen((o) => !o)
                            setScenarioMenuOpen(false)
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] font-semibold transition-colors ${
                            comparisonScenarioId
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                          aria-expanded={compareMenuOpen}
                          aria-haspopup="menu"
                          title="Compare to another scenario"
                        >
                          <GitCompare className="w-3 h-3" />
                          <span className="normal-case tracking-normal text-xs font-semibold">
                            {comparisonScenario
                              ? `vs ${comparisonScenario.name}`
                              : "Compare"}
                          </span>
                        </button>

                        {compareMenuOpen && (
                          <div
                            className="absolute top-full left-0 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white shadow-xl z-40 overflow-hidden"
                            role="menu"
                          >
                            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                                Compare against
                              </span>
                              {comparisonScenarioId && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setComparisonScenarioId(null)
                                    setCompareMenuOpen(false)
                                  }}
                                  className="text-[10px] text-slate-500 hover:text-slate-900"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                              {scenarios
                                .filter((s) => s.id !== activeScenarioId)
                                .map((s) => {
                                  const isComparing = s.id === comparisonScenarioId
                                  return (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => {
                                        setComparisonScenarioId(s.id)
                                        setCompareMenuOpen(false)
                                      }}
                                      className={`w-full text-left px-3 py-2 text-sm border-b border-slate-50 last:border-b-0 flex items-center gap-2 ${
                                        isComparing
                                          ? "bg-amber-50/70 text-amber-900"
                                          : "hover:bg-slate-50 text-slate-700"
                                      }`}
                                    >
                                      {isComparing && (
                                        <Check className="w-3 h-3 text-amber-700 shrink-0" />
                                      )}
                                      <span className={isComparing ? "" : "ml-5"}>{s.name}</span>
                                    </button>
                                  )
                                })}
                              {scenarios.filter((s) => s.id !== activeScenarioId).length === 0 && (
                                <div className="px-3 py-3 text-xs text-slate-500 text-center">
                                  No other scenarios to compare.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Comparison delta chip — surfaces aggregate diff at a glance */}
                    {comparisonScenario && activeScenario && (() => {
                      const a = snapshotMetrics(activeScenario.snapshot)
                      const b = snapshotMetrics(comparisonScenario.snapshot)
                      const usfDelta = a.totalUSF - b.totalUSF
                      const hcDelta = a.totalHeadcount - b.totalHeadcount
                      const tone = (n: number) =>
                        n > 0 ? "text-emerald-700" : n < 0 ? "text-red-700" : "text-slate-500"
                      const fmt = (n: number) => (n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString())
                      return (
                        <span
                          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] tabular-nums"
                          title={`Active vs ${comparisonScenario.name}`}
                        >
                          <span className={`font-semibold ${tone(usfDelta)}`}>
                            {fmt(usfDelta)} USF
                          </span>
                          <span className="text-amber-300">·</span>
                          <span className={`font-semibold ${tone(hcDelta)}`}>
                            {fmt(hcDelta)} HC
                          </span>
                        </span>
                      )
                    })()}
                  </div>
                </div>

                {/*
                  Embedded program island: lives inside the header card at rest.
                  Fades out as the user scrolls past this card so the floating
                  sticky version can take over seamlessly.
                */}
                <div
                  className={`shrink-0 transition-opacity duration-300 ease-out ${
                    isHeaderInView ? "opacity-100" : "opacity-0"
                  }`}
                  aria-hidden={!isHeaderInView}
                >
                  <ProgramIsland
                    totalRSF={finalEditableTotals.totalRSF || 0}
                    totalUSF={finalEditableTotals.totalUSF || 0}
                    metrics={islandMetrics}
                    clientLogoUrl={clientLogoUrl}
                    defaultLogoUrl="/nelson-logo.png"
                    onUploadLogo={(dataUrl) => setClientLogoUrl(dataUrl)}
                    onRemoveLogo={() => setClientLogoUrl(null)}
                    variant="embedded"
                    headcount={targetHeadcount}
                    seatCount={finalEditableTotals.assignableSeats}
                    rsfPerPerson={targetHeadcount > 0 ? Math.round((finalEditableTotals.totalRSF || 0) / targetHeadcount) : 0}
                    usfPerPerson={targetHeadcount > 0 ? Math.round((finalEditableTotals.totalUSF || 0) / targetHeadcount) : 0}
                    scenarioName={activeScenario?.name}
                  />
                </div>
            </div>
          )}

          {/* ── Main scrollable content ── */}
          <div className="p-6">
            {/* KPI cards hidden - summary now lives in the floating dynamic island at the top */}
            <div className="hidden grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Total Space Card */}
              <div
                className="text-white p-6 rounded-xl shadow-lg relative overflow-hidden"
                style={{
                  background: "#2563eb",
                  backgroundImage: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e3a8a 100%)",
                }}
              >
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-white text-blue-900 border-white font-medium">
                    Configured ✓
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="w-5 h-5 text-white" />
                  <h3 className="text-sm font-medium text-white/80">Total Space</h3>
                </div>

                <div className="mb-4">
                  <div className="text-4xl font-semibold text-white mb-1">
                    {finalEditableTotals.totalRSF.toLocaleString()}
                  </div>
                  <div className="text-sm text-white/70">RSF</div>
                </div>

                <div className="mb-4">
                  <div className="text-xl font-medium text-white">
                    {finalEditableTotals.totalUSF.toLocaleString()} USF
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-white/70">Load Factor</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLoadFactor(Math.max(1.1, loadFactor - 0.01))}
                      className="w-6 h-6 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center text-blue-900 text-sm font-medium"
                    >
                      −
                    </button>
                    <span className="text-sm font-medium text-white w-12 text-center">{loadFactor.toFixed(2)}</span>
                    <button
                      onClick={() => setLoadFactor(Math.min(1.25, loadFactor + 0.01))}
                      className="w-6 h-6 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center text-blue-900 text-sm font-medium"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setLoadFactor(1.15)}
                      className="text-xs text-white/70 hover:text-white underline ml-2"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="text-sm text-white/70">Total Configured Spaces: {finalEditableTotals.totalSpaces}</div>

                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white/80">
                        Recommended: {finalEditableTotals.recommendedRSF.toLocaleString()} RSF
                      </div>
                      <div className="text-xs text-white/60">
                        {finalEditableTotals.rsfDifference > 0 ? "+" : ""}
                        {finalEditableTotals.rsfDifference.toLocaleString()} RSF vs planned
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          finalEditableTotals.totalSpaceStatus.text === "On Track"
                            ? "bg-green-400"
                            : finalEditableTotals.totalSpaceStatus.text === "Review"
                              ? "bg-yellow-400"
                              : "bg-red-400"
                        }`}
                      ></div>
                      <span className="text-xs text-white/80">{finalEditableTotals.totalSpaceStatus.text}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Workpoints Card (Expanded) */}
              <div
                className="text-white p-6 rounded-xl shadow-lg relative overflow-hidden"
                style={{
                  background: "#0d9488",
                  backgroundImage: "linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #134e4a 100%)",
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-5 h-5 text-white" />
                  <h3 className="text-sm font-medium text-white/80">Workpoints</h3>
                  <Popover>
                    <PopoverTrigger>
                      <Info className="w-4 h-4 text-white/60 hover:text-white" />
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-2 text-sm">
                        <p>
                          <strong>Primary In-Office Headcount:</strong> Employees with assigned desks and private
                          offices.
                        </p>
                        <p>
                          <strong>Formula:</strong> Employee workstations + Private offices
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="mb-4">
                  <div className="text-4xl font-semibold text-white mb-1">{finalEditableTotals.totalEmployees}</div>
                  <div className="text-sm text-white/70">Primary In-Office Headcount</div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/70">Assignable Seats</span>
                    <span className="text-xl font-semibold text-white">{finalEditableTotals.assignableSeats}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-white">{finalEditableTotals.totalDesks}</div>
                      <div className="text-xs text-white/60">Desks</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-white">{finalEditableTotals.totalOffices}</div>
                      <div className="text-xs text-white/60">Offices</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-white">{finalEditableTotals.totalFlex}</div>
                      <div className="text-xs text-white/60">Flex</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-white/70">vs Peak:</span>
                    <span className="text-sm font-medium text-yellow-300">
                      {finalEditableTotals.vsPeakSeats > 0 ? "+" : ""}
                      {finalEditableTotals.vsPeakSeats} seats
                    </span>
                  </div>

                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div
                      className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(Math.max((finalEditableTotals.assignableSeats / (finalEditableTotals.peakInOffice + 50)) * 100, 0), 100)}%`,
                      }}
                    ></div>
                  </div>

                  <div className="text-xs text-white/60">
                    Capacity utilization:{" "}
                    {finalEditableTotals.assignableSeats > 0
                      ? Math.round((finalEditableTotals.peakInOffice / finalEditableTotals.assignableSeats) * 100)
                      : 0}
                    % • Peak presence: {Math.round((finalEditableTotals.peakInOffice / targetHeadcount) * 100)}%
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white/80">Recommended: {targetHeadcount} headcount</div>
                      <div className="text-xs text-white/60">
                        {targetHeadcount > finalEditableTotals.totalEmployees
                          ? `+${(targetHeadcount - finalEditableTotals.totalEmployees).toLocaleString()} vs current`
                          : `${(targetHeadcount - finalEditableTotals.totalEmployees).toLocaleString()} vs current`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const diff = Math.abs(targetHeadcount - finalEditableTotals.totalEmployees)
                        const percentDiff =
                          finalEditableTotals.totalEmployees !== 0
                            ? (diff / finalEditableTotals.totalEmployees) * 100
                            : 0

                        if (percentDiff <= 10) {
                          return (
                            <>
                              <div className="w-2 h-2 rounded-full bg-green-400"></div>
                              <span className="text-xs text-white/80">On Track</span>
                            </>
                          )
                        } else if (percentDiff <= 20) {
                          return (
                            <>
                              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                              <span className="text-xs text-white/80">Review</span>
                            </>
                          )
                        } else {
                          return (
                            <>
                              <div className="w-2 h-2 rounded-full bg-red-400"></div>
                              <span className="text-xs text-white/80">Off Target</span>
                            </>
                          )
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* In-Office Dynamics Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-5 h-5 text-gray-600" />
                  <h3 className="text-sm font-medium text-gray-600">In-Office Dynamics</h3>
                  <Popover>
                    <PopoverTrigger>
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-2 text-sm">
                        <p>
                          <strong>Peak In-Office:</strong> Total capacity of desks, offices, and flex spaces with
                          designated tags.
                        </p>
                        <p>
                          <strong>Peak Seat Coverage:</strong> All assignable seats ÷ peak capacity.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="mb-4">
                  <div className="text-4xl font-semibold text-gray-900 mb-1">{finalEditableTotals.peakInOffice}</div>
                  <div className="text-sm text-gray-500">Peak In-Office</div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`text-xl font-medium ${
                        finalEditableTotals.peakSeatCoverage >= 0.8
                          ? "text-green-600"
                          : finalEditableTotals.peakSeatCoverage >= 0.6
                            ? "text-blue-600"
                            : finalEditableTotals.peakSeatCoverage >= 0.4
                              ? "text-amber-600"
                              : finalEditableTotals.peakSeatCoverage >= 0.2
                                ? "text-orange-600"
                                : "text-gray-600"
                      }`}
                    >
                      {(finalEditableTotals.peakSeatCoverage * 100).toFixed(0)}%
                    </div>
                    <Badge
                      variant={
                        finalEditableTotals.peakSeatCoverage >= 0.8
                          ? "default"
                          : finalEditableTotals.peakSeatCoverage >= 0.6
                            ? "default"
                            : finalEditableTotals.peakSeatCoverage >= 0.4
                              ? "secondary"
                              : finalEditableTotals.peakSeatCoverage >= 0.2
                                ? "secondary"
                                : "outline"
                      }
                      className="text-xs"
                    >
                      {finalEditableTotals.peakSeatCoverage >= 0.8
                        ? "Efficient"
                        : finalEditableTotals.peakSeatCoverage >= 0.6
                          ? "Flexible"
                          : finalEditableTotals.peakSeatCoverage >= 0.4
                            ? "Adaptive"
                            : finalEditableTotals.peakSeatCoverage >= 0.2
                              ? "Over-provisioned"
                              : "Underutilized"}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500">Peak Seat Coverage</div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">RSF/person (Primary)</span>
                    <span className="font-medium text-gray-900">
                      {finalEditableTotals.totalEmployees > 0
                        ? Math.round(finalEditableTotals.totalRSF / finalEditableTotals.totalEmployees)
                        : 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">RSF/person (Peak)</span>
                    <span className="font-medium text-gray-900">
                      {finalEditableTotals.peakInOffice > 0
                        ? Math.round(finalEditableTotals.totalRSF / finalEditableTotals.peakInOffice)
                        : 0}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-500">Difference</span>
                    <span className="font-medium text-gray-900">
                      {finalEditableTotals.totalEmployees > 0 && finalEditableTotals.peakInOffice > 0
                        ? Math.round(
                            finalEditableTotals.totalRSF / finalEditableTotals.totalEmployees -
                              finalEditableTotals.totalRSF / finalEditableTotals.peakInOffice,
                          )
                        : 0}{" "}
                      RSF
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary KPI strip hidden - focus is on the Configuration Targets hero and planning cards below */}
            <div className="hidden grid-cols-2 md:grid-cols-6 gap-3 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                <div className="text-lg font-semibold text-gray-900">{kpiData.meetingSeats}</div>
                <div className="text-xs text-gray-500">Meeting Seats</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                <div className="text-lg font-semibold text-gray-900">{kpiData.phoneBooths}</div>
                <div className="text-xs text-gray-500">Booths</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {finalEditableTotals.totalEmployees > 0
                    ? Math.round(finalEditableTotals.totalRSF / finalEditableTotals.totalEmployees)
                    : 0}
                </div>
                <div className="text-xs text-gray-500">RSF/person</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                <div className="text-lg font-semibold text-gray-900">{loadFactor.toFixed(2)}</div>
                <div className="text-xs text-gray-500">Load Factor</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {finalEditableTotals.totalEmployees > 0
                    ? Math.round((finalEditableTotals.peakInOffice / finalEditableTotals.totalEmployees) * 100)
                    : 0}
                  %
                </div>
                <div className="text-xs text-gray-500">Peak Presence</div>
              </div>
            </div>

            {/* Phase 4 — Quick Start banner: shown when no program has been loaded yet */}
            {programMetrics === null && (
              <div className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-6">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-900">No program loaded yet</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Use Fast Track for a ratio-based start, generate from headcount, or build from scratch.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowOnboarding(true)}
                    className="px-3 py-1.5 rounded-full bg-white border border-blue-300 text-blue-800 text-xs font-medium hover:bg-blue-50 transition-colors"
                  >
                    Fast Track
                  </button>
                  <button
                    onClick={() => setQuickGenOpen(true)}
                    className="px-3 py-1.5 rounded-full bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 transition-colors"
                  >
                    Generate from headcount
                  </button>
                </div>
              </div>
            )}

            {canvasMode === "workbench" && !showTargetsSidebar && (
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200 shadow-sm mb-8">
              <div
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-gradient-to-br hover:from-slate-100 hover:to-blue-100 transition-colors rounded-t-xl"
                onClick={() => setConfigExpanded(!configExpanded)}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Configuration Targets</h2>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-slate-600 transition-transform ${configExpanded ? "rotate-180" : ""}`}
                />
              </div>

              {configExpanded && (() => {
                // Derived allocation totals from department breakdown (current state)
                const allocHeadcount = departments.reduce((s, d) => s + (d.headcount || 0), 0)
                const allocOffices = departments.reduce((s, d) => s + (d.officeCount || 0), 0)
                const allocHybrid = departments.reduce((s, d) => s + (d.hybridWorkers || 0), 0)
                const allocWorkstations = departments.reduce((s, d) => s + (d.workstations || 0), 0)

                // Future state allocations (when growth planning is on)
                // Future headcount is explicit; future offices/workstations/hybrid are computed
                // using the same per-department ratios as current state.
                const futureAllocHeadcount = departments.reduce(
                  (s, d) => s + (d.futureHeadcount ?? d.headcount ?? 0),
                  0
                )
                // Compute future KPIs by scaling current ratios by future headcount per dept.
                // If a department has futureHeadcount, scale its offices/workstations/hybrid
                // proportionally; otherwise keep current values.
                const futureAllocOffices = departments.reduce((s, d) => {
                  const curr = d.headcount || 1
                  const fut = d.futureHeadcount ?? curr
                  const scale = fut / curr
                  return s + Math.round((d.officeCount || 0) * scale)
                }, 0)
                const futureAllocWorkstations = departments.reduce((s, d) => {
                  const curr = d.headcount || 1
                  const fut = d.futureHeadcount ?? curr
                  const scale = fut / curr
                  return s + Math.round((d.workstations || 0) * scale)
                }, 0)
                const futureAllocHybrid = departments.reduce((s, d) => {
                  const curr = d.headcount || 1
                  const fut = d.futureHeadcount ?? curr
                  const scale = fut / curr
                  return s + Math.round((d.hybridWorkers || 0) * scale)
                }, 0)

                // Future targets (computed from future headcount with same ratios as company-level)
                const futureTargetHeadcount = futureAllocHeadcount
                const futureTargetOffices = futureAllocOffices
                const futureTargetWorkstations = futureAllocWorkstations
                const futureTargetHybrid = futureAllocHybrid

                // TargetTile is defined at module scope (above Home) for stable identity.
                // This prevents React from unmounting the input on every parent re-render
                // which was the root cause of the "only one digit" input bug.

                return (
                  <div className="px-6 pb-6 pt-2 space-y-5">
                    {/* Company-level targets - configured independently */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900">Company Targets</h3>
                          <span className="text-xs text-slate-500">
                            {planForGrowth ? "Showing Current → Future" : "Configure at the company level"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Recalibrate: aligns every card's quantity to the active targets.
                              Aims at future state when growth planning is on. */}
                          <button
                            onClick={openRecalibratePreview}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                            title={
                              planForGrowth
                                ? "Recalibrate all cards to future-state targets"
                                : "Recalibrate all cards to current targets"
                            }
                          >
                            <RefreshCw className="w-3 h-3" />
                            Recalibrate
                            {planForGrowth && (
                              <span className="ml-0.5 text-[9px] uppercase tracking-wider font-semibold">
                                Future
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => setShowRecommendations(!showRecommendations)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              showRecommendations ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {showRecommendations ? "Hide" : "Show"} Recommendations
                          </button>
                        </div>
                      </div>
                      {(() => {
                        // Bridge between Workspace Type tags on cards and Configuration Targets:
                        //   "private"   -> Offices target
                        //   "employee"  -> Workstations target
                        //   "flex"      -> Hybrid target (workpoints / hoteling)
                        const configuredOffices = getWorkspaceTypeDistribution("private").configured
                        const configuredWorkstations = getWorkspaceTypeDistribution("employee").configured
                        const configuredHybrid = getWorkspaceTypeDistribution("flex").configured
                        return (
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <TargetTile
                              label="Headcount"
                              value={targetHeadcount}
                              onChange={setTargetHeadcount}
                              allocated={allocHeadcount}
                              accent="blue"
                              icon={<Users className="w-4 h-4 text-blue-700" />}
                              growthMode={planForGrowth}
                              futureValue={planForGrowth ? futureTargetHeadcount : undefined}
                              futureAllocated={planForGrowth ? futureAllocHeadcount : undefined}
                              showAllocations={visibility.allocations}
                            />
                            <TargetTile
                              label="Offices"
                              value={targetOfficeCount}
                              onChange={setTargetOfficeCount}
                              allocated={allocOffices}
                              configured={configuredOffices}
                              configuredLabel="Configured (Private)"
                              accent="slate"
                              icon={<Building className="w-4 h-4 text-slate-700" />}
                              growthMode={planForGrowth}
                              futureValue={planForGrowth ? futureTargetOffices : undefined}
                              futureAllocated={planForGrowth ? futureAllocOffices : undefined}
                              showAllocations={visibility.allocations}
                            />
                            <TargetTile
                              label="Workstations"
                              value={targetWorkstations}
                              onChange={setTargetWorkstations}
                              allocated={allocWorkstations}
                              configured={configuredWorkstations}
                              configuredLabel="Configured (Employee)"
                              accent="amber"
                              icon={<Building2 className="w-4 h-4 text-amber-700" />}
                              growthMode={planForGrowth}
                              futureValue={planForGrowth ? futureTargetWorkstations : undefined}
                              futureAllocated={planForGrowth ? futureAllocWorkstations : undefined}
                              showAllocations={visibility.allocations}
                            />
                            <TargetTile
                              label="Hybrid"
                              value={targetHybridWorkers}
                              onChange={setTargetHybridWorkers}
                              allocated={allocHybrid}
                              configured={configuredHybrid}
                              configuredLabel="Configured (Flex)"
                              accent="emerald"
                              icon={<Home className="w-4 h-4 text-emerald-700" />}
                              growthMode={planForGrowth}
                              futureValue={planForGrowth ? futureTargetHybrid : undefined}
                              futureAllocated={planForGrowth ? futureAllocHybrid : undefined}
                              showAllocations={visibility.allocations}
                            />
                          </div>
                        )
                      })()}
                    </div>

                    {/* Department Management - collapsible, secondary to company targets */}
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                      <button
                        onClick={() => setDeptBreakdownExpanded(!deptBreakdownExpanded)}
                        className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {deptBreakdownExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          )}
                          <h3 className="text-sm font-semibold text-slate-900">Department Management</h3>
                          <span className="text-xs text-slate-500">
                            ({departments.length} {departments.length === 1 ? "department" : "departments"})
                          </span>
                        </div>
                        <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-600">
                          <span className="tabular-nums" title="Headcount allocated to departments">
                            <span className="font-semibold text-slate-900">{allocHeadcount}</span>
                            <span className="text-slate-400"> / {targetHeadcount}</span> HC
                          </span>
                          <span className="tabular-nums" title="Offices allocated to departments">
                            <span className="font-semibold text-slate-900">{allocOffices}</span>
                            <span className="text-slate-400"> / {targetOfficeCount}</span> Off
                          </span>
                          <span className="tabular-nums" title="Workstations allocated to departments">
                            <span className="font-semibold text-slate-900">{allocWorkstations}</span>
                            <span className="text-slate-400"> / {targetWorkstations}</span> WS
                          </span>
                          <span className="tabular-nums" title="Hybrid allocated to departments">
                            <span className="font-semibold text-slate-900">{allocHybrid}</span>
                            <span className="text-slate-400"> / {targetHybridWorkers}</span> Hyb
                          </span>
                        </div>
                      </button>

                      {deptBreakdownExpanded && (
                        <div>
                          <div className="flex items-center justify-end px-5 py-2 border-t border-slate-200 bg-white">
                            <button
                              onClick={addDepartment}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                            >
                              <Plus className="w-3 h-3" /> Add Department
                            </button>
                          </div>

                          <div
                            className={`grid gap-3 px-5 py-2.5 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-y border-slate-100 ${
                              planForGrowth
                                ? "grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_auto]"
                                : "grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]"
                            }`}
                          >
                            <div>Department</div>
                            <div className="text-center">Headcount</div>
                            {planForGrowth && (
                              <div className="text-center text-emerald-600">
                                Future HC
                              </div>
                            )}
                            <div className="text-center">Offices</div>
                            <div className="text-center">Workstations</div>
                            <div className="text-center">Hybrid</div>
                            <div className="w-5" />
                          </div>

                          <div className="divide-y divide-slate-100">
                            {departments.map((dept) => {
                              const stepper = (
                                field: DeptField,
                                value: number,
                                colorClasses: string,
                              ) => (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => updateDepartmentTarget(dept.id, field, -1)}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${colorClasses}`}
                                    aria-label={`Decrease ${dept.name} ${field}`}
                                  >
                                    -
                                  </button>
                                  <NumberField
                                    value={value}
                                    onChange={(n) => setDepartmentTarget(dept.id, field, n)}
                                    ariaLabel={`${dept.name} ${field}`}
                                    className="w-10 text-center text-sm font-semibold tabular-nums text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                                  />
                                  <button
                                    onClick={() => updateDepartmentTarget(dept.id, field, 1)}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${colorClasses}`}
                                    aria-label={`Increase ${dept.name} ${field}`}
                                  >
                                    +
                                  </button>
                                </div>
                              )
                              return (
                                <div
                                  key={dept.id}
                                  className={`grid gap-3 px-5 py-2.5 items-center hover:bg-slate-50/60 transition-colors ${
                                    planForGrowth
                                      ? "grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_auto]"
                                      : "grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-2 h-2 rounded-full ${dept.color} shrink-0`} />
                                    <input
                                      type="text"
                                      value={dept.name}
                                      onChange={(e) => updateDepartmentName(dept.id, e.target.value)}
                                      className="text-sm font-medium text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full truncate"
                                    />
                                  </div>
                                  {stepper("headcount", dept.headcount, "bg-blue-100 hover:bg-blue-200 text-blue-700")}
                                  {planForGrowth &&
                                    stepper(
                                      "futureHeadcount",
                                      dept.futureHeadcount ?? dept.headcount,
                                      "bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
                                    )}
                                  {stepper("officeCount", dept.officeCount, "bg-slate-100 hover:bg-slate-200 text-slate-700")}
                                  {stepper("workstations", dept.workstations, "bg-amber-100 hover:bg-amber-200 text-amber-700")}
                                  {stepper("hybridWorkers", dept.hybridWorkers, "bg-emerald-100 hover:bg-emerald-200 text-emerald-700")}
                                  <button
                                    onClick={() => deleteDepartment(dept.id)}
                                    className="text-slate-400 hover:text-red-600 transition-colors"
                                    aria-label={`Delete ${dept.name}`}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )
                            })}
                          </div>

                          <div
                            className={`grid gap-3 px-5 py-2.5 bg-slate-900 text-white ${
                              planForGrowth
                                ? "grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_auto]"
                                : "grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]"
                            }`}
                          >
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                              Allocated
                            </div>
                            <div className="text-center text-sm font-semibold tabular-nums">
                              {allocHeadcount}
                              <span className="text-slate-400 font-normal"> / {targetHeadcount}</span>
                            </div>
                            {planForGrowth && (
                              <div className="text-center text-sm font-semibold tabular-nums text-emerald-400">
                                {futureAllocHeadcount}
                                {futureAllocHeadcount !== allocHeadcount && (
                                  <span className="text-emerald-300 text-[10px] ml-1">
                                    (+{futureAllocHeadcount - allocHeadcount})
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="text-center text-sm font-semibold tabular-nums">
                              {allocOffices}
                              <span className="text-slate-400 font-normal"> / {targetOfficeCount}</span>
                            </div>
                            <div className="text-center text-sm font-semibold tabular-nums">
                              {allocWorkstations}
                              <span className="text-slate-400 font-normal"> / {targetWorkstations}</span>
                            </div>
                            <div className="text-center text-sm font-semibold tabular-nums">
                              {allocHybrid}
                              <span className="text-slate-400 font-normal"> / {targetHybridWorkers}</span>
                            </div>
                            <div className="w-4" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
            )}

            <div className="w-full">
              <ZoneHeader
                title="Focus Spaces"
                usf={finalEditableTotals.focusUSF}
                totalUSF={finalEditableTotals.totalUSF}
                color="bg-cyan-500"
                circulation={zoneCirculation["Focus Open"]}
                onCirculationChange={(value) => {
                  setZoneCirculation((prev) => ({
                    ...prev,
                    "Focus Open": value,
                    "Focus Enclosed": value,
                  }))
                }}
                viewMode={zoneViewMode["Focus Open"]}
                onViewModeChange={(mode) =>
                  setZoneViewMode((prev) => ({
                    ...prev,
                    "Focus Open": mode,
                    "Focus Enclosed": mode,
                  }))
                }
                gapBadges={canvasMode === "workbench" ? [
                  { label: "offices", configured: getWorkspaceTypeDistribution("private").configured, target: targetOfficeCount },
                  { label: "workstations", configured: getWorkspaceTypeDistribution("employee").configured + getWorkspaceTypeDistribution("flex").configured, target: targetWorkstations + targetHybridWorkers },
                ] : undefined}
              />

              {/* Focus mode: always side-by-side Open / Enclosed */}
              {canvasMode === "focus" ? (
                <div className="bg-white rounded-lg border border-gray-200 mb-8 overflow-hidden">
                  <div className="grid grid-cols-2 divide-x divide-slate-100">
                    {/* Focus Open column */}
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                          <span className="text-xs font-semibold text-slate-700">Focus Open</span>
                          <span className="text-[10px] text-slate-400 tabular-nums">{finalEditableTotals.focusOpenUSF.toLocaleString()} USF</span>
                        </div>
                        <button onClick={() => setAddSpaceDialog({ open: true, zone: "Focus Open" })} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                      {zoneViewMode["Focus Open"] === "table" ? (
                        <ZoneTable zoneSpaceEntries={Object.entries(editableSpaces).filter(([_, s]) => s.zone === "Focus Open")} focusMode={true} visibility={visibility} />
                      ) : (
                        <div className="p-4 grid grid-cols-1 gap-3">
                          {Object.entries(editableSpaces).filter(([_, s]) => s.zone === "Focus Open").map(([spaceKey, space]) => (
                            <SpaceCard key={spaceKey} spaceKey={spaceKey} space={space} updateSpace={updateSpace} toggleDedicatedStatus={toggleDedicatedStatus} departments={departments} departmentExpansionState={departmentExpansionState} setDepartmentExpansionState={setDepartmentExpansionState} configuredByDeptAndType={configuredByDeptAndType} plannedByType={{ employee: Math.max(0, targetHeadcount - targetOfficeCount), private: targetOfficeCount, flex: targetHybridWorkers }} visibility={visibility} />
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Focus Enclosed column */}
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-teal-600" />
                          <span className="text-xs font-semibold text-slate-700">Focus Enclosed</span>
                          <span className="text-[10px] text-slate-400 tabular-nums">{finalEditableTotals.focusEnclosedUSF.toLocaleString()} USF</span>
                        </div>
                        <button onClick={() => setAddSpaceDialog({ open: true, zone: "Focus Enclosed" })} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                      {zoneViewMode["Focus Enclosed"] === "table" ? (
                        <ZoneTable zoneSpaceEntries={Object.entries(editableSpaces).filter(([_, s]) => s.zone === "Focus Enclosed")} focusMode={true} visibility={visibility} />
                      ) : (
                        <div className="p-4 grid grid-cols-1 gap-3">
                          {Object.entries(editableSpaces).filter(([_, s]) => s.zone === "Focus Enclosed").map(([spaceKey, space]) => (
                            <SpaceCard key={spaceKey} spaceKey={spaceKey} space={space} updateSpace={updateSpace} toggleDedicatedStatus={toggleDedicatedStatus} departments={departments} departmentExpansionState={departmentExpansionState} setDepartmentExpansionState={setDepartmentExpansionState} configuredByDeptAndType={configuredByDeptAndType} plannedByType={{ employee: Math.max(0, targetHeadcount - targetOfficeCount), private: targetOfficeCount, flex: targetHybridWorkers }} visibility={visibility} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                <div className="mb-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                      <h4 className="text-md font-medium text-gray-800">
                        Focus Open ({finalEditableTotals.focusOpenUSF.toLocaleString()} USF)
                      </h4>
                    </div>
                    <button
                      onClick={() => setAddSpaceDialog({ open: true, zone: "Focus Open" })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Space
                    </button>
                  </div>
                  {zoneViewMode["Focus Open"] === "table" ? (
                    // Table view: dense, inline-editable. Drag/drop is disabled in this mode
                    // since the table layout doesn't visually support card reordering well.
                    <ZoneTable
                      zoneSpaceEntries={Object.entries(editableSpaces).filter(
                        ([_, space]) => space.zone === "Focus Open",
                      )}
                      focusMode={false}
                      visibility={visibility}
                    />
                  ) : (
                    <Droppable droppableId="Focus Open">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                        >
                          {Object.entries(editableSpaces)
                            .filter(([_, space]) => space.zone === "Focus Open")
                            .map(([spaceKey, space], index) => (
                              <Draggable key={spaceKey} draggableId={spaceKey} index={index}>
                                {(dragProvided) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                  >
                                    <SpaceCard
                                      spaceKey={spaceKey}
                                      space={space}
                                      updateSpace={updateSpace}
                                      toggleDedicatedStatus={toggleDedicatedStatus}
                                      departments={departments}
                                      departmentExpansionState={departmentExpansionState}
                                      setDepartmentExpansionState={setDepartmentExpansionState}
                                      configuredByDeptAndType={configuredByDeptAndType}
                                      plannedByType={{
                                        employee: Math.max(0, targetHeadcount - targetOfficeCount),
                                        private: targetOfficeCount,
                                        flex: targetHybridWorkers,
                                      }}
                                      visibility={visibility}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-cyan-600"></div>
                      <h4 className="text-md font-medium text-gray-800">
                        Focus Enclosed ({finalEditableTotals.focusEnclosedUSF.toLocaleString()} USF)
                      </h4>
                    </div>
                    <button
                      onClick={() => setAddSpaceDialog({ open: true, zone: "Focus Enclosed" })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Space
                    </button>
                  </div>
                  {zoneViewMode["Focus Enclosed"] === "table" ? (
                    <ZoneTable
                      zoneSpaceEntries={Object.entries(editableSpaces).filter(
                        ([_, space]) => space.zone === "Focus Enclosed",
                      )}
                      focusMode={false}
                      visibility={visibility}
                    />
                  ) : (
                    <Droppable droppableId="Focus Enclosed">
                      {(provided) => {
                        const focusOpenSpaces = Object.entries(editableSpaces).filter(
                          ([_, space]) => space.zone === "Focus Open",
                        )
                        const focusEnclosedSpaces = Object.entries(editableSpaces).filter(
                          ([_, space]) => space.zone === "Focus Enclosed",
                        )
                        return (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
                          >
                            {focusEnclosedSpaces.map(([spaceKey, space], index) => (
                              <Draggable
                                key={spaceKey}
                                draggableId={spaceKey}
                                index={focusOpenSpaces.length + index}
                              >
                                {(dragProvided) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                  >
                                    <SpaceCard
                                      spaceKey={spaceKey}
                                      space={space}
                                      updateSpace={updateSpace}
                                      toggleDedicatedStatus={toggleDedicatedStatus}
                                      departments={departments}
                                      departmentExpansionState={departmentExpansionState}
                                      setDepartmentExpansionState={setDepartmentExpansionState}
                                      configuredByDeptAndType={configuredByDeptAndType}
                                      plannedByType={{
                                        employee: Math.max(0, targetHeadcount - targetOfficeCount),
                                        private: targetOfficeCount,
                                        flex: targetHybridWorkers,
                                      }}
                                      visibility={visibility}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )
                      }}
                    </Droppable>
                  )}
                </div>
              </div>
              )}

              {["Collaborative", "Support", "Wellness"].map((zoneName) => {
                const zoneSpaces = Object.entries(editableSpaces).filter(([_, space]) => space.zone === zoneName)
                const zoneUSF = finalEditableTotals[`${zoneName.toLowerCase()}USF`] || 0
                const zoneColor = zoneColors[zoneName]
                const mode = zoneViewMode[zoneName] || "cards"

                return (
                  <div key={zoneName}>
                    <ZoneHeader
                      title={`${zoneName} Spaces`}
                      usf={zoneUSF}
                      totalUSF={finalEditableTotals.totalUSF}
                      color={zoneColor.dot}
                      circulation={zoneCirculation[zoneName] || 30}
                      onCirculationChange={(value) => {
                        setZoneCirculation((prev) => ({
                          ...prev,
                          [zoneName]: value,
                        }))
                      }}
                      viewMode={mode}
                      onViewModeChange={(m) =>
                        setZoneViewMode((prev) => ({ ...prev, [zoneName]: m }))
                      }
                      onAddSpace={() => setAddSpaceDialog({ open: true, zone: zoneName })}
                    />

                    {mode === "table" ? (
                      <ZoneTable zoneSpaceEntries={zoneSpaces} focusMode={canvasMode === "focus"} visibility={visibility} />
                    ) : (
                      <Droppable droppableId={zoneName}>
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                          >
                            {zoneSpaces.map(([spaceKey, space], index) => (
                              <Draggable key={spaceKey} draggableId={spaceKey} index={index}>
                                {(provided) => (
                                  <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                    <SpaceCard
                                      spaceKey={spaceKey}
                                      space={space}
                                      updateSpace={updateSpace}
                                      toggleDedicatedStatus={toggleDedicatedStatus}
                                      departments={departments}
                                      departmentExpansionState={departmentExpansionState}
                                      setDepartmentExpansionState={setDepartmentExpansionState}
                                      configuredByDeptAndType={configuredByDeptAndType}
                                      plannedByType={{
                                        employee: Math.max(0, targetHeadcount - targetOfficeCount),
                                        private: targetOfficeCount,
                                        flex: targetHybridWorkers,
                                      }}
                                      visibility={visibility}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sidebar - hidden for simplified UI, focus is on planning cards */}
          <div className="hidden w-96 bg-gray-50 border-l border-gray-200 sticky top-0 h-screen overflow-y-auto">
            <div className="m-4 bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Space Breakdown</h3>
              </div>

              <div className="mb-6">
                <div className="text-2xl font-semibold text-gray-900">
                  {finalEditableTotals.totalUSF.toLocaleString()} USF
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(zoneBreakdown).map(([zone, data]) => (
                  <div key={zone} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                        <span className="text-sm font-medium text-gray-700">{zone}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">{data.percentage}%</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="w-full bg-gray-100 rounded-full h-2 mr-3">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            backgroundColor: data.color,
                            width: `${data.percentage}%`,
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 min-w-fit">{data.usf.toLocaleString()} USF</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-4 space-y-4">
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-white rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <span>Planning Insights</span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 bg-white rounded-lg border border-gray-200 p-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">RSF/person (Primary)</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {finalEditableTotals.totalEmployees > 0
                            ? Math.round(finalEditableTotals.totalRSF / finalEditableTotals.totalEmployees)
                            : 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">RSF/person (Peak)</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {finalEditableTotals.peakInOffice > 0
                            ? Math.round(finalEditableTotals.totalRSF / finalEditableTotals.peakInOffice)
                            : 0}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Capacity Buffer</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {finalEditableTotals.assignableWorkpoints - finalEditableTotals.peakInOffice > 0 ? "+" : ""}
                          {finalEditableTotals.assignableWorkpoints - finalEditableTotals.peakInOffice} seats
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Space Density</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {finalEditableTotals.totalRSF > 0
                            ? Math.round((finalEditableTotals.peakInOffice / finalEditableTotals.totalRSF) * 1000)
                            : 0}
                          <span className="text-sm text-gray-500 ml-1">people/1000 RSF</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-white rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <span>Quick Ratios</span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 bg-white rounded-lg border border-gray-200 p-4">
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Meeting Seats/100 People</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {finalEditableTotals.peakInOffice > 0
                          ? Math.round((kpiData.meetingSeats / finalEditableTotals.peakInOffice) * 100)
                          : 0}
                        {kpiData.meetingSeats > 0 &&
                          finalEditableTotals.peakInOffice > 0 &&
                          Math.round((kpiData.meetingSeats / finalEditableTotals.peakInOffice) * 100) < 20 && (
                            <span className="ml-2 text-amber-600 text-xs">⚠ Low</span>
                          )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Focus Space Ratio</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {(() => {
                            const focusSpaces = Object.entries(zoneBreakdown)
                              .filter(([zone]) => zone.includes("Focus"))
                              .reduce((sum, [, data]) => sum + data.usf, 0)
                            const totalAssignableUSF = finalEditableTotals.assignableWorkpoints * 150 // Assuming 150 RSF/person as a baseline
                            return totalAssignableUSF > 0 ? Math.round((focusSpaces / totalAssignableUSF) * 100) : 0
                          })()}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Collab Space Ratio</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {(() => {
                            const collabSpaces = zoneBreakdown["Collaborative"]?.usf || 0
                            const totalAssignableUSF = finalEditableTotals.assignableWorkpoints * 150 // Assuming 150 RSF/person as a baseline
                            return totalAssignableUSF > 0 ? Math.round((collabSpaces / totalAssignableUSF) * 100) : 0
                          })()}%
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-white rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <span>Workpoints Insights</span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 bg-white rounded-lg border border-gray-200 p-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Desk Utilization</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {kpiData.desks > 0
                            ? Math.round((finalEditableTotals.totalEmployees / kpiData.desks) * 100)
                            : 0}
                          %
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Flex Capacity</div>
                        <div className="text-lg font-semibold text-gray-900">{kpiData.flex} seats</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Peak vs Assigned</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {finalEditableTotals.peakInOffice > finalEditableTotals.totalEmployees ? "+" : ""}
                        {finalEditableTotals.peakInOffice - finalEditableTotals.totalEmployees} people
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="mx-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Departments</h3>
                <button
                  onClick={addDepartment}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              <Droppable droppableId="departments">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {departments.map((department, index) => (
                      <Draggable key={department.id} draggableId={department.id} index={index}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                            <DepartmentRow
                              department={department}
                              isEditing={editingDepartment === department.id}
                              onEdit={() => setEditingDepartment(department.id)}
                              onSave={(name) => {
                                updateDepartmentName(department.id, name)
                                setEditingDepartment(null)
                              }}
                              onCancel={() => setEditingDepartment(null)}
                              onDuplicate={() => duplicateDepartment(department.id)}
                              onDelete={() => deleteDepartment(department.id)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
          </div>

          </ResizablePanel>

          {/* ── Config Targets Sidebar — resizable panel ── */}
          {showTargetsSidebar && canvasMode === "workbench" && (
            <>
            <ResizableHandle withHandle className="bg-slate-200 hover:bg-teal-400 transition-colors" />
            <ResizablePanel defaultSize={32} minSize={20} maxSize={55}>
            <div className="h-full border-l border-slate-200 bg-white overflow-y-auto flex flex-col">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-500" />
                  <h2 className="text-sm font-semibold text-slate-900">Configuration Targets</h2>
                </div>
                <button
                  onClick={() => setShowTargetsSidebar(false)}
                  className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  title="Close sidebar"
                >
                  <PanelRightClose className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {(() => {
                  const allocHeadcount = departments.reduce((s, d) => s + (d.headcount || 0), 0)
                  const allocOffices = departments.reduce((s, d) => s + (d.officeCount || 0), 0)
                  const allocHybrid = departments.reduce((s, d) => s + (d.hybridWorkers || 0), 0)
                  const allocWorkstations = departments.reduce((s, d) => s + (d.workstations || 0), 0)
                  const futureAllocHeadcount = departments.reduce((s, d) => s + (d.futureHeadcount ?? d.headcount ?? 0), 0)
                  const futureAllocOffices = departments.reduce((s, d) => { const curr = d.headcount || 1; const fut = d.futureHeadcount ?? curr; return s + Math.round((d.officeCount || 0) * (fut / curr)) }, 0)
                  const futureAllocWorkstations = departments.reduce((s, d) => { const curr = d.headcount || 1; const fut = d.futureHeadcount ?? curr; return s + Math.round((d.workstations || 0) * (fut / curr)) }, 0)
                  const futureAllocHybrid = departments.reduce((s, d) => { const curr = d.headcount || 1; const fut = d.futureHeadcount ?? curr; return s + Math.round((d.hybridWorkers || 0) * (fut / curr)) }, 0)
                  const configuredOffices = getWorkspaceTypeDistribution("private").configured
                  const configuredWorkstations = getWorkspaceTypeDistribution("employee").configured
                  const configuredHybrid = getWorkspaceTypeDistribution("flex").configured
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Company Targets</span>
                        <button
                          onClick={openRecalibratePreview}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Recalibrate{planForGrowth ? " Future" : ""}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <TargetTile label="Headcount" value={targetHeadcount} onChange={setTargetHeadcount} allocated={allocHeadcount} accent="blue" icon={<Users className="w-4 h-4 text-blue-700" />} growthMode={planForGrowth} futureValue={planForGrowth ? futureAllocHeadcount : undefined} futureAllocated={planForGrowth ? futureAllocHeadcount : undefined} showAllocations={visibility.allocations} />
                        <TargetTile label="Offices" value={targetOfficeCount} onChange={setTargetOfficeCount} allocated={allocOffices} configured={configuredOffices} configuredLabel="Configured" accent="slate" icon={<Building className="w-4 h-4 text-slate-700" />} growthMode={planForGrowth} futureValue={planForGrowth ? futureAllocOffices : undefined} futureAllocated={planForGrowth ? futureAllocOffices : undefined} showAllocations={visibility.allocations} />
                        <TargetTile label="Workstations" value={targetWorkstations} onChange={setTargetWorkstations} allocated={allocWorkstations} configured={configuredWorkstations} configuredLabel="Configured" accent="amber" icon={<Building2 className="w-4 h-4 text-amber-700" />} growthMode={planForGrowth} futureValue={planForGrowth ? futureAllocWorkstations : undefined} futureAllocated={planForGrowth ? futureAllocWorkstations : undefined} showAllocations={visibility.allocations} />
                        <TargetTile label="Hybrid" value={targetHybridWorkers} onChange={setTargetHybridWorkers} allocated={allocHybrid} configured={configuredHybrid} configuredLabel="Configured" accent="emerald" icon={<Home className="w-4 h-4 text-emerald-700" />} growthMode={planForGrowth} futureValue={planForGrowth ? futureAllocHybrid : undefined} futureAllocated={planForGrowth ? futureAllocHybrid : undefined} showAllocations={visibility.allocations} />
                      </div>

                      {/* Program Status — gap analysis between targets and designed spaces */}
                      {(() => {
                        const rows = [
                          { label: "Offices", configured: configuredOffices, target: targetOfficeCount, accent: "slate" },
                          { label: "Workstations", configured: configuredWorkstations, target: targetWorkstations, accent: "amber" },
                          { label: "Hybrid Seats", configured: configuredHybrid, target: targetHybridWorkers, accent: "emerald" },
                        ] as const
                        const anyGap = rows.some(r => r.target > 0 && r.configured < r.target)
                        const allMet = rows.every(r => r.target === 0 || r.configured >= r.target)
                        return (
                          <div className={`rounded-xl border p-3 ${allMet ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                            <div className="flex items-center justify-between mb-2.5">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Program Status</span>
                              <span className={`text-[10px] font-semibold ${allMet ? "text-emerald-600" : "text-amber-600"}`}>
                                {allMet ? "✓ On track" : `${rows.filter(r => r.target > 0 && r.configured < r.target).length} gap${rows.filter(r => r.target > 0 && r.configured < r.target).length > 1 ? "s" : ""}`}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {rows.map(({ label, configured, target }) => {
                                if (target === 0) return null
                                const pct = Math.min(100, Math.round((configured / target) * 100))
                                const gap = target - configured
                                const met = gap <= 0
                                return (
                                  <div key={label}>
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="text-[11px] text-slate-600">{label}</span>
                                      <span className={`text-[11px] font-semibold tabular-nums ${met ? "text-emerald-700" : "text-amber-700"}`}>
                                        {configured} / {target}
                                        {!met && <span className="ml-1 font-normal text-amber-500">({gap} short)</span>}
                                      </span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${met ? "bg-emerald-500" : pct >= 75 ? "bg-amber-400" : "bg-amber-500"}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })()}

                      {/* Department Management collapsible */}
                      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <button
                          onClick={() => setDeptBreakdownExpanded(!deptBreakdownExpanded)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {deptBreakdownExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                            <span className="text-xs font-semibold text-slate-700">Department Management</span>
                            <span className="text-xs text-slate-400">({departments.length})</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 tabular-nums">
                            <span><span className="font-semibold text-slate-900">{allocHeadcount}</span>/{targetHeadcount} HC</span>
                          </div>
                        </button>
                        {deptBreakdownExpanded && (
                          <div className="divide-y divide-slate-100">
                            {departments.map((dept) => (
                              <div key={dept.id} className="flex items-center gap-3 px-4 py-2.5">
                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dept.color}`} />
                                <span className="flex-1 text-sm text-slate-700 min-w-0 truncate">{dept.name}</span>
                                <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums shrink-0">
                                  <span title="Headcount">{dept.headcount ?? 0} HC</span>
                                  <span className="text-slate-300">·</span>
                                  <span title="Offices">{dept.officeCount ?? 0} Off</span>
                                </div>
                              </div>
                            ))}
                            <div className="px-4 py-2">
                              <button
                                onClick={addDepartment}
                                className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add department
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Days in Office slider (config) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Days in Office</span>
                          <span className="text-sm font-semibold text-slate-900">{config.daysInOffice} day{config.daysInOffice !== 1 ? "s" : ""}/week</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={5}
                          value={config.daysInOffice}
                          onChange={(e) => setConfig((prev) => ({ ...prev, daysInOffice: parseInt(e.target.value) }))}
                          className="w-full accent-teal-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
            </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
        )}
      </DragDropContext>

      {/* Recalibrate preview modal — review and selectively apply target-driven changes */}
      {recalibratePreview && (() => {
        const changes = recalibratePreview
        const selectedCount = changes.filter((c) => c.selected).length
        const allSelected = changes.length > 0 && selectedCount === changes.length
        const noneSelected = selectedCount === 0
        // Group changes by zone for visual grouping in the diff list.
        const grouped = changes.reduce<Record<string, RecalibrateChange[]>>(
          (acc, c) => {
            ;(acc[c.zone] = acc[c.zone] || []).push(c)
            return acc
          },
          {}
        )
        const zoneOrder = ["Focus Open", "Focus Enclosed", "Collaborative", "Support", "Wellness"]
        return (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Recalibrate preview"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-lg font-semibold text-slate-900">
                      Recalibrate from targets
                    </h2>
                    {planForGrowth && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold uppercase tracking-wider">
                        Future state
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {changes.length === 0
                      ? "Everything is already aligned with your targets."
                      : `${changes.length} card${changes.length === 1 ? "" : "s"} would change. Review and apply selectively.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRecalibratePreview(null)}
                  className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              {changes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                    <Check className="w-6 h-6 text-emerald-700" />
                  </div>
                  <p className="text-sm text-slate-700">
                    Every card matches the recommended quantity.
                  </p>
                </div>
              ) : (
                <>
                  {/* Toolbar */}
                  <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => toggleAllRecalibrateRows(!allSelected)}
                      className="text-slate-600 hover:text-slate-900 font-medium"
                    >
                      {allSelected ? "Deselect all" : "Select all"}
                    </button>
                    <span className="tabular-nums text-slate-500">
                      {selectedCount} of {changes.length} selected
                    </span>
                  </div>

                  {/* Diff list */}
                  <div className="flex-1 overflow-y-auto">
                    {zoneOrder
                      .filter((z) => grouped[z]?.length)
                      .map((zone) => (
                        <div key={zone}>
                          <div className="px-6 py-2 bg-slate-50 sticky top-0 text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500 border-y border-slate-100">
                            {zone}
                          </div>
                          {grouped[zone].map((c) => {
                            const delta = c.recommendedQty - c.currentQty
                            return (
                              <label
                                key={c.spaceKey}
                                className="flex items-center gap-3 px-6 py-2.5 border-b border-slate-100 hover:bg-slate-50/70 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={c.selected}
                                  onChange={() => toggleRecalibrateRow(c.spaceKey)}
                                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-slate-900 truncate">
                                    {c.name}
                                  </div>
                                  {c.workspaceType && (
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                                      {c.workspaceType}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm tabular-nums shrink-0">
                                  <span className="text-slate-400">{c.currentQty}</span>
                                  <span className="text-slate-300">→</span>
                                  <span className="font-semibold text-slate-900">
                                    {c.recommendedQty}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                      delta > 0
                                        ? "bg-emerald-100 text-emerald-700"
                                        : delta < 0
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {delta > 0 ? "+" : ""}
                                    {delta}
                                  </span>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      ))}
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRecalibratePreview(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                {changes.length > 0 && (
                  <button
                    type="button"
                    onClick={applyRecalibration}
                    disabled={noneSelected}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Apply {selectedCount > 0 && `(${selectedCount})`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {showAdminPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">Engine Configuration</h2>
                <p className="text-xs text-slate-500 mt-0.5">Overrides apply live to Explore mode and Recalibrate</p>
              </div>
              <button
                onClick={() => { setShowAdminPanel(false); setIsAdminAuthenticated(false); setAdminPinInput("") }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!isAdminAuthenticated ? (
              <div className="p-8">
                <div className="max-w-xs mx-auto text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Settings className="w-5 h-5 text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-700 mb-4">Enter PIN to access engine settings</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={adminPinInput}
                      onChange={(e) => setAdminPinInput(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="PIN"
                      onKeyPress={(e) => e.key === "Enter" && handleAdminAccess()}
                    />
                    <Button onClick={handleAdminAccess} className="bg-teal-600 hover:bg-teal-700 text-white">Access</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 p-6 space-y-6">

                {/* Space Ratios */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Space Ratios</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">1 per N seats — lower number = more spaces generated</p>
                  </div>
                  <div className="grid grid-cols-3 gap-px bg-slate-100">
                    {[
                      { label: "Phone Booth", sub: "per workstation", key: "phoneBoothRatio" as const, defaultVal: 10 },
                      { label: "Huddle Room", sub: "per workstation", key: "huddleRatio" as const, defaultVal: 15 },
                      { label: "Medium Conf", sub: "per seat", key: "mediumConfRatio" as const, defaultVal: 40 },
                      { label: "Large Conf", sub: "per seat", key: "largeConfRatio" as const, defaultVal: 80 },
                      { label: "Open Collab", sub: "per seat", key: "openCollabRatio" as const, defaultVal: 25 },
                      { label: "Work Café", sub: "SF per person", key: "workCafeSfPerSeat" as const, defaultVal: 7.5 },
                    ].map(({ label, sub, key, defaultVal }) => (
                      <div key={key} className="bg-white p-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">{label}</label>
                        <p className="text-[10px] text-slate-400 mb-2">{sub}</p>
                        <input
                          type="number"
                          value={ratioConfig[key] ?? defaultVal}
                          onChange={(e) => { const v = Number.parseFloat(e.target.value); setRatioConfig((prev) => ({ ...prev, [key]: v || defaultVal })) }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Zone Circulation */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Zone Circulation Factors</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Added on top of net assignable area per zone</p>
                  </div>
                  <div className="grid grid-cols-5 gap-px bg-slate-100">
                    {Object.entries(zoneCirculation).map(([zone, pct]) => (
                      <div key={zone} className="bg-white p-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-2 leading-tight">{zone}</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={pct}
                            onChange={(e) => setZoneCirculation((prev) => ({ ...prev, [zone]: Number.parseInt(e.target.value) || 0 }))}
                            className="flex-1 min-w-0 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                          <span className="text-xs text-slate-400 shrink-0">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live totals read-out */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Live Program Totals</h3>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    {[
                      { label: "Total RSF", value: Math.round(finalEditableTotals.totalRSF || 0).toLocaleString() },
                      { label: "Total USF", value: Math.round(finalEditableTotals.totalUSF || 0).toLocaleString() },
                      { label: "RSF / Person", value: targetHeadcount > 0 ? Math.round((finalEditableTotals.totalRSF || 0) / targetHeadcount).toLocaleString() : "—" },
                      { label: "Headcount", value: targetHeadcount.toLocaleString() },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                        <p className="font-bold text-slate-900 tabular-nums">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {showSaveSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Project Saved!</h3>
                <p className="text-sm text-gray-500">Your project has been saved successfully.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProjectManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Project Manager</h2>
              <button onClick={() => setShowProjectManager(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {getSavedProjects().length === 0 ? (
                <p className="text-gray-500 text-center py-8">No saved projects yet</p>
              ) : (
                getSavedProjects().map((project: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium">{project.projectInfo.projectName}</h3>
                      <p className="text-sm text-gray-500">
                        Client: {project.projectInfo.client || "Not specified"} • Saved:{" "}
                        {new Date(project.savedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          loadProject(project)
                          setShowProjectManager(false)
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this project?")) {
                            deleteProject(project.projectInfo.projectName)
                          }
                        }}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkplaceProgrammingTool
