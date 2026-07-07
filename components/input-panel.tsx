"use client"

import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import type { SummaryInputs } from "@/lib/fast-track-calculations";
import { Users, CalendarDays, Building2, UserX, DollarSign, Percent, ChevronDown, ChevronUp, SlidersHorizontal, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// InfoTooltip component for input help
function InfoTooltip({ text, testId }: { text: string; testId?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info data-testid={testId} className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-sm">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface InputPanelProps {
  inputs: SummaryInputs;
  onChange: (inputs: SummaryInputs) => void;
}

function SliderInput({
  icon: Icon,
  label,
  value,
  displayValue,
  subLabel,
  min,
  max,
  step,
  ticks,
  onChange,
  testId,
  editable,
  editAsCount,
  infoText,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  displayValue: string;
  subLabel?: string;
  min: number;
  max: number;
  step: number;
  ticks?: (number | string)[];
  onChange: (v: number) => void;
  testId: string;
  editable?: boolean;
  editAsCount?: {
    toCount: (v: number) => number;
    fromCount: (count: number) => number;
    maxCount: number;
  };
  infoText?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (!editing) {
      setEditText(String(editAsCount ? editAsCount.toCount(value) : value));
    }
  }, [value, editing]);

  const commitEdit = () => {
    setEditing(false);
    const parsed = parseInt(editText, 10);
    if (!isNaN(parsed)) {
      if (editAsCount) {
        const clampedCount = Math.max(0, Math.min(editAsCount.maxCount, parsed));
        const pct = editAsCount.fromCount(clampedCount);
        onChange(Math.max(min, Math.min(max, pct)));
      } else {
        const clamped = Math.max(min, Math.min(max, parsed));
        onChange(clamped);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-[var(--nelson-cyan)] shrink-0" />
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground whitespace-nowrap">{label}</span>
        {infoText && <InfoTooltip text={infoText} testId={`icon-info-${testId}`} />}
      </div>
      <div className="w-full px-1">
        <Slider
          value={[value]}
          onValueChange={(v) => onChange(v[0])}
          min={min}
          max={max}
          step={step}
          className="w-full"
          data-testid={testId}
        />
      </div>
      {ticks && (
        <div className="flex justify-between w-full px-1 mt-0.5">
          {ticks.map((t, i) => (
            <span
              key={i}
              className={`text-[9px] tabular-nums ${
                String(t) === String(value)
                  ? "font-bold text-[var(--nelson-cyan)]"
                  : "text-muted-foreground/60"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="text-center mt-0.5">
        {editable && editing ? (
          <input
            type="text"
            inputMode="numeric"
            value={editText}
            onChange={(e) => setEditText(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
            autoFocus
            className="w-20 text-lg font-bold tabular-nums text-foreground leading-none text-center bg-transparent border-b-2 border-[var(--nelson-cyan)] outline-none"
            data-testid={`input-${testId}`}
          />
        ) : (
          <span
            className={`text-lg font-bold tabular-nums text-foreground leading-none ${editable ? "cursor-text border-b border-transparent hover:border-muted-foreground/30 transition-colors" : ""}`}
            onClick={editable ? () => { setEditText(String(editAsCount ? editAsCount.toCount(value) : value)); setEditing(true); } : undefined}
            data-testid={`text-value-${testId}`}
          >
            {displayValue}
          </span>
        )}
        {subLabel && (
          <span className="block text-[10px] italic text-muted-foreground mt-0.5">{subLabel}</span>
        )}
      </div>
    </div>
  );
}

const INPUT_TOOLTIPS = {
  headcount:
    "Total number of people in the workforce being planned. Drives Total Seats, Total Workpoints, RSF/USF area requirements, and the Annual & Total Rent Savings.",
  days:
    "Average number of days per week each person is in the office. Lower values reduce desks needed, shrinking Hybrid RSF/USF and increasing the Total Rent Savings.",
  offices:
    "Number of headcount assigned to private offices (the rest go to workstations). Affects Total Seats mix, the Individual Spaces breakdown, and overall RSF.",
  remote:
    "Number of fully remote employees who never need a desk. Subtracted from in-office demand, lowering Total Seats and Hybrid RSF/USF.",
  rent:
    "Gross rent in dollars per rentable square foot per year. Multiplies into both the Full Occupancy Rent and Hybrid Rent figures, and therefore the Total Savings.",
  rentable:
    "Rentable add-on factor — the building's load factor that converts Usable SF (USF) into Rentable SF (RSF). Higher values raise both rent figures equally.",
} as const;

export function InputPanel({ inputs, onChange }: InputPanelProps) {
  const [mobileExpanded, setMobileExpanded] = useState(true);

  const update = (key: keyof SummaryInputs, value: string | number) => {
    onChange({ ...inputs, [key]: value });
  };

  const remotePercent = inputs.totalHeadcount > 0
    ? Math.round((inputs.fullyRemote / inputs.totalHeadcount) * 100)
    : 0;
  const remoteCount = inputs.fullyRemote;

  return (
    <div className="glass-panel rounded-xl px-3 sm:px-4 py-3 sm:py-4 lg:py-3 lg:px-4" data-testid="panel-inputs">
      <div className="hidden lg:flex items-center gap-6 pb-1" style={{ scrollbarWidth: "thin" }}>
        <SliderInput
          icon={Users}
          label="Total Headcount"
          value={inputs.totalHeadcount}
          displayValue={String(inputs.totalHeadcount)}
          min={10}
          max={1000}
          step={1}
          onChange={(v) => {
            update("totalHeadcount", v);
            if (inputs.fullyRemote > v) update("fullyRemote", v);
          }}
          infoText={INPUT_TOOLTIPS.headcount}
          testId="slider-headcount"
          editable
        />
        <div className="w-px h-12 bg-border/50 flex-shrink-0" />
        <SliderInput
          icon={CalendarDays}
          label="Days in Office / Week"
          value={inputs.daysInOffice}
          displayValue={`${inputs.daysInOffice} days`}
          min={1}
          max={5}
          step={1}
          ticks={[1, 2, 3, 4, 5]}
          onChange={(v) => update("daysInOffice", v)}
          infoText={INPUT_TOOLTIPS.days}
          testId="slider-days"
          editable
        />
        <div className="w-px h-12 bg-border/50 flex-shrink-0" />
        <SliderInput
          icon={Building2}
          label="# Offices"
          value={inputs.percentOffices}
          displayValue={`${Math.round(inputs.totalHeadcount * inputs.percentOffices / 100)}`}
          subLabel={`${inputs.percentOffices}% of headcount`}
          min={0}
          max={100}
          step={1}
          onChange={(v) => update("percentOffices", v)}
          infoText={INPUT_TOOLTIPS.offices}
          testId="slider-offices"
          editable
          editAsCount={{
            toCount: (pct: number) => Math.round(inputs.totalHeadcount * pct / 100),
            fromCount: (count: number) => {
              if (inputs.totalHeadcount <= 0) return 0;
              const exact = (count / inputs.totalHeadcount) * 100;
              const floor = Math.floor(exact);
              const ceil = Math.ceil(exact);
              const floorCount = Math.round(inputs.totalHeadcount * floor / 100);
              const ceilCount = Math.round(inputs.totalHeadcount * ceil / 100);
              if (floorCount === count) return floor;
              if (ceilCount === count) return ceil;
              return Math.round(exact);
            },
            maxCount: inputs.totalHeadcount,
          }}
        />
        <div className="w-px h-12 bg-border/50 flex-shrink-0" />
        <SliderInput
          icon={UserX}
          label="# Fully Remote"
          value={inputs.fullyRemote}
          displayValue={`${remoteCount}`}
          subLabel={`${remotePercent}% of headcount`}
          min={0}
          max={inputs.totalHeadcount}
          step={1}
          onChange={(v) => update("fullyRemote", v)}
          infoText={INPUT_TOOLTIPS.remote}
          testId="slider-remote"
          editable
        />
        <div className="w-px h-12 bg-border/50 flex-shrink-0" />
        <SliderInput
          icon={DollarSign}
          label="Gross Rent ($/SF/Year)"
          value={inputs.grossRent}
          displayValue={`$${inputs.grossRent}`}
          min={10}
          max={200}
          step={5}
          onChange={(v) => update("grossRent", v)}
          infoText={INPUT_TOOLTIPS.rent}
          testId="slider-rent"
        />
        <div className="w-px h-12 bg-border/50 flex-shrink-0" />
        <SliderInput
          icon={Percent}
          label="Rentable Add-On Factor"
          value={Math.round(inputs.rentableFactor * 100)}
          displayValue={`${Math.round(inputs.rentableFactor * 100)}%`}
          min={10}
          max={35}
          step={1}
          onChange={(v) => update("rentableFactor", v / 100)}
          infoText={INPUT_TOOLTIPS.rentable}
          testId="slider-rentable"
        />
      </div>

      <div className="lg:hidden">
        <button
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className="w-full flex items-center justify-between py-1 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-toggle-inputs"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--nelson-cyan)]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Inputs</span>
          </div>
          <div className="flex items-center gap-2">
            {!mobileExpanded && (
              <span className="text-[10px] tabular-nums text-muted-foreground/70">
                {inputs.totalHeadcount} HC · {inputs.daysInOffice}d · ${inputs.grossRent}/SF
              </span>
            )}
            {mobileExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        <div
          className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-4 overflow-hidden transition-all duration-300 ease-in-out ${
            mobileExpanded ? "max-h-[600px] opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"
          }`}
        >
          <SliderInput
            icon={Users}
            label="Total Headcount"
            value={inputs.totalHeadcount}
            displayValue={String(inputs.totalHeadcount)}
            min={10}
            max={1000}
            step={1}
            onChange={(v) => {
              update("totalHeadcount", v);
              if (inputs.fullyRemote > v) update("fullyRemote", v);
            }}
            infoText={INPUT_TOOLTIPS.headcount}
            testId="slider-headcount-m"
            editable
          />
          <SliderInput
            icon={CalendarDays}
            label="Days in Office"
            value={inputs.daysInOffice}
            displayValue={`${inputs.daysInOffice} days`}
            min={1}
            max={5}
            step={1}
            ticks={[1, 2, 3, 4, 5]}
            onChange={(v) => update("daysInOffice", v)}
            infoText={INPUT_TOOLTIPS.days}
            testId="slider-days-m"
          />
          <SliderInput
            icon={Building2}
            label="# Offices"
            value={inputs.percentOffices}
            displayValue={`${Math.round(inputs.totalHeadcount * inputs.percentOffices / 100)}`}
            subLabel={`${inputs.percentOffices}%`}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update("percentOffices", v)}
            infoText={INPUT_TOOLTIPS.offices}
            testId="slider-offices-m"
            editable
            editAsCount={{
              toCount: (pct: number) => Math.round(inputs.totalHeadcount * pct / 100),
              fromCount: (count: number) => {
                if (inputs.totalHeadcount <= 0) return 0;
                const exact = (count / inputs.totalHeadcount) * 100;
                const floor = Math.floor(exact);
                const ceil = Math.ceil(exact);
                const floorCount = Math.round(inputs.totalHeadcount * floor / 100);
                const ceilCount = Math.round(inputs.totalHeadcount * ceil / 100);
                if (floorCount === count) return floor;
                if (ceilCount === count) return ceil;
                return Math.round(exact);
              },
              maxCount: inputs.totalHeadcount,
            }}
          />
          <SliderInput
            icon={UserX}
            label="# Fully Remote"
            value={inputs.fullyRemote}
            displayValue={`${remoteCount}`}
            subLabel={`${remotePercent}%`}
            min={0}
            max={inputs.totalHeadcount}
            step={1}
            onChange={(v) => update("fullyRemote", v)}
            infoText={INPUT_TOOLTIPS.remote}
            testId="slider-remote-m"
            editable
          />
          <SliderInput
            icon={DollarSign}
            label="Rent ($/SF/Yr)"
            value={inputs.grossRent}
            displayValue={`$${inputs.grossRent}`}
            min={10}
            max={200}
            step={5}
            onChange={(v) => update("grossRent", v)}
            infoText={INPUT_TOOLTIPS.rent}
            testId="slider-rent-m"
          />
          <SliderInput
            icon={Percent}
            label="Rentable Add-On"
            value={Math.round(inputs.rentableFactor * 100)}
            displayValue={`${Math.round(inputs.rentableFactor * 100)}%`}
            min={10}
            max={35}
            step={1}
            onChange={(v) => update("rentableFactor", v / 100)}
            infoText={INPUT_TOOLTIPS.rentable}
            testId="slider-rentable-m"
          />
        </div>
      </div>
    </div>
  );
}
