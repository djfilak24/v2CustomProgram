"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SpaceProgram } from "@/lib/fast-track-calculations";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

function formatSf(num: number): string {
  return `${Math.round(num).toLocaleString()} SF`;
}

interface ComparisonViewProps {
  fullOcc: SpaceProgram;
  hybrid: SpaceProgram;
  daysInOffice: number;
}

const SECTION_COLORS = {
  individual: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    dot: "bg-emerald-500",
    text: "text-emerald-600",
    subtotalBg: "bg-emerald-100/50",
    totalBg: "bg-emerald-100",
  },
  collaborative: {
    bg: "bg-teal-50 dark:bg-teal-500/10",
    dot: "bg-teal-500",
    text: "text-teal-600",
    subtotalBg: "bg-teal-100/50",
    totalBg: "bg-teal-100",
  },
  support: {
    bg: "bg-violet-50 dark:bg-violet-500/10",
    dot: "bg-violet-500",
    text: "text-violet-600",
    subtotalBg: "bg-violet-100/50",
    totalBg: "bg-violet-100",
  },
};

function SectionHeader({ label, section }: { label: string; section: keyof typeof SECTION_COLORS }) {
  const c = SECTION_COLORS[section];
  return (
    <TableRow className={c.bg}>
      <TableCell colSpan={5} className="py-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-3 h-3 rounded-full ${c.dot} shrink-0`} />
          <span className={`text-xs font-bold uppercase tracking-widest ${c.text}`}>{label}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}

function SavingsCell({ value }: { value: number }) {
  if (value === 0) {
    return (
      <TableCell className="text-right text-xs text-slate-500 py-2">
        <div className="flex items-center justify-end gap-1">
          <Minus className="w-3 h-3" />
        </div>
      </TableCell>
    );
  }
  const positive = value > 0;
  return (
    <TableCell className={`text-right text-xs font-semibold py-2 ${positive ? "text-emerald-600" : "text-red-600"}`}>
      <div className="flex items-center justify-end gap-1">
        {positive ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
        <span>{positive ? "-" : "+"}{formatSf(Math.abs(value))}</span>
      </div>
    </TableCell>
  );
}

export function ComparisonView({ fullOcc, hybrid, daysInOffice }: ComparisonViewProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white">Program Comparison</h3>
        <p className="text-xs text-slate-500 italic mt-1">Full Occupancy (5 days) vs Hybrid ({daysInOffice} days)</p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-600 py-2">Space Type</TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-600 py-2">SF Each</TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-600 py-2">Full Occ.</TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-600 py-2">Hybrid</TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-600 py-2">Savings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Individual */}
            <SectionHeader label="Individual Spaces" section="individual" />
            {fullOcc.individual.map((item, i) => {
              const hybridItem = hybrid.individual.find(h => h.name === item.name);
              if (!hybridItem) return null;
              return (
                <TableRow key={i} className="border-b border-slate-100">
                  <TableCell className="text-xs py-2">{item.name}</TableCell>
                  <TableCell className="text-right text-xs py-2">{formatSf(item.areaSf)}</TableCell>
                  <TableCell className="text-right text-xs py-2">{item.quantity}</TableCell>
                  <TableCell className="text-right text-xs py-2">{hybridItem.quantity}</TableCell>
                  <SavingsCell value={(item.quantity - hybridItem.quantity) * item.areaSf} />
                </TableRow>
              );
            })}
            <TableRow className={SECTION_COLORS.individual.subtotalBg}>
              <TableCell colSpan={2} className="text-xs font-semibold py-2">Subtotal</TableCell>
              <TableCell className="text-right text-xs font-semibold py-2">{formatSf(fullOcc.individualSubtotal)}</TableCell>
              <TableCell className="text-right text-xs font-semibold py-2">{formatSf(hybrid.individualSubtotal)}</TableCell>
              <SavingsCell value={fullOcc.individualSubtotal - hybrid.individualSubtotal} />
            </TableRow>

            {/* Collaborative */}
            <SectionHeader label="Collaborative Spaces" section="collaborative" />
            {fullOcc.collaborative.map((item, i) => {
              const hybridItem = hybrid.collaborative.find(h => h.name === item.name);
              if (!hybridItem) return null;
              return (
                <TableRow key={i} className="border-b border-slate-100">
                  <TableCell className="text-xs py-2">{item.name}</TableCell>
                  <TableCell className="text-right text-xs py-2">{formatSf(item.areaSf)}</TableCell>
                  <TableCell className="text-right text-xs py-2">{item.quantity}</TableCell>
                  <TableCell className="text-right text-xs py-2">{hybridItem.quantity}</TableCell>
                  <SavingsCell value={(item.quantity - hybridItem.quantity) * item.areaSf} />
                </TableRow>
              );
            })}
            <TableRow className={SECTION_COLORS.collaborative.subtotalBg}>
              <TableCell colSpan={2} className="text-xs font-semibold py-2">Subtotal</TableCell>
              <TableCell className="text-right text-xs font-semibold py-2">{formatSf(fullOcc.collaborativeSubtotal)}</TableCell>
              <TableCell className="text-right text-xs font-semibold py-2">{formatSf(hybrid.collaborativeSubtotal)}</TableCell>
              <SavingsCell value={fullOcc.collaborativeSubtotal - hybrid.collaborativeSubtotal} />
            </TableRow>

            {/* Support */}
            <SectionHeader label="Support Spaces" section="support" />
            {fullOcc.support.map((item, i) => {
              const hybridItem = hybrid.support.find(h => h.name === item.name);
              if (!hybridItem) return null;
              return (
                <TableRow key={i} className="border-b border-slate-100">
                  <TableCell className="text-xs py-2">{item.name}</TableCell>
                  <TableCell className="text-right text-xs py-2">{formatSf(item.areaSf)}</TableCell>
                  <TableCell className="text-right text-xs py-2">{item.quantity}</TableCell>
                  <TableCell className="text-right text-xs py-2">{hybridItem.quantity}</TableCell>
                  <SavingsCell value={(item.quantity - hybridItem.quantity) * item.areaSf} />
                </TableRow>
              );
            })}
            <TableRow className={SECTION_COLORS.support.subtotalBg}>
              <TableCell colSpan={2} className="text-xs font-semibold py-2">Subtotal</TableCell>
              <TableCell className="text-right text-xs font-semibold py-2">{formatSf(fullOcc.supportSubtotal)}</TableCell>
              <TableCell className="text-right text-xs font-semibold py-2">{formatSf(hybrid.supportSubtotal)}</TableCell>
              <SavingsCell value={fullOcc.supportSubtotal - hybrid.supportSubtotal} />
            </TableRow>

            {/* Grand Total */}
            <TableRow className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
              <TableCell colSpan={2} className="text-xs font-bold py-2">Total RSF</TableCell>
              <TableCell className="text-right text-xs font-bold py-2">{formatSf(fullOcc.estimatedRentable)}</TableCell>
              <TableCell className="text-right text-xs font-bold py-2">{formatSf(hybrid.estimatedRentable)}</TableCell>
              <TableCell className="text-right text-xs font-bold py-2">{formatSf(fullOcc.estimatedRentable - hybrid.estimatedRentable)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
