"use client"

import { Plus, X } from "lucide-react"
import { ChoiceCard } from "./choice-card"
import {
  REUSE_POSTURES, WORKSTATION_SIZES, OFFICE_SIZES,
  type ExistingConditions, type Lane, type SizeMixRow,
} from "@/lib/survey/sections"

/**
 * Existing-conditions editor: today's furniture posture and standard sizes.
 * These baseline the program (workstation/office SF) and feed the
 * existing-vs-proposed comparison. The detailed lane adds today's counts so
 * later steps can start from real numbers.
 */
export function ExistingConditionsStep({
  value,
  onChange,
  lane,
}: {
  value: ExistingConditions
  onChange: (next: ExistingConditions) => void
  lane: Lane
}) {
  const set = (p: Partial<ExistingConditions>) => onChange({ ...value, ...p })

  return (
    <div className="space-y-8">
      {/* The anchor question first — today's counts set the whole baseline. */}
      {lane === "detailed" && (
        <div className="rounded-xl border border-[#00badc]/25 bg-[#00badc]/[0.05] p-5">
          <p className="text-base font-semibold text-slate-900">How many workstations and private offices do you have today?</p>
          <p className="mt-0.5 text-xs text-slate-500">Your before-and-after starts from these two numbers.</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <CountField
              label="Workstations today"
              value={value.existingWorkstations}
              onChange={(n) => set({ existingWorkstations: n })}
            />
            <CountField
              label="Private offices today"
              value={value.existingOffices}
              onChange={(n) => set({ existingOffices: n })}
            />
          </div>
        </div>
      )}

      {/* Sizes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SizePicker
          label="Workstation size"
          help="Your standard desk footprint"
          options={WORKSTATION_SIZES}
          value={value.workstationSize}
          onChange={(id) => set({ workstationSize: id })}
          customSf={value.workstationCustomSF}
          onCustomSf={(sf) => set({ workstationCustomSF: sf })}
        />
        <SizePicker
          label="Private office size"
          help="Your standard office footprint"
          options={OFFICE_SIZES}
          value={value.officeSize}
          onChange={(id) => set({ officeSize: id })}
          customSf={value.officeCustomSF}
          onCustomSf={(sf) => set({ officeCustomSF: sf })}
        />
      </div>

      {/* Detailed: today's size inventory — several sizes across departments is
          normal; documenting each ties future furniture purchases to reality. */}
      {lane === "detailed" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SizeMixEditor
            label="Workstation sizes in place today"
            help="Running more than one desk size? Document each — size, how many, and where."
            noun="workstations"
            rows={value.workstationMix}
            onChange={(rows) => set({ workstationMix: rows })}
          />
          <SizeMixEditor
            label="Office sizes in place today"
            help="Same for private offices — each size you have, counted."
            noun="offices"
            rows={value.officeMix}
            onChange={(rows) => set({ officeMix: rows })}
          />
        </div>
      )}

      {/* Furniture posture — after the what, the what-happens-to-it */}
      <div>
        <p className="mb-3 text-sm font-medium text-slate-600">Are you reusing existing furniture, or starting fresh?</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {REUSE_POSTURES.map((o) => (
            <ChoiceCard
              key={o.id}
              icon={o.icon}
              label={o.label}
              description={o.description}
              selected={value.furniture === o.id}
              onClick={() => set({ furniture: o.id as ExistingConditions["furniture"] })}
            />
          ))}
        </div>
      </div>

      {/* Conference tables reuse */}
      <div>
        <p className="mb-3 text-sm font-medium text-slate-600">Re-using existing conference tables?</p>
        <div className="flex gap-3">
          {[
            { id: true, label: "Yes, re-use" },
            { id: false, label: "No, all new" },
          ].map((o) => (
            <button
              key={String(o.id)}
              type="button"
              onClick={() => set({ reuseConfTables: o.id })}
              className={`rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors ${
                value.reuseConfTables === o.id
                  ? "border-[#00badc] bg-[#00badc]/10 text-slate-900"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Rows of [SF · count · note] documenting the real size inventory on the floor. */
function SizeMixEditor({
  label, help, noun, rows, onChange,
}: {
  label: string
  help: string
  noun: string
  rows: SizeMixRow[]
  onChange: (rows: SizeMixRow[]) => void
}) {
  const update = (i: number, patch: Partial<SizeMixRow>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mb-3 text-xs text-slate-400">{help}</p>
      {rows.length > 0 && (
        <div className="mb-2 space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="number" min={1} value={r.sf ?? ""} placeholder="SF"
                onChange={(e) => update(i, { sf: e.target.value === "" ? null : Math.max(1, Number(e.target.value)) })}
                className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-[#00badc] focus:outline-none"
              />
              <span className="text-xs text-slate-400">SF ×</span>
              <input
                type="number" min={1} value={r.count ?? ""} placeholder="Qty"
                onChange={(e) => update(i, { count: e.target.value === "" ? null : Math.max(1, Number(e.target.value)) })}
                className="w-[70px] rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-[#00badc] focus:outline-none"
              />
              <input
                value={r.note} placeholder="Where / which dept (optional)"
                onChange={(e) => update(i, { note: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#00badc] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, j) => j !== i))}
                aria-label="Remove size"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => onChange([...rows, { sf: null, count: null, note: "" }])}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[#0089a3] transition-colors hover:bg-[#00badc]/10"
      >
        <Plus className="h-4 w-4" /> Add a size you have today
      </button>
      {rows.length > 0 && (
        <p className="mt-2 text-[11px] text-slate-400">
          {rows.filter((r) => (r.sf ?? 0) > 0 && (r.count ?? 0) > 0).reduce((a, r) => a + (r.count ?? 0), 0)} {noun} documented across {rows.length} size{rows.length === 1 ? "" : "s"} — we&apos;ll tie new furniture planning to this.
        </p>
      )}
    </div>
  )
}

function SizePicker({
  label, help, options, value, onChange, customSf, onCustomSf,
}: {
  label: string
  help: string
  options: { id: string; label: string; sf: number }[]
  value: string | null
  onChange: (id: string) => void
  /** SF for the "Custom" choice, when the standard buttons don't fit. */
  customSf: number | null
  onCustomSf: (sf: number | null) => void
}) {
  const customOn = value === "custom"
  return (
    <div>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mb-3 text-xs text-slate-400">{help}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value === o.id
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={`rounded-lg border px-3.5 py-2 text-left transition-colors ${
                on ? "border-[#00badc] bg-[#00badc]/10" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="block text-sm font-semibold text-slate-900">{o.label}</span>
              <span className="block text-[11px] tabular-nums text-slate-500">{o.sf} SF</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => onChange("custom")}
          className={`rounded-lg border px-3.5 py-2 text-left transition-colors ${
            customOn ? "border-[#00badc] bg-[#00badc]/10" : "border-dashed border-slate-300 bg-white hover:border-slate-400"
          }`}
        >
          <span className="block text-sm font-semibold text-slate-900">Custom…</span>
          <span className="block text-[11px] tabular-nums text-slate-500">
            {customOn && customSf ? `${customSf} SF` : "your own size"}
          </span>
        </button>
      </div>
      {customOn && (
        <div className="mt-2.5 flex items-center gap-2">
          <input
            type="number" min={1} value={customSf ?? ""} placeholder="e.g. 56" autoFocus
            onChange={(e) => onCustomSf(e.target.value === "" ? null : Math.max(1, Number(e.target.value)))}
            className="w-28 rounded-lg border border-[#00badc]/50 bg-white px-3 py-2 text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-[#00badc] focus:outline-none"
          />
          <span className="text-sm text-slate-500">SF per unit</span>
        </div>
      )}
    </div>
  )
}

function CountField({
  label, value, onChange,
}: {
  label: string
  value: number | null
  onChange: (n: number | null) => void
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <input
        type="number"
        min={0}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
        placeholder="e.g. 80"
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-[#00badc] focus:outline-none"
      />
    </div>
  )
}
