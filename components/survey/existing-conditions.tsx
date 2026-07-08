"use client"

import { ChoiceCard } from "./choice-card"
import {
  REUSE_POSTURES, WORKSTATION_SIZES, OFFICE_SIZES,
  type ExistingConditions, type Lane,
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
      {/* Furniture posture */}
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

      {/* Sizes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SizePicker
          label="Workstation size"
          help="Your standard desk footprint"
          options={WORKSTATION_SIZES}
          value={value.workstationSize}
          onChange={(id) => set({ workstationSize: id })}
        />
        <SizePicker
          label="Private office size"
          help="Your standard office footprint"
          options={OFFICE_SIZES}
          value={value.officeSize}
          onChange={(id) => set({ officeSize: id })}
        />
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

      {/* Detailed: existing counts pulled forward */}
      {lane === "detailed" && (
        <div className="grid gap-5 rounded-xl border border-[#00badc]/20 bg-[#00badc]/[0.04] p-5 sm:grid-cols-2">
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
          <p className="text-xs text-slate-500 sm:col-span-2">
            We&apos;ll carry these current counts forward so later steps start from what you actually have.
          </p>
        </div>
      )}
    </div>
  )
}

function SizePicker({
  label, help, options, value, onChange,
}: {
  label: string
  help: string
  options: { id: string; label: string; sf: number }[]
  value: string | null
  onChange: (id: string) => void
}) {
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
      </div>
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
